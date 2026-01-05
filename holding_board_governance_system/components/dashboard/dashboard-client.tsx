"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Users, Infinity, CalendarDays, Layers, 
  Wallet, TrendingUp, BarChart3, Activity, ArrowUpRight 
} from 'lucide-react'

export function DashboardClient({ 
  providerStats, 
  nextDeliveries, 
  quarterStats,
  kpis,
  currentYear 
}: any) {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)

  const filteredDeliveries = selectedQuarter 
    ? nextDeliveries.filter((f: any) => f.quarter === selectedQuarter)
    : nextDeliveries

  return (
    <div className="space-y-8">
      {/* LINHA 1: CARDS DE KPI */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet className="w-24 h-24" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Capex Total (Investido)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-slate-900">${kpis.totalCapex.toLocaleString()}</div>
                <p className="text-[10px] text-emerald-600 font-bold flex items-center mt-1 uppercase">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Capital Alocado
                </p>
            </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp className="w-24 h-24" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Run Rate (Mensal)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-slate-900">${kpis.totalMonthly.toLocaleString()}</div>
                <p className="text-[10px] text-rose-600 font-bold flex items-center mt-1 uppercase">
                    <Activity className="w-3 h-3 mr-1" /> Custo Operacional
                </p>
            </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><BarChart3 className="w-24 h-24" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Volume de Entregas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-slate-900">{nextDeliveries.length} <span className="text-sm text-slate-400 font-medium">marcos</span></div>
                <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 border-slate-200">
                        {kpis.activeProjectsCount} Projetos Ativos
                    </Badge>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* MAPA DE CARGA */}
        <Card className="col-span-2 border-none shadow-sm bg-white">
            <CardHeader className="border-b border-slate-50 pb-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                            <Users className="w-5 h-5 text-indigo-600" /> Mapa de Carga e Parceiros
                        </CardTitle>
                        <CardDescription className="text-xs">Ocupação híbrida: Projetos Estratégicos e Demandas Operacionais.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow>
                        <TableHead className="w-[200px] font-bold text-xs uppercase tracking-wider text-slate-500">Parceiro / Squad</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Volume Atual</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Status Operacional</TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-500 pr-6">Disponibilidade</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {providerStats.map((provider: any) => (
                        <TableRow key={provider.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                            <TableCell className="font-bold text-slate-700 py-4">
                                <div className="flex flex-col">
                                    <span>{provider.name}</span>
                                    <span className="text-[9px] text-slate-400 font-normal uppercase tracking-wide">
                                        {provider.isExternal ? 'Externo / Consultoria' : 'Engine Interna'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1.5">
                                    {/* Exibe o somatório 1+2=3 calculado no servidor */}
                                    <span className="text-xs font-bold text-slate-900">
                                        {provider.occupied} {provider.isExternal ? 'Demandas' : 'Slots Ocupados'}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {/* Lista os nomes unificados de fases e tarefas */}
                                        {provider.activeAllocations?.map((name: string, i: number) => (
                                            <Badge key={i} variant="outline" className="text-[8px] px-1 h-4 border-slate-200 text-slate-500 max-w-[150px] truncate">
                                                {name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {provider.isOverloaded ? (
                                    <Badge className="bg-red-50 text-red-700 border-red-100 text-[10px] font-bold animate-pulse tracking-tight">SOBRECARREGADO</Badge>
                                ) : (
                                    <Badge className={provider.isExternal ? "bg-blue-50 text-blue-700 border-blue-100 text-[10px]" : "bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]"}>
                                        {provider.isExternal ? 'SOB DEMANDA' : 'OPERANTE'}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                {provider.isExternal ? <Infinity className="w-5 h-5 text-slate-400 ml-auto" /> : (
                                    <div className="flex justify-end items-center gap-1">
                                        {/* Muda para vermelho se free for 0 ou negativo */}
                                        <span className={`text-xl font-black ${provider.free > 0 ? 'text-indigo-600' : 'text-red-500'}`}>{provider.free}</span>
                                        <span className="text-[9px] text-slate-400 uppercase font-bold mt-1">Slots</span>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>

        {/* RADAR ANUAL */}
        <Card className="border-none shadow-sm bg-slate-900 text-white flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-rose-500" /> Radar Anual
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs italic">
                    {selectedQuarter ? `Exibindo entregas de ${selectedQuarter}` : "Clique em um trimestre para filtrar."}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-4">
                <div className="space-y-3">
                    {Object.entries(quarterStats).map(([q, count]) => (
                        <div 
                            key={q} 
                            onClick={() => setSelectedQuarter(selectedQuarter === q ? null : q)}
                            className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${
                                selectedQuarter === q 
                                ? 'bg-rose-600/20 border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.2)]' 
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-inner ${
                                    selectedQuarter === q || (!selectedQuarter && (count as number) > 0) ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'
                                }`}>
                                    {q}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-200">
                                        {q === 'Q1' ? 'Jan-Mar' : q === 'Q2' ? 'Abr-Jun' : q === 'Q3' ? 'Jul-Set' : 'Out-Dez'}
                                    </div>
                                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{currentYear}</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-white">{count as number}</span>
                                <span className="text-[8px] text-slate-500 uppercase">Entregas</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {selectedQuarter ? `Fases ${selectedQuarter}` : "Próximas Entregas"}
                        </p>
                        {selectedQuarter && (
                             <button onClick={() => setSelectedQuarter(null)} className="text-[9px] text-rose-400 hover:underline">Limpar</button>
                        )}
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 scrollbar-hide">
                        {filteredDeliveries.length > 0 ? filteredDeliveries.slice(0, 6).map((f: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs group hover:bg-white/5 p-1 rounded transition-colors">
                                <span className="text-slate-300 truncate max-w-[150px]" title={f.name}>{f.name}</span>
                                <span className="text-rose-400 font-mono text-[10px] font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">{f.custom_timeline}</span>
                            </div>
                        )) : (
                            <span className="text-xs text-slate-600 italic">Nenhum marco para este período.</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}