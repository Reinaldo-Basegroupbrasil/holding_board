"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Flag, CheckCircle2, Trash2, Loader2, MapPin, Cpu } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Adicionei a prop isLast
export function PhaseCard({ phase, isLast }: { phase: any, isLast: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const [name, setName] = useState(phase.name)
  const [timeline, setTimeline] = useState(phase.custom_timeline || "")
  const [status, setStatus] = useState(phase.status)

  const isCompleted = status === 'COMPLETED'

  const defaultMonth = timeline.split(' ')[0] || "Janeiro"
  const defaultWeek = timeline.includes('W') ? timeline.substring(timeline.indexOf('W')) : "W1 (Início)"
  
  const [month, setMonth] = useState(defaultMonth)
  const [week, setWeek] = useState(defaultWeek)

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  const semanas = ["W1 (Início)", "W2", "W3", "W4 (Fim)"]

  const handleUpdate = async () => {
    setLoading(true)
    const newTimeline = `${month} ${week}`
    
    const { error } = await supabase
        .from('projects')
        .update({ 
            name, 
            custom_timeline: newTimeline,
            status: status 
        })
        .eq('id', phase.id)

    if (!error) {
        setOpen(false)
        router.refresh()
    } else {
        alert("Erro: " + error.message)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if(!confirm("Excluir esta fase?")) return
    setLoading(true)
    await supabase.from('projects').delete().eq('id', phase.id)
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  const toggleStatus = async () => {
      const newStatus = isCompleted ? 'ON_TRACK' : 'COMPLETED'
      setStatus(newStatus)
      await supabase.from('projects').update({ status: newStatus }).eq('id', phase.id)
      router.refresh()
  }

  // Define qual ícone mostrar
  const renderIcon = () => {
      if (isCompleted) return <CheckCircle2 className="w-5 h-5" />
      // Se for a última fase, mostra a bandeira. Se for intermediária, mostra o MapPin (Marco)
      if (isLast) return <Flag className="w-5 h-5" />
      return <MapPin className="w-5 h-5" />
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div 
            className={`
                group relative flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all hover:scale-105 min-w-[110px]
                ${isCompleted 
                    ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300" 
                    : isLast ? "bg-white border-rose-200 hover:border-rose-300 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm"
                }
            `}
        >
            {/* Ícone de Status (Muda cor se for a última) */}
            <div className={`mb-1 ${isCompleted ? "text-emerald-600" : isLast ? "text-rose-600" : "text-indigo-400"}`}>
                {renderIcon()}
            </div>
            
            <span className={`text-[9px] font-bold uppercase tracking-wider ${isCompleted ? "text-emerald-700" : "text-slate-500"}`}>
                {phase.custom_timeline || "Sem Data"}
            </span>
            
            <span className={`text-[10px] font-medium text-center line-clamp-2 leading-tight max-w-[100px] ${isCompleted ? "text-emerald-800 line-through opacity-70" : "text-slate-700"}`}>
                {phase.name}
            </span>

            {/* Provider Vinculado (NOME) */}
            {phase.providers ? (
                <Badge variant="secondary" className="mt-1 text-[8px] h-4 px-1 bg-indigo-50 text-indigo-600 border-indigo-100 flex gap-1 items-center">
                    <Cpu className="w-2 h-2" /> {phase.providers.name}
                </Badge>
            ) : phase.provider_id ? (
                // Fallback se não vier o nome
                <Badge variant="secondary" className="mt-1 text-[8px] h-4 px-1 bg-slate-100 text-slate-500">Alocado</Badge>
            ) : null}

            {/* ADICIONADO: Apenas o percentual discreto */}
            {phase.notion_page_id && (
                <span className="mt-2 text-[9px] font-black text-slate-400">
                    {Math.round(phase.progress || 0)}%
                </span>
            )}
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Flag className="w-5 h-5 text-indigo-600" />}
            Gerenciar Fase
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
            
            <div className={`p-3 rounded-lg border flex items-center justify-between ${isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex flex-col">
                    <span className={`text-sm font-bold ${isCompleted ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {isCompleted ? "Concluída" : "Em Andamento"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                        {isCompleted ? "Esta fase foi finalizada." : "Fase ativa no cronograma."}
                    </span>
                </div>
                <Button 
                    size="sm" 
                    variant={isCompleted ? "outline" : "default"}
                    className={isCompleted ? "text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                    onClick={toggleStatus}
                >
                    {isCompleted ? "Reabrir" : "Concluir"}
                </Button>
            </div>

            <div className="grid gap-2">
                <Label>Nome da Fase</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                    <Label>Mês</Label>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Semana</Label>
                    <Select value={week} onValueChange={setWeek}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{semanas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
            <Button onClick={handleUpdate} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}