{
  inputs = {
    nixpkgs.url = "nixpkgs";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { system = system; };
          dependencies = with pkgs; [ nodejs_23 ];
          nodeModules = pkgs.mkYarnModules {
            pname = "chobble-template-dependencies";
            version = "1.0.0";
            packageJSON = ./package.json;
            yarnLock = ./yarn.lock;
            yarnFlags = [
              "--frozen-lockfile"
              "--ignore-platform"
            ];
          };

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
          scriptPackages = nixpkgs.lib.genAttrs scriptNames makeScript;

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

          nodeModules = pkgs.mkYarnModules {
            pname = "chobble-template-dependencies";
            version = "1.0.0";
            packageJSON = ./package.json;
            yarnLock = ./yarn.lock;
            yarnFlags = [
              "--frozen-lockfile"
              "--ignore-platform"
            ];
          };

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
          scriptPackages = nixpkgs.lib.genAttrs scriptNames makeScript;

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
               - 'lint'       - Lint all files in src using Biome

              EOF

              git pull
            '';
          };
        }
      );
    };
}
