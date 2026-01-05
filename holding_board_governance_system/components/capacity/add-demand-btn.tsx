"use client"

import { useState, useTransition } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Link2, Briefcase, Loader2 } from "lucide-react"
import { toast } from "sonner"
// Importação das Server Actions persistentes
import { createTaskAction, linkRoadmapAction } from "@/app/actions/demand-actions"

/**
 * Interface atualizada para resolver o erro 'Property onSuccess does not exist'
 */
interface AddDemandBtnProps {
  providerId: string;
  providerName: string;
  isInternal: boolean;
  companies: any[];
  onSuccess?: (newTask: any) => void; 
}

export function AddDemandBtn({ 
  providerId, 
  providerName, 
  isInternal, 
  companies, 
  onSuccess 
}: AddDemandBtnProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([])
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

  const fetchAvailableMilestones = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, custom_timeline, parent_project_id, parent:parent_project_id(name)')
      .not('parent_project_id', 'is', null)
      .is('provider_id', null)
    if (data) setAvailableMilestones(data)
  }

  const handleLinkRoadmap = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const milestoneId = formData.get('milestone_id') as string

    startTransition(async () => {
      const result = await linkRoadmapAction(milestoneId, providerId)
      if (result.success) {
        toast.success("Roadmap vinculado!")
        setOpen(false)
        router.refresh()
      } else {
        toast.error("Erro ao vincular")
      }
    })
  }

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const companyId = formData.get('company_id') as string
    const companyObj = companies.find(c => c.id === companyId)

    const payload = {
        title: formData.get('name') as string, 
        description: formData.get('milestone') as string, 
        project_id: companyId === "avulsa" ? null : companyId,
        company_name: companyObj ? companyObj.name : "Demanda Avulsa",
        provider_id: providerId,
        due_date: `${formData.get('month')} - ${formData.get('week') || 'W1'}`,
    }

    startTransition(async () => {
      const result = await createTaskAction(payload)
      
      if (result.success) { 
        toast.success("Demanda criada!")
        
        // Ativa a atualização instantânea na tela
        if (onSuccess) {
          onSuccess(payload)
        }
        
        setOpen(false) // Fecha o modal após o sucesso
        router.refresh() 
      } else {
        toast.error("Erro ao salvar no banco")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(v) fetchAvailableMilestones(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 border-dashed h-9 hover:bg-slate-50 text-slate-600">
            <PlusCircle className="w-4 h-4" /> Alocar / Reservar Slot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Gerenciar Ocupação: {providerName}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="task" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1">
            <TabsTrigger value="task" className="text-xs font-bold uppercase tracking-wider">Operacional (SLA)</TabsTrigger>
            <TabsTrigger value="roadmap" className="text-xs font-bold uppercase tracking-wider">Estratégico (Roadmap)</TabsTrigger>
          </TabsList>

          <TabsContent value="task">
            <form onSubmit={handleCreateTask} className="space-y-5">
              <div className="p-3 bg-slate-50 text-slate-600 text-[10px] rounded border border-slate-100 flex gap-2 items-center">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                <p className="font-bold uppercase tracking-wider">Criação de demanda interna / avulsa</p>
              </div>
              
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Nome da Tarefa</Label>
                <Input name="name" required placeholder="Ex: Campanha de Performance" className="h-10 border-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Empresa / BU</Label>
                    <Select name="company_id" required>
                        <SelectTrigger className="h-10 text-xs bg-white border-slate-200"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectItem value="avulsa">-- Nenhuma --</SelectItem>
                            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Mês de Entrega</Label>
                    <Select name="month" required>
                        <SelectTrigger className="h-10 text-xs bg-white border-slate-200"><SelectValue placeholder="Mês" /></SelectTrigger>
                        <SelectContent className="bg-white">{meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Semana (Slot)</Label>
                      <Select name="week" defaultValue="W1">
                          <SelectTrigger className="h-10 text-xs bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                              <SelectItem value="W1">W1 (Início)</SelectItem>
                              <SelectItem value="W2">W2</SelectItem>
                              <SelectItem value="W3">W3</SelectItem>
                              <SelectItem value="W4">W4 (Fim)</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Entregável</Label>
                    <Input name="milestone" required placeholder="Ex: Relatório / PDF" className="h-10 border-slate-200" />
                  </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isPending} className="w-full bg-slate-900 h-11 text-white font-bold hover:bg-slate-800 transition-colors">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Criar Demanda"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="roadmap">
            <form onSubmit={handleLinkRoadmap} className="space-y-5">
              <div className="p-3 bg-indigo-50 text-indigo-700 text-[10px] rounded border border-indigo-100 flex gap-2 items-center font-bold uppercase tracking-wider">
                <Link2 className="w-4 h-4" /> Conectar Fase estratégica do Portfólio
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Fases Aguardando Slot</Label>
                <Select name="milestone_id" required>
                    <SelectTrigger className="h-12 text-sm bg-white border-slate-200"><SelectValue placeholder="Escolha uma fase do roadmap..." /></SelectTrigger>
                    <SelectContent className="bg-white max-h-[250px]">
                        {availableMilestones.length > 0 ? availableMilestones.map(m => (
                            <SelectItem key={m.id} value={m.id} className="text-xs py-3 border-b border-slate-50 last:border-0">
                                <span className="font-bold text-slate-800 block mb-0.5">{m.parent?.name}</span>
                                <span className="text-slate-500 italic">{m.name} ({m.custom_timeline})</span>
                            </SelectItem>
                        )) : <div className="p-4 text-center text-xs text-slate-400">Nenhuma fase disponível.</div>}
                    </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-white font-bold shadow-lg shadow-indigo-100">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirmar Vínculo Bilateral"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}