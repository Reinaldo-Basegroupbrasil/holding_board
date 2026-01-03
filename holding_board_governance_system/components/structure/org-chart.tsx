"use client"

import React, { useMemo, useCallback, useState } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  MarkerType,
  Handle,
  Position,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css'; 
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@supabase/ssr';
import { Lock, Unlock, Move } from 'lucide-react'; // Ícones novos

// --- COMPONENTE DO NÓ (CARD) ---
const CustomNode = ({ data }: any) => {
    const isHolding = data.type === 'Holding' || data.type === 'Fundo';
    
    return (
        <div className={`relative px-4 py-3 shadow-xl rounded-xl border-2 min-w-[220px] transition-all hover:scale-105 ${
            isHolding 
              ? 'bg-slate-900 border-slate-700 text-white' 
              : 'bg-white border-slate-200 text-slate-900'
        } ${data.legal_status === 'PLANNED' ? 'opacity-90 border-dashed' : ''}`}>
            
            <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-1 !rounded-none" />

            <div className="flex flex-col gap-2">
                <div className="font-bold text-sm truncate pr-2">{data.label}</div>
                <div className="flex justify-between items-center">
                    <Badge variant={isHolding ? "secondary" : "outline"} className="text-[9px] h-5">
                        {data.country || "Global"}
                    </Badge>
                    
                    <div className="flex items-center gap-1">
                        {data.legal_status === 'PLANNED' && (
                            <span className="text-[8px] bg-yellow-100 text-yellow-800 px-1 rounded uppercase font-bold">Ideia</span>
                        )}
                        <div className={`w-2 h-2 rounded-full ${
                            data.legal_status === 'PLANNED' ? 'bg-yellow-400' : 'bg-emerald-500'
                        }`} />
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-1 !rounded-none" />
        </div>
    );
};

const nodeTypes = { custom: CustomNode };

export function OrgChart({ companies }: { companies: any[] }) {
  // ESTADO DO CADEADO (Começa travado para facilitar navegação)
  const [isLocked, setIsLocked] = useState(true); 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: any[] = [];
    
    const levels: Record<string, number> = {};
    const getLevel = (id: string): number => {
        if (levels[id] !== undefined) return levels[id];
        const company = companies.find(c => c.id === id);
        if (!company?.parent_company_id) { levels[id] = 0; return 0; }
        const parentLevel = getLevel(company.parent_company_id);
        levels[id] = parentLevel + 1;
        return parentLevel + 1;
    };
    companies.forEach(c => getLevel(c.id));

    const rows: Record<number, any[]> = {};
    companies.forEach(c => {
        const lvl = levels[c.id] || 0;
        if (!rows[lvl]) rows[lvl] = [];
        rows[lvl].push(c);
    });

    Object.keys(rows).forEach((levelStr) => {
        const level = parseInt(levelStr);
        const items = rows[level];
        const startX = items.length > 0 ? (items.length * 280) / -2 : 0; 

        items.forEach((c, index) => {
            let xPos = c.position_x;
            let yPos = c.position_y;

            if (xPos === null || xPos === undefined || isNaN(Number(xPos))) {
                xPos = startX + (index * 280) + 400; 
            }
            
            if (yPos === null || yPos === undefined || isNaN(Number(yPos))) {
                yPos = level * 200 + 50;
            }

            nodes.push({
                id: c.id,
                type: 'custom',
                position: { x: Number(xPos), y: Number(yPos) },
                data: { 
                    label: c.name, 
                    country: c.country, 
                    type: c.type,
                    legal_status: c.legal_status
                },
                // O nó só é arrastável se o cadeado estiver ABERTO (!isLocked)
                draggable: !isLocked, 
            });

            if (c.parent_company_id) {
                edges.push({
                    id: `e-${c.parent_company_id}-${c.id}`,
                    source: c.parent_company_id,
                    target: c.id,
                    animated: true,
                    style: { 
                        stroke: c.legal_status === 'PLANNED' ? '#eab308' : '#334155', 
                        strokeWidth: 2,
                        strokeDasharray: c.legal_status === 'PLANNED' ? '5,5' : '0'
                    },
                    type: 'smoothstep', 
                    markerEnd: { 
                        type: MarkerType.ArrowClosed, 
                        color: c.legal_status === 'PLANNED' ? '#eab308' : '#334155' 
                    },
                });
            }
        });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [companies, isLocked]); // Recalcula se o cadeado mudar

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
      setNodes(initialNodes);
      setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeDragStop = useCallback(async (_: any, node: Node) => {
      if (!node.position.x || !node.position.y || isNaN(node.position.x)) return;

      await supabase
        .from('companies')
        .update({ 
            position_x: node.position.x, 
            position_y: node.position.y 
        })
        .eq('id', node.id);
      
      console.log(`Posição salva: ${node.data.label}`, node.position);
  }, [supabase]);

  return (
    <div className="h-[650px] w-full border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-sm relative">
        
        {/* BOTÃO DO CADEADO (CONTROLE DE EDIÇÃO) */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsLocked(!isLocked)}
                className={`shadow-md border font-bold text-xs gap-2 transition-all ${
                    isLocked 
                        ? 'bg-white text-slate-600 hover:bg-slate-50' 
                        : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                }`}
            >
                {isLocked ? (
                    <>
                        <Lock className="w-3 h-3" /> Layout Travado
                    </>
                ) : (
                    <>
                        <Unlock className="w-3 h-3" /> Modo Edição
                    </>
                )}
            </Button>
        </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        // PROPRIEDADES DE CONTROLE
        nodesDraggable={!isLocked}      // Só arrasta se destravado
        nodesConnectable={!isLocked}    // Só conecta se destravado
        panOnDrag={true}                // Sempre pode arrastar o fundo (pan)
        zoomOnScroll={true}             // Sempre pode dar zoom
        fitView
        attributionPosition="bottom-left"
      >
        <Controls showInteractive={false} className="bg-white border-slate-200 shadow-sm" />
        <MiniMap 
            nodeColor={(n) => n.data.type === 'Holding' ? '#1e293b' : '#fff'} 
            maskColor="rgba(241, 245, 249, 0.7)"
            className="border border-slate-200 rounded-lg"
        />
        <Background gap={20} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  );
}