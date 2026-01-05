"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CheckCircle2, Circle, Calendar as CalendarIcon, 
  Send, Plus, Clock, ShieldAlert, MessageCircle, Lock
} from "lucide-react"
import { format, isToday, isBefore, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function MyTodoPage() {
  const [loading, setLoading] = useState(true)
  const [personalTasks, setPersonalTasks] = useState<any[]>([])
  const [holdingDemands, setHoldingDemands] = useState<any[]>([])
  const [newTask, setNewTask] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Busca todas as tarefas atribuídas a mim que NÃO estejam arquivadas
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles!tasks_created_by_fkey(full_name)')
      .eq('assigned_to', user.id)
      .eq('archived', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) {
      // LOGICA DE CARRY-OVER: Mostra pendentes (de qualquer data) ou concluídas de HOJE
      const activeTasks = data.filter(t => 
        t.status === 'pendente' || 
        (t.status === 'concluido' && t.completed_at && isToday(new Date(t.completed_at)))
      )

      setPersonalTasks(activeTasks.filter(t => t.is_personal))
      setHoldingDemands(activeTasks.filter(t => !t.is_personal))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleAddTask = async () => {
    if (!newTask) return
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase.from('tasks').insert({
      title: newTask,
      assigned_to: user?.id,
      created_by: user?.id,
      is_personal: true, // Por padrão, o que cria aqui é pessoal
      status: 'pendente'
    })
    setNewTask("")
    fetchTasks()
  }

  const toggleTask = async (task: any) => {
    const isCompleting = task.status === 'pendente'
    await supabase.from('tasks').update({
      status: isCompleting ? 'concluido' : 'pendente',
      completed_at: isCompleting ? new Date().toISOString() : null
    }).eq('id', task.id)
    fetchTasks()
  }

  const shareOnWhatsApp = (task: any) => {
    const text = `*PENDÊNCIA HOLDING*\nTarefa: ${task.title}\nStatus: ${task.status}\nLink: ${window.location.origin}/board/todo`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* HEADER DIÁRIO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Minha Pauta</h1>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" /> 
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            {holdingDemands.length} Demandas Holding
          </Badge>
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
            {personalTasks.length} Notas Pessoais
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* COLUNA 1: DEMANDAS DA HOLDING (ORDENS OFICIAIS) */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Demandas da Holding</h2>
          </div>
          
          {holdingDemands.length === 0 && !loading && (
            <div className="p-10 border-2 border-dashed rounded-xl text-center text-slate-400 text-sm">
              Nenhuma demanda pendente da Holding.
            </div>
          )}

          {holdingDemands.map(task => (
            <Card key={task.id} className={`transition-all ${task.status === 'concluido' ? 'opacity-50' : 'border-l-4 border-l-amber-500'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleTask(task)}>
                    {task.status === 'concluido' ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-slate-300" />}
                  </button>
                  <div>
                    <p className={`text-sm font-bold ${task.status === 'concluido' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {task.title}
                    </p>
                    <p className="text-[10px] text-slate-400">Solicitado por: {task.profiles?.full_name || 'Admin'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => shareOnWhatsApp(task)}>
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* COLUNA 2: PAUTA PESSOAL (PRIVADA) */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-rose-500" />
            <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Notas Pessoais (Privado)</h2>
          </div>

          <div className="flex gap-2 mb-6">
            <Input 
              placeholder="Adicionar lembrete rápido..." 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              className="h-10 text-xs shadow-sm"
            />
            <Button onClick={handleAddTask} className="bg-rose-600 hover:bg-rose-700 h-10">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {personalTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm group">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleTask(task)}>
                    {task.status === 'concluido' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-200" />}
                  </button>
                  <span className={`text-xs ${task.status === 'concluido' ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                    {task.title}
                  </span>
                </div>
                {isBefore(new Date(task.created_at), startOfDay(new Date())) && task.status === 'pendente' && (
                  <Badge variant="outline" className="text-[9px] text-rose-400 font-bold animate-pulse">
                    <Clock className="w-3 h-3 mr-1" /> CARRY-OVER
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}