{
  inputs,
  pkgs,
  lib,
  config,
  ...
}:

let
  nodejs = pkgs.nodejs_22;

  runtimeSetup = pkgs.replaceVars ./scripts/devenv/library-path.sh {
    libraryPath = lib.optionalString pkgs.stdenv.isLinux (
      lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib ]
    );
  };

  precommitHook = pkgs.writeShellApplication {
    name = "cfa-static-precommit-hook";
    runtimeInputs = [ nodejs ];
    text = builtins.readFile (
      pkgs.replaceVars ./scripts/devenv/precommit.sh {
        inherit runtimeSetup;
      }
    );
  };

  shellSetup = pkgs.replaceVars ./scripts/devenv/shell.sh {
    inherit runtimeSetup;
  };
in
{
  # CI runs each check itself, so the commit-time Git hook must not run.
  profiles.ci.module = {
    git-hooks.enable = false;
  };

  languages.javascript = {
    enable = true;
    package = nodejs;
  };

  packages = with pkgs; [
    git
    biome
    vips
  ];

  scripts.pc.exec = ''exec npm run precommit "$@"'';

  git-hooks.hooks.precommit = {
    enable = true;
    entry = "${precommitHook}/bin/cfa-static-precommit-hook";
    pass_filenames = false;
  };

  # The devenv task `devenv:git-hooks:run` executes `prek run -a` — the
  # whole `npm run precommit` — on every shell entry, which takes minutes on
  # this tree. The commit-time Git hook and CI already run the precommit, so
  # shell entry never needs it. A `status` command that exits 0 tells the
  # task runner the hook run is already satisfied, so the entry task skips
  # without disabling the hooks themselves.
  tasks = lib.mkIf config.git-hooks.enable {
    "devenv:git-hooks:run".status = "exit 0";
  };

  enterShell = "source ${shellSetup}";
}
