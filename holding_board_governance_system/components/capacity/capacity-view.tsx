"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cpu, Briefcase, AlertCircle, Zap } from "lucide-react"

import { ProviderSettings } from "@/components/capacity/provider-settings" 
import { ProviderModal } from "@/components/capacity/new-provider-btn" 
import { AddDemandBtn } from "@/components/capacity/add-demand-btn" 
import { DemandCard } from "@/components/capacity/demand-card" 
import { AdminOnly } from "@/components/admin-only" 
import { DemandActions } from "./demand-actions"

interface CapacityViewProps {
  providers: any[]
  initialProjects: any[] 
  companies: any[]
  initialTasks: any[]    
}

export function CapacityView({ providers, initialProjects, companies, initialTasks }: CapacityViewProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [projects, setProjects] = useState(initialProjects)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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
      // Mapeia a empresa imediatamente para evitar "Demanda Avulsa"
      companies: companies.find(c => c.id === newTask.project_id) || { name: newTask.company_name || "Demanda Avulsa" }
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
            companies: t.companies || companies.find((c: any) => c.id === t.project_id) || { name: t.company_name || "Demanda Avulsa" },
            is_task: true,
            original_task_id: t.id 
        }))
    ]

    const occupied = mainList.length
    const total = provider.capacity_slots || 0
    let percentage = isInternal && total > 0 ? Math.min((occupied / total) * 100, 100) : 0
    let progressColor = percentage > 80 ? (occupied > total ? "bg-red-500" : "bg-amber-500") : "bg-emerald-500"

    return (
        <Card key={provider.id} className="border-none shadow-sm bg-white overflow-hidden flex flex-col group hover:shadow-md transition-all">
            <CardHeader className="pb-2 border-b border-slate-50 relative">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                            {isInternal ? <Cpu className="w-4 h-4 text-indigo-500" /> : <Briefcase className="w-4 h-4 text-slate-400" />}
                            {provider.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium">
                          {isInternal ? `Engine Interna • ${total} Slots` : "Parceiro Externo"}
                        </CardDescription>
                    </div>
                    <AdminOnly><ProviderSettings provider={provider} /></AdminOnly>
                </div>
            </CardHeader>
            
            <CardContent className="pt-4 flex-1 flex flex-col space-y-6">
                <div className="w-full space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ocupação ({occupied}/{total})</p>
                        <AdminOnly>
                          <AddDemandBtn 
                            providerId={provider.id} 
                            providerName={provider.name} 
                            isInternal={!!isInternal} 
                            companies={companies || []} 
                            onSuccess={handleNewTask} // CORREÇÃO: Propagação do callback
                          />
                        </AdminOnly>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        {mainList.map((item: any) => (
                            <div key={item.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <DemandCard 
                                  project={item} 
                                  onOptimisticAction={handleOptimisticAction} 
                                />
                            </div>
                        ))}
                        {mainList.length === 0 && (
                          <div className="text-center py-6 border border-dashed border-slate-100 rounded-lg">
                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Disponível</span>
                          </div>
                        )}
                    </div>
                </div>

                {backlog.length > 0 && (
                    <div className="pt-4 border-t border-slate-50 space-y-3">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" /> Pendências Operacionais
                        </p>
                        {backlog.map((task: any) => (
                            <div key={task.id} className="bg-orange-50 p-2.5 rounded border border-orange-100 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-slate-700 flex-1 pt-1">{task.title}</span>
                                    <DemandActions 
                                      project={{...task, is_task: true, original_task_id: task.id}} 
                                      onOptimisticAction={handleOptimisticAction}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {isInternal ? (
                    <div className="space-y-1 pt-2 border-t border-slate-50 mt-auto">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${progressColor}`} style={{ width: `${percentage}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1">
                          <span>0%</span>
                          <span>{Math.round(percentage)}% Ocupado</span>
                          <span>100%</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100 mt-auto">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Escalabilidade Sob Demanda</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
  }

  const internalSquads = providers.filter((p: any) => p.type === 'INTERNAL_SQUAD' || p.type?.includes('INTERNAL'))
  const externalPartners = providers.filter((p: any) => p.type === 'EXTERNAL_PARTNER' || p.type?.includes('EXTERNAL'))

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 tracking-tighter">
            <Cpu className="w-8 h-8 text-rose-600" /> Gestão de Capacidade
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Monitoramento de SLAs: Interno vs Parceiros Externos.</p>
        </div>
        <AdminOnly><ProviderModal /></AdminOnly>
      </div>

      <Tabs defaultValue="internal" className="w-full">
        <TabsList className="bg-white border p-1 h-10 shadow-sm mb-6">
            <TabsTrigger value="internal" className="flex items-center gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100">
              <Cpu className="w-3.5 h-3.5" /> Engine ({internalSquads.length})
            </TabsTrigger>
            <TabsTrigger value="external" className="flex items-center gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100">
              <Briefcase className="w-3.5 h-3.5" /> Parceiros ({externalPartners.length})
            </TabsTrigger>
        </TabsList>
        <TabsContent value="internal" className="mt-0 grid gap-6 md:grid-cols-2 lg:grid-cols-3 outline-none">
          {internalSquads.map(renderProviderCard)}
        </TabsContent>
        <TabsContent value="external" className="mt-0 grid gap-6 md:grid-cols-2 lg:grid-cols-3 outline-none">
          {externalPartners.map(renderProviderCard)}
        </TabsContent>
      </Tabs>
    </div>
  )
}