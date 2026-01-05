"use client"

import { Briefcase, Calendar } from "lucide-react"
import { DemandActions } from "./demand-actions"

/**
 * Interface para suporte à atualização otimista.
 * Resolve o erro 'Property onOptimisticAction does not exist'.
 */
interface DemandCardProps {
  project: any;
  onOptimisticAction?: (taskId: string, type: 'delete' | 'complete') => void;
}

export function DemandCard({ project, onOptimisticAction }: DemandCardProps) {
  // Verificação para garantir que o nome da empresa seja exibido 
  // mesmo antes do refresh completo do banco de dados.
  const companyName = project.companies?.name || project.company_name || "Demanda Avulsa";

  return (
    <div className="group relative bg-white border border-slate-100 rounded-lg p-3 hover:border-indigo-200 hover:shadow-sm transition-all animate-in fade-in duration-300">
      <div className="flex justify-between items-start mb-2">
        <div className="space-y-1 pr-8"> 
          <h4 className="text-xs font-bold text-slate-700 leading-tight line-clamp-2">
            {project.name || project.title}
          </h4>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <Briefcase className="w-3 h-3" />
            <span className="truncate max-w-[150px]">
              {companyName}
            </span>
          </div>
        </div>
        
        {/* Ações visíveis ao passar o mouse via classe 'group' */}
        <div className="absolute top-3 right-2">
          <DemandActions 
            project={project} 
            onOptimisticAction={onOptimisticAction} 
          />
        </div>
      </div>

      <div className="space-y-2 mt-3 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-md">
          <Calendar className="w-3 h-3 text-indigo-500" />
          <span className="text-[10px] font-bold text-slate-600">
            {project.custom_timeline || project.due_date || "Slot não definido"}
          </span>
        </div>
        
        {project.next_milestone && (
          <div className="flex items-start gap-1.5 px-1">
            <div className="mt-1 w-1 h-1 rounded-full bg-slate-300" />
            <p className="text-[10px] text-slate-500 italic line-clamp-1">
              {project.next_milestone}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}