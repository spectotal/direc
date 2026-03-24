import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { getKeys, visitorKeys } from "@typescript-eslint/visitor-keys";
import { parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import type { AnalyzerPrerequisiteResult } from "direc-analysis-runtime";

const JSX_EXTENSIONS = new Set([".jsx", ".tsx"]);
const MODULE_SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const SCRIPT_SOURCE_EXTENSIONS = new Set([".cjs", ".cts"]);
const RUNTIME_TS_NODE_TYPES = new Set([
  "TSAsExpression",
  "TSEnumDeclaration",
  "TSEnumMember",
  "TSExportAssignment",
  "TSInstantiationExpression",
  "TSModuleBlock",
  "TSModuleDeclaration",
  "TSNonNullExpression",
  "TSParameterProperty",
  "TSSatisfiesExpression",
]);
const DEFAULT_TRAVERSAL_CONTEXT: TraversalContext = {
  allowCyclomatic: true,
  allowLogicalSloc: true,
};

export type ComplexityMetric = {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
};

export type ComplexityAnalysisError = {
  path: string;
  message: string;
};

export type ComplexityRunnerResult = {
  metrics: ComplexityMetric[];
  skippedFiles: ComplexityAnalysisError[];
};

type ParsedProgram = TSESTree.Program & {
  tokens: TSESTree.Token[];
};

type TraversalContext = {
  allowCyclomatic: boolean;
  allowLogicalSloc: boolean;
};

type MetricAccumulator = {
  cyclomatic: number;
  logicalSloc: number;
  methodCount: number;
  operatorCounts: Map<string, number>;
  operandCounts: Map<string, number>;
};

type HalsteadMetrics = {
  difficulty: number;
  effort: number;
  volume: number;
};

export async function defaultPrerequisiteCheck(): Promise<AnalyzerPrerequisiteResult> {
  try {
    await Promise.all([
      import("@typescript-eslint/typescript-estree"),
      import("@typescript-eslint/visitor-keys"),
    ]);

    return {
      ok: true,
      summary: "typescript-estree parser is available.",
    };
  } catch (error) {
    return {
      ok: false,
      summary: "typescript-estree parser is not available.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runComplexityTool(options: {
  repositoryRoot: string;
  sourcePaths: string[];
}): Promise<ComplexityRunnerResult> {
  const metrics: ComplexityMetric[] = [];
  const skippedFiles: ComplexityAnalysisError[] = [];

  for (const sourcePath of options.sourcePaths) {
    try {
      const absolutePath = resolve(options.repositoryRoot, sourcePath);
      const source = await readFile(absolutePath, "utf8");
      const analysis = analyzeSource(source, absolutePath);

      metrics.push({
        path: sourcePath,
        cyclomatic: analysis.cyclomatic,
        logicalSloc: analysis.logicalSloc,
        maintainability: analysis.maintainability,
      });
    } catch (error) {
      skippedFiles.push({
        path: sourcePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    metrics,
    skippedFiles,
  };
}

export function analyzeSource(source: string, filePath: string): Omit<ComplexityMetric, "path"> {
  const program = parseSource(source, filePath);
  const accumulator = createMetricAccumulator();

  traverse(program, null, accumulator, DEFAULT_TRAVERSAL_CONTEXT);

  const halstead = calculateHalsteadMetrics(accumulator.operatorCounts, accumulator.operandCounts);

  return {
    cyclomatic: accumulator.cyclomatic,
    logicalSloc: accumulator.logicalSloc,
    maintainability: calculateMaintainability({
      cyclomatic: accumulator.cyclomatic,
      halstead,
      logicalSloc: accumulator.logicalSloc,
      methodCount: accumulator.methodCount,
    }),
  };
}

export function parseSource(source: string, filePath: string): ParsedProgram {
  const extension = extname(filePath).toLowerCase();
  const jsx = JSX_EXTENSIONS.has(extension);
  const sourceTypes = resolveSourceTypes(extension);
  let lastError: unknown;

  for (const sourceType of sourceTypes) {
    try {
      return parse(source, {
        comment: false,
        filePath,
        jsDocParsingMode: "none",
        jsx,
        loc: true,
        range: true,
        sourceType,
        tokens: true,
      }) as ParsedProgram;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function resolveSourceTypes(extension: string): Array<"module" | "script"> {
  if (SCRIPT_SOURCE_EXTENSIONS.has(extension)) {
    return ["script", "module"];
  }

  if (MODULE_SOURCE_EXTENSIONS.has(extension)) {
    return ["module", "script"];
  }

  return ["module", "script"];
}

function createMetricAccumulator(): MetricAccumulator {
  return {
    cyclomatic: 1,
    logicalSloc: 0,
    methodCount: 0,
    operandCounts: new Map(),
    operatorCounts: new Map(),
  };
}

function traverse(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): void {
  if (shouldSkipNode(node, parent)) {
    return;
  }

  applyNodeMetrics(node, parent, accumulator, context);

  const keys = visitorKeys[node.type as keyof typeof visitorKeys] ?? getKeys(node);

  for (const key of keys) {
    if (shouldSkipChild(node, key)) {
      continue;
    }

    const childContext = getChildContext(node, key, context);
    const child = (node as unknown as Record<string, unknown>)[key];

    if (Array.isArray(child)) {
      for (const entry of child) {
        if (isNode(entry)) {
          traverse(entry, node, accumulator, childContext);
        }
      }

      continue;
    }

    if (isNode(child)) {
      traverse(child, node, accumulator, childContext);
    }
  }
}

function shouldSkipNode(node: TSESTree.Node, parent: TSESTree.Node | null): boolean {
  if (isDeclareOnlyNode(node)) {
    return true;
  }

  if (isNoOpArrowFunction(node, parent)) {
    return true;
  }

  if (node.type === "ImportDeclaration") {
    return true;
  }

  if (node.type === "ExportAllDeclaration") {
    return true;
  }

  if (node.type === "TSImportEqualsDeclaration") {
    return true;
  }

  if (node.type === "TSNamespaceExportDeclaration") {
    return true;
  }

  if (node.type === "TSDeclareFunction") {
    return true;
  }

  if (node.type.startsWith("TS") && !RUNTIME_TS_NODE_TYPES.has(node.type)) {
    return true;
  }

  return false;
}

function shouldSkipChild(node: TSESTree.Node, key: string): boolean {
  switch (node.type) {
    case "ExportDefaultDeclaration":
      return key !== "declaration";

    case "ExportNamedDeclaration":
      if (node.declaration) {
        return key !== "declaration";
      }

      return true;

    case "TSExportAssignment":
      return key !== "expression";

    default:
      return false;
  }
}

function getChildContext(
  node: TSESTree.Node,
  key: string,
  context: TraversalContext,
): TraversalContext {
  switch (node.type) {
    case "ArrowFunctionExpression":
    case "FunctionDeclaration":
    case "FunctionExpression":
      if (key === "id" || key === "params" || key === "returnType" || key === "typeParameters") {
        return suppressStructuralMetrics(context);
      }

      return context;

    case "CatchClause":
      return key === "param" ? suppressStructuralMetrics(context) : context;

    case "ClassDeclaration":
    case "ClassExpression":
      if (
        key === "id" ||
        key === "implements" ||
        key === "superClass" ||
        key === "superTypeArguments" ||
        key === "typeParameters"
      ) {
        return suppressStructuralMetrics(context);
      }

      return context;

    case "ForInStatement":
    case "ForOfStatement":
      return key === "left" || key === "right" ? suppressStructuralMetrics(context) : context;

    case "ForStatement":
      return key === "init" || key === "test" || key === "update"
        ? suppressStructuralMetrics(context)
        : context;

    case "MethodDefinition":
    case "PropertyDefinition":
      return key === "key" ? suppressStructuralMetrics(context) : context;

    case "TSModuleDeclaration":
      return key === "id" ? suppressStructuralMetrics(context) : context;

    case "TSParameterProperty":
      return key === "parameter" ? suppressStructuralMetrics(context) : context;

    default:
      return context;
  }
}

function suppressStructuralMetrics(context: TraversalContext): TraversalContext {
  return {
    ...context,
    allowCyclomatic: false,
    allowLogicalSloc: false,
  };
}

function applyNodeMetrics(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): void {
  switch (node.type) {
    case "ArrayExpression":
    case "ArrayPattern":
      recordOperator(accumulator, "[]");
      recordOperatorCount(accumulator, ",", Math.max(node.elements.length - 1, 0));
      return;

    case "ArrowFunctionExpression":
      if (parent && parent.type !== "ExpressionStatement") {
        accumulator.methodCount += 1;
        incrementCyclomatic(accumulator, context, 1);
        incrementLogicalSloc(accumulator, context, 1);
        recordOperator(accumulator, "function=>");

        if (node.body.type !== "BlockStatement") {
          incrementLogicalSloc(accumulator, context, 1);
        }
      }
      return;

    case "AssignmentExpression":
      if (parent?.type !== "ExpressionStatement") {
        incrementLogicalSloc(accumulator, context, 1);
      }
      recordOperator(accumulator, node.operator);
      return;

    case "AssignmentPattern":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "=");
      return;

    case "AwaitExpression":
      recordOperator(accumulator, "await");
      return;

    case "BinaryExpression":
      recordOperator(accumulator, node.operator);
      return;

    case "BreakStatement":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "break");
      return;

    case "CallExpression":
      if (parent?.type !== "ExpressionStatement" && parent?.type !== "YieldExpression") {
        incrementLogicalSloc(accumulator, context, 1);
      }
      recordOperator(accumulator, "()");
      return;

    case "CatchClause":
      incrementCyclomatic(accumulator, context, 1);
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "catch");
      return;

    case "ClassDeclaration":
    case "ClassExpression":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "class");
      if (node.superClass) {
        recordOperator(accumulator, "extends");
      }
      return;

    case "ConditionalExpression":
      incrementCyclomatic(accumulator, context, 1);
      recordOperator(accumulator, ":?");
      return;

    case "ContinueStatement":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "continue");
      return;

    case "DoWhileStatement":
      incrementCyclomatic(accumulator, context, 1);
      incrementLogicalSloc(accumulator, context, 2);
      recordOperator(accumulator, "dowhile");
      return;

    case "ExpressionStatement":
      incrementLogicalSloc(accumulator, context, 1);
      return;

    case "ForInStatement":
      incrementCyclomatic(accumulator, context, 1);
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "forin");
      return;

    case "ForOfStatement":
      incrementCyclomatic(accumulator, context, 1);
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "forof");
      return;

    case "ForStatement":
      incrementCyclomatic(accumulator, context, 1);
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "for");
      return;

    case "FunctionDeclaration":
    case "FunctionExpression":
      accumulator.methodCount += 1;
      incrementCyclomatic(accumulator, context, 1);
      incrementLogicalSloc(accumulator, context, 1);

      if (parent?.type === "MethodDefinition") {
        if (node.generator) {
          recordOperator(accumulator, "function*");
        }
      } else {
        recordOperator(accumulator, node.generator ? "function*" : "function");
      }
      return;

    case "Identifier":
      recordOperand(accumulator, node.name);
      return;

    case "IfStatement":
      incrementCyclomatic(accumulator, context, 1);
      incrementLogicalSloc(accumulator, context, node.alternate ? 2 : 1);
      recordOperator(accumulator, "if");
      if (node.alternate) {
        recordOperator(accumulator, "else");
      }
      return;

    case "ImportExpression":
      if (parent?.type !== "ExpressionStatement") {
        incrementLogicalSloc(accumulator, context, 1);
      }
      recordOperator(accumulator, "import()");
      return;

    case "Literal":
      recordOperand(accumulator, normalizeLiteral(node));
      return;

    case "LogicalExpression":
      if (node.operator === "&&" || node.operator === "||" || node.operator === "??") {
        incrementCyclomatic(accumulator, context, 1);
      }
      recordOperator(accumulator, node.operator);
      return;

    case "MemberExpression":
      recordOperator(accumulator, node.computed ? "[]" : ".");
      return;

    case "MetaProperty":
      recordOperator(accumulator, ".");
      return;

    case "MethodDefinition":
      if (node.kind === "get" || node.kind === "set") {
        recordOperator(accumulator, node.kind);
      }
      if (node.static) {
        recordOperator(accumulator, "static");
      }
      return;

    case "NewExpression":
      recordOperator(accumulator, "new");
      if (node.callee.type === "FunctionExpression") {
        incrementLogicalSloc(accumulator, context, 1);
      }
      return;

    case "ObjectExpression":
    case "ObjectPattern":
      recordOperator(accumulator, "{}");
      return;

    case "PrivateIdentifier":
      recordOperand(accumulator, `#${node.name}`);
      return;

    case "Property":
      incrementLogicalSloc(accumulator, context, 1);
      if (!node.shorthand) {
        recordOperator(accumulator, ":");
      }
      return;

    case "PropertyDefinition":
      incrementLogicalSloc(accumulator, context, 1);
      if (node.static) {
        recordOperator(accumulator, "static");
      }
      if (node.value) {
        recordOperator(accumulator, "=");
      }
      return;

    case "RestElement":
      recordOperator(accumulator, "... (rest)");
      return;

    case "ReturnStatement":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "return");
      return;

    case "SpreadElement":
      recordOperator(accumulator, "... (spread)");
      return;

    case "Super":
      recordOperator(accumulator, "super");
      return;

    case "SwitchCase":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, node.test ? "case" : "default");
      if (node.test) {
        incrementCyclomatic(accumulator, context, 1);
      }
      return;

    case "SwitchStatement":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "switch");
      return;

    case "TaggedTemplateExpression":
      incrementLogicalSloc(accumulator, context, 1);
      return;

    case "TemplateElement":
      if (node.value.cooked) {
        recordOperand(accumulator, node.value.cooked);
      }
      return;

    case "TemplateLiteral":
      recordOperator(accumulator, "``");
      recordOperatorCount(accumulator, "${}", node.expressions.length);
      return;

    case "ThisExpression":
      recordOperator(accumulator, "this");
      return;

    case "ThrowStatement":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "throw");
      return;

    case "TryStatement":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "try");
      if (node.finalizer) {
        recordOperator(accumulator, "finally");
      }
      return;

    case "TSEnumDeclaration":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "enum");
      return;

    case "UnaryExpression":
      recordOperator(accumulator, `${node.operator} (${node.prefix ? "pre" : "post"}fix)`);
      return;

    case "UpdateExpression":
      recordOperator(accumulator, `${node.operator} (${node.prefix ? "pre" : "post"}fix)`);
      return;

    case "VariableDeclaration":
      recordOperator(accumulator, node.kind);
      return;

    case "VariableDeclarator":
      incrementLogicalSloc(accumulator, context, 1);
      if (node.init) {
        recordOperator(accumulator, "=");
      }
      return;

    case "WhileStatement":
      incrementCyclomatic(accumulator, context, 1);
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "while");
      return;

    case "WithStatement":
      incrementLogicalSloc(accumulator, context, 1);
      recordOperator(accumulator, "with");
      return;

    case "YieldExpression":
      if (parent?.type !== "ExpressionStatement") {
        incrementLogicalSloc(accumulator, context, 1);
      }
      recordOperator(accumulator, node.delegate ? "yield*" : "yield");
      return;

    default:
      return;
  }
}

function incrementCyclomatic(
  accumulator: MetricAccumulator,
  context: TraversalContext,
  amount: number,
): void {
  if (context.allowCyclomatic) {
    accumulator.cyclomatic += amount;
  }
}

function incrementLogicalSloc(
  accumulator: MetricAccumulator,
  context: TraversalContext,
  amount: number,
): void {
  if (context.allowLogicalSloc) {
    accumulator.logicalSloc += amount;
  }
}

function recordOperator(accumulator: MetricAccumulator, operator: string | undefined): void {
  if (!operator) {
    return;
  }

  recordCount(accumulator.operatorCounts, operator, 1);
}

function recordOperatorCount(
  accumulator: MetricAccumulator,
  operator: string,
  amount: number,
): void {
  if (amount <= 0) {
    return;
  }

  recordCount(accumulator.operatorCounts, operator, amount);
}

function recordOperand(accumulator: MetricAccumulator, operand: string): void {
  recordCount(accumulator.operandCounts, operand, 1);
}

function recordCount(counts: Map<string, number>, identifier: string, amount: number): void {
  counts.set(identifier, (counts.get(identifier) ?? 0) + amount);
}

function calculateHalsteadMetrics(
  operatorCounts: Map<string, number>,
  operandCounts: Map<string, number>,
): HalsteadMetrics {
  const distinctOperators = operatorCounts.size;
  const distinctOperands = operandCounts.size;
  const totalOperators = sumCounts(operatorCounts);
  const totalOperands = sumCounts(operandCounts);
  const length = totalOperators + totalOperands;

  if (length === 0) {
    return {
      difficulty: 0,
      effort: 0,
      volume: 0,
    };
  }

  const vocabulary = distinctOperators + distinctOperands;
  const difficulty =
    (distinctOperators / 2) * (distinctOperands === 0 ? 1 : totalOperands / distinctOperands);
  const volume = length * Math.log2(vocabulary);

  return {
    difficulty,
    effort: difficulty * volume,
    volume,
  };
}

function sumCounts(counts: Map<string, number>): number {
  let total = 0;

  for (const count of counts.values()) {
    total += count;
  }

  return total;
}

function calculateMaintainability(options: {
  cyclomatic: number;
  halstead: HalsteadMetrics;
  logicalSloc: number;
  methodCount: number;
}): number {
  const divisor = options.methodCount + 1;
  const averageCyclomatic = options.cyclomatic / divisor;
  const averageEffort = options.halstead.effort / divisor;
  const averageLoc = options.logicalSloc / divisor;

  if (averageEffort <= 0 || averageLoc <= 0) {
    return 171;
  }

  const maintainability =
    171 -
    3.42 * Math.log(averageEffort) -
    (averageCyclomatic === 0 ? 0 : Math.log(averageCyclomatic)) -
    16.2 * Math.log(averageLoc);

  return roundMetric(Math.min(171, maintainability));
}

function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}

function normalizeLiteral(node: TSESTree.Literal): string {
  const literal = node as unknown as {
    raw?: string;
    value?: unknown;
  };

  if (typeof literal.raw === "string") {
    return literal.raw;
  }

  if (typeof literal.value === "string") {
    return JSON.stringify(literal.value);
  }

  return String(literal.value);
}

function isDeclareOnlyNode(node: TSESTree.Node): boolean {
  if ("declare" in node && node.declare === true) {
    return true;
  }

  if (
    (node.type === "MethodDefinition" || node.type === "PropertyDefinition") &&
    "abstract" in node &&
    node.abstract === true
  ) {
    return true;
  }

  return false;
}

function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

function isNoOpArrowFunction(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
): node is TSESTree.ArrowFunctionExpression {
  return node.type === "ArrowFunctionExpression" && parent?.type === "ExpressionStatement";
}
