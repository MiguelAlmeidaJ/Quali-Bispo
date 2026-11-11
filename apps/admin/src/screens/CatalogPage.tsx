"use client";
import {useEffect,useMemo,useState} from "react";
import {FiEdit2,FiPlus,FiSearch,FiX} from "react-icons/fi";
import {catalogApi} from "../lib/catalogApi";
import {blankCatalogItem,categories,money,moneyInput,toCents,type CatalogCategory,type CatalogInput,type CatalogItem} from "../types/catalog";

function CatalogModal({item,onClose,onSaved}:{item:CatalogItem|null;onClose:()=>void;onSaved:()=>Promise<void>}){
 const initial=item?{name:item.name,category:item.category,group:item.group,professional:item.professional,
  notes:item.notes,normalPriceCents:item.normalPriceCents,qualiPriceCents:item.qualiPriceCents,active:item.active
 }:{...blankCatalogItem};
 const [form,setForm]=useState<CatalogInput>(initial);
 const [normal,setNormal]=useState(moneyInput(initial.normalPriceCents));
 const [quali,setQuali]=useState(moneyInput(initial.qualiPriceCents));
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  const fn=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!saving)onClose()};
  window.addEventListener("keydown",fn);
  const old=document.body.style.overflow;document.body.style.overflow="hidden";
  return()=>{window.removeEventListener("keydown",fn);document.body.style.overflow=old;};
 },[onClose,saving]);
 function update<K extends keyof CatalogInput>(key:K,value:CatalogInput[K]){setForm(previous=>({...previous,[key]:value}));}
 async function save(event:React.FormEvent){
  event.preventDefault();setError("");
  const normalCents=toCents(normal),qualiCents=toCents(quali);
  if(!Number.isInteger(normalCents)||normalCents<=0||!Number.isInteger(qualiCents)||qualiCents<0||qualiCents>normalCents){
   setError("Confira os valores: o preço normal deve ser positivo, e o Quali não pode ser maior.");return;
  }
  setSaving(true);
  try{
   const input={...form,normalPriceCents:normalCents,qualiPriceCents:qualiCents};
   if(item)await catalogApi.update(item.id,input);else await catalogApi.create(input);
   await onSaved();onClose();
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível salvar");}finally{setSaving(false);}
 }
 return <div className="catalog-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)onClose()}}>
  <section className="catalog-dialog" role="dialog" aria-modal="true" aria-labelledby="catalog-title">
   <header className="catalog-dialog-header"><div><small>TABELA DE VALORES</small><h2 id="catalog-title">{item?"Editar procedimento":"Novo procedimento"}</h2><p>Preços em reais, registrados com precisão de centavos.</p></div>
    <button type="button" onClick={onClose} aria-label="Fechar" disabled={saving}><FiX size={21}/></button></header>
   <form onSubmit={save} className="catalog-form">
    <div className="catalog-form-grid">
     <label className="wide">Nome do procedimento <span>*</span><input required maxLength={200} value={form.name} onChange={e=>update("name",e.target.value)}/></label>
     <label>Categoria <span>*</span><select value={form.category} onChange={e=>update("category",e.target.value as CatalogCategory)}>
      {(Object.entries(categories) as [CatalogCategory,string][]).map(([value,label])=><option value={value} key={value}>{label}</option>)}
     </select></label>
     <label>Grupo / especialidade <span>*</span><input required maxLength={120} value={form.group} onChange={e=>update("group",e.target.value)}/></label>
     <label className="wide">Profissional / responsável<input maxLength={180} value={form.professional||""} onChange={e=>update("professional",e.target.value||null)}/></label>
     <label>Valor normal (R$) <span>*</span><input required inputMode="decimal" value={normal} onChange={e=>setNormal(e.target.value)} placeholder="120,00"/></label>
     <label>Valor Quali (R$) <span>*</span><input required inputMode="decimal" value={quali} onChange={e=>setQuali(e.target.value)} placeholder="65,00"/></label>
     <label className="wide">Observações<textarea rows={3} maxLength={600} value={form.notes||""} onChange={e=>update("notes",e.target.value||null)} placeholder="Ex.: faixa etária, condições do procedimento..."/></label>
     <label className="catalog-check wide"><input type="checkbox" checked={form.active} onChange={e=>update("active",e.target.checked)}/><span>Disponível no Clube Quali</span></label>
    </div>
    {item?.sourceDocument&&<p className="catalog-source">Origem: {item.sourceDocument}</p>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <div className="catalog-dialog-actions"><button className="catalog-cancel" type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="catalog-save" disabled={saving} type="submit">{saving?"Salvando...":"Salvar procedimento"}</button></div>
   </form>
  </section>
 </div>;
}

export function CatalogPage(){
 const [items,setItems]=useState<CatalogItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [search,setSearch]=useState(""),[category,setCategory]=useState(""),[status,setStatus]=useState("active");
 const [modal,setModal]=useState<{open:boolean;item:CatalogItem|null}>({open:false,item:null});
 const [page,setPage]=useState(1);
 const pageSize=20;
 async function load(){try{setItems(await catalogApi.list());setError("");}catch(e){setError(e instanceof Error?e.message:"Erro ao buscar procedimentos");}finally{setLoading(false);}}
 useEffect(()=>{void load()},[]);
 const filtered=useMemo(()=>items.filter(item=>{
  if(category&&item.category!==category)return false;
  if(status==="active"&&!item.active)return false;
  if(status==="inactive"&&item.active)return false;
  const q=search.trim().toLocaleLowerCase("pt-BR");
  return !q||[item.name,item.group,item.professional||"",item.notes||""].some(value=>value.toLocaleLowerCase("pt-BR").includes(q));
 }),[items,search,category,status]);
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const currentPage=Math.min(page,totalPages);
 const displayed=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
 function changeFilters(action:()=>void){action();setPage(1);}
 return <div className="catalog-page">
  <div className="catalog-heading"><div><span>GESTÃO DE PREÇOS</span><h1>Tabela de valores</h1><p>Consultas, exames e procedimentos. Alterações aparecem no Clube Quali.</p></div>
   <button className="catalog-save" type="button" onClick={()=>setModal({open:true,item:null})}><FiPlus size={18}/> Novo procedimento</button>
  </div>
  <div className="catalog-stats"><article><span>Itens cadastrados</span><b>{items.length}</b></article><article><span>Disponíveis no Clube</span><b>{items.filter(x=>x.active).length}</b></article><article><span>Categorias</span><b>{new Set(items.map(x=>x.category)).size}</b></article></div>
  <div className="catalog-card"><div className="catalog-toolbar">
   <label className="catalog-search"><FiSearch/><input aria-label="Buscar procedimento" placeholder="Buscar exame, consulta, profissional..." value={search} onChange={e=>changeFilters(()=>setSearch(e.target.value))}/></label>
   <select aria-label="Categoria" value={category} onChange={e=>changeFilters(()=>setCategory(e.target.value))}><option value="">Todas as categorias</option>{(Object.entries(categories) as [CatalogCategory,string][]).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
   <select aria-label="Situação" value={status} onChange={e=>changeFilters(()=>setStatus(e.target.value))}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select>
  </div>
  {error&&<p className="notice error" role="alert">{error}</p>}
  {loading?<p className="catalog-empty">Carregando catálogo...</p>:filtered.length===0?<p className="catalog-empty">Nenhum procedimento encontrado.</p>:
  <div className="catalog-scroll"><table className="catalog-table"><thead><tr><th>PROCEDIMENTO</th><th>CATEGORIA / GRUPO</th><th>VALOR NORMAL</th><th>VALOR QUALI</th><th>DESCONTO</th><th>STATUS</th><th>AÇÕES</th></tr></thead>
   <tbody>{displayed.map(item=><tr key={item.id}><td><b>{item.name}</b>{item.professional&&<small>{item.professional}</small>}{item.notes&&<small title={item.notes}>ⓘ {item.notes}</small>}</td><td>{categories[item.category]}<small>{item.group}</small></td><td>{money(item.normalPriceCents)}</td><td className="catalog-price">{money(item.qualiPriceCents)}</td><td>{Math.round((1-item.qualiPriceCents/item.normalPriceCents)*100)}%</td><td><span className={item.active?"catalog-active":"catalog-inactive"}>{item.active?"Ativo":"Inativo"}</span></td><td><button className="catalog-edit" onClick={()=>setModal({open:true,item})} type="button"><FiEdit2/> Editar</button></td></tr>)}</tbody>
  </table></div>}
  <footer className="catalog-footer catalog-pagination"><span>{filtered.length===0?"Nenhum registro":`Exibindo ${(currentPage-1)*pageSize+1}–${Math.min(currentPage*pageSize,filtered.length)} de ${filtered.length} registros`} · 20 por página</span><nav aria-label="Paginação da tabela de valores"><button type="button" disabled={currentPage===1||loading} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button><span>Página {currentPage} de {totalPages}</span><button type="button" disabled={currentPage===totalPages||loading} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Próxima</button></nav></footer></div>
  {modal.open&&<CatalogModal item={modal.item} onClose={()=>setModal({open:false,item:null})} onSaved={load}/>}
 </div>;
}
