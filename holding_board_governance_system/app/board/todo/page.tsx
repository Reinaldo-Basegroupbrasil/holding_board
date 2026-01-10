import { createClient } from '@/lib/supabase-server'
import { AgendaClient } from "@/components/board/agenda-client"
import { NewBoardTaskBtn } from "@/components/board/new-task-btn"

export const dynamic = 'force-dynamic'

function normalize(str: string) { 
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() 
}

export default async function MinhasDemandasPage() {
  const supabase = await createClient()
  
  // 1. Identificação
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email || ""
  const rawName = user?.user_metadata?.full_name || userEmail.split('@')[0]
  const userName = rawName.replace('.', ' ').replace(/\b\w/g, (l:string) => l.toUpperCase())

  // 2. BUSCA DADOS DE APOIO
  const { data: providers } = await supabase.from('providers').select('id, name, email').order('name', { ascending: true })
  const { data: companies } = await supabase.from('companies').select('id, name').order('name', { ascending: true })
  
  // 3. Identificação do Provider (Lógica Híbrida)
  let myProvider = providers?.find(p => p.email && p.email.toLowerCase() === userEmail.toLowerCase())
  if (!myProvider) {
      const emailKey = normalize(userEmail.split('@')[0])
      myProvider = providers?.find(p => normalize(p.name).includes(emailKey))
  }

  const admins = ["reinaldo", "armando", "admin"]
  const isAdmin = admins.some(key => userEmail.toLowerCase().includes(key))

  // 4. BUSCA DE DEMANDAS (HOLDING)
  const { data: allTasks } = await supabase
    .from('board_tasks')
    .select(`*, providers(name)`)
    .order('created_at', { ascending: false })

  // 5. BUSCA DE TAREFAS PESSOAIS (NOVO!)
  // Busca apenas as tarefas que pertencem ao email do usuário logado
  const { data: personalTasksData } = await supabase
    .from('personal_tasks')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })

  // Adaptação dos dados do banco para o formato que o componente espera
  const formattedPersonalTasks = personalTasksData?.map(t => ({
      id: t.id,
      text: t.title,
      context: t.context,
      done: t.done,
      doneAt: t.done_at,
      recurrence: t.recurrence,
      targetDate: t.due_date
  })) || []

  // 6. Filtragem das Demandas da Holding (Visual)
  const visibleTasks = allTasks?.filter((t: any) => {
      if (isAdmin) return true 
      if (myProvider && t.provider_id === myProvider.id) return true
      if (t.requestor === userName) return true
      return false
  }) || []

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative">
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-end">
         <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Minhas Demandas</h1>
            <p className="text-slate-500">Central de Pendências e Entregas Rápidas.</p>
            {!isAdmin && !myProvider && <div className="bg-red-100 text-red-700 text-xs p-2 mt-2 rounded">ERRO: Seu usuário ({userEmail}) não está vinculado a um Provider.</div>}
         </div>
         <NewBoardTaskBtn providers={providers || []} currentUser={userName} />
      </div>
      
      <AgendaClient 
        tasks={visibleTasks} 
        initialPersonalTasks={formattedPersonalTasks} // <--- PASSANDO OS DADOS REAIS
        userName={userName} 
        currentProviderId={myProvider?.id} 
        isAdmin={isAdmin} 
        providers={providers || []} 
        companies={companies || []} 
      />
    </div>
  )
}