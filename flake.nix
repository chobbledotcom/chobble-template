{
  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils/11707dc2f618dd54ca8739b309ec4fc024de578b?narHash=sha256-l0KFg5HjrsfsO/JpG%2Br7fRrqm12kzFHyUHqHCVpMMbI%3D";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
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
      rec {
        defaultPackage = packages.site;

        packages = scriptPkgs // {
          inherit site;
        };

        devShells = rec {
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
        };
      }
    );
}
