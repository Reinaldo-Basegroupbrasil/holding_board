"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Flag } from "lucide-react"

export function AddPhaseBtn({ parentId }: { parentId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Padrões
  const [month, setMonth] = useState("Janeiro")
  const [week, setWeek] = useState("W1 (Início)")

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  const semanas = ["W1 (Início)", "W2", "W3", "W4 (Fim)"]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const timeline = `${month} ${week}`

    const { error } = await supabase.from('projects').insert({
        name: formData.get('name'),
        parent_project_id: parentId, // VINCULA AO PROJETO PAI
        custom_timeline: timeline,
        status: 'ON_TRACK',
        company_id: null // Fases herdam o contexto do pai, não precisa duplicar o ID da empresa
    })

    setLoading(false)
    if (!error) {
        setOpen(false)
        router.refresh()
    } else {
        alert("Erro: " + error.message)
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
            <Flag className="w-5 h-5 text-indigo-600" /> Nova Fase / Milestone
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-2">
                <Label className="font-bold text-slate-700 text-xs uppercase">Nome da Fase</Label>
                <Input name="name" required placeholder="Ex: MVP 1.0, Design System..." className="font-medium" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                    <Label className="font-bold text-slate-700 text-xs uppercase">Mês</Label>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label className="font-bold text-slate-700 text-xs uppercase">Semana</Label>
                    <Select value={week} onValueChange={setWeek}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{semanas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold shadow-md">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar Fase"}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}