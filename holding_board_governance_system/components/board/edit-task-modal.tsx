"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, UploadCloud, FileText, X } from "lucide-react"
import { toast } from "sonner"

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: any
  providers: any[]
  onSuccess: () => void
}

export function EditTaskModal({ isOpen, onClose, task, providers, onSuccess }: EditTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [currentFileUrl, setCurrentFileUrl] = useState("")
  const [newFile, setNewFile] = useState<File | null>(null)
  
  // Sincroniza dados ao abrir
  useEffect(() => {
      if(task) {
          setCurrentFileUrl(task.attachment_url || "")
          setNewFile(null)
      }
  }, [task, isOpen])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    
    // --- LÓGICA DE UPLOAD REAL ---
    let finalAttachmentUrl = currentFileUrl; // Começa assumindo que mantém o antigo
    
    if (newFile) {
        try {
            // 1. Gera nome único
            const fileExt = newFile.name.split('.').pop()
            const filePath = `tasks/${Date.now()}_edited_${Math.random().toString(36).substring(7)}.${fileExt}`

            // 2. Upload para o Storage
            const { error: uploadError } = await supabase.storage
                .from('board-uploads')
                .upload(filePath, newFile)

            if (uploadError) throw uploadError

            // 3. Pega URL Pública
            const { data } = supabase.storage
                .from('board-uploads')
                .getPublicUrl(filePath)
            
            finalAttachmentUrl = data.publicUrl
            
        } catch (error: any) {
            toast.error("Erro ao subir arquivo: " + error.message)
            setLoading(false)
            return // Para a execução se o upload falhar
        }
    } else if (currentFileUrl === "" && !newFile) {
        // Se o usuário limpou o arquivo (clicou no X) e não subiu outro
        finalAttachmentUrl = ""
    }

    // --- ATUALIZAÇÃO NO BANCO ---
    const updates = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        provider_id: formData.get('provider_id'),
        action_type: formData.get('action_type'),
        due_date: formData.get('due_date') || null,
        link_url: formData.get('link_url'),
        attachment_url: finalAttachmentUrl, // Salva a URL real ou a antiga
    }

    const { error } = await supabase.from('board_tasks').update(updates).eq('id', task.id)

    setLoading(false)
    if (!error) {
        toast.success("Demanda atualizada com sucesso!")
        onSuccess()
        onClose()
    } else {
        toast.error("Erro ao atualizar: " + error.message)
    }
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>Editar Demanda</DialogTitle>
          <DialogDescription>Edite os detalhes ou substitua o arquivo.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="grid gap-4 py-2">
          
          <div className="grid gap-1.5">
            <Label className="font-bold text-slate-700">Título</Label>
            <Input name="title" defaultValue={task.title} required className="font-bold" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
                <Label className="font-bold text-slate-700">Responsável</Label>
                <Select name="provider_id" defaultValue={task.provider_id}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {providers?.map((p:any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-1.5">
                <Label className="font-bold text-slate-700">Tipo de Ação</Label>
                <Select name="action_type" defaultValue={task.action_type}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="envio">📤 Apenas Envio</SelectItem>
                        <SelectItem value="assinatura">✍️ Assinatura</SelectItem>
                        <SelectItem value="pagamento">💰 Pagamento</SelectItem>
                        <SelectItem value="revisao">👀 Revisão</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="grid gap-1.5">
                <Label className="font-bold text-slate-700">Prioridade</Label>
                <Select name="priority" defaultValue={task.priority}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="alta">🔥 Alta</SelectItem>
                        <SelectItem value="media">⚡ Média</SelectItem>
                        <SelectItem value="baixa">☕ Baixa</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-1.5">
                <Label className="font-bold text-slate-700">Prazo Limite</Label>
                <Input type="date" name="due_date" defaultValue={task.due_date} className="bg-white" />
            </div>
          </div>

          {/* ARQUIVO - SELETOR DE ARQUIVO REAL */}
          <div className="grid gap-1.5 p-3 bg-slate-50 rounded border border-slate-200">
            <Label className="font-bold text-slate-700 flex items-center gap-2">
                <UploadCloud className="w-4 h-4" /> Arquivo / Anexo
            </Label>
            
            {/* Mostra o arquivo atual se existir */}
            {currentFileUrl && !newFile && (
                <div className="flex items-center justify-between gap-2 text-xs text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100 mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[300px]">
                            {/* Mostra apenas o nome do arquivo, não a URL inteira */}
                            {currentFileUrl.split('/').pop()}
                        </span>
                    </div>
                    <button type="button" onClick={() => setCurrentFileUrl("")} className="text-indigo-400 hover:text-indigo-900" title="Remover arquivo atual">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Input de Arquivo Real */}
            <div className="relative group cursor-pointer">
                <div className="absolute inset-0 border border-dashed border-slate-300 rounded-md flex items-center justify-center pointer-events-none group-hover:bg-white transition-colors">
                    <span className="text-xs text-slate-500">
                        {newFile ? `Novo: ${newFile.name}` : (currentFileUrl ? "Clique para substituir..." : "Clique para anexar arquivo...")}
                    </span>
                </div>
                <Input 
                    type="file" 
                    className="opacity-0 cursor-pointer h-9"
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            setNewFile(e.target.files[0])
                        }
                    }}
                />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="font-bold text-slate-700">Link Externo</Label>
            <Input name="link_url" defaultValue={task.link_url} className="bg-white" placeholder="https://..." />
          </div>

          <div className="grid gap-1.5">
            <Label className="font-bold text-slate-700">Detalhamento</Label>
            <Textarea name="description" defaultValue={task.description} className="resize-none h-24 bg-white" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}