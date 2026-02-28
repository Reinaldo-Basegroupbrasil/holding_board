"use client";

import { useMemo, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  buildTornadoData,
  getCategoryLabel,
  type TornadoItem,
} from "@/lib/sensitivityEngine";

const VARIATION_OPTIONS = [10, 20, 30];

export function SensitivitySection() {
  const { assumptions, discountRate, profitTaxMode, profitTaxRate, exchangeRate, targetCurrency, currentProject } =
    useProjectStore();

  const [variationPct, setVariationPct] = useState(20);
  const [showTable, setShowTable] = useState(false);

  const taxConfig = useMemo(() => ({ mode: profitTaxMode, rate: profitTaxRate }), [profitTaxMode, profitTaxRate]);

  const tornadoData = useMemo(() => {
    if (!assumptions || assumptions.length === 0) return [];
    const months = currentProject?.projection_months || 36;
    return buildTornadoData(assumptions, discountRate, variationPct, 10, taxConfig, months);
  }, [assumptions, discountRate, variationPct, taxConfig, currentProject?.projection_months]);

  if (!assumptions || assumptions.length === 0) return null;
  if (tornadoData.length === 0) return null;

  const vpnBase = tornadoData[0]?.vpnBase ?? 0;

  const formatMoney = (val: number) => {
    const converted = val / exchangeRate;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: targetCurrency,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  const formatCompact = (val: any) => {
    const n = Number(val);
    if (isNaN(n)) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: targetCurrency,
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 0,
    }).format(n / exchangeRate);
  };

  const chartData = tornadoData.map((item) => ({
    name: item.name.length > 22 ? item.name.slice(0, 20) + "..." : item.name,
    fullName: item.name,
    category: getCategoryLabel(item.category),
    downDelta: item.vpnDown - vpnBase,
    upDelta: item.vpnUp - vpnBase,
    vpnDown: item.vpnDown,
    vpnUp: item.vpnUp,
    vpnBase,
  }));

  const allDeltas = chartData.flatMap((d) => [d.downDelta, d.upDelta]);
  const maxAbsDelta = Math.max(...allDeltas.map(Math.abs), 1);
  const domainPad = maxAbsDelta * 1.15;

  return (
    <Card className="mt-6 border shadow-sm">
      <CardHeader className="pb-4 border-b bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500" />
            Análise de Sensibilidade
            <HelpTooltip text="Mostra quais premissas têm maior impacto no VPL do projeto. Cada barra indica o quanto o VPL muda ao variar uma premissa para cima ou para baixo. Premissas no topo são as mais críticas." />
          </CardTitle>

          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Variação
            </label>
            <div className="flex gap-1">
              {VARIATION_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setVariationPct(pct)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    variationPct === pct
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ±{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Tornado Chart */}
        <div className="w-full" style={{ height: Math.max(280, chartData.length * 48 + 60) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e5e7eb"
              />
              <XAxis
                type="number"
                domain={[-domainPad, domainPad]}
                tickFormatter={formatCompact}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0]?.payload;
                  if (!data) return null;
                  return (
                    <div className="bg-white border rounded-lg shadow-lg p-3 text-xs max-w-xs">
                      <p className="font-bold text-slate-800 mb-1">
                        {data.fullName}
                      </p>
                      <p className="text-slate-500 mb-2">{data.category}</p>
                      <div className="space-y-1">
                        <p>
                          <span className="text-red-600 font-semibold">
                            -{variationPct}%:
                          </span>{" "}
                          VPL = {formatMoney(data.vpnDown)}
                        </p>
                        <p>
                          <span className="text-slate-500 font-semibold">
                            Base:
                          </span>{" "}
                          VPL = {formatMoney(data.vpnBase)}
                        </p>
                        <p>
                          <span className="text-green-600 font-semibold">
                            +{variationPct}%:
                          </span>{" "}
                          VPL = {formatMoney(data.vpnUp)}
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine x={0} stroke="#64748b" strokeWidth={2} />
              <Bar dataKey="downDelta" stackId="stack" barSize={20}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`down-${idx}`}
                    fill={entry.downDelta < 0 ? "#ef4444" : "#22c55e"}
                    fillOpacity={0.75}
                  />
                ))}
              </Bar>
              <Bar dataKey="upDelta" stackId="stack" barSize={20}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`up-${idx}`}
                    fill={entry.upDelta >= 0 ? "#22c55e" : "#ef4444"}
                    fillOpacity={0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-2">
          Barras verdes = aumento no VPL | Barras vermelhas = redução no VPL |
          Referência: VPL Base = {formatMoney(vpnBase)}
        </p>

        {/* Detail Table Toggle */}
        <button
          onClick={() => setShowTable(!showTable)}
          className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors mx-auto"
        >
          {showTable ? (
            <>
              <ChevronUp className="h-3 w-3" /> Ocultar tabela detalhada
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Ver tabela detalhada
            </>
          )}
        </button>

        {showTable && (
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    Premissa
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    Categoria
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-red-600">
                    VPL (-{variationPct}%)
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600">
                    VPL Base
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-green-600">
                    VPL (+{variationPct}%)
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-amber-600">
                    Impacto Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {tornadoData.map((item, idx) => (
                  <TornadoRow
                    key={item.assumptionId}
                    item={item}
                    idx={idx}
                    formatMoney={formatMoney}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tornadoData.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Premissa mais sensível:</strong>{" "}
              {tornadoData[0].name} ({getCategoryLabel(tornadoData[0].category)}).
              Uma variação de ±{variationPct}% nesta premissa altera o VPL em{" "}
              {formatMoney(tornadoData[0].deltaAbs)}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TornadoRow({
  item,
  idx,
  formatMoney,
}: {
  item: TornadoItem;
  idx: number;
  formatMoney: (v: number) => string;
}) {
  const bgClass = idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";
  return (
    <tr className={`${bgClass} border-b last:border-b-0 hover:bg-slate-100/50 transition-colors`}>
      <td className="px-3 py-2 font-medium text-slate-800 max-w-[200px] truncate">
        {item.name}
      </td>
      <td className="px-3 py-2 text-slate-500">
        {getCategoryLabel(item.category)}
      </td>
      <td className={`px-3 py-2 text-right font-mono ${item.vpnDown < item.vpnBase ? "text-red-600" : "text-green-600"}`}>
        {formatMoney(item.vpnDown)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-slate-600">
        {formatMoney(item.vpnBase)}
      </td>
      <td className={`px-3 py-2 text-right font-mono ${item.vpnUp > item.vpnBase ? "text-green-600" : "text-red-600"}`}>
        {formatMoney(item.vpnUp)}
      </td>
      <td className="px-3 py-2 text-right font-bold text-amber-600">
        {formatMoney(item.deltaAbs)}
      </td>
    </tr>
  );
}
