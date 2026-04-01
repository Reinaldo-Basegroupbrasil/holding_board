"use client";

import { useProjectStore } from "@/store/projectStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Target, Wallet, PiggyBank, TrendingUp, DollarSign, Percent } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { calculateNPV, calculateIRR } from "@/lib/viabilityMetrics";

export function KpiGrid() {
  const { projection, isLoading, exchangeRate, targetCurrency, discountRate, currentProject } = useProjectStore();
  const projectionMonths = currentProject?.projection_months || 36;
  const projectionYears = Math.ceil(projectionMonths / 12);

  if (isLoading || !projection) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-32 animate-pulse bg-slate-100 rounded-lg" />;
  }

  const { totals } = projection;

  // --- LÓGICA DE CÁLCULO (MANTIDA) ---
  const lowestCashBalance = Math.min(...totals.cash_accumulated.map(m => m.value));
  const maxCashNeed = lowestCashBalance < 0 ? Math.abs(lowestCashBalance) : 0;

  const preOpCash = projection.preOperational?.cash_accumulated || 0;
  let seenNegative = preOpCash < 0;
  let paybackMonthIndex = -1;
  for (let i = 0; i < totals.cash_accumulated.length; i++) {
    if (totals.cash_accumulated[i].value < 0) seenNegative = true;
    if (seenNegative && totals.cash_accumulated[i].value >= 0) {
      paybackMonthIndex = i;
      break;
    }
  }
  if (!seenNegative && totals.cash_accumulated.length > 0) paybackMonthIndex = 0;
  const hasNegativePhase = seenNegative;
  const paybackText = paybackMonthIndex === -1 ? "N/A" : `Mês ${paybackMonthIndex + 1}`;
  const paybackSubtext = paybackMonthIndex === -1 
    ? "Não atinge o break-even no período" 
    : hasNegativePhase ? "Quando o projeto se paga (Payback)" : "Projeto lucrativo desde o início";

  const totalEbitda = totals.ebitda.reduce((acc, curr) => acc + curr.value, 0);
  const avgEbitda = totalEbitda / totals.ebitda.length;

  const totalRevenue = totals.revenue.reduce((acc, curr) => acc + curr.value, 0);

  const cashFlows = totals.cash_flow.map(m => m.value);
  const initialCF = projection.preOperational.cash_flow;
  const npv = calculateNPV(cashFlows, discountRate, initialCF);
  const irr = calculateIRR(cashFlows, initialCF);

  // --- FORMATADORES ---
  const formatMoney = (val: number) => {
    const converted = val / exchangeRate;
    const locale = targetCurrency === 'BRL' ? 'pt-BR' : 'en-US';
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: targetCurrency,
      maximumFractionDigits: 0 
    }).format(converted);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      
      {/* CARD 1: NECESSIDADE DE CAIXA */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            Necessidade de Caixa
            <HelpTooltip text="É o 'fundo do poço'. O valor máximo de dinheiro que você precisa ter no bolso para cobrir todos os custos antes de começar a lucrar." />
          </CardTitle>
          <Wallet className={`h-4 w-4 ${maxCashNeed > 0 ? "text-red-500" : "text-green-500"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${maxCashNeed > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatMoney(maxCashNeed)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pior saldo acumulado (Vale da Morte)
          </p>
        </CardContent>
      </Card>

      {/* CARD 2: PONTO DE EQUILÍBRIO */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            Ponto de Equilíbrio
            <HelpTooltip text="O momento exato em que o dinheiro que entrou supera todo o dinheiro que você gastou. A partir daqui, é lucro real." />
          </CardTitle>
          <Target className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            {paybackText}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {paybackSubtext}
          </p>
        </CardContent>
      </Card>

      {/* CARD 3: EBITDA MÉDIO */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            EBITDA Médio/Mês
            <HelpTooltip text="Mede a saúde da operação. Quanto seu negócio gera de dinheiro 'puro', antes de pagar impostos de renda ou empréstimos." />
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatMoney(avgEbitda)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Potencial de geração operacional
          </p>
        </CardContent>
      </Card>

      {/* CARD 4: RECEITA TOTAL */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            Receita Total ({projectionYears} {projectionYears === 1 ? 'Ano' : 'Anos'})
            <HelpTooltip text="O volume total de vendas brutas acumuladas no período. Mostra o tamanho (escala) que o negócio pode atingir." />
          </CardTitle>
          <PiggyBank className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            {formatMoney(totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Volume total de vendas projetado
          </p>
        </CardContent>
      </Card>

      {/* CARD 5: VPL */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            VPL
            <HelpTooltip text="Valor Presente Líquido: quanto vale HOJE todo o dinheiro futuro do projeto, descontado pela taxa definida. Se positivo, o projeto gera valor acima da taxa exigida." />
          </CardTitle>
          <DollarSign className={`h-4 w-4 ${npv >= 0 ? "text-green-500" : "text-red-500"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${npv >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatMoney(npv)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Taxa de desconto: {discountRate}% a.a.
          </p>
        </CardContent>
      </Card>

      {/* CARD 6: TIR */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            TIR
            <HelpTooltip text="Taxa Interna de Retorno: o retorno anual real do projeto. Se maior que a taxa de desconto, o projeto é viável." />
          </CardTitle>
          <Percent className={`h-4 w-4 ${irr !== null && irr > discountRate ? "text-green-500" : "text-amber-500"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${irr !== null && irr > discountRate ? "text-green-600" : "text-amber-600"}`}>
            {irr !== null ? `${irr.toFixed(1)}% a.a.` : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {irr !== null && irr > discountRate ? "Projeto viável (TIR > Taxa)" : irr !== null ? "TIR abaixo da taxa exigida" : "Não convergiu no período"}
          </p>
        </CardContent>
      </Card>

    </div>
  );
}