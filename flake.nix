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
            paths =
              (map (cmd: pkgs.writeShellScriptBin cmd "bun run ${cmd}") [
                "serve"
                "build"
                "test"
                "profile"
                "customise-cms"
                "generate-pages-yml"
                "precommit"
              ])
              ++ [
                (pkgs.writeShellScriptBin "pc" ''exec bun run precommit "$@"'')
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

              install_precommit_hook() {
                if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
                  return
                fi

                hook_path="$(git rev-parse --git-path hooks/pre-commit)"
                hook_marker="# Installed by chobble-template flake.nix"

                if [ -e "$hook_path" ] && ! grep -Fqx "$hook_marker" "$hook_path"; then
                  echo "  pre-commit hook already exists; leaving it unchanged"
                  return
                fi

                mkdir -p "$(dirname "$hook_path")"
                printf '%s\n' '#!/usr/bin/env sh' "$hook_marker" 'exec bun run precommit "$@"' > "$hook_path"
                chmod +x "$hook_path"
                echo "  installed pre-commit hook - bun run precommit"
              }
              install_precommit_hook

              cat <<EOF

              Available commands:
               serve              - Clean & start dev server with incremental builds
               build              - Clean & build the site in ./_site
               test               - Run JavaScript tests
               pc                 - Run precommit (lint/typecheck/tests) - also runs automatically on git commit
               precommit          - Alias for pc
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
