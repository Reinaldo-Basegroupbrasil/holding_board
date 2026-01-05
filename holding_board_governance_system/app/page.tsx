import { createClient } from '@/lib/supabase-server' // Cliente autenticado (Cookies)
import { Activity } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

// Garante que a página seja renderizada no servidor a cada request (sem cache velho)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  // Inicializa o cliente com as credenciais do usuário logado (Admin)
  const supabase = await createClient()
  
  const currentYear = new Date().getFullYear()

  // 1. BUSCA DADOS BRUTOS (Respeitando RLS)
  const { data: providers } = await supabase
    .from('providers')
    .select('id, name, capacity_slots, type')
    .order('type', { ascending: false })

  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name, provider_id, investment_realized, monthly_cost, status, custom_timeline, parent_project_id, companies(name)')
    
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('id, title, provider_id, status')

  // --- FILTRAGEM INTELIGENTE ---

  // A. Projetos Raiz (Pais) -> Apenas para KPIs Financeiros
  const rootProjects = allProjects?.filter(p => 
    p.parent_project_id === null &&
    !['completed', 'archived', 'concluido', 'cancelado'].includes(String(p.status).toLowerCase())
  ) || []

  // B. Marcos/Fases (Filhos) -> Para o Radar de Entregas
  const milestones = allProjects?.filter(p => 
    p.parent_project_id !== null && 
    p.custom_timeline && 
    !['completed', 'archived', 'concluido'].includes(String(p.status).toLowerCase())
  ) || []

  // C. Tarefas Ativas -> Para somar à carga de trabalho
  const activeTasks = allTasks?.filter(t => 
    t.provider_id !== null && 
    (t.status === null || !['concluido', 'concluida', 'done'].includes(String(t.status).toLowerCase()))
  ) || []

  // --- CÁLCULOS KPIS ---
  const totalCapex = rootProjects.reduce((acc, p) => acc + (Number(p.investment_realized) || 0), 0)
  const totalMonthly = rootProjects.reduce((acc, p) => acc + (Number(p.monthly_cost) || 0), 0)
  
  const activeProjectsCount = rootProjects.length
  const activeTasksCount = activeTasks.length

  // --- MAPA DE CARGA (SOMA HÍBRIDA: PROJETOS + TAREFAS) ---
  const providerStats = providers?.map(provider => {
    // 1. Filtra Fases de Projetos vinculadas a este fornecedor
    // (Usa String() para garantir que UUIDs batam mesmo se o formato diferir ligeiramente)
    const myProjects = allProjects?.filter(p => 
        String(p.provider_id) === String(provider.id) && 
        !['completed', 'archived', 'concluido', 'cancelado'].includes(String(p.status).toLowerCase())
    ) || []
    
    // 2. Filtra Tarefas Avulsas/Reuniões vinculadas a este fornecedor
    const myTasks = activeTasks.filter(t => String(t.provider_id) === String(provider.id)) 
    
    // 3. SOMA REAL: Garante que visualizemos TUDO o que ocupa o parceiro
    const occupied = myProjects.length + myTasks.length 
    
    const totalSlots = provider.capacity_slots || 0
    const isExternal = provider.type && provider.type.includes('EXTERNAL')
    
    // LÓGICA DE SOBRECARGA E DISPONIBILIDADE
    const isOverloaded = !isExternal && occupied > totalSlots
    const free = isExternal ? 999 : Math.max(0, totalSlots - occupied)

    // Unifica nomes para os badges no Mapa de Carga
    const activeAllocations = [
      ...myProjects.map(p => p.name),
      ...myTasks.map(t => t.title)
    ]
    
    return { 
      ...provider, 
      occupied, 
      free, 
      isOverloaded, 
      activeAllocations, 
      isExternal 
    }
  }) || []

  // --- LÓGICA DO RADAR ANUAL ---
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
          <p className="text-slate-500 mt-1 text-sm font-medium">Consolidado financeiro e saúde operacional das Squads.</p>
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