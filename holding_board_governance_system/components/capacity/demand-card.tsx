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
  userRole?: string;
}

export function DemandCard({ project, onOptimisticAction, userRole }: DemandCardProps) {
  const companyName = project.companies?.name || project.company_name || "Demanda Avulsa";
  const projectName = project.project_name;
  const contextLine = projectName ? `${companyName} · ${projectName}` : companyName;
  const hasTimeline = !!(project.custom_timeline || project.due_date)

  return (
    <div className="group relative bg-white border border-slate-100 rounded-lg p-3 hover:border-indigo-200 hover:shadow-sm transition-all animate-in fade-in duration-300">
      <div className="flex justify-between items-start mb-2">
        <div className="space-y-1.5 pr-8 flex-1"> 
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${hasTimeline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <h4 className="text-xs font-bold text-slate-700 leading-tight line-clamp-3">
              {project.name || project.title}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pl-4">
            <Briefcase className="w-3 h-3" />
            <span className="truncate max-w-[180px]">
              {contextLine}
            </span>
          </div>
        </div>
        
        <div className="absolute top-3 right-2">
          <DemandActions 
            project={project} 
            onOptimisticAction={onOptimisticAction}
            userRole={userRole}
          />
        </div>
      </div>

      <div className="space-y-2 mt-3 pt-3 border-t border-slate-50">
        <div className={`flex items-center gap-2 p-1.5 rounded-md ${hasTimeline ? 'bg-indigo-50' : 'bg-amber-50'}`}>
          <Calendar className={`w-3 h-3 ${hasTimeline ? 'text-indigo-500' : 'text-amber-500'}`} />
          <span className={`text-[10px] font-bold ${hasTimeline ? 'text-indigo-600' : 'text-amber-600'}`}>
            {project.custom_timeline || project.due_date || "Previsão não definida"}
          </span>
        </div>
        
        {project.next_milestone && (
          <div className="flex items-start gap-1.5 px-1">
            <div className="mt-1 w-1 h-1 rounded-full bg-slate-300" />
            <p className="text-[10px] text-slate-500 italic line-clamp-2">
              {project.next_milestone}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}