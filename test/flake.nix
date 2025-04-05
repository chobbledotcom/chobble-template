{
  inputs = {
    nixpkgs.url = "nixpkgs";
    chobble-template = {
      url = "path:../";
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
          templatePackages = chobble-template.packages.${system};
          pkgs = nixpkgs.legacyPackages.${system};
          testSite = pkgs.runCommand "chobble-template-test" { } ''
            mkdir -p $out
            cp -r ${templatePackages.site}/* $out/
            echo "Built from test flake" > $out/test-marker.txt
          '';
        in
        {
          site = testSite;
          default = testSite;
        }
      );
    };
}
