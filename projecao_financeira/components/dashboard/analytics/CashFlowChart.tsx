'use client';

import { useProjectStore } from '@/store/projectStore';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';

export function CashFlowChart() {
  const { projection, exchangeRate, targetCurrency } = useProjectStore();

  // Verifica se existe projeção e se a lista de fluxo de caixa existe
  if (!projection || !projection.totals || !projection.totals.cash_flow) return null;

  const data = projection.totals.cash_flow.map((cfItem, index) => {
    // Busca o saldo acumulado correspondente pelo índice
    const accItem = projection.totals.cash_accumulated[index];
    
    return {
      name: `M${cfItem.monthIndex + 1}`,
      FluxoMensal: cfItem.value / exchangeRate,
      // Se não tiver acumulado (erro de dado), usa 0
      SaldoAcumulado: accItem ? (accItem.value / exchangeRate) : 0
    };
  });

  // CORREÇÃO AQUI: Mudamos 'val: number' para 'val: any' para satisfazer o Recharts
  const formatCurrency = (val: any) => {
    const numberVal = Number(val);
    if (isNaN(numberVal)) return "-";
    const locale = targetCurrency === 'BRL' ? 'pt-BR' : 'en-US';
    return new Intl.NumberFormat(locale, { 
        style: 'currency', 
        currency: targetCurrency, 
        compactDisplay: "short", 
        notation: "compact" 
    }).format(numberVal);
  };

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl border shadow-sm flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Dinâmica de Caixa (Curva J)</h3>
        <p className="text-sm text-muted-foreground">Barras: Fluxo Mensal | Linha: Saldo Acumulado</p>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{fontSize: 12}} minTickGap={30} />
            <YAxis tickFormatter={formatCurrency} tick={{fontSize: 12}} />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#000" />
            
            <Bar dataKey="FluxoMensal" fill="#94a3b8" barSize={20} opacity={0.7} name="Fluxo Mensal" />
            
            <Line 
              type="monotone" 
              dataKey="SaldoAcumulado" 
              stroke="#2563eb" 
              strokeWidth={3} 
              dot={false} 
              name="Saldo Acumulado"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}