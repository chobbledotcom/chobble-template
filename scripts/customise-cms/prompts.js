/**
 * Interactive prompts for CMS customisation
 */

import * as readline from "node:readline";
import {
  getRequiredCollections,
  getSelectableCollections,
  resolveDependencies,
} from "#scripts/customise-cms/collections.js";
import {
  filter,
  map,
  memberOf,
  notMemberOf,
  pipe,
  unique,
} from "#utils/array-utils.js";

/**
 * Create readline interface
 */
const createInterface = () =>
  readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

/**
 * Ask a yes/no question
 */
const askYesNo = async (rl, question, defaultValue = false) => {
  const defaultHint = defaultValue ? "[Y/n]" : "[y/N]";
  return new Promise((resolve) => {
    rl.question(`${question} ${defaultHint}: `, (answer) => {
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") {
        resolve(defaultValue);
      } else {
        resolve(trimmed === "y" || trimmed === "yes");
      }
    });
  });
};

/**
 * Parse selection input into array of selected names
 */
const parseSelection = (input, options, defaults) => {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === "" && defaults.length > 0) return defaults;
  if (trimmed === "all") return map((o) => o.name)(options);
  if (trimmed === "none" || trimmed === "") return [];

  const isValidIndex = (n) => n >= 1 && n <= options.length;
  const toName = (n) => options[n - 1].name;
  const toNumber = (n) => Number.parseInt(n.trim(), 10);

  return pipe(
    map(toNumber),
    filter(isValidIndex),
    map(toName),
  )(trimmed.split(","));
};

/**
 * Display options list
 */
const displayOptions = (options, defaults) => {
  for (let i = 0; i < options.length; i++) {
    const isDefault = defaults.includes(options[i].name);
    const marker = isDefault ? "*" : " ";
    console.log(
      `${marker} ${i + 1}. ${options[i].label} - ${options[i].description}`,
    );
  }
  console.log("\n* = previously selected");
};

/**
 * Ask user to select from a list of options
 */
const askMultiSelect = async (rl, question, options, defaults = []) => {
  console.log(`\n${question}`);
  console.log("Enter numbers separated by commas, or 'all' for all options.\n");
  displayOptions(options, defaults);

  return new Promise((resolve) => {
    rl.question("\nYour selection: ", (answer) => {
      resolve(parseSelection(answer, options, defaults));
    });
  });
};

/**
 * Ask collection selection questions
 */
const askCollectionQuestions = async (rl, defaultCollections) => {
  const selectableCollections = getSelectableCollections();
  const selectedCollections = await askMultiSelect(
    rl,
    "Which collections do you want to use?",
    selectableCollections,
    defaultCollections,
  );

  const requiredNames = map((c) => c.name)(getRequiredCollections());
  const allSelected = unique([...requiredNames, ...selectedCollections]);
  const resolved = resolveDependencies(allSelected);

  const addedDeps = filter(notMemberOf([...allSelected, ...requiredNames]))(
    resolved,
  );
  if (addedDeps.length > 0) {
    console.log(
      `\nNote: Also including ${addedDeps.join(", ")} (required dependencies)`,
    );
  }

  return resolved;
};

/**
 * Ask feature questions
 */
const askFeatureQuestions = async (rl, collections, defaultFeatures) => {
  console.log("\n--- Optional Features ---\n");

  const features = {
    permalinks: await askYesNo(
      rl,
      "Do you want custom permalinks on items?",
      defaultFeatures.permalinks ?? false,
    ),
    redirects: await askYesNo(
      rl,
      "Do you want redirect_from support (for URL redirects)?",
      defaultFeatures.redirects ?? false,
    ),
    faqs: await askYesNo(
      rl,
      "Do you want FAQs on items?",
      defaultFeatures.faqs ?? false,
    ),
    galleries: await askYesNo(
      rl,
      "Do you want image galleries on items?",
      defaultFeatures.galleries ?? false,
    ),
    specs: false,
    features: false,
  };

  const hasSpecsCollections = collections.some(
    memberOf(["products", "properties"]),
  );

  if (hasSpecsCollections) {
    features.specs = await askYesNo(
      rl,
      "Do you want specifications on products/properties?",
      defaultFeatures.specs ?? false,
    );
    features.features = await askYesNo(
      rl,
      "Do you want feature lists on products/properties?",
      defaultFeatures.features ?? false,
    );
  }

  return features;
};

/**
 * Main question flow
 */
export const askQuestions = async (existingConfig = null) => {
  const rl = createInterface();

  try {
    const defaultCollections = existingConfig?.collections || [];
    const defaultFeatures = existingConfig?.features || {};

    const collections = await askCollectionQuestions(rl, defaultCollections);
    const features = await askFeatureQuestions(
      rl,
      collections,
      defaultFeatures,
    );

    return { collections, features };
  } finally {
    rl.close();
  }
};
