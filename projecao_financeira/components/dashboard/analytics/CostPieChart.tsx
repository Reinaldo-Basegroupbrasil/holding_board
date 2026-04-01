"use client";

import { useProjectStore } from "@/store/projectStore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export function CostPieChart() {
  const { projection, isLoading, exchangeRate, targetCurrency } = useProjectStore();

  if (isLoading || !projection) {
    return (
      <div className="h-[300px] w-full bg-slate-50 animate-pulse rounded-xl border border-dashed flex items-center justify-center text-muted-foreground">
        Carregando dados...
      </div>
    );
  }

  const { totals } = projection;

  // --- CORREÇÃO DO ERRO AQUI ---
  // Adicionamos (data || []) para garantir que nunca tentaremos ler 'reduce' de undefined
  const sum = (data: any[] | undefined) => {
    if (!data) return 0;
    return data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  };

  // 1. Calcula os Totais com segurança
  const totalTaxes = sum(totals.taxes_sale);
  const totalVariable = sum(totals.costs_variable);
  const totalPersonnel = sum(totals.personnel); 
  const totalFixedRaw = sum(totals.costs_fixed);

  // 2. Lógica de "Descascar a Cebola":
  // Se Pessoal não existir no objeto totals (projetos antigos), assume 0
  let otherFixed = totalFixedRaw - totalPersonnel;
  if (otherFixed < 0) otherFixed = 0; 

  // 3. Monta os dados do Gráfico
  const data = [
    { name: 'Impostos', value: totalTaxes, color: '#ef4444' },    // Vermelho
    { name: 'Variáveis', value: totalVariable, color: '#f59e0b' }, // Laranja
    { name: 'Pessoal', value: totalPersonnel, color: '#3b82f6' },  // Azul
    { name: 'Outros Fixos', value: otherFixed, color: '#94a3b8' }, // Cinza
  ].filter(item => item.value > 0.01); // Esconde fatias zeradas

  // Formatação de Moeda para o Tooltip
  const formatMoney = (val: number) => {
    const converted = val / exchangeRate;
    const locale = targetCurrency === 'BRL' ? 'pt-BR' : 'en-US';
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: targetCurrency,
      maximumFractionDigits: 0 
    }).format(converted);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs p-2 rounded shadow-xl border border-slate-700">
          <p className="font-bold mb-1">{data.name}</p>
          <p>{formatMoney(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full bg-slate-50 rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground text-sm p-6">
        <span className="mb-2">Sem custos lançados</span>
        <span className="text-xs text-muted-foreground/70">Adicione premissas de custo para ver o gráfico.</span>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full bg-white p-4 rounded-xl border shadow-sm flex flex-col">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Composição de Custos (Total)</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60} // Faz virar um Donut (mais moderno)
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="middle" 
              align="right" 
              layout="vertical"
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className="text-xs text-slate-600 ml-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}