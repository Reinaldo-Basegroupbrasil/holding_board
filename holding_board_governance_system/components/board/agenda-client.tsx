"use client"

import { useState, useEffect, useRef } from "react"
import { format, addDays, addWeeks, addMonths, isSameMonth, isSameWeek, parseISO, isPast, isToday, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  CheckCircle2, Calendar, Briefcase, 
  Link as LinkIcon, ChevronDown, ChevronUp, UploadCloud, Loader2, Download, User, 
  Plus, Trash2, CheckSquare, Send, FileText, PenTool, DollarSign, History, Edit2, Repeat, XCircle, Archive, RotateCcw, PenLine, Inbox, CalendarDays, ExternalLink, Star, Building2, ListFilter
} from "lucide-react"
import { toast } from "sonner"
import { completeBoardTask } from "@/app/actions/board-actions"
// @ts-ignore
import { addPersonalTaskAction, togglePersonalTaskAction, deletePersonalTaskAction, editPersonalTaskAction, toggleImportantAction } from "@/app/actions/personal-tasks"
import { EditTaskModal } from "./edit-task-modal"
import { NewBoardTaskBtn } from "./new-task-btn"

// --- TIPOS CORRIGIDOS ---
type PersonalTask = {
    id: string
    text: string
    context?: string 
    done: boolean
    doneAt?: string
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
    targetDate?: string
    important?: boolean
}

export function AgendaClient({ tasks, initialPersonalTasks, userName, providerName, isAdmin, companies, providers, currentProviderId }: any) {
  const router = useRouter()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  
  // ESTADOS GERAIS
  const [activeView, setActiveView] = useState<'holding' | 'personal'>('holding')
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active')

  // ESTADOS PESSOAIS
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>(initialPersonalTasks || [])
  const [newTaskText, setNewTaskText] = useState(""); const [newContext, setNewContext] = useState(""); const [newRecurrence, setNewRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none'); const [newDate, setNewDate] = useState("")
  const [showContextPicker, setShowContextPicker] = useState(false); const [showRecurrencePicker, setShowRecurrencePicker] = useState(false); const newDateInputRef = useRef<HTMLInputElement>(null); const formRef = useRef<HTMLFormElement>(null)
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(new Date()); const datePickerRef = useRef<HTMLInputElement>(null); const [showHistory, setShowHistory] = useState(false); const [showAllTasks, setShowAllTasks] = useState(false)
  
  // Edição Pessoal (IDs agora são strings)
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null); 
  
  const [editState, setEditState] = useState<{text: string, context: string, recurrence: 'none' | 'daily' | 'weekly' | 'monthly', date: string}>({ text: '', context: '', recurrence: 'none', date: '' })
  const [historyFilter, setHistoryFilter] = useState("month")

  // ESTADOS HOLDING
  const [holdingFilter, setHoldingFilter] = useState<string>('all')
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [refuseModalOpen, setRefuseModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<any>(null)
  
  // Resposta da Tarefa
  const [responseLink, setResponseLink] = useState("")
  const [responseFile, setResponseFile] = useState("")
  const [responseComment, setResponseComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // Sincroniza dados iniciais do banco
  useEffect(() => { 
      if (initialPersonalTasks) setPersonalTasks(initialPersonalTasks) 
  }, [initialPersonalTasks])

  // Fecha dropdowns ao clicar fora do form
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowContextPicker(false)
        setShowRecurrencePicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // --- FILTROS HOLDING ---
  const filteredHoldingTasks = tasks.filter((task: any) => {
      const isMyResponsibility = task.provider_id === currentProviderId
      const isMyRequest = task.requestor === userName || isAdmin
      if (!isMyResponsibility && !isMyRequest && !isAdmin) return false
      let isArchivedForMe = false
      if (isMyResponsibility) isArchivedForMe = task.archived_by_provider
      if (isMyRequest) isArchivedForMe = task.archived_by_requestor
      return viewMode === 'active' ? !isArchivedForMe : isArchivedForMe
  })

  const displayedHoldingTasks = holdingFilter === 'all' 
    ? filteredHoldingTasks 
    : filteredHoldingTasks.filter((t: any) => t.providers?.name === holdingFilter)

  const uniqueProviders = Array.from(new Set(filteredHoldingTasks.map((t: any) => t.providers?.name).filter(Boolean))) as string[]

  // --- AÇÕES HOLDING ---
  const handleArchiveToggle = async (task: any, shouldArchive: boolean) => {
      const updates: any = {}
      if (task.provider_id === currentProviderId) updates.archived_by_provider = shouldArchive
      if (task.requestor === userName || isAdmin) updates.archived_by_requestor = shouldArchive
      await supabase.from('board_tasks').update(updates).eq('id', task.id)
      router.refresh(); toast.success(shouldArchive ? "Arquivado" : "Restaurado")
  }

  const handleReopen = async (taskId: string) => {
      if(!confirm("Reabrir tarefa?")) return
      await supabase.from('board_tasks').update({ status: 'pendente', response_comment: null, archived_by_provider: false, archived_by_requestor: false }).eq('id', taskId)
      router.refresh(); toast.success("Tarefa reaberta!")
  }

  const handleDeleteTask = async (id: string) => {
      if(!confirm("Excluir permanentemente?")) return
      await supabase.from('board_tasks').delete().eq('id', id)
      router.refresh(); toast.success("Excluído")
  }

  const handleSubmitResolution = async (action: 'concluido' | 'recusado') => {
      setLoading(true)
      const updates: any = { status: action }
      if (action === 'concluido') { 
          updates.response_comment = responseComment
          let publicUrl = ""
          if (uploadFile) {
              const fileExt = uploadFile.name.split('.').pop()
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
              const { error: uploadError } = await supabase.storage.from('board-uploads').upload(`resolutions/${fileName}`, uploadFile)
              if (!uploadError) {
                  const { data } = supabase.storage.from('board-uploads').getPublicUrl(`resolutions/${fileName}`)
                  publicUrl = data.publicUrl
              }
          }
          const attachments = [responseLink, publicUrl].filter(Boolean).join(" | ")
          updates.response_attachment_url = attachments
      } else { updates.refusal_reason = responseComment }
      await supabase.from('board_tasks').update(updates).eq('id', activeTask.id)
      setLoading(false); setResolveModalOpen(false); setRefuseModalOpen(false); router.refresh(); toast.success("Status atualizado!")
  }

  // --- AÇÕES PESSOAIS ---
  const addPersonalTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskText.trim()) return
    const dateToSave = newDate || ""
    const tempId = Math.random().toString()
    const newTask: PersonalTask = { id: tempId, text: newTaskText, context: (newContext && newContext !== 'no_context') ? newContext : undefined, done: false, recurrence: newRecurrence, targetDate: dateToSave || undefined }
    setPersonalTasks([newTask, ...personalTasks])
    setNewTaskText(""); setNewRecurrence('none'); setNewContext(""); setNewDate(""); setShowContextPicker(false); setShowRecurrencePicker(false)
    
    await addPersonalTaskAction({ text: newTaskText, context: newContext, recurrence: newRecurrence, targetDate: dateToSave })
    toast.success("Salvo!")
  }

  const togglePersonalTask = async (id: string) => {
    const task = personalTasks.find(t => t.id === id); if (!task) return
    const newStatus = !task.done
    const updatedTasks = personalTasks.map(t => t.id === id ? { ...t, done: newStatus, doneAt: newStatus ? new Date().toISOString() : undefined } : t)
    setPersonalTasks(updatedTasks)
    await togglePersonalTaskAction(id, task.done, { title: task.text, context: task.context, recurrence: task.recurrence, due_date: task.targetDate })
    if (newStatus) toast.success("Concluído!")
  }

  const handleDeleteClick = async (id: string) => {
    if (deleteConfirmId === id) { setPersonalTasks(personalTasks.filter(t => t.id !== id)); setDeleteConfirmId(null); await deletePersonalTaskAction(id); toast.success("Excluído") } 
    else { setDeleteConfirmId(id); setTimeout(() => setDeleteConfirmId(null), 3000) }
  }

  const startEditing = (task: PersonalTask) => {
    setEditingId(task.id)
    setEditState({ text: task.text, context: task.context || 'no_context', recurrence: task.recurrence, date: task.targetDate || '' })
  }

  const saveEdit = async () => {
    if (editingId) {
        setPersonalTasks(personalTasks.map(t => t.id === editingId ? { ...t, text: editState.text, context: (editState.context && editState.context !== 'no_context') ? editState.context : undefined, recurrence: editState.recurrence, targetDate: editState.date || undefined } : t))
        const idToUpdate = editingId
        setEditingId(null)
        await editPersonalTaskAction(idToUpdate, editState)
        toast.success("Editado")
    }
  }

  const toggleImportant = async (id: string) => {
    const task = personalTasks.find(t => t.id === id)
    if (!task) return
    const newVal = !task.important
    setPersonalTasks(personalTasks.map(t => t.id === id ? { ...t, important: newVal } : t))
    await toggleImportantAction(id, task.important || false)
  }

  const getFilteredHistory = () => {
    let doneTasks = personalTasks.filter(t => t.done && t.doneAt).sort((a,b) => new Date(b.doneAt!).getTime() - new Date(a.doneAt!).getTime())
    const now = new Date()
    if (historyFilter === 'month') doneTasks = doneTasks.filter(t => isSameMonth(parseISO(t.doneAt!), now))
    else if (historyFilter === 'week') doneTasks = doneTasks.filter(t => isSameWeek(parseISO(t.doneAt!), now))
    const groups: Record<string, PersonalTask[]> = {}
    doneTasks.forEach(task => { const key = format(new Date(task.doneAt!), "MMMM yyyy", { locale: ptBR }); if (!groups[key]) groups[key] = []; groups[key].push(task) })
    return groups
  }

  const getVisiblePersonalTasks = () => {
    let l = personalTasks.filter(t => !t.done)
    if(showAllTasks) return l
    if(selectedDateFilter) return l.filter(t => t.targetDate && isSameDay(parseISO(t.targetDate), selectedDateFilter))
    return l.filter(t => !t.targetDate)
  }

  const weekDays = Array.from({length:6},(_,i)=>addDays(new Date(),i))

  return (
    <div className="w-full px-6 space-y-6 bg-slate-50/30 min-h-screen pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center pt-4 mb-2">
        <p className="text-slate-500 text-xs flex items-center gap-1.5 font-medium capitalize"><Calendar className="w-3.5 h-3.5 text-indigo-500" /> {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        <Badge variant="secondary" className="py-1 px-3 bg-white text-slate-600 shadow-sm border border-slate-200 text-xs"><User className="w-3 h-3 mr-1.5" /> {providerName || userName}</Badge>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard label="Pendências Holding" value={filteredHoldingTasks.filter((t:any)=>!['concluido','recusado'].includes(t.status)).length} icon={Briefcase} bg="bg-indigo-600" color="text-white" isActive={activeView==='holding'} onClick={()=>setActiveView('holding')} />
          <StatCard label="Tarefas Pendentes" value={personalTasks.filter(t=>!t.done).length} icon={CheckSquare} bg="bg-emerald-50" color="text-emerald-600" isActive={activeView==='personal'} onClick={()=>setActiveView('personal')} />
      </div>

      {/* VIEW HOLDING */}
      {activeView === 'holding' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[500px]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant={holdingFilter==='all'?'secondary':'ghost'} size="sm" onClick={()=>setHoldingFilter('all')} className="text-xs">Todos ({filteredHoldingTasks.length})</Button>
                    {uniqueProviders.map(name => {
                        const count = filteredHoldingTasks.filter((t: any) => t.providers?.name === name).length
                        return <Button key={name} variant={holdingFilter===name?'secondary':'ghost'} size="sm" onClick={()=>setHoldingFilter(name)} className="text-xs">{name} ({count})</Button>
                    })}
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant={viewMode==='active'?'secondary':'ghost'} size="sm" onClick={()=>setViewMode('active')}>Ativos</Button>
                    <Button variant={viewMode==='archived'?'secondary':'ghost'} size="sm" onClick={()=>setViewMode('archived')}>Arquivados</Button>
                    <NewBoardTaskBtn providers={providers} currentUser={userName} />
                </div>
            </div>
            <div className="space-y-3">
                {displayedHoldingTasks.length === 0 && <div className="text-center py-12 text-slate-400">Nenhuma demanda encontrada neste filtro.</div>}
                {displayedHoldingTasks.map((task: any) => (
                    <HoldingTaskCard 
                        key={task.id} task={task} 
                        userName={userName} currentProviderId={currentProviderId} isAdmin={isAdmin}
                        onResolve={() => { setActiveTask(task); setResolveModalOpen(true) }}
                        onRefuse={() => { setActiveTask(task); setRefuseModalOpen(true) }}
                        onEdit={() => { setActiveTask(task); setEditModalOpen(true) }}
                        onDelete={() => handleDeleteTask(task.id)}
                        onArchive={(val: boolean) => handleArchiveToggle(task, val)}
                        onReopen={() => handleReopen(task.id)}
                        viewMode={viewMode}
                    />
                ))}
            </div>
        </div>
      )}

      {/* VIEW PESSOAL */}
      {activeView === 'personal' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 min-h-[300px] relative border-slate-200 border-t-4 border-t-emerald-500">
                
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-emerald-600" /> Minhas Tarefas</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs text-slate-500 hover:text-emerald-600"><History className="w-3.5 h-3.5 mr-1.5" /> {showHistory ? "Pendentes" : "Concluídos"}</Button>
                </div>

                {!showHistory && (
                    <>
                        {/* CALENDÁRIO COM BADGES */}
                            <p className="text-[10px] text-slate-400 mb-2">Todas = lista completa · Backlog = sem data definida</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                                {/* Todas - lista completa de pendentes */}
                                {(() => {
                                    const allCount = personalTasks.filter(t => !t.done).length
                                    return (
                                        <button title="Ver todas as tarefas pendentes (com ou sem data)" onClick={() => { setShowAllTasks(true); setSelectedDateFilter(null) }} className={`flex flex-col items-center justify-center min-w-[70px] h-[68px] rounded-lg border transition-all ${showAllTasks ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                            <span className="text-[10px] font-bold uppercase">Todas</span>
                                            <ListFilter className="w-4 h-4 mt-0.5" />
                                            {allCount > 0 && <span className={`text-[9px] font-bold mt-0.5 ${showAllTasks ? 'text-indigo-200' : 'text-slate-400'}`}>({allCount})</span>}
                                        </button>
                                    )
                                })()}
                                {/* Backlog - tarefas sem data definida */}
                                {(() => {
                                    const backlogCount = personalTasks.filter(t => !t.done && !t.targetDate).length
                                    return (
                                        <button title="Tarefas sem data — para organizar e definir prazo depois" onClick={() => { setSelectedDateFilter(null); setShowAllTasks(false) }} className={`flex flex-col items-center justify-center min-w-[70px] h-[68px] rounded-lg border transition-all ${!showAllTasks && selectedDateFilter === null ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                            <span className="text-[10px] font-bold uppercase">Backlog</span>
                                            <Inbox className="w-4 h-4 mt-0.5" />
                                            {backlogCount > 0 && <span className={`text-[9px] font-bold mt-0.5 ${!showAllTasks && selectedDateFilter === null ? 'text-slate-300' : 'text-slate-400'}`}>({backlogCount})</span>}
                                        </button>
                                    )
                                })()}
                                {weekDays.map((date) => {
                                    const isSelected = !showAllTasks && selectedDateFilter && isSameDay(date, selectedDateFilter)
                                    const isTodayDate = isToday(date)
                                    const dayCount = personalTasks.filter(t => !t.done && t.targetDate && isSameDay(parseISO(t.targetDate), date)).length
                                    return (
                                        <button key={date.toString()} onClick={() => { setSelectedDateFilter(date); setShowAllTasks(false) }} className={`flex flex-col items-center justify-center min-w-[70px] h-[68px] rounded-lg border transition-all relative ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50'}`}>
                                            {isTodayDate && !isSelected && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                                            <span className="text-[10px] font-bold uppercase">{format(date, 'EEE', { locale: ptBR })}</span>
                                            <span className="text-lg font-bold leading-none">{format(date, 'dd')}</span>
                                            {dayCount > 0 && <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-emerald-500'}`}>({dayCount})</span>}
                                        </button>
                                    )
                                })}
                                <div className="h-10 w-px bg-slate-200 mx-1 self-center"></div>
                                <div className="relative">
                                    <button onClick={() => datePickerRef.current?.showPicker()} className="flex flex-col items-center justify-center min-w-[60px] h-[68px] rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><CalendarDays className="w-5 h-5" /><span className="text-[9px] mt-1 font-medium">Mais</span></button>
                                    <input type="date" ref={datePickerRef} className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0" onChange={(e) => { if (e.target.value) { setSelectedDateFilter(parseISO(e.target.value)); setShowAllTasks(false) } }} />
                                </div>
                            </div>

                        {/* FORMULÁRIO INLINE (ESTILO TO DO) */}
                            <div className="mb-5">
                                <form ref={formRef} onSubmit={addPersonalTask} className="flex items-center gap-2 border border-slate-200 rounded-xl bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-300 transition-all">
                                    <Input 
                                        placeholder="Adicionar tarefa..." 
                                        className="h-9 text-sm border-0 shadow-none focus-visible:ring-0 px-1 flex-1 placeholder:text-slate-400" 
                                        value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} autoFocus 
                                    />
                                    <div className="flex items-center gap-1 shrink-0">
                                        {/* Date picker icon */}
                                        <div className="relative">
                                            <button type="button" onClick={() => newDateInputRef.current?.showPicker()} className={`p-1.5 rounded-md transition-colors ${newDate ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`} title="Data">
                                                <CalendarDays className="w-4 h-4" />
                                            </button>
                                            {newDate && <span className="absolute -top-1.5 -right-1 text-[8px] bg-emerald-100 text-emerald-700 rounded px-1 font-bold">{format(parseISO(newDate), 'dd/MM')}</span>}
                                            <input type="date" ref={newDateInputRef} className="absolute inset-0 opacity-0 w-0 h-0" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                                        </div>

                                        {/* Context picker */}
                                        <div className="relative">
                                            <button type="button" onClick={() => { setShowContextPicker(!showContextPicker); setShowRecurrencePicker(false) }} className={`p-1.5 rounded-md transition-colors ${newContext && newContext !== 'no_context' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`} title="Empresa / Contexto">
                                                <Building2 className="w-4 h-4" />
                                            </button>
                                            {newContext && newContext !== 'no_context' && <span className="absolute -top-1.5 -right-1 text-[8px] bg-indigo-100 text-indigo-700 rounded px-1 font-bold truncate max-w-[50px]">{newContext.slice(0,4)}</span>}
                                            {showContextPicker && (
                                                <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                                                    <button type="button" onClick={() => { setNewContext('no_context'); setShowContextPicker(false) }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-400">-- Nenhum --</button>
                                                    {companies?.map((c: any) => (
                                                        <button key={c.id} type="button" onClick={() => { setNewContext(c.name); setShowContextPicker(false) }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 ${newContext === c.name ? 'text-indigo-600 font-medium bg-indigo-50/50' : 'text-slate-700'}`}>{c.name}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Recurrence picker */}
                                        <div className="relative">
                                            <button type="button" onClick={() => { setShowRecurrencePicker(!showRecurrencePicker); setShowContextPicker(false) }} className={`p-1.5 rounded-md transition-colors ${newRecurrence !== 'none' ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`} title="Recorrência">
                                                <Repeat className="w-4 h-4" />
                                            </button>
                                            {showRecurrencePicker && (
                                                <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[130px]">
                                                    {([['none','Não repetir'],['daily','Todo Dia'],['weekly','Semanal'],['monthly','Mensal']] as const).map(([val, label]) => (
                                                        <button key={val} type="button" onClick={() => { setNewRecurrence(val as any); setShowRecurrencePicker(false) }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 ${newRecurrence === val ? 'text-amber-600 font-medium bg-amber-50/50' : 'text-slate-700'}`}>{label}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                                        <Button type="submit" size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 shrink-0 rounded-lg"><Plus className="w-4 h-4" /></Button>
                                    </div>
                                </form>
                            </div>

                        <div className="space-y-1">
                            {(() => {
                                const visible = getVisiblePersonalTasks()
                                if (visible.length === 0) return <div className="text-center py-16 text-slate-300"><p className="text-sm">{showAllTasks ? "Nenhuma tarefa pendente." : selectedDateFilter === null ? "Nenhuma tarefa no backlog." : "Nenhuma tarefa para este dia."}</p></div>
                                
                                const importantTasks = visible.filter(t => t.important)
                                const otherTasks = visible.filter(t => !t.important)
                                const hasImportant = importantTasks.length > 0

                                const renderTask = (pt: PersonalTask) => (
                                    <PersonalTaskCard 
                                        key={pt.id} task={pt} 
                                        onToggle={() => togglePersonalTask(pt.id)} 
                                        onDelete={() => handleDeleteClick(pt.id)}
                                        onEdit={startEditing}
                                        onToggleImportant={toggleImportant}
                                        editingId={editingId} editState={editState} setEditState={setEditState}
                                        saveEdit={saveEdit} setEditingId={setEditingId}
                                        deleteConfirmId={deleteConfirmId}
                                        companies={companies}
                                    />
                                )

                                return (
                                    <>
                                        {hasImportant && (
                                            <div className="mb-2">
                                                <div className="flex items-center gap-2 mb-1 px-1">
                                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                    <span className="text-xs uppercase text-amber-500 font-bold tracking-wider">Importantes</span>
                                                    <span className="text-xs text-slate-300 font-medium">({importantTasks.length})</span>
                                                </div>
                                                <div className="space-y-0.5">{importantTasks.map(renderTask)}</div>
                                            </div>
                                        )}
                                        {otherTasks.length > 0 && (
                                            <div>
                                                {hasImportant && (
                                                    <div className="flex items-center gap-2 mb-1 px-1 mt-3">
                                                        <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Tarefas</span>
                                                        <span className="text-xs text-slate-300 font-medium">({otherTasks.length})</span>
                                                    </div>
                                                )}
                                                <div className="space-y-0.5">{otherTasks.map(renderTask)}</div>
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    </>
                )}

                {showHistory && (
                    <div className="space-y-4">
                        {showHistory && <div className="mb-4 flex justify-end"><Select value={historyFilter} onValueChange={setHistoryFilter}><SelectTrigger className="h-8 w-[140px] text-xs border-slate-200 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todo o Histórico</SelectItem><SelectItem value="month">Este Mês</SelectItem><SelectItem value="week">Esta Semana</SelectItem></SelectContent></Select></div>}
                        {Object.keys(getFilteredHistory()).length === 0 ? <p className="text-center text-slate-400 py-10 text-xs">Nenhuma tarefa concluída no período.</p> : 
                            Object.entries(getFilteredHistory()).map(([month, tasks]) => (
                                <div key={month} className="space-y-2">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-1 px-3 rounded inline-block">{month}</h3>
                                    {tasks.map(pt => (
                                        <div key={pt.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-colors">
                                            <div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-slate-500 line-through decoration-slate-300">{pt.text}</span></div>
                                            <div className="flex items-center gap-3"><span className="text-[10px] text-slate-400 font-bold uppercase">{pt.doneAt ? format(new Date(pt.doneAt), "dd/MM HH:mm") : ''}</span><button onClick={() => togglePersonalTask(pt.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Desfazer"><RotateCcw className="w-3.5 h-3.5" /></button></div>
                                        </div>
                                    ))}
                                </div>
                            ))
                        }
                    </div>
                )}
          </div>
      )}

      {/* --- MODAIS DE AÇÃO --- */}
      <EditTaskModal isOpen={editModalOpen} onClose={()=>setEditModalOpen(false)} task={activeTask} providers={providers} onSuccess={()=>router.refresh()} />

      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white border-t-8 border-t-emerald-500">
            <DialogHeader><DialogTitle className="text-emerald-700">Entregar Demanda</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid gap-2"><Label>Opção A: Colar Link (Drive/Docs)</Label><div className="relative"><Input placeholder="https://..." className="pl-9" onChange={e=>setResponseLink(e.target.value)} /><LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /></div></div>
                <div className="relative flex py-1 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">E / OU</span><div className="flex-grow border-t border-slate-200"></div></div>
                
                {/* UPLOAD REAL DE ARQUIVO */}
                <div className="grid gap-2">
                    <Label>Opção B: Anexar Arquivo (Upload)</Label>
                    <div className="relative group">
                        <div className="absolute inset-0 border border-dashed border-slate-300 rounded-md bg-slate-50 group-hover:bg-slate-100 transition-colors pointer-events-none flex items-center px-3">
                            <UploadCloud className="w-4 h-4 text-slate-400 mr-2"/>
                            <span className="text-xs text-slate-500 truncate">{uploadFile ? uploadFile.name : "Clique para selecionar arquivo..."}</span>
                        </div>
                        <Input type="file" className="opacity-0 cursor-pointer h-10 w-full" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                    </div>
                </div>

                <div className="grid gap-2 mt-2"><Label>Comentário da Entrega</Label><Textarea className="h-24 resize-none focus:ring-emerald-500/20" placeholder="Detalhes sobre a conclusão..." onChange={e=>setResponseComment(e.target.value)} /></div>
            </div>
            <Button onClick={()=>handleSubmitResolution('concluido')} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirmar Entrega"}</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={refuseModalOpen} onOpenChange={setRefuseModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white border-t-8 border-t-rose-500">
            <DialogHeader><DialogTitle className="text-rose-700">Recusar Demanda</DialogTitle></DialogHeader>
            <div className="py-4"><Textarea className="h-32 border-rose-200" placeholder="Motivo da recusa..." onChange={e=>setResponseComment(e.target.value)} /></div>
            <Button onClick={()=>handleSubmitResolution('recusado')} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-11">Confirmar Recusa</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 1. CARD DA HOLDING (LINK CLICÁVEL E DOWNLOAD)
function HoldingTaskCard({ task, userName, currentProviderId, isAdmin, onResolve, onRefuse, onEdit, onDelete, onArchive, onReopen, viewMode }: any) {
    const [isOpen, setIsOpen] = useState(false)
    const isMyResponsibility = task.provider_id === currentProviderId
    const isMyRequest = task.requestor === userName || isAdmin
    const isPending = task.status === 'pendente' || task.status === 'em_andamento'
    const isDone = task.status === 'concluido'
    const isRefused = task.status === 'recusado'

    // Função auxiliar para verificar se é link real
    const isUrl = (str: string) => str && (str.startsWith('http') || str.startsWith('https'));

    return (
        <div className={`border-l-4 rounded-xl bg-white shadow-sm border border-slate-200 transition-all ${isRefused?'border-l-rose-500':isDone?'border-l-emerald-500':'border-l-indigo-500'}`}>
            <div className="p-4 flex justify-between cursor-pointer" onClick={()=>setIsOpen(!isOpen)}>
                <div className="flex gap-4">
                    <div className="p-2 bg-slate-50 rounded-full h-10 w-10 flex items-center justify-center border"><FileText className="w-5 h-5 text-slate-500"/></div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] uppercase bg-slate-50">{task.action_type}</Badge>
                            <Badge variant="secondary" className="text-[10px] uppercase">{task.providers?.name}</Badge>
                            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-0 h-5">FEITO</Badge>}
                            {isRefused && <Badge variant="destructive" className="h-5">RECUSADO</Badge>}
                        </div>
                        <h3 className="font-bold text-slate-800">{task.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="bg-slate-50 px-2 py-0.5 rounded border">De: <strong>{task.requestor}</strong></span>
                            {task.due_date && <span>Prazo: {format(parseISO(task.due_date), 'dd/MM')}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isMyRequest && isPending && (
                        <div className="flex border-r pr-2 mr-2">
                            <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation();onEdit()}} className="text-slate-300 hover:text-indigo-600"><PenLine className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation();onDelete()}} className="text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4"/></Button>
                        </div>
                    )}
                    {isOpen?<ChevronUp className="w-5 h-5 text-slate-300"/>:<ChevronDown className="w-5 h-5 text-slate-300"/>}
                </div>
            </div>

            {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-50 pt-4 cursor-default" onClick={e=>e.stopPropagation()}>
                    <div className="bg-slate-50 p-4 rounded text-sm text-slate-600 whitespace-pre-wrap">{task.description || "Sem descrição."}</div>
                    
                    {/* ANEXOS ORIGINAIS (CLICÁVEIS) */}
                    {(task.link_url || task.attachment_url) && (
                        <div className="mt-3 flex gap-2 pt-2 border-t border-slate-200/50 flex-wrap">
                            {task.link_url && <a href={task.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs bg-white border px-2 py-1 rounded text-indigo-600 hover:bg-indigo-50"><LinkIcon className="w-3 h-3"/> Link Externo</a>}
                            
                            {/* CORREÇÃO DO DOWNLOAD: SÓ ABRE NOVA ABA SE FOR HTTP */}
                            {task.attachment_url && (
                                <a 
                                    href={isUrl(task.attachment_url) ? task.attachment_url : '#'} 
                                    target={isUrl(task.attachment_url) ? "_blank" : "_self"}
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs bg-white border px-2 py-1 rounded text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    onClick={(e) => {
                                        if (!isUrl(task.attachment_url)) {
                                            e.preventDefault(); 
                                            toast.info("Arquivo apenas nomeado (upload simulado): " + task.attachment_url);
                                        }
                                    }}
                                >
                                    <Download className="w-3 h-3"/> Baixar: {task.attachment_url.split('/').pop()}
                                </a>
                            )}
                        </div>
                    )}
                    
                    {/* RESPOSTA DO BARÃO */}
                    {isDone && (
                        <div className="mt-4 bg-emerald-50 border border-emerald-100 p-3 rounded">
                            <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold text-xs"><CheckCircle2 className="w-4 h-4"/> ENTREGA REALIZADA</div>
                            <p className="text-sm text-emerald-900">{task.response_comment}</p>
                            
                            {task.response_attachment_url && (
                                <div className="mt-2 flex gap-2 flex-wrap">
                                    {task.response_attachment_url.split(' | ').map((att: string, i: number) => (
                                        <a 
                                            key={i} 
                                            href={isUrl(att) ? att : '#'} 
                                            target={isUrl(att) ? "_blank" : "_self"}
                                            rel="noopener noreferrer"
                                            className="bg-white px-2 py-1 rounded text-xs border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center gap-1"
                                            onClick={(e) => !isUrl(att) && e.preventDefault()}
                                        >
                                            <ExternalLink className="w-3 h-3"/> {att.startsWith('http') ? 'Abrir Anexo' : att}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {isRefused && <div className="mt-4 bg-rose-50 border border-rose-100 p-3 rounded"><p className="text-xs font-bold text-rose-700 mb-1">RECUSA:</p><p className="text-sm text-rose-900">{task.refusal_reason}</p></div>}

                    <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-100">
                        {isMyResponsibility && isPending && (
                            <>
                                <Button variant="outline" onClick={(e)=>{e.stopPropagation();onRefuse()}} className="text-rose-600 border-rose-200 hover:bg-rose-50">Recusar</Button>
                                <Button onClick={(e)=>{e.stopPropagation();onResolve()}} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Resolver</Button>
                            </>
                        )}
                        {(isDone || isRefused) && viewMode === 'active' && (
                            <>
                                <Button variant="ghost" size="sm" onClick={onReopen} className="text-slate-400 hover:text-indigo-600"><RotateCcw className="w-4 h-4 mr-2"/> Reabrir</Button>
                                <Button variant="outline" onClick={()=>onArchive(true)} className="text-slate-500 border-slate-200"><Archive className="w-4 h-4 mr-2"/> Arquivar</Button>
                            </>
                        )}
                        {viewMode === 'archived' && <Button variant="outline" onClick={()=>onArchive(false)} className="text-slate-500 border-slate-200"><UploadCloud className="w-4 h-4 mr-2"/> Desarquivar</Button>}
                    </div>
                </div>
            )}
        </div>
    )
}

// 2. CARD PESSOAL (FLAT LIST STYLE)
function PersonalTaskCard({ task, onToggle, onDelete, onEdit, onToggleImportant, editingId, editState, setEditState, saveEdit, setEditingId, deleteConfirmId, companies }: any) {
    if (editingId === task.id) {
        return (
            <div className="py-2.5 px-3 border-b border-slate-100 bg-slate-50/50 rounded-lg">
                <div className="space-y-2 p-2">
                    <Input value={editState.text} onChange={(e) => setEditState({...editState, text: e.target.value})} className="h-8 text-sm bg-white" autoFocus />
                    <div className="flex gap-2">
                        <Select value={editState.context || "no_context"} onValueChange={(v) => setEditState({...editState, context: v})}><SelectTrigger className="h-7 text-xs bg-white flex-1"><SelectValue placeholder="Contexto"/></SelectTrigger><SelectContent><SelectItem value="no_context">-- Nenhum --</SelectItem>{companies?.map((c:any)=><SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>
                        <Input type="date" value={editState.date} onChange={(e) => setEditState({...editState, date: e.target.value})} className="h-7 text-xs bg-white w-28" />
                    </div>
                    <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-6 text-[10px]">Cancelar</Button><Button size="sm" onClick={saveEdit} className="h-6 text-[10px] bg-emerald-600 text-white">Salvar</Button></div>
                </div>
            </div>
        )
    }

    return (
        <div className="group flex items-center gap-2.5 py-2.5 px-3 rounded-lg border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
            <button onClick={onToggle} className={`shrink-0 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-colors ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}>
                {task.done && <CheckCircle2 className="w-3 h-3 text-white" />}
            </button>

            <button onClick={() => onToggleImportant(task.id)} className={`shrink-0 p-0.5 transition-colors ${task.important ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`} title="Marcar como importante">
                <Star className={`w-4 h-4 ${task.important ? 'fill-amber-400' : ''}`} />
            </button>

            <span onClick={() => onEdit(task)} className={`flex-1 text-sm cursor-pointer line-clamp-2 ${task.done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'} hover:text-emerald-700`}>{task.text}</span>

            <div className="flex items-center gap-2 shrink-0">
                {task.context && <Badge variant="outline" className="text-[9px] text-slate-500 font-normal px-1.5 py-0 h-4 border-slate-200 bg-slate-50">{task.context}</Badge>}
                {task.targetDate && (() => {
                    const date = parseISO(task.targetDate)
                    const overdue = !task.done && isPast(date) && !isToday(date)
                    return <span className={`text-[10px] flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}><CalendarDays className={`w-3 h-3 ${overdue ? 'text-red-400' : ''}`} /> {format(date, 'dd/MM')}{overdue && <span className="text-[8px] bg-red-50 text-red-500 rounded px-1 border border-red-100">atrasada</span>}</span>
                })()}
                {task.recurrence !== 'none' && <Repeat className="w-3 h-3 text-indigo-400" />}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(task)} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={onDelete} className={`p-1 rounded ${deleteConfirmId === task.id ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600'}`}>{deleteConfirmId === task.id ? <span className="text-[10px] font-medium">Confirma?</span> : <Trash2 className="w-3.5 h-3.5" />}</button>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, bg, border, alert, isActive, onClick }: any) {
    return <div onClick={onClick} className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer select-none ${isActive ? `ring-2 ring-slate-900 bg-white` : `bg-white hover:bg-slate-50`} ${alert ? 'border-red-200 ring-0 bg-red-50/30' : ''}`}><div className={`p-3 rounded-lg shadow-sm ${bg} ${color}`}><Icon className="w-6 h-6" /></div><div><span className="text-2xl font-black text-slate-800">{value}</span><p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p></div></div>
}