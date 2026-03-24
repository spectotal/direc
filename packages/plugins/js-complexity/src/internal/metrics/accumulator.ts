export type MetricAccumulator = {
  cyclomatic: number;
  logicalSloc: number;
  methodCount: number;
  operatorCounts: Map<string, number>;
  operandCounts: Map<string, number>;
};

export function createMetricAccumulator(): MetricAccumulator {
  return {
    cyclomatic: 1,
    logicalSloc: 0,
    methodCount: 0,
    operandCounts: new Map(),
    operatorCounts: new Map(),
  };
}

export function incrementCyclomatic(
  accumulator: MetricAccumulator,
  allowCyclomatic: boolean,
  amount: number,
): void {
  if (allowCyclomatic) {
    accumulator.cyclomatic += amount;
  }
}

export function incrementLogicalSloc(
  accumulator: MetricAccumulator,
  allowLogicalSloc: boolean,
  amount: number,
): void {
  if (allowLogicalSloc) {
    accumulator.logicalSloc += amount;
  }
}

export function recordOperator(accumulator: MetricAccumulator, operator: string | undefined): void {
  if (!operator) {
    return;
  }

  recordCount(accumulator.operatorCounts, operator, 1);
}

export function recordOperatorCount(
  accumulator: MetricAccumulator,
  operator: string,
  amount: number,
): void {
  if (amount <= 0) {
    return;
  }

  recordCount(accumulator.operatorCounts, operator, amount);
}

export function recordOperand(accumulator: MetricAccumulator, operand: string): void {
  recordCount(accumulator.operandCounts, operand, 1);
}

function recordCount(counts: Map<string, number>, identifier: string, amount: number): void {
  counts.set(identifier, (counts.get(identifier) ?? 0) + amount);
}
