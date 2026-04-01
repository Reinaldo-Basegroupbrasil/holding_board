"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Assumption, GrowthSegment } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { HelpTooltip } from "@/components/ui/help-tooltip"; 
import { Repeat, Zap, Plus, Trash2 } from "lucide-react";

interface Props {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  assumptionToEdit?: Assumption;
  existingAssumptions: Assumption[];
}

export function NewAssumptionDialog({ projectId, isOpen, onClose, assumptionToEdit, existingAssumptions = [] }: Props) {
  const { addAssumption, updateAssumption, currentProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [hasGrowth, setHasGrowth] = useState(false);
  const [hasSegments, setHasSegments] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState<Partial<Assumption>>({
    name: "",
    amount: 0,
    category: "revenue",
    subcategory: "",
    format: "currency",
    growth_type: "percentage",
    growth_rate: 0,
    growth_rate_y2: 0,
    growth_rate_y3: 0,
    growth_rate_y4: 0,
    growth_rate_y5: 0,
    start_month: 1,
    end_month: undefined, 
    payment_lag: 0,
    is_recurring: true,
    driver_type: "total",
    driver_id: undefined,
    driver_id_2: undefined,
    driver_operation: undefined, 
    amortization_period: 0,
    growth_start_month: undefined,
    yearly_display: undefined,
    growth_segments: []
  });

  const projectionMonths = currentProject?.projection_months || 36;
  const numberOfYears = Math.ceil(projectionMonths / 12);

  const growthFieldKeys: (keyof Assumption)[] = ['growth_rate', 'growth_rate_y2', 'growth_rate_y3', 'growth_rate_y4', 'growth_rate_y5'];

  useEffect(() => {
    if (isOpen) {
      if (assumptionToEdit) {
        setFormData({
            ...assumptionToEdit,
            subcategory: assumptionToEdit.subcategory || "",
            source: assumptionToEdit.source || undefined,
            yearly_display: assumptionToEdit.yearly_display || undefined,
            driver_id: assumptionToEdit.driver_id || undefined,
            driver_id_2: assumptionToEdit.driver_id_2 || undefined,
            driver_operation: assumptionToEdit.driver_operation || undefined,
            end_month: assumptionToEdit.end_month || undefined,
            growth_rate_y2: assumptionToEdit.growth_rate_y2 || 0,
            growth_rate_y3: assumptionToEdit.growth_rate_y3 || 0,
            growth_rate_y4: assumptionToEdit.growth_rate_y4 || 0,
            growth_rate_y5: assumptionToEdit.growth_rate_y5 || 0,
            growth_start_month: assumptionToEdit.growth_start_month || undefined,
            growth_segments: assumptionToEdit.growth_segments || [],
        });
        setHasGrowth(!!(assumptionToEdit.growth_rate && assumptionToEdit.growth_rate > 0));
        setHasSegments(!!(assumptionToEdit.growth_segments && assumptionToEdit.growth_segments.length > 0));
      } else {
        setFormData({
          name: "",
          amount: 0,
          category: "revenue",
          subcategory: "",
          format: "currency",
          growth_type: "percentage",
          growth_rate: 0,
          growth_rate_y2: 0,
          growth_rate_y3: 0,
          growth_rate_y4: 0,
          growth_rate_y5: 0,
          start_month: 1,
          end_month: undefined,
          payment_lag: 0,
          is_recurring: true,
          driver_type: "total",
          driver_id: undefined,
          driver_id_2: undefined,
          driver_operation: undefined,
          amortization_period: 0,
          growth_start_month: undefined,
          yearly_display: undefined,
          growth_segments: []
        });
        setHasGrowth(false);
        setHasSegments(false);
      }
      setActiveTab("basic");
    }
  }, [assumptionToEdit, isOpen]);

  const handleChange = (field: keyof Assumption, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (cat: string) => {
    let newFormat = formData.format;
    if (cat === 'base') newFormat = 'number';
    if (cat.includes('tax')) newFormat = 'percent';
    if (cat === 'revenue' || cat.includes('cost')) newFormat = 'currency';
    
    setFormData(prev => ({ ...prev, category: cat, format: newFormat as any }));
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.amount === undefined) {
        alert("Preencha nome e valor inicial.");
        return;
    }
    setLoading(true);

    // Garante que se for "none", envie null para o banco
    const finalDriverId = (!formData.driver_id || formData.driver_id === "none") ? null : formData.driver_id;

    const payload: Partial<Assumption> = {
        ...formData,
        project_id: projectId,
        amount: Number(formData.amount),
        growth_rate: Number(formData.growth_rate || 0),
        growth_rate_y2: formData.growth_rate_y2 ? Number(formData.growth_rate_y2) : null,
        growth_rate_y3: formData.growth_rate_y3 ? Number(formData.growth_rate_y3) : null,
        growth_rate_y4: formData.growth_rate_y4 ? Number(formData.growth_rate_y4) : null,
        growth_rate_y5: formData.growth_rate_y5 ? Number(formData.growth_rate_y5) : null,
        start_month: Number(formData.start_month),
        end_month: formData.end_month ? Number(formData.end_month) : null,
        
        driver_id: finalDriverId,
        driver_id_2: formData.driver_id_2 && formData.driver_id_2 !== "none" ? formData.driver_id_2 : null,
        driver_type: formData.driver_type as 'total' | 'delta',
        driver_operation: (formData.driver_operation as 'single' | 'multiply' | 'sum') || null,
        
        is_recurring: Boolean(formData.is_recurring),
        
        amortization_period: Number(formData.amortization_period || 0),
        payment_lag: Number(formData.payment_lag || 0),
        
        growth_type: formData.growth_type as 'percentage' | 'linear',
        format: formData.format as 'currency' | 'percent' | 'number',
        
        subcategory: formData.subcategory || null,
        growth_start_month: formData.growth_start_month ? Number(formData.growth_start_month) : null,
        source: formData.source || null,
        yearly_display: (formData.yearly_display as 'sum' | 'last_value') || null,
        growth_segments: (formData.growth_segments?.length ? formData.growth_segments : null) as GrowthSegment[] | null
    };

    try {
        if (assumptionToEdit) {
            await updateAssumption(assumptionToEdit.id, payload);
        } else {
            await addAssumption(payload);
        }
        onClose();
    } catch (error) {
        console.error("Erro ao salvar:", error);
    } finally {
        setLoading(false);
    }
  };

  const availableDrivers = existingAssumptions.filter(a => a.category === 'base' && a.id !== assumptionToEdit?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assumptionToEdit ? "Editar Premissa" : "Nova Premissa Financeira"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="advanced">Avançado (Crescimento & Prazos)</TabsTrigger>
          </TabsList>

          {/* === ABA BÁSICA === */}
          <TabsContent value="basic" className="space-y-4 py-4">
            
            {/* Categoria e Nome */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select 
                        value={formData.category} 
                        onValueChange={handleCategoryChange}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="revenue">Receita (Vendas)</SelectItem>
                            <SelectItem value="cost_variable">Custo Variável (CMV/Imposto)</SelectItem>
                            <SelectItem value="cost_fixed">Custo Fixo (OpEx)</SelectItem>
                            <SelectItem value="personnel">Pessoal (Salários)</SelectItem>
                            <SelectItem value="investment">Investimento (CapEx)</SelectItem>
                            <SelectItem value="base">Métrica Base (Driver)</SelectItem>
                            <SelectItem value="tax">Imposto s/ Venda</SelectItem>
                            <SelectItem value="financial_revenue">Receita Financeira</SelectItem>
                            <SelectItem value="tax_profit">Imposto s/ Lucro</SelectItem>
                            <SelectItem value="capital">Aporte de Capital</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center">
                        Nome da Premissa
                        <HelpTooltip text="Dê um nome claro. Ex: 'Venda de Assinaturas', 'Aluguel Escritório'." />
                    </Label>
                    <Input 
                        value={formData.name || ""} // Proteção contra null
                        onChange={(e) => handleChange("name", e.target.value)} 
                        placeholder="Ex: Venda de Licenças" 
                    />
                </div>
            </div>

            {/* Subcategoria e Formato */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                        Subcategoria
                        <HelpTooltip text="Use para agrupar itens no DRE. Ex: 'Marketing', 'TI', 'Escritório'." />
                    </Label>
                    <Input 
                        placeholder="Ex: Marketing" 
                        value={formData.subcategory || ""} // Proteção contra null
                        onChange={(e) => handleChange("subcategory", e.target.value)} 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Formato Visual</Label>
                    <Select value={formData.format} onValueChange={(v) => handleChange("format", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="currency">Moeda ({currentProject?.currency_main || 'BRL'})</SelectItem>
                            <SelectItem value="number">Número (Unidades)</SelectItem>
                            <SelectItem value="percent">Percentual (%)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label className="flex items-center">
                    Origem/Fonte
                    <HelpTooltip text="Registre a fonte da premissa. Ex: 'Benchmark mercado X', 'Contrato fornecedor Y'." />
                </Label>
                <Input 
                    placeholder="Ex: Benchmark, contrato, estudo..." 
                    value={formData.source || ""}
                    onChange={(e) => handleChange("source", e.target.value)} 
                />
            </div>

            {/* Valor e Data de Início */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center">
                         Valor Inicial
                         <HelpTooltip text="Quanto essa conta custa (ou gera) no primeiro mês? Coloque o valor cheio." />
                    </Label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                           {formData.format === 'currency' ? (currentProject?.currency_main || '$') : ''}
                        </span>
                        <Input 
                            type="number" 
                            className={formData.format === 'currency' ? "pl-12 font-bold text-slate-700" : "font-bold text-slate-700"}
                            value={formData.amount} // number nunca é null aqui, inicializamos com 0
                            onChange={(e) => handleChange("amount", e.target.value)} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                        <Label>Início (Mês)</Label>
                        <Input 
                            type="number" 
                            min="0" 
                            max="60"
                            value={formData.start_month} 
                            onChange={(e) => handleChange("start_month", e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-muted-foreground flex items-center">
                            Fim (Opcional)
                            <HelpTooltip text="Se preenchido, a premissa para de ser cobrada após esse mês." />
                        </Label>
                        <Input 
                            type="number" 
                            min="1" 
                            placeholder="-"
                            value={formData.end_month ?? ""} // Proteção contra null
                            onChange={(e) => handleChange("end_month", e.target.value)} 
                        />
                    </div>
                </div>
            </div>

            {/* De onde vem o número? */}
            <div className="space-y-2 pt-2 border-t mt-4">
                <Label className="flex items-center text-slate-600">
                    De onde vem o número?
                    <HelpTooltip text="Como no Excel: =B2 significa usar o valor de B2. Aqui você escolhe se o valor é fixo ou se vem de outra base (ex: Nº Usuários)." />
                </Label>
                <Select 
                    value={formData.driver_id || "none"} 
                    onValueChange={(val) => handleChange("driver_id", val === "none" ? undefined : val)}
                >
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Valor fixo (você define)" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Valor fixo (você define o número)</SelectItem>
                        {availableDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>Usar base: {driver.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {formData.driver_id && formData.driver_id !== "none" && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2 space-y-3">
                    <Label className="text-xs font-bold text-amber-900 uppercase mb-1 block">Como usar a base?</Label>
                    <Select
                        value={formData.category === 'base'
                            ? `${formData.driver_operation === 'single' ? 'multiply_' : ''}${formData.driver_type || 'total'}`
                            : (formData.driver_type || 'total')
                        }
                        onValueChange={(val) => {
                            if (formData.category === 'base') {
                                if (val.startsWith('multiply_')) {
                                    setFormData(prev => ({
                                        ...prev,
                                        driver_operation: "single" as const,
                                        driver_type: val.replace('multiply_', '') as 'total' | 'delta',
                                        driver_id_2: undefined
                                    }));
                                } else {
                                    setFormData(prev => ({
                                        ...prev,
                                        driver_operation: undefined,
                                        driver_type: val as 'total' | 'delta'
                                    }));
                                }
                            } else {
                                handleChange("driver_type", val as 'total' | 'delta');
                            }
                        }}
                    >
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {formData.category === 'base' ? (
                                <>
                                    <SelectItem value="total">Somar valor ao pai a cada mês (ex: 100, 100 → pai: 100, 200, 300)</SelectItem>
                                    <SelectItem value="delta">Incremento acumula no pai (ex: 400, 100, 200 → pai: 400, 500, 700)</SelectItem>
                                    <SelectItem value="multiply_total">Meu valor × Total da base (resultado nesta linha, ex: 770 × cartões)</SelectItem>
                                    <SelectItem value="multiply_delta">Meu valor × Novos do mês (resultado nesta linha)</SelectItem>
                                </>
                            ) : (
                                <>
                                    <SelectItem value="total">Seu valor × Total da base (ex: R$ 10/usuário × 1000 = R$ 10.000)</SelectItem>
                                    <SelectItem value="delta">Seu valor × Novos do mês (ex: R$ 50/setup × 100 novos = R$ 5.000)</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>

                    {(formData.category !== 'base' || (formData.driver_id && formData.driver_id !== "none")) && formData.driver_operation !== 'single' && (
                        <>
                            <Label className="text-xs font-bold text-amber-900 uppercase block">Combinar com outra base (opcional)</Label>
                            <Select 
                                value={formData.driver_id_2 || "none"} 
                                onValueChange={(val) => handleChange("driver_id_2", val === "none" ? undefined : val)}
                            >
                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Usar apenas 1 base" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Usar apenas a base acima</SelectItem>
                                    {availableDrivers.filter(d => d.id !== formData.driver_id).map((driver) => (
                                        <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formData.driver_id_2 && formData.driver_id_2 !== "none" && (
                                <div className="space-y-1">
                                    <Label className="text-xs text-amber-800">Fórmula com 2 bases:</Label>
                                    <Select value={formData.driver_operation || "multiply"} onValueChange={(val) => handleChange("driver_operation", val)}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {formData.category === 'base' ? (
                                                <>
                                                    <SelectItem value="multiply">Base1 × Base2 (ex: Volume/cartão × Total cartões = Volume total)</SelectItem>
                                                    <SelectItem value="sum">Base1 + Base2</SelectItem>
                                                </>
                                            ) : (
                                                <>
                                                    <SelectItem value="multiply">Seu valor × Base1 × Base2 (ex: R$ 0,10 × Volume × Taxa)</SelectItem>
                                                    <SelectItem value="sum">Seu valor × (Base1 + Base2)</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {formData.category === 'base' && (
                <div className="space-y-2 pt-2 border-t mt-4">
                    <Label className="flex items-center text-slate-600">
                        Total anual (coluna no DRE)
                        <HelpTooltip text="Para bases acumuladas (ex: Cartões acumulados), use 'Último mês' para mostrar o saldo no fim do ano, não a soma dos 12 meses." />
                    </Label>
                    <Select value={formData.yearly_display || "sum"} onValueChange={(val) => handleChange("yearly_display", val)}>
                        <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sum">Soma dos meses</SelectItem>
                            <SelectItem value="last_value">Último mês do ano</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
          </TabsContent>

          {/* === ABA AVANÇADA === */}
          <TabsContent value="advanced" className="space-y-6 py-4">
            
            {/* Comportamento do Valor */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center">
                    Comportamento do Valor
                    <HelpTooltip text="Define se o valor ocorre todo mês ou apenas uma vez." />
                </Label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({ ...prev, is_recurring: true }));
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                            formData.is_recurring 
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <Repeat className={`h-5 w-5 shrink-0 ${formData.is_recurring ? 'text-primary' : 'text-slate-400'}`} />
                        <div>
                            <p className={`text-sm font-medium ${formData.is_recurring ? 'text-primary' : 'text-slate-700'}`}>Recorrente</p>
                            <p className="text-[11px] text-muted-foreground">Repete todo mês</p>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setHasGrowth(false);
                            setFormData(prev => ({
                                ...prev,
                                is_recurring: false,
                                growth_rate: 0,
                                growth_rate_y2: 0,
                                growth_rate_y3: 0,
                                growth_rate_y4: 0,
                                growth_rate_y5: 0,
                                growth_start_month: undefined,
                            }));
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                            !formData.is_recurring 
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <Zap className={`h-5 w-5 shrink-0 ${!formData.is_recurring ? 'text-primary' : 'text-slate-400'}`} />
                        <div>
                            <p className={`text-sm font-medium ${!formData.is_recurring ? 'text-primary' : 'text-slate-700'}`}>Evento Único</p>
                            <p className="text-[11px] text-muted-foreground">Ocorre uma vez só</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Seção Crescimento (Apenas se recorrente e não tax/capital) */}
            {formData.is_recurring && !['tax', 'tax_profit', 'capital'].includes(formData.category || '') && (
                <div className={`rounded-lg border transition-all ${hasGrowth ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-slate-600 flex items-center">
                                Crescimento
                                <HelpTooltip text="Aplique um aumento progressivo ao valor. Pode ser percentual (%) ou valor fixo ($) por mês." />
                            </h4>
                        </div>
                        <Switch 
                            checked={hasGrowth}
                            onCheckedChange={(checked) => {
                                setHasGrowth(checked);
                                if (!checked) {
                                    setFormData(prev => ({
                                        ...prev,
                                        growth_rate: 0,
                                        growth_rate_y2: 0,
                                        growth_rate_y3: 0,
                                        growth_rate_y4: 0,
                                        growth_rate_y5: 0,
                                        growth_start_month: undefined,
                                    }));
                                }
                            }}
                        />
                    </div>

                    {hasGrowth && (
                        <div className="px-3 pb-4 space-y-4 border-t border-slate-200 pt-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs text-slate-500">Tipo de crescimento</Label>
                                <select 
                                    className="text-xs bg-white border rounded px-2 h-7 font-medium" 
                                    value={formData.growth_type} 
                                    onChange={(e) => handleChange("growth_type", e.target.value)}
                                >
                                    <option value="percentage">% Percentual (ao ano)</option>
                                    <option value="linear">$ Valor Fixo (por mês)</option>
                                </select>
                            </div>
                            
                            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min(numberOfYears, 5)}, 1fr)` }}>
                                {Array.from({ length: Math.min(numberOfYears, 5) }, (_, i) => {
                                    const fieldKey = growthFieldKeys[i];
                                    const yearNum = i + 1;
                                    return (
                                        <div key={fieldKey} className="space-y-1">
                                            <Label className="text-xs">
                                                {formData.growth_type === 'linear' ? `Valor/mês Ano ${yearNum}` : `Taxa Ano ${yearNum}`}
                                            </Label>
                                            <Input 
                                                type="number" 
                                                step="0.1" 
                                                placeholder={formData.growth_type === 'linear' ? '500' : '10'}
                                                className={i > 0 ? "bg-blue-50/50" : ""}
                                                value={(formData as any)[fieldKey] ?? ""}
                                                onChange={(e) => handleChange(fieldKey, e.target.value)} 
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-1 pt-2 border-t border-slate-200">
                                <Label className="text-xs flex items-center">
                                    Crescimento inicia no mês
                                    <HelpTooltip text="Deixe vazio para crescer desde o início. Preencha para atrasar o crescimento. Ex: 6 = primeiro aumento no mês 6." />
                                </Label>
                                <Input 
                                    type="number" 
                                    min="1"
                                    placeholder="Desde o início"
                                    value={formData.growth_start_month ?? ""}
                                    onChange={(e) => handleChange("growth_start_month", e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Seção Segmentos de Crescimento */}
            {formData.is_recurring && !['tax', 'tax_profit', 'capital'].includes(formData.category || '') && (
                <div className="rounded-lg border bg-white border-slate-200">
                    <div className="flex items-center justify-between p-3">
                        <h4 className="font-semibold text-sm text-slate-600 flex items-center">
                            Segmentos de Crescimento
                            <HelpTooltip text="Defina valores por janelas de meses. Ex: Mês 1-3: 1200; Mês 4-8: +650; Mês 9-13: 2500 total. Absoluto = valor fixo no período. Incremento = soma ao anterior." />
                        </h4>
                        <Switch
                            checked={hasSegments}
                            onCheckedChange={(checked) => {
                                setHasSegments(checked);
                                if (!checked) {
                                    setFormData(prev => ({ ...prev, growth_segments: [] }));
                                } else {
                                    setFormData(prev => ({
                                        ...prev,
                                        growth_segments: prev.growth_segments?.length ? prev.growth_segments : [{ start_month: 1, end_month: 12, value: 0, is_absolute: true }]
                                    }));
                                }
                            }}
                        />
                    </div>
                    {hasSegments && (
                        <div className="px-3 pb-4 space-y-3 border-t border-slate-200 pt-3">
                            {(formData.growth_segments || []).map((seg, idx) => (
                                <div key={idx} className="flex gap-2 items-end flex-wrap">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Mês início</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={seg.start_month}
                                            onChange={(e) => {
                                                const arr = [...(formData.growth_segments || [])];
                                                arr[idx] = { ...seg, start_month: Number(e.target.value) || 1 };
                                                setFormData(prev => ({ ...prev, growth_segments: arr }));
                                            }}
                                            className="w-20"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Mês fim</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={seg.end_month}
                                            onChange={(e) => {
                                                const arr = [...(formData.growth_segments || [])];
                                                arr[idx] = { ...seg, end_month: Number(e.target.value) || 1 };
                                                setFormData(prev => ({ ...prev, growth_segments: arr }));
                                            }}
                                            className="w-20"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Valor</Label>
                                        <Input
                                            type="number"
                                            value={seg.value}
                                            onChange={(e) => {
                                                const arr = [...(formData.growth_segments || [])];
                                                arr[idx] = { ...seg, value: Number(e.target.value) || 0 };
                                                setFormData(prev => ({ ...prev, growth_segments: arr }));
                                            }}
                                            className="w-28"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tipo</Label>
                                        <Select
                                            value={seg.is_absolute ? "absolute" : "increment"}
                                            onValueChange={(v) => {
                                                const arr = [...(formData.growth_segments || [])];
                                                arr[idx] = { ...seg, is_absolute: v === "absolute" };
                                                setFormData(prev => ({ ...prev, growth_segments: arr }));
                                            }}
                                        >
                                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="absolute">Total</SelectItem>
                                                <SelectItem value="increment">+ Incremento</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-red-500"
                                        onClick={() => {
                                            const arr = (formData.growth_segments || []).filter((_, i) => i !== idx);
                                            setFormData(prev => ({ ...prev, growth_segments: arr }));
                                            if (arr.length === 0) setHasSegments(false);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => {
                                    const arr = formData.growth_segments || [];
                                    const last = arr[arr.length - 1];
                                    const nextStart = last ? last.end_month + 1 : 1;
                                    setFormData(prev => ({
                                        ...prev,
                                        growth_segments: [...(prev.growth_segments || []), { start_month: nextStart, end_month: nextStart + 11, value: 0, is_absolute: true }]
                                    }));
                                }}
                            >
                                <Plus className="h-4 w-4" /> Adicionar segmento
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Seção Fluxo de Caixa (Lag) */}
            {['revenue', 'cost_variable', 'cost_fixed'].includes(formData.category || '') && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 space-y-4">
                     <h4 className="font-semibold text-sm text-green-800 flex items-center">
                        Impacto no Caixa (Lag)
                        <HelpTooltip text="A diferença entre a data da venda e a data que o dinheiro cai na conta (Regime de Caixa)." />
                     </h4>

                     <div className="space-y-2">
                        <Label className="text-xs">Dias para receber/pagar</Label>
                        <Select 
                            value={String(formData.payment_lag || 0)} 
                            onValueChange={(v) => handleChange("payment_lag", Number(v))}
                        >
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">0 Dias (À Vista)</SelectItem>
                                <SelectItem value="1">30 Dias (Mês Seguinte)</SelectItem>
                                <SelectItem value="2">60 Dias (+2 Meses)</SelectItem>
                                <SelectItem value="3">90 Dias (+3 Meses)</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                </div>
            )}

            {/* Depreciação (Apenas Investimento) */}
            {formData.category === 'investment' && (
                <div className="bg-blue-50 p-3 rounded border border-blue-100 space-y-2">
                    <Label className="text-blue-800 flex items-center">
                        Depreciação (Meses)
                        <HelpTooltip text="Em quantos meses esse ativo perde valor? Usado para cálculo correto do Lucro Líquido." />
                    </Label>
                    <Input 
                        type="number" 
                        min="0" 
                        value={formData.amortization_period ?? ""}
                        onChange={(e) => handleChange("amortization_period", e.target.value)} 
                    />
                </div>
            )}

          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Salvando..." : "Salvar Premissa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}