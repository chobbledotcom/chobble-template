{
  inputs = {
    nixpkgs.url = "nixpkgs";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Shared configuration values
      npmDepsHash = "sha256-hx4IjiYjWvESZzDgVLPcx2GPMhWWWmMRB7SU9wBjqNk=";
      
      # Function to create nodeModules for a given pkgs
      makeNodeModules = pkgs: pkgs.buildNpmPackage {
        pname = "chobble-template-dependencies";
        version = "1.0.0";
        src = pkgs.runCommand "source" { } ''
          mkdir -p $out
          cp ${./package.json} $out/package.json
          cp ${./package-lock.json} $out/package-lock.json
        '';
        inherit npmDepsHash;
        installPhase = "mkdir -p $out && cp -r node_modules $out/";
        dontNpmBuild = true;
      };
      
      # Function to create script packages
      makeScriptPackages = { pkgs, dependencies }: 
        let
          makeScript =
            name:
            let
              baseScript = pkgs.writeScriptBin name (builtins.readFile ./bin/${name});
              patchedScript = baseScript.overrideAttrs (old: {
                buildCommand = "${old.buildCommand}\n patchShebangs $out";
              });
            in
            pkgs.symlinkJoin {
              name = name;
              paths = [ patchedScript ] ++ dependencies;
              buildInputs = [ pkgs.makeWrapper ];
              postBuild = ''
                wrapProgram $out/bin/${name} --prefix PATH : $out/bin
              '';
            };
          scriptNames = builtins.attrNames (builtins.readDir ./bin);
        in
        nixpkgs.lib.genAttrs scriptNames makeScript;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { system = system; };
          dependencies = with pkgs; [ nodejs_23 ];
          nodeModules = makeNodeModules pkgs;
          scriptPackages = makeScriptPackages { inherit pkgs dependencies; };

          sitePackage = pkgs.stdenv.mkDerivation {
            name = "chobble-template";
            src = ./.;
            buildInputs = dependencies ++ [ nodeModules ];

            buildPhase = ''
              mkdir -p $TMPDIR/build_dir
              cd $TMPDIR/build_dir

              cp -r $src/* .
              cp -r $src/.image-cache .
              chmod -R a+rwX .image-cache
              cp $src/.eleventy.js .

              ln -s ${nodeModules}/node_modules node_modules

              mkdir -p src/_data
              chmod -R +w src/_data

              ${scriptPackages.build}/bin/build
            '';

            installPhase = ''
              mkdir -p $out
              mv $TMPDIR/build_dir/_site $out/
              mv $TMPDIR/build_dir/.image-cache $out/
            '';

            dontFixup = true;
          };

          allPackages = {
            site = sitePackage;
            nodeModules = nodeModules;
          } // scriptPackages;
        in
        allPackages
      );

      defaultPackage = forAllSystems (system: self.packages.${system}.site);

      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { system = system; };

          dependencies = with pkgs; [
            biome
            nodejs_23
          ];

          nodeModules = makeNodeModules pkgs;
          scriptPackages = makeScriptPackages { inherit pkgs dependencies; };

          scriptPackageList = builtins.attrValues scriptPackages;
        in
        {
          default = pkgs.mkShell {
            buildInputs = dependencies ++ scriptPackageList;

            shellHook = ''
              rm -rf node_modules
              ln -s ${nodeModules}/node_modules node_modules
              cat <<EOF

              Development environment ready!

              Available commands:
               - 'serve'      - Start development server
               - 'build'      - Build the site in the _site directory
               - 'dryrun'     - Perform a dry run build
               - 'test_flake' - Test building a site using flake.nix
               - 'test_js'    - Run all JavaScript tests
               - 'lint'       - Lint all files in src using Biome

              EOF

              git pull
            '';
          };
        }
      );
    };
}
