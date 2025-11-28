{
  inputs.nixpkgs.url = "nixpkgs";

  outputs =
    { nixpkgs, ... }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [ "x86_64-linux" ];
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [ nodejs_24 biome ];

            shellHook = ''
              [ ! -d node_modules ] && npm install
              cat <<EOF

              Development environment ready!

              Available commands:
               - 'npm run serve'   # Clean & start dev server with incremental builds
               - 'npm run build'   # Clean & build the site in ./_site
               - 'npm test'        # Run JavaScript tests
               - 'lint'            # Format code with Biome (Nix-only)
               - 'screenshot'      # Take website screenshots (Nix-only)

              EOF

              git pull
            '';
          };
        }
      );
    };
}
