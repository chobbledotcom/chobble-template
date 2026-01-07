{
  inputs = { };

  outputs =
    { ... }:
    let
      forAllSystems = f: { x86_64-linux = f "x86_64-linux"; };
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import <nixpkgs> { inherit system; };
          bunScripts = pkgs.symlinkJoin {
            name = "bun-scripts";
            paths = map (cmd: pkgs.writeShellScriptBin cmd "bun run ${cmd}") [
              "serve"
              "build"
              "test"
              "profile"
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
              [ ! -d node_modules ] && bun install

              export PATH="$PWD/bin:$PATH"

              cat <<EOF

              Development environment ready!

              Available commands:
               serve       - Clean & start dev server with incremental builds
               build       - Clean & build the site in ./_site
               test        - Run JavaScript tests
               profile     - Profile build for performance bottlenecks
               lint        - Format code with Biome (Nix-only)
               screenshot  - Take website screenshots (Nix-only)

              EOF

              bun install
              git pull
            '';
          };
        }
      );
    };
}
