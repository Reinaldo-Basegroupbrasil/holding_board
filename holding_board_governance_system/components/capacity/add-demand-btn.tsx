"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Loader2, Link2, Briefcase } from "lucide-react"

export function AddDemandBtn({ providerId, providerName, isInternal, companies }: { providerId: string, providerName: string, isInternal: boolean, companies: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([])
  const router = useRouter()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const { error } = await supabase
      .from('projects')
      .update({ provider_id: providerId, status: 'ON_TRACK' })
      .eq('id', formData.get('milestone_id'))
    setLoading(false)
    if (!error) { setOpen(false); router.refresh(); }
  }

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const customTimeline = isInternal ? `${formData.get('month')} ${formData.get('week')}` : null
    const { error } = await supabase.from('projects').insert({
        name: formData.get('name'),
        company_id: formData.get('company_id'),
        provider_id: providerId,
        status: 'ON_TRACK',
        next_milestone: formData.get('milestone'),
        milestone_date: isInternal ? null : formData.get('deadline_date'),
        custom_timeline: customTimeline,
        parent_project_id: null
    })
    setLoading(false)
    if (!error) { setOpen(false); router.refresh(); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(v) fetchAvailableMilestones(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 border-dashed h-9 hover:bg-slate-50 text-slate-600">
            <PlusCircle className="w-4 h-4" /> Alocar / Reservar Slot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate pr-4">Gerenciar Ocupação: {providerName}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="roadmap" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="roadmap">Vincular Roadmap</TabsTrigger>
            <TabsTrigger value="task">Demanda Avulsa</TabsTrigger>
          </TabsList>

          <TabsContent value="roadmap">
            <form onSubmit={handleLinkRoadmap} className="space-y-5">
              <div className="p-3 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100 flex gap-2 items-start">
                <Link2 className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Use esta opção para conectar a Squad a uma fase estratégica já planejada no Portfólio.</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Selecione a Fase (Sem Dono)</Label>
                <Select name="milestone_id" required>
                    <SelectTrigger className="h-11 text-sm bg-white"><SelectValue placeholder="Escolha uma fase..." /></SelectTrigger>
                    <SelectContent>
                        {availableMilestones.length > 0 ? availableMilestones.map(m => (
                            <SelectItem key={m.id} value={m.id} className="text-xs py-3 border-b border-slate-50 last:border-0">
                                <span className="font-bold text-slate-800 block mb-0.5">{m.parent?.name}</span>
                                <span className="text-slate-500">{m.name} ({m.custom_timeline})</span>
                            </SelectItem>
                        )) : <div className="p-4 text-center text-xs text-slate-400">Nenhuma fase disponível no momento.</div>}
                    </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">
                  {loading ? "Vinculando..." : "Confirmar Vínculo Estratégico"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="task">
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="p-3 bg-slate-50 text-slate-600 text-xs rounded border border-slate-200 flex gap-2 items-start">
                <Briefcase className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Use para tarefas operacionais (Sustentação, SLA) que não são Projetos Macros.</p>
              </div>
              
              <div className="grid gap-2">
                <Label className="text-xs font-bold">Nome da Tarefa</Label>
                <Input name="name" placeholder="Ex: Ajuste Contratual Base Group" required className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label className="text-xs font-bold">Empresa</Label>
                    <Select name="company_id" required>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                
                {isInternal ? (
                    <div className="grid gap-2">
                        <Label className="text-xs font-bold">Mês</Label>
                        <Select name="month" required>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
                            <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        <Label className="text-xs font-bold">Deadline</Label>
                        <Input name="deadline_date" type="date" required className="h-9 text-xs" />
                    </div>
                )}
              </div>

              {isInternal && (
                  <div className="grid gap-2">
                      <Label className="text-xs font-bold">Semana (Slot)</Label>
                      <Select name="week" defaultValue="W1 (Início)">
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="W1 (Início)">W1 (Início)</SelectItem>
                              <SelectItem value="W2">W2</SelectItem>
                              <SelectItem value="W3">W3</SelectItem>
                              <SelectItem value="W4 (Fim)">W4 (Fim)</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              )}

              <div className="grid gap-2">
                <Label className="text-xs font-bold">Entregável</Label>
                <Input name="milestone" required placeholder="Ex: Relatório Final" className="h-9" />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-slate-900 h-11">
                  {loading ? "Criando..." : "Criar Tarefa de Ocupação"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}