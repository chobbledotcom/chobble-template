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
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              bun
              biome
              vips
              stdenv.cc.cc.lib
            ];

            shellHook = ''
              export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib:$LD_LIBRARY_PATH"
              [ ! -d node_modules ] && bun install

              export PATH="$PWD/bin:$PATH"

              cat <<EOF

              Development environment ready!

              Available commands:
               - 'bun run serve'  # Clean & start dev server with incremental builds
               - 'bun run build'  # Clean & build the site in ./_site
               - 'bun test'       # Run JavaScript tests
               - 'lint'           # Format code with Biome (Nix-only)
               - 'screenshot'     # Take website screenshots (Nix-only)
               - 'profile'        # Profile build for performance bottlenecks

              EOF

              bun install
              git pull
            '';
          };
        }
      );
    };
}
