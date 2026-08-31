import { describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildHermeticEnv,
  cleanupStagedEntries,
  copyDownstreamCode,
  FIXTURES_ROOT_ENV,
  findTestStarEntries,
  isClientFixturePath,
  isPristineTemplateCheckout,
  parseArgs,
  REQUIRED_FIXTURE_DIRECTORIES,
  REQUIRED_FIXTURE_FILES,
  resolveStagingEntries,
  runHermeticTests,
  runMainWhenDirect,
  stageMissingEntries,
  stageTemplateMarkdown,
} from "#scripts/stage-hermetic-tests.js";
import { withTempDir, withTempDirAsync } from "#test/test-utils.js";

const createFixtureCheckout = (dir) => {
  for (const entry of REQUIRED_FIXTURE_DIRECTORIES) {
    const entryPath = path.join(dir, entry);
    fs.mkdirSync(entryPath, { recursive: true });
  }
  for (const entry of REQUIRED_FIXTURE_FILES) {
    const entryPath = path.join(dir, entry);
    fs.mkdirSync(path.dirname(entryPath), { recursive: true });
    fs.writeFileSync(entryPath, "export default {};\n");
  }
  fs.writeFileSync(path.join(dir, "src/images/fixture.jpg"), "fixture");
};

const createDownstreamSkeleton = (dir) => {
  fs.mkdirSync(path.join(dir, "src/images"), { recursive: true });
  fs.mkdirSync(path.join(dir, "packages/js-toolkit"), { recursive: true });
  fs.mkdirSync(path.join(dir, "node_modules"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src/images/client.jpg"), "client");
};

const expectClientCheckoutUntouched = (rootDir) => {
  expect(fs.existsSync(path.join(rootDir, "test"))).toBe(false);
  expect(fs.existsSync(path.join(rootDir, "src/images/fixture.jpg"))).toBe(
    false,
  );
  expect(
    fs.readFileSync(path.join(rootDir, "src/images/client.jpg"), "utf-8"),
  ).toBe("client");
};

describe("parseArgs", () => {
  test("reads --template and forwards args after --", () => {
    const args = parseArgs([
      "--template",
      "/tmp/pristine-template",
      "--",
      "test/integration",
      "-t",
      "should render",
    ]);

    expect(args.template).toBe("/tmp/pristine-template");
    expect(args.forward).toEqual(["test/integration", "-t", "should render"]);
  });

  test("defaults template to null and forward to empty when unset", () => {
    const args = parseArgs([]);

    expect(args.template).toBeNull();
    expect(args.forward).toEqual([]);
  });

  test("forward is empty when no -- separator is given", () => {
    const args = parseArgs(["--template", "/tmp/pristine-template"]);

    expect(args.forward).toEqual([]);
  });
});

describe("runMainWhenDirect", () => {
  test("skips execution when imported", async () => {
    const exitFn = mock(() => undefined);

    expect(
      await runMainWhenDirect(
        "file:///scripts/imported.js",
        ["bun", "/scripts/stage-hermetic-tests.js"],
        exitFn,
      ),
    ).toBe(false);
    expect(exitFn).not.toHaveBeenCalled();
  });

  test("forwards direct invocation status from paths with special characters", async () => {
    const exitFn = mock(() => undefined);

    expect(
      await runMainWhenDirect(
        "file:///tmp/client%20checkout/stage%23tests%3F.js",
        ["bun", "/tmp/client checkout/stage#tests?.js"],
        exitFn,
      ),
    ).toBe(true);
    expect(exitFn).toHaveBeenCalledWith(1);
  });
});

describe("isPristineTemplateCheckout", () => {
  test("rejects a directory missing required fixture entries", () =>
    withTempDir("stage-hermetic-tests-missing", (dir) => {
      expect(isPristineTemplateCheckout(dir)).toBe(false);
    }));

  test("rejects a directory with only some required fixture entries", () =>
    withTempDir("stage-hermetic-tests-partial", (dir) => {
      fs.mkdirSync(path.join(dir, "test"));
      fs.mkdirSync(path.join(dir, "src/images"), { recursive: true });
      fs.mkdirSync(path.join(dir, "src/_data"), { recursive: true });

      expect(isPristineTemplateCheckout(dir)).toBe(false);
    }));

  test("accepts a directory containing every required fixture entry", () =>
    withTempDir("stage-hermetic-tests-complete", (dir) => {
      createFixtureCheckout(dir);

      expect(isPristineTemplateCheckout(dir)).toBe(true);
    }));

  test("rejects a complete-looking tree without src/src.11tydata.js", () =>
    withTempDir("stage-hermetic-tests-no-directory-data", (dir) => {
      createFixtureCheckout(dir);
      fs.rmSync(path.join(dir, "src/src.11tydata.js"));

      expect(isPristineTemplateCheckout(dir)).toBe(false);
    }));

  test("rejects required entries with the wrong file type", () =>
    withTempDir("stage-hermetic-tests-wrong-types", (dir) => {
      createFixtureCheckout(dir);
      fs.rmSync(path.join(dir, "test"), { recursive: true });
      fs.writeFileSync(path.join(dir, "test"), "not a directory");

      expect(isPristineTemplateCheckout(dir)).toBe(false);

      fs.rmSync(path.join(dir, "test"));
      fs.mkdirSync(path.join(dir, "test"));
      fs.rmSync(path.join(dir, "BLOCKS_LAYOUT.md"));
      fs.mkdirSync(path.join(dir, "BLOCKS_LAYOUT.md"));

      expect(isPristineTemplateCheckout(dir)).toBe(false);
    }));
});

describe("findTestStarEntries", () => {
  test("finds root-level test-* entries only", () =>
    withTempDir("stage-hermetic-tests-star", (dir) => {
      fs.mkdirSync(path.join(dir, "test"));
      fs.mkdirSync(path.join(dir, "test-fixtures-images"));
      fs.mkdirSync(path.join(dir, "unrelated"));

      expect(findTestStarEntries(dir)).toEqual(["test-fixtures-images"]);
    }));

  test("returns an empty list when nothing matches", () =>
    withTempDir("stage-hermetic-tests-star-empty", (dir) => {
      fs.mkdirSync(path.join(dir, "src"));

      expect(findTestStarEntries(dir)).toEqual([]);
    }));
});

describe("resolveStagingEntries", () => {
  test("includes test infrastructure, image fixtures, and test-* entries", () =>
    withTempDir("stage-hermetic-tests-resolve", (dir) => {
      fs.mkdirSync(path.join(dir, "test-extra"));

      expect(resolveStagingEntries(dir)).toEqual([
        "test",
        "src/_data",
        "src/images",
        "packages/js-toolkit/test-utils",
        "test-extra",
      ]);
    }));
});

describe("workspace fixture filtering", () => {
  test("identifies client fixture paths without hiding source code", () => {
    expect(isClientFixturePath("src/pages/about.md")).toBe(true);
    expect(isClientFixturePath("src/images/party.jpg")).toBe(true);
    expect(isClientFixturePath("src/_data/site.json")).toBe(true);
    expect(isClientFixturePath("packages/js-toolkit/test-utils/index.js")).toBe(
      true,
    );
    expect(isClientFixturePath("test-fixtures-images/photo.jpg")).toBe(true);
    expect(isClientFixturePath("src/_data/custom.js")).toBe(false);
    expect(isClientFixturePath("src/_includes/footer.html")).toBe(false);
    expect(isClientFixturePath("src/_lib/test-helpers/module.js")).toBe(false);
    expect(isClientFixturePath("src/_lib/filters.js")).toBe(false);
  });

  test("copies downstream runtime code while omitting client fixtures", () =>
    withTempDir("stage-hermetic-tests-copy-root", (rootDir) =>
      withTempDir("stage-hermetic-tests-copy-workspace", (workspaceDir) => {
        const runtimeFiles = [
          "src/_data/custom.js",
          "src/_includes/footer.html",
          "src/_layouts/base.html",
          "src/assets/app.js",
          "src/css/style.scss",
          "src/utils/slug.js",
          "src/_lib/test-helpers/module.js",
        ];
        for (const file of runtimeFiles) {
          const filePath = path.join(rootDir, file);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, "runtime code");
        }
        fs.mkdirSync(path.join(rootDir, "src/_data"), { recursive: true });
        fs.mkdirSync(path.join(rootDir, "src/images"), { recursive: true });
        fs.writeFileSync(path.join(rootDir, "src/_data/site.json"), "{}");
        fs.writeFileSync(path.join(rootDir, "src/images/client.jpg"), "client");
        fs.writeFileSync(path.join(rootDir, "README.md"), "client readme");

        copyDownstreamCode(rootDir, workspaceDir);

        for (const file of runtimeFiles) {
          expect(fs.existsSync(path.join(workspaceDir, file))).toBe(true);
        }
        expect(
          fs.existsSync(path.join(workspaceDir, "src/_data/site.json")),
        ).toBe(false);
        expect(fs.existsSync(path.join(workspaceDir, "src/images"))).toBe(
          false,
        );
        expect(fs.existsSync(path.join(workspaceDir, "README.md"))).toBe(false);
      }),
    ));

  test("restores template markdown at its original paths", () =>
    withTempDir("stage-hermetic-tests-markdown-template", (templateDir) =>
      withTempDir("stage-hermetic-tests-markdown-workspace", (workspaceDir) => {
        fs.mkdirSync(path.join(templateDir, "src/pages"), { recursive: true });
        fs.mkdirSync(path.join(templateDir, "node_modules/ignored"), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(templateDir, "README.md"),
          "template readme",
        );
        fs.writeFileSync(
          path.join(templateDir, "src/pages/about.md"),
          "template page",
        );
        fs.writeFileSync(
          path.join(templateDir, "node_modules/ignored/README.md"),
          "ignored",
        );

        const staged = stageTemplateMarkdown(templateDir, workspaceDir);

        expect(staged).toContain(path.join(workspaceDir, "README.md"));
        expect(
          fs.readFileSync(
            path.join(workspaceDir, "src/pages/about.md"),
            "utf-8",
          ),
        ).toBe("template page");
        expect(
          fs.existsSync(
            path.join(workspaceDir, "node_modules/ignored/README.md"),
          ),
        ).toBe(false);
      }),
    ));
});

describe("stageMissingEntries", () => {
  test("copies missing test infrastructure without symlinks", () =>
    withTempDir("stage-hermetic-tests-stage-root", (rootDir) =>
      withTempDir("stage-hermetic-tests-stage-template", (templateDir) => {
        createFixtureCheckout(templateDir);
        createDownstreamSkeleton(rootDir);
        fs.writeFileSync(path.join(templateDir, "test/marker.txt"), "pristine");

        const staged = stageMissingEntries(
          rootDir,
          templateDir,
          resolveStagingEntries(templateDir),
        );

        expect(staged).toContain(path.join(rootDir, "test"));
        expect(staged).toContain(
          path.join(rootDir, "packages/js-toolkit/test-utils"),
        );
        expect(fs.lstatSync(path.join(rootDir, "test")).isSymbolicLink()).toBe(
          false,
        );
        expect(
          fs.readFileSync(path.join(rootDir, "test/marker.txt"), "utf-8"),
        ).toBe("pristine");
      }),
    ));

  test("merges missing image fixtures into an existing directory", () =>
    withTempDir("stage-hermetic-tests-images-root", (rootDir) =>
      withTempDir("stage-hermetic-tests-images-template", (templateDir) => {
        createFixtureCheckout(templateDir);
        createDownstreamSkeleton(rootDir);

        const staged = stageMissingEntries(rootDir, templateDir, [
          "src/images",
        ]);

        expect(staged).toContain(path.join(rootDir, "src/images/fixture.jpg"));
        expect(
          fs.readFileSync(
            path.join(rootDir, "src/images/fixture.jpg"),
            "utf-8",
          ),
        ).toBe("fixture");
        expect(
          fs.readFileSync(path.join(rootDir, "src/images/client.jpg"), "utf-8"),
        ).toBe("client");
      }),
    ));

  test("never overwrites existing client files", () =>
    withTempDir("stage-hermetic-tests-existing-root", (rootDir) =>
      withTempDir("stage-hermetic-tests-existing-template", (templateDir) => {
        fs.mkdirSync(path.join(rootDir, "src/images"), { recursive: true });
        fs.mkdirSync(path.join(templateDir, "src/images"), { recursive: true });
        fs.writeFileSync(path.join(rootDir, "src/images/shared.jpg"), "client");
        fs.writeFileSync(
          path.join(templateDir, "src/images/shared.jpg"),
          "template",
        );

        const staged = stageMissingEntries(rootDir, templateDir, [
          "src/images",
        ]);

        expect(staged).toEqual([]);
        expect(
          fs.readFileSync(path.join(rootDir, "src/images/shared.jpg"), "utf-8"),
        ).toBe("client");
      }),
    ));

  test("skips entries the template does not contain", () =>
    withTempDir("stage-hermetic-tests-missing-root", (rootDir) =>
      withTempDir("stage-hermetic-tests-missing-template", (templateDir) => {
        const staged = stageMissingEntries(rootDir, templateDir, [
          "test-does-not-exist",
        ]);

        expect(staged).toEqual([]);
      }),
    ));
});

describe("cleanupStagedEntries", () => {
  test("removes staged copies without touching client or template files", () =>
    withTempDir("stage-hermetic-tests-cleanup-root", (rootDir) =>
      withTempDir("stage-hermetic-tests-cleanup-template", (templateDir) => {
        createFixtureCheckout(templateDir);
        createDownstreamSkeleton(rootDir);

        const staged = stageMissingEntries(
          rootDir,
          templateDir,
          resolveStagingEntries(templateDir),
        );
        cleanupStagedEntries(staged);

        expectClientCheckoutUntouched(rootDir);
        expect(
          fs.existsSync(path.join(templateDir, "src/images/fixture.jpg")),
        ).toBe(true);
      }),
    ));
});

describe("buildHermeticEnv", () => {
  test("sets the fixtures root without mutating the base env", () => {
    const baseEnv = Object.freeze({ PATH: "/usr/bin" });

    const env = buildHermeticEnv(baseEnv, "/tmp/pristine-template");

    expect(env[FIXTURES_ROOT_ENV]).toBe("/tmp/pristine-template");
    expect(env.PATH).toBe("/usr/bin");
    expect(baseEnv[FIXTURES_ROOT_ENV]).toBeUndefined();
  });

  test("overrides an existing fixtures root", () => {
    const baseEnv = { [FIXTURES_ROOT_ENV]: "/old/path" };

    const env = buildHermeticEnv(baseEnv, "/new/path");

    expect(env[FIXTURES_ROOT_ENV]).toBe("/new/path");
  });
});

const withRunnableCheckouts = (name, fn) =>
  withTempDirAsync(`${name}-root`, async (rootDir) =>
    withTempDirAsync(`${name}-template`, async (templateDir) => {
      createFixtureCheckout(templateDir);
      createDownstreamSkeleton(rootDir);
      await fn({ rootDir, templateDir });
    }),
  );

describe("runHermeticTests", () => {
  test("fails fast when --template is missing", async () => {
    const status = await runHermeticTests({ template: null, forward: [] });

    expect(status).toBe(1);
  });

  test("fails fast when --template is not a template checkout", () =>
    withTempDirAsync("stage-hermetic-tests-run-invalid", async (dir) => {
      const status = await runHermeticTests({ template: dir, forward: [] });

      expect(status).toBe(1);
    }));

  test("stages fixtures before spawning", () =>
    withRunnableCheckouts(
      "stage-hermetic-tests-run-stage",
      async ({ rootDir, templateDir }) => {
        const spawnSyncFn = mock((_command, _args, options) => {
          expect(fs.existsSync(path.join(options.cwd, "test"))).toBe(true);
          expect(
            fs.existsSync(
              path.join(options.cwd, "packages/js-toolkit/test-utils"),
            ),
          ).toBe(true);
          expect(
            fs.existsSync(path.join(options.cwd, "src/images/fixture.jpg")),
          ).toBe(true);
          return { status: 0 };
        });

        await runHermeticTests(
          { template: templateDir, forward: [] },
          { rootDir, spawnSyncFn },
        );

        expect(spawnSyncFn).toHaveBeenCalledTimes(1);
      },
    ));

  test("forwards test arguments, fixture env, and exit status", () =>
    withRunnableCheckouts(
      "stage-hermetic-tests-run-forward",
      async ({ rootDir, templateDir }) => {
        const spawnSyncFn = mock(() => ({ status: 42 }));

        const status = await runHermeticTests(
          { template: templateDir, forward: ["test/integration"] },
          { rootDir, spawnSyncFn },
        );

        const [command, args, options] = spawnSyncFn.mock.calls[0];
        expect(status).toBe(42);
        expect(command).toBe("bun");
        expect(args).toEqual(["test", "test/integration"]);
        expect(options.env[FIXTURES_ROOT_ENV]).toBe(templateDir);
      },
    ));

  test("removes the workspace without touching the client checkout", () =>
    withRunnableCheckouts(
      "stage-hermetic-tests-run-cleanup",
      async ({ rootDir, templateDir }) => {
        const spawnSyncFn = mock(() => ({ status: 0 }));

        await runHermeticTests(
          { template: templateDir, forward: [] },
          { rootDir, spawnSyncFn },
        );

        const [, , options] = spawnSyncFn.mock.calls[0];
        expect(fs.existsSync(options.cwd)).toBe(false);
        expectClientCheckoutUntouched(rootDir);
      },
    ));

  test("returns 1 when the test process has no status", () =>
    withTempDirAsync("stage-hermetic-tests-null-root", async (rootDir) =>
      withTempDirAsync(
        "stage-hermetic-tests-null-template",
        async (templateDir) => {
          createFixtureCheckout(templateDir);
          createDownstreamSkeleton(rootDir);

          const status = await runHermeticTests(
            { template: templateDir, forward: [] },
            { rootDir, spawnSyncFn: () => ({ status: null }) },
          );

          expect(status).toBe(1);
        },
      ),
    ));

  test("cleans up when the test command throws", () =>
    withTempDirAsync("stage-hermetic-tests-throws-root", async (rootDir) =>
      withTempDirAsync(
        "stage-hermetic-tests-throws-template",
        async (templateDir) => {
          createFixtureCheckout(templateDir);
          createDownstreamSkeleton(rootDir);

          await expect(
            runHermeticTests(
              { template: templateDir, forward: [] },
              {
                rootDir,
                spawnSyncFn: () => {
                  throw new Error("boom");
                },
              },
            ),
          ).rejects.toThrow("boom");

          expectClientCheckoutUntouched(rootDir);
        },
      ),
    ));
});

describe("downstream execution", () => {
  const writeMarkerModule = (dir, marker) => {
    fs.mkdirSync(path.join(dir, "src/_lib"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src/_lib/hermetic-marker.js"),
      `export const marker = ${JSON.stringify(marker)};\n`,
    );
  };

  const writePackage = (dir) => {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        type: "module",
        imports: { "#lib/*": "./src/_lib/*" },
      }),
    );
  };

  const createE2eTemplate = (templateDir) => {
    createFixtureCheckout(templateDir);
    writeMarkerModule(templateDir, "pristine");
    writePackage(templateDir);
    fs.writeFileSync(
      path.join(templateDir, "test/hermetic-marker.test.js"),
      `
import { expect, test } from "bun:test";
import fs from "node:fs";
import { marker } from "#lib/hermetic-marker.js";

test("runs downstream code with pristine fixtures", () => {
  expect(marker).toBe("downstream");
  expect(process.env.${FIXTURES_ROOT_ENV}).toBe(${JSON.stringify(templateDir)});
  expect(fs.existsSync("src/images/client.jpg")).toBe(false);
  expect(fs.readFileSync("src/images/fixture.jpg", "utf-8")).toBe("fixture");
});
`,
    );
  };

  test("runs copied tests against downstream code", () =>
    withTempDirAsync("stage-hermetic-tests-e2e-root", async (rootDir) =>
      withTempDirAsync(
        "stage-hermetic-tests-e2e-template",
        async (templateDir) => {
          createE2eTemplate(templateDir);
          createDownstreamSkeleton(rootDir);
          writeMarkerModule(rootDir, "downstream");
          writePackage(rootDir);

          const status = await runHermeticTests(
            {
              template: templateDir,
              forward: ["test/hermetic-marker.test.js"],
            },
            { rootDir },
          );

          expect(status).toBe(0);
        },
      ),
    ));
});
