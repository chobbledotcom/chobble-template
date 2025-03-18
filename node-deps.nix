{
  pkgs ? import <nixpkgs> { },
}:

let
  packageJSON = pkgs.writeTextFile {
    name = "package.json";
    text = builtins.toJSON {
      name = "eleventy-site";
      version = "1.0.0";
      dependencies = {
        "@11ty/eleventy" = "^3.0.0";
        "@11ty/eleventy-img" = "^6.0.0";
        "@11ty/eleventy-plugin-rss" = "^2.0.2";
        "@11ty/eleventy-plugin-syntaxhighlight" = "^5.0.0";
        "@zachleat/heading-anchors" = "^1.0.1";
        "fast-glob" = "^3.3.2";
      };
    };
  };

  nodeModules = pkgs.mkYarnModules {
    pname = "eleventy-site-dependencies";
    version = "1.0.0";
    packageJSON = packageJSON;
    yarnLock = ./yarn.lock;
    yarnFlags = [ "--frozen-lockfile" ];
  };
in
{
  inherit packageJSON nodeModules;
}
