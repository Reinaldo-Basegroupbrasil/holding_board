import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Check, Trash2, Plus, X, Save, RefreshCw, Pencil, Store, Home, ListRestart } from 'lucide-react';

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default function App() {
  // ESTADOS
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // NOVOS ESTADOS DA VERSÃO 2.0
  const [categoryFilter, setCategoryFilter] = useState('Todos'); // Filtro de categoria
  const [shoppingMode, setShoppingMode] = useState(false); // Modo Compra vs Planejamento
  
  const [formData, setFormData] = useState({
    nome: '', marca: '', categoria: 'Geral', corredor: '', quantidade: 1, preco_unitario: ''
  });

  // --- BUSCA DE DADOS ---
  const fetchProducts = async () => {
    // Se não tiver Supabase configurado, não faz nada
    if (!supabase) { 
      setLoading(false); 
      return; 
    }
    try {
      const { data, error } = await supabase.from('produtos').select('*');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) { 
      console.error('Erro:', error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchProducts();
    if (supabase) {
      const sub = supabase.channel('public:produtos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, () => fetchProducts())
        .subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, []);

  // --- LÓGICA DE FILTRO E ORDENAÇÃO (O CORAÇÃO DO APP) ---
  const filteredProducts = useMemo(() => {
    let list = products;

    // 1. Filtrar por Categoria (se não for "Todos" e não estiver no modo mercado)
    if (!shoppingMode && categoryFilter !== 'Todos') {
      list = list.filter(p => p.categoria === categoryFilter);
    }

    // 2. Lógica do MODO COMPRA
    if (shoppingMode) {
      // No mercado: Mostra só o que marquei para comprar
      list = list.filter(p => p.comprar);
      // Ordena rigorosamente pelo corredor (numérico)
      list = list.sort((a, b) => {
        // Converte para número, se for vazio joga pro final (999)
        const cA = a.corredor ? parseInt(a.corredor) : 999;
        const cB = b.corredor ? parseInt(b.corredor) : 999;
        return cA - cB;
      });
    } else {
      // Em casa: Ordena por nome
      list = list.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return list;
  }, [products, categoryFilter, shoppingMode]);

  // --- CÁLCULOS TOTAIS ---
  const totalBase = products
    .filter(p => p.comprar)
    .reduce((acc, p) => acc + (p.preco_unitario * p.quantidade), 0);
  
  const totalComMargem = totalBase * 1.15; // 15% de margem

  // --- AÇÕES DO BANCO ---
  const toggleComprar = async (id, statusAtual) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, comprar: !statusAtual } : p));
    await supabase.from('produtos').update({ comprar: !statusAtual }).eq('id', id);
  };

  const updatePrice = async (id, novoPreco) => {
    if (supabase) await supabase.from('produtos').update({ preco_unitario: novoPreco }).eq('id', id);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Excluir produto?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      await supabase.from('produtos').delete().eq('id', id);
    }
  };

  // Função para "Virar o Mês" (Desmarcar tudo)
  const resetList = async () => {
    if (window.confirm('Deseja desmarcar todos os itens para começar um novo mês?')) {
      // Atualiza visualmente rápido
      setProducts(prev => prev.map(p => ({ ...p, comprar: false })));
      
      // Envia para o banco (atualiza os que estão true)
      if (supabase) {
        const itemsToUpdate = products.filter(p => p.comprar).map(p => p.id);
        for (const id of itemsToUpdate) {
            await supabase.from('produtos').update({ comprar: false }).eq('id', id);
        }
      }
    }
  }

  // --- MODAL HANDLERS ---
  const handleEdit = (p) => {
    setEditingId(p.id);
    setFormData({ nome: p.nome, marca: p.marca||'', categoria: p.categoria||'Geral', corredor: p.corredor||'', quantidade: p.quantidade||1, preco_unitario: p.preco_unitario||'' });
    setIsModalOpen(true);
  };
  const handleNew = () => {
    setEditingId(null);
    setFormData({ nome: '', marca: '', categoria: 'Geral', corredor: '', quantidade: 1, preco_unitario: '' });
    setIsModalOpen(true);
  };
  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...formData, preco_unitario: formData.preco_unitario || 0 };
    try {
      if (supabase) {
        if (editingId) await supabase.from('produtos').update(payload).eq('id', editingId);
        else await supabase.from('produtos').insert([{ ...payload, comprar: true }]);
      }
      setIsModalOpen(false); handleNew();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  // Pega as categorias únicas para criar os botões de filtro
  const categories = ['Todos', ...new Set(products.map(p => p.categoria).filter(Boolean))];

  return (
    <div className={`min-h-screen pb-24 font-sans text-slate-900 transition-colors duration-500 ${shoppingMode ? 'bg-slate-100' : 'bg-white'}`}>
      
      {/* HEADER INTELIGENTE */}
      <header className={`text-white p-4 sticky top-0 z-20 shadow-lg transition-colors duration-300 ${shoppingMode ? 'bg-blue-700' : 'bg-emerald-600'}`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              {shoppingMode ? <ShoppingCart className="animate-bounce" /> : <Home />}
              <h1 className="font-bold text-lg">{shoppingMode ? 'Modo Mercado' : 'Planejamento'}</h1>
            </div>
            
            {/* BOTÃO MÁGICO DE TROCAR MODO */}
            <button 
              onClick={() => setShoppingMode(!shoppingMode)}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition"
            >
              {shoppingMode ? 'Voltar p/ Casa' : 'Ir ao Mercado'}
              {shoppingMode ? <Home size={14}/> : <Store size={14}/>}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-[10px] opacity-80 uppercase">Total Gôndola</p>
              <p className="font-bold text-xl">R$ {totalBase.toFixed(2)}</p>
            </div>
            <div className="text-right border-l border-white/20 pl-4">
              <p className="text-[10px] opacity-80 uppercase flex items-center justify-end gap-1">
                Com Margem 15%
              </p>
              <p className="font-bold text-xl text-yellow-300">R$ {totalComMargem.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ÁREA DE FILTROS (Só aparece no modo casa) */}
      {!shoppingMode && (
        <div className="sticky top-[108px] bg-slate-50 z-10 border-b border-slate-200 shadow-sm overflow-x-auto">
          <div className="max-w-3xl mx-auto p-2 flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {cat}
              </button>
            ))}
            <button onClick={resetList} className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200 flex items-center gap-1">
              <ListRestart size={12}/> Limpar Mês
            </button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-3 space-y-3 mt-2">
        {loading && <p className="text-center text-slate-500">Carregando...</p>}
        
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-10 opacity-50">
            <ShoppingCart size={48} className="mx-auto mb-2"/>
            <p>Nenhum produto encontrado nesta visão.</p>
          </div>
        )}

        {!loading && filteredProducts.map(product => (
          <div key={product.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex flex-col gap-3 transition-all ${product.comprar ? 'border-emerald-500 opacity-100' : 'border-slate-300 opacity-60'}`}>
            <div className="flex items-start gap-3">
              <button 
                onClick={() => toggleComprar(product.id, product.comprar)}
                className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${product.comprar ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
              >
                <Check size={16} strokeWidth={4} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className={`font-bold text-lg leading-tight ${product.comprar ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{product.nome}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(product)} className="text-slate-300 hover:text-emerald-600 p-2"><Pencil size={18}/></button>
                    {!shoppingMode && <button onClick={() => handleDelete(product.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium border border-slate-200">{product.marca || '-'}</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-100">{product.categoria}</span>
                  {product.corredor && (
                    <span className={`px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${shoppingMode ? 'bg-yellow-100 text-yellow-800 border-yellow-300 text-sm' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                      {shoppingMode && <span className="text-[10px] uppercase">Corredor</span>}
                      {product.corredor}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {product.comprar && (
              <div className="flex items-center bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                <div className="flex flex-col items-center px-2 border-r border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Qtd</span>
                  <span className="font-mono text-lg font-bold text-slate-700">{product.quantidade}</span>
                </div>
                <div className="flex-1 px-3">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Preço Un.</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-400">R$</span>
                    <input 
                      type="number" step="0.01" inputMode="decimal"
                      defaultValue={product.preco_unitario}
                      onBlur={(e) => updatePrice(product.id, e.target.value)}
                      className="w-full bg-transparent font-mono text-xl font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
                <div className="text-right pl-2">
                   <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
                   <span className="font-bold text-emerald-600 text-lg">{(product.quantidade * product.preco_unitario).toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="h-24"></div>
      </main>

      <button onClick={handleNew} className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-xl z-40">
        <Plus size={32} />
      </button>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{editingId ? 'Editar' : 'Novo'} Produto</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm mb-1 text-slate-600">Nome</label><input required name="nome" value={formData.nome} onChange={handleInputChange} className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm mb-1 text-slate-600">Marca</label><input name="marca" value={formData.marca} onChange={handleInputChange} className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"/></div>
                <div><label className="block text-sm mb-1 text-slate-600">Categoria</label>
                  <select name="categoria" value={formData.categoria} onChange={handleInputChange} className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500">
                    <option>Geral</option><option>Hortifruti</option><option>Limpeza</option><option>Higiene</option><option>Carnes</option><option>Bebidas</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm mb-1 text-slate-600">Corredor</label><input name="corredor" value={formData.corredor} onChange={handleInputChange} className="w-full p-3 border rounded-lg bg-slate-50 outline-none text-center font-bold"/></div>
                <div><label className="block text-sm mb-1 text-slate-600">Qtd</label><input type="number" name="quantidade" value={formData.quantidade} onChange={handleInputChange} className="w-full p-3 border rounded-lg bg-slate-50 outline-none text-center font-bold"/></div>
                <div><label className="block text-sm mb-1 text-slate-600">Preço</label><input type="number" step="0.01" name="preco_unitario" value={formData.preco_unitario} onChange={handleInputChange} className="w-full p-3 border rounded-lg bg-slate-50 outline-none text-center"/></div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl mt-4 flex justify-center items-center gap-2">{saving ? <RefreshCw className="animate-spin"/> : <Save/>} Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}