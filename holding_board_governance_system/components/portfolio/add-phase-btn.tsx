"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Flag } from "lucide-react"
import { toast } from "sonner"
// Importamos a action para automação
import { createPhaseWithNotionAction } from "@/app/actions/notion-actions"

// Adicionamos parentNotionId nas props para vincular no Notion
export function AddPhaseBtn({ parentId, parentNotionId }: { parentId: string, parentNotionId?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Padrões mantidos
  const [month, setMonth] = useState("Janeiro")
  const [week, setWeek] = useState("W1 (Início)")

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  const semanas = ["W1 (Início)", "W2", "W3", "W4 (Fim)"]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const timeline = `${month} ${week}`

    // Chamada para a Action que faz o trabalho no Notion e no Supabase
    const result = await createPhaseWithNotionAction(
        { name, parentNotionId }, 
        parentId, 
        timeline
    )

    setLoading(false)

    if (result.success) {
        toast.success("Fase criada e espelhada no Notion!")
        setOpen(false)
        router.refresh()
    } else {
        // Se o projeto macro não tiver ID do Notion, avisamos o usuário
        const errorMsg = result.error || "Erro desconhecido"
        toast.error("Erro na automação: " + errorMsg)
        console.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full border border-dashed border-slate-300 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all" 
            title="Adicionar Nova Fase"
        >
            <Plus className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Flag className="w-5 h-5 text-indigo-600" /> Nova Fase Automatizada
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-2">
                <Label className="font-bold text-slate-700 text-xs uppercase">Nome da Fase</Label>
                <Input 
                    name="name" 
                    required 
                    placeholder="Ex: Lote de Documentação" 
                    className="font-medium" 
                />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                    <Label className="font-bold text-slate-700 text-xs uppercase">Mês</Label>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label className="font-bold text-slate-700 text-xs uppercase">Semana</Label>
                    <Select value={week} onValueChange={setWeek}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {semanas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <DialogFooter>
                <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-slate-900 text-white font-bold shadow-md"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar Fase (Sistema + Notion)"}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}