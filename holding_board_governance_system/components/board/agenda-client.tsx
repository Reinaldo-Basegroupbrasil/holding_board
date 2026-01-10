"use client"

import { useState, useEffect, useRef } from "react"
import { format, addDays, addWeeks, addMonths, isSameMonth, isSameWeek, parseISO, isPast, isToday, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  CheckCircle2, AlertCircle, Calendar, Briefcase, 
  Link as LinkIcon, ChevronDown, ChevronUp, UploadCloud, Loader2, Download, User, 
  Plus, Trash2, CheckSquare, Send, FileText, PenTool, DollarSign, History, Edit2, Repeat, XCircle, Archive, RotateCcw, PenLine, Filter, CalendarDays, ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import { completeBoardTask } from "@/app/actions/board-actions"
// @ts-ignore
import { addPersonalTaskAction, togglePersonalTaskAction, deletePersonalTaskAction, editPersonalTaskAction } from "@/app/actions/personal-tasks"
import { EditTaskModal } from "./edit-task-modal" 

// --- TIPOS CORRIGIDOS ---
type PersonalTask = {
    id: string // Agora é string para aceitar UUIDs do banco
    text: string
    context?: string 
    done: boolean
    doneAt?: string
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
    targetDate?: string 
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
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(new Date()); const [showOverdueOnly, setShowOverdueOnly] = useState(false); const datePickerRef = useRef<HTMLInputElement>(null); const [showHistory, setShowHistory] = useState(false)
  
  // Edição Pessoal (IDs agora são strings)
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null); 
  
  const [editState, setEditState] = useState<{text: string, context: string, recurrence: 'none' | 'daily' | 'weekly' | 'monthly', date: string}>({ text: '', context: '', recurrence: 'none', date: '' })
  const [historyFilter, setHistoryFilter] = useState("month")

  // ESTADOS HOLDING
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

  // --- KPI ---
  const overdueHoldingCount = filteredHoldingTasks.filter((t: any) => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && !['concluido','recusado'].includes(t.status)).length
  const overduePersonalCount = personalTasks.filter(t => !t.done && t.targetDate && isPast(parseISO(t.targetDate)) && !isToday(parseISO(t.targetDate))).length
  const totalOverdue = overdueHoldingCount + overduePersonalCount

  const handleOverdueClick = () => {
    if (showOverdueOnly) { setShowOverdueOnly(false); return }
    if (totalOverdue === 0) { toast.success("Tudo em dia!"); return }
    setShowOverdueOnly(true)
    if (overdueHoldingCount > 0) setActiveView('holding')
    else setActiveView('personal')
  }

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
    let dateToSave = newDate
    if (!dateToSave && selectedDateFilter) {
        dateToSave = format(selectedDateFilter, 'yyyy-MM-dd')
    }
    const tempId = Math.random().toString()
    const newTask: PersonalTask = { id: tempId, text: newTaskText, context: (newContext && newContext !== 'no_context') ? newContext : undefined, done: false, recurrence: newRecurrence, targetDate: dateToSave || undefined }
    setPersonalTasks([newTask, ...personalTasks])
    setNewTaskText(""); setNewRecurrence('none');
    
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
    if(showOverdueOnly) return l.filter(t => t.targetDate && isPast(parseISO(t.targetDate)) && !isToday(parseISO(t.targetDate)))
    if(selectedDateFilter) return l.filter(t => !t.targetDate || isSameDay(parseISO(t.targetDate), selectedDateFilter))
    return l.filter(t => !t.targetDate).sort((a,b) => (a.targetDate && !b.targetDate ? 1 : -1))
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Pendências Holding" value={filteredHoldingTasks.filter((t:any)=>!['concluido','recusado'].includes(t.status)).length} icon={Briefcase} bg="bg-indigo-600" color="text-white" isActive={activeView==='holding'} onClick={()=>{setActiveView('holding');setShowOverdueOnly(false)}} />
          <StatCard label="Tarefas Pessoais" value={personalTasks.filter(t=>!t.done).length} icon={CheckSquare} bg="bg-emerald-50" color="text-emerald-600" isActive={activeView==='personal'} onClick={()=>{setActiveView('personal');setShowOverdueOnly(false)}} />
          <div onClick={handleOverdueClick} className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer ${showOverdueOnly?'ring-2 ring-red-200 bg-red-50':'bg-white hover:border-red-200'}`}><div className={`p-3 rounded-lg ${showOverdueOnly?'bg-red-200 text-red-700':'bg-red-50 text-red-600'}`}><AlertCircle className="w-6 h-6"/></div><div><span className="text-2xl font-black text-slate-800">{totalOverdue}</span><p className="text-[10px] font-bold text-slate-400 uppercase">Atrasados</p></div></div>
      </div>

      {/* VIEW HOLDING */}
      {activeView === 'holding' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
                <Tabs defaultValue="all" className="w-auto"><TabsList><TabsTrigger value="all">Todas as Demandas</TabsTrigger></TabsList></Tabs>
                <div className="flex gap-2">
                    <Button variant={viewMode==='active'?'secondary':'ghost'} size="sm" onClick={()=>setViewMode('active')}>Ativos</Button>
                    <Button variant={viewMode==='archived'?'secondary':'ghost'} size="sm" onClick={()=>setViewMode('archived')}>Arquivados</Button>
                </div>
            </div>
            <div className="space-y-3">
                {filteredHoldingTasks.length === 0 && <div className="text-center py-12 text-slate-400">Nenhuma demanda encontrada neste filtro.</div>}
                {filteredHoldingTasks.map((task: any) => (
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
          <div className={`bg-white rounded-2xl border shadow-sm p-6 min-h-[500px] relative ${showOverdueOnly ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200 border-t-4 border-t-emerald-500'}`}>
                {showOverdueOnly && <div className="mb-4 p-2 bg-red-50 rounded text-xs text-red-600 font-bold text-center border border-red-100">Exibindo apenas Tarefas Pessoais Atrasadas</div>}
                
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-emerald-600" /> Minha Pauta Pessoal</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs text-slate-500 hover:text-emerald-600">{showHistory ? "Voltar para Pendentes" : "Ver Histórico de Concluídos"} <History className="w-3.5 h-3.5 ml-2" /></Button>
                </div>

                {!showHistory && (
                    <>
                        {/* CALENDÁRIO (RESTAURADO) */}
                        {!showOverdueOnly && (
                            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                                <button onClick={() => setSelectedDateFilter(null)} className={`flex flex-col items-center justify-center min-w-[70px] h-14 rounded-lg border transition-all ${selectedDateFilter === null ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}><span className="text-[10px] font-bold uppercase">Backlog</span><Filter className="w-4 h-4 mt-1" /></button>
                                {weekDays.map((date) => {
                                    const isSelected = selectedDateFilter && isSameDay(date, selectedDateFilter)
                                    const isTodayDate = isToday(date)
                                    return (
                                        <button key={date.toString()} onClick={() => setSelectedDateFilter(date)} className={`flex flex-col items-center justify-center min-w-[70px] h-14 rounded-lg border transition-all relative ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50'}`}>
                                            {isTodayDate && !isSelected && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                                            <span className="text-[10px] font-bold uppercase">{format(date, 'EEE', { locale: ptBR })}</span>
                                            <span className="text-lg font-bold leading-none">{format(date, 'dd')}</span>
                                        </button>
                                    )
                                })}
                                <div className="h-10 w-px bg-slate-200 mx-1"></div>
                                <div className="relative">
                                    <button onClick={() => datePickerRef.current?.showPicker()} className="flex flex-col items-center justify-center min-w-[60px] h-14 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><CalendarDays className="w-5 h-5" /><span className="text-[9px] mt-1 font-medium">Outro</span></button>
                                    <input type="date" ref={datePickerRef} className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0" onChange={(e) => { if (e.target.value) setSelectedDateFilter(parseISO(e.target.value)) }} />
                                </div>
                            </div>
                        )}

                        {/* FORMULÁRIO COMPLETO (RESTAURADO COM A FUNÇÃO CORRETA) */}
                        {!showOverdueOnly && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner mb-6">
                                <form onSubmit={addPersonalTask} className="space-y-3">
                                    <div className="flex gap-3"><Input placeholder={`Adicionar para ${selectedDateFilter ? format(selectedDateFilter, "dd/MM") : 'o Backlog'}...`} className="h-10 text-sm border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-lg px-4 flex-1 shadow-sm" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} autoFocus /><Button type="submit" size="icon" className="h-10 w-10 bg-slate-900 hover:bg-slate-800 shrink-0 rounded-lg shadow-sm"><Plus className="w-5 h-5" /></Button></div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="flex-1"><Select value={newContext} onValueChange={setNewContext}><SelectTrigger className="h-8 text-xs border-slate-200 bg-white text-slate-600 w-full"><SelectValue placeholder="Empresa / Contexto" /></SelectTrigger><SelectContent><SelectItem value="no_context">-- Nenhum --</SelectItem>{companies?.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                                        <div className="w-full sm:w-[130px]"><Input type="date" className="h-8 text-xs border-slate-200 bg-white text-slate-600 px-2" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
                                        <div className="w-full sm:w-[130px]"><Select value={newRecurrence} onValueChange={(v:any) => setNewRecurrence(v)}><SelectTrigger className="h-8 text-xs border-slate-200 bg-white text-slate-600 w-full"><SelectValue placeholder="Repetir?" /></SelectTrigger><SelectContent><SelectItem value="none">Não repetir</SelectItem><SelectItem value="daily">Todo Dia</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent></Select></div>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="space-y-3">
                            {getVisiblePersonalTasks().length === 0 ? <div className="text-center py-16 text-slate-300"><p className="text-sm">{showOverdueOnly ? "Nenhum atraso pendente!" : "Nada agendado para este dia."}</p></div> : 
                                getVisiblePersonalTasks().map(pt => (
                                    <PersonalTaskCard 
                                        key={pt.id} task={pt} 
                                        onToggle={() => togglePersonalTask(pt.id)} 
                                        onDelete={() => handleDeleteClick(pt.id)}
                                        onEdit={startEditing}
                                        editingId={editingId} editState={editState} setEditState={setEditState}
                                        saveEdit={saveEdit} setEditingId={setEditingId}
                                        deleteConfirmId={deleteConfirmId}
                                        companies={companies}
                                    />
                                ))
                            }
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

// 2. CARD PESSOAL (MANTIDO)
function PersonalTaskCard({ task, onToggle, onDelete, onEdit, editingId, editState, setEditState, saveEdit, setEditingId, deleteConfirmId, companies }: any) {
    return (
        <div className="group flex flex-col p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-200">
            <div className="flex items-start gap-3">
                <button onClick={onToggle} className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center ${task.done?'bg-emerald-500 border-emerald-500':'border-slate-300 hover:border-emerald-500'}`}>{task.done && <CheckCircle2 className="w-3.5 h-3.5 text-white"/>}</button>
                <div className="flex-1">
                    {editingId === task.id ? (
                        <div className="space-y-2 p-2 bg-slate-50 rounded border border-indigo-100">
                            <Input value={editState.text} onChange={(e) => setEditState({...editState, text: e.target.value})} className="h-8 text-sm bg-white" />
                            <div className="flex gap-2">
                                <Select value={editState.context || "no_context"} onValueChange={(v) => setEditState({...editState, context: v})}><SelectTrigger className="h-7 text-xs bg-white flex-1"><SelectValue placeholder="Contexto"/></SelectTrigger><SelectContent><SelectItem value="no_context">-- Nenhum --</SelectItem>{companies?.map((c:any)=><SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>
                                <Input type="date" value={editState.date} onChange={(e) => setEditState({...editState, date: e.target.value})} className="h-7 text-xs bg-white w-28" />
                            </div>
                            <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-6 text-[10px]">Cancelar</Button><Button size="sm" onClick={saveEdit} className="h-6 text-[10px] bg-indigo-600 text-white">Salvar</Button></div>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span onClick={() => onEdit(task)} className={`text-sm cursor-pointer hover:text-indigo-600 ${task.done?'text-slate-400 line-through':'text-slate-800 font-medium'}`}>{task.text}</span>
                                {task.context && <Badge variant="outline" className="text-[9px] text-slate-500 font-normal px-1.5 py-0 h-4 border-slate-200 bg-slate-50">{task.context}</Badge>}
                            </div>
                            {(task.targetDate || task.recurrence !== 'none') && <div className="flex gap-3 mt-1">{task.targetDate && <span className="text-[10px] text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {format(parseISO(task.targetDate), 'dd/MM')}</span>}{task.recurrence!=='none' && <span className="text-[10px] text-indigo-400 flex items-center gap-1"><Repeat className="w-3 h-3"/> Repete</span>}</div>}
                        </div>
                    )}
                </div>
                {editingId !== task.id && <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => onEdit(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={onDelete} className={`p-1.5 rounded ${deleteConfirmId===task.id?'bg-red-100 text-red-600':'text-slate-400 hover:text-red-600'}`}>{deleteConfirmId===task.id?<span className="text-[10px]">Confirma?</span>:<Trash2 className="w-3.5 h-3.5"/>}</button></div>}
            </div>
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, bg, border, alert, isActive, onClick }: any) {
    return <div onClick={onClick} className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer select-none ${isActive ? `ring-2 ring-slate-900 bg-white` : `bg-white hover:bg-slate-50`} ${alert ? 'border-red-200 ring-0 bg-red-50/30' : ''}`}><div className={`p-3 rounded-lg shadow-sm ${bg} ${color}`}><Icon className="w-6 h-6" /></div><div><span className="text-2xl font-black text-slate-800">{value}</span><p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p></div></div>
}