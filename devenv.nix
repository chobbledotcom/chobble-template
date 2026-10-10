{ pkgs, ... }:
let
  # One PATH command per precommit check so `devenv shell -- <check>` works.
  # `tests:code-quality` is a precommit step, not a package.json script.
  checkScripts = {
    lint = "bun run lint";
    "lint:scss" = "bun run lint:scss";
    typecheck = "bun run typecheck";
    "tests:code-quality" = "bun test test/unit/code-quality --concurrent --timeout 1500";
    "cpd:fp" = "bun run cpd:fp";
    "cpd:design-system" = "bun run cpd:design-system";
  };

  checkCommands = pkgs.symlinkJoin {
    name = "check-commands";
    paths = pkgs.lib.mapAttrsToList (
      name: command: pkgs.writeShellScriptBin name "exec ${command} \"$@\""
    ) checkScripts;
  };
in
{
  packages = with pkgs; [
    biome
    bun
    git
    nodejs_22
    stdenv.cc.cc.lib
    checkCommands
  ];

  # Bun honours NIX_LD on NixOS, letting dynamically linked npm platform
  # binaries (e.g. jscpd's) find their loader inside the devenv shell.
  env.NIX_LD = pkgs.lib.fileContents "${pkgs.stdenv.cc}/nix-support/dynamic-linker";
  env.NIX_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc ];

  # bun auto-loads .env itself; stop devenv hinting about it
  dotenv.disableHint = true;

  enterShell = ''
    export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib:$LD_LIBRARY_PATH"
  '';
}
