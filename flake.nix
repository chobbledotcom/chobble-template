{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      forAllSystems = f: { x86_64-linux = f "x86_64-linux"; };
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          bunScripts = pkgs.symlinkJoin {
            name = "bun-scripts";
            paths = map (cmd: pkgs.writeShellScriptBin cmd "bun run ${cmd}") [
              "serve"
              "build"
              "test"
              "profile"
              "customise-cms"
              "generate-pages-yml"
            ];
          };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              bun
              biome
              vips
              stdenv.cc.cc.lib
              bunScripts
            ];

            shellHook = ''
              export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib:$LD_LIBRARY_PATH"
              export PATH="$PWD/bin:$PATH"

              # Run setup tasks in background
              (bun install && git pull && echo "Environment ready <3") &

              cat <<EOF

              Available commands:
               serve              - Clean & start dev server with incremental builds
               build              - Clean & build the site in ./_site
               test               - Run JavaScript tests
               profile            - Profile build for performance bottlenecks
               lint               - Format code with Biome (Nix-only)
               screenshot         - Take website screenshots (Nix-only)
               customise-cms      - Interactive setup for PagesCMS collections
               generate-pages-yml - Generate .pages.yml with all collections

              EOF
            '';
          };
        }
      );
    };
}
