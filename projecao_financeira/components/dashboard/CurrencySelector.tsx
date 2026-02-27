'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DollarSign, RefreshCw } from 'lucide-react';

export function CurrencySelector() {
  const { currentProject, setExchangeRate, exchangeRate, targetCurrency } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [rateInput, setRateInput] = useState('1.0');

  if (!currentProject) return null;

  const handleApply = () => {
    // Substitui vírgula por ponto para evitar erros de conversão
    const rate = parseFloat(rateInput.replace(',', '.'));
    
    if (!isNaN(rate) && rate > 0) {
      // Se a taxa for 1, volta para a moeda original. 
      // Se for diferente, assume USD (ou permite customizar no futuro)
      const newCurrency = rate === 1.0 ? currentProject.currency_main : 'USD';
      
      setExchangeRate(rate, newCurrency || 'BRL');
      setIsOpen(false);
    }
  };

  const isConverting = exchangeRate !== 1.0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant={isConverting ? "secondary" : "outline"} className="gap-2 border-dashed">
          <DollarSign className="h-4 w-4" />
          {isConverting 
            ? `Convertido (÷${exchangeRate})` 
            : `Moeda Base (${currentProject.currency_main})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Simular Câmbio
            </h4>
            <p className="text-xs text-muted-foreground">
              Insira a taxa para converter visualmente os valores do projeto.
              <br/><strong>O banco de dados não será alterado.</strong>
            </p>
          </div>
          
          <div className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
            <span className="text-sm font-bold text-slate-500">Divisor:</span>
            <Input 
              value={rateInput} 
              onChange={(e) => setRateInput(e.target.value)}
              className="h-8 bg-white"
              placeholder="Ex: 5.50"
              type="text" // Text para permitir digitar vírgula antes de tratar
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => {
              setExchangeRate(1.0, currentProject.currency_main || 'BRL');
              setRateInput('1.0');
              setIsOpen(false);
            }}>
              Resetar
            </Button>
            <Button size="sm" onClick={handleApply}>
              Aplicar Taxa
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}