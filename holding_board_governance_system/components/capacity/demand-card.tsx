"use client"

import { Calendar, Building2, Flag, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DemandActions } from "./demand-actions" // Importando o botão de editar que arrumamos antes

export function DemandCard({ project }: { project: any }) {
  
  // Lógica para decidir se mostra Timeline (Janeiro W1) ou Data (25/03/2024)
  const isInternal = !!project.custom_timeline
  
  // Formatação de data para Externos
  const formatDate = (dateString: string) => {
    if (!dateString) return "Sem data"
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Verifica status de prazo
  const getStatusColor = () => {
    if (project.status === 'COMPLETED') return 'bg-emerald-50 border-emerald-200'
    if (project.status === 'DELAYED') return 'bg-red-50 border-red-200'
    return 'bg-white border-slate-200'
  }

  return (
    <div className={`p-3 rounded-lg border shadow-sm group transition-all hover:shadow-md ${getStatusColor()}`}>
      
      {/* CABEÇALHO: Nome e Ações */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div>
            {/* Nome da Demanda */}
            <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
                {project.name}
            </h4>
            
            {/* Nome da Empresa (Que estava faltando) */}
            {project.companies && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                    <Building2 className="w-3 h-3" />
                    {project.companies.name}
                </div>
            )}
        </div>

        {/* Botões de Editar/Excluir */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DemandActions project={project} />
        </div>
      </div>

      {/* CORPO: Prazos e Entregáveis */}
      <div className="space-y-2 mt-3 pt-2 border-t border-slate-100/50">
        
        {/* DATA / TIMELINE */}
        <div className="flex items-center gap-2 text-xs">
            <Calendar className={`w-3.5 h-3.5 ${isInternal ? 'text-indigo-500' : 'text-orange-500'}`} />
            {isInternal ? (
                <span className="font-semibold text-slate-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100">
                    {project.custom_timeline}
                </span>
            ) : (
                <span className="font-semibold text-slate-700 bg-orange-50 px-1.5 py-0.5 rounded text-[10px] border border-orange-100">
                    Deadline: {formatDate(project.milestone_date)}
                </span>
            )}
        </div>

        {/* ENTREGÁVEL */}
        {project.next_milestone && (
            <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded">
                <Flag className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <span className="leading-tight">{project.next_milestone}</span>
            </div>
        )}

      </div>
    </div>
  )
}