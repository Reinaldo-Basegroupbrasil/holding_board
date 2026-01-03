import { createClient } from '@supabase/supabase-js'
import { NewThesisBtn } from "@/components/forge/new-thesis-btn"
import { ThesisCard } from "@/components/forge/thesis-card" 
import { FlaskConical } from 'lucide-react'

// Conexão
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
export const dynamic = 'force-dynamic'

export default async function ForgePage() {
  
  // Busca as teses ordenadas por data
  const { data: theses, error } = await supabase
    .from('theses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Erro Supabase:", error.message)
  }

  return (
    <div className="p-8 space-y-6 min-h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Header com o Botão de Nova Tese */}
      <div className="flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-8 h-8 text-emerald-600" />
                The Forge (R&D)
            </h1>
            <p className="text-slate-500">Laboratório de teses e validação de novos negócios.</p>
        </div>
        <NewThesisBtn />
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {theses?.map((thesis: any) => (
            // O Card Inteligente (que abre a gaveta lateral)
            <ThesisCard key={thesis.id} thesis={thesis} />
        ))}

        {/* Estado Vazio */}
        {theses?.length === 0 && (
            <div className="col-span-full text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-slate-500 mb-4">O laboratório está vazio.</p>
                <div className="inline-block">
                    <NewThesisBtn />
                </div>
            </div>
        )}
      </div>
    </div>
  )
}