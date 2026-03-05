import { createClient, getUserProfile } from '@/lib/supabase-server'
import { AgendaClient } from "@/components/board/agenda-client"

export const dynamic = 'force-dynamic'

function normalize(str: string) { 
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() 
}

export default async function MinhasDemandasPage() {
  const supabase = await createClient()
  const profile = await getUserProfile()
  
  const userEmail = profile?.email || ""
  const rawName = (await supabase.auth.getUser()).data.user?.user_metadata?.full_name || userEmail.split('@')[0]
  const userName = rawName.replace('.', ' ').replace(/\b\w/g, (l:string) => l.toUpperCase())

  const isAdmin = profile?.role === 'admin'

  const { data: providers } = await supabase.from('providers').select('id, name, email').order('name', { ascending: true })
  const { data: companies } = await supabase.from('companies').select('id, name').order('name', { ascending: true })
  
  let myProvider: any = null
  if (profile?.providerId) {
    myProvider = providers?.find(p => p.id === profile.providerId)
  }
  if (!myProvider) {
    myProvider = providers?.find(p => p.email && p.email.toLowerCase() === userEmail.toLowerCase())
  }
  if (!myProvider) {
    const emailKey = normalize(userEmail.split('@')[0])
    myProvider = providers?.find(p => normalize(p.name).includes(emailKey))
  }

  const { data: allTasks } = await supabase
    .from('board_tasks')
    .select(`*, providers(name)`)
    .order('created_at', { ascending: false })

  const { data: personalTasksData } = await supabase
    .from('personal_tasks')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })

  const formattedPersonalTasks = personalTasksData?.map(t => ({
      id: t.id,
      text: t.title,
      context: t.context,
      done: t.done,
      doneAt: t.done_at,
      recurrence: t.recurrence,
      targetDate: t.due_date,
      important: t.important || false
  })) || []

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
      </div>
      
      <AgendaClient 
        tasks={visibleTasks} 
        initialPersonalTasks={formattedPersonalTasks}
        userName={userName} 
        currentProviderId={myProvider?.id} 
        isAdmin={isAdmin} 
        providers={providers || []} 
        companies={companies || []} 
      />
    </div>
  )
}