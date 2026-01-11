import { createClient } from '@supabase/supabase-js'
import { PortfolioView } from "@/components/portfolio/portfolio-view"
import { getPhasesProgress } from "@/app/actions/notion-progress" // IMPORTA A ACTION

export const revalidate = 0
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function PortfolioPage() {
  
  // 1. BUSCA PROJETOS MACROS
  const { data: projectsRaw } = await supabase
    .from('projects')
    .select('*, companies(id, name)') 
    .is('parent_project_id', null)
    .order('created_at', { ascending: false })
  
  const projects = projectsRaw?.filter((p: any) => p.status !== 'ARCHIVED') || []
  
  // 2. BUSCA TODAS AS FASES (Milestones)
  const { data: milestonesRaw } = await supabase
    .from('projects')
    .select('*, providers(name)') 
    .not('parent_project_id', 'is', null)
  
  const filteredMilestones = milestonesRaw?.filter((m: any) => m.status !== 'ARCHIVED') || []

  // 🚀 MÁGICA DO NOTION: Busca o progresso real das fases
  const notionPageIds = filteredMilestones
    .map((m: any) => m.notion_page_id)
    .filter(Boolean);

  const progressData = await getPhasesProgress(notionPageIds);

  // Injeta o progresso do Notion dentro de cada milestone
  const milestones = filteredMilestones.map((m: any) => ({
    ...m,
    progress: progressData[m.notion_page_id] || 0
  }));
  
  // 3. Busca Dados Auxiliares
  const { data: companies } = await supabase.from('companies').select('*').order('name')
  const { data: providers } = await supabase.from('providers').select('*').order('name')

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900">
      <PortfolioView 
        projects={projects} 
        milestones={milestones} // Aqui já vão as fases com o percentual real!
        companies={companies || []}
        providers={providers || []}
      />
    </div>
  )
}