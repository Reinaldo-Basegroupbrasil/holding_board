"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Briefcase, AlertCircle, Users, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import { ProviderSettings } from "@/components/capacity/provider-settings" 
import { ProviderModal } from "@/components/capacity/new-provider-btn" 
import { AddDemandBtn } from "@/components/capacity/add-demand-btn" 
import { DemandCard } from "@/components/capacity/demand-card" 
import { AdminOnly, RoleGate } from "@/components/admin-only" 
import { DemandActions } from "./demand-actions"

interface CapacityViewProps {
  providers: any[]
  initialProjects: any[] 
  companies: any[]
  initialTasks: any[]
  userRole: string
  userProviderId: string | null
}

export function CapacityView({ providers, initialProjects, companies, initialTasks, userRole, userProviderId }: CapacityViewProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [projects, setProjects] = useState(initialProjects)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Sincroniza o estado quando os dados do servidor mudarem
  useEffect(() => {
    setTasks(initialTasks)
    setProjects(initialProjects)
  }, [initialTasks, initialProjects])

  /**
   * 1. Ação Otimista (Concluir/Excluir)
   */
  const handleOptimisticAction = (taskId: string, type: 'delete' | 'complete') => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setProjects(prev => prev.filter(p => p.id !== taskId))
  }

  /**
   * 2. Cadastro Instantâneo (onSuccess)
   * Adiciona a tarefa ao estado local para aparecer sem F5.
   */
  const handleNewTask = (newTask: any) => {
    setTasks(prev => [...prev, {
      ...newTask,
      id: newTask.id || Math.random().toString(), 
      companies: companies.find(c => c.id === newTask.company_id) || { name: "Demanda Avulsa" }
    }])
  }

  const renderProviderCard = (provider: any) => {
    const isInternal = provider.type === 'INTERNAL_SQUAD' || provider.type?.includes('INTERNAL')

    const myProjects = projects.filter((p: any) => p.provider_id === provider.id)
    const myTasks = tasks.filter((t: any) => t.provider_id === provider.id)
    
    const backlog = myTasks.filter((t: any) => !t.due_date)
    const scheduledTasks = myTasks.filter((t: any) => t.due_date)

    const mainList = [
        ...myProjects, 
        ...scheduledTasks.map((t: any) => ({
            ...t,
            name: t.title,
            custom_timeline: t.due_date, 
            next_milestone: t.description,
            companies: t.companies || companies.find((c: any) => c.id === t.company_id) || { name: "Demanda Avulsa" },
            project_name: t.project_name,
            is_task: true,
            original_task_id: t.id 
        }))
    ]

    const totalDemands = mainList.length + backlog.length
    const isExpanded = expandedCards.has(provider.id)

    return (
        <Card key={provider.id} className="border-none shadow-sm bg-white overflow-hidden flex flex-col hover:shadow-md transition-all">
            <CardHeader 
              className="pb-2 border-b border-slate-50 relative cursor-pointer select-none"
              onClick={() => toggleCard(provider.id)}
            >
                <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-indigo-500" />
                            {provider.name}
                            {totalDemands > 0 && (
                              <Badge variant="secondary" className="text-[10px] font-bold ml-1">
                                {totalDemands}
                              </Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium">
                          {isInternal ? "Squad Interno" : "Parceiro"}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <AdminOnly><ProviderSettings provider={provider} /></AdminOnly>
                    </div>
                    <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors ml-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="pt-4 flex-1 flex flex-col space-y-6 animate-in fade-in duration-200">
                  <div className="w-full space-y-3">
                      <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demandas Ativas</p>
                          <RoleGate allowed={['admin', 'manager', 'partner']}>
                            <AddDemandBtn 
                              providerId={provider.id} 
                              providerName={provider.name} 
                              isInternal={!!isInternal} 
                              companies={companies || []} 
                              onSuccess={handleNewTask}
                              userRole={userRole}
                            />
                          </RoleGate>
                      </div>
                      
                      <div className="flex flex-col gap-2 group">
                          {mainList.map((item: any) => (
                              <div key={item.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <DemandCard 
                                    project={item} 
                                    onOptimisticAction={handleOptimisticAction}
                                    userRole={userRole}
                                  />
                              </div>
                          ))}
                          {mainList.length === 0 && (
                            <div className="text-center py-6 border border-dashed border-slate-100 rounded-lg">
                              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Sem demandas</span>
                            </div>
                          )}
                      </div>
                  </div>

                  {backlog.length > 0 && (
                      <div className="pt-4 border-t border-slate-50 space-y-3">
                          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" /> Pendências
                          </p>
                          {backlog.map((task: any) => (
                              <div key={task.id} className="bg-orange-50 p-2.5 rounded border border-orange-100 flex flex-col gap-2">
                                  <div className="flex justify-between items-start group">
                                      <span className="text-xs font-bold text-slate-700 flex-1 pt-1">{task.title}</span>
                                      <DemandActions 
                                        project={{...task, is_task: true, original_task_id: task.id}} 
                                        onOptimisticAction={handleOptimisticAction}
                                        userRole={userRole}
                                      />
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </CardContent>
            )}
        </Card>
    )
  }

  const allVisible = providers.filter((p: any) => p.type !== 'HIDDEN' && p.type !== 'EXECUTIVE')
  const visibleProviders = userRole === 'partner' && userProviderId
    ? allVisible.filter((p: any) => p.id === userProviderId)
    : allVisible

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 tracking-tighter">
            <Users className="w-8 h-8 text-indigo-600" /> Monitoramento SLA
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Projetos e demandas por parceiro / prestador.</p>
        </div>
        <AdminOnly><ProviderModal /></AdminOnly>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleProviders.map(renderProviderCard)}
      </div>
    </div>
  )
}