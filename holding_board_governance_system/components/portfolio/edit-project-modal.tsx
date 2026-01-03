"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Loader2, Trash2, AlertCircle, Archive } from "lucide-react"

// Utilitários de Ordenação
const monthMap: Record<string, number> = { "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12 }
const weekMap: Record<string, number> = { "W1 (Início)": 0, "W1": 0, "W2": 0.25, "W3": 0.5, "W4 (Fim)": 0.75, "W4": 0.75 }
const getScore = (m: string, w: string) => (monthMap[m] || 99) + (weekMap[w] || 0)

export function EditProjectModal({ project, currentFases, companies }: { project: any, currentFases: any[], companies: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fases, setFases] = useState<any[]>([])
  
  const router = useRouter()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

  useEffect(() => {
    if (open) {
      const sorted = [...currentFases].map(f => ({
        id: f.id,
        name: f.name,
        month: f.custom_timeline?.split(' ')[0] || 'Janeiro',
        week: f.custom_timeline?.split(' ').slice(1).join(' ') || 'W1 (Início)',
        provider_id: f.provider_id 
      })).sort((a, b) => getScore(a.month, a.week) - getScore(b.month, b.week))
      setFases(sorted)
    }
  }, [open, currentFases])

  const addFase = () => setFases([...fases, { id: null, name: '', month: 'Janeiro', week: 'W1 (Início)', provider_id: null }])

  // LÓGICA DE ARQUIVAMENTO
  const handleArchiveProject = async () => {
    if (!confirm("Tem certeza que deseja CONCLUIR este projeto? Ele sairá da visão ativa e o custo mensal será encerrado.")) return
    setLoading(true)
    
    // 1. Marca projeto pai como COMPLETED
    await supabase.from('projects').update({ status: 'COMPLETED' }).eq('id', project.id)
    
    // 2. Marca fases filhas como COMPLETED e remove alocação de squad (libera slots)
    await supabase.from('projects').update({ status: 'COMPLETED', provider_id: null }).eq('parent_project_id', project.id)
    
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const handleDeleteProject = async () => {
    if (!confirm("ATENÇÃO: Isso apagará todo o histórico financeiro permanentemente. Prefira 'Concluir'. Continuar exclusão?")) return
    setLoading(true)
    await supabase.from('projects').delete().eq('parent_project_id', project.id)
    await supabase.from('projects').delete().eq('id', project.id)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const companyId = formData.get('company_id')

    await supabase.from('projects').update({
        name: formData.get('name'),
        description: formData.get('description'),
        company_id: companyId,
        investment_realized: Number(formData.get('investment')),
        monthly_cost: Number(formData.get('monthly_cost')),
      }).eq('id', project.id)

    await supabase.from('projects').delete().eq('parent_project_id', project.id)
    
    const sortedFases = [...fases].sort((a, b) => getScore(a.month, a.week) - getScore(b.month, b.week))
    const fasesData = sortedFases.map(f => ({
      name: f.name,
      parent_project_id: project.id,
      company_id: companyId,
      custom_timeline: `${f.month} ${f.week}`,
      provider_id: f.provider_id, // Mantém vínculo se existir
      status: 'ON_TRACK'
    }))

    await supabase.from('projects').insert(fasesData)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-none shadow-2xl">
        <DialogHeader><DialogTitle className="text-xl font-bold text-slate-800">Gerenciar Projeto: {project.name}</DialogTitle></DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700">Nome do Projeto</Label>
              <Input name="name" defaultValue={project.name} required className="h-10 border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700">Empresa</Label>
              <Select name="company_id" defaultValue={project.company_id}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">Descrição Executiva</Label>
            <textarea name="description" defaultValue={project.description} className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950" placeholder="Insira os detalhes estratégicos..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label className="font-bold text-slate-700">Capex (USD)</Label><Input name="investment" type="number" defaultValue={project.investment_realized} className="h-10" /></div>
            <div className="grid gap-2"><Label className="font-bold text-slate-700">Mensal (USD)</Label><Input name="monthly_cost" type="number" defaultValue={project.monthly_cost} className="h-10" /></div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex justify-between items-center px-1">
              <div className="space-y-0.5"><Label className="font-black text-rose-600 text-[10px] tracking-widest uppercase">Roadmap Cronológico</Label><p className="text-[10px] text-slate-400 italic flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ordem automática por data</p></div>
              <Button type="button" variant="outline" size="sm" onClick={addFase} className="h-7 text-[10px] border-slate-200">+ Nova Fase</Button>
            </div>
            <div className="grid gap-3">
              {fases.map((fase, index) => (
                <div key={index} className={`grid grid-cols-12 gap-2 items-end p-3 rounded-lg border ${fase.provider_id ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="col-span-5"><Label className="text-[9px] font-bold text-slate-400">Marco</Label><Input value={fase.name} onChange={(e) => { const n = [...fases]; n[index].name = e.target.value; setFases(n); }} className="h-8 text-xs bg-white" required /></div>
                  <div className="col-span-3"><Label className="text-[9px] font-bold text-slate-400">Mês</Label><Select value={fase.month} onValueChange={(v) => { const n = [...fases]; n[index].month = v; setFases(n); }}><SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger><SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-3"><Label className="text-[9px] font-bold text-slate-400">Semana</Label><Select value={fase.week} onValueChange={(v) => { const n = [...fases]; n[index].week = v; setFases(n); }}><SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="W1 (Início)">W1</SelectItem><SelectItem value="W2">W2</SelectItem><SelectItem value="W3">W3</SelectItem><SelectItem value="W4 (Fim)">W4</SelectItem></SelectContent></Select></div>
                  <div className="col-span-1 flex justify-center"><Button type="button" variant="ghost" size="icon" onClick={() => setFases(fases.filter((_, i) => i !== index))} className="h-8 w-8 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button></div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center pt-4 border-t gap-2">
            <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs" onClick={handleDeleteProject} title="Apagar permanentemente">
                    <Trash2 className="w-4 h-4 mr-1" /> Excluir
                </Button>
                {/* BOTÃO NOVO DE ARQUIVAR */}
                <Button type="button" variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs font-bold" onClick={handleArchiveProject} title="Arquivar e encerrar cobrança">
                    <Archive className="w-4 h-4 mr-1" /> Concluir
                </Button>
            </div>
            <Button type="submit" disabled={loading} className="bg-slate-900 text-white font-bold shadow-md">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Salvar Alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}