"use client";

import { useEffect, useState, use } from "react"; 
import Link from "next/link";
import { ArrowLeft, Plus, Settings, Download, Loader2, FileText, Globe, Upload, Database, ArrowRightLeft, FileSpreadsheet } from "lucide-react";

import { useProjectStore } from "@/store/projectStore";
import { Assumption } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Componentes Originais
import { NewAssumptionDialog } from "@/components/assumptions/NewAssumptionDialog";
import { AssumptionList } from "@/components/assumptions/AssumptionList";
import { FinancialStatement } from "@/components/projection/FinancialStatement";
import { ViabilitySection } from "@/components/projection/ViabilitySection";
import { SensitivitySection } from "@/components/projection/SensitivitySection";
import { ScenarioComparison } from "@/components/projection/ScenarioComparison";
import { CompareDialog } from "@/components/projection/CompareDialog";
import { EditProjectDialog } from "@/components/dashboard/EditProjectDialog";

// Novos Componentes da Sprint 3
import { CurrencySelector } from '@/components/dashboard/CurrencySelector';
import { CashFlowChart } from '@/components/dashboard/analytics/CashFlowChart';
import { KpiGrid } from '@/components/dashboard/analytics/KpiGrid';
import { CostPieChart } from '@/components/dashboard/analytics/CostPieChart';

// Novo Componente da Sprint 4
import { ScenarioSelector } from '@/components/dashboard/ScenarioSelector';

// Gerador de PDF (Sprint 6)
import { generatePDF } from "@/lib/pdfGenerator";
import { PdfLanguage } from "@/locales/pdfTranslations";

// Import/Export de premissas
import { buildExportPayload, downloadJSON, parseImportFile } from "@/lib/assumptionIO";
import { exportProjectionToExcel } from "@/lib/excelExport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { 
    currentProject, 
    currentScenario,
    projection,
    assumptions, 
    fetchProject, 
    isLoading, 
    removeAssumption,
    importAssumptions,
    profitTaxMode,
    profitTaxRate,
    scenarios,
    compareMode,
    exchangeRate,
    targetCurrency,
  } = useProjectStore();
  
  // Estado dos Modais e Loadings
  const [isAssumptionDialogOpen, setIsAssumptionDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingAssumption, setEditingAssumption] = useState<Assumption | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId, fetchProject]);

  const handleCreateNew = () => {
    setEditingAssumption(undefined);
    setIsAssumptionDialogOpen(true);
  };

  const handleEdit = (item: Assumption) => {
    setEditingAssumption(item);
    setIsAssumptionDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if(confirm("Tem certeza que deseja excluir esta premissa?")) {
      await removeAssumption(id);
    }
  };

  // --- FUNÇÃO DE EXPORTAÇÃO PDF ---
  const handleExport = async (lang: PdfLanguage, includeDetails?: boolean) => {
    if (!currentProject || !currentScenario || !projection) return;

    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      await generatePDF({
        project: currentProject,
        scenario: currentScenario,
        projection: projection,
        lang: lang,
        chartElementId: 'chart-canvas',
        taxConfig: { mode: profitTaxMode, rate: profitTaxRate },
        includeDetails: includeDetails ?? false,
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar o PDF. Verifique o console.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAssumptions = () => {
    if (!currentProject || !currentScenario || assumptions.length === 0) return;
    const payload = buildExportPayload(assumptions, currentProject.name, currentScenario.name);
    const safeName = currentProject.name.replace(/[^a-zA-Z0-9]/g, '_');
    downloadJSON(payload, `premissas_${safeName}_${currentScenario.name}.json`);
  };

  const handleExportExcel = (includeDetails?: boolean) => {
    if (!currentProject || !currentScenario || !projection) return;
    exportProjectionToExcel(
      projection,
      assumptions,
      currentProject,
      currentScenario,
      exchangeRate,
      targetCurrency,
      includeDetails ?? false
    );
  };

  const handleImportFile = async (file: File) => {
    setImportStatus(null);
    try {
      const payload = await parseImportFile(file);
      const count = await importAssumptions(payload.assumptions);
      setImportStatus(`${count} premissa(s) importada(s) com sucesso!`);
    } catch (err: any) {
      setImportStatus(`Erro: ${err.message}`);
    }
  };

  if (isLoading && !currentProject) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    // Adicionado padding-bottom extra (pb-32) para garantir espaço no final da rolagem
    <div className="flex flex-col h-full space-y-8 p-8 max-w-[1600px] mx-auto pb-32">
      
      {/* 1. Header Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <span>/</span>
            <span>{currentProject?.name || "Carregando..."}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {currentProject?.name}
          </h1>
          <p className="text-muted-foreground">
            {currentProject?.description || "Projeto Financeiro"} • Moeda Base: {currentProject?.currency_main || "BRL"} • {currentProject?.projection_months || 36} meses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ScenarioSelector />
          <CurrencySelector />

          {/* MENU DE EXPORTAÇÃO */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isExporting} title="Exportar / Importar">
                 {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Relatório PDF</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('pt', false)} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" /> Português (Resumido)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pt', true)} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" /> Português (Completo)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('en', false)} className="cursor-pointer">
                <Globe className="mr-2 h-4 w-4" /> English (Resumido)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('en', true)} className="cursor-pointer">
                <Globe className="mr-2 h-4 w-4" /> English (Completo)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('es', false)} className="cursor-pointer">
                <Globe className="mr-2 h-4 w-4" /> Español (Resumido)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('es', true)} className="cursor-pointer">
                <Globe className="mr-2 h-4 w-4" /> Español (Completo)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportExcel(false)} className="cursor-pointer" disabled={!projection}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (Resumido)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel(true)} className="cursor-pointer" disabled={!projection}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (Completo)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Premissas (Backup)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportAssumptions} className="cursor-pointer" disabled={assumptions.length === 0}>
                <Database className="mr-2 h-4 w-4" /> Exportar Premissas (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)} className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" /> Importar Premissas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          
          {/* OBS: O botão de "Nova Premissa" foi movido para o Header Fixo abaixo */}
        </div>
      </div>

      {/* 2. Área Analítica */}
      <section className="space-y-6">
        <KpiGrid />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2" id="chart-canvas">
                <CashFlowChart />
            </div>
            
            <div className="lg:col-span-1">
                <CostPieChart />
            </div>
        </div>
      </section>

      {/* 3. Abas Principais com STICKY HEADER */}
      <Tabs defaultValue="results" className="w-full space-y-6 relative">
        
        {/* --- MENU FIXO (STICKY) --- */}
        {/* Essa div vai grudar no topo ao rolar a página */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-4 border-b -mx-8 px-8 shadow-sm flex items-center justify-between transition-all">
           <TabsList className="bg-slate-100 p-1 h-auto">
            <TabsTrigger value="assumptions" className="px-6 py-2">Editor de Premissas</TabsTrigger>
            <TabsTrigger value="results" className="px-6 py-2">Resultados (DRE & Caixa)</TabsTrigger>
          </TabsList>

          {/* O Botão agora vive aqui, sempre visível */}
          <Button onClick={handleCreateNew} className="gap-2 shadow-sm hover:shadow-md transition-shadow">
            <Plus className="h-4 w-4" /> Nova Premissa
          </Button>
        </div>

        <TabsContent value="assumptions" className="mt-6 space-y-4 animate-in fade-in-50 pt-2">
           <AssumptionList 
              assumptions={assumptions} 
              onEdit={handleEdit}
              onDelete={handleDelete} 
           />
        </TabsContent>

        <TabsContent value="results" className="mt-6 animate-in fade-in-50">
          {compareMode ? (
            <ScenarioComparison />
          ) : (
            <>
              <div className="flex justify-end mb-2">
                {scenarios.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCompareDialogOpen(true)}
                    className="gap-2 text-slate-600"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Comparar Cenários
                  </Button>
                )}
              </div>
              <FinancialStatement />
            </>
          )}
          <ViabilitySection />
          <SensitivitySection />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <NewAssumptionDialog 
        projectId={projectId} 
        isOpen={isAssumptionDialogOpen} 
        onClose={() => setIsAssumptionDialogOpen(false)}
        assumptionToEdit={editingAssumption}
        existingAssumptions={assumptions}
      />

      {currentProject && (
        <EditProjectDialog 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          project={currentProject} 
        />
      )}

      <CompareDialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen} />

      {/* Modal de Importação */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => { setIsImportDialogOpen(open); if (!open) setImportStatus(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              Importar Premissas
            </DialogTitle>
            <DialogDescription>
              Selecione um arquivo JSON exportado anteriormente. As premissas serão adicionadas ao cenário <strong>{currentScenario?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <label
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors border-slate-300 hover:border-blue-400"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-blue-600">Clique para selecionar</span> o arquivo .json
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = '';
                }}
              />
            </label>

            {importStatus && (
              <p className={`text-sm text-center font-medium ${importStatus.startsWith('Erro') ? 'text-red-600' : 'text-green-600'}`}>
                {importStatus}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setImportStatus(null); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}