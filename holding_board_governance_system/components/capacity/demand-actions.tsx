"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, CheckCircle, Pencil, Loader2 } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { updateTaskAction, deleteTaskAction, completeTaskAction } from "@/app/actions/demand-actions"

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const WEEKS = ["W1", "W2", "W3", "W4"]

export function DemandActions({ project, onOptimisticAction }: { project: any, onOptimisticAction?: (id: string, type: 'delete' | 'complete') => void }) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const [name, setName] = useState(project.name || project.title || "")
  const [description, setDescription] = useState(project.next_milestone || project.description || "")
  const [dueDate, setDueDate] = useState(project.custom_timeline || project.due_date || "")

  useEffect(() => {
    if (open) {
      setName(project.name || project.title || "")
      setDescription(project.next_milestone || project.description || "")
      setDueDate(project.custom_timeline || project.due_date || "")
    }
  }, [open, project])

  // Identificação do ID correto para demandas vinculadas ou avulsas
  const targetId = project.original_task_id || project.id

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setOpen(false)
    
    startTransition(async () => {
      const res = await updateTaskAction(targetId, {
        title: name,
        description: description,
        due_date: dueDate,
        project_id: project.project_id
      })
      if (res.success) {
        toast.success("Atualizado!")
        router.refresh()
      } else {
        toast.error("Erro ao atualizar")
      }
    })
  }

  const handleComplete = async () => {
    if(!confirm("Concluir no Fornecedor e no Portfólio?")) return
    
    // Sumir da tela na hora
    if (onOptimisticAction) onOptimisticAction(targetId, 'complete')

    startTransition(async () => {
      const res = await completeTaskAction(targetId)
      if (res.success) {
        toast.success("Concluído nos dois sistemas!")
        router.refresh()
      } else {
        toast.error("Erro na conclusão bilateral")
        router.refresh() 
      }
    })
  }

  const handleDelete = async () => {
    if(!confirm("Deseja excluir permanentemente?")) return
    
    // Sumir da tela na hora
    if (onOptimisticAction) onOptimisticAction(targetId, 'delete')

    startTransition(async () => {
      const res = await deleteTaskAction(targetId)
      if (res.success) {
        toast.success("Removido com sucesso")
        router.refresh()
      } else {
        toast.error("Erro ao excluir no servidor")
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px] w-[95vw] bg-white rounded-xl shadow-2xl p-6 gap-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Editar Demanda</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">Ajuste o planejamento para esta entrega.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid w-full items-center gap-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required className="h-10 border-slate-200" />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Slot de Tempo</Label>
              <div className="flex gap-2">
                <Select value={dueDate?.split(' - ')[0] || ""} onValueChange={(m) => setDueDate(`${m} - ${dueDate?.split(' - ')[1] || 'W1'}`)}>
                  <SelectTrigger className="flex-1 h-10 bg-white border-slate-200"><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent className="bg-white">{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={dueDate?.split(' - ')[1] || ""} onValueChange={(w) => setDueDate(`${dueDate?.split(' - ')[0] || 'Janeiro'} - ${w}`)}>
                  <SelectTrigger className="w-[140px] h-10 bg-white border-slate-200"><SelectValue placeholder="Semana" /></SelectTrigger>
                  <SelectContent className="bg-white">{WEEKS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Entregável</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="h-10 border-slate-200" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 text-white hover:bg-indigo-700 h-11 font-bold shadow-lg shadow-indigo-100">
                {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Button variant="ghost" size="icon" onClick={handleComplete} disabled={isPending} className="h-7 w-7 text-emerald-500 hover:bg-emerald-50">
        <CheckCircle className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}