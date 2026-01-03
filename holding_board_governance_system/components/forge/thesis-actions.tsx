"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"

interface ThesisActionsProps {
    id: string
    title: string
    capex: number
}

export function ThesisActions({ id, title, capex }: ThesisActionsProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleKill = async () => {
        if(!confirm("Tem certeza que deseja arquivar esta tese?")) return
        setLoading(true)
        
        // Apenas marca como REJEITADA
        await supabase.from('theses').update({ status: 'REJECTED' }).eq('id', id)
        
        setLoading(false)
        router.refresh()
    }

    const handleApprove = async () => {
        if(!confirm(`Aprovar "${title}" e criar projeto no Portfólio?`)) return
        setLoading(true)
        
        // 1. Atualiza status da Tese
        const { error: errTese } = await supabase.from('theses').update({ status: 'APPROVED' }).eq('id', id)
        if (errTese) { alert("Erro ao aprovar"); setLoading(false); return; }

        // 2. MAGIA: Cria o Projeto automaticamente 🚀
        // (No MVP, pegamos a primeira empresa disponível para associar)
        const { data: company } = await supabase.from('companies').select('id').limit(1).single()
        
        if (company) {
            await supabase.from('projects').insert({
                company_id: company.id,
                name: title, // Mesmo nome da tese
                status: 'ON_TRACK',
                phase: 'IDEA', // Começa na fase de Ideação
                investment_realized: 0,
                potential_revenue: capex * 5, // Projeção automática de 5x ROI (exemplo)
                health_score: 'G'
            })
        }

        setLoading(false)
        router.refresh()
        // Opcional: router.push('/portfolio') para levar o usuário lá
    }

    return (
        <div className="flex gap-2 w-full pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
             <Button onClick={handleKill} disabled={loading} variant="outline" className="flex-1 border-red-200 hover:bg-red-50 text-red-700 hover:text-red-800">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-2" /> Kill</>}
            </Button>
            <Button onClick={handleApprove} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" /> Aprovar</>}
            </Button>
        </div>
    )
}