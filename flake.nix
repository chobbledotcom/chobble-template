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
          nodeDeps = import ./node-deps.nix { inherit pkgs; };
          inherit (nodeDeps) packageJSON nodeModules;

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
            name = "eleventy-site";
            src = ./.;
            buildInputs = deps ++ [ nodeModules ];

            configurePhase = ''
              ln -sf ${packageJSON} package.json
              ln -sf ${nodeModules}/node_modules .
            '';

            buildPhase = ''
              ${mkScript "build"}/bin/build
              ${mkScript "tidy_html"}/bin/tidy_html
            '';

            installPhase = ''
              cp -r _site $out
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
          inherit packageJSON nodeModules;
        };
    in
    {
      packages = forAllSystems (
        system:
        let
          u = mkUtils system;
          inherit (u) scriptPkgs site;
        in
        scriptPkgs // { inherit site; }
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
            packageJSON
            nodeModules
            ;
        in
        rec {
          default = dev;
          dev = pkgs.mkShell {
            buildInputs = deps ++ (builtins.attrValues scriptPkgs);

            shellHook = ''
              rm -rf node_modules package.json
              ln -sf ${packageJSON} package.json
              ln -sf ${nodeModules}/node_modules .
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
