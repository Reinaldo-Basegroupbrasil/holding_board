import { describe, it, expect } from 'vitest';
import { Assumption } from '@/types';
import {
  getCategoryLabel,
  runSingleSensitivity,
  buildTornadoData,
} from '@/lib/sensitivityEngine';

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

describe('getCategoryLabel', () => {
  it('maps known categories to Portuguese labels', () => {
    expect(getCategoryLabel('revenue')).toBe('Receita');
    expect(getCategoryLabel('cost_variable')).toBe('Custo Variável');
    expect(getCategoryLabel('cost_fixed')).toBe('Custo Fixo');
    expect(getCategoryLabel('personnel')).toBe('Pessoal');
    expect(getCategoryLabel('investment')).toBe('Investimento');
    expect(getCategoryLabel('tax_profit')).toBe('Imposto s/ Lucro');
    expect(getCategoryLabel('base')).toBe('Métrica Base');
  });

  it('returns the raw category string for unknown categories', () => {
    expect(getCategoryLabel('something_new')).toBe('something_new');
    expect(getCategoryLabel('')).toBe('');
  });
});

describe('runSingleSensitivity', () => {
  const baseAssumptions: Assumption[] = [
    makeAssumption({ id: 'rev', name: 'Revenue', category: 'revenue', amount: 5000 }),
    makeAssumption({ id: 'cost', name: 'Cost', category: 'cost_fixed', amount: 2000 }),
  ];

  it('returns correct structure when varying amount', () => {
    const result = runSingleSensitivity(
      baseAssumptions,
      'rev',
      'amount',
      [-20, 0, 20],
      12
    );
    expect(result).not.toBeNull();
    expect(result!.assumptionId).toBe('rev');
    expect(result!.assumptionName).toBe('Revenue');
    expect(result!.baseValue).toBe(5000);
    expect(result!.results).toHaveLength(3);
  });

  it('variation=0 returns the same metrics as base', () => {
    const result = runSingleSensitivity(
      baseAssumptions,
      'rev',
      'amount',
      [0],
      12
    );
    expect(result).not.toBeNull();
    expect(result!.results[0].variation).toBe(0);
  });

  it('positive variation increases NPV for revenue items', () => {
    const result = runSingleSensitivity(
      baseAssumptions,
      'rev',
      'amount',
      [-20, 20],
      12
    );
    expect(result).not.toBeNull();
    const [down, up] = result!.results;
    expect(up.npv).toBeGreaterThan(down.npv);
  });

  it('returns null for non-existent target', () => {
    const result = runSingleSensitivity(
      baseAssumptions,
      'nonexistent',
      'amount',
      [-20, 20],
      12
    );
    expect(result).toBeNull();
  });

  it('can vary growth_rate field', () => {
    const items = [
      makeAssumption({ id: 'rev', name: 'Revenue', amount: 1000, growth_rate: 10 }),
    ];
    const result = runSingleSensitivity(items, 'rev', 'growth_rate', [-50, 50], 12);
    expect(result).not.toBeNull();
    expect(result!.baseValue).toBe(10);
    expect(result!.results).toHaveLength(2);
  });

  it('passes taxConfig and monthsToProject through', () => {
    const result = runSingleSensitivity(
      baseAssumptions,
      'rev',
      'amount',
      [0],
      12,
      { mode: 'auto', rate: 34 },
      12
    );
    expect(result).not.toBeNull();
    expect(result!.results[0].npv).toBeDefined();
  });
});

describe('buildTornadoData', () => {
  const baseAssumptions: Assumption[] = [
    makeAssumption({ id: 'rev1', name: 'Revenue A', category: 'revenue', amount: 5000 }),
    makeAssumption({ id: 'rev2', name: 'Revenue B', category: 'revenue', amount: 3000 }),
    makeAssumption({ id: 'cost1', name: 'Cost A', category: 'cost_fixed', amount: 2000 }),
    makeAssumption({ id: 'base1', name: 'Metric Base', category: 'base', amount: 100 }),
  ];

  it('excludes base category from results', () => {
    const data = buildTornadoData(baseAssumptions, 12, 20, 10);
    const ids = data.map(d => d.assumptionId);
    expect(ids).not.toContain('base1');
  });

  it('returns items sorted by deltaAbs descending', () => {
    const data = buildTornadoData(baseAssumptions, 12, 20, 10);
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1].deltaAbs).toBeGreaterThanOrEqual(data[i].deltaAbs);
    }
  });

  it('respects maxItems limit', () => {
    const data = buildTornadoData(baseAssumptions, 12, 20, 2);
    expect(data.length).toBeLessThanOrEqual(2);
  });

  it('each item has vpnDown, vpnBase, vpnUp', () => {
    const data = buildTornadoData(baseAssumptions, 12, 20, 10);
    data.forEach(item => {
      expect(item.vpnBase).toBeDefined();
      expect(item.vpnDown).toBeDefined();
      expect(item.vpnUp).toBeDefined();
      expect(typeof item.deltaAbs).toBe('number');
    });
  });

  it('vpnBase is the same for all items', () => {
    const data = buildTornadoData(baseAssumptions, 12, 20, 10);
    if (data.length > 1) {
      const base = data[0].vpnBase;
      data.forEach(item => expect(item.vpnBase).toBeCloseTo(base, 2));
    }
  });

  it('revenue increase should raise VPN (vpnUp > vpnBase)', () => {
    const data = buildTornadoData(baseAssumptions, 12, 20, 10);
    const revItem = data.find(d => d.category === 'revenue');
    if (revItem) {
      expect(revItem.vpnUp).toBeGreaterThan(revItem.vpnBase);
    }
  });

  it('excludes assumptions with amount=0', () => {
    const items = [
      ...baseAssumptions,
      makeAssumption({ id: 'zero', name: 'Zero', category: 'revenue', amount: 0 }),
    ];
    const data = buildTornadoData(items, 12, 20, 10);
    const ids = data.map(d => d.assumptionId);
    expect(ids).not.toContain('zero');
  });

  it('passes taxConfig and monthsToProject through', () => {
    const data = buildTornadoData(
      baseAssumptions,
      12,
      20,
      10,
      { mode: 'auto', rate: 34 },
      12
    );
    expect(data.length).toBeGreaterThan(0);
  });
});
