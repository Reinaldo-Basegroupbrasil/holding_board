import { Assumption, MonthlyData, ProjectionSummary, ProjectionTotals } from '@/types';

const calculateValue = (
  baseAmount: number, 
  monthIndex: number, 
  growthRateY1: number = 0,
  growthRateY2: number = 0,
  growthRateY3: number = 0,
  growthType: 'percentage' | 'linear' = 'percentage'
): number => {
  let rate = 0;
  if (monthIndex < 12) rate = growthRateY1;
  else if (monthIndex < 24) rate = growthRateY2;
  else rate = growthRateY3;

  if (rate === 0) return baseAmount;

  if (growthType === 'linear') {
    return baseAmount + (rate * monthIndex);
  } else {
    const monthlyRate = rate / 100 / 12; 
    return baseAmount * Math.pow(1 + monthlyRate, monthIndex);
  }
};

const calculateWithGrowthDelay = (
  baseAmount: number,
  monthsActive: number,
  absoluteMonth: number,
  startMonth: number,
  growthStartMonth: number | null | undefined,
  growthRateY1: number,
  growthRateY2: number,
  growthRateY3: number,
  growthType: 'percentage' | 'linear' = 'percentage'
): number => {
  if (growthStartMonth && growthStartMonth > startMonth && absoluteMonth < growthStartMonth) {
    return baseAmount;
  }
  if (growthStartMonth && growthStartMonth > startMonth) {
    const growthMonths = absoluteMonth - growthStartMonth + 1;
    return calculateValue(baseAmount, growthMonths, growthRateY1, growthRateY2, growthRateY3, growthType);
  }
  return calculateValue(baseAmount, monthsActive, growthRateY1, growthRateY2, growthRateY3, growthType);
};

export interface TaxConfig {
  mode: 'manual' | 'auto';
  rate: number;
}

export const calculateProjection = (assumptions: Assumption[], taxConfig?: TaxConfig): ProjectionSummary => {
  const MONTHS_TO_PROJECT = 36;
  
  const finiteOrZero = (n: unknown): number => {
    const num = typeof n === 'number' ? n : Number(n);
    return Number.isFinite(num) ? num : 0;
  };

  const createMonthData = (index: number, val: number): MonthlyData => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + index, 1);
    return {
      monthIndex: index,
      month: index + 1,
      date: targetDate.toISOString(),
      value: val
    };
  };

  const results: ProjectionTotals = {
    revenue: [], taxes_sale: [], costs_variable: [], costs_fixed: [],
    personnel: [], investment: [], depreciation: [], financial_revenue: [],
    financial_expense: [], tax_profit: [], capital: [],
    net_revenue: [], contribution_margin: [], ebitda: [], ebit: [], ebt: [], net_result: [],
    cash_flow: [], cash_accumulated: []
  };

  (Object.keys(results) as (keyof ProjectionTotals)[]).forEach((key) => {
    results[key] = Array(MONTHS_TO_PROJECT).fill(0).map((_, i) => createMonthData(i, 0));
  });

  const preOp = {
    revenue: 0, taxes_sale: 0, costs_variable: 0, costs_fixed: 0, personnel: 0,
    investment: 0, depreciation: 0, financial_revenue: 0, financial_expense: 0,
    tax_profit: 0, net_result: 0, cash_flow: 0, cash_accumulated: 0, capital: 0,
    ebitda: 0, ebit: 0, ebt: 0
  };

  const driverValues: Record<string, number[]> = {};

  // Setup (Mês 0)
  assumptions.forEach(item => {
    const startMonth = item.start_month ?? 1;
    if (startMonth === 0) {
      const val = finiteOrZero(item.amount);
      if (item.category === 'revenue') preOp.revenue += val;
      if (item.category === 'tax') preOp.taxes_sale += val;
      if (item.category === 'cost_variable' || item.category === 'variable_cost') preOp.costs_variable += val;
      if (item.category === 'cost_fixed' || item.category === 'fixed_cost') preOp.costs_fixed += val;
      if (item.category === 'personnel') preOp.personnel += val;
      if (item.category === 'investment') preOp.investment += val;
      if (item.category === 'financial_revenue') preOp.financial_revenue += val;
      if (item.category === 'financial_expense') preOp.financial_expense += val;
      if (item.category === 'capital') preOp.capital += val;
    }
  });

  preOp.cash_flow = (preOp.revenue + preOp.capital + preOp.financial_revenue) - 
                    (preOp.costs_variable + preOp.costs_fixed + preOp.personnel + preOp.investment + preOp.taxes_sale + preOp.financial_expense);
  preOp.cash_accumulated = preOp.cash_flow;

  // Projeção Mensal
  let accumulatedCash = preOp.cash_accumulated;
  const childAccumulators: Record<string, number> = {};

  for (let m = 0; m < MONTHS_TO_PROJECT; m++) {
    // A1. Drivers - own values (independent)
    assumptions.filter(a => a.category === 'base').forEach(item => {
        if (!driverValues[item.id]) driverValues[item.id] = [];
        const startMonth = item.start_month ?? 1;
        const isActive = (m + 1) >= startMonth && (!item.end_month || (m + 1) <= item.end_month);
        let val = 0;
        if (isActive) {
            const monthsActive = m - (startMonth - 1); 
            val = calculateWithGrowthDelay(
              finiteOrZero(item.amount),
              monthsActive,
              m + 1,
              startMonth,
              item.growth_start_month,
              finiteOrZero(item.growth_rate),
              finiteOrZero(item.growth_rate_y2),
              finiteOrZero(item.growth_rate_y3),
              item.growth_type
            );
        }
        driverValues[item.id][m] = finiteOrZero(val);
    });

    // A2. Drivers - base-to-base composition
    assumptions.filter(a => a.category === 'base' && a.driver_id).forEach(item => {
        const parentId = item.driver_id!;
        if (!driverValues[parentId]) return;

        const childVal = driverValues[item.id]?.[m] || 0;
        if (item.driver_type === 'delta') {
            childAccumulators[item.id] = (childAccumulators[item.id] || 0) + childVal;
            driverValues[parentId][m] += childAccumulators[item.id];
        } else {
            driverValues[parentId][m] += childVal;
        }
    });

    // B. Valores
    assumptions.filter(a => a.category !== 'base').forEach(item => {
        const startMonth = item.start_month ?? 1;
        if (startMonth === 0) return;

        const isActive = (m + 1) >= startMonth && (!item.end_month || (m + 1) <= item.end_month);
        if (!isActive) return;
        if (!item.is_recurring && (m + 1) !== startMonth) return;

        const monthsActive = m - (startMonth - 1);
        let val = calculateWithGrowthDelay(
          finiteOrZero(item.amount),
          monthsActive,
          m + 1,
          startMonth,
          item.growth_start_month,
          finiteOrZero(item.growth_rate),
          finiteOrZero(item.growth_rate_y2),
          finiteOrZero(item.growth_rate_y3),
          item.growth_type
        );

        if (item.driver_id && driverValues[item.driver_id]) {
            const multiplier = item.format === 'percent' ? val / 100 : val;
            if (item.driver_type === 'delta') {
                const curr = driverValues[item.driver_id][m] || 0;
                const prev = m > 0 ? (driverValues[item.driver_id][m - 1] || 0) : 0;
                val = multiplier * (curr - prev);
            } else {
                val = multiplier * (driverValues[item.driver_id][m] || 0);
            }
        }

        let targetKey = item.category;
        if (targetKey === 'cost_fixed' || targetKey === 'fixed_cost') targetKey = 'costs_fixed';
        if (targetKey === 'cost_variable' || targetKey === 'variable_cost') targetKey = 'costs_variable';
        if (targetKey === 'tax') targetKey = 'taxes_sale';
        
        if ((results as any)[targetKey]) (results as any)[targetKey][m].value += finiteOrZero(val);
    });

    // C. Depreciação
    assumptions.filter(a => a.category === 'investment').forEach(inv => {
       const startMonth = inv.start_month ?? 1;
       if (inv.amortization_period && inv.amortization_period > 0) {
           if ((m + 1) >= startMonth) {
               const monthsSincePurchase = (m + 1) - startMonth;
               if (monthsSincePurchase < inv.amortization_period) {
                   results.depreciation[m].value += (finiteOrZero(inv.amount) / inv.amortization_period);
               }
           }
       }
    });

    // D. DRE
    const rev = finiteOrZero(results.revenue[m].value);
    const tax = finiteOrZero(results.taxes_sale[m].value);
    const varCost = finiteOrZero(results.costs_variable[m].value);
    const fixCost = finiteOrZero(results.costs_fixed[m].value);
    const pers = finiteOrZero(results.personnel[m].value);
    const dep = finiteOrZero(results.depreciation[m].value);
    const finRev = finiteOrZero(results.financial_revenue[m].value);
    const finExp = finiteOrZero(results.financial_expense[m].value);

    const netRev = rev - tax;
    const ebitda = netRev - varCost - fixCost - pers;
    const ebit = ebitda - dep;
    const ebt = ebit + finRev - finExp;
    
    let profitTax: number;
    if (taxConfig?.mode === 'auto') {
      profitTax = ebt > 0 ? ebt * (taxConfig.rate / 100) : 0;
      results.tax_profit[m].value = profitTax;
    } else {
      profitTax = finiteOrZero(results.tax_profit[m].value);
    }
    const netResult = ebt - profitTax;

    results.net_revenue[m].value = netRev;
    results.contribution_margin[m].value = netRev - varCost;
    results.ebitda[m].value = ebitda;
    results.ebit[m].value = ebit;
    results.ebt[m].value = ebt;
    results.net_result[m].value = finiteOrZero(netResult);
  }

  // E. Caixa (Lag)
  results.cash_flow.forEach((c) => (c.value = 0));
  for (let m = 0; m < MONTHS_TO_PROJECT; m++) {
      let monthlyCashFlow = 0;
      assumptions.forEach(item => {
          if (taxConfig?.mode === 'auto' && item.category === 'tax_profit') return;

          const lag = item.payment_lag || 0;
          const originMonth = m - lag;
          const startMonth = item.start_month ?? 1;

          if (originMonth >= 0) {
             const isActive = (originMonth + 1) >= startMonth && (!item.end_month || (originMonth + 1) <= item.end_month);
             const isSingleEvent = !item.is_recurring && (originMonth + 1) === startMonth;
             
             if ((item.is_recurring && isActive) || isSingleEvent) {
                 const monthsActive = originMonth - (startMonth - 1);
                 let val = calculateWithGrowthDelay(
                   finiteOrZero(item.amount),
                   monthsActive,
                   originMonth + 1,
                   startMonth,
                   item.growth_start_month,
                   finiteOrZero(item.growth_rate),
                   finiteOrZero(item.growth_rate_y2),
                   finiteOrZero(item.growth_rate_y3),
                   item.growth_type
                 );
                 
                 if (item.driver_id && driverValues[item.driver_id]) {
                     const multiplier = item.format === 'percent' ? val / 100 : val;
                     if (item.driver_type === 'delta') {
                         const curr = driverValues[item.driver_id][originMonth] || 0;
                         const prev = originMonth > 0 ? (driverValues[item.driver_id][originMonth - 1] || 0) : 0;
                         val = multiplier * (curr - prev);
                     } else {
                         val = multiplier * (driverValues[item.driver_id][originMonth] || 0);
                     }
                 }

                 const isInput = ['revenue', 'financial_revenue', 'capital'].includes(item.category);
                 const isOutput = ['cost_variable', 'variable_cost', 'cost_fixed', 'fixed_cost', 'personnel', 'tax', 'investment', 'financial_expense', 'tax_profit'].includes(item.category);

                 if (isInput) monthlyCashFlow += finiteOrZero(val);
                 if (isOutput) monthlyCashFlow -= finiteOrZero(val);
             }
          }
      });

      // In auto mode, subtract the auto-calculated tax from cash flow
      if (taxConfig?.mode === 'auto') {
          monthlyCashFlow -= finiteOrZero(results.tax_profit[m].value);
      }
      results.cash_flow[m].value = finiteOrZero(monthlyCashFlow);
      accumulatedCash += finiteOrZero(monthlyCashFlow);
      results.cash_accumulated[m].value = accumulatedCash;
  }

  const detailedItems = assumptions.map(a => {
      const startMonth = a.start_month ?? 1;

      const data = Array(MONTHS_TO_PROJECT).fill(0).map((_, i) => {
          const isActive = (i + 1) >= startMonth && (!a.end_month || (i + 1) <= a.end_month);
          let val = 0;
          if ((a.is_recurring && isActive) || (!a.is_recurring && (i + 1) === startMonth)) {
             const monthsActive = i - (startMonth - 1);
             val = calculateWithGrowthDelay(
               finiteOrZero(a.amount),
               monthsActive,
               i + 1,
               startMonth,
               a.growth_start_month,
               finiteOrZero(a.growth_rate),
               finiteOrZero(a.growth_rate_y2),
               finiteOrZero(a.growth_rate_y3),
               a.growth_type
             );
             if (a.category !== 'base' && a.driver_id && driverValues[a.driver_id]) {
                 const multiplier = a.format === 'percent' ? val / 100 : val;
                 if (a.driver_type === 'delta') {
                     const curr = driverValues[a.driver_id][i] || 0;
                     const prev = i > 0 ? (driverValues[a.driver_id][i - 1] || 0) : 0;
                     val = multiplier * (curr - prev);
                 } else {
                     val = multiplier * (driverValues[a.driver_id][i] || 0);
                 }
             }
          }
          return createMonthData(i, finiteOrZero(val));
      });

      return {
          assumptionId: a.id,
          name: a.name,
          category: a.category,
          format: a.format,
          driver_id: a.driver_id,
          data: data,
          preOperationalValue: startMonth === 0 ? finiteOrZero(a.amount) : 0
      };
  });

  // RETORNO CORRIGIDO: preOperational fora de totals
  return { 
    totals: results, 
    preOperational: preOp, 
    items: detailedItems 
  };
};