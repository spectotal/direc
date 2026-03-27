import type { MetricAccumulator } from "./accumulator.js";

type HalsteadMetrics = {
  difficulty: number;
  effort: number;
  volume: number;
};

export function calculateHalsteadMetrics(accumulator: MetricAccumulator): HalsteadMetrics {
  const distinctOperators = accumulator.operatorCounts.size;
  const distinctOperands = accumulator.operandCounts.size;
  const totalOperators = sumCounts(accumulator.operatorCounts);
  const totalOperands = sumCounts(accumulator.operandCounts);
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

export function calculateMaintainability(options: {
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

function sumCounts(counts: Map<string, number>): number {
  let total = 0;

  for (const count of counts.values()) {
    total += count;
  }

  return total;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}
