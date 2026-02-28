"use client";

import { useProjectStore } from "@/store/projectStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { DollarSign, Percent, Clock, BarChart3 } from "lucide-react";
import {
  calculateNPV,
  calculateIRR,
  calculateDiscountedPayback,
  calculateProfitabilityIndex,
} from "@/lib/viabilityMetrics";

export function ViabilitySection() {
  const { projection, discountRate, setDiscountRate, exchangeRate, targetCurrency } =
    useProjectStore();

  if (!projection) return null;

  const cashFlows = projection.totals.cash_flow.map((m) => m.value);
  const initialCF = projection.preOperational.cash_flow;

  const npv = calculateNPV(cashFlows, discountRate, initialCF);
  const irr = calculateIRR(cashFlows, initialCF);
  const discountedPayback = calculateDiscountedPayback(cashFlows, discountRate, initialCF);
  const profitIndex = calculateProfitabilityIndex(cashFlows, discountRate, initialCF);

  const formatMoney = (val: number) => {
    const converted = val / exchangeRate;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: targetCurrency,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  const indicators = [
    {
      label: "VPL (Valor Presente Líquido)",
      value: formatMoney(npv),
      positive: npv >= 0,
      icon: DollarSign,
      tooltip:
        "Quanto vale hoje todo o fluxo de caixa futuro do projeto, descontado pela taxa. VPL > 0 significa que o projeto gera valor acima da rentabilidade exigida.",
    },
    {
      label: "TIR (Taxa Interna de Retorno)",
      value: irr !== null ? `${irr.toFixed(1)}% a.a.` : "N/A",
      positive: irr !== null && irr > discountRate,
      icon: Percent,
      tooltip:
        "A taxa de retorno anual real do projeto. Se a TIR for maior que a taxa de desconto, o investimento é atrativo.",
    },
    {
      label: "Payback Descontado",
      value: discountedPayback !== null ? `Mês ${discountedPayback}` : "N/A",
      positive: discountedPayback !== null,
      icon: Clock,
      tooltip:
        "Em quantos meses o projeto recupera o investimento considerando o valor do dinheiro no tempo. Mais conservador que o payback simples.",
    },
    {
      label: "Índice de Lucratividade",
      value: profitIndex !== null ? `${profitIndex.toFixed(2)}x` : "N/A",
      positive: profitIndex !== null && profitIndex > 1,
      icon: BarChart3,
      tooltip:
        "Para cada R$1 investido, quanto retorna em valor presente. IL > 1 indica que o projeto gera mais do que consome.",
    },
  ];

  return (
    <Card className="mt-6 border shadow-sm">
      <CardHeader className="pb-4 border-b bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            Indicadores de Viabilidade
            <HelpTooltip text="Métricas financeiras que medem se o projeto vale o investimento. Ajuste a taxa de desconto para simular diferentes cenários de custo de capital." />
          </CardTitle>

          <div className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2 shadow-sm">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Taxa de Desconto
            </label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={discountRate}
                onChange={(e) => setDiscountRate(Number(e.target.value) || 0)}
                className="w-20 h-8 text-center font-bold text-sm"
              />
              <span className="text-xs text-muted-foreground font-medium">% a.a.</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {indicators.map((ind) => {
            const Icon = ind.icon;
            return (
              <div
                key={ind.label}
                className={`rounded-xl border-2 p-4 transition-colors ${
                  ind.positive
                    ? "border-green-200 bg-green-50/50"
                    : "border-red-200 bg-red-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    {ind.label.split("(")[0].trim()}
                    <HelpTooltip text={ind.tooltip} />
                  </span>
                  <Icon
                    className={`h-4 w-4 ${
                      ind.positive ? "text-green-500" : "text-red-400"
                    }`}
                  />
                </div>
                <div
                  className={`text-xl font-bold ${
                    ind.positive ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {ind.value}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {ind.positive ? "Favorável" : ind.value === "N/A" ? "Indisponível" : "Desfavorável"}
                </p>
              </div>
            );
          })}
        </div>

        {npv >= 0 && irr !== null && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Projeto viável:</strong> Com taxa de desconto de {discountRate}% a.a., o VPL
              é positivo ({formatMoney(npv)}) e a TIR ({irr.toFixed(1)}%) supera a taxa exigida.
              {discountedPayback && ` Recupera o investimento no mês ${discountedPayback}.`}
            </p>
          </div>
        )}

        {npv < 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Atenção:</strong> Com taxa de desconto de {discountRate}% a.a., o VPL é
              negativo ({formatMoney(npv)}). O projeto não gera valor suficiente para compensar o
              custo de capital exigido.
              {irr !== null && ` A taxa máxima de retorno (TIR) é ${irr.toFixed(1)}% a.a.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
