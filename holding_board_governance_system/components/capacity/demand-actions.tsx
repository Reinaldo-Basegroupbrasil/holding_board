"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, CheckCircle, Pencil, Loader2, Calendar, Link2, Building2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAdmin } from "@/hooks/use-admin"

export function DemandActions({ project }: { project: any }) {
  const { isAdmin } = useAdmin()
  
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // --- 1. DECLARAÇÃO DE TODOS OS HOOKS (Obrigatório ser antes de qualquer return) ---
  
  const hasTimeline = !!project.custom_timeline && project.custom_timeline.includes("W")

  const [name, setName] = useState(project.name)
  const [milestone, setMilestone] = useState(project.next_milestone || "")
  
  const [month, setMonth] = useState("Janeiro")
  const [week, setWeek] = useState("W1 (Início)")
  const [deadline, setDeadline] = useState(project.milestone_date || "")

  useEffect(() => {
    if (open) {
      setName(project.name)
      setMilestone(project.next_milestone || "")
      setDeadline(project.milestone_date || "")

      if (project.custom_timeline) {
        const parts = project.custom_timeline.split(" ")
        if (parts.length >= 1) setMonth(parts[0])
        if (parts.length >= 2) setWeek(parts.slice(1).join(" "))
      }
    }
  }, [open, project])

  // --- 2. VERIFICAÇÃO DE SEGURANÇA (Agora está no lugar certo) ---
  // Só podemos dar return null DEPOIS de todos os hooks terem sido lidos
  if (!isAdmin) return null;

  // --- 3. LÓGICA DE EVENTOS E RENDERIZAÇÃO ---

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  const semanas = ["W1 (Início)", "W2", "W3", "W4 (Fim)"]

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const updatedTimeline = hasTimeline ? `${month} ${week}` : null
    const updatedDeadline = hasTimeline ? null : deadline

    const { error } = await supabase
      .from('projects')
      .update({ 
        name,
        next_milestone: milestone,
        milestone_date: updatedDeadline, 
        custom_timeline: updatedTimeline 
      })
      .eq('id', project.id)

    if (!error) {
      setOpen(false)
      router.refresh()
    } else {
      alert("Erro ao atualizar: " + error.message)
    }
    setLoading(false)
  }

  const handleComplete = async () => {
    if(!confirm("Concluir esta entrega? Isso liberará o slot da Squad.")) return
    setLoading(true)
    await supabase.from('projects').update({ status: 'COMPLETED', provider_id: null }).eq('id', project.id)
    router.refresh()
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm("Remover esta alocação?")) return
    setLoading(true)
    
    if (project.parent_project_id) {
        await supabase.from('projects').update({ provider_id: null, status: 'ON_TRACK' }).eq('id', project.id)
    } else {
        await supabase.from('projects').delete().eq('id', project.id)
    }
    
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" title="Editar">
            <Pencil className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg">
                <span className="truncate max-w-[240px] font-bold">{name}</span>
            </DialogTitle>
            <div className="flex gap-2 mt-1">
                {project.parent_project_id ? (
                  <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-100">VINCULADO AO ROADMAP</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">DEMANDA AVULSA</Badge>
                )}
                {project.companies && (
                    <Badge variant="outline" className="text-[10px] flex gap-1 items-center">
                        <Building2 className="w-3 h-3" /> {project.companies.name}
                    </Badge>
                )}
            </div>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="space-y-5 py-2">
            
            <div className="grid gap-2">
              <Label className="font-bold text-xs uppercase text-slate-500">Nome da Entrega</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="font-bold" />
            </div>

            {hasTimeline ? (
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                    <Link2 className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-700">Planejamento de Janela (Slot)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="font-bold text-xs">Mês Referência</Label>
                        <Select value={month} onValueChange={setMonth}>
                          <SelectTrigger className="bg-white h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="font-bold text-xs">Semana</Label>
                        <Select value={week} onValueChange={setWeek}>
                          <SelectTrigger className="bg-white h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {semanas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                   </div>
               </div>
            ) : (
               <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 space-y-4">
                   <div className="flex items-center gap-2 mb-2 pb-2 border-b border-orange-200">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-orange-700">Deadline Contratual (Real)</span>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs">Data Limite</Label>
                    <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required className="bg-white" />
                  </div>
               </div>
            )}

            <div className="grid gap-2">
              <Label className="font-bold text-xs uppercase text-slate-500">Próximo Entregável</Label>
              <Input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Ex: Aguardando Validação" />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button variant="ghost" size="icon" onClick={handleComplete} disabled={loading} className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="Concluir">
        <CheckCircle className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading} className="h-8 w-8 text-slate-400 hover:text-red-600" title="Excluir/Desvincular">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}