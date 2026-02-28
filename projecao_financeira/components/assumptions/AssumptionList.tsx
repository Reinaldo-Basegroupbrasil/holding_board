"use client";

import { Fragment } from "react";
import { Edit, Trash2, Link as LinkIcon, Layers, ArrowUpRight } from "lucide-react";
import { Assumption } from "@/types";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  assumptions?: Assumption[];
  onEdit?: (assumption: Assumption) => void;
  onDelete?: (id: string) => Promise<void>; 
  typeFilter?: string; 
  title?: string;      
}

export function AssumptionList({ assumptions = [], onEdit, onDelete, typeFilter }: Props) {
  const { currentProject } = useProjectStore();
  const displayCurrency = currentProject?.currency_main || 'BRL';

  // DICIONÁRIO DE TRADUÇÃO E CORES (CORRIGIDO)
  // Agora as chaves batem exatamente com o banco de dados (cost_fixed, cost_variable)
  const categoryConfig: Record<string, { label: string; color: string; textColor: string; order: number }> = {
    base: { label: "Métricas & Bases (Drivers)", color: "bg-gray-100", textColor: "text-gray-900", order: 1 },
    revenue: { label: "Receitas Operacionais", color: "bg-green-50", textColor: "text-green-800", order: 2 },
    tax: { label: "Impostos s/ Venda", color: "bg-yellow-50", textColor: "text-yellow-800", order: 3 },
    
    // CORREÇÃO AQUI: cost_variable em vez de variable_cost
    cost_variable: { label: "Custos Variáveis (CMV)", color: "bg-orange-50", textColor: "text-orange-800", order: 4 },
    
    // CORREÇÃO AQUI: cost_fixed em vez de fixed_cost
    cost_fixed: { label: "Custos Fixos (OpEx)", color: "bg-red-50", textColor: "text-red-800", order: 5 },
    
    personnel: { label: "Pessoal & Folha", color: "bg-red-50", textColor: "text-red-800", order: 5.5 },
    investment: { label: "Investimentos (CAPEX)", color: "bg-blue-50", textColor: "text-blue-800", order: 6 },
    financial_revenue: { label: "Receitas Financeiras", color: "bg-emerald-50", textColor: "text-emerald-800", order: 7 },
    financial_expense: { label: "Despesas Financeiras", color: "bg-rose-50", textColor: "text-rose-800", order: 7.5 },
    tax_profit: { label: "Impostos s/ Lucro (IR/CSLL)", color: "bg-purple-50", textColor: "text-purple-800", order: 8 },
    capital: { label: "Aportes & Empréstimos", color: "bg-indigo-50", textColor: "text-indigo-800", order: 9 },
  };

  const formatValue = (amount: number, format?: string) => {
    if (format === 'percent') return `${amount}%`;
    if (format === 'number') return new Intl.NumberFormat('pt-BR').format(amount);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: displayCurrency, maximumFractionDigits: 2 }).format(amount);
  };

  const getDriverName = (driverId: string | null | undefined) => {
    if (!driverId) return null;
    const driver = assumptions.find(a => a.id === driverId);
    return driver ? driver.name : "Desconhecido";
  };

  // Filtragem
  const filteredAssumptions = typeFilter 
    ? assumptions.filter(a => a.category === typeFilter)
    : assumptions;

  if (!filteredAssumptions || filteredAssumptions.length === 0) {
    if (typeFilter) return null;
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
        <p className="text-muted-foreground">Nenhuma premissa cadastrada.</p>
      </div>
    );
  }

  // 1. Agrupar por CATEGORIA PRINCIPAL
  const groupedAssumptions = filteredAssumptions.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, Assumption[]>);

  const sortedCategories = Object.keys(groupedAssumptions).sort((a, b) => {
    return (categoryConfig[a]?.order || 99) - (categoryConfig[b]?.order || 99);
  });

  return (
    <div className="space-y-6">
      {sortedCategories.map((catKey) => {
        // Fallback: Se a categoria não estiver no dicionário, usa o nome original em MAIÚSCULO
        const config = categoryConfig[catKey] || { label: catKey.toUpperCase().replace('_', ' '), color: "bg-gray-100", textColor: "text-gray-800" };
        const itemsInCategory = groupedAssumptions[catKey];

        // 2. Agrupar por SUBCATEGORIA
        const subGrouped = itemsInCategory.reduce((acc, item) => {
          const sub = item.subcategory || "Geral"; 
          if (!acc[sub]) acc[sub] = [];
          acc[sub].push(item);
          return acc;
        }, {} as Record<string, Assumption[]>);

        const sortedSubKeys = Object.keys(subGrouped).sort((a, b) => {
          if (a === "Geral") return -1;
          if (b === "Geral") return 1;
          return a.localeCompare(b);
        });

        return (
          <Card key={catKey} className="overflow-hidden border shadow-sm">
            <div className={`px-4 py-2 border-b flex items-center gap-2 ${config.color}`}>
              <Layers className={`h-4 w-4 ${config.textColor}`} />
              <h3 className={`font-bold text-sm uppercase tracking-wider ${config.textColor}`}>
                {config.label}
              </h3>
            </div>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[35%] pl-4">Nome da Premissa</TableHead>
                    <TableHead className="w-[30%]">Valor / Lógica</TableHead>
                    <TableHead className="w-[20%]">Detalhes</TableHead>
                    <TableHead className="w-[15%] text-right pr-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSubKeys.map((subKey) => (
                    <Fragment key={subKey}>
                      
                      {/* Cabeçalho da Subcategoria */}
                      {(sortedSubKeys.length > 1 || subKey !== "Geral") && (
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50">
                          <TableCell colSpan={4} className="py-1 px-4 text-xs font-bold text-slate-500 uppercase tracking-wide border-t border-b">
                            {subKey}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Itens */}
                      {subGrouped[subKey].map((item) => {
                        const isSetup = item.start_month === 0;
                        const driverName = getDriverName(item.driver_id);

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="pl-4 py-3 align-top">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{item.name}</span>
                                {isSetup && (
                                   <span className="inline-flex mt-1 items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 uppercase tracking-wide">
                                     Pontual (Setup)
                                   </span>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell className="py-3 align-top">
                              <div className="flex flex-col gap-1">
                                 <span className="font-semibold text-gray-700">
                                   {formatValue(item.amount, item.format)}
                                   {item.is_recurring ? <span className="text-gray-400 font-normal text-xs"> /mês</span> : null}
                                 </span>

                                 {driverName ? (
                                   <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                                     <LinkIcon className="h-3 w-3" />
                                     <span>
                                       x {item.driver_type === 'delta' ? 'Novos' : 'Total'} <strong>{driverName}</strong>
                                     </span>
                                   </div>
                                 ) : null}
                                 
                                 {(item.growth_rate && item.growth_rate > 0) ? (
                                   <span className="text-[10px] text-green-700 flex items-center">
                                     <ArrowUpRight className="h-3 w-3 mr-1" />
                                     Cresc. {item.growth_type === 'linear'
                                       ? `${formatValue(item.growth_rate, item.format)}/mês`
                                       : `${item.growth_rate}% a.a.`}
                                     {item.growth_start_month ? ` (a partir do mês ${item.growth_start_month})` : ''}
                                   </span>
                                 ) : null}
                              </div>
                            </TableCell>
                            
                            <TableCell className="py-3 align-top text-xs text-muted-foreground">
                              <div className="flex flex-col gap-1">
                                <span>Início: {item.start_month === 0 ? 'Mês 0' : `Mês ${item.start_month}`}</span>
                                {item.payment_lag ? (
                                    <span className="text-green-600">Recebimento: D+{item.payment_lag * 30}</span>
                                ) : null}
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-right pr-4 py-3 align-top">
                              <div className="flex justify-end gap-1">
                                {onEdit && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                                    <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                  </Button>
                                )}
                                {onDelete && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(item.id)}>
                                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}