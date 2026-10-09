import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { CONTAINER_FIELDS } from "#utils/block-schema/shared.js";
import { BLOCK_SCHEMAS, getBlockTemplate } from "#utils/block-schema.js";
import { frozenSet } from "#utils/fp/set.js";
import { VOID_ELEMENTS } from "#utils/html-elements.js";

const RAW_HTML_FIELDS = frozenSet(["html:content", "split-html:figure_html"]);
const TAG_REGEX =
  /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>'"]|"[^"]*"|'[^']*')*)(\/?)>/g;
const LIQUID_REGEX = /\{\{-?\s*([\s\S]*?)\s*-?\}\}|\{%-?\s*([\s\S]*?)\s*-?%\}/g;
const RENDER_MD_REGEX = /\|\s*renderContent\s*:\s*(["'])md\1/;
const blank = (source) => source.replace(/[^\n]/g, " ");
const readTemplate = (template) =>
  readFileSync(join(ROOT_DIR, "src/_includes", template), "utf8");

// Keep offsets intact for diagnostics, but do not scan documentation examples
// or inactive split variants as though they were rendered with this schema.
const activeSource = (source, type, requiredItems) =>
  source
    .replace(
      /\{%-?\s*(comment|raw)\s*-?%\}[\s\S]*?\{%-?\s*end\1\s*-?%\}/g,
      blank,
    )
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(
      /\{%-?\s*case block\.type\s*-?%\}([\s\S]*?)\{%-?\s*endcase\s*-?%\}/g,
      (whole, branches) => {
        const selected = branches.replace(
          /(\{%-?\s*when\s+(["'])([^"']+)\2\s*-?%\})([\s\S]*?)(?=\{%-?\s*(?:when|else)\b|$)/g,
          (branch, tag, _quote, variant, body) =>
            variant === type ? blank(tag) + body : blank(branch),
        );
        return (
          blank(whole.slice(0, whole.indexOf(branches))) +
          selected +
          blank(whole.slice(whole.indexOf(branches) + branches.length))
        );
      },
    )
    .replace(
      /\{%-?\s*unless\s+items\s*-?%\}([\s\S]*?)\{%-?\s*endunless\s*-?%\}/g,
      (whole) => (requiredItems ? blank(whole) : whole),
    );

const tagStackAt = (source, pos, initial) =>
  [...source.matchAll(TAG_REGEX)]
    .filter((match) => match.index < pos)
    .reduce((stack, match) => {
      const [, slash, rawName, attrs, selfClose] = match;
      const name = rawName.toLowerCase();
      if (slash === "/") {
        const index = stack.findLastIndex((tag) => tag.name === name);
        return index === -1 ? stack : stack.slice(0, index);
      }
      if (selfClose === "/" || VOID_ELEMENTS.has(name)) return stack;
      const classes = attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/);
      return stack.concat([
        {
          name,
          prose: classes ? classes[2].split(/\s+/).includes("prose") : false,
        },
      ]);
    }, initial);

// A reference retains its whole block path. Contextual page/collection values
// stay contextual; their terminal names must never borrow a block field type.
const resolveReference = (expression, bindings, assignment = false) => {
  const [head, ...filters] = expression.split("|").map((part) => part.trim());
  // Computed filter results (fileInfo, collection lookups, etc.) have their
  // own shape. Only aliases/defaults retain an authored field's provenance.
  if (assignment && filters.some((filter) => !/^default\s*:/.test(filter)))
    return false;
  const resolveBlockPath = (path) => {
    if (!/^\w+(?:\.\w+)*$/.test(path)) return null;
    const [root, ...keys] = path.split(".");
    const base = Object.hasOwn(bindings, root) ? bindings[root] : null;
    if (base === null) return null;
    if (base === false) return false;
    return base.concat(keys);
  };
  const reference = resolveBlockPath(head);
  if (Array.isArray(reference)) return reference;
  const fallback = filters.find((filter) => /^default\s*:/.test(filter));
  return fallback
    ? resolveBlockPath(fallback.replace(/^default\s*:\s*/, ""))
    : reference;
};

const blockFieldAt = (fields, reference) =>
  reference.reduce(
    (parent, key) =>
      parent?.fields && Object.hasOwn(parent.fields, key)
        ? parent.fields[key]
        : undefined,
    { fields },
  );

const checkOutput = ({ type, fields, body, reference, stack, embedded }) => {
  const markdown = RENDER_MD_REGEX.test(body);
  const proseError =
    markdown && !stack.at(-1)?.prose
      ? ['renderContent: "md" is not wrapped in a .prose element']
      : [];
  if (!reference || reference.length === 0) return proseError;
  const path = reference.join(".");
  const field = blockFieldAt(fields, reference);
  if (!field) {
    // Embedded components can alias absent optional top-level defaults from
    // their own block API. Do not mistake those plain aliases for authored
    // nested fields, direct block outputs, or Markdown targets.
    if (
      embedded &&
      reference.length === 1 &&
      !markdown &&
      !/^block\./.test(body.trim())
    )
      return proseError;
    return proseError.concat(`unknown block field "${path}"`);
  }
  const rawHtml = RAW_HTML_FIELDS.has(`${type}:${path}`);
  if (markdown && (field.type !== "markdown" || rawHtml)) {
    return proseError.concat(
      `block field "${path}" is rendered as markdown but declares ${rawHtml ? "intentional raw HTML" : field.type}`,
    );
  }
  if (!markdown && field.type === "markdown" && !rawHtml) {
    return proseError.concat(
      `block field "${path}" is typed markdown but rendered without renderContent: "md"`,
    );
  }
  return proseError;
};

/**
 * Analyze the resolved block template and its static includes. This is a narrow
 * source gate, not a Liquid interpreter: only simple paths, assign/default,
 * for bindings, named include parameters and block.type cases are resolved.
 * Dynamic includes dispatch separately registered blocks or authored content.
 * `read` is injectable so fixtures exercise this same analyzer without files.
 */
export const analyzeBlockMarkdown = (type, read = readTemplate) => {
  const template = getBlockTemplate(type);
  const fields = {
    ...CONTAINER_FIELDS,
    ...BLOCK_SCHEMAS[type],
    type: { type: "string" },
  };

  const scan = (template, parameters, initialStack, seen) => {
    if (seen.includes(template)) {
      throw new Error(
        `Cyclic template include: ${seen.concat(template).join(" -> ")}`,
      );
    }
    // Shared icon-links skips its standalone intro only when the override is
    // a validated required list (including [], which is truthy in Liquid).
    // Contextual, optional, false and null parameters cannot prove this branch
    // inactive. No other condition is pruned based on parameter presence.
    const itemsField = Array.isArray(parameters.items)
      ? blockFieldAt(fields, parameters.items)
      : null;
    const source = activeSource(
      read(template),
      type,
      itemsField?.required && itemsField.list,
    );
    const bindings = new Map(Object.entries({ block: [], ...parameters }));
    const loops = [];
    const violations = [...source.matchAll(LIQUID_REGEX)].flatMap((match) => {
      const [, output, tag] = match;
      const context = Object.fromEntries(bindings);
      const resolve = (expression, assignment = false) =>
        resolveReference(expression, context, assignment);
      const stack = tagStackAt(source, match.index, initialStack);
      if (output !== undefined) {
        const line = source.slice(0, match.index).split("\n").length;
        return checkOutput({
          type,
          fields,
          body: output,
          reference: resolve(output),
          stack,
          embedded: seen.length > 0,
        }).map((message) => `${type} (${template}:${line}): ${message}`);
      }
      const assign = tag.match(/^assign\s+(\w+)\s*=\s*(.*)$/s);
      if (assign) bindings.set(assign[1], resolve(assign[2], true) ?? false);
      const loop = tag.match(/^for\s+(\w+)\s+in\s+(\S+)/);
      if (loop) {
        loops.unshift([loop[1], bindings.get(loop[1])]);
        bindings.set(loop[1], resolve(loop[2]) ?? false);
      }
      if (tag === "endfor") {
        const [name, previous] = loops.shift();
        if (previous === undefined) bindings.delete(name);
        else bindings.set(name, previous);
      }
      const include = tag.match(/^include\s+(["'])([^"']+)\1([\s\S]*)$/);
      if (!include) return [];
      const args = Object.fromEntries(
        [...include[3].matchAll(/(\w+)\s*:\s*([^,]+)/g)].map(
          ([, name, expression]) => [name, resolve(expression.trim()) ?? false],
        ),
      );
      return scan(
        include[2],
        { ...context, ...args },
        stack,
        seen.concat(template),
      );
    });
    return violations;
  };
  return scan(template, {}, [], []);
};
