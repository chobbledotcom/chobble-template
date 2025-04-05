{
  inputs = {
    nixpkgs.url = "nixpkgs";
    chobble-template = {
      url = "../";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      chobble-template,
    }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          sourcePrep = pkgs.runCommand "chobble-template-source" { } ''
            mkdir -p $out
            ${pkgs.rsync}/bin/rsync \
              --delete \
              --recursive \
              --exclude="/test" \
              --exclude="*.md" \
              "${chobble-template}/" $out/

            ${pkgs.rsync}/bin/rsync \
              --recursive \
              --include="*.jpg,*.jpeg,*.webp,*.png,*.md" \
              "${self}/" $out/src/
          '';

          finalBuild =
            let
              importedFlake = import "${sourcePrep}/flake.nix";
              outputs = importedFlake.outputs {
                self = sourcePrep;
                nixpkgs = nixpkgs;
              };
            in
            outputs.packages.${system}.site;
        in
        {
          site = finalBuild;
          default = finalBuild;
        }
      );
    };
}
