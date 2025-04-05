{
  inputs = {
    nixpkgs.url = "nixpkgs";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        # "aarch64-linux"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);

      mkUtils =
        system:
        let
          pkgs = import nixpkgs { inherit system; };

          nodeModules = pkgs.mkYarnModules {
            pname = "chobble-template-dependencies";
            version = "1.0.0";
            packageJSON = ./package.json;
            yarnLock = ./yarn.lock;
            yarnFlags = [ "--frozen-lockfile" ];
          };

          deps = with pkgs; [
            html-tidy
            sass
            yarn
          ];

          mkScript =
            name:
            let
              base = pkgs.writeScriptBin name (builtins.readFile ./bin/${name});
              patched = base.overrideAttrs (old: {
                buildCommand = "${old.buildCommand}\n patchShebangs $out";
              });
            in
            pkgs.symlinkJoin {
              inherit name;
              paths = [ patched ] ++ deps;
              buildInputs = [ pkgs.makeWrapper ];
              postBuild = "wrapProgram $out/bin/${name} --prefix PATH : $out/bin";
            };

          scripts = [
            "build"
            "serve"
            "dryrun"
            "tidy_html"
          ];

          scriptPkgs = builtins.listToAttrs (
            map (name: {
              inherit name;
              value = mkScript name;
            }) scripts
          );

          site = pkgs.stdenv.mkDerivation {
            name = "chobble-template";
            src = ./.;
            buildInputs = deps ++ [ nodeModules ];

            buildPhase = ''
              mkdir -p $TMPDIR/build_dir
              cd $TMPDIR/build_dir

              cp -r $src/* .
              cp $src/.eleventy.js .

              cp -r ${nodeModules}/node_modules .
              chmod -R +w ./node_modules

              ${mkScript "build"}/bin/build
              ${mkScript "tidy_html"}/bin/tidy_html
            '';

            installPhase = ''
              mkdir -p $out
              cp -r $TMPDIR/build_dir/_site/* $out/
            '';

            dontFixup = true;
          };
        in
        {
          inherit
            pkgs
            deps
            mkScript
            scripts
            scriptPkgs
            site
            ;
          inherit nodeModules;
        };
    in
    {
      packages = forAllSystems (
        system:
        let
          u = mkUtils system;
          inherit (u) scriptPkgs site nodeModules;
        in
        scriptPkgs // { inherit site nodeModules; }
      );

      defaultPackage = forAllSystems (system: self.packages.${system}.site);

      devShells = forAllSystems (
        system:
        let
          u = mkUtils system;
          inherit (u)
            pkgs
            deps
            scriptPkgs
            nodeModules
            ;
        in
        rec {
          default = dev;
          dev = pkgs.mkShell {
            buildInputs = deps ++ (builtins.attrValues scriptPkgs);

            shellHook = ''
              rm -rf node_modules
              cp -r ${nodeModules}/node_modules .
              chmod -R +w ./node_modules

              echo "Development environment ready!"
              echo ""
              echo "Available commands:"
              echo " - 'serve'     - Start development server"
              echo " - 'build'     - Build the site in the _site directory"
              echo " - 'dryrun'    - Perform a dry run build"
              echo " - 'tidy_html' - Format HTML files in _site"
              echo ""
              git pull
            '';
          };
        }
      );
    };
}
