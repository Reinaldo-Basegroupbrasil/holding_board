"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, Play, Calendar as CalendarIcon, LayoutDashboard, FileText, Settings2,
  Loader2, Check, Users, Briefcase, GripVertical, Trash2, ArrowLeft, UploadCloud, Download, Pencil, X,
  Radar, ArrowRight
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAdmin } from "@/hooks/use-admin"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// Drag & Drop Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 group items-start mb-2 touch-none">
      <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 p-1">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${props.color}`} />
      <Textarea 
        value={props.text} 
        onChange={(e) => props.onChange(e.target.value)}
        className={`min-h-0 py-1.5 text-sm border-transparent hover:border-slate-200 bg-transparent shadow-none resize-none ${props.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}
        placeholder="Assunto..."
        rows={1}
      />
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-emerald-600" onClick={props.onCheck}>
        {props.checked ? <Check className="w-4 h-4 text-emerald-500" /> : <div className="w-3 h-3 border border-slate-300 rounded-full" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100" onClick={props.onDelete}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function WarRoom() {
  const { isAdmin } = useAdmin()
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'meeting'>('list')
  
  const [contexts, setContexts] = useState<any[]>([]) 
  const [responsibles, setResponsibles] = useState<any[]>([]) 
  const [meetingHistory, setMeetingHistory] = useState<any[]>([]) 

  const [selectedContext, setSelectedContext] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentMeeting, setCurrentMeeting] = useState<any>(null)
  
  // ESTADOS DE GESTÃO DE CONTEXTO (VOLTARAM)
  const [newContextName, setNewContextName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadInitialData = useCallback(async () => {
    // Carrega Contextos
    const { data: ctxs } = await supabase.from('meeting_contexts').select('*').order('name')
    if (ctxs) setContexts(ctxs)

    // CORREÇÃO: Busca direto da tabela 'providers' que você criou
    const { data: providersData } = await supabase
      .from('providers')
      .select('id, name, type')
      .order('name')

    if (providersData) {
      // Mapeia para o formato que o seletor entende
      const formattedList = providersData.map(p => ({
        id: p.id,
        name: p.name,
        // Lógica visual: Se tiver "SQUAD" no tipo, mostra ícone de prédio, senão ícone de pessoa
        type: p.type && p.type.includes('SQUAD') ? 'company' : 'person'
      }))
      setResponsibles(formattedList)
    }
  }, [supabase])

  const handleContextChange = (newContext: string) => {
    setSelectedContext(newContext)
    setCurrentMeeting(null)
    setViewMode('list')
    setMeetingHistory([])
  }

  // --- FUNÇÕES DE CRUD DE CONTEXTO (VOLTARAM) ---
  const handleAddContext = async () => {
    if (!newContextName) return
    setIsProcessing(true)
    const { error } = await supabase.from('meeting_contexts').insert({ name: newContextName })
    if (!error) { setNewContextName(""); await loadInitialData() }
    setIsProcessing(false)
  }
  const handleUpdateContext = async (id: string) => {
    if (!editValue) return
    setIsProcessing(true)
    const { error } = await supabase.from('meeting_contexts').update({ name: editValue }).eq('id', id)
    if (!error) { setEditingId(null); await loadInitialData() }
    setIsProcessing(false)
  }
  const handleDeleteContext = async (id: string) => {
    if (!confirm("Excluir este contexto?")) return
    setIsProcessing(true)
    const { error } = await supabase.from('meeting_contexts').delete().eq('id', id)
    if (!error) {
       await loadInitialData()
       if (selectedContext === contexts.find(c => c.id === id)?.name) setSelectedContext("")
    }
    setIsProcessing(false)
  }

  const getSecondColumnTitle = () => {
    if (!selectedContext) return "Pauta: Outros"
    const lower = selectedContext.toLowerCase()
    if (lower.includes('governança') || lower.includes('board') || lower.includes('projetos')) {
      return "Pauta: Armando"
    }
    return `Pauta: ${selectedContext}`
  }

  const fetchMeetingHistory = useCallback(async () => {
    if (!selectedContext) return
    setLoading(true)
    const { data } = await supabase
      .from('meetings')
      .select('id, title, date, status, general_decisions')
      .eq('context', selectedContext)
      .order('date', { ascending: false })
    setMeetingHistory(data || [])
    setLoading(false)
  }, [selectedContext, supabase])

  useEffect(() => {
    if (selectedContext && viewMode === 'list') {
      fetchMeetingHistory()
    }
  }, [selectedContext, viewMode, fetchMeetingHistory])

  useEffect(() => { loadInitialData() }, [loadInitialData])

  const handleCreateNewMeeting = async () => {
    if (!selectedContext) return
    setLoading(true)
    
    try {
      const { data: existingMeeting } = await supabase
        .from('meetings')
        .select('*')
        .eq('context', selectedContext)
        .eq('date', selectedDate)
        .maybeSingle()

      if (existingMeeting) {
        existingMeeting.agenda_reinaldo = existingMeeting.agenda_reinaldo?.map((i:any) => ({...i, id: i.id || crypto.randomUUID()})) || []
        existingMeeting.agenda_armando = existingMeeting.agenda_armando?.map((i:any) => ({...i, id: i.id || crypto.randomUUID()})) || []
        existingMeeting.general_decisions = existingMeeting.general_decisions?.map((i:any) => ({...i, id: i.id || crypto.randomUUID()})) || []
        existingMeeting.radar = existingMeeting.radar?.map((i:any) => ({...i, id: i.id || crypto.randomUUID()})) || []
        setCurrentMeeting(existingMeeting)
        setViewMode('meeting')
      } else {
        const { data: lastMeeting } = await supabase
          .from('meetings')
          .select('*')
          .eq('context', selectedContext)
          .lt('date', selectedDate)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle()

        const sanitize = (list: any[]) => list?.map(i => ({ ...i, done: false, id: crypto.randomUUID() })) || []
        
        const { data: newMeeting, error } = await supabase
          .from('meetings')
          .insert({
            title: `Reunião ${selectedContext}`,
            context: selectedContext,
            date: selectedDate,
            agenda_reinaldo: sanitize(lastMeeting?.agenda_reinaldo),
            agenda_armando: sanitize(lastMeeting?.agenda_armando),
            decisions: [],
            general_decisions: [],
            radar: lastMeeting?.radar?.map((i: any) => ({ ...i, id: crypto.randomUUID() })) || [],
            status: 'agendada'
          })
          .select().single()

        if (error) throw error
        if (newMeeting) {
          setCurrentMeeting(newMeeting)
          setViewMode('meeting')
        }
      }
    } catch (e: any) {
      alert("Erro: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenExisting = async (id: string) => {
    setLoading(true)
    const { data } = await supabase.from('meetings').select('*').eq('id', id).single()
    if (data) {
      data.agenda_reinaldo = data.agenda_reinaldo?.map((i:any) => ({...i, id: i.id || crypto.randomUUID()})) || []
      data.agenda_armando = data.agenda_armando?.map((i:any) => ({...i, id: i.id || crypto.randomUUID()})) || []
      data.general_decisions = data.general_decisions?.map((i:any) => ({...i, id: i.id || crypto.randomUUID()})) || []
      data.radar = data.radar?.map((i:any) => ({...i, id: i.id || crypto.randomUUID()})) || []
      setCurrentMeeting(data)
      setViewMode('meeting')
    }
    setLoading(false)
  }

  const handleDeleteMeeting = async () => {
    if (!confirm("Excluir esta reunião?")) return
    setLoading(true)
    await supabase.from('meetings').delete().eq('id', currentMeeting.id)
    setCurrentMeeting(null)
    setViewMode('list')
    const { data } = await supabase.from('meetings').select('*').eq('context', selectedContext).order('date', { ascending: false })
    setMeetingHistory(data || [])
    setLoading(false)
  }

  const handleFinalizeMeeting = async () => {
    if (!confirm("Isso criará as tarefas para os responsáveis. Continuar?")) return
    setLoading(true)
    try {
      const decisions = currentMeeting.decisions || []
      const user = (await supabase.auth.getUser()).data.user

      for (const item of decisions) {
        if (!item.processed && item.text && item.responsible_id) {
          await supabase.from('tasks').insert({
            title: item.text,
            provider_id: item.responsible_id, 
            created_by: user?.id,
            status: item.due_date ? 'em_andamento' : 'pendente',
            due_date: item.due_date || null,
            is_personal: false
          })
          item.processed = true
        }
      }

      await supabase.from('meetings').update({
        status: 'concluida',
        decisions: decisions,
        agenda_reinaldo: currentMeeting.agenda_reinaldo,
        agenda_armando: currentMeeting.agenda_armando,
        general_decisions: currentMeeting.general_decisions,
        radar: currentMeeting.radar
      }).eq('id', currentMeeting.id)

      alert("Reunião finalizada!")
      setViewMode('list')
      const { data } = await supabase.from('meetings').select('*').eq('context', selectedContext).order('date', { ascending: false })
      setMeetingHistory(data || [])
    } catch (e: any) { alert(e.message) } 
    finally { setLoading(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentMeeting) return
    setUploading(true)
    const file = e.target.files[0]
    const filePath = `${currentMeeting.id}/${file.name}`
    const { error } = await supabase.storage.from('meeting-files').upload(filePath, file)
    if (!error) {
       const { data } = supabase.storage.from('meeting-files').getPublicUrl(filePath)
       await updateMeetingData('transcript_url', data.publicUrl)
    } else {
        alert("Erro no upload: " + error.message)
    }
    setUploading(false)
  }

  const updateMeetingData = async (field: string, newData: any) => {
    setCurrentMeeting({ ...currentMeeting, [field]: newData })
    await supabase.from('meetings').update({ [field]: newData }).eq('id', currentMeeting.id)
  }

  const handleDragEnd = (event: any, field: string) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const list = currentMeeting[field]
      const oldIndex = list.findIndex((i: any) => i.id === active.id);
      const newIndex = list.findIndex((i: any) => i.id === over.id);
      updateMeetingData(field, arrayMove(list, oldIndex, newIndex));
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          {viewMode === 'meeting' && (
            <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Sala de Reuniões</h1>
            <p className="text-xs text-slate-500 uppercase font-semibold">
              {viewMode === 'list' ? "Histórico de Atas" : currentMeeting?.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedContext} onValueChange={handleContextChange}>
            <SelectTrigger className="w-[220px] font-bold"><SelectValue placeholder="Selecione Contexto" /></SelectTrigger>
            <SelectContent>{contexts.map((ctx) => <SelectItem key={ctx.id} value={ctx.name}>{ctx.name}</SelectItem>)}</SelectContent>
          </Select>

          {/* BOTÃO DE CONFIGURAÇÃO (ENGRENAGEM) RESTAURADO */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200 hover:bg-slate-50">
                <Settings2 className="w-4 h-4 text-slate-500" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader><DialogTitle>Gerenciar Contextos</DialogTitle></DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex gap-2">
                  <Input placeholder="Novo contexto..." value={newContextName} onChange={e => setNewContextName(e.target.value)} />
                  <Button onClick={handleAddContext} disabled={isProcessing}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {contexts.map((ctx) => (
                    <div key={ctx.id} className="flex justify-between p-2 bg-slate-50 border rounded group">
                      {editingId === ctx.id ? (
                        <div className="flex gap-1 w-full">
                          <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-8 text-xs" autoFocus />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => handleUpdateContext(ctx.id)}><Check className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm">{ctx.name}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(ctx.id); setEditValue(ctx.name) }}><Pencil className="w-3 h-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteContext(ctx.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {viewMode === 'list' && (
            <>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[150px] font-bold border-slate-200" />
              <Button onClick={handleCreateNewMeeting} disabled={!selectedContext || loading} className="bg-indigo-600 font-bold gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Nova / Abrir
              </Button>
            </>
          )}

          {viewMode === 'meeting' && currentMeeting && (
             <div className="flex gap-2 items-center">
               <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileUpload} />
               
               {isAdmin && (
                  <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={handleDeleteMeeting}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
               )}

               <Button variant="outline" className="gap-2 border-slate-300" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {currentMeeting.transcript_url ? "PDF Anexado" : "Transcrição"}
               </Button>
               
               {currentMeeting.transcript_url && (
                 <a href={currentMeeting.transcript_url} target="_blank" rel="noopener noreferrer">
                   <Button variant="ghost" size="icon" className="text-blue-600"><Download className="w-4 h-4" /></Button>
                 </a>
               )}
               
               <Button onClick={handleFinalizeMeeting} disabled={currentMeeting.status === 'concluida'} className={`${currentMeeting.status === 'concluida' ? 'bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700'} font-bold gap-2`}>
                  <Check className="w-4 h-4" /> {currentMeeting.status === 'concluida' ? 'Finalizada' : 'Finalizar Reunião'}
               </Button>
             </div>
          )}
        </div>
      </div>

      {/* MODO LISTA */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 gap-4">
          {!selectedContext && <div className="text-center py-20 text-slate-400">Selecione um contexto acima.</div>}
          {meetingHistory.map(meeting => (
            <Card key={meeting.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => handleOpenExisting(meeting.id)}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 rounded-full ${meeting.status === 'concluida' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <div>
                    <h3 className="font-bold text-slate-700">{meeting.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" /> {meeting.date ? meeting.date.split('-').reverse().join('/') : ''} 
                    </p>
                  </div>
                </div>
                <Badge variant={meeting.status === 'concluida' ? 'default' : 'outline'} className={meeting.status === 'concluida' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                  {meeting.status === 'concluida' ? 'Concluída' : 'Aberta'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODO REUNIÃO */}
      {viewMode === 'meeting' && currentMeeting && (
        <div className="grid grid-cols-12 gap-6 animate-in fade-in">
           
           {/* 1. MINHA PAUTA */}
           <Card className="col-span-12 lg:col-span-6 border-rose-100 shadow-sm h-fit">
            <CardHeader className="bg-rose-50/50 border-b py-3"><CardTitle className="text-sm text-rose-700 font-bold uppercase">Minha Pauta</CardTitle></CardHeader>
            <CardContent className="p-4">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'agenda_reinaldo')}>
                <SortableContext items={currentMeeting.agenda_reinaldo.map((i:any) => i.id)} strategy={verticalListSortingStrategy}>
                  {currentMeeting.agenda_reinaldo.map((item: any, idx: number) => (
                    <SortableItem 
                      key={item.id} id={item.id} text={item.text} checked={item.done} color="bg-rose-400"
                      onChange={(val: string) => {
                        const newAgenda = [...currentMeeting.agenda_reinaldo]; newAgenda[idx].text = val;
                        updateMeetingData('agenda_reinaldo', newAgenda);
                      }}
                      onCheck={() => {
                        const newAgenda = [...currentMeeting.agenda_reinaldo]; newAgenda[idx].done = !newAgenda[idx].done;
                        updateMeetingData('agenda_reinaldo', newAgenda);
                      }}
                      onDelete={() => {
                        const newAgenda = currentMeeting.agenda_reinaldo.filter((_:any, i:number) => i !== idx);
                        updateMeetingData('agenda_reinaldo', newAgenda);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="ghost" className="w-full text-rose-600 text-xs font-bold mt-2 border-dashed border-rose-200" onClick={() => {
                const newAgenda = [...currentMeeting.agenda_reinaldo, { id: crypto.randomUUID(), text: "", done: false }];
                updateMeetingData('agenda_reinaldo', newAgenda);
              }}>
                <Plus className="w-3 h-3 mr-1" /> Novo Assunto
              </Button>
            </CardContent>
          </Card>

          {/* 2. PAUTA OUTROS */}
          <Card className="col-span-12 lg:col-span-6 border-blue-100 shadow-sm h-fit">
            <CardHeader className="bg-blue-50/50 border-b py-3">
                <CardTitle className="text-sm text-blue-700 font-bold uppercase">
                    {getSecondColumnTitle()}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'agenda_armando')}>
                <SortableContext items={currentMeeting.agenda_armando.map((i:any) => i.id)} strategy={verticalListSortingStrategy}>
                  {currentMeeting.agenda_armando.map((item: any, idx: number) => (
                    <SortableItem 
                      key={item.id} id={item.id} text={item.text} checked={item.done} color="bg-blue-400"
                      onChange={(val: string) => {
                        const newAgenda = [...currentMeeting.agenda_armando]; newAgenda[idx].text = val;
                        updateMeetingData('agenda_armando', newAgenda);
                      }}
                      onCheck={() => {
                        const newAgenda = [...currentMeeting.agenda_armando]; newAgenda[idx].done = !newAgenda[idx].done;
                        updateMeetingData('agenda_armando', newAgenda);
                      }}
                      onDelete={() => {
                        const newAgenda = currentMeeting.agenda_armando.filter((_:any, i:number) => i !== idx);
                        updateMeetingData('agenda_armando', newAgenda);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="ghost" className="w-full text-blue-600 text-xs font-bold mt-2 border-dashed border-blue-200" onClick={() => {
                const newAgenda = [...currentMeeting.agenda_armando, { id: crypto.randomUUID(), text: "", done: false }];
                updateMeetingData('agenda_armando', newAgenda);
              }}>
                <Plus className="w-3 h-3 mr-1" /> Novo Assunto
              </Button>
            </CardContent>
          </Card>

          {/* 3. DECISÕES GERAIS */}
          <Card className="col-span-12 lg:col-span-4 border-slate-200 shadow-sm h-fit">
              <CardHeader className="bg-slate-50/50 border-b py-3"><CardTitle className="text-sm text-slate-700 font-bold uppercase flex gap-2"><FileText className="w-4 h-4" /> Decisões Gerais (Registros)</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-2">
                {currentMeeting.general_decisions?.map((item: any, idx: number) => (
                   <div key={item.id || idx} className="flex gap-2 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-2.5" />
                      <Textarea 
                        value={item.text} 
                        onChange={(e) => {
                          const newList = [...(currentMeeting.general_decisions || [])]
                          newList[idx].text = e.target.value
                          updateMeetingData('general_decisions', newList)
                        }}
                        className="min-h-0 py-1.5 text-xs bg-transparent border-transparent hover:border-slate-200 shadow-none resize-none"
                        placeholder="Registre uma decisão..."
                        rows={1}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-rose-500" onClick={() => {
                          const newList = currentMeeting.general_decisions.filter((_:any, i:number) => i !== idx)
                          updateMeetingData('general_decisions', newList)
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                   </div>
                ))}
                <Button variant="ghost" className="w-full text-slate-500 text-xs font-bold mt-2 border-dashed border-slate-200" onClick={() => {
                   const newList = [...(currentMeeting.general_decisions || []), { id: crypto.randomUUID(), text: "" }]
                   updateMeetingData('general_decisions', newList)
                }}>
                  <Plus className="w-3 h-3 mr-1" /> Registrar Decisão
                </Button>
              </CardContent>
          </Card>

          {/* 4. ENCAMINHAMENTOS */}
          <Card className="col-span-12 lg:col-span-4 border-emerald-100 shadow-sm h-fit">
              <CardHeader className="bg-emerald-50/50 border-b py-3"><CardTitle className="text-sm text-emerald-700 font-bold uppercase">Encaminhamentos (Gera Tarefa)</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                {currentMeeting.decisions?.map((decision: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-lg bg-white shadow-sm space-y-2 relative">
                    <div className="flex gap-2 items-start">
                       <Button variant="ghost" size="icon" className="h-6 w-6 mt-0.5 shrink-0" onClick={() => {
                          const newDecs = [...currentMeeting.decisions]; 
                          newDecs[idx].done = !newDecs[idx].done;
                          updateMeetingData('decisions', newDecs);
                       }}>
                          {decision.done ? <Check className="w-4 h-4 text-emerald-500" /> : <div className="w-3 h-3 border rounded-full border-slate-300" />}
                       </Button>
                       <Textarea 
                        value={decision.text} 
                        disabled={currentMeeting.status === 'concluida'}
                        onChange={(e) => {
                          const newDecs = [...currentMeeting.decisions]; newDecs[idx].text = e.target.value;
                          updateMeetingData('decisions', newDecs);
                        }}
                        className={`min-h-0 text-xs font-bold border-none p-0 focus-visible:ring-0 shadow-none resize-none ${decision.done ? 'line-through text-slate-400' : ''}`}
                        placeholder="O que deve ser feito?"
                        rows={1}
                      />
                    </div>
                    
                    {!decision.is_personal && (
                      <div className="space-y-2">
                       <Select 
                        disabled={currentMeeting.status === 'concluida'}
                        value={decision.responsible_id || ""} 
                        onValueChange={(val) => {
                          const newDecs = [...currentMeeting.decisions]; newDecs[idx].responsible_id = val;
                          updateMeetingData('decisions', newDecs);
                        }}
                       >
                         <SelectTrigger className="h-7 text-[10px] w-full bg-slate-100 border-none"><SelectValue placeholder="Responsável (SLA)..." /></SelectTrigger>
                         <SelectContent>
                           {responsibles.map(r => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.type === 'person' ? '👤 ' : '🏢 '} {r.name}
                              </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       <div className="flex gap-1.5">
                         <Select
                           disabled={currentMeeting.status === 'concluida'}
                           value={decision.due_date?.split(' - ')[0] || ""}
                           onValueChange={(m) => {
                             const newDecs = [...currentMeeting.decisions];
                             const week = newDecs[idx].due_date?.split(' - ')[1] || 'W1';
                             newDecs[idx].due_date = `${m} - ${week}`;
                             updateMeetingData('decisions', newDecs);
                           }}
                         >
                           <SelectTrigger className="h-7 text-[10px] flex-1 bg-slate-50 border-none"><SelectValue placeholder="Mês..." /></SelectTrigger>
                           <SelectContent>
                             {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map(m => (
                               <SelectItem key={m} value={m}>{m}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         <Select
                           disabled={currentMeeting.status === 'concluida'}
                           value={decision.due_date?.split(' - ')[1] || ""}
                           onValueChange={(w) => {
                             const newDecs = [...currentMeeting.decisions];
                             const month = newDecs[idx].due_date?.split(' - ')[0] || '';
                             newDecs[idx].due_date = month ? `${month} - ${w}` : w;
                             updateMeetingData('decisions', newDecs);
                           }}
                         >
                           <SelectTrigger className="h-7 text-[10px] w-[70px] bg-slate-50 border-none"><SelectValue placeholder="W..." /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="W1">W1</SelectItem>
                             <SelectItem value="W2">W2</SelectItem>
                             <SelectItem value="W3">W3</SelectItem>
                             <SelectItem value="W4">W4</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                      </div>
                    )}
                    {decision.processed && <div className="absolute top-2 right-2 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">ENVIADO</div>}
                  </div>
                ))}
                <Button disabled={currentMeeting.status === 'concluida'} variant="outline" className="w-full text-emerald-700 text-xs font-bold border-dashed border-emerald-300" onClick={() => {
                   const newDecisions = [...(currentMeeting.decisions || []), { text: "", responsible_id: null, processed: false, done: false }];
                   updateMeetingData('decisions', newDecisions);
                }}>
                  <Plus className="w-3 h-3 mr-2" /> Novo Encaminhamento
                </Button>
              </CardContent>
          </Card>

          {/* 5. RADAR */}
          <Card className="col-span-12 lg:col-span-4 border-amber-200 shadow-sm h-fit">
              <CardHeader className="bg-amber-50/50 border-b py-3">
                <CardTitle className="text-sm text-amber-700 font-bold uppercase flex gap-2">
                  <Radar className="w-4 h-4" /> Radar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {(currentMeeting.radar || []).map((item: any, idx: number) => (
                   <div key={item.id || idx} className="flex gap-2 items-start group">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2.5" />
                      <Textarea 
                        value={item.text} 
                        onChange={(e) => {
                          const newList = [...(currentMeeting.radar || [])]
                          newList[idx].text = e.target.value
                          updateMeetingData('radar', newList)
                        }}
                        className="min-h-0 py-1.5 text-xs bg-transparent border-transparent hover:border-amber-200 shadow-none resize-none"
                        placeholder="Assunto no radar..."
                        rows={1}
                      />
                      <Button 
                        variant="ghost" size="icon" 
                        className="h-7 w-7 shrink-0 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100" 
                        title="Mover para Minha Pauta"
                        onClick={() => {
                          const radarItem = currentMeeting.radar[idx]
                          const newRadar = currentMeeting.radar.filter((_:any, i:number) => i !== idx)
                          const newAgenda = [...currentMeeting.agenda_reinaldo, { id: crypto.randomUUID(), text: radarItem.text, done: false }]
                          setCurrentMeeting({ ...currentMeeting, radar: newRadar, agenda_reinaldo: newAgenda })
                          supabase.from('meetings').update({ radar: newRadar, agenda_reinaldo: newAgenda }).eq('id', currentMeeting.id)
                        }}
                      >
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" size="icon" 
                        className="h-7 w-7 shrink-0 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100" 
                        onClick={() => {
                          const newList = currentMeeting.radar.filter((_:any, i:number) => i !== idx)
                          updateMeetingData('radar', newList)
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                   </div>
                ))}
                <Button variant="ghost" className="w-full text-amber-600 text-xs font-bold mt-2 border-dashed border-amber-200" onClick={() => {
                   const newList = [...(currentMeeting.radar || []), { id: crypto.randomUUID(), text: "" }]
                   updateMeetingData('radar', newList)
                }}>
                  <Plus className="w-3 h-3 mr-1" /> Novo Item
                </Button>
              </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}