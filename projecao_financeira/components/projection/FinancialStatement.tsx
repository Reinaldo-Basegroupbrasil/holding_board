"use client";

import { useState, Fragment } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyData } from "@/types";
import { ChevronDown, ChevronRight } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";

export function FinancialStatement() {
  const { projection, currentProject, isLoading, exchangeRate, targetCurrency } = useProjectStore();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  if (isLoading && !projection) return <Skeleton className="w-full h-64" />;
  if (!projection) return <div className="p-4 text-muted-foreground">Sem dados.</div>;

  // Desestruturação correta (preOperational separado)
  const { totals, preOperational, items } = projection;
  const displayCurrency = targetCurrency || currentProject?.currency_main || 'BRL';

  // Dicionário
  const definitions: Record<string, string> = {
    revenue: "Faturamento Bruto.",
    tax: "Impostos sobre Venda.",
    cost_variable: "Custos Variáveis (CMV).",
    cost_fixed: "Despesas Operacionais Fixas.",
    personnel: "Salários, encargos e benefícios.",
    ebitda: "Lucro Operacional antes de juros/impostos.",
    investment: "Investimentos (Capex).",
    ebit: "Lucro Operacional após depreciação.",
    financial_revenue: "Rendimentos financeiros.",
    financial_expense: "Juros pagos.",
    ebt: "Lucro Antes dos Impostos.",
    tax_profit: "IRPJ e CSLL.",
    net_result: "Lucro Líquido Final.",
    cash_flow: "Fluxo de Caixa do Mês.",
    cash_accumulated: "Saldo em Banco."
  };

  const toggleRow = (categoryKey: string) => {
    if (expandedRows.includes(categoryKey)) {
      setExpandedRows(expandedRows.filter(k => k !== categoryKey));
    } else {
      setExpandedRows([...expandedRows, categoryKey]);
    }
  };

  const formatMoney = (val: number) => {
    if (Math.abs(val) < 0.01) return "-";
    const convertedVal = val / exchangeRate;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: displayCurrency, 
      maximumFractionDigits: 0 
    }).format(convertedVal);
  };
  
  const formatNumber = (val: number) => {
    if (Math.abs(val) < 0.01) return "-";
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);
  };

  const getYearlyTotal = (data: MonthlyData[], yearIndex: number) => {
    if (!data) return 0;
    const start = yearIndex * 12;
    const end = start + 12;
    return data.slice(start, end).reduce((acc, curr) => acc + (curr.value || 0), 0);
  };

  const getYearlyLastValue = (data: MonthlyData[], yearIndex: number) => {
    if (!data) return 0;
    const end = (yearIndex * 12) + 11;
    if (end < data.length) return data[end].value;
    return 0;
  };

  const formatByType = (val: number, fmt?: string) => {
    if (fmt === 'number') return formatNumber(val);
    if (fmt === 'percent') {
      if (Math.abs(val) < 0.01) return "-";
      return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(val)}%`;
    }
    return formatMoney(val);
  };

  const Row = ({ label, data, preOpValue = 0, type = 'normal', indent = false, categoryKey = "", valueFormat }: any) => {
    const safeData = data || [];
    const isExpanded = categoryKey && expandedRows.includes(categoryKey);
    const hasChildren = categoryKey && items.some(i => i.category === categoryKey);
    const fmt = (v: number) => formatByType(v, valueFormat);

    const styleMap: any = {
      'normal': 'text-muted-foreground',
      'bold': 'font-semibold text-foreground',
      'total': 'font-bold bg-muted/50 border-t border-b border-gray-300 text-primary',
      'subtitle': 'font-medium text-gray-700 bg-gray-50/50',
    };

    return (
      <Fragment>
        <tr 
          className={`hover:bg-muted/30 transition-colors ${styleMap[type]} ${hasChildren ? "cursor-pointer" : ""}`}
          onClick={() => hasChildren && toggleRow(categoryKey)}
        >
          <td className={`p-3 text-sm sticky left-0 bg-background border-r min-w-[250px] z-10 ${indent ? "pl-8" : ""} flex items-center`}>
            {hasChildren && (
              <span className="mr-2 text-muted-foreground">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </span>
            )}
            {!hasChildren && indent && <span className="w-5" />}
            <span className="flex items-center">
                {label}
                {categoryKey && definitions[categoryKey] && (
                    <div onClick={(e) => e.stopPropagation()} className="ml-1">
                        <HelpTooltip text={definitions[categoryKey]} />
                    </div>
                )}
            </span>
          </td>
          
          <td className="p-3 text-xs text-right border-r bg-orange-50/20 font-medium text-orange-900 min-w-[100px]">
             {fmt(preOpValue)}
          </td>

          {safeData.map((m: MonthlyData, index: number) => {
            const isDecember = (index + 1) % 12 === 0;
            const yearNum = Math.ceil((index + 1) / 12);
            return (
              <Fragment key={m.monthIndex}>
                <td className={`p-3 text-xs text-right min-w-[110px] whitespace-nowrap ${isDecember ? "border-r-2 border-gray-300" : ""}`}>
                  {fmt(m.value)}
                </td>
                {isDecember && (
                  <td className="p-3 text-xs text-right min-w-[120px] font-bold bg-gray-100 border-r border-gray-300 text-gray-900">
                    {fmt(getYearlyTotal(safeData, yearNum - 1))}
                  </td>
                )}
              </Fragment>
            );
          })}
        </tr>

        {isExpanded && items
            .filter(i => i.category === categoryKey)
            .map((subItem) => {
              const effectiveFormat = (subItem.format === 'percent' && subItem.driver_id) ? 'currency' : subItem.format;
              const subFmt = (v: number) => formatByType(v, effectiveFormat);
              return (
                <tr key={subItem.assumptionId} className="bg-slate-50/50 hover:bg-slate-100 text-slate-600 animate-in fade-in slide-in-from-top-1">
                  <td className="p-2 text-xs sticky left-0 bg-slate-50 border-r min-w-[250px] z-10 pl-12 italic border-l-4 border-l-primary/20 flex items-center">
                    {subItem.name}
                    {subItem.category === 'base' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1 rounded">Driver</span>}
                  </td>
                  <td className="p-2 text-xs text-right border-r bg-orange-50/10 text-slate-500">
                      {subFmt(subItem.preOperationalValue || 0)}
                  </td>
                  {(subItem.data || []).map((m: MonthlyData, index: number) => {
                    const isDecember = (index + 1) % 12 === 0;
                    return (
                      <Fragment key={m.monthIndex}>
                        <td className={`p-2 text-xs text-right min-w-[110px] ${isDecember ? "border-r-2 border-gray-300" : ""}`}>
                          {subFmt(m.value)}
                        </td>
                        {isDecember && (
                          <td className="p-2 text-xs text-right min-w-[120px] bg-slate-100 border-r border-gray-300">
                            {subFmt(getYearlyTotal(subItem.data || [], Math.ceil((index + 1) / 12) - 1))}
                          </td>
                        )}
                      </Fragment>
                    );
                  })}
                </tr>
              );
        })}
      </Fragment>
    );
  };

  const baseItems = items.filter(i => i.category === 'base');
  const parentBaseItems = baseItems.filter(i => !i.driver_id);
  const childBaseItems = baseItems.filter(i => i.driver_id);

  return (
    <Card className="mt-6 border shadow-sm">
      <CardHeader className="pb-4 border-b bg-muted/10">
        <CardTitle className="text-lg font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
              <span>Demonstrativo de Resultados (DRE)</span>
              <HelpTooltip text="Visão Contábil (Competência)." />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-normal text-muted-foreground bg-white px-2 py-1 rounded border shadow-sm">
               {displayCurrency}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/5">
                <th className="p-3 text-left text-xs font-bold text-muted-foreground sticky left-0 bg-background z-20 min-w-[250px] border-r">CONTA</th>
                <th className="p-2 text-xs font-bold text-center bg-orange-50/50 border-r min-w-[100px] text-orange-800">SETUP</th>
                {(totals.revenue || []).map((m, index) => {
                  const d = new Date(m.date);
                  const isDecember = (index + 1) % 12 === 0;
                  return (
                    <Fragment key={m.monthIndex}>
                      <th className={`p-2 text-xs font-medium text-muted-foreground text-right min-w-[110px] ${isDecember ? "border-r-2 border-gray-300" : ""}`}>
                        {d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                      </th>
                      {isDecember && <th className="p-2 text-xs font-black text-center bg-gray-200 border-r border-gray-300 min-w-[120px] text-gray-800">TOTAL {d.getFullYear()}</th>}
                    </Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {baseItems.length > 0 && (
                <>
                  <tr className="h-6 bg-blue-50/50 border-b"><td colSpan={100} className="p-2 text-xs font-bold text-center text-blue-800">MÉTRICAS</td></tr>
                  {parentBaseItems.map(parent => {
                    const children = childBaseItems.filter(c => c.driver_id === parent.assumptionId);
                    return (
                      <Fragment key={parent.assumptionId}>
                        <Row label={parent.name} data={parent.data} preOpValue={parent.preOperationalValue} valueFormat={parent.format || 'number'} />
                        {children.map(child => {
                          const childFmt = (v: number) => formatByType(v, child.format || 'number');
                          return (
                            <tr key={child.assumptionId} className="bg-blue-50/30 hover:bg-blue-50 text-slate-600 animate-in fade-in">
                              <td className="p-2 text-xs sticky left-0 bg-blue-50/30 border-r min-w-[250px] z-10 pl-10 italic border-l-4 border-l-blue-200 flex items-center">
                                <span className="mr-1 text-blue-400">+</span>
                                {child.name}
                              </td>
                              <td className="p-2 text-xs text-right border-r bg-orange-50/10 text-slate-500">
                                {childFmt(child.preOperationalValue || 0)}
                              </td>
                              {(child.data || []).map((m: MonthlyData, index: number) => {
                                const isDecember = (index + 1) % 12 === 0;
                                return (
                                  <Fragment key={m.monthIndex}>
                                    <td className={`p-2 text-xs text-right min-w-[110px] ${isDecember ? "border-r-2 border-gray-300" : ""}`}>
                                      {childFmt(m.value)}
                                    </td>
                                    {isDecember && (
                                      <td className="p-2 text-xs text-right min-w-[120px] bg-slate-100 border-r border-gray-300">
                                        {childFmt(getYearlyTotal(child.data || [], Math.ceil((index + 1) / 12) - 1))}
                                      </td>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                  {childBaseItems.filter(c => !parentBaseItems.some(p => p.assumptionId === c.driver_id)).map(orphan => (
                    <Row key={orphan.assumptionId} label={orphan.name} data={orphan.data} preOpValue={orphan.preOperationalValue} valueFormat={orphan.format || 'number'} />
                  ))}
                  <tr className="h-4 border-b"></tr>
                </>
              )}

              {/* CORREÇÃO DO ERRO: Usamos preOperational.campo (direto) e não totals.preOperational */}
              <Row label="(+) Receita Bruta" data={totals.revenue} preOpValue={preOperational.revenue} type="bold" categoryKey="revenue" />
              <Row label="(-) Impostos s/ Vendas" data={totals.taxes_sale} preOpValue={preOperational.taxes_sale} indent categoryKey="tax" />
              <Row label="(-) Custos Variáveis" data={totals.costs_variable} preOpValue={preOperational.costs_variable} indent categoryKey="cost_variable" />
              <Row label="(-) Custos Fixos" data={totals.costs_fixed} preOpValue={preOperational.costs_fixed} indent categoryKey="cost_fixed" />
              <Row label="(-) Pessoal" data={totals.personnel} preOpValue={preOperational.personnel} indent categoryKey="personnel" />
              
              <Row label="(=) EBITDA" data={totals.ebitda} preOpValue={preOperational.ebitda} type="total" categoryKey="ebitda" />
              
              <Row label="(-) Depreciação" data={totals.depreciation} preOpValue={preOperational.depreciation} indent categoryKey="investment" />
              <Row label="(=) EBIT" data={totals.ebit} preOpValue={preOperational.ebit} type="subtitle" categoryKey="ebit" />
              
              <Row label="(+) Receita Financeira" data={totals.financial_revenue} preOpValue={preOperational.financial_revenue} indent categoryKey="financial_revenue" />
              <Row label="(-) Despesas Financeiras" data={totals.financial_expense} preOpValue={preOperational.financial_expense} indent categoryKey="financial_expense" />
              <Row label="(=) EBT" data={totals.ebt} preOpValue={preOperational.ebt} type="subtitle" categoryKey="ebt" />
              
              <Row label="(-) IRPJ / CSLL" data={totals.tax_profit} preOpValue={preOperational.tax_profit} indent categoryKey="tax_profit" />
              
              <Row label="(=) LUCRO LÍQUIDO" data={totals.net_result} preOpValue={preOperational.net_result} type="total" categoryKey="net_result" />
              
              <tr className="h-6 bg-muted/10 border-t border-b"><td colSpan={100} className="p-2 text-xs font-bold text-center text-muted-foreground">CAIXA</td></tr>
              <Row label="Fluxo de Caixa Mensal" data={totals.cash_flow} preOpValue={preOperational.cash_flow} type="bold" categoryKey="cash_flow" />
              <Row label="Saldo Acumulado" data={totals.cash_accumulated} preOpValue={preOperational.cash_accumulated} type="total" categoryKey="cash_accumulated" />
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}