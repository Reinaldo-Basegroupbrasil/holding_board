'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  SelectSeparator 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Layers, Copy, Pencil, Trash2 } from 'lucide-react';

export function ScenarioSelector() {
  const { 
    scenarios, 
    currentScenario, 
    changeScenario, 
    createScenario, 
    renameScenario,
    deleteScenario,
    isLoading 
  } = useProjectStore();

  // Modais
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Inputs
  const [newScenarioName, setNewScenarioName] = useState('');
  const [editName, setEditName] = useState('');

  if (!currentScenario) return null;

  // --- HANDLERS ---
  
  const handleValueChange = (value: string) => {
    if (value === 'CREATE_NEW') {
      setNewScenarioName(`${currentScenario.name} (Cópia)`);
      setIsCreateDialogOpen(true);
    } else {
      changeScenario(value);
    }
  };

  const handleCreate = async () => {
    if (newScenarioName.trim()) {
      await createScenario(newScenarioName);
      setIsCreateDialogOpen(false);
    }
  };

  const openEditDialog = () => {
    setEditName(currentScenario.name);
    setIsEditDialogOpen(true);
  };

  const handleRename = async () => {
    if (editName.trim()) {
      await renameScenario(currentScenario.id, editName);
      setIsEditDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (scenarios.length <= 1) {
      alert("Você precisa ter pelo menos um cenário.");
      return;
    }
    
    if (confirm(`Tem certeza que deseja EXCLUIR o cenário "${currentScenario.name}"? Todos os dados dele serão perdidos.`)) {
      await deleteScenario(currentScenario.id);
      setIsEditDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Dropdown de Seleção */}
        <Select 
          value={currentScenario.id} 
          onValueChange={handleValueChange} 
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px] bg-white border-dashed border-slate-300">
            <div className="flex items-center gap-2 text-slate-700">
              <Layers className="h-4 w-4 text-blue-500" />
              <SelectValue placeholder="Selecione o Cenário" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {scenarios.map((scenario) => (
              <SelectItem key={scenario.id} value={scenario.id} className="cursor-pointer">
                {scenario.name} {scenario.is_base && <span className="text-xs text-muted-foreground ml-2">(Base)</span>}
              </SelectItem>
            ))}
            
            <SelectSeparator />
            
            <SelectItem value="CREATE_NEW" className="text-blue-600 font-medium cursor-pointer focus:text-blue-700">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Criar Novo Cenário
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Botão de Editar (Engrenagem/Lápis) */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={openEditDialog}
          title="Editar Cenário Atual"
          className="text-slate-500 hover:text-slate-800"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {/* --- MODAL DE CRIAÇÃO --- */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-blue-500" />
              Duplicar Cenário
            </DialogTitle>
            <DialogDescription>
              Isso criará uma cópia exata de <strong>"{currentScenario.name}"</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isLoading}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE EDIÇÃO / EXCLUSÃO --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Cenário</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Renomear</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between w-full">
            <Button 
                variant="destructive" 
                onClick={handleDelete}
                className="gap-2"
                disabled={isLoading}
            >
                <Trash2 className="h-4 w-4" /> Excluir Cenário
            </Button>
            
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleRename} disabled={isLoading}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}