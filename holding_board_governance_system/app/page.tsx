import { createClient } from '@supabase/supabase-js'
import { Activity, BadgeCheck } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function DashboardPage() {
  const currentYear = new Date().getFullYear()

  // BUSCA DE DADOS
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, investment_realized, monthly_cost, status, companies(name)')
    .is('parent_project_id', null) 
    .neq('status', 'ARCHIVED') // Mudado para ARCHIVED para manter os COMPLETED no histórico se quiser

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

  // CÁLCULOS
  const totalCapex = projects?.reduce((acc, p) => acc + (p.investment_realized || 0), 0) || 0
  const totalMonthly = projects?.reduce((acc, p) => acc + (p.monthly_cost || 0), 0) || 0
  const activeProjectsCount = projects?.filter(p => p.status !== 'COMPLETED').length || 0

  const providerStats = providers?.map(provider => {
    const allocations = activeAllocations?.filter(a => a.provider_id === provider.id) || []
    const occupied = allocations.length
    const isExternal = provider.type === 'EXTERNAL_PARTNER'
    const free = isExternal ? 999 : Math.max(0, provider.capacity_slots - occupied)
    const isOverloaded = !isExternal && occupied > provider.capacity_slots
    return { ...provider, occupied, free, isOverloaded, allocations, isExternal }
  }) || []

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
        nextDeliveries.push({ ...f, quarter: q })
    }
  })

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      
      {/* HEADER ORIGINAL */}
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

      {/* COMPONENTE INTERATIVO */}
      <DashboardClient 
        currentYear={currentYear}
        quarterStats={quarterStats}
        providerStats={providerStats}
        nextDeliveries={nextDeliveries}
        kpis={{ totalCapex, totalMonthly, activeProjectsCount }}
      />
    </div>
  )
}