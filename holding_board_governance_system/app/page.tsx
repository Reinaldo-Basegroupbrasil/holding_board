import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  BarChart3, 
  Wallet, 
  TrendingUp, 
  Activity, 
  Users, 
  AlertTriangle, 
  ArrowUpRight,
  Layers,
  CalendarDays,
  Infinity 
} from 'lucide-react'

// FORÇA A PÁGINA A SER DINÂMICA (SEM CACHE) PARA DADOS EM TEMPO REAL
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function DashboardPage() {
  // 0. ANO DINÂMICO (PEGA AUTOMATICAMENTE DO SISTEMA)
  const currentYear = new Date().getFullYear()

  // 1. BUSCA DE DADOS (FILTRANDO O QUE JÁ FOI CONCLUÍDO)
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, investment_realized, monthly_cost, status, companies(name)')
    .is('parent_project_id', null) 
    .neq('status', 'COMPLETED') 

  const { data: phases } = await supabase
    .from('projects')
    .select('custom_timeline, status, name')
    .not('parent_project_id', 'is', null)
    .neq('status', 'COMPLETED')

  const { data: providers } = await supabase
    .from('providers')
    .select('id, name, capacity_slots, type')
    .order('type', { ascending: false })
    
  const { data: activeAllocations } = await supabase
    .from('projects')
    .select('provider_id, name, custom_timeline')
    .not('provider_id', 'is', null)
    .neq('status', 'COMPLETED')

  // 2. CÁLCULOS FINANCEIROS (KPIs)
  const totalCapex = projects?.reduce((acc, p) => acc + (p.investment_realized || 0), 0) || 0
  const totalMonthly = projects?.reduce((acc, p) => acc + (p.monthly_cost || 0), 0) || 0
  const activeProjectsCount = projects?.length || 0

  // 3. CÁLCULO DE OCUPAÇÃO (INTERNO = SLOTS / EXTERNO = FLEX)
  const providerStats = providers?.map(provider => {
    const allocations = activeAllocations?.filter(a => a.provider_id === provider.id) || []
    const occupied = allocations.length
    
    const isExternal = provider.type === 'EXTERNAL_PARTNER'
    
    // Se for externo, "livre" é 999 (infinito visualmente). Se interno, é a conta real.
    const free = isExternal ? 999 : Math.max(0, provider.capacity_slots - occupied)
    const isOverloaded = !isExternal && occupied > provider.capacity_slots
    
    return { ...provider, occupied, free, isOverloaded, allocations, isExternal }
  }) || []

  // 4. DISTRIBUIÇÃO POR QUARTER E PRÓXIMAS ENTREGAS
  const getQuarter = (month: string) => {
    if (!month) return 'Q4';
    const m = { "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12 }[month] || 0
    if (m <= 3) return "Q1"; if (m <= 6) return "Q2"; if (m <= 9) return "Q3"; return "Q4";
  }

  const quarterStats = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  const nextDeliveries: any[] = []

  phases?.forEach(f => {
    const month = f.custom_timeline?.split(" ")[0]
    if (month) {
        const q = getQuarter(month) as keyof typeof quarterStats
        if (quarterStats[q] !== undefined) quarterStats[q]++
        // Coleta apenas Q1 e Q2 para a lista de detalhes
        if (q === 'Q1' || q === 'Q2') nextDeliveries.push({ ...f, quarter: q })
    }
  })

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 tracking-tighter">
            <Activity className="w-8 h-8 text-rose-600" />
            Visão Executiva (Cockpit)
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Consolidado financeiro e saúde operacional das Squads.
          </p>
        </div>
        
        {/* Badge Dinâmico com o Ano Atual */}
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-1 px-3 bg-white border-slate-200 text-slate-500">
                Exercício {currentYear}
            </Badge>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sistema Operante</span>
            </div>
        </div>
      </div>

      {/* LINHA 1: CARDS DE KPI */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet className="w-24 h-24" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Capex Total (Investido)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-slate-900">${totalCapex.toLocaleString()}</div>
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
                <div className="text-3xl font-black text-slate-900">${totalMonthly.toLocaleString()}</div>
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
                <div className="text-3xl font-black text-slate-900">{phases?.length || 0} <span className="text-sm text-slate-400 font-medium">marcos</span></div>
                <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 border-slate-200">
                        {activeProjectsCount} Projetos Ativos
                    </Badge>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* COLUNA 1: MAPA DE CARGA (HÍBRIDO) */}
        <Card className="col-span-2 border-none shadow-sm bg-white">
            <CardHeader className="border-b border-slate-50 pb-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Mapa de Carga e Parceiros
                        </CardTitle>
                        <CardDescription className="text-xs">Monitoramento de ocupação interna e volume de externos.</CardDescription>
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
                                {provider.isOverloaded && (
                                    <div className="flex items-center gap-1 text-[9px] text-red-500 mt-1 font-bold animate-pulse">
                                        <AlertTriangle className="w-3 h-3" /> SOBRECARGA
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-900">
                                        {provider.occupied} {provider.isExternal ? 'Demandas' : 'Slots Ocupados'}
                                    </span>
                                    <div className="flex gap-1">
                                        {provider.allocations.slice(0, 3).map((a: any, i: number) => (
                                            <Badge key={i} variant="outline" className="text-[8px] px-1 h-4 border-slate-200 text-slate-500 max-w-[80px] truncate">
                                                {a.name}
                                            </Badge>
                                        ))}
                                        {provider.allocations.length > 3 && (
                                            <span className="text-[9px] text-slate-400">+{provider.allocations.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            
                            {/* COLUNA STATUS */}
                            <TableCell>
                                {provider.isExternal ? (
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">SOB DEMANDA</Badge>
                                ) : (
                                    provider.free > 0 ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]">OPERANTE</Badge>
                                    ) : (
                                        <Badge className="bg-red-50 text-red-700 border-red-100 text-[10px]">LOTADO</Badge>
                                    )
                                )}
                            </TableCell>

                            {/* COLUNA SLOTS */}
                            <TableCell className="text-right pr-6">
                                {provider.isExternal ? (
                                    <div className="flex justify-end items-center gap-1 opacity-50" title="Capacidade Flexível">
                                        <Infinity className="w-5 h-5 text-slate-400" />
                                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Flex</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-end items-center gap-1">
                                        <span className={`text-xl font-black ${provider.free > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                                            {provider.free}
                                        </span>
                                        <span className="text-[9px] text-slate-400 uppercase font-bold mt-1">Slots</span>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>

        {/* COLUNA 2: RADAR DE ENTREGAS (QUARTERS) */}
        <Card className="border-none shadow-sm bg-slate-900 text-white flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-rose-500" /> Radar Anual
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">Concentração de entregas por trimestre.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-4">
                <div className="space-y-3">
                    {Object.entries(quarterStats).map(([q, count]) => (
                        <div key={q} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-rose-500/30 transition-all cursor-default">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-inner ${
                                    q === 'Q1' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'
                                }`}>
                                    {q}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-200">
                                        {q === 'Q1' ? 'Jan-Mar' : q === 'Q2' ? 'Abr-Jun' : q === 'Q3' ? 'Jul-Set' : 'Out-Dez'}
                                    </div>
                                    {/* ANO DINÂMICO AQUI */}
                                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{currentYear}</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-white">{count}</span>
                                <span className="text-[8px] text-slate-500 uppercase">Entregas</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* LISTA DE PRÓXIMOS MARCOS */}
                <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Próximos Marcos (Q1/Q2)
                    </p>
                    <div className="space-y-2">
                        {nextDeliveries.slice(0, 4).map((f: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs group hover:bg-white/5 p-1 rounded transition-colors">
                                <span className="text-slate-300 truncate max-w-[150px]" title={f.name}>{f.name}</span>
                                <span className="text-rose-400 font-mono text-[10px] font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">{f.custom_timeline}</span>
                            </div>
                        ))}
                        {nextDeliveries.length === 0 && <span className="text-xs text-slate-600 italic">Sem entregas próximas planejadas.</span>}
                    </div>
                </div>

            </CardContent>
        </Card>
      </div>
    </div>
  )
}