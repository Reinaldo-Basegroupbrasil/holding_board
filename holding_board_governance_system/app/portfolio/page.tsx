import { createClient } from '@supabase/supabase-js'
import { PortfolioView } from "@/components/portfolio/portfolio-view"

export const revalidate = 0
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function PortfolioPage() {
  
  // 1. BUSCA PROJETOS MACROS
  // CORREÇÃO: Removemos o .neq('status', 'ARCHIVED') do SQL para evitar que projetos com status NULL sumam.
  const { data: projectsRaw } = await supabase
    .from('projects')
    .select('*, companies(id, name)') 
    .is('parent_project_id', null)
    .order('created_at', { ascending: false })
  
  // Filtramos aqui no código. Se for NULL ou qualquer coisa diferente de 'ARCHIVED', mostramos.
  const projects = projectsRaw?.filter((p: any) => p.status !== 'ARCHIVED') || []
  
  // 2. BUSCA TODAS AS FASES (Milestones)
  // Mesma correção aqui para as fases não sumirem
  const { data: milestonesRaw } = await supabase
    .from('projects')
    .select('*, providers(name)') 
    .not('parent_project_id', 'is', null)
  
  const milestones = milestonesRaw?.filter((m: any) => m.status !== 'ARCHIVED') || []
  
  // 3. Busca Dados Auxiliares
  const { data: companies } = await supabase.from('companies').select('*').order('name')
  const { data: providers } = await supabase.from('providers').select('*').order('name')

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900">
      <PortfolioView 
        projects={projects} 
        milestones={milestones} 
        companies={companies || []}
        providers={providers || []}
      />
    </div>
  )
}