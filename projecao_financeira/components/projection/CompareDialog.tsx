"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, Check, ArrowRightLeft } from "lucide-react";

interface CompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SCENARIO_COLORS = [
  "border-blue-500 bg-blue-50 ring-blue-200",
  "border-emerald-500 bg-emerald-50 ring-emerald-200",
  "border-amber-500 bg-amber-50 ring-amber-200",
];

export function CompareDialog({ open, onOpenChange }: CompareDialogProps) {
  const { scenarios, currentScenario, isLoading, loadCompareProjections } =
    useProjectStore();

  const [selected, setSelected] = useState<string[]>(() =>
    currentScenario ? [currentScenario.id] : []
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    useProjectStore.setState({ compareScenarioIds: selected });
    await loadCompareProjections();
    onOpenChange(false);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && currentScenario) {
      setSelected([currentScenario.id]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            Comparar Cenários
          </DialogTitle>
          <DialogDescription>
            Selecione <strong>2 ou 3</strong> cenários para visualizar lado a
            lado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          {scenarios.map((scenario) => {
            const idx = selected.indexOf(scenario.id);
            const isSelected = idx !== -1;
            const isDisabled = !isSelected && selected.length >= 3;
            const colorClass = isSelected ? SCENARIO_COLORS[idx] : "";

            return (
              <button
                key={scenario.id}
                type="button"
                disabled={isDisabled}
                onClick={() => toggle(scenario.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left
                  ${
                    isSelected
                      ? `${colorClass} ring-2 shadow-sm`
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }
                  ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="font-medium text-sm text-slate-800">
                      {scenario.name}
                    </span>
                    {scenario.is_base && (
                      <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                        Base
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      #{idx + 1}
                    </span>
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </button>
            );
          })}

          {selected.length < 2 && (
            <p className="text-xs text-amber-600 mt-2">
              Selecione pelo menos 2 cenários.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCompare}
            disabled={selected.length < 2 || isLoading}
            className="gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            {isLoading ? "Carregando..." : "Comparar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
