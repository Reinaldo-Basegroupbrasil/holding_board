"use client"

import { Construction, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function ProposalsPage() {
  return (
    <div className="p-8 min-h-screen bg-slate-50 flex items-center justify-center">
      <Card className="w-full max-w-2xl p-12 text-center border-dashed border-2 border-slate-200 bg-white/50 shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-50 p-4 rounded-full">
            <Construction className="w-12 h-12 text-blue-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          Gestão de Propostas e Contratos
        </h1>
        
        <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
          Este módulo está em desenvolvimento. Em breve, você poderá gerenciar orçamentos, aprovar contratos e acompanhar pagamentos diretamente por aqui.
        </p>

        <div className="flex justify-center gap-4 text-xs text-slate-400 font-medium uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Controle Financeiro
          </span>
          <span className="w-px h-4 bg-slate-200"></span>
          <span>Aprovação de Fornecedores</span>
        </div>
      </Card>
    </div>
  )
}