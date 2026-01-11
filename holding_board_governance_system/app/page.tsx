import { createClient } from '@/lib/supabase-server'
import { Activity } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const currentYear = new Date().getFullYear()

  // 1. BUSCA DADOS BRUTOS
  const { data: providers } = await supabase
    .from('providers')
    .select('id, name, capacity_slots, type')
    .neq('type', 'HIDDEN')
    .neq('type', 'EXECUTIVE')
    .order('type', { ascending: false })

  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name, provider_id, investment_realized, monthly_cost, status, custom_timeline, parent_project_id, companies(name)')
    
  // Agora buscamos board_tasks para somar à carga de trabalho corretamente
  const { data: allTasks } = await supabase
    .from('board_tasks')
    .select('id, title, provider_id, status')

  // --- FILTRAGEM ---

  // A. Projetos Raiz (Financeiro)
  const rootProjects = allProjects?.filter(p => 
    p.parent_project_id === null &&
    !['completed', 'archived', 'concluido', 'cancelado'].includes(String(p.status).toLowerCase())
  ) || []

  // B. Marcos/Fases (Radar)
  const milestones = allProjects?.filter(p => 
    p.parent_project_id !== null && 
    p.custom_timeline && 
    !['completed', 'archived', 'concluido'].includes(String(p.status).toLowerCase())
  ) || []

  // C. Tarefas Ativas (Carga)
  const activeTasks = allTasks?.filter(t => 
    t.provider_id !== null && 
    (t.status === 'pendente' || t.status === 'em_andamento')
  ) || []

  // --- CÁLCULOS KPIS ---
  const totalCapex = rootProjects.reduce((acc, p) => acc + (Number(p.investment_realized) || 0), 0)
  const totalMonthly = rootProjects.reduce((acc, p) => acc + (Number(p.monthly_cost) || 0), 0)
  
  const activeProjectsCount = rootProjects.length
  const activeTasksCount = activeTasks.length

  // --- MAPA DE CARGA ---
  const providerStats = providers?.map(provider => {
    // Projetos do provider
    const myProjects = allProjects?.filter(p => 
        String(p.provider_id) === String(provider.id) && 
        !['completed', 'archived', 'concluido', 'cancelado'].includes(String(p.status).toLowerCase())
    ) || []
    
    // Tarefas do provider
    const myTasks = activeTasks.filter(t => String(t.provider_id) === String(provider.id)) 
    
    const occupied = myProjects.length + myTasks.length 
    
    const totalSlots = provider.capacity_slots || 0
    const isExternal = provider.type && provider.type.includes('EXTERNAL')
    
    const isOverloaded = !isExternal && totalSlots > 0 && occupied >= totalSlots
    const free = isExternal ? 999 : Math.max(0, totalSlots - occupied)

    const activeAllocations: any[] = []
    
    return { 
      ...provider, 
      occupied, 
      free, 
      isOverloaded, 
      activeAllocations, 
      isExternal 
    }
  }) || []

  // --- RADAR ANUAL ---
  const getQuarter = (month: string) => {
    if (!month) return 'Q4';
    const cleanMonth = month.split(/[\s-]/)[0].trim(); 
    const m = { "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12 }[cleanMonth] || 0
    if (m <= 3) return "Q1"; if (m <= 6) return "Q2"; if (m <= 9) return "Q3"; return "Q4";
  }

  const quarterStats = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  const nextDeliveries: any[] = []

  milestones.forEach(p => { 
    if (p.custom_timeline) {
        const q = getQuarter(p.custom_timeline) as keyof typeof quarterStats
        quarterStats[q]++
        nextDeliveries.push({ ...p, quarter: q })
    }
  })

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 tracking-tighter">
            <Activity className="w-8 h-8 text-rose-600" />
            Visão Executiva (Cockpit)
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Consolidado financeiro e saúde operacional das Equipes.</p>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-1 px-3 bg-white border-slate-200 text-slate-500">Exercício {currentYear}</Badge>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Monitoramento Ativo</span>
            </div>
        </div>
      </div>

      <DashboardClient 
        currentYear={currentYear}
        quarterStats={quarterStats}
        providerStats={providerStats}
        nextDeliveries={nextDeliveries}
        kpis={{ totalCapex, totalMonthly, activeProjectsCount, activeTasksCount }}
      />
    </div>
  )
}