/**
 * Converte taxa anual para taxa mensal equivalente (juros compostos).
 */
export function annualToMonthlyRate(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

/**
 * Valor Presente Líquido (VPL / NPV).
 *
 * @param monthlyCashFlows - Array de fluxos de caixa mensais (36 meses)
 * @param annualRatePercent - Taxa de desconto anual em % (ex: 12 = 12%)
 * @param initialCashFlow - Fluxo de caixa do mês 0 (setup, geralmente negativo)
 */
export function calculateNPV(
  monthlyCashFlows: number[],
  annualRatePercent: number,
  initialCashFlow: number = 0
): number {
  const r = annualToMonthlyRate(annualRatePercent);
  let npv = initialCashFlow;
  for (let t = 0; t < monthlyCashFlows.length; t++) {
    npv += monthlyCashFlows[t] / Math.pow(1 + r, t + 1);
  }
  return npv;
}

/**
 * Taxa Interna de Retorno (TIR / IRR) anualizada.
 * Usa o método da bisecção para encontrar a taxa que zera o VPL.
 *
 * @returns Taxa anual em % ou null se não convergir.
 */
export function calculateIRR(
  monthlyCashFlows: number[],
  initialCashFlow: number = 0,
  maxIterations: number = 200,
  tolerance: number = 0.0001
): number | null {
  let lo = -0.5;
  let hi = 10.0;

  const npvAtRate = (annualRate: number): number => {
    const r = Math.pow(1 + annualRate, 1 / 12) - 1;
    let npv = initialCashFlow;
    for (let t = 0; t < monthlyCashFlows.length; t++) {
      npv += monthlyCashFlows[t] / Math.pow(1 + r, t + 1);
    }
    return npv;
  };

  let fLo = npvAtRate(lo);
  let fHi = npvAtRate(hi);

  if (fLo * fHi > 0) return null;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npvAtRate(mid);

    if (Math.abs(fMid) < tolerance) {
      return mid * 100;
    }

    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  return ((lo + hi) / 2) * 100;
}

/**
 * Payback Descontado - mês em que o VPL acumulado se torna >= 0.
 *
 * @returns Número do mês (1-based) ou null se não atingir.
 */
export function calculateDiscountedPayback(
  monthlyCashFlows: number[],
  annualRatePercent: number,
  initialCashFlow: number = 0
): number | null {
  const r = annualToMonthlyRate(annualRatePercent);
  let accumulated = initialCashFlow;

  for (let t = 0; t < monthlyCashFlows.length; t++) {
    accumulated += monthlyCashFlows[t] / Math.pow(1 + r, t + 1);
    if (accumulated >= 0) return t + 1;
  }

  return null;
}

/**
 * Índice de Lucratividade (IL) = VPL dos fluxos futuros / |Investimento Inicial|
 * Retorna o multiplicador (ex: 1.3 = para cada R$1 investido, retorna R$1,30)
 */
export function calculateProfitabilityIndex(
  monthlyCashFlows: number[],
  annualRatePercent: number,
  initialCashFlow: number = 0
): number | null {
  if (initialCashFlow >= 0) return null;
  const r = annualToMonthlyRate(annualRatePercent);
  let pvFuture = 0;
  for (let t = 0; t < monthlyCashFlows.length; t++) {
    pvFuture += monthlyCashFlows[t] / Math.pow(1 + r, t + 1);
  }
  return pvFuture / Math.abs(initialCashFlow);
}
