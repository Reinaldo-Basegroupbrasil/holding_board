import { createClient, getUserProfile } from '@/lib/supabase-server'
import { CapacityView } from '@/components/capacity/capacity-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CapacityPage() {
  const supabase = await createClient()
  const profile = await getUserProfile()

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

  const { data: activeTasks } = await supabase
    .from('tasks')
    .select('*')
    .neq('status', 'concluido')
    .order('id', { ascending: false })

  const { data: companies } = await supabase.from('companies').select('id, name').order('name')

  return (
    <CapacityView 
        providers={providers || []}
        initialProjects={activeProjects || []}
        initialTasks={activeTasks || []}
        companies={companies || []}
        userRole={profile?.role || 'partner'}
        userProviderId={profile?.providerId || null}
    />
  )
}