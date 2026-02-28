"use client";

import { useMemo, Fragment } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyData, ProjectionSummary } from "@/types";
import { ArrowLeft, TrendingUp, TrendingDown, Target, Timer } from "lucide-react";
import { calculateNPV, calculateIRR, calculateDiscountedPayback } from "@/lib/viabilityMetrics";

const COLORS = [
  { label: "text-blue-700", bg: "bg-blue-50", border: "border-blue-300", header: "bg-blue-100 text-blue-800", ring: "ring-blue-200" },
  { label: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300", header: "bg-emerald-100 text-emerald-800", ring: "ring-emerald-200" },
  { label: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300", header: "bg-amber-100 text-amber-800", ring: "ring-amber-200" },
];

const DRE_ROWS: { key: string; label: string; field: keyof ProjectionSummary["totals"]; preField: string; type: "normal" | "bold" | "total" | "subtitle"; indent: boolean }[] = [
  { key: "revenue", label: "(+) Receita Bruta", field: "revenue", preField: "revenue", type: "bold", indent: false },
  { key: "taxes_sale", label: "(-) Impostos s/ Vendas", field: "taxes_sale", preField: "taxes_sale", type: "normal", indent: true },
  { key: "costs_variable", label: "(-) Custos Variáveis", field: "costs_variable", preField: "costs_variable", type: "normal", indent: true },
  { key: "costs_fixed", label: "(-) Custos Fixos", field: "costs_fixed", preField: "costs_fixed", type: "normal", indent: true },
  { key: "personnel", label: "(-) Pessoal", field: "personnel", preField: "personnel", type: "normal", indent: true },
  { key: "ebitda", label: "(=) EBITDA", field: "ebitda", preField: "ebitda", type: "total", indent: false },
  { key: "depreciation", label: "(-) Depreciação", field: "depreciation", preField: "depreciation", type: "normal", indent: true },
  { key: "ebit", label: "(=) EBIT", field: "ebit", preField: "ebit", type: "subtitle", indent: false },
  { key: "financial_revenue", label: "(+) Receita Financeira", field: "financial_revenue", preField: "financial_revenue", type: "normal", indent: true },
  { key: "financial_expense", label: "(-) Despesas Financeiras", field: "financial_expense", preField: "financial_expense", type: "normal", indent: true },
  { key: "ebt", label: "(=) EBT", field: "ebt", preField: "ebt", type: "subtitle", indent: false },
  { key: "tax_profit", label: "(-) Imposto s/ Lucro", field: "tax_profit", preField: "tax_profit", type: "normal", indent: true },
  { key: "net_result", label: "(=) LUCRO LÍQUIDO", field: "net_result", preField: "net_result", type: "total", indent: false },
];

const CASH_ROWS: { key: string; label: string; field: keyof ProjectionSummary["totals"]; preField: string; type: "normal" | "bold" | "total" }[] = [
  { key: "cash_flow", label: "Fluxo de Caixa Mensal", field: "cash_flow", preField: "cash_flow", type: "bold" },
  { key: "cash_accumulated", label: "Saldo Acumulado", field: "cash_accumulated", preField: "cash_accumulated", type: "total" },
];

function getYearlyTotal(data: MonthlyData[], yearIndex: number): number {
  const start = yearIndex * 12;
  const end = start + 12;
  return data.slice(start, end).reduce((acc, curr) => acc + (curr.value || 0), 0);
}

function getYearlyLastValue(data: MonthlyData[], yearIndex: number): number {
  const idx = yearIndex * 12 + 11;
  return idx < data.length ? data[idx].value : 0;
}

export function ScenarioComparison() {
  const {
    compareProjections,
    setCompareMode,
    isLoading,
    exchangeRate,
    targetCurrency,
    currentProject,
    discountRate,
  } = useProjectStore();

  const displayCurrency = targetCurrency || currentProject?.currency_main || "BRL";
  const projectionMonths = currentProject?.projection_months || 36;
  const projectionYears = Math.ceil(projectionMonths / 12);
  const yearIndices = Array.from({ length: projectionYears }, (_, i) => i);

  const entries = useMemo(
    () => Object.entries(compareProjections),
    [compareProjections]
  );

  const showDelta = entries.length === 2;

  const formatMoney = (val: number) => {
    if (Math.abs(val) < 0.01) return "-";
    const converted = val / exchangeRate;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: displayCurrency,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  const formatPercent = (val: number | null) => {
    if (val === null || !isFinite(val)) return "-";
    const sign = val > 0 ? "+" : "";
    return `${sign}${val.toFixed(1)}%`;
  };

  const deltaPercent = (a: number, b: number): number | null => {
    if (Math.abs(a) < 0.01) return null;
    return ((b - a) / Math.abs(a)) * 100;
  };

  const kpis = useMemo(() => {
    return entries.map(([id, { scenario, projection }], idx) => {
      const cashFlows = projection.totals.cash_flow.map((m) => m.value);
      const initialCF = projection.preOperational.cash_flow;
      const ebitdaTotal = projection.totals.ebitda.reduce((s, m) => s + m.value, 0);
      const vpl = calculateNPV(cashFlows, discountRate, initialCF);
      const tir = calculateIRR(cashFlows, initialCF);
      const payback = calculateDiscountedPayback(cashFlows, discountRate, initialCF);

      return { id, name: scenario.name, color: COLORS[idx], vpl, tir, payback, ebitdaTotal };
    });
  }, [entries, discountRate]);

  if (isLoading) return <Skeleton className="w-full h-64" />;
  if (entries.length < 2) return null;

  const styleMap: Record<string, string> = {
    normal: "text-muted-foreground",
    bold: "font-semibold text-foreground",
    total: "font-bold bg-muted/50 border-t border-b border-gray-300 text-primary",
    subtitle: "font-medium text-gray-700 bg-gray-50/50",
  };

  const renderRow = (
    row: { key: string; label: string; field: keyof ProjectionSummary["totals"]; preField: string; type: string; indent?: boolean },
    useLastValue = false
  ) => {
    return (
      <tr key={row.key} className={`hover:bg-muted/30 transition-colors ${styleMap[row.type]}`}>
        <td className={`p-3 text-sm sticky left-0 bg-background border-r min-w-[220px] z-10 ${row.indent ? "pl-8" : ""}`}>
          {row.label}
        </td>

        {/* SETUP columns */}
        {entries.map(([id, { projection }], idx) => {
          const preOp = (projection.preOperational as any)[row.preField] || 0;
          return (
            <td
              key={`setup-${id}`}
              className={`p-2 text-xs text-right border-r min-w-[110px] ${COLORS[idx].bg}`}
            >
              {formatMoney(preOp)}
            </td>
          );
        })}

        {/* Year columns */}
        {yearIndices.map((yearIdx) => (
          <Fragment key={`year-${yearIdx}`}>
            {entries.map(([id, { projection }], idx) => {
              const data = projection.totals[row.field] as MonthlyData[];
              const val = useLastValue
                ? getYearlyLastValue(data, yearIdx)
                : getYearlyTotal(data, yearIdx);
              return (
                <td
                  key={`y${yearIdx}-${id}`}
                  className={`p-2 text-xs text-right min-w-[120px] ${COLORS[idx].bg} border-r`}
                >
                  {formatMoney(val)}
                </td>
              );
            })}
            {showDelta && (() => {
              const dataA = (entries[0][1].projection.totals[row.field] as MonthlyData[]);
              const dataB = (entries[1][1].projection.totals[row.field] as MonthlyData[]);
              const valA = useLastValue ? getYearlyLastValue(dataA, yearIdx) : getYearlyTotal(dataA, yearIdx);
              const valB = useLastValue ? getYearlyLastValue(dataB, yearIdx) : getYearlyTotal(dataB, yearIdx);
              const delta = deltaPercent(valA, valB);
              const deltaColor =
                delta === null ? "text-slate-400" :
                delta > 0 ? "text-emerald-600" :
                delta < 0 ? "text-red-500" : "text-slate-500";
              return (
                <td key={`delta-${yearIdx}`} className={`p-2 text-xs text-right min-w-[80px] bg-gray-50 border-r font-medium ${deltaColor}`}>
                  {formatPercent(delta)}
                </td>
              );
            })()}
          </Fragment>
        ))}
      </tr>
    );
  };

  return (
    <Card className="mt-6 border shadow-sm">
      <CardHeader className="pb-4 border-b bg-muted/10">
        <CardTitle className="text-lg font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Comparação de Cenários</span>
            <span className="text-xs font-normal text-muted-foreground bg-white px-2 py-1 rounded border shadow-sm">
              {displayCurrency}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompareMode(false)}
            className="gap-2 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao DRE
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* KPI Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* VPL */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              VPL ({discountRate}% a.a.)
            </div>
            {kpis.map((k) => (
              <div key={k.id} className="flex items-center justify-between">
                <span className={`text-xs font-medium ${k.color.label}`}>{k.name}</span>
                <span className={`text-sm font-bold ${k.vpl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {formatMoney(k.vpl)}
                </span>
              </div>
            ))}
          </div>

          {/* TIR */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              TIR (anualizada)
            </div>
            {kpis.map((k) => (
              <div key={k.id} className="flex items-center justify-between">
                <span className={`text-xs font-medium ${k.color.label}`}>{k.name}</span>
                <span className="text-sm font-bold">
                  {k.tir !== null ? `${k.tir.toFixed(1)}%` : "N/A"}
                </span>
              </div>
            ))}
          </div>

          {/* Payback */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              Payback Descontado
            </div>
            {kpis.map((k) => (
              <div key={k.id} className="flex items-center justify-between">
                <span className={`text-xs font-medium ${k.color.label}`}>{k.name}</span>
                <span className="text-sm font-bold">
                  {k.payback !== null ? `Mês ${k.payback}` : `> ${projectionMonths}m`}
                </span>
              </div>
            ))}
          </div>

          {/* EBITDA Total */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5" />
              EBITDA Total ({projectionYears} {projectionYears === 1 ? 'Ano' : 'Anos'})
            </div>
            {kpis.map((k) => (
              <div key={k.id} className="flex items-center justify-between">
                <span className={`text-xs font-medium ${k.color.label}`}>{k.name}</span>
                <span className={`text-sm font-bold ${k.ebitdaTotal >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {formatMoney(k.ebitdaTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison DRE Table */}
        <div className="w-full overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              {/* Scenario name row */}
              <tr className="border-b">
                <th
                  rowSpan={2}
                  className="p-3 text-left text-xs font-bold text-muted-foreground sticky left-0 bg-background z-20 min-w-[220px] border-r"
                >
                  CONTA
                </th>
                <th
                  colSpan={entries.length}
                  className="p-2 text-xs font-bold text-center bg-orange-50/50 border-r text-orange-800"
                >
                  SETUP
                </th>
                {yearIndices.map((yi) => (
                  <th
                    key={yi}
                    colSpan={entries.length + (showDelta ? 1 : 0)}
                    className="p-2 text-xs font-black text-center bg-gray-100 border-r border-gray-300 text-gray-800"
                  >
                    ANO {yi + 1}
                  </th>
                ))}
              </tr>
              {/* Scenario sub-headers */}
              <tr className="border-b bg-muted/5">
                {/* Setup sub-headers */}
                {entries.map(([id, { scenario }], idx) => (
                  <th
                    key={`sh-${id}`}
                    className={`p-1.5 text-[10px] font-bold text-center border-r min-w-[110px] ${COLORS[idx].header}`}
                  >
                    {scenario.name}
                  </th>
                ))}
                {/* Year sub-headers */}
                {yearIndices.map((yi) => (
                  <Fragment key={`yh-${yi}`}>
                    {entries.map(([id, { scenario }], idx) => (
                      <th
                        key={`y${yi}-h-${id}`}
                        className={`p-1.5 text-[10px] font-bold text-center border-r min-w-[120px] ${COLORS[idx].header}`}
                      >
                        {scenario.name}
                      </th>
                    ))}
                    {showDelta && (
                      <th className="p-1.5 text-[10px] font-bold text-center bg-gray-100 border-r min-w-[80px] text-gray-600">
                        Delta %
                      </th>
                    )}
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {DRE_ROWS.map((row) => renderRow(row, false))}

              <tr className="h-6 bg-muted/10 border-t border-b">
                <td colSpan={100} className="p-2 text-xs font-bold text-center text-muted-foreground">
                  CAIXA
                </td>
              </tr>

              {renderRow(CASH_ROWS[0], false)}
              {renderRow(CASH_ROWS[1], true)}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
