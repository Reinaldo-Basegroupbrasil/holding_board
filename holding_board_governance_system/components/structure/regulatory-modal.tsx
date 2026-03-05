"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShieldCheck, Plus, Trash2, FileText, UploadCloud, Loader2, ExternalLink, AlertCircle, Pencil, X, Check, Ban, Download } from "lucide-react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { useAdmin } from "@/hooks/use-admin"

interface RegulatoryModalProps {
    company: any;
    onDataChange?: () => void;
}

export function RegulatoryModal({ company, onDataChange }: RegulatoryModalProps) {
  // 🚀 ATUALIZAÇÃO: Pegamos as novas permissões e o e-mail do usuário logado
  const { isAdmin, isManager, userEmail } = useAdmin()
  
  // Definimos que tanto Admin quanto Manager podem gerenciar documentos
  const canManage = isAdmin || isManager

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false) 
  const [exportCategory, setExportCategory] = useState<string>('all')
  const [docs, setDocs] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const router = useRouter()
  
  const [docName, setDocName] = useState("")
  const [docCategory, setDocCategory] = useState("LEGAL")
  const [docDate, setDocDate] = useState("")
  const [hasDocument, setHasDocument] = useState(true) 
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchDocs = useCallback(async () => {
    const { data, error } = await supabase
      .from('regulatory_docs')
      .select('*')
      .eq('company_id', company.id)
      .order('status', { ascending: true }) 
      .order('expiration_date', { ascending: true, nullsFirst: false })
      
    if (data) setDocs(data)
  }, [company.id, supabase])

  useEffect(() => {
    if (open) fetchDocs()
  }, [open, fetchDocs])

  const resetForm = () => {
    setDocName("")
    setDocCategory("LEGAL")
    setDocDate("")
    setHasDocument(true)
    setSelectedFile(null)
    setEditingId(null)
  }

  const handleEdit = (doc: any) => {
    setEditingId(doc.id)
    setDocName(doc.name)
    setDocCategory(doc.category)
    setDocDate(doc.expiration_date || "")
    setHasDocument(doc.status !== 'MISSING')
    setSelectedFile(null) 
  }

  const CATEGORY_LABELS: Record<string, string> = {
    all: 'Completo (todos)',
    ESTRATÉGICO: 'Institucional / Estratégico',
    TAX: 'Contábil / Fiscal',
    COMPLIANCE: 'Políticas / Compliance',
    LEGAL: 'Societário / Legal',
    LABOR: 'Trabalhista / Operacional',
    TECH: 'Técnico / Operacional',
  }

  const handleDownloadZip = async (categoryFilter?: string) => {
    let validDocs = docs.filter(d => d.file_url && d.status !== 'MISSING')
    if (categoryFilter && categoryFilter !== 'all') {
      validDocs = validDocs.filter(d => d.category === categoryFilter)
    }
    
    if (validDocs.length === 0) {
        alert(categoryFilter && categoryFilter !== 'all' 
          ? `Não há arquivos anexados nesta categoria (${CATEGORY_LABELS[categoryFilter] || categoryFilter}).`
          : "Não há arquivos anexados para baixar.")
        return
    }

    setDownloadingZip(true)

    try {
        const zip = new JSZip()
        const folderName = categoryFilter && categoryFilter !== 'all'
          ? `Compliance_${company.name.replace(/\s+/g, '_')}_${categoryFilter}`
          : `Compliance_${company.name.replace(/\s+/g, '_')}`
        const folder = zip.folder(folderName)

        const promises = validDocs.map(async (doc) => {
            try {
                const response = await fetch(doc.file_url)
                if (!response.ok) throw new Error("Falha no download")
                const blob = await response.blob()
                let extension = blob.type.split('/')[1] || 'pdf'
                if (extension === 'plain') extension = 'txt'
                if (extension === 'vnd.openxmlformats-officedocument.wordprocessingml.document') extension = 'docx'
                
                const urlExt = doc.file_url.split('.').pop()
                if (urlExt && urlExt.length < 5) extension = urlExt

                folder?.file(`${doc.name}_${doc.category}.${extension}`, blob)
            } catch (err) {
                console.error(`Erro ao baixar ${doc.name}`, err)
            }
        })

        await Promise.all(promises)
        const content = await zip.generateAsync({ type: "blob" })
        const suffix = categoryFilter && categoryFilter !== 'all' ? `_${categoryFilter}` : ''
        saveAs(content, `Dossie_${company.name.replace(/\s+/g, '_')}${suffix}_${new Date().toISOString().split('T')[0]}.zip`)

    } catch (error) {
        console.error("Erro ao gerar ZIP:", error)
        alert("Erro ao gerar o arquivo compactado.")
    } finally {
        setDownloadingZip(false)
    }
  }

  const handleSave = async () => {
    if (!docName) {
        alert("Por favor, digite o nome do documento.")
        return
    }

    if (hasDocument && !selectedFile && !editingId) {
        alert("⚠️ OBRIGATÓRIO: Anexe o arquivo comprovante.")
        return
    }

    setLoading(true)
    
    let fileUrl = null
    let status = hasDocument ? 'VALID' : 'MISSING'

    if (hasDocument && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${company.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
            .from('regulatory-files')
            .upload(fileName, selectedFile)
        
        if (uploadError) {
            alert("Erro no upload: " + uploadError.message)
            setLoading(false)
            return
        }
        
        const { data } = supabase.storage.from('regulatory-files').getPublicUrl(fileName)
        fileUrl = data.publicUrl
    }

    const payload: any = {
      company_id: company.id,
      name: docName,
      category: docCategory,
      status: status,
      expiration_date: (hasDocument && docDate) ? docDate : null,
    }

    if (fileUrl) payload.file_url = fileUrl

    let error;
    if (editingId) {
        const { error: uErr } = await supabase.from('regulatory_docs').update(payload).eq('id', editingId)
        error = uErr
    } else {
        const { error: iErr } = await supabase.from('regulatory_docs').insert(payload)
        error = iErr
    }

    if (error) {
        alert("Erro ao salvar: " + error.message)
    } else {
        // 🚀 ATUALIZAÇÃO: Agora registra o e-mail real do usuário no log
        await supabase.from('audit_logs').insert({
            action: editingId ? 'EDITAR' : 'CRIAR',
            category: 'DOCUMENTO',
            details: `${editingId ? 'Editou' : 'Cadastrou'} o documento "${docName}" em ${company.name}`,
            user_email: userEmail || 'Sistema' 
        })

        resetForm()
        fetchDocs()
        if (onDataChange) onDataChange()
        router.refresh()
    }
    setLoading(false)
  }

  const handleDelete = async (doc: any) => {
    if(!confirm(`Excluir o documento "${doc.name}"?`)) return
    
    const { error } = await supabase.from('regulatory_docs').delete().eq('id', doc.id)
    
    if (error) {
        alert("Erro ao excluir: " + error.message)
    } else {
        // 🚀 ATUALIZAÇÃO: Registra o e-mail real na exclusão
        await supabase.from('audit_logs').insert({
            action: 'EXCLUIR',
            category: 'DOCUMENTO',
            details: `Excluiu o documento "${doc.name}" de ${company.name}`,
            user_email: userEmail || 'Sistema'
        })
        fetchDocs()
        if (onDataChange) onDataChange()
        router.refresh()
    }
  }

  const getStatusBadge = (doc: any) => {
    if (doc.status === 'MISSING') {
        return <Badge className="bg-red-100 text-red-600 border-red-200 hover:bg-red-200 text-[10px] w-full justify-center flex gap-1"><AlertCircle className="w-3 h-3" /> PENDENTE</Badge>
    }
    if (!doc.expiration_date) {
        return <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 text-[10px] w-full justify-center">PERMANENTE</Badge>
    }
    const today = new Date()
    const expDate = new Date(doc.expiration_date)
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-100 text-[10px] w-full justify-center">VENCIDO</Badge>
    if (diffDays <= 30) return <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 text-[10px] w-full justify-center">VENCE EM BREVE</Badge>
    
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 text-[10px] w-full justify-center">VIGENTE</Badge>
  }

  const renderDocumentTable = (filteredDocs: any[]) => (
    <Table>
        <TableHeader className="bg-slate-50">
            <TableRow>
                <TableHead className="text-xs font-bold text-slate-600 w-[250px]">Documento</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Categoria</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-center">Status / Validade</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-center">Arquivo</TableHead>
                <TableHead className="w-[80px] text-right pr-4">Ações</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {filteredDocs.map((doc) => (
                <TableRow key={doc.id} className={doc.status === 'MISSING' ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50'}>
                    <TableCell className="font-medium text-xs flex items-center gap-2">
                        {doc.status === 'MISSING' ? <AlertCircle className="w-4 h-4 text-red-500" /> : <FileText className="w-4 h-4 text-slate-400" />}
                        <span className={doc.status === 'MISSING' ? 'text-red-700 font-bold' : 'text-slate-700'}>{doc.name}</span>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500 font-bold uppercase">{doc.category}</TableCell>
                    <TableCell className="text-center">
                        {getStatusBadge(doc)}
                        {doc.expiration_date && (
                            <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                Vence: {new Date(doc.expiration_date).toLocaleDateString('pt-BR')}
                            </div>
                        )}
                    </TableCell>
                    <TableCell className="text-center">
                        {doc.file_url ? (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                    <ExternalLink className="w-3 h-3" /> Ver
                                </Button>
                            </a>
                        ) : (
                            <span className="text-[10px] text-slate-400 opacity-50">-</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right pr-2">
                        {/* 🚀 ATUALIZAÇÃO: Agora Armando vê os botões de editar e apagar */}
                        {canManage ? (
                            <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-500" onClick={() => handleEdit(doc)} title="Editar">
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(doc)} title="Apagar">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ) : (
                            <span className="text-[10px] text-slate-300 italic">Leitura</span>
                        )}
                    </TableCell>
                </TableRow>
            ))}
            {filteredDocs.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-xs italic">
                        Nenhum documento nesta categoria.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
  )

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!val) resetForm(); setOpen(val); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 gap-2 font-bold shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5" /> Gestão
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Checklist: <span className="text-slate-500">{company.name}</span>
          </DialogTitle>
          
          <div className="hidden sm:flex items-center gap-2">
            <Select value={exportCategory} onValueChange={setExportCategory}>
              <SelectTrigger className="w-[180px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="Escolher categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{CATEGORY_LABELS.all}</SelectItem>
                <SelectItem value="ESTRATÉGICO">{CATEGORY_LABELS.ESTRATÉGICO}</SelectItem>
                <SelectItem value="TAX">{CATEGORY_LABELS.TAX}</SelectItem>
                <SelectItem value="COMPLIANCE">{CATEGORY_LABELS.COMPLIANCE}</SelectItem>
                <SelectItem value="LEGAL">{CATEGORY_LABELS.LEGAL}</SelectItem>
                <SelectItem value="LABOR">{CATEGORY_LABELS.LABOR}</SelectItem>
                <SelectItem value="TECH">{CATEGORY_LABELS.TECH}</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDownloadZip(exportCategory)} 
              disabled={downloadingZip || docs.filter(d => d.file_url).length === 0}
              className="h-9 gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
            >
              {downloadingZip ? (
                  <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Compactando...
                  </>
              ) : (
                  <>
                      <Download className="w-4 h-4 text-emerald-600" /> Baixar (ZIP)
                  </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          
          {/* 🚀 ATUALIZAÇÃO: Formulário liberado para Managers (Armando) */}
          {canManage && (
              <div className={`p-5 rounded-xl border transition-all ${editingId ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between mb-4">
                    <Label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${editingId ? 'text-indigo-700' : 'text-slate-600'}`}>
                        {editingId ? <Pencil className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {editingId ? "Editando Registro Existente" : "Novo Registro"}
                    </Label>
                    {editingId && <Button variant="ghost" size="sm" onClick={resetForm} className="h-6 text-[10px] text-slate-500 bg-white border border-slate-200 hover:bg-slate-100"><X className="w-3 h-3 mr-1" /> Cancelar Edição</Button>}
                </div>

                <div className="grid grid-cols-12 gap-4 items-start">
                    
                    <div className="col-span-12 flex gap-2 mb-2">
                        <button 
                            onClick={() => setHasDocument(true)}
                            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-xs font-bold transition-all ${
                                hasDocument 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-[1.01]' 
                                : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            <Check className="w-4 h-4" /> JÁ POSSUO O DOCUMENTO
                        </button>
                        <button 
                            onClick={() => setHasDocument(false)}
                            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-xs font-bold transition-all ${
                                !hasDocument 
                                ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-[1.01]' 
                                : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            <Ban className="w-4 h-4" /> NÃO TENHO (PENDÊNCIA)
                        </button>
                    </div>

                    <div className="col-span-5">
                        <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Nome do Documento</Label>
                        <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Ex: Alvará, Contrato Social..." className="h-9 text-xs bg-white" />
                    </div>
                    <div className="col-span-4">
                        <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Categoria</Label>
                        <Select value={docCategory} onValueChange={setDocCategory}>
                            <SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ESTRATÉGICO">💎 Institucional / Estratégico</SelectItem>
                                <SelectItem value="TAX">📊 Contábil / Fiscal</SelectItem>
                                <SelectItem value="COMPLIANCE">🛡️ Políticas / Compliance</SelectItem>
                                <SelectItem value="LEGAL">⚖️ Societário / Legal</SelectItem>
                                <SelectItem value="LABOR">👷 Trabalhista / Operacional</SelectItem>
                                <SelectItem value="TECH">⚙️ Técnico / Operacional</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {hasDocument ? (
                        <>
                            <div className="col-span-3">
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Validade (Opcional)</Label>
                                <Input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className="h-9 text-xs bg-white" />
                            </div>
                            <div className="col-span-12 flex justify-end gap-3 mt-2 pt-4 border-t border-slate-200/50">
                                
                                <div className="relative flex-1">
                                    <Input type="file" id="file-up" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                    <Label htmlFor="file-up" className={`flex items-center gap-2 text-xs cursor-pointer h-9 px-3 rounded border border-dashed transition-all ${
                                        selectedFile 
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' 
                                        : 'bg-white border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                                    }`}>
                                        <UploadCloud className="w-4 h-4" /> 
                                        {selectedFile ? selectedFile.name : (editingId ? "Substituir Arquivo (Opcional)" : "Anexar Arquivo (Obrigatório)")}
                                    </Label>
                                </div>

                                <Button onClick={handleSave} disabled={loading} size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700 text-xs px-6 font-bold shadow-sm">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "Salvar Alterações" : "Adicionar à Lista")}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="col-span-3 flex items-end">
                            <Button onClick={handleSave} disabled={loading} size="sm" className="w-full h-9 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar Pendência"}
                            </Button>
                        </div>
                    )}
                </div>
              </div>
          )}

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="flex flex-wrap w-full h-auto bg-slate-100 p-1 rounded-xl mb-6 gap-1">
              <TabsTrigger value="all" className="flex-1 text-[10px] font-bold py-2">TODOS</TabsTrigger>
              <TabsTrigger value="strategic" className="flex-1 text-[10px] font-bold py-2">INSTITUCIONAL</TabsTrigger>
              <TabsTrigger value="finance" className="flex-1 text-[10px] font-bold py-2">CONTÁBIL</TabsTrigger>
              <TabsTrigger value="compliance" className="flex-1 text-[10px] font-bold py-2">COMPLIANCE</TabsTrigger>
              <TabsTrigger value="legal" className="flex-1 text-[10px] font-bold py-2">SOCIETÁRIO</TabsTrigger>
              <TabsTrigger value="labor" className="flex-1 text-[10px] font-bold py-2">TRABALHISTA</TabsTrigger>
              <TabsTrigger value="tech" className="flex-1 text-[10px] font-bold py-2">TÉCNICO</TabsTrigger>
            </TabsList>

            <div className="border rounded-lg overflow-hidden bg-white shadow-sm mt-4">
              <TabsContent value="all" className="m-0">{renderDocumentTable(docs)}</TabsContent>
              <TabsContent value="strategic" className="m-0">{renderDocumentTable(docs.filter(d => d.category === 'ESTRATÉGICO'))}</TabsContent>
              <TabsContent value="finance" className="m-0">{renderDocumentTable(docs.filter(d => d.category === 'TAX'))}</TabsContent>
              <TabsContent value="compliance" className="m-0">{renderDocumentTable(docs.filter(d => d.category === 'COMPLIANCE'))}</TabsContent>
              <TabsContent value="legal" className="m-0">{renderDocumentTable(docs.filter(d => d.category === 'LEGAL'))}</TabsContent>
              <TabsContent value="labor" className="m-0">{renderDocumentTable(docs.filter(d => d.category === 'LABOR'))}</TabsContent>
              <TabsContent value="tech" className="m-0">{renderDocumentTable(docs.filter(d => d.category === 'TECH'))}</TabsContent>
            </div>
          </Tabs>

        </div>
      </DialogContent>
    </Dialog>
  )
}