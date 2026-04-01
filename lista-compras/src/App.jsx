import React, { useState, useEffect, useMemo } from 'react';
// Importação segura para funcionar local e na web
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ShoppingCart, Check, Trash2, Plus, X, Save, RefreshCw, Pencil, Store, Home, ListRestart, Search, FileText } from 'lucide-react';

// --- CONFIGURAÇÃO DO SUPABASE ---
const getEnv = (key) => { try { return import.meta.env[key]; } catch { return ''; } };
const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const todayISODate = () => new Date().toISOString().split('T')[0];

const parseStock = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Se estoque em casa <= 1, quantidade sugerida de compra = 2 */
const suggestedPurchaseQty = (estoque) => (parseStock(estoque) <= 1 ? 2 : 1);

export default function App() {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Estados Persistentes
  const [shoppingMode, setShoppingMode] = useState(() => localStorage.getItem('mercado_mode') === 'true');
  const [marginPct, setMarginPct] = useState(() => Number(localStorage.getItem('mercado_margin')) || 15);
  
  // Filtros
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para controlar se o usuário quer digitar uma categoria nova
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState({
    nome: '', marca: '', categoria: '', corredor: '', quantidade: 1, preco_unitario: '', estoque_em_casa: 0
  });

  // Importar Nota Fiscal (CSV SEFAZ)
  const [isImportNotaOpen, setIsImportNotaOpen] = useState(false);
  const [itensNota, setItensNota] = useState([]);
  const [importNotaSaving, setImportNotaSaving] = useState(false);

  // Salvar preferências
  useEffect(() => { localStorage.setItem('mercado_mode', shoppingMode); }, [shoppingMode]);
  useEffect(() => { localStorage.setItem('mercado_margin', marginPct); }, [marginPct]);

  // --- BUSCA DE DADOS ---
  const fetchProducts = async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from('produtos').select('*');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) { console.error('Erro:', error.message); } finally { setLoading(false); }
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

  // --- LÓGICA DE FILTRO E ORDENAÇÃO ---
  const filteredProducts = useMemo(() => {
    let list = products;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.nome.toLowerCase().includes(lowerTerm) || 
        (p.marca && p.marca.toLowerCase().includes(lowerTerm))
      );
    }

    if (!shoppingMode && categoryFilter !== 'Todos') {
      list = list.filter(p => p.categoria === categoryFilter);
    }

    if (shoppingMode) {
      list = list.filter(p => p.comprar);
      // Ordenação: 1º Não pegos, 2º Pegos (final), 3º Corredor
      list = list.sort((a, b) => {
        if (a.in_cart !== b.in_cart) return a.in_cart ? 1 : -1;
        const cA = parseInt(a.corredor) || 999;
        const cB = parseInt(b.corredor) || 999;
        return cA - cB;
      });
    } else {
      list = list.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return list;
  }, [products, categoryFilter, shoppingMode, searchTerm]);

  // --- CÁLCULOS ---
  const totalBase = products.filter(p => p.comprar).reduce((acc, p) => acc + (p.preco_unitario * p.quantidade), 0);
  const totalCart = products.filter(p => p.comprar && p.in_cart).reduce((acc, p) => acc + (p.preco_unitario * p.quantidade), 0);
  const totalComMargem = totalBase * (1 + (marginPct/100));

  // --- AÇÕES ---
  const toggleComprar = async (id, status) => {
    const next = !status;
    const p = products.find(x => x.id === id);
    let patch = { comprar: next };
    if (next && p && parseStock(p.estoque_em_casa) <= 1) {
      const q = suggestedPurchaseQty(p.estoque_em_casa);
      patch.quantidade = q;
    }
    setProducts(prev => prev.map(pr => pr.id === id ? { ...pr, ...patch } : pr));
    if (supabase) await supabase.from('produtos').update(patch).eq('id', id);
  };

  const toggleInCart = async (id, status) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, in_cart: !status } : p));
    if (supabase) await supabase.from('produtos').update({ in_cart: !status }).eq('id', id);
  };

  const updatePrice = async (id, val) => {
    if (supabase) await supabase.from('produtos').update({ preco_unitario: val }).eq('id', id);
  };

  const updateCorredor = async (id, val) => {
    const trimmed = String(val ?? '').trim();
    setProducts(prev => prev.map(p => p.id === id ? { ...p, corredor: trimmed } : p));
    if (supabase) await supabase.from('produtos').update({ corredor: trimmed || null }).eq('id', id);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja EXCLUIR este produto?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      if (supabase) await supabase.from('produtos').delete().eq('id', id);
    }
  };

  const resetList = async () => {
    if (!window.confirm('Iniciar novo mês? (Itens da lista serão fechados: estoque e data da última compra atualizados)')) return;

    const snapshot = products.filter(p => p.comprar);
    const date = todayISODate();

    setProducts(prev => prev.map(p => {
      if (!p.comprar) return p;
      const boughtQty = Number(p.quantidade) || 0;
      return {
        ...p,
        comprar: false,
        in_cart: false,
        data_ultima_compra: date,
        estoque_em_casa: parseStock(p.estoque_em_casa) + boughtQty
      };
    }));

    if (supabase) {
      for (const p of snapshot) {
        const boughtQty = Number(p.quantidade) || 0;
        const newStock = parseStock(p.estoque_em_casa) + boughtQty;
        await supabase.from('produtos').update({
          comprar: false,
          in_cart: false,
          data_ultima_compra: date,
          estoque_em_casa: newStock
        }).eq('id', p.id);
      }
    }
  };

  // --- MODAL ---
  const handleEdit = (p) => {
    setEditingId(p.id);
    setIsCustomCategory(false);
    const est = parseStock(p.estoque_em_casa);
    setFormData({
      nome: p.nome,
      marca: p.marca || '',
      categoria: p.categoria || 'Geral',
      corredor: p.corredor || '',
      quantidade: p.quantidade ?? 1,
      preco_unitario: p.preco_unitario || '',
      estoque_em_casa: est
    });
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setIsCustomCategory(false);
    setFormData({ nome: '', marca: '', categoria: 'Geral', corredor: '', quantidade: 2, preco_unitario: '', estoque_em_casa: 0 });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const est = parseStock(formData.estoque_em_casa);
    let qty = Number(formData.quantidade) || 1;
    if (est <= 1 && (Number(formData.quantidade) || 0) <= 1) qty = 2;

    const payload = {
      ...formData,
      preco_unitario: formData.preco_unitario || 0,
      quantidade: qty,
      estoque_em_casa: est
    };
    try {
      if (supabase) {
        if (editingId) await supabase.from('produtos').update(payload).eq('id', editingId);
        else await supabase.from('produtos').insert([{ ...payload, comprar: true }]);
      }
      setIsModalOpen(false); 
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  // Categorias únicas
  const uniqueCategories = useMemo(() => {
    const padrao = ['Geral', 'Hortifruti', 'Limpeza', 'Higiene', 'Carnes', 'Bebidas'];
    const doBanco = products.map(p => p.categoria).filter(Boolean);
    return [...new Set([...padrao, ...doBanco])].sort();
  }, [products]);

  const handleCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const matches = [...text.matchAll(/"([^"]+)"/g)].map(m => m[1]);
      const itensExtraidos = [];
      for (let i = 0; i < matches.length; i += 2) {
        const col1 = matches[i];
        if (col1 && col1.includes('(Código')) {
          const nome = col1.split('(Código')[0].trim();
          const precoMatch = col1.match(/Vl\. Unit\.:\s*([\d,]+)/);
          const preco = precoMatch ? parseFloat(precoMatch[1].replace(',', '.')) : 0;
          if (!itensExtraidos.find(row => row.nome === nome)) {
            itensExtraidos.push({ nome, preco, produtoVinculado: '' });
          }
        }
      }
      setItensNota(itensExtraidos);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const setNotaVinculo = (index, produtoVinculado) => {
    setItensNota(prev => prev.map((row, idx) => (idx === index ? { ...row, produtoVinculado } : row)));
  };

  const closeImportNota = () => {
    setIsImportNotaOpen(false);
    setItensNota([]);
  };

  const handleFinalizarNota = async () => {
    const toUpdate = itensNota.filter(item => item.produtoVinculado);
    if (!supabase) {
      alert('Supabase não configurado.');
      return;
    }
    setImportNotaSaving(true);
    try {
      for (const item of toUpdate) {
        await supabase.from('produtos').update({ preco_unitario: item.preco }).eq('id', item.produtoVinculado);
      }
      await fetchProducts();
      setItensNota([]);
      setIsImportNotaOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setImportNotaSaving(false);
    }
  };

  return (
    <div className={`min-h-screen pb-24 font-sans text-slate-900 transition-colors duration-500 ${shoppingMode ? 'bg-slate-100' : 'bg-white'}`}>
      
      {/* HEADER */}
      <header className={`text-white p-4 sticky top-0 z-20 shadow-lg transition-colors duration-300 ${shoppingMode ? 'bg-blue-600' : 'bg-emerald-600'}`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              {shoppingMode ? <ShoppingCart className="animate-bounce" /> : <Home />}
              <div>
                <h1 className="font-bold text-lg leading-none">{shoppingMode ? 'No Mercado' : 'Planejamento'}</h1>
                {shoppingMode && <span className="text-[10px] opacity-80">Pegos: R$ {totalCart.toFixed(2)}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportNotaOpen(true)}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition"
              >
                <FileText size={14} />
                Importar Nota (CSV)
              </button>
              <button type="button" onClick={() => setShoppingMode(!shoppingMode)} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition">
                {shoppingMode ? 'Voltar' : 'Mercado'}
                {shoppingMode ? <Home size={14}/> : <Store size={14}/>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <p className="text-[10px] opacity-80 uppercase">Total Gôndola</p>
              <p className="font-bold text-2xl">R$ {totalBase.toFixed(2)}</p>
            </div>
            <div className="text-right border-l border-white/20 pl-4 relative group">
              <label className="text-[10px] opacity-80 uppercase flex items-center justify-end gap-1 cursor-pointer">
                Margem <Pencil size={10}/>
                <input 
                  type="number" 
                  value={marginPct} 
                  onChange={(e) => setMarginPct(Number(e.target.value))}
                  className="w-8 bg-transparent border-b border-white/50 text-center text-white outline-none focus:border-white font-bold ml-1"
                />%
              </label>
              <p className="font-bold text-xl text-yellow-300">R$ {totalComMargem.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-2.5 text-white/60" size={16} />
            <input 
              type="text" placeholder="Buscar produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/10 text-white placeholder-white/60 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:bg-black/20 transition"
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-white/60 hover:text-white"><X size={16}/></button>}
          </div>
        </div>
      </header>

      {/* FILTROS (Modo Casa) */}
      {!shoppingMode && (
        <div className="sticky top-[160px] bg-slate-50 z-10 border-b border-slate-200 shadow-sm overflow-x-auto">
          <div className="max-w-3xl mx-auto p-2 flex gap-2">
            <button onClick={() => setCategoryFilter('Todos')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${categoryFilter === 'Todos' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'}`}>Todos</button>
            {uniqueCategories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'}`}>{cat}</button>
            ))}
            <button onClick={resetList} className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200 flex items-center gap-1 flex-shrink-0"><ListRestart size={12}/> Limpar Mês</button>
          </div>
        </div>
      )}

      {/* LISTA */}
      <main className="max-w-3xl mx-auto p-3 space-y-3 mt-2">
        {loading && <p className="text-center text-slate-500">Carregando...</p>}
        {!loading && filteredProducts.map(product => (
          <div key={product.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex flex-col gap-3 transition-all duration-300 ${shoppingMode && product.in_cart ? 'border-gray-300 opacity-50 bg-gray-50 scale-95' : product.comprar ? 'border-emerald-500 opacity-100' : 'border-slate-300 opacity-60'}`}>
            
            <div className="flex items-start gap-3">
              <button 
                type="button"
                onClick={() => shoppingMode ? toggleInCart(product.id, product.in_cart) : toggleComprar(product.id, product.comprar)}
                title={shoppingMode ? 'Marcar como pego' : 'Marcar para comprar'}
                className={`mt-1 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all active:scale-95
                  ${shoppingMode 
                    ? (product.in_cart
                        ? 'w-11 h-11 bg-slate-400 border-slate-400 text-white shadow-inner'
                        : 'w-14 h-14 border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-200/80 hover:bg-emerald-600 hover:border-emerald-600 hover:scale-105'
                      )
                    : `w-8 h-8 ${product.comprar ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent bg-white'}`
                  }`}
              >
                <Check size={shoppingMode && !product.in_cart ? 28 : 18} strokeWidth={3} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                    <h3 className={`font-bold text-lg leading-tight ${(shoppingMode && product.in_cart) || (!shoppingMode && !product.comprar) ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                      {product.nome}
                    </h3>
                    {shoppingMode && (
                      <input
                        type="text"
                        inputMode="numeric"
                        defaultValue={product.corredor ?? ''}
                        key={`cor-${product.id}-${product.corredor}`}
                        onBlur={(e) => {
                          if (e.target.value !== String(product.corredor ?? '')) updateCorredor(product.id, e.target.value);
                        }}
                        placeholder="Cor."
                        className="w-14 shrink-0 px-1.5 py-0.5 text-xs font-bold text-center border-2 border-amber-400 bg-amber-50 text-amber-900 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        aria-label="Corredor"
                      />
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => handleEdit(product)} className="text-slate-300 hover:text-emerald-600 p-2"><Pencil size={18}/></button>
                    {!shoppingMode && (
                      <button type="button" onClick={() => handleDelete(product.id)} className="text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-lg border border-red-100 transition">
                        <Trash2 size={18}/>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium border">{product.marca || '-'}</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-100">{product.categoria}</span>
                  {!shoppingMode && (
                    <span className="bg-violet-50 text-violet-800 px-2 py-0.5 rounded font-bold border border-violet-200">
                      Estoque: {parseStock(product.estoque_em_casa)}
                    </span>
                  )}
                  {!shoppingMode && product.corredor && (
                    <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-medium border border-yellow-200">{product.corredor}</span>
                  )}
                </div>
              </div>
            </div>

            {product.comprar && (
              <div className={`flex items-center p-2 rounded-lg border mt-1 ${shoppingMode && product.in_cart ? 'bg-gray-100 border-gray-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex flex-col items-center px-2 border-r"><span className="text-[10px] text-slate-400 font-bold uppercase">Qtd</span><span className="font-mono text-lg font-bold text-slate-700">{product.quantidade}</span></div>
                <div className="flex-1 px-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Preço Un.</span>
                  {shoppingMode ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-slate-400">R$</span>
                      <span className="font-mono text-xl font-bold text-slate-800">
                        {Number(product.preco_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-slate-400">R$</span>
                      <input type="number" step="0.01" defaultValue={product.preco_unitario} onBlur={(e) => updatePrice(product.id, e.target.value)} className="w-full bg-transparent font-mono text-xl font-bold text-slate-800 outline-none"/>
                    </div>
                  )}
                </div>
                <div className="text-right pl-2"><span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span><span className={`font-bold text-lg ${shoppingMode && product.in_cart ? 'text-gray-500' : 'text-emerald-600'}`}>{(product.quantidade * product.preco_unitario).toFixed(0)}</span></div>
              </div>
            )}
          </div>
        ))}
        <div className="h-24"></div>
      </main>

      <button type="button" onClick={() => { handleNew(); setIsModalOpen(true); }} className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-xl z-40 transition active:scale-90"><Plus size={32} /></button>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{editingId ? 'Editar' : 'Novo'} Produto</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm mb-1 text-slate-600">Nome</label><input required name="nome" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm mb-1 text-slate-600">Marca</label><input name="marca" value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"/></div>
                
                <div>
                  <label className="block text-sm mb-1 text-slate-600">Categoria</label>
                  {!isCustomCategory ? (
                    <select 
                      name="categoria" 
                      value={formData.categoria} 
                      onChange={(e) => {
                        if (e.target.value === 'NEW') {
                          setIsCustomCategory(true);
                          setFormData({...formData, categoria: ''});
                        } else {
                          setFormData({...formData, categoria: e.target.value});
                        }
                      }} 
                      className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecione...</option>
                      {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="NEW">+ Nova Categoria...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        autoFocus
                        name="categoria" 
                        value={formData.categoria} 
                        onChange={(e) => setFormData({...formData, categoria: e.target.value})} 
                        className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Digite a nova..."
                      />
                      <button type="button" onClick={() => setIsCustomCategory(false)} className="p-3 bg-gray-200 rounded-lg text-gray-600"><X size={18}/></button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-600">Estoque em Casa</label>
                <input
                  type="number"
                  min="0"
                  name="estoque_em_casa"
                  value={formData.estoque_em_casa}
                  onChange={(e) => {
                    const v = e.target.value === '' ? '' : Number(e.target.value);
                    const next = { ...formData, estoque_em_casa: v };
                    if (v !== '' && Number(v) <= 1) next.quantidade = 2;
                    setFormData(next);
                  }}
                  className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Com estoque ≤ 1, a quantidade de compra sugerida é 2.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm mb-1 text-slate-600">Corredor</label><input name="corredor" value={formData.corredor} onChange={(e) => setFormData({...formData, corredor: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 outline-none text-center font-bold"/></div>
                <div><label className="block text-sm mb-1 text-slate-600">Qtd</label><input type="number" name="quantidade" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 outline-none text-center font-bold"/></div>
                <div><label className="block text-sm mb-1 text-slate-600">Preço</label><input type="number" step="0.01" name="preco_unitario" value={formData.preco_unitario} onChange={(e) => setFormData({...formData, preco_unitario: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 outline-none text-center"/></div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl mt-4 flex justify-center items-center gap-2">{saving ? <RefreshCw className="animate-spin"/> : <Save/>} Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR NOTA (CSV) */}
      {isImportNotaOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText size={22} className="text-emerald-600" />
                Importar Nota (CSV)
              </h2>
              <button type="button" onClick={closeImportNota} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <label className="block text-sm mb-2 text-slate-600">Arquivo CSV (exportado SEFAZ)</label>
            <input type="file" accept=".csv" onChange={handleCsvFile} className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-800 file:font-semibold" />

            {itensNota.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Vincule cada item à um produto</p>
                <ul className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {itensNota.map((item, index) => (
                    <li key={`${item.nome}-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 border-b border-slate-100 pb-3 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm leading-snug">{item.nome}</p>
                        <p className="text-emerald-700 font-mono font-bold text-sm">
                          R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <select
                        value={item.produtoVinculado}
                        onChange={(e) => setNotaVinculo(index, e.target.value)}
                        className="w-full sm:w-56 min-w-0 p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Selecione o produto…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={importNotaSaving}
                  onClick={handleFinalizarNota}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl mt-2 flex justify-center items-center gap-2"
                >
                  {importNotaSaving ? <RefreshCw className="animate-spin" size={20} /> : null}
                  Atualizar Preços e Finalizar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
