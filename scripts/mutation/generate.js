/**
 * Mutation generation.
 *
 * Parses a source file with oxc-parser and walks the AST, emitting mutants for:
 *   - binary / logical / assignment OPERATORS — swapped via the operators.js tables
 *   - UNARY operators                         — `!x → x` (drop a guard), `-x ↔ +x`
 *   - UPDATE operators                        — `i++ ↔ i--`
 *   - boolean LITERALS                        — `true ↔ false`
 *   - side-effect STATEMENTS                  — `await persist(x); → ;`
 *
 * Each mutant is a source span [start, end) replaced by `replacement` (which
 * defaults to the displayed `newOperator`). The operator-swap strategy — locate
 * the span between `left.end` and `right.start` — is derived from Mutasaurus
 * (MIT); see LICENSE.mutasaurus.md.
 *
 * oxc-parser reports UTF-16 offsets, so the `start`/`end` indices splice the
 * JavaScript source string directly, even when it contains non-ASCII text.
 */

import { parseSync } from "oxc-parser";
import { flatMap } from "#toolkit/fp/array.js";
import {
  assignmentOperators,
  assignmentOperatorsExhaustive,
  binaryOperators,
  binaryOperatorsExhaustive,
  logicalOperators,
  logicalOperatorsExhaustive,
} from "./operators.js";

const lineColumnAt = (content, index) => {
  const lines = content.slice(0, index).split("\n");
  return { column: lines.at(-1).length + 1, line: lines.length };
};

/** Build a mutant for the span [start, end), resolving its line/column. */
const spanMutant = (
  content,
  start,
  end,
  operator,
  newOperator,
  replacement,
) => {
  const { column, line } = lineColumnAt(content, start);
  return { column, end, line, newOperator, operator, replacement, start };
};

// --- Binary / logical / assignment operators -----------------------------

const MUTABLE_NODES = {
  AssignmentExpression: [assignmentOperators, assignmentOperatorsExhaustive],
  BinaryExpression: [binaryOperators, binaryOperatorsExhaustive],
  LogicalExpression: [logicalOperators, logicalOperatorsExhaustive],
};

const operatorMutants = (node, content, exhaustive) => {
  const tables = node.type ? MUTABLE_NODES[node.type] : undefined;
  const { left, operator, right } = node;
  if (!tables || !left || !right || !operator) return [];
  return (tables[exhaustive ? 1 : 0][operator] ?? []).map((newOperator) =>
    spanMutant(content, left.end, right.start, operator, newOperator),
  );
};

// --- Unary operators: `!x → x` (drop a guard), `-x ↔ +x` -----------------

const UNARY_MUTATIONS = {
  "-": [{ newOperator: "+", replacement: "+" }],
  "!": [{ newOperator: "∅", replacement: "" }],
  "+": [{ newOperator: "-", replacement: "-" }],
};

const unaryMutants = (node, content) => {
  const { argument, operator, start } = node;
  if (!argument || operator === undefined || start === undefined) return [];
  // A prefix unary operator occupies [node.start, argument.start).
  return (UNARY_MUTATIONS[operator] ?? []).map((m) =>
    spanMutant(
      content,
      start,
      argument.start,
      operator,
      m.newOperator,
      m.replacement,
    ),
  );
};

// --- Update operators: `i++ ↔ i--` ---------------------------------------

const updateMutants = (node, content) => {
  const { argument, end, operator, prefix, start } = node;
  // An UpdateExpression always carries argument/operator/start/end; this guard
  // is pure defence against a malformed node.
  if (!argument || operator === undefined) return [];
  const flipped = operator === "++" ? "--" : "++";
  // Prefix occupies [node.start, argument.start); postfix [argument.end, node.end).
  const [opStart, opEnd] = prefix
    ? [start, argument.start]
    : [argument.end, end];
  return [spanMutant(content, opStart, opEnd, operator, flipped, flipped)];
};

// --- Boolean literals: `true ↔ false` ------------------------------------

const booleanMutants = (node, content) => {
  if (
    typeof node.value !== "boolean" ||
    node.start === undefined ||
    node.end === undefined
  ) {
    return [];
  }
  const to = String(!node.value);
  return [
    spanMutant(content, node.start, node.end, String(node.value), to, to),
  ];
};

// --- Side-effect statement removal: `await persist(x); → ;` ---------------

const REMOVABLE_EXPRESSIONS = new Set(["AwaitExpression", "CallExpression"]);

const statementRemovalMutants = (node, content) => {
  const { end, expression, start } = node;
  if (
    !expression ||
    !REMOVABLE_EXPRESSIONS.has(expression.type ?? "") ||
    start === undefined ||
    end === undefined
  ) {
    return [];
  }
  // Use the full statement text as the operator so each removed-statement
  // mutant has a unique, stable key (truncating it could collide distinct
  // statements at the same position or let a stale ignore entry keep matching).
  const text = content.slice(start, end).replace(/\s+/g, " ").trim();
  // Replace with an empty statement — valid even as a braceless if/for/while body.
  return [spanMutant(content, start, end, text, "(removed)", ";")];
};

// --- Dispatch + entry point ----------------------------------------------

const mutantsForNode = (content, exhaustive) => (node) => {
  switch (node.type) {
    case "AssignmentExpression":
    case "BinaryExpression":
    case "LogicalExpression":
      return operatorMutants(node, content, exhaustive);
    case "UnaryExpression":
      return unaryMutants(node, content);
    case "UpdateExpression":
      return updateMutants(node, content);
    case "Literal":
      return booleanMutants(node, content);
    case "ExpressionStatement":
      return statementRemovalMutants(node, content);
    default:
      return [];
  }
};

/**
 * Fields whose value is a TypeScript type rather than runtime code. Crossing one
 * enters type context, and nothing runtime lives below a type, so the flag
 * sticks. Keying on the field (not the node's type) means runtime code carried
 * by TS-prefixed nodes is still mutated — e.g. `enum E { A = 1 + 2 }`,
 * `constructor(private x = build())`, and the operand of `x as T`.
 */
const TYPE_FIELDS = new Set([
  "returnType",
  "superTypeArguments",
  "typeAnnotation",
  "typeArguments",
  "typeParameters",
]);

/**
 * Depth-first stream of every typed node, tagged with whether it sits inside a
 * TypeScript type. A type is erased at runtime, so mutating it (e.g. the `true`
 * in `{ ok: true }`) is always an equivalent no-op — those nodes are skipped.
 */
function* walkChild(value, inType) {
  if (Array.isArray(value)) {
    for (const child of value) yield* walk(child, inType);
  } else if (value && typeof value === "object") {
    yield* walk(value, inType);
  }
}

function* walk(node, inType = false) {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") yield { inType, node };
  for (const [key, value] of Object.entries(node)) {
    yield* walkChild(value, inType || TYPE_FIELDS.has(key));
  }
}

/** Generate every mutant for a source file's contents. */
export const generateMutants = (content, filePath, exhaustive) => {
  const fileName = filePath.split("/").pop() ?? filePath;
  const { program } = parseSync(fileName, content);
  const mutate = mutantsForNode(content, exhaustive);
  return flatMap((entry) => (entry.inType ? [] : mutate(entry.node)))([
    ...walk(program),
  ]);
};

/** Apply a mutant to the original source, returning the mutated source. */
export const applyMutant = (content, mutant) =>
  `${content.slice(0, mutant.start)} ${
    mutant.replacement ?? mutant.newOperator
  } ${content.slice(mutant.end)}`;
