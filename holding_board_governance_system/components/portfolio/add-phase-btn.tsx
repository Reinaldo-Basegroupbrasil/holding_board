"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Flag, AlertTriangle, Link2Off } from "lucide-react"
import { toast } from "sonner"
import { createPhaseWithNotionAction } from "@/app/actions/notion-actions"

export function AddPhaseBtn({ parentId, parentNotionId }: { parentId: string, parentNotionId?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [month, setMonth] = useState("Janeiro")
  const [week, setWeek] = useState("W1 (Início)")

  // Verificação de Blindagem: O projeto macro está vinculado ao Notion?
  const isLinked = !!parentNotionId && parentNotionId.length > 5

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  const semanas = ["W1 (Início)", "W2", "W3", "W4 (Fim)"]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const timeline = `${month} ${week}`

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
        const errorMsg = result.error || "Erro desconhecido"
        toast.error("Erro na automação: " + errorMsg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 rounded-full border border-dashed transition-all ${
                !isLinked 
                ? "border-slate-200 text-slate-300 cursor-help" 
                : "border-slate-300 text-slate-400 hover:text-rose-600 hover:border-rose-200"
            }`}
            title={isLinked ? "Adicionar Nova Fase" : "Vínculo com Notion Necessário"}
        >
            {isLinked ? <Plus className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Flag className="w-5 h-5 text-indigo-600" /> Nova Fase Automatizada
          </DialogTitle>
        </DialogHeader>
        
        {/* Lógica de Blindagem: Se não estiver vinculado, mostra aviso. Se estiver, mostra o formulário. */}
        {!isLinked ? (
            <div className="py-6 flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-slate-900">Vínculo não detectado</h3>
                    <p className="text-xs text-slate-500 leading-relaxed px-4">
                        Este Projeto Macro não possui um ID do Notion vinculado no Supabase. 
                        A automação não pode criar fases sem um projeto pai no Notion.
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setOpen(false)}
                    className="mt-2"
                >
                    Entendi
                </Button>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="grid gap-2">
                    <Label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Nome da Fase</Label>
                    <Input 
                        name="name" 
                        required 
                        placeholder="Ex: Lote de Documentação" 
                        className="font-medium text-sm" 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                        <Label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Mês</Label>
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {meses.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Semana</Label>
                        <Select value={week} onValueChange={setWeek}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {semanas.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md text-xs h-10"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "ADICIONAR FASE NO NOTION"}
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  )
}