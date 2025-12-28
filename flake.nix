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
              nodejs_24
              pnpm
              biome
            ];

            shellHook = ''
              [ ! -d node_modules ] && pnpm install

              export PATH="$PWD/bin:$PATH"

              cat <<EOF

              Development environment ready!

              Available commands:
               - 'pnpm run serve'  # Clean & start dev server with incremental builds
               - 'pnpm run build'  # Clean & build the site in ./_site
               - 'pnpm test'       # Run JavaScript tests
               - 'lint'            # Format code with Biome (Nix-only)
               - 'screenshot'      # Take website screenshots (Nix-only)
               - 'profile'         # Profile build for performance bottlenecks

              EOF

              pnpm install
              git pull
            '';
          };
        }
      );
    };
}
