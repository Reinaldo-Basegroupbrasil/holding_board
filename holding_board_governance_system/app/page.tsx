import { createClient } from '@supabase/supabase-js'
import { Activity } from 'lucide-react'
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

  // 1. BUSCA PARCEIROS
  const { data: providers } = await supabase
    .from('providers')
    .select('id, name, capacity_slots, type')
    .order('type', { ascending: false })

  // 2. BUSCA PROJETOS E FASES (Tudo junto)
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name, provider_id, investment_realized, monthly_cost, status, custom_timeline, parent_project_id, companies(name)')
    
  // 3. BUSCA TAREFAS
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('id, title, provider_id, status')

  // --- FILTRAGEM INTELIGENTE ---

  // A. Projetos Raiz (Pais) -> Para Financeiro e Contagem de "Projetos Ativos"
  const rootProjects = allProjects?.filter(p => 
    p.parent_project_id === null &&
    !['COMPLETED', 'ARCHIVED', 'concluido', 'cancelado'].includes(p.status)
  ) || []

  // B. Marcos/Fases (Filhos) -> Para o Radar de Entregas
  // Consideramos marcos apenas itens QUE TÊM PAI (parent_project_id não nulo)
  const milestones = allProjects?.filter(p => 
    p.parent_project_id !== null && // Só filhos
    p.custom_timeline && // Tem data
    !['COMPLETED', 'ARCHIVED'].includes(p.status)
  ) || []

  // C. Tarefas Ativas -> Para Carga de Trabalho
  const activeTasks = allTasks?.filter(t => 
    !['concluido', 'concluida', 'done'].includes(t.status) &&
    t.provider_id !== null
  ) || []

  // --- CÁLCULOS KPIS ---
  const totalCapex = rootProjects.reduce((acc, p) => acc + (Number(p.investment_realized) || 0), 0)
  const totalMonthly = rootProjects.reduce((acc, p) => acc + (Number(p.monthly_cost) || 0), 0)
  
  const activeProjectsCount = rootProjects.length
  const activeTasksCount = activeTasks.length

  // --- MAPA DE CARGA ---
  // Soma Projetos Raiz + Marcos Isolados + Tarefas
  const providerStats = providers?.map(provider => {
    // Conta tudo que está vinculado a este provedor (Pai ou Filho)
    const myProjects = allProjects?.filter(p => 
        p.provider_id === provider.id && 
        !['COMPLETED', 'ARCHIVED'].includes(p.status)
    ) || []
    
    const myTasks = activeTasks.filter(t => t.provider_id === provider.id)
    const occupied = myProjects.length + myTasks.length
    
    const isExternal = provider.type && provider.type.includes('EXTERNAL')
    const totalSlots = provider.capacity_slots || 0
    const free = isExternal ? 999 : Math.max(0, totalSlots - occupied)
    const isOverloaded = !isExternal && occupied > totalSlots
    
    return { ...provider, occupied, free, isOverloaded, allocations: myProjects, taskCount: myTasks.length, isExternal }
  }) || []

  // --- RADAR ANUAL (Baseado apenas em MARCOS/FASES) ---
  const getQuarter = (month: string) => {
    if (!month) return 'Q4';
    const cleanMonth = month.split(/[\s-]/)[0].trim(); 
    const m = { "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12 }[cleanMonth] || 0
    if (m <= 3) return "Q1"; if (m <= 6) return "Q2"; if (m <= 9) return "Q3"; return "Q4";
  }

  const quarterStats = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  const nextDeliveries: any[] = []

  milestones.forEach(p => { // Loop apenas nos marcos filhos
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