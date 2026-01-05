import { createClient } from '@/lib/supabase-server' // Usamos a lib segura que criamos
import { CapacityView } from '@/components/capacity/capacity-view'
import { Cpu } from 'lucide-react'
import { AdminOnly } from '@/components/admin-only'
import { ProviderModal } from "@/components/capacity/new-provider-btn"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CapacityPage() {
  const supabase = await createClient()

  // 1. Buscas de Dados (Idêntico ao seu código original, mas seguro)
  const { data: providers } = await supabase.from('providers').select('*').order('name')
  
  const { data: activeProjects } = await supabase
    .from('projects')
    .select(`
        id, 
        name, 
        provider_id, 
        status, 
        next_milestone, 
        milestone_date, 
        custom_timeline, 
        parent_project_id,
        companies ( name )
    `)
    .neq('status', 'COMPLETED')
    .not('provider_id', 'is', null)

  // 2. NOVIDADE: Buscamos também as TAREFAS (Demandas de Reunião/Manuais)
  // Sem isso, você não vê nem edita o que vem das reuniões.
  const { data: activeTasks } = await supabase
    .from('tasks')
    .select('*')
    .neq('status', 'concluido')
    .order('id', { ascending: false })

  const { data: companies } = await supabase.from('companies').select('id, name').order('name')

  // 3. Entregamos tudo para o componente visual interativo
  return (
    <CapacityView 
        providers={providers || []}
        initialProjects={activeProjects || []} // Seus projetos
        initialTasks={activeTasks || []}       // Suas tarefas (editáveis)
        companies={companies || []}
    />
  )
}