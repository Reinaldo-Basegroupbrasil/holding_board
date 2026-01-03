"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { AddCompanyModal } from "./add-company-modal"

// 1. Adicionamos 'onUpdate' na interface
interface CompanyActionsProps {
    company: any;
    allCompanies: any[];
    onUpdate?: () => void; // Função gatilho
}

export function CompanyActions({ company, allCompanies, onUpdate }: CompanyActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${company.name}"?`)) return
    
    setLoading(true)
    const { error } = await supabase.from('companies').delete().eq('id', company.id)
    setLoading(false)
    
    if (error) {
        alert("Erro ao excluir: " + error.message)
    } else {
        // 2. SE DEU CERTO, AVISA O PAI PARA RECARREGAR A TELA
        if (onUpdate) {
            onUpdate()
        } else {
            router.refresh()
        }
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Passamos o onUpdate também para o modal de editar (opcional, mas bom pra garantir) */}
      {/* Nota: O AddCompanyModal precisaria ser ajustado para aceitar onUpdate também se quisermos atualização instantânea na edição do nome da empresa, mas focaremos no Delete agora */}
      <AddCompanyModal companyToEdit={company} existingCompanies={allCompanies || []} />
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleDelete} 
        disabled={loading}
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
        title="Excluir Empresa"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}