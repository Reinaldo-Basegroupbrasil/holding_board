"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2, UploadCloud, Send } from "lucide-react"
import { toast } from "sonner"

interface NewBoardTaskBtnProps {
  providers: { id: string; name: string }[]
  currentUser: string 
}

export function NewBoardTaskBtn({ providers, currentUser }: NewBoardTaskBtnProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string>("")
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const file = (e.target as any).file_upload.files[0]
    
    // Começa assumindo que o anexo é o link externo (se houver)
    let finalAttachmentUrl = formData.get('link_url') as string 

    // --- LÓGICA DE UPLOAD REAL ---
    if (file) {
        try {
            // 1. Gera nome único para evitar conflitos
            const fileExt = file.name.split('.').pop()
            const filePath = `tasks/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

            // 2. Upload para o Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('board-uploads')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 3. Obter URL Pública
            const { data } = supabase.storage
                .from('board-uploads')
                .getPublicUrl(filePath)
            
            finalAttachmentUrl = data.publicUrl // Substitui o link pelo arquivo real
            
        } catch (error: any) {
            console.error("Erro upload:", error)
            toast.error("Falha ao subir arquivo: " + error.message)
            setLoading(false)
            return
        }
    }

    const payload = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        provider_id: formData.get('provider_id'),
        action_type: formData.get('action_type'),
        due_date: formData.get('due_date') || null,
        link_url: formData.get('link_url'),
        attachment_url: finalAttachmentUrl, // Salva a URL gerada ou o link
        requestor: currentUser,
        status: 'pendente',
        origin: 'board'
    }

    const { error } = await supabase.from('board_tasks').insert(payload)

    setLoading(false)
    if (!error) {
        setOpen(false)
        setFileName("")
        toast.success("Tarefa delegada com sucesso!")
        router.refresh()
    } else {
        toast.error("Erro ao criar: " + error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Nova Pendência
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto bg-white text-slate-900 p-5">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold text-slate-800">Delegar Tarefa</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Preencha os detalhes da demanda para o responsável.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          <div className="grid gap-1.5">
            <Label className="font-bold text-slate-700 text-sm">O que precisa ser feito?</Label>
            <Input name="title" required placeholder="Ex: Assinar contrato da Holding" className="border-slate-300" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
                <Label className="font-bold text-slate-700 text-sm">Responsável</Label>
                <Select name="provider_id" required>
                    <SelectTrigger className="bg-white border-slate-300 w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-white max-h-[200px]">
                        {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-1.5">
                <Label className="font-bold text-slate-700 text-sm">Tipo de Ação</Label>
                <Select name="action_type" defaultValue="envio">
                    <SelectTrigger className="bg-white border-slate-300 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
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
                <Label className="font-bold text-slate-700 text-sm">Prioridade</Label>
                <Select name="priority" defaultValue="media">
                    <SelectTrigger className="bg-white border-slate-300 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="alta">🔥 Alta</SelectItem>
                        <SelectItem value="media">⚡ Média</SelectItem>
                        <SelectItem value="baixa">☕ Baixa</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-1.5">
                <Label className="font-bold text-slate-700 text-sm">Prazo Limite</Label>
                <Input type="date" name="due_date" className="bg-white border-slate-300 w-full" />
            </div>
          </div>

          {/* ÁREA DE ANEXO (ARQUIVO REAL) */}
          <div className="grid gap-1.5">
            <Label className="font-bold text-slate-700 text-sm">Anexar Arquivo</Label>
            <div className="relative group cursor-pointer">
                <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors pointer-events-none">
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1"/>
                    <span className="text-xs text-slate-500 font-medium truncate px-2">
                        {fileName || "Clique para selecionar arquivo do computador"}
                    </span>
                </div>
                <Input 
                    type="file" 
                    name="file_upload"
                    className="opacity-0 cursor-pointer h-16 w-full z-10"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
            </div>
          </div>

          {/* ÁREA DE LINK */}
          <div className="grid gap-1.5">
            <Label className="font-bold text-slate-700 text-sm">Ou Link do Documento</Label>
            <Input name="link_url" placeholder="https://..." className="bg-white border-slate-300" />
          </div>

          <div className="grid gap-1.5">
            <Label className="font-bold text-slate-700 text-sm">Detalhamento</Label>
            <Textarea name="description" placeholder="Instruções claras..." className="resize-none h-20 bg-white border-slate-300" />
          </div>

          <DialogFooter className="mt-2 sm:justify-end pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mr-2 h-10">Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white h-10 font-bold px-6">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Delegar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}