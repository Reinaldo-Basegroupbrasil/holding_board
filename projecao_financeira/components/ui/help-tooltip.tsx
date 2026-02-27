"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
  text: string;
}

export function HelpTooltip({ text }: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="cursor-help inline-flex items-center ml-1 opacity-60 hover:opacity-100 transition-opacity">
            <Info className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] bg-slate-800 text-slate-50 border-none">
          <p className="text-xs leading-relaxed">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}