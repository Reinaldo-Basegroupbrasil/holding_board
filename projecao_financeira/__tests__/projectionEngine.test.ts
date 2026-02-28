import { describe, it, expect } from 'vitest';
import { Assumption } from '@/types';
import {
  calculateValue,
  buildRates,
  calculateWithGrowthDelay,
  calculateProjection,
  TaxConfig,
} from '@/lib/projectionEngine';

// ---------------------------------------------------------------------------
// Factory: creates an Assumption with sensible defaults
// ---------------------------------------------------------------------------
function makeAssumption(overrides: Partial<Assumption> = {}): Assumption {
  return {
    id: 'a1',
    project_id: 'p1',
    name: 'Test Item',
    category: 'revenue',
    amount: 1000,
    is_recurring: true,
    start_month: 1,
    ...overrides,
  };
}

// ============================= HELPERS =====================================

describe('calculateValue', () => {
  it('returns baseAmount when rate is 0', () => {
    expect(calculateValue(500, 10, [0])).toBe(500);
  });

  it('returns baseAmount when rates array is empty (fallback 0)', () => {
    expect(calculateValue(500, 10, [])).toBe(500);
  });

  it('applies linear growth correctly', () => {
    // base + rate * monthIndex
    expect(calculateValue(100, 5, [10], 'linear')).toBe(100 + 10 * 5);
  });

  it('applies percentage (compound) growth correctly', () => {
    const base = 1000;
    const rate = 12; // 12% annual
    const monthlyRate = rate / 100 / 12;
    const month = 6;
    const expected = base * Math.pow(1 + monthlyRate, month);
    expect(calculateValue(base, month, [rate])).toBeCloseTo(expected, 4);
  });

  it('selects rate by year index', () => {
    const rates = [10, 20, 30];
    // month 0-11 → year 0 → rate 10
    const r0 = 10 / 100 / 12;
    expect(calculateValue(100, 6, rates)).toBeCloseTo(100 * Math.pow(1 + r0, 6), 4);

    // month 12 → year 1 → rate 20
    const r1 = 20 / 100 / 12;
    expect(calculateValue(100, 12, rates)).toBeCloseTo(100 * Math.pow(1 + r1, 12), 4);

    // month 24 → year 2 → rate 30
    const r2 = 30 / 100 / 12;
    expect(calculateValue(100, 24, rates)).toBeCloseTo(100 * Math.pow(1 + r2, 24), 4);
  });

  it('clamps to last rate when yearIdx exceeds array length', () => {
    const rates = [10];
    // month 24 → year 2, but only 1 rate → uses rates[0]=10
    const r0 = 10 / 100 / 12;
    expect(calculateValue(100, 24, rates)).toBeCloseTo(100 * Math.pow(1 + r0, 24), 4);
  });

  it('linear growth with multi-year rates selects by year', () => {
    const rates = [5, 15];
    // month 6 → year 0 → rate 5: 100 + 5*6 = 130
    expect(calculateValue(100, 6, rates, 'linear')).toBe(130);
    // month 14 → year 1 → rate 15: 100 + 15*14 = 310
    expect(calculateValue(100, 14, rates, 'linear')).toBe(310);
  });
});

describe('buildRates', () => {
  it('returns all defined rates', () => {
    const item = makeAssumption({
      growth_rate: 10,
      growth_rate_y2: 20,
      growth_rate_y3: 30,
      growth_rate_y4: 40,
      growth_rate_y5: 50,
    });
    expect(buildRates(item)).toEqual([10, 20, 30, 40, 50]);
  });

  it('cascades from growth_rate when others are null/undefined', () => {
    const item = makeAssumption({ growth_rate: 15 });
    expect(buildRates(item)).toEqual([15, 15, 15, 15, 15]);
  });

  it('cascades partially defined rates', () => {
    const item = makeAssumption({
      growth_rate: 10,
      growth_rate_y2: 20,
      growth_rate_y3: null,
      growth_rate_y4: null,
      growth_rate_y5: null,
    });
    expect(buildRates(item)).toEqual([10, 20, 20, 20, 20]);
  });

  it('returns all zeros when nothing is defined', () => {
    const item = makeAssumption({ growth_rate: undefined });
    expect(buildRates(item)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('calculateWithGrowthDelay', () => {
  const rates = [12];

  it('delegates to calculateValue when no delay', () => {
    const result = calculateWithGrowthDelay(100, 5, 6, 1, null, rates);
    expect(result).toBeCloseTo(calculateValue(100, 5, rates), 4);
  });

  it('returns baseAmount before growthStartMonth', () => {
    const result = calculateWithGrowthDelay(100, 3, 4, 1, 6, rates);
    expect(result).toBe(100);
  });

  it('starts growth from growthStartMonth', () => {
    // absoluteMonth=7, growthStartMonth=6 → growthMonths=2
    const result = calculateWithGrowthDelay(100, 6, 7, 1, 6, rates);
    expect(result).toBeCloseTo(calculateValue(100, 2, rates), 4);
  });

  it('at exactly growthStartMonth, growthMonths = 1', () => {
    const result = calculateWithGrowthDelay(100, 5, 6, 1, 6, rates);
    expect(result).toBeCloseTo(calculateValue(100, 1, rates), 4);
  });

  it('does not delay when growthStartMonth <= startMonth', () => {
    const result = calculateWithGrowthDelay(100, 5, 6, 3, 2, rates);
    expect(result).toBeCloseTo(calculateValue(100, 5, rates), 4);
  });

  it('works with linear growth type', () => {
    const result = calculateWithGrowthDelay(100, 3, 8, 1, 6, [50], 'linear');
    // growthMonths = 8 - 6 + 1 = 3
    expect(result).toBe(calculateValue(100, 3, [50], 'linear'));
  });
});

// ======================== calculateProjection ==============================

describe('calculateProjection', () => {
  describe('basic structure', () => {
    it('returns correct structure with empty assumptions', () => {
      const result = calculateProjection([]);
      expect(result.totals).toBeDefined();
      expect(result.preOperational).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.totals.revenue).toHaveLength(36);
    });

    it('respects custom monthsToProject', () => {
      const result = calculateProjection([], undefined, 12);
      expect(result.totals.revenue).toHaveLength(12);
      expect(result.totals.cash_flow).toHaveLength(12);
    });

    it('all values are zero for empty assumptions', () => {
      const result = calculateProjection([]);
      result.totals.revenue.forEach(m => expect(m.value).toBe(0));
      result.totals.ebitda.forEach(m => expect(m.value).toBe(0));
      expect(result.preOperational.revenue).toBe(0);
    });
  });

  describe('simple recurring revenue', () => {
    it('produces constant monthly revenue with no growth', () => {
      const items = [makeAssumption({ amount: 1000, category: 'revenue' })];
      const result = calculateProjection(items, undefined, 12);
      result.totals.revenue.forEach(m => {
        expect(m.value).toBeCloseTo(1000, 2);
      });
    });

    it('flows into net_revenue as revenue - taxes_sale', () => {
      const items = [
        makeAssumption({ id: 'rev', amount: 1000, category: 'revenue' }),
        makeAssumption({ id: 'tax', amount: 100, category: 'tax' }),
      ];
      const result = calculateProjection(items, undefined, 6);
      result.totals.net_revenue.forEach(m => {
        expect(m.value).toBeCloseTo(900, 2);
      });
    });
  });

  describe('non-recurring (single event)', () => {
    it('appears only in the specified start_month', () => {
      const items = [makeAssumption({
        amount: 5000,
        category: 'revenue',
        is_recurring: false,
        start_month: 3,
      })];
      const result = calculateProjection(items, undefined, 12);
      result.totals.revenue.forEach((m, i) => {
        if (i === 2) { // month 3 is index 2
          expect(m.value).toBeCloseTo(5000, 2);
        } else {
          expect(m.value).toBe(0);
        }
      });
    });
  });

  describe('setup (start_month=0)', () => {
    it('adds to preOperational, not to monthly totals', () => {
      const items = [makeAssumption({
        amount: 50000,
        category: 'investment',
        start_month: 0,
      })];
      const result = calculateProjection(items, undefined, 6);
      expect(result.preOperational.investment).toBe(50000);
      result.totals.investment.forEach(m => expect(m.value).toBe(0));
    });

    it('setup affects preOperational cash_flow', () => {
      const items = [makeAssumption({
        amount: 10000,
        category: 'investment',
        start_month: 0,
      })];
      const result = calculateProjection(items, undefined, 6);
      expect(result.preOperational.cash_flow).toBe(-10000);
    });
  });

  describe('base drivers', () => {
    it('populates driver values for base category items', () => {
      const base = makeAssumption({
        id: 'cards',
        category: 'base',
        amount: 100,
        start_month: 1,
      });
      const rev = makeAssumption({
        id: 'rev',
        category: 'revenue',
        amount: 10,
        driver_id: 'cards',
        driver_type: 'total',
      });
      const result = calculateProjection([base, rev], undefined, 6);
      // Revenue = 10 * 100 = 1000 per month (no growth)
      result.totals.revenue.forEach(m => {
        expect(m.value).toBeCloseTo(1000, 2);
      });
    });
  });

  describe('base-to-base composition (total)', () => {
    it('child base adds to parent value', () => {
      const parent = makeAssumption({
        id: 'parent',
        category: 'base',
        amount: 100,
        start_month: 1,
      });
      const child = makeAssumption({
        id: 'child',
        category: 'base',
        amount: 50,
        start_month: 1,
        driver_id: 'parent',
        driver_type: 'total',
      });
      const rev = makeAssumption({
        id: 'rev',
        category: 'revenue',
        amount: 1,
        driver_id: 'parent',
        driver_type: 'total',
      });
      const result = calculateProjection([parent, child, rev], undefined, 6);
      // Parent = 100, child adds 50 → total 150
      result.totals.revenue.forEach(m => {
        expect(m.value).toBeCloseTo(150, 2);
      });
    });
  });

  describe('base-to-base composition (delta)', () => {
    it('accumulates child deltas onto parent', () => {
      const parent = makeAssumption({
        id: 'parent',
        category: 'base',
        amount: 100,
        start_month: 1,
      });
      const child = makeAssumption({
        id: 'child',
        category: 'base',
        amount: 10,
        start_month: 1,
        driver_id: 'parent',
        driver_type: 'delta',
      });
      const rev = makeAssumption({
        id: 'rev',
        category: 'revenue',
        amount: 1,
        driver_id: 'parent',
        driver_type: 'total',
      });
      const result = calculateProjection([parent, child, rev], undefined, 4);
      // Month 1: parent=100, child delta accumulated=10 → total=110, rev=110
      // Month 2: parent=100, child delta accumulated=10+10=20 → total=120, rev=120
      // Month 3: 130, Month 4: 140
      expect(result.totals.revenue[0].value).toBeCloseTo(110, 2);
      expect(result.totals.revenue[1].value).toBeCloseTo(120, 2);
      expect(result.totals.revenue[2].value).toBeCloseTo(130, 2);
      expect(result.totals.revenue[3].value).toBeCloseTo(140, 2);
    });
  });

  describe('driver-linked revenue with delta type', () => {
    it('multiplies only by the delta of the driver', () => {
      const base = makeAssumption({
        id: 'cards',
        category: 'base',
        amount: 100,
        start_month: 1,
        growth_rate: 120, // 120% annual → grows each month
        growth_type: 'percentage',
      });
      const cost = makeAssumption({
        id: 'cost',
        category: 'cost_variable',
        amount: 5,
        driver_id: 'cards',
        driver_type: 'delta',
      });
      const result = calculateProjection([base, cost], undefined, 3);
      // delta = driver[m] - driver[m-1]. For m=0, prev=0 so delta = driver[0]
      // cost = 5 * delta
      const d0 = result.items.find(i => i.assumptionId === 'cards')!.data[0].value;
      expect(result.totals.costs_variable[0].value).toBeCloseTo(5 * d0, 2);
    });
  });

  describe('percentage format with driver', () => {
    it('divides amount by 100 before multiplying by driver', () => {
      const base = makeAssumption({
        id: 'volume',
        category: 'base',
        amount: 10000,
        start_month: 1,
      });
      const fee = makeAssumption({
        id: 'fee',
        category: 'cost_variable',
        amount: 1.5,
        format: 'percent',
        driver_id: 'volume',
        driver_type: 'total',
      });
      const result = calculateProjection([base, fee], undefined, 3);
      // fee = (1.5 / 100) * 10000 = 150
      result.totals.costs_variable.forEach(m => {
        expect(m.value).toBeCloseTo(150, 2);
      });
    });
  });

  describe('depreciation from investment', () => {
    it('spreads investment over amortization_period months', () => {
      const inv = makeAssumption({
        id: 'inv',
        category: 'investment',
        amount: 12000,
        start_month: 1,
        amortization_period: 12,
      });
      const result = calculateProjection([inv], undefined, 18);
      // Months 0-11: 12000/12 = 1000 each
      for (let i = 0; i < 12; i++) {
        expect(result.totals.depreciation[i].value).toBeCloseTo(1000, 2);
      }
      // Months 12+: 0
      for (let i = 12; i < 18; i++) {
        expect(result.totals.depreciation[i].value).toBe(0);
      }
    });
  });

  describe('payment lag', () => {
    it('shifts cash flow by the lag amount', () => {
      const rev = makeAssumption({
        id: 'rev',
        category: 'revenue',
        amount: 1000,
        payment_lag: 2,
      });
      const result = calculateProjection([rev], undefined, 6);
      // Month 0,1: no cash from revenue (lag=2)
      expect(result.totals.cash_flow[0].value).toBe(0);
      expect(result.totals.cash_flow[1].value).toBe(0);
      // Month 2+: 1000
      expect(result.totals.cash_flow[2].value).toBeCloseTo(1000, 2);
    });
  });

  describe('auto tax mode', () => {
    it('calculates tax as rate% of positive EBT', () => {
      const rev = makeAssumption({
        id: 'rev',
        category: 'revenue',
        amount: 10000,
      });
      const cost = makeAssumption({
        id: 'cost',
        category: 'cost_fixed',
        amount: 3000,
      });
      const taxConfig: TaxConfig = { mode: 'auto', rate: 34 };
      const result = calculateProjection([rev, cost], taxConfig, 3);

      const ebt0 = result.totals.ebt[0].value;
      expect(ebt0).toBeGreaterThan(0);
      expect(result.totals.tax_profit[0].value).toBeCloseTo(ebt0 * 0.34, 2);
    });

    it('tax is 0 when EBT is negative', () => {
      const cost = makeAssumption({
        id: 'cost',
        category: 'cost_fixed',
        amount: 10000,
      });
      const taxConfig: TaxConfig = { mode: 'auto', rate: 34 };
      const result = calculateProjection([cost], taxConfig, 3);
      result.totals.tax_profit.forEach(m => expect(m.value).toBe(0));
    });

    it('skips manual tax_profit assumptions in auto mode', () => {
      const rev = makeAssumption({
        id: 'rev',
        category: 'revenue',
        amount: 10000,
      });
      const manualTax = makeAssumption({
        id: 'mt',
        category: 'tax_profit',
        amount: 999,
      });
      const taxConfig: TaxConfig = { mode: 'auto', rate: 34 };
      const result = calculateProjection([rev, manualTax], taxConfig, 3);
      // Should NOT be 999 — auto mode ignores manual tax_profit
      expect(result.totals.tax_profit[0].value).not.toBeCloseTo(999, 0);
    });
  });

  describe('manual tax mode', () => {
    it('uses the assumption value for tax_profit', () => {
      const rev = makeAssumption({
        id: 'rev',
        category: 'revenue',
        amount: 10000,
      });
      const manualTax = makeAssumption({
        id: 'mt',
        category: 'tax_profit',
        amount: 500,
      });
      const result = calculateProjection([rev, manualTax], undefined, 3);
      result.totals.tax_profit.forEach(m => {
        expect(m.value).toBeCloseTo(500, 2);
      });
    });
  });

  describe('category aliases', () => {
    it('maps cost_fixed to costs_fixed', () => {
      const item = makeAssumption({ category: 'cost_fixed', amount: 200 });
      const result = calculateProjection([item], undefined, 3);
      result.totals.costs_fixed.forEach(m => expect(m.value).toBeCloseTo(200, 2));
    });

    it('maps fixed_cost to costs_fixed', () => {
      const item = makeAssumption({ category: 'fixed_cost', amount: 300 });
      const result = calculateProjection([item], undefined, 3);
      result.totals.costs_fixed.forEach(m => expect(m.value).toBeCloseTo(300, 2));
    });

    it('maps cost_variable to costs_variable', () => {
      const item = makeAssumption({ category: 'cost_variable', amount: 150 });
      const result = calculateProjection([item], undefined, 3);
      result.totals.costs_variable.forEach(m => expect(m.value).toBeCloseTo(150, 2));
    });

    it('maps variable_cost to costs_variable', () => {
      const item = makeAssumption({ category: 'variable_cost', amount: 250 });
      const result = calculateProjection([item], undefined, 3);
      result.totals.costs_variable.forEach(m => expect(m.value).toBeCloseTo(250, 2));
    });

    it('maps tax to taxes_sale', () => {
      const item = makeAssumption({ category: 'tax', amount: 80 });
      const result = calculateProjection([item], undefined, 3);
      result.totals.taxes_sale.forEach(m => expect(m.value).toBeCloseTo(80, 2));
    });
  });

  describe('DRE calculations', () => {
    it('computes EBITDA = net_revenue - costs_variable - costs_fixed - personnel', () => {
      const items = [
        makeAssumption({ id: '1', category: 'revenue', amount: 10000 }),
        makeAssumption({ id: '2', category: 'tax', amount: 1000 }),
        makeAssumption({ id: '3', category: 'cost_variable', amount: 2000 }),
        makeAssumption({ id: '4', category: 'cost_fixed', amount: 1500 }),
        makeAssumption({ id: '5', category: 'personnel', amount: 500 }),
      ];
      const result = calculateProjection(items, undefined, 3);
      // net_rev = 10000 - 1000 = 9000
      // ebitda = 9000 - 2000 - 1500 - 500 = 5000
      result.totals.ebitda.forEach(m => expect(m.value).toBeCloseTo(5000, 2));
    });

    it('EBIT = EBITDA - depreciation', () => {
      const items = [
        makeAssumption({ id: '1', category: 'revenue', amount: 10000 }),
        makeAssumption({ id: '2', category: 'investment', amount: 6000, amortization_period: 6 }),
      ];
      const result = calculateProjection(items, undefined, 6);
      // depreciation = 6000/6 = 1000/month
      // ebitda = 10000
      // ebit = 10000 - 1000 = 9000
      result.totals.ebit.slice(0, 6).forEach(m => expect(m.value).toBeCloseTo(9000, 2));
    });
  });

  describe('growth with multi-year rates', () => {
    it('applies different rates per year', () => {
      const item = makeAssumption({
        amount: 1000,
        category: 'revenue',
        growth_rate: 12,
        growth_rate_y2: 24,
      });
      const result = calculateProjection([item], undefined, 24);

      // Month 1 (index 0): rate=12, monthsActive=0 → 1000
      expect(result.totals.revenue[0].value).toBeCloseTo(1000, 2);

      // Month 12 (index 11): rate=12 (still year 0)
      const r1 = 12 / 100 / 12;
      expect(result.totals.revenue[11].value).toBeCloseTo(1000 * Math.pow(1 + r1, 11), 2);

      // Month 13 (index 12): rate=24 (year 1)
      const r2 = 24 / 100 / 12;
      expect(result.totals.revenue[12].value).toBeCloseTo(1000 * Math.pow(1 + r2, 12), 2);
    });
  });

  describe('growth_start_month', () => {
    it('delays growth until the specified month', () => {
      const item = makeAssumption({
        amount: 100,
        category: 'revenue',
        growth_rate: 120,
        growth_start_month: 4,
      });
      const result = calculateProjection([item], undefined, 6);

      // Months 1-3 (indices 0-2): no growth → 100
      expect(result.totals.revenue[0].value).toBeCloseTo(100, 2);
      expect(result.totals.revenue[1].value).toBeCloseTo(100, 2);
      expect(result.totals.revenue[2].value).toBeCloseTo(100, 2);

      // Month 4 (index 3): growth starts, growthMonths=1
      const r = 120 / 100 / 12;
      expect(result.totals.revenue[3].value).toBeCloseTo(100 * Math.pow(1 + r, 1), 2);
    });
  });

  describe('detailed items', () => {
    it('returns item details matching assumptions', () => {
      const items = [
        makeAssumption({ id: 'r1', name: 'Revenue A', category: 'revenue', amount: 500 }),
      ];
      const result = calculateProjection(items, undefined, 6);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].assumptionId).toBe('r1');
      expect(result.items[0].name).toBe('Revenue A');
      expect(result.items[0].data).toHaveLength(6);
    });

    it('setup items have preOperationalValue and zero monthly data', () => {
      const items = [
        makeAssumption({ id: 'i1', category: 'investment', amount: 5000, start_month: 0, is_recurring: false }),
      ];
      const result = calculateProjection(items, undefined, 6);
      const detail = result.items[0];
      expect(detail.preOperationalValue).toBe(5000);
      detail.data.forEach(d => expect(d.value).toBe(0));
    });
  });

  describe('cash flow', () => {
    it('revenue is positive in cash flow, costs are negative', () => {
      const items = [
        makeAssumption({ id: 'r', category: 'revenue', amount: 2000 }),
        makeAssumption({ id: 'c', category: 'cost_fixed', amount: 500 }),
      ];
      const result = calculateProjection(items, undefined, 3);
      // cash_flow = 2000 - 500 = 1500
      result.totals.cash_flow.forEach(m => expect(m.value).toBeCloseTo(1500, 2));
    });

    it('cash_accumulated is cumulative', () => {
      const items = [
        makeAssumption({ id: 'r', category: 'revenue', amount: 1000 }),
        makeAssumption({ id: 'setup', category: 'investment', amount: 5000, start_month: 0, is_recurring: false }),
      ];
      const result = calculateProjection(items, undefined, 6);
      // preOp cash = -5000, setup non-recurring doesn't repeat in monthly
      // month 1 accumulated = -5000 + 1000 = -4000
      expect(result.totals.cash_accumulated[0].value).toBeCloseTo(-4000, 2);
      // month 6 accumulated = -5000 + 6*1000 = 1000
      expect(result.totals.cash_accumulated[5].value).toBeCloseTo(1000, 2);
    });

    it('auto tax subtracts from cash flow', () => {
      const items = [
        makeAssumption({ id: 'r', category: 'revenue', amount: 10000 }),
      ];
      const taxConfig: TaxConfig = { mode: 'auto', rate: 10 };
      const result = calculateProjection(items, taxConfig, 3);
      // EBITDA = 10000, no depreciation so EBIT = EBT = 10000
      // tax = 10000 * 0.10 = 1000
      // cash_flow = revenue - tax = 10000 - 1000 = 9000
      result.totals.cash_flow.forEach(m => expect(m.value).toBeCloseTo(9000, 2));
    });
  });

  describe('end_month boundary', () => {
    it('stops producing values after end_month', () => {
      const item = makeAssumption({
        amount: 1000,
        category: 'revenue',
        start_month: 1,
        end_month: 3,
      });
      const result = calculateProjection([item], undefined, 6);
      expect(result.totals.revenue[0].value).toBeCloseTo(1000, 2); // month 1
      expect(result.totals.revenue[1].value).toBeCloseTo(1000, 2); // month 2
      expect(result.totals.revenue[2].value).toBeCloseTo(1000, 2); // month 3
      expect(result.totals.revenue[3].value).toBe(0); // month 4
      expect(result.totals.revenue[4].value).toBe(0); // month 5
    });
  });
});
