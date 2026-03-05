"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { 
  CalendarDays, Layers, Wallet, TrendingUp, BarChart3, Activity, 
  ArrowUpRight, Briefcase, Factory, Gavel, AlertTriangle, 
  ArrowRight, FileText, Radar as RadarIcon, Users, ClipboardList
} from 'lucide-react'

export function DashboardClient({ 
  nextDeliveries, 
  quarterStats,
  kpis,
  currentYear,
  holdingByProvider,
  slaByProvider,
  lastMeeting,
}: any) {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)

  const filteredDeliveries = selectedQuarter 
    ? nextDeliveries.filter((f: any) => f.quarter === selectedQuarter)
    : nextDeliveries

  return (
    <div className="space-y-6">
      {/* LINHA 1: KPI CARDS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet className="w-20 h-20" /></div>
            <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capex Total (Investido)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-slate-900">{kpis.totalCapex.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                <p className="text-[10px] text-emerald-600 font-bold flex items-center mt-1 uppercase">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Capital Alocado
                </p>
            </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp className="w-20 h-20" /></div>
            <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Run Rate (Mensal)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-slate-900">{kpis.totalMonthly.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                <p className="text-[10px] text-rose-600 font-bold flex items-center mt-1 uppercase">
                    <Activity className="w-3 h-3 mr-1" /> Custo Operacional
                </p>
            </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Briefcase className="w-20 h-20" /></div>
            <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendências Holding</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-slate-900">{kpis.holdingActive}</div>
                <div className="flex items-center gap-2 mt-1">
                    {kpis.holdingOverdue > 0 ? (
                        <Badge className="bg-red-50 text-red-600 border-red-100 text-[9px] font-bold px-1.5 py-0 h-4">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> {kpis.holdingOverdue} atrasadas
                        </Badge>
                    ) : (
                        <span className="text-[10px] text-emerald-600 font-bold uppercase">Tudo em dia</span>
                    )}
                </div>
            </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Factory className="w-20 h-20" /></div>
            <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Demandas SLA</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-slate-900">{kpis.slaActive}</div>
                <div className="flex items-center gap-2 mt-1">
                    {kpis.slaOverdue > 0 ? (
                        <Badge className="bg-red-50 text-red-600 border-red-100 text-[9px] font-bold px-1.5 py-0 h-4">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> {kpis.slaOverdue} atrasadas
                        </Badge>
                    ) : (
                        <span className="text-[10px] text-emerald-600 font-bold uppercase">Tudo em dia</span>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* LINHA 2: PENDENCIAS POR RESPONSAVEL + RADAR ANUAL */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                            <ClipboardList className="w-5 h-5 text-indigo-600" /> Pendências por Responsável
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">Demandas ativas da Holding agrupadas por responsável.</CardDescription>
                    </div>
                    <Link href="/board/todo" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">Ver todas <ArrowRight className="w-3 h-3" /></Link>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {holdingByProvider.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Nenhuma pendência ativa.</p>
                ) : (
                    <div className="space-y-2">
                        {holdingByProvider.map((p: any) => (
                            <div key={p.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                                        <span className="text-[9px] text-slate-400 uppercase ml-2">
                                            {p.type?.includes('EXTERNAL') ? 'Externo' : 'Interno'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-100">
                                        {p.active} {p.active === 1 ? 'ativa' : 'ativas'}
                                    </Badge>
                                    {p.overdue > 0 && (
                                        <Badge className="bg-red-50 text-red-600 border-red-100 text-[10px] font-bold">
                                            {p.overdue} {p.overdue === 1 ? 'atrasada' : 'atrasadas'}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        {/* RADAR ANUAL */}
        <Card className="border-none shadow-sm bg-slate-900 text-white flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-rose-500" /> Radar Anual
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs italic">
                    {selectedQuarter ? `Exibindo entregas de ${selectedQuarter}` : "Clique em um trimestre para filtrar."}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-3">
                <div className="space-y-2">
                    {Object.entries(quarterStats).map(([q, count]) => (
                        <div 
                            key={q} 
                            onClick={() => setSelectedQuarter(selectedQuarter === q ? null : q)}
                            className={`group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
                                selectedQuarter === q 
                                ? 'bg-rose-600/20 border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.2)]' 
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shadow-inner ${
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
                
                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {selectedQuarter ? `Fases ${selectedQuarter}` : "Próximas Entregas"}
                        </p>
                        {selectedQuarter && (
                             <button onClick={() => setSelectedQuarter(null)} className="text-[9px] text-rose-400 hover:underline">Limpar</button>
                        )}
                    </div>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-2 scrollbar-hide">
                        {filteredDeliveries.length > 0 ? filteredDeliveries.map((f: any, i: number) => (
                            <div key={i} className="flex justify-between items-start text-xs group hover:bg-white/5 p-1.5 rounded transition-colors gap-2">
                                <span className="text-slate-300 leading-tight">{f.name}</span>
                                <span className="text-rose-400 font-mono text-[10px] font-bold bg-rose-500/10 px-1.5 py-0.5 rounded shrink-0">{f.custom_timeline}</span>
                            </div>
                        )) : (
                            <span className="text-xs text-slate-600 italic">Nenhum marco para este período.</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* LINHA 3: ULTIMA REUNIAO + SLA POR PARCEIRO */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* ULTIMA REUNIAO */}
        <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                        <Gavel className="w-5 h-5 text-amber-600" /> Última Reunião
                    </CardTitle>
                    <Link href="/board/meetings" className="text-xs text-amber-600 hover:underline flex items-center gap-1">Sala de Reuniões <ArrowRight className="w-3 h-3" /></Link>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {lastMeeting ? (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">{lastMeeting.title || lastMeeting.context || 'Reunião'}</h3>
                            {lastMeeting.date && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {(() => { const [y,m,d] = lastMeeting.date.split('-'); return new Date(parseInt(y), parseInt(m)-1, parseInt(d)).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) })()}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-50 rounded-lg p-3 text-center">
                                <div className="text-xl font-black text-slate-800">{lastMeeting.general_decisions?.length || 0}</div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 flex items-center justify-center gap-1"><FileText className="w-2.5 h-2.5" /> Decisões</p>
                            </div>
                            <div className="bg-indigo-50 rounded-lg p-3 text-center">
                                <div className="text-xl font-black text-indigo-700">{lastMeeting.decisions?.length || 0}</div>
                                <p className="text-[9px] text-indigo-500 font-bold uppercase mt-0.5">Encaminhamentos</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                                <div className="text-xl font-black text-amber-700">{lastMeeting.radar?.length || 0}</div>
                                <p className="text-[9px] text-amber-500 font-bold uppercase mt-0.5 flex items-center justify-center gap-1"><RadarIcon className="w-2.5 h-2.5" /> Radar</p>
                            </div>
                        </div>
                        {lastMeeting.decisions?.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Encaminhamentos Recentes</p>
                                <div className="space-y-1.5">
                                    {lastMeeting.decisions.slice(0, 4).map((d: any, i: number) => (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${d.processed ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                            <span className="text-slate-600 leading-tight">{d.text}</span>
                                        </div>
                                    ))}
                                    {lastMeeting.decisions.length > 4 && (
                                        <p className="text-[10px] text-slate-400 pl-3.5">+{lastMeeting.decisions.length - 4} mais</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-6">Nenhuma reunião concluída encontrada.</p>
                )}
            </CardContent>
        </Card>

        {/* SLA POR PARCEIRO */}
        <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                            <Factory className="w-5 h-5 text-emerald-600" /> SLA por Parceiro
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">Demandas ativas de reuniões e operações.</CardDescription>
                    </div>
                    <Link href="/capacity" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">Ver SLA <ArrowRight className="w-3 h-3" /></Link>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {slaByProvider.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Nenhuma demanda SLA ativa.</p>
                ) : (
                    <div className="space-y-2">
                        {slaByProvider.map((p: any) => (
                            <div key={p.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-100">
                                        {p.active} {p.active === 1 ? 'demanda' : 'demandas'}
                                    </Badge>
                                    {p.overdue > 0 && (
                                        <Badge className="bg-red-50 text-red-600 border-red-100 text-[10px] font-bold">
                                            {p.overdue} {p.overdue === 1 ? 'atrasada' : 'atrasadas'}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 border-slate-200">
                        {kpis.activeProjectsCount} Projetos Ativos no Portfólio
                    </Badge>
                    <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 border-slate-200">
                        {nextDeliveries.length} Marcos Planejados
                    </Badge>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
