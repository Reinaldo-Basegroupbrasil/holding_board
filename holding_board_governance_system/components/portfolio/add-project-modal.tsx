"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Plus, Loader2, Trash2, Briefcase, Calendar, Info } from "lucide-react"

export function AddProjectModal({ companies }: { companies: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  // Estado inicial com uma fase padrão para o planejamento do roadmap
  const [fases, setFases] = useState([{ name: '', month: 'Janeiro', week: 'W1 (Início)' }])
  
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  const addFase = () => setFases([...fases, { name: '', month: 'Janeiro', week: 'W1 (Início)' }])
  
  const removeFase = (index: number) => {
    if (fases.length > 1) {
      setFases(fases.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const companyId = formData.get('company_id')

    // 1. Criar o Projeto Estratégico (Macro/Pai)
    const { data: project, error: pError } = await supabase
      .from('projects')
      .insert({
        name: formData.get('name'),
        company_id: companyId,
        investment_realized: Number(formData.get('investment')) || 0, // Capex
        monthly_cost: Number(formData.get('monthly_cost')) || 0,        // Opex Forge
        status: 'ON_TRACK', // Usando status válido para evitar erro de enum
        parent_project_id: null // Identificador de Projeto Macro
      })
      .select()
      .single()

    if (pError) {
      alert("Erro ao criar projeto macro: " + pError.message)
      setLoading(false)
      return
    }

    // 2. Criar as Fases (Milestones) vinculadas ao Projeto Macro
    if (project && fases.length > 0) {
      const fasesData = fases.map(f => ({
        name: f.name || "Marco Planejado",
        parent_project_id: project.id, // Vínculo hierárquico
        company_id: companyId,
        custom_timeline: `${f.month} ${f.week}`, // Janela W1-W4
        status: 'ON_TRACK' // Status padrão aceito pelo banco
      }))

      const { error: fError } = await supabase.from('projects').insert(fasesData)
      
      if (fError) {
        alert("Projeto macro criado, mas houve erro ao salvar as fases: " + fError.message)
      }
    }

    setLoading(false)
    setOpen(false)
    setFases([{ name: '', month: 'Janeiro', week: 'W1 (Início)' }]) // Reset do estado
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-md font-bold transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Novo Projeto Macro
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-none shadow-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black text-slate-800 tracking-tighter">
            <Briefcase className="w-7 h-7 text-rose-600" />
            PLANEJAMENTO ESTRATÉGICO
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium italic">
            Cadastre a iniciativa e desenhe o roadmap de entregas para as Squads assumirem.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8 py-4">
          {/* SEÇÃO 1: IDENTIFICAÇÃO E EMPRESA */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700 text-sm">Nome do Projeto Macro</Label>
              <Input 
                name="name" 
                placeholder="Ex: Expansão Cartões Luz" 
                required 
                className="h-12 border-slate-200 focus:ring-rose-500 transition-all" 
              />
            </div>
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700 text-sm">Empresa Beneficiária</Label>
              <Select name="company_id" required>
                <SelectTrigger className="h-12 border-slate-200">
                  <SelectValue placeholder="Selecione a Holding..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SEÇÃO 2: FINANCEIRO (CAPEX E OPEX) */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700 text-sm">Investimento Total (Capex USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-400 font-mono text-sm">$</span>
                <Input name="investment" type="number" defaultValue="0" className="h-12 pl-7 border-slate-200 font-mono" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="font-bold text-slate-700 text-sm">Custo Mensal (The Forge USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-400 font-mono text-sm">$</span>
                <Input name="monthly_cost" type="number" defaultValue="0" className="h-12 pl-7 border-slate-200 font-mono" />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: CRONOGRAMA DINÂMICO (ROADMAP) */}
          <div className="space-y-4 border-t border-slate-100 pt-8">
            <div className="flex justify-between items-center px-1">
              <Label className="font-black text-rose-600 text-[11px] tracking-[0.2em] uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Roadmap de Fases e Janelas
              </Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addFase} 
                className="h-8 text-[10px] font-bold border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
              >
                + Adicionar Marco
              </Button>
            </div>

            <div className="grid gap-3">
              {fases.map((fase, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group hover:border-rose-200 transition-all">
                  <div className="col-span-5 grid gap-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Nome da Etapa</Label>
                    <Input 
                      value={fase.name} 
                      onChange={(e) => {
                        const newFases = [...fases];
                        newFases[index].name = e.target.value;
                        setFases(newFases);
                      }}
                      placeholder="Ex: MVP, Integração..."
                      className="h-10 text-xs border-slate-200 bg-white"
                      required
                    />
                  </div>
                  <div className="col-span-3 grid gap-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Mês</Label>
                    <Select value={fase.month} onValueChange={(val) => {
                      const newFases = [...fases];
                      newFases[index].month = val;
                      setFases(newFases);
                    }}>
                      <SelectTrigger className="h-10 text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 grid gap-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Semana (Slot)</Label>
                    <Select value={fase.week} onValueChange={(val) => {
                      const newFases = [...fases];
                      newFases[index].week = val;
                      setFases(newFases);
                    }}>
                      <SelectTrigger className="h-10 text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="W1 (Início)">W1 (Início)</SelectItem>
                        <SelectItem value="W2">W2</SelectItem>
                        <SelectItem value="W3">W3</SelectItem>
                        <SelectItem value="W4 (Fim)">W4 (Fim)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex justify-center pb-0.5">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeFase(index)} 
                      className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      disabled={fases.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-900 rounded-2xl flex gap-4 items-center">
             <div className="bg-rose-600 p-2 rounded-lg shadow-inner">
                <Info className="w-5 h-5 text-white" />
             </div>
             <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
               <strong>Nota Estratégica:</strong> Estas fases aparecerão na aba de <strong>Capacidade</strong> para que as Squads (Atlas/Axia) possam assumir os slots e realizar a execução técnica.
             </p>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-rose-600 hover:bg-rose-700 text-white h-14 font-black text-sm shadow-xl transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  CONSOLIDANDO ROADMAP...
                </div>
              ) : (
                "FINALIZAR PLANEJAMENTO E LANÇAR NO PORTFÓLIO"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}