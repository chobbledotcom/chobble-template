{
  inputs = {
    nixpkgs.url = "nixpkgs";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      makeEnvForSystem =
        system:
        let
          pkgs = import nixpkgs { system = system; };

          devDependencies = with pkgs; [
            nodejs_23
            biome
          ];
        in
        {
          inherit pkgs;
          devEnv = {
            inherit pkgs;
            dependencies = devDependencies;
          };
        };
    in
    {
      devShells = forAllSystems (
        system:
        let
          env = makeEnvForSystem system;
          inherit (env.devEnv)
            pkgs
            dependencies
            ;
        in
        {
          default = pkgs.mkShell {
            buildInputs = dependencies;

            shellHook = ''
              cat <<EOF

              Development environment ready!

              Available commands:
               - 'npm run serve'   # Start development server
               - 'npm run build'   # Build the site in the _site directory
               - 'lint'            # Lint all files using Biome

              EOF

              git pull
            '';
          };
        }
      );
    };
}
