import { Assumption } from '@/types';
import { calculateProjection } from './projectionEngine';
import { calculateNPV, calculateIRR, calculateDiscountedPayback } from './viabilityMetrics';

export interface SensitivityResult {
  variation: number;
  npv: number;
  irr: number | null;
  ebitda: number;
  payback: number | null;
}

export interface SingleSensitivityOutput {
  assumptionId: string;
  assumptionName: string;
  baseValue: number;
  results: SensitivityResult[];
}

export interface TornadoItem {
  assumptionId: string;
  name: string;
  category: string;
  vpnDown: number;
  vpnBase: number;
  vpnUp: number;
  deltaAbs: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  revenue: 'Receita',
  tax: 'Impostos',
  cost_variable: 'Custo Variável',
  cost_fixed: 'Custo Fixo',
  personnel: 'Pessoal',
  investment: 'Investimento',
  financial_revenue: 'Receita Fin.',
  financial_expense: 'Despesa Fin.',
  tax_profit: 'IR/CSLL',
  capital: 'Capital',
  base: 'Métrica Base',
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

function cloneAssumptions(assumptions: Assumption[]): Assumption[] {
  return assumptions.map(a => ({ ...a }));
}

function extractMetrics(
  assumptions: Assumption[],
  discountRate: number
): { npv: number; irr: number | null; ebitda: number; payback: number | null } {
  const proj = calculateProjection(assumptions);
  const cashFlows = proj.totals.cash_flow.map(m => m.value);
  const initialCF = proj.preOperational.cash_flow;
  const ebitda = proj.totals.ebitda.reduce((sum, m) => sum + m.value, 0);

  return {
    npv: calculateNPV(cashFlows, discountRate, initialCF),
    irr: calculateIRR(cashFlows, initialCF),
    ebitda,
    payback: calculateDiscountedPayback(cashFlows, discountRate, initialCF),
  };
}

/**
 * Runs sensitivity for a single assumption across multiple variation percentages.
 * `field` determines which property to vary: 'amount' or 'growth_rate'.
 */
export function runSingleSensitivity(
  assumptions: Assumption[],
  targetId: string,
  field: 'amount' | 'growth_rate',
  variations: number[],
  discountRate: number
): SingleSensitivityOutput | null {
  const target = assumptions.find(a => a.id === targetId);
  if (!target) return null;

  const baseValue = field === 'amount' ? target.amount : (target.growth_rate ?? 0);

  const results: SensitivityResult[] = variations.map(pct => {
    const cloned = cloneAssumptions(assumptions);
    const item = cloned.find(a => a.id === targetId)!;

    if (field === 'amount') {
      item.amount = baseValue * (1 + pct / 100);
    } else {
      item.growth_rate = baseValue * (1 + pct / 100);
    }

    const metrics = extractMetrics(cloned, discountRate);
    return { variation: pct, ...metrics };
  });

  return {
    assumptionId: targetId,
    assumptionName: target.name,
    baseValue,
    results,
  };
}

/**
 * Builds tornado chart data: for each non-base assumption, varies amount by
 * +/- variationPercent and measures VPL impact. Returns top N by absolute delta,
 * sorted descending.
 */
export function buildTornadoData(
  assumptions: Assumption[],
  discountRate: number,
  variationPercent: number = 20,
  maxItems: number = 10
): TornadoItem[] {
  const baseMetrics = extractMetrics(assumptions, discountRate);
  const vpnBase = baseMetrics.npv;

  const candidates = assumptions.filter(a => a.category !== 'base' && a.amount !== 0);

  const items: TornadoItem[] = candidates.map(target => {
    const downClone = cloneAssumptions(assumptions);
    const downItem = downClone.find(a => a.id === target.id)!;
    downItem.amount = target.amount * (1 - variationPercent / 100);
    const downMetrics = extractMetrics(downClone, discountRate);

    const upClone = cloneAssumptions(assumptions);
    const upItem = upClone.find(a => a.id === target.id)!;
    upItem.amount = target.amount * (1 + variationPercent / 100);
    const upMetrics = extractMetrics(upClone, discountRate);

    return {
      assumptionId: target.id,
      name: target.name,
      category: target.category,
      vpnDown: downMetrics.npv,
      vpnBase,
      vpnUp: upMetrics.npv,
      deltaAbs: Math.abs(upMetrics.npv - downMetrics.npv),
    };
  });

  items.sort((a, b) => b.deltaAbs - a.deltaAbs);
  return items.slice(0, maxItems);
}
