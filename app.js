// ===== extraído de index.html linhas 1453-1470 =====
// Liga o botão de tema — troca o atributo + salva a escolha + recarrega a página (mais simples
// e seguro do que tentar recriar na mão todo gráfico já desenhado nas 5 abas; recarregar é rápido
// porque os dados já ficam em cache do navegador, só os filtros voltam ao padrão).
(function(){
  function syncLabel(){
    var theme = document.documentElement.getAttribute('data-theme') || 'light';
    document.getElementById('themeToggleIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
    document.getElementById('themeToggleLabel').textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
  }
  syncLabel();
  document.getElementById('btnToggleTheme').addEventListener('click', function(){
    var next = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
    try { window.localStorage.setItem('cl_theme', next); } catch(e){}
    location.reload();
  });
})();

// ===== Ativação por teclado pra elementos clicáveis que não são <button> (2026-10-01, análise
// de design) — cards/linhas marcados com role="button" tabindex="0" (gestor-card, resumo-card,
// linhas de tabela clicáveis, KPIs, etc.) ficam alcançáveis via Tab, mas um <div> não dispara
// "click" sozinho ao apertar Enter/Espaço do jeito que um <button> real dispara — isso é só o
// navegador fazendo isso automaticamente PRA botões nativos, não pra qualquer coisa com
// tabindex. Um único listener delegado no document resolve pra TODOS os elementos assim, atuais
// e futuros, sem precisar repetir essa lógica em cada lugar que cria um card clicável. Espaço
// teria rolado a página (comportamento padrão do navegador pra tecla de espaço) — por isso o
// preventDefault só nesse caso.
document.addEventListener('keydown', function(e){
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[role="button"][tabindex]');
  if (!el) return;
  if (e.key === ' ') e.preventDefault();
  el.click();
});
// Marca um elemento não-botão (tr/td/div/span criado via JS) como alcançável por teclado — usar
// junto com addEventListener('click', ...) nos padrões mais comuns (linha de tabela, cabeçalho
// ordenável, card). Não cobre 100% dos cliques da base (são muitos, espalhados em ~30 pontos
// diferentes) — passo focado nos padrões mais repetidos/mais usados, não uma varredura completa.
window.__kb = function(el){ if (el){ el.tabIndex = 0; el.setAttribute('role','button'); } return el; };

// ===== Status por fonte de dado (pedido do Victor, 2026-09-14: "algo que informe o que
// exatamente foi atualizado... BI atualizado, funil não") =====
// Guarda, por tipo de arquivo, a hora real da última vez que foi importado de verdade — mora
// no Firestore (LAST_UPDATED_BY_SOURCE, ver FS_SECTIONS/buildDataPayload em index.html/mais
// abaixo), igual ao CARTEIRA_MAP: uma correção de código/republicação no GitHub NUNCA toca
// aqui, só um "Confirmar Atualização" de verdade. window.markSourceUpdated é chamado pelo
// btnConfirmImport (IIFE de import, mais abaixo) pra cada arquivo confirmado na rodada.
// Precisa estar definida ANTES do bloco de baixo (dhFooter), que já chama
// window.renderSourceStatus() na primeira renderização.
let LAST_UPDATED_BY_SOURCE = window.__DASH_DATA__.LAST_UPDATED_BY_SOURCE || {};
window.getLastUpdatedBySource = function(){ return LAST_UPDATED_BY_SOURCE; };
window.markSourceUpdated = function(key){ LAST_UPDATED_BY_SOURCE[key] = new Date().toISOString(); };

// Lista enxuta a pedido do Victor, 2026-09-14 (depois de ver o resultado ao vivo): só os 5
// pilares do dia a dia — tirou "Aguardando Assinatura" e "Carteira/Gestores" da exibição
// (mudam raramente, poluíam a lista). "Elegibilidade" também removida a pedido do Victor,
// 2026-09-28 (mudança rara/histórica, virou ruído na lista). O rastreamento das três continua
// intacto em LAST_UPDATED_BY_SOURCE/btnConfirmImport — só não aparecem aqui; reativar é só
// devolver a entrada nesta lista, sem precisar mexer em mais nada.
const SOURCE_LABELS = [
  {key:'corretoras', name:'Desempenho Comercial', sub:'Extrato do BI · Corretoras'},
  {key:'crescimentoGeral', name:'Crescimento Geral', sub:'Conversão — ontem × hoje'},
  {key:'funilPf', name:'Funil PF', sub:'Pendências · SLA'},
  {key:'funilPme', name:'Funil PME', sub:'Pendências · SLA'},
];

function sourceStatusFor(iso){
  if (!iso) return { tier:'unknown', label:'nunca importado' };
  const then = new Date(iso);
  if (isNaN(then.getTime())) return { tier:'unknown', label:'nunca importado' };
  const now = new Date();
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(then)) / 86400000);
  const hhmm = then.toLocaleString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  if (diffDays <= 0) return { tier:'ok', label:'hoje, ' + hhmm };
  if (diffDays === 1) return { tier:'warn', label:'ontem, ' + hhmm };
  if (diffDays === 2) return { tier:'warn', label:'há 2 dias' };
  return { tier:'stale', label:'há ' + diffDays + ' dias' };
}

window.renderSourceStatus = function(){
  const grid = document.getElementById('dhStatusGrid');
  const dot = document.getElementById('dhLiveDot');
  const text = document.getElementById('dhUpdatedText');
  if (!grid || !dot || !text) return;
  const rank = {ok:0, warn:1, stale:2};
  let worst = 'ok', lateCount = 0;
  grid.innerHTML = SOURCE_LABELS.map(function(s){
    const st = sourceStatusFor(LAST_UPDATED_BY_SOURCE[s.key]);
    // "unknown" (nunca importado nessa sessão de dados) não conta como atraso no resumo —
    // é esperado logo depois desta feature entrar no ar, ainda sem histórico registrado.
    if (st.tier !== 'unknown' && rank[st.tier] > rank[worst]) worst = st.tier;
    if (st.tier === 'warn' || st.tier === 'stale') lateCount++;
    return '<div class="dh-status-row">'
      + '<span class="dh-status-name"><b>' + s.name + '</b><small>' + s.sub + '</small></span>'
      + '<span class="dh-status-tag ' + st.tier + '">' + st.label + '</span>'
      + '</div>';
  }).join('');
  dot.classList.toggle('warn', worst !== 'ok');
  text.textContent = lateCount === 0 ? 'Tudo em dia' : (lateCount + ' fonte' + (lateCount>1?'s':'') + ' atrasada' + (lateCount>1?'s':''));
};

// ===== extraído de index.html linhas 1520-1541 =====
    (function(){
      // Achado 2026-09-08 testando ao vivo: esse bloco roda mais de uma vez no fluxo de
      // login real (confirmado direto — mesmo com uma trava por variável global impedindo o
      // bloco inteiro de rodar de novo, o clique continuava disparando a mudança de atributo
      // duas vezes seguidas, uma desfazendo a outra). Pra não depender de entender exatamente
      // quantas vezes o bloco roda, a solução é usar `toggle.onclick =` (substitui o handler
      // anterior, nunca acumula) em vez de `addEventListener` (empilha um handler novo por
      // chamada) — assim não importa quantas vezes esse trecho execute, só o último handler
      // atribuído conta.
      var toggle = document.getElementById('dhTeamToggle');
      var list = document.getElementById('dhTeamList');
      toggle.onclick = function(){
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        list.classList.toggle('open', !open);
      };

      // Resumo por fonte de dado (substitui o antigo "Atualizado há Xs", que contava a partir
      // do carregamento da página — pedido do Victor, 2026-09-14: "algo que informe o que
      // exatamente foi atualizado... BI atualizado, funil não", porque uma correção de código
      // + reload fazia parecer que os dados tinham acabado de mudar, mesmo sem nada novo
      // importado). Mesmo `.onclick =` (não addEventListener) pelo mesmo motivo do toggle
      // acima — este bloco também pode rodar mais de uma vez no fluxo real de login.
      var footer = document.getElementById('dhFooter');
      var panel = document.getElementById('dhStatusPanel');
      footer.onclick = function(){
        var open = footer.getAttribute('aria-expanded') === 'true';
        footer.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('open', !open);
      };
      footer.onkeydown = function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); footer.click(); } };
      if (window.renderSourceStatus) window.renderSourceStatus();
    })();

// ===== extraído de index.html linhas 2584-2646 =====
/* =========================================================
   NAVEGAÇÃO ENTRE VIEWS
   ========================================================= */
let elInitialized = false;
/* Debounce global — evita re-render completo (KPIs + 6 gráficos + tabela) a cada tecla digitada */
window.debounce = function(fn, ms){
  let t;
  return function(...args){ clearTimeout(t); t = setTimeout(()=>fn.apply(this, args), ms); };
};
function showView(view){
  // Trava de tela pra e-mails em NO_ELEG_EMAILS (ver auth <script> lá em cima) — cobre não só
  // o clique no botão da barra lateral, mas qualquer chamada de showView('el') no código
  // (ex.: o atalho de busca global em execSearchResultsCards). Pedido do Victor, 2026-09-08.
  if (view === 'el' && window.__noEleg__) view = 'overview';
  document.getElementById('viewOverview').classList.toggle('active', view==='overview');
  document.getElementById('viewMj').classList.toggle('active', view==='mj');
  document.getElementById('viewEl').classList.toggle('active', view==='el');
  document.getElementById('viewCompare').classList.toggle('active', view==='compare');
  document.getElementById('navBtnOverview').classList.toggle('active', view==='overview');
  document.getElementById('navBtnMj').classList.toggle('active', view==='mj');
  document.getElementById('navBtnEl').classList.toggle('active', view==='el');
  document.getElementById('navBtnCompare').classList.toggle('active', view==='compare');
  document.getElementById('navBtnRank').classList.toggle('active', view==='rank');
  document.getElementById('viewRank').classList.toggle('active', view==='rank');
  document.getElementById('navBtnConversao').classList.toggle('active', view==='conversao');
  document.getElementById('viewConversao').classList.toggle('active', view==='conversao');
  if (view==="rank" && !window.rankInitialized){ window.rankInitialized = true; renderRanking(); }
  if (view==='conversao' && window.renderConversao){ window.renderConversao(); }
  document.getElementById('mainHeader').style.display = '';
  if(view==='el' && !elInitialized){
    elInitialized = true;
    window.renderEligibilidade();
  }
  if(view==='overview' && window.renderOverview){
    window.renderOverview();
  }
  if(view==='compare' && window.renderCompare){
    window.renderCompare();
  }
}
document.getElementById('navBtnOverview').addEventListener('click', ()=>showView('overview'));
document.getElementById('navBtnMj').addEventListener('click', ()=>showView('mj'));
document.getElementById('navBtnEl').addEventListener('click', ()=>showView('el'));
document.getElementById('navBtnCompare').addEventListener('click', ()=>showView('compare'));
document.getElementById('navBtnRank').addEventListener('click', ()=>showView('rank'));
document.getElementById('navBtnConversao').addEventListener('click', ()=>showView('conversao'));
// Some o botão da Elegibilidade da barra lateral pra quem está em NO_ELEG_EMAILS.
// showView('el') já bloqueia por trás mesmo se o botão aparecer por algum motivo (defesa
// dupla). Pedido do Victor, 2026-09-08.
// Achado 2026-09-08 (migração Firestore): o evento 'authReady' dispara no login, ANTES do
// app.js sequer ser buscado (login → busca dados no Firestore → só então injeta o app.js) —
// então esse listener nunca chegava a tempo de ouvir o evento de verdade, e o botão continuava
// visível pro Alexandre/Camila mesmo com a leitura da aba corretamente bloqueada por trás.
// window.__noEleg__ já está definido (setado no login, bem antes do app.js carregar) —
// checar direto aqui resolve, sem depender de pegar o evento no momento certo.
if (window.__noEleg__) document.getElementById('navBtnEl').style.display = 'none';
window.rankInitialized = false;
let PUBLISHED_AT = window.__DASH_DATA__.publishedAt || "";
document.getElementById('sidebarUpdatedAt').textContent = PUBLISHED_AT || new Date().toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
document.getElementById('globalMonthSelect').addEventListener('change', (e) => {
  if (window.setGlobalMonth) window.setGlobalMonth(e.target.value);
  if (window.renderOverview) window.renderOverview();
  if (window.renderCompare) window.renderCompare();
  if (window.renderEligibilidade) window.renderEligibilidade();
});

// ===== extraído de index.html linhas 2648-3596 =====
/* =========================================================
   VIEW 1 — META JUNHO (dados e lógica isolados em IIFE)
   ========================================================= */
(function(){
  let MJ_TEAMS_BY_MONTH = window.__DASH_DATA__.MJ_TEAMS_BY_MONTH;
  let currentMonth = window.__DASH_DATA__.currentMonth;
  let MJ_TEAMS = MJ_TEAMS_BY_MONTH[currentMonth];
  let PENDENCIAS_PME = window.__DASH_DATA__.PENDENCIAS_PME;
  let PENDENCIAS_PF = window.__DASH_DATA__.PENDENCIAS_PF;
  let PENDENCIAS_ASSINATURA = window.__DASH_DATA__.PENDENCIAS_ASSINATURA || {};
  // Corretoras — vendas do período por gestor (painel "Corretoras — Vendas do Período" e
  // Top 15 da Visão Geral) — guardado por mês, igual MJ_TEAMS_BY_MONTH. Antes era um valor
  // único e "atual" (MJ_CORRETORAS achatado): trocar o "Mês de Referência" no dropdown não
  // mudava essa tabela nenhum pouco, sempre repetindo os dados do último import "ao vivo" —
  // e reimportar um mês passado nem sequer gravava (updateMetaJunhoData só tocava nisso
  // quando isLive). Achado por Victor em 2026-09-02 (no V2, mesmo bug herdado aqui no V1).
  // Migração: se o data.json ainda for do formato antigo (campo achatado), usa ele como
  // valor do mês atual.
  let MJ_CORRETORAS_BY_MONTH = window.__DASH_DATA__.MJ_CORRETORAS_BY_MONTH ||
    (window.__DASH_DATA__.MJ_CORRETORAS ? {[currentMonth]: window.__DASH_DATA__.MJ_CORRETORAS} : {});
  function getCorretoras(month){
    if (month && MJ_CORRETORAS_BY_MONTH[month]) return MJ_CORRETORAS_BY_MONTH[month];
    return MJ_CORRETORAS_BY_MONTH[currentMonth] || {};
  }
  // Corretoras "sem gestor atribuído" / "código não localizado no database" (linhas de
  // rodapé da planilha Meta) — guardado por mês, igual MJ_TEAMS_BY_MONTH. Antes era um valor
  // único e "atual": ao corrigir um mês passado (ex.: reimportar Julho estando em Agosto), o
  // "% Todos os Times" daquele mês somava o não-atribuído ERRADO (o de Agosto, não o de
  // Julho), fazendo o agregado de todos os times não bater. Migração: se o data.json ainda
  // for do formato antigo (campo achatado), usa ele como valor do mês atual.
  let MJ_NAO_ATRIBUIDO_BY_MONTH = window.__DASH_DATA__.MJ_NAO_ATRIBUIDO_BY_MONTH ||
    (window.__DASH_DATA__.MJ_NAO_ATRIBUIDO ? {[currentMonth]: window.__DASH_DATA__.MJ_NAO_ATRIBUIDO} : {});
  function getNaoAtribuido(month){
    if (month && MJ_NAO_ATRIBUIDO_BY_MONTH[month]) return MJ_NAO_ATRIBUIDO_BY_MONTH[month];
    return MJ_NAO_ATRIBUIDO_BY_MONTH[currentMonth] || {ind:0, ss:0, pme:0, adm:0};
  }
  let MJ_BENCHMARK = window.__DASH_DATA__.MJ_BENCHMARK;
  let currentTeam = "ALL_TEAMS";
  // Meses RECONSTRUÍDOS (Jan–Mai/26 — sem fechamento oficial do Excel): montados em memória pelo
  // módulo "Metas por executivo" (metas embutidas + extratos do BI + Carteira atual) via
  // window.mjSetSynthMonths. Ficam nos mesmos objetos *_BY_MONTH pra todas as telas lerem igual,
  // mas NUNCA são gravados no Firestore (getPublishableState filtra) e um import oficial do
  // mesmo mês sempre substitui (updateMetaJunhoData tira o mês daqui). Pedido do Victor,
  // 2026-10-06 (opção A: Jun–Set continuam o fechamento oficial).
  const MJ_SYNTH = new Set();
  const mjOfficialMonths = () => Object.keys(MJ_TEAMS_BY_MONTH).filter(m => !MJ_SYNTH.has(m)).sort();

  const fmt0 = n => Math.round(n).toLocaleString('pt-BR');
  const pctf = n => (n*100).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';

  // Dias úteis (seg-sex) entre dStart e dEnd (inclusive), dentro do mesmo mês/ano — usado pela
  // "Meta Diária" abaixo. Decisão de Victor 2026-09-15: dias úteis, não corridos (a equipe não
  // fecha proposta em fim de semana).
  function countBusinessDays(y, m1, dStart, dEnd){
    let c = 0;
    for (let d = dStart; d <= dEnd; d++){
      const wd = new Date(y, m1 - 1, d).getDay();
      if (wd !== 0 && wd !== 6) c++;
    }
    return c;
  }

  // Quais status do PF ainda "podem virar venda" — confirmado com Victor 2026-09-15 (pedido do
  // sênior dele). Declarada aqui (não junto do resto do bloco "Resumo do Dia" mais abaixo) porque
  // o banner do Meta Junho já chama resumoTotais() na primeira renderização, que acontece antes
  // daquele bloco rodar — um const declarado só lá embaixo cai em "Cannot access before
  // initialization" nessa primeira chamada (achado testando no V2, 2026-09-15).
  const PF_STATUS_PENDENTE = ['PENDENTE', 'AUDITORIA MEDICA', 'Pendente de auditoria médica', 'VALIDO E AUSENTE CRITICA', 'Validos com dados divergentes', 'CONFIRMACAO CLIENTE'];
  const pctColor = p => p >= 1 ? 'var(--green)' : (p >= 0.7 ? 'var(--amber)' : 'var(--red)');
  const pctBg = p => p >= 1 ? 'rgba(22,184,122,.14)' : (p >= 0.7 ? 'rgba(255,184,28,.16)' : 'rgba(245,54,74,.12)');
  const catLabels = {IND:'Individual', SS:'Super Simples', PME:'PME', ADM:'Administradora'};
  const catKeys = Object.keys(catLabels);
  const iniciais = nome => nome.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
  let mjCharts = {};
  let mjCorretorasGestor = null;
  let mjSelectedGestor = null;
  let mjForecastData = null; // último cálculo de forecast do card "Meta Diária" — ver renderMetaJunho
  let mjMetaCatData = null; // último detalhe por categoria do card "Meta do Gestor" — ver renderMetaJunho
  let mjExpandedTeams = new Set(); // times abertos (mostrando gestores) na visão "Todos os Times"
  function destroyMJChart(key){ if(mjCharts[key]){ mjCharts[key].destroy(); delete mjCharts[key]; } }

  function renderCorretoras(gestorNome){
    mjCorretorasGestor = gestorNome;
    const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
    const q = norm(document.getElementById('mjCorretorasSearch').value);
    let rows = getCorretoras(currentMonth)[gestorNome] || [];
    if (q) rows = rows.filter(r => norm(r.n).includes(q) || norm(r.c).includes(q));
    const shown = rows.slice(0, 30);
    const corrBodyEl = document.getElementById('mjCorretorasBody');
    corrBodyEl.innerHTML = shown.length ? shown.map(r => `<tr><td class="name">${r.n}</td><td>${r.filial}</td><td class="num">${r.ind}</td><td class="num">${r.ss}</td><td class="num">${r.pme}</td><td class="num"><b>${r.total}</b></td></tr>`).join('')
      : `<tr><td colspan="6" style="text-align:center; color:var(--muted); padding:20px;">${q ? 'Nenhuma corretora encontrada para "'+q+'".' : 'Sem corretoras com venda no período para este gestor.'}</td></tr>`;
    if (rows.length > 30) corrBodyEl.innerHTML += `<tr><td colspan="6" style="text-align:center; color:var(--muted); font-size:11px; padding:8px;">Mostrando 30 de ${rows.length} — refine a busca para ver outras.</td></tr>`;
  }
  document.getElementById('mjCorretorasSearch').addEventListener('input', window.debounce(() => { if (mjCorretorasGestor) renderCorretoras(mjCorretorasGestor); }, 200));

  // Interatividade do gráfico "% Atingimento por Categoria — Time": clique numa barra (IND/SS/PME)
  // abre modal com as corretoras que venderam naquela categoria, no escopo atual (time/gestor selecionado).
  // ADM fica de fora: a base não tem detalhamento por corretora pra essa categoria, só por gestor.
  const mjCatFieldByKey = {IND:'ind', SS:'ss', PME:'pme'};
  const mjCatIconByKey = {IND:'ic-user', SS:'ic-users', PME:'ic-building', ADM:'ic-clip'};
  let mjCatAllRows = [], mjCatShowGestor = false, mjCatGestorFilterVal = '';

  function getMjCatRows(key){
    const field = mjCatFieldByKey[key];
    if (!field) return {rows:[], showGestor:false};
    const td = getTeamRenderData(currentTeam);
    const selectedMember = mjSelectedGestor ? td.members.find(m=>m.nome===mjSelectedGestor) : null;
    const gestorNames = selectedMember ? [selectedMember.nome] : td.members.map(m=>m.nome);
    const rows = [];
    gestorNames.forEach(g => {
      (getCorretoras(currentMonth)[g] || []).forEach(c => {
        const v = c[field] || 0;
        if (v > 0) rows.push({n:c.n, codigo:c.c||'', gestor:g, filial:c.filial, vidas:v});
      });
    });
    rows.sort((a,b) => b.vidas - a.vidas);
    return {rows, showGestor: gestorNames.length > 1};
  }

  function renderMjCatModal(){
    const q = (document.getElementById('mjCatSearch').value||'').trim().toLowerCase();
    let filtered = mjCatAllRows;
    if (mjCatGestorFilterVal) filtered = filtered.filter(r => r.gestor === mjCatGestorFilterVal);
    if (q) filtered = filtered.filter(r => r.n.toLowerCase().indexOf(q) >= 0 || String(r.codigo).toLowerCase().indexOf(q) >= 0);
    const shown = filtered.slice(0, 30);
    document.getElementById('mjCatGestorTh').style.display = mjCatShowGestor ? '' : 'none';
    const body = document.getElementById('mjCatBody');
    body.innerHTML = shown.length ? shown.map(r => `<tr><td class="name">${r.n}</td><td>${r.codigo}</td><td style="${mjCatShowGestor?'':'display:none;'}">${r.gestor}</td><td>${r.filial}</td><td class="num"><b>${fmt0(r.vidas)}</b></td></tr>`).join('')
      : `<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">${q || mjCatGestorFilterVal ? 'Nenhuma corretora encontrada.' : 'Sem vendas nesta categoria para o escopo atual.'}</td></tr>`;
    if (filtered.length > 30) body.innerHTML += `<tr><td colspan="5" style="text-align:center; color:var(--muted); font-size:11px; padding:8px;">Mostrando 30 de ${filtered.length} — refine a busca para ver outras.</td></tr>`;
  }

  function openMjCatModal(key, pct){
    const {rows, showGestor} = getMjCatRows(key);
    mjCatAllRows = rows; mjCatShowGestor = showGestor; mjCatGestorFilterVal = '';
    document.getElementById('mjCatModalTitle').textContent = catLabels[key];
    const totalVidas = rows.reduce((s,r)=>s+r.vidas,0);
    const pctColorHex = pct>=1?'#16B87A':(pct>=0.7?'#FFB81C':'#F5364A');
    const chipPct = document.getElementById('mjCatChipPct');
    chipPct.textContent = pctf(pct) + ' de atingimento';
    chipPct.style.background = pctColorHex;
    document.getElementById('mjCatChipCount').textContent = `${rows.length} corretora${rows.length===1?'':'s'}`;
    document.getElementById('mjCatChipVidas').textContent = `${fmt0(totalVidas)} vidas`;
    document.getElementById('mjCatModalIcon').innerHTML = `<i class="${mjCatIconByKey[key]}" style="font-size:20px; color:#fff;"></i>`;

    const gestorFilterWrap = document.getElementById('mjCatGestorFilterWrap');
    const gestorFilterSel = document.getElementById('mjCatGestorFilter');
    gestorFilterWrap.style.display = showGestor ? '' : 'none';
    if (showGestor){
      const uniqueGestores = [...new Set(rows.map(r=>r.gestor))].sort();
      gestorFilterSel.innerHTML = '<option value="">Todos os gestores</option>' + uniqueGestores.map(g=>`<option value="${g}">${g}</option>`).join('');
    }

    document.getElementById('mjCatSearch').value = '';
    renderMjCatModal();
    document.getElementById('mjCatModalOverlay').style.display = 'flex';
  }
  document.getElementById('mjCatSearch').addEventListener('input', window.debounce(renderMjCatModal, 200));
  document.getElementById('mjCatGestorFilter').addEventListener('change', (e) => { mjCatGestorFilterVal = e.target.value; renderMjCatModal(); });
  document.getElementById('btnCloseMjCat').addEventListener('click', () => { document.getElementById('mjCatModalOverlay').style.display = 'none'; });
  document.getElementById('mjCatModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'mjCatModalOverlay') document.getElementById('mjCatModalOverlay').style.display = 'none'; });

  function getTeamRenderData(teamKey){
    if (teamKey === 'ALL_TEAMS'){
      const total = {meta:0, int:0, cat:{IND:{meta:0,int:0},SS:{meta:0,int:0},PME:{meta:0,int:0},ADM:{meta:0,int:0}}};
      let members = [];
      Object.values(MJ_TEAMS).forEach(td => {
        total.meta += td.total.meta; total.int += td.total.int;
        ['IND','SS','PME','ADM'].forEach(k => { total.cat[k].meta += td.total.cat[k].meta; total.cat[k].int += td.total.cat[k].int; });
        members = members.concat(td.members);
      });
      return {members, total};
    }
    return MJ_TEAMS[teamKey];
  }

  function renderMetaJunho(){
    if (currentTeam !== 'ALL_TEAMS' && !MJ_TEAMS[currentTeam]) { currentTeam = Object.keys(MJ_TEAMS)[0]; }
    const td = getTeamRenderData(currentTeam);
    const teamLabel = currentTeam === 'ALL_TEAMS' ? 'Todos os Times (NDI SP)' : currentTeam;
    const members = td.members;
    if (mjSelectedGestor && !members.find(m=>m.nome===mjSelectedGestor)) mjSelectedGestor = null;
    const selectedMember = mjSelectedGestor ? members.find(m=>m.nome===mjSelectedGestor) : null;
    const total = selectedMember ? {meta:selectedMember.total.meta, int:selectedMember.total.int, cat:selectedMember.cat} : td.total;
    const pctTotal = total.meta ? total.int/total.meta : 0;

    document.getElementById('mjTeamBannerName').textContent = selectedMember ? `${selectedMember.nome} — ${teamLabel}` : teamLabel;
    const resetBtn = document.getElementById('mjResetTeam');
    if (selectedMember){ resetBtn.style.display = 'inline-flex'; resetBtn.textContent = '↺ Ver o time todo'; }
    else if (currentTeam !== 'ALL_TEAMS'){ resetBtn.style.display = 'inline-flex'; resetBtn.textContent = '↺ Voltar para Todos os Times'; }
    else { resetBtn.style.display = 'none'; }

    const isAllTeamsAggregate = currentTeam === 'ALL_TEAMS' && !selectedMember;
    const naoAtr = getNaoAtribuido(currentMonth);
    const naoAtribuidoTotal = isAllTeamsAggregate ? (naoAtr.ind + naoAtr.ss + naoAtr.pme) : 0;
    const displayInt = total.int + naoAtribuidoTotal;

    // categoria crítica (menor % dentro do escopo selecionado — time ou gestor)
    let critKey = 'IND', critPct = Infinity;
    catKeys.forEach(k => { const p = total.cat[k].meta ? total.cat[k].int/total.cat[k].meta : 0; if (p < critPct){ critPct = p; critKey = k; } });

    const gap = total.meta - displayInt;
    const pctTotalAdj = total.meta ? displayInt/total.meta : 0;

    // Meta Diária: quanto precisa vender por dia útil restante pra fechar o gap, e se o ritmo
    // médio do mês (até ontem) já está enquadrado nesse número. Só faz sentido pro mês vigente
    // de verdade (hoje) — num mês passado/futuro selecionado no dropdown, o gap já é histórico.
    const todayReal = new Date();
    const [gapY, gapM] = currentMonth.split('-').map(Number);
    const isLiveMonth = todayReal.getFullYear() === gapY && (todayReal.getMonth() + 1) === gapM;
    let metaDiariaKpi;
    // Guarda os números completos do forecast (ritmo/gap/projeção) só quando dá pra calcular de
    // verdade — mês vigente, com gap positivo e pelo menos 1 dia útil já passado. Consumido pelo
    // modal aberto ao clicar no card (window.__openMjForecast) — pedido do sênior de Victor
    // 2026-09-15: "vamos ver se é possível colocar a projeção com base no ritmo atual".
    mjForecastData = null;
    if (!isLiveMonth){
      metaDiariaKpi = {icon:"<i class=ic-clock></i>", label:"Meta Diária (dias úteis)", value:"—", sub:"Mês não é o vigente", subClass:""};
    } else if (gap <= 0){
      metaDiariaKpi = {icon:"<i class=ic-clock></i>", label:"Meta Diária (dias úteis)", value:"Meta batida", sub:"Sem gap restante", subClass:"pos"};
    } else {
      const totalDiasNoMes = new Date(gapY, gapM, 0).getDate();
      const diasUteisPassados = countBusinessDays(gapY, gapM, 1, todayReal.getDate() - 1);
      const diasUteisRestantes = countBusinessDays(gapY, gapM, todayReal.getDate(), totalDiasNoMes);
      const necessaria = diasUteisRestantes > 0 ? gap / diasUteisRestantes : gap;
      if (diasUteisPassados === 0){
        metaDiariaKpi = {icon:"<i class=ic-clock></i>", label:"Meta Diária (dias úteis)", value: fmt0(necessaria) + " vidas/dia", sub:"Ainda sem ritmo pra comparar", subClass:""};
      } else {
        const ritmo = displayInt / diasUteisPassados;
        const enquadrado = ritmo >= necessaria;
        metaDiariaKpi = {icon:"<i class=ic-clock></i>", label:"Meta Diária (dias úteis)", value: fmt0(necessaria) + " vidas/dia", sub: (enquadrado ? "Enquadrado" : "Fora do ritmo") + ` — ritmo atual ${fmt0(ritmo)}/dia`, subClass: enquadrado ? "pos" : "neg", onclick:"window.__openMjForecast()"};
        const projecaoAdicional = ritmo * diasUteisRestantes;
        const projecao = displayInt + projecaoAdicional;
        mjForecastData = {
          titulo: selectedMember ? `${selectedMember.nome} — ${teamLabel}` : teamLabel,
          meta: total.meta, realizado: displayInt, gap, necessaria, ritmo, enquadrado,
          diasUteisPassados, diasUteisRestantes,
          projecao, projecaoAdicional,
          // Cobertura em relação à META (não ao gap) — pedido do sênior de Victor 2026-09-15,
          // depois de ver a primeira versão baseada no gap: "a cobertura na realidade tem que
          // ser baseada pela meta mesmo". Equivalente matemático de `enquadrado`
          // (projecao>=meta ⟺ ritmo>=necessaria), só que expresso como %.
          coberturaPct: total.meta > 0 ? projecao / total.meta : null,
        };
      }
    }

    // Detalhe por categoria do card "Meta do Gestor" (pedido do Victor, 2026-09-30: "é
    // interessante aparecer as metas de cada categoria também") — os números já existiam em
    // total.cat[k], só não apareciam na tela. Guardado aqui (mesmo padrão do mjForecastData
    // acima) pro modal aberto via window.__openMjMetaCat() usar exatamente o que está no card
    // no momento do clique, sem recalcular nada.
    mjMetaCatData = {
      titulo: selectedMember ? selectedMember.nome : teamLabel,
      mesLabel: monthLabelPt(currentMonth),
      rows: catKeys.map(k => {
        const meta = total.cat[k].meta, int = total.cat[k].int;
        return { key:k, label:catLabels[k], icon:mjCatIconByKey[k], meta, int, pct: meta ? int/meta : 0 };
      }),
    };

    const kpis = [
      {icon:"<i class=ic-target></i>", label: selectedMember ? "Meta do Gestor" : (isAllTeamsAggregate ? "Meta Total — NDI SP" : "Meta Total do Time"), value: fmt0(total.meta) + " vidas", sub: monthLabelPt(currentMonth), subClass:"", onclick:"window.__openMjMetaCat()", hintTitle:"Ver por categoria"},
      {icon:"<i class=ic-check></i>", label:"Integrado (Realizado)", value: fmt0(displayInt) + " vidas", sub: naoAtribuidoTotal > 0 ? `Inclui ${fmt0(naoAtribuidoTotal)} vidas sem gestor/código não localizado` : (displayInt >= total.meta ? "Meta batida" : "Abaixo da meta"), subClass: displayInt >= total.meta ? "pos" : "warn"},
      {icon:"<i class=ic-chart></i>", label:"% Atingimento", value: pctf(pctTotalAdj), sub: pctTotalAdj >= 1 ? "Acima de 100%" : "Faltam " + pctf(1-pctTotalAdj) + " p/ meta", subClass: pctTotalAdj >= 1 ? "pos" : "neg"},
      {icon:"<i class=ic-warn></i>", label:"Gap p/ Meta", value: (gap>0?fmt0(gap):"0") + " vidas", sub:`Categoria crítica: ${catLabels[critKey]} (${pctf(critPct)})`, subClass:"neg"},
      metaDiariaKpi,
    ];
    const kpiExpandHintSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
    document.getElementById('mjKpiRow').innerHTML = kpis.map(k => `
      <div class="kpi"${k.onclick ? ` onclick="${k.onclick}" style="cursor:pointer" role="button" tabindex="0"` : ''}><div class="kpi-icon">${k.icon}</div><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="sub ${k.subClass}">${k.sub}</div>${k.onclick ? `<div class="kpi-expand-hint" title="${k.hintTitle||'Ver projeção completa'}">${kpiExpandHintSvg}</div>` : ''}</div>
    `).join('');

    // Banner do sênior: mesmos números de Total pra Atuar / Meta Diária já calculados acima,
    // + Sugestão (quem/qual equipe tem mais pendência) — pedido de Victor 2026-09-15.
    const bannerNames = selectedMember ? [selectedMember.nome] : members.map(m => m.nome);
    const bannerTotais = resumoTotais(bannerNames);
    document.getElementById('mjBannerTotalValue').textContent = fmt0(bannerTotais.total) + ' vidas';
    document.getElementById('mjBannerTotalSub').textContent = `${fmt0(bannerTotais.pme)} em funil PME + ${fmt0(bannerTotais.pf)} pendentes PF`;

    document.getElementById('mjBannerMetaValue').textContent = metaDiariaKpi.value;
    const mjBannerMetaTagEl = document.getElementById('mjBannerMetaTag');
    if (metaDiariaKpi.subClass === 'pos'){
      mjBannerMetaTagEl.textContent = metaDiariaKpi.value === 'Meta batida' ? '✓ Meta batida' : '✓ Enquadrado';
      mjBannerMetaTagEl.className = 'mjb-tag ok'; mjBannerMetaTagEl.style.display = '';
    } else if (metaDiariaKpi.subClass === 'neg'){
      mjBannerMetaTagEl.textContent = '⚠ Fora do ritmo';
      mjBannerMetaTagEl.className = 'mjb-tag warn'; mjBannerMetaTagEl.style.display = '';
    } else {
      mjBannerMetaTagEl.style.display = 'none';
    }

    // Sugestão: não faz sentido "cobrar" a própria pessoa quando já se está vendo o gestor
    // individual — nesse caso o card fica escondido. Na visão agregada (Todos os Times), sugere
    // a EQUIPE com mais pendência (é uma visão de diretoria, não de cobrança direta a uma
    // pessoa); dentro de uma equipe específica, sugere o EXECUTIVO com mais pendência dali.
    const sugestaoBoxEl = document.getElementById('mjBannerSugestaoBox');
    if (selectedMember){
      sugestaoBoxEl.style.display = 'none';
    } else {
      sugestaoBoxEl.style.display = '';
      let sugestaoHtml;
      if (isAllTeamsAggregate){
        let bestTeam = null, bestTotal = -1;
        Object.keys(MJ_TEAMS).forEach(t => {
          const tot = resumoTotais(MJ_TEAMS[t].members.map(m => m.nome)).total;
          if (tot > bestTotal){ bestTotal = tot; bestTeam = t; }
        });
        sugestaoHtml = bestTotal > 0
          ? `Olhar equipe <b>${bestTeam}</b> — ${fmt0(bestTotal)} vidas pendentes, o maior volume`
          : `✅ Todas as equipes com funil limpo`;
      } else {
        let bestNome = null, bestTotal = -1;
        members.forEach(m => {
          const tot = resumoTotais([m.nome]).total;
          if (tot > bestTotal){ bestTotal = tot; bestNome = m.nome; }
        });
        sugestaoHtml = bestTotal > 0
          ? `Cobrar <b>${bestNome}</b> — ${fmt0(bestTotal)} vidas pendentes, o maior volume da equipe`
          : `✅ Funil limpo — sem pendência acumulada no time`;
      }
      document.getElementById('mjBannerSugestaoText').innerHTML = sugestaoHtml;
    }

    destroyMJChart('categoria');
    mjCharts.categoria = new Chart(document.getElementById('mjChartCategoria'), {
      type:'bar',
      data:{ labels:catKeys.map(k=>catLabels[k]), datasets:[{ label:'% Atingimento', data:catKeys.map(k=>(total.cat[k].meta?total.cat[k].int/total.cat[k].meta:0)*100), backgroundColor:catKeys.map(k=>{ const p = total.cat[k].meta?total.cat[k].int/total.cat[k].meta:0; return p>=1?'#16B87A':(p>=0.7?'#FFB81C':'#F5364A'); }), borderRadius:6 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        onClick:(evt,els)=>{ if(!els||!els.length) return; const key = catKeys[els[0].index]; if (key === 'ADM') return; const c = total.cat[key]; openMjCatModal(key, c.meta ? c.int/c.meta : 0); },
        onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target){ const key = els&&els.length ? catKeys[els[0].index] : null; evt.native.target.style.cursor = (key && key!=='ADM') ? 'pointer' : 'default'; } },
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>c.raw.toFixed(1)+'%'}}}, scales:{x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{callback:v=>v+'%'}}, y:{grid:{display:false}}} }
    });

    destroyMJChart('metaGestor');
    document.getElementById('mjCorretorasPanel').style.display = isAllTeamsAggregate ? 'none' : '';

    if (isAllTeamsAggregate){
      // Agregado sem seleção: granularidade por TIME (5 barras), não por gestor (19) — evita poluição visual
      const teamRows = Object.keys(MJ_TEAMS).map(t => {
        const tt = MJ_TEAMS[t].total;
        return {name:t, meta:tt.meta, int:tt.int};
      });
      document.getElementById('mjMetaGestorTitle').textContent = 'Meta vs. Integrado por Time';
      document.getElementById('mjMetaGestorSub').textContent = 'Clique numa barra para abrir o detalhe daquele time';
      mjCharts.metaGestor = new Chart(document.getElementById('mjChartMetaGestor'), {
        type:'bar',
        data:{ labels:teamRows.map(r=>r.name), datasets:[
          {label:'Meta', data:teamRows.map(r=>r.meta), backgroundColor:'#cbd5e1', borderRadius:6, barPercentage:.6},
          {label:'Integrado', data:teamRows.map(r=>r.int), backgroundColor:'#2E52D4', borderRadius:6, barPercentage:.6},
        ]},
        options:{ responsive:true, maintainAspectRatio:false,
          onClick:(evt,els)=>{ if(!els||!els.length) return; const name = teamRows[els[0].index].name; setTimeout(()=>{ currentTeam = name; renderMetaJunho(); }, 0); },
          onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
          plugins:{legend:{position:'bottom', labels:{boxWidth:12,font:{size:11}}}}, scales:{y:{beginAtZero:true, grid:{color:'#eef1f6'}}, x:{grid:{display:false}, ticks:{font:{size:10}}}} }
      });

      document.getElementById('mjGestorGridTitle').textContent = 'Desempenho por Time';
      document.getElementById('mjGestorGridSub').textContent = 'Clique num card pra abrir o detalhe completo do time — ou use o botão pra ver todos os gestores aqui mesmo';
      document.getElementById('mjGestorGrid').innerHTML = teamRows.map((r,i) => {
        const p = r.meta ? r.int/r.meta : 0;
        const cor = ['#2E52D4','#F26B21','#101E63','#16B87A','#FFB81C'][i % 5];
        return `<div class="gestor-card" style="cursor:pointer" role="button" tabindex="0" onclick="window.jumpToMetaJunho('${r.name.replace(/'/g,"\\'")}')" title="Ver detalhe deste time">
          <div class="avatar" style="background:${cor}">${iniciais(r.name)}</div><div class="name">${r.name}</div><div class="role">${MJ_TEAMS[r.name].members.length} gestores</div>
          <div class="total-pct" style="color:${pctColor(p)}">${pctf(p)}</div>
          <div class="total-label">${fmt0(r.int)} / ${fmt0(r.meta)} vidas (meta total)</div></div>`;
      }).join('');

      // Botão "Ver todos os gestores" — expande/recolhe as listas por time abaixo dos cards,
      // sem sair da visão "Todos os Times" (pedido explícito: ver todo mundo, mas organizado).
      const totalGestores = teamRows.reduce((s,r)=>s+MJ_TEAMS[r.name].members.length, 0);
      const allOpen = teamRows.length > 0 && teamRows.every(r => mjExpandedTeams.has(r.name));
      const expandBtn = document.getElementById('mjExpandAllBtn');
      expandBtn.style.display = 'inline-flex';
      expandBtn.innerHTML = allOpen ? '<i class=ic-users></i> Fechar gestores' : `<i class=ic-users></i> Ver todos os ${totalGestores} gestores`;
      expandBtn.onclick = () => {
        if (allOpen) mjExpandedTeams.clear(); else teamRows.forEach(r => mjExpandedTeams.add(r.name));
        renderMetaJunho();
      };

      document.getElementById('mjTeamsExpand').innerHTML = teamRows.map((r,i) => {
        const cor = ['#2E52D4','#F26B21','#101E63','#16B87A','#FFB81C'][i % 5];
        const p = r.meta ? r.int/r.meta : 0;
        const isOpen = mjExpandedTeams.has(r.name);
        // Menor % primeiro dentro do time — quem precisa de atenção aparece no topo da lista.
        const members = [...MJ_TEAMS[r.name].members].sort((a,b) => {
          const pa = a.total.meta ? a.total.int/a.total.meta : 0, pb = b.total.meta ? b.total.int/b.total.meta : 0;
          return pa - pb;
        });
        const rowsHtml = members.map(m => {
          const pm = m.total.meta ? m.total.int/m.total.meta : 0;
          return `<div class="mj-team-row" role="button" tabindex="0" onclick="window.jumpToMetaJunho('${r.name.replace(/'/g,"\\'")}', '${m.nome.replace(/'/g,"\\'")}')" title="Ver detalhe deste gestor">
            <div class="mj-tr-avatar" style="background:${m.cor}">${iniciais(m.nome)}</div>
            <div class="mj-tr-name">${m.nome}</div>
            <div class="mj-tr-bar"><div class="mj-tr-bar-fill" style="width:${Math.min(pm*100,100)}%; background:${pctColor(pm)}"></div></div>
            <div class="mj-tr-pct" style="color:${pctColor(pm)}">${pctf(pm)}</div>
            <div class="mj-tr-vidas">${fmt0(m.total.int)} vidas</div>
          </div>`;
        }).join('');
        return `<div class="mj-team-expand ${isOpen?'open':''}">
          <div class="mj-team-expand-head" style="border-left-color:${cor}" role="button" tabindex="0" onclick="window.__mjToggleTeamExpand('${r.name.replace(/'/g,"\\'")}')">
            <div class="mj-team-expand-title" style="color:${cor}"><span class="chev">${isOpen?'▾':'▸'}</span>${r.name} — ${pctf(p)}</div>
            <div class="mj-team-expand-sub">${fmt0(r.int)} / ${fmt0(r.meta)} vidas</div>
          </div>
          ${isOpen ? `<div class="mj-team-expand-body">${rowsHtml}</div>` : ''}
        </div>`;
      }).join('');
      // Visão por trimestre: este caminho (todas as equipes) retorna antes do gancho do fim da função.
      if (window.__mjAfterRender) window.__mjAfterRender();
      return;
    }
    document.getElementById('mjExpandAllBtn').style.display = 'none';
    document.getElementById('mjTeamsExpand').innerHTML = '';

    document.getElementById('mjMetaGestorTitle').textContent = `Meta vs. Integrado por Gestor — ${teamLabel}`;
    document.getElementById('mjMetaGestorSub').textContent = 'Clique numa barra para ver o detalhe daquele gestor';
    document.getElementById('mjGestorGridTitle').textContent = `Performance Individual por Gestor — ${teamLabel}`;
    document.getElementById('mjGestorGridSub').textContent = 'Quebra por categoria: Individual (IND) · Super Simples (SS) · PME · Administradora (ADM)';

    mjCharts.metaGestor = new Chart(document.getElementById('mjChartMetaGestor'), {
      type:'bar',
      data:{ labels:members.map(m=>m.nome), datasets:[
        {label:'Meta', data:members.map(m=>m.total.meta), backgroundColor:'#cbd5e1', borderRadius:6, barPercentage:.6},
        {label:'Integrado', data:members.map(m=>m.total.int), backgroundColor:members.map(m=>m.nome===mjSelectedGestor?'#F26B21':'#2E52D4'), borderRadius:6, barPercentage:.6},
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        onClick:(evt, els)=>{ if(!els || !els.length) return; const idx = els[0].index; setTimeout(()=>{ mjSelectedGestor = (mjSelectedGestor===members[idx].nome) ? null : members[idx].nome; renderMetaJunho(); renderCorretoras(members[idx].nome); document.querySelectorAll('#mjCorretorasTabs .subtab-btn').forEach(b=>b.classList.toggle('active', b.dataset.g===members[idx].nome)); }, 0); },
        onHover:(evt,els)=>{ if(evt && evt.native && evt.native.target) evt.native.target.style.cursor = (els && els.length) ? 'pointer' : 'default'; },
        plugins:{legend:{position:'bottom', labels:{boxWidth:12,font:{size:11}}}}, scales:{y:{beginAtZero:true, grid:{color:'#eef1f6'}}, x:{grid:{display:false}, ticks:{font:{size:10}}}} }
    });

    document.getElementById('mjGestorGrid').innerHTML = members.map(m => {
      const pTotal = m.total.meta ? m.total.int/m.total.meta : 0;
      let oppKey = catKeys.find(k => m.cat[k].meta > 0) || catKeys[0], oppPct = Infinity;
      catKeys.forEach(k => { const c = m.cat[k]; if (!c.meta) return; const p = c.int/c.meta; if (p < oppPct){ oppPct = p; oppKey = k; } });
      if (oppPct === Infinity) oppPct = 0;
      const miniCats = catKeys.filter(k=>k!==oppKey).map(k => { const c = m.cat[k]; const p = c.meta ? c.int/c.meta : 0; return `${k} ${pctf(p)}`; }).join(' · ');
      const ringR = 20, ringC = 2*Math.PI*ringR, ringOffset = ringC * (1 - Math.min(pTotal,1));
      return `<div class="gestor-card" style="cursor:pointer" role="button" tabindex="0" onclick="window.showPendenciasModal('${m.nome.replace(/'/g,"\\'")}')" title="Ver pendências PME/PF">
        <div class="avatar" style="background:${m.cor}">${iniciais(m.nome)}</div><div class="name">${m.nome}</div><div class="role">Gestor(a) Comercial</div>
        <div class="ring-row">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="${ringR}" fill="none" stroke="#eef1f6" stroke-width="6"></circle>
            <circle cx="28" cy="28" r="${ringR}" fill="none" stroke="${pctColor(pTotal)}" stroke-width="6" stroke-dasharray="${ringC.toFixed(2)}" stroke-dashoffset="${ringOffset.toFixed(2)}" stroke-linecap="round" transform="rotate(-90 28 28)"></circle>
            <text x="28" y="32" text-anchor="middle" font-size="12" font-weight="700" fill="var(--navy)">${Math.round(pTotal*100)}%</text>
          </svg>
          <div class="ring-info">
            <div class="total-label" style="margin-bottom:0;">${fmt0(m.total.int)} / ${fmt0(m.total.meta)} vidas (meta total)</div>
            <div class="opp-label">Maior oportunidade</div>
            <div class="opp-chip" style="background:${pctBg(oppPct)}; color:${pctColor(oppPct)}">${catLabels[oppKey]} ${pctf(oppPct)}</div>
          </div>
        </div>
        <div class="cat-mini">${miniCats}</div>
      </div>`;
    }).join('');

    document.getElementById('mjCorretorasTitle').textContent = `Corretoras — Vendas do Período (${teamLabel})`;
    const corrTabsEl = document.getElementById('mjCorretorasTabs');
    const defaultCorretorasGestor = (mjSelectedGestor && members.find(m=>m.nome===mjSelectedGestor)) ? mjSelectedGestor : (members[0] ? members[0].nome : null);
    corrTabsEl.innerHTML = members.map(m => `<button class="subtab-btn ${m.nome===defaultCorretorasGestor?'active':''}" data-g="${m.nome}">${m.nome}</button>`).join('');
    corrTabsEl.querySelectorAll('.subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => { corrTabsEl.querySelectorAll('.subtab-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderCorretoras(btn.dataset.g); });
    });
    if (defaultCorretorasGestor) renderCorretoras(defaultCorretorasGestor);
    // Visão por trimestre (módulo "Metas por executivo", no fim deste arquivo) reage a cada render
    // daqui — ver window.__mjAfterRender lá.
    if (window.__mjAfterRender) window.__mjAfterRender();
  }

  document.getElementById('mjResetTeam').addEventListener('click', () => {
    if (mjSelectedGestor){
      mjSelectedGestor = null;
    } else {
      currentTeam = "ALL_TEAMS";
    }
    renderMetaJunho();
  });
  document.getElementById('mjBackToOverview').addEventListener('click', () => showView('overview'));

  // Modal "Meta Diária · Forecast" — pedido do sênior de Victor 2026-09-15 via WhatsApp: além do
  // enquadramento, mostrar o forecast de fim de mês no ritmo atual. Ajustado no mesmo dia, depois
  // de ver funcionando ao vivo: (1) a cobertura mostrada precisa ser em relação à META, não ao
  // gap ("a cobertura na realidade tem que ser baseada pela meta mesmo") — mesmo boolean de
  // enquadrado (projecao>=meta ⟺ ritmo>=necessaria), só troca o número mostrado; (2) o nome vira
  // "Forecast (Previsão)" em vez de "Projeção pro fim do mês". Aberto pelo onclick embutido no
  // card (ver kpis.map em renderMetaJunho); os números vêm de mjForecastData, calculado ali mesmo
  // a cada render.
  window.__openMjForecast = function(){
    const d = mjForecastData;
    if (!d) return;
    document.getElementById('mjForecastTitle').textContent = d.titulo;
    document.getElementById('mjForecastProjecaoValue').textContent = fmt0(d.projecao) + ' vidas';
    document.getElementById('mjForecastProjecaoSub').textContent = `Mantendo o ritmo atual de ${fmt0(d.ritmo)} vidas/dia útil`;

    const coberturaTxt = d.coberturaPct !== null ? pctf(d.coberturaPct) : '—';
    const tagEl = document.getElementById('mjForecastTag');
    tagEl.textContent = (d.enquadrado ? '✓ ' : '⚠ ') + coberturaTxt + ' da meta';
    tagEl.className = 'forecast-tag ' + (d.enquadrado ? 'ok' : 'warn');

    const scaleMax = Math.max(d.projecao, d.meta, 1);
    const fillPct = Math.min(100, (d.realizado / scaleMax) * 100);
    const metaPct = Math.min(100, (d.meta / scaleMax) * 100);
    const projPct = Math.min(100, (d.projecao / scaleMax) * 100);
    document.getElementById('mjForecastGaugeFill').style.width = fillPct + '%';
    const projLeft = Math.min(fillPct, projPct), projWidth = Math.abs(projPct - fillPct);
    const gaugeProjEl = document.getElementById('mjForecastGaugeProj');
    gaugeProjEl.style.left = projLeft + '%'; gaugeProjEl.style.width = projWidth + '%';
    document.getElementById('mjForecastGaugeMetaLine').style.left = metaPct + '%';
    const zoneLeft = Math.min(fillPct, metaPct), zoneWidth = Math.abs(metaPct - fillPct);
    const zoneLabelEl = document.getElementById('mjForecastGaugeZoneLabel');
    zoneLabelEl.style.left = zoneLeft + '%'; zoneLabelEl.style.width = zoneWidth + '%';
    zoneLabelEl.textContent = 'Gap · ' + fmt0(d.gap);
    document.getElementById('mjForecastLabelRealizado').textContent = 'Realizado · ' + fmt0(d.realizado);
    document.getElementById('mjForecastLabelMeta').textContent = 'Meta · ' + fmt0(d.meta);
    document.getElementById('mjForecastLabelProjecao').textContent = 'Forecast · ' + fmt0(d.projecao);

    document.getElementById('mjForecastNecessariaValue').textContent = fmt0(d.necessaria) + '/dia';
    document.getElementById('mjForecastNecessariaSub').textContent = `Gap de ${fmt0(d.gap)} ÷ ${d.diasUteisRestantes} dias úteis restantes`;
    document.getElementById('mjForecastRitmoValue').textContent = fmt0(d.ritmo) + '/dia';
    document.getElementById('mjForecastRitmoSub').textContent = `${fmt0(d.realizado)} vidas ÷ ${d.diasUteisPassados} dias úteis já passados`;
    const sobra = d.projecao - d.meta;
    const coberturaValEl = document.getElementById('mjForecastCoberturaValue');
    coberturaValEl.textContent = `${fmt0(d.projecao)} de ${fmt0(d.meta)}`;
    coberturaValEl.style.color = d.enquadrado ? 'var(--green)' : 'var(--red)';
    document.getElementById('mjForecastCoberturaSub').textContent = coberturaTxt + ' da meta' +
      (sobra >= 0 ? ` — sobra de ${fmt0(sobra)} vidas acima da meta` : ` — faltariam ${fmt0(-sobra)} vidas pra bater a meta nesse ritmo`);

    document.getElementById('mjForecastModalOverlay').style.display = 'flex';
  };
  document.getElementById('btnCloseMjForecast').addEventListener('click', () => { document.getElementById('mjForecastModalOverlay').style.display = 'none'; });
  document.getElementById('mjForecastModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'mjForecastModalOverlay') e.currentTarget.style.display = 'none'; });

  // Modal "Meta por Categoria" — pedido do Victor, 2026-09-30: no card "Meta do Gestor"/"Meta
  // Total", mostrar também a meta (e o realizado) de cada categoria (Individual/Super Simples/
  // PME/Administradora), não só o total somado. Mesmo padrão do forecast acima (ícone de
  // expandir no card, dados prontos em mjMetaCatData a cada render, sem recalcular no clique).
  // Cores/limiares (verde ≥100%, amarelo ≥70%, vermelho abaixo) reaproveitam pctColor/pctBg, já
  // usadas no resto da tela (ex.: gráfico de % Atingimento por categoria).
  window.__openMjMetaCat = function(){
    const d = mjMetaCatData;
    if (!d) return;
    document.getElementById('mjMetaCatTitulo').textContent = d.titulo;
    document.getElementById('mjMetaCatSub').textContent = d.mesLabel;
    document.getElementById('mjMetaCatRows').innerHTML = d.rows.map(r => `
      <div class="mjmc-row">
        <div class="mjmc-icon" style="background:${pctColor(r.pct)};"><i class="${r.icon}" style="font-size:13px; color:#fff;"></i></div>
        <div class="mjmc-body">
          <div class="mjmc-top"><span class="mjmc-name">${r.label}</span><span class="mjmc-nums">${fmt0(r.int)} / ${fmt0(r.meta)} vidas</span></div>
          <div class="mjmc-track"><div class="mjmc-fill" style="width:${Math.min(100, r.pct*100)}%; background:${pctColor(r.pct)};"></div></div>
        </div>
        <div class="mjmc-pct" style="color:${pctColor(r.pct)};">${pctf(r.pct)}</div>
      </div>
    `).join('');
    document.getElementById('mjMetaCatModalOverlay').style.display = 'flex';
  };
  document.getElementById('btnCloseMjMetaCat').addEventListener('click', () => { document.getElementById('mjMetaCatModalOverlay').style.display = 'none'; });
  document.getElementById('mjMetaCatModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'mjMetaCatModalOverlay') e.currentTarget.style.display = 'none'; });

  const MJ_MONTH_LABELS_PT = {'01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho','07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro'};
  function monthLabelPt(yearMonth){
    const [y, m] = String(yearMonth||'').split('-');
    return (MJ_MONTH_LABELS_PT[m] || m) + ' ' + y;
  }
  // Reconstrói o <select> "Mês de referência" a partir dos meses que o painel realmente
  // conhece (MJ_TEAMS_BY_MONTH) — antes tinha só Junho/Julho fixos no HTML, então um mês
  // novo (ex.: Agosto) não aparecia como opção mesmo depois de importado. Agora cresce
  // sozinho a cada mês novo.
  function populateMonthSelect(){
    const sel = document.getElementById('globalMonthSelect');
    // Todos os meses conhecidos, do início do ano até o mais recente (antes só mês atual +
    // anterior). Mês reconstruído (sem fechamento oficial) leva um asterisco + aviso embaixo.
    const months = Object.keys(MJ_TEAMS_BY_MONTH).sort();
    sel.innerHTML = months.map(m => {
      const [y, mm] = m.split('-');
      const label = (MJ_MONTH_LABELS_PT[mm] || mm) + ' ' + y + (MJ_SYNTH.has(m) ? ' *' : '');
      return `<option value="${m}" style="color:#0A1A3A; background:#fff;">${label}</option>`;
    }).join('');
    sel.value = currentMonth;
    updateMonthHint();
  }
  function updateMonthHint(){
    const el = document.getElementById('globalMonthHint');
    if (!el) return;
    if (MJ_SYNTH.has(currentMonth)){ el.style.display = 'block'; el.textContent = '* Mês reconstruído do extrato do BI + Carteira atual (não é o fechamento oficial do Excel).'; }
    else { el.style.display = 'none'; el.textContent = ''; }
  }
  window.isSynthMonth = function(m){ return MJ_SYNTH.has(m); };
  // map: { 'AAAA-MM': { teams, corretoras, naoAtribuido } }. Só entra mês SEM fechamento oficial;
  // chamadas seguintes substituem o conjunto inteiro (ex.: quando a Carteira muda).
  window.mjSetSynthMonths = function(map){
    map = map || {};
    [...MJ_SYNTH].forEach(m => {
      if (map[m]) return;
      MJ_SYNTH.delete(m); delete MJ_TEAMS_BY_MONTH[m]; delete MJ_CORRETORAS_BY_MONTH[m]; delete MJ_NAO_ATRIBUIDO_BY_MONTH[m];
    });
    Object.keys(map).forEach(m => {
      if (MJ_TEAMS_BY_MONTH[m] && !MJ_SYNTH.has(m)) return;   // tem oficial: não mexe
      MJ_TEAMS_BY_MONTH[m] = map[m].teams;
      MJ_CORRETORAS_BY_MONTH[m] = map[m].corretoras || {};
      MJ_NAO_ATRIBUIDO_BY_MONTH[m] = map[m].naoAtribuido || {ind:0, ss:0, pme:0, adm:0};
      MJ_SYNTH.add(m);
    });
    if (!MJ_TEAMS_BY_MONTH[currentMonth]){ currentMonth = mjOfficialMonths().pop(); }
    if (!currentMonth) return;
    MJ_TEAMS = MJ_TEAMS_BY_MONTH[currentMonth];
    populateMonthSelect();
    if (MJ_SYNTH.has(currentMonth)) renderMetaJunho();
  };
  populateMonthSelect();
  renderMetaJunho();

  window.getMetaJunhoData = function(month){
    // Com "month" informado e diferente do mês ao vivo, devolve os times já gravados
    // pra aquele mês específico (pra comparação correta ao corrigir um mês passado).
    // corretoras/não-atribuído já são por mês (ver getCorretoras/getNaoAtribuido) —
    // benchmark continua sendo sempre o "atual" (limitação conhecida, menos crítica
    // porque não varia por gestor/corretora).
    const teams = (month && MJ_TEAMS_BY_MONTH[month]) ? MJ_TEAMS_BY_MONTH[month] : MJ_TEAMS;
    return { teams, benchmark: MJ_BENCHMARK, corretoras: getCorretoras(month), naoAtribuido: getNaoAtribuido(month) };
  };
  // Estrito: devolve os times de UM mês só se esse mês realmente foi importado OFICIALMENTE (null
  // senão, inclusive pra mês reconstruído). getMetaJunhoData(month) acima cai no mês ao vivo quando
  // o mês pedido não existe — certo pra as telas de mês único, errado pra somar trimestre.
  window.getMetaJunhoTeamsStrict = function(month){ return MJ_SYNTH.has(month) ? null : (MJ_TEAMS_BY_MONTH[month] || null); };
  window.getMjCurrentTeam = function(){ return currentTeam; };
  window.updateMetaJunhoData = function(newData){
    // Grava sempre no mês que a planilha realmente representa (detectedMonth),
    // não sempre em "currentMonth" — senão um arquivo de mês passado sobrescreveria
    // silenciosamente o mês atual. Só vira o "estado ao vivo" (currentMonth, benchmark)
    // se for o mês mais recente já conhecido — mas corretoras/não-atribuído são
    // gravados por mês sempre, igual MJ_TEAMS_BY_MONTH, pra não vazar o valor de um mês
    // pro outro (achado por Victor em 2026-09-02: corretoras ainda não seguia essa
    // regra, então trocar o "Mês de Referência" nunca mudava essa tabela).
    const targetMonth = newData.detectedMonth || currentMonth;
    MJ_SYNTH.delete(targetMonth);   // import oficial substitui o mês reconstruído
    const latest = mjOfficialMonths().pop();
    const isLive = !latest || targetMonth >= latest;
    MJ_TEAMS_BY_MONTH[targetMonth] = newData.teams;
    if (newData.naoAtribuido) MJ_NAO_ATRIBUIDO_BY_MONTH[targetMonth] = newData.naoAtribuido;
    if (newData.corretoras) MJ_CORRETORAS_BY_MONTH[targetMonth] = newData.corretoras;
    if (isLive){
      currentMonth = targetMonth;
      MJ_BENCHMARK = newData.benchmark;
    }
    if (targetMonth === currentMonth) MJ_TEAMS = MJ_TEAMS_BY_MONTH[currentMonth];
    if (currentTeam !== 'ALL_TEAMS' && !MJ_TEAMS[currentTeam]) currentTeam = Object.keys(MJ_TEAMS)[0];
    populateMonthSelect();
    renderMetaJunho();
  };
  window.jumpToMetaJunho = function(teamName, gestorNome){
    if (teamName === 'ALL_TEAMS' || MJ_TEAMS[teamName]) currentTeam = teamName;
    mjSelectedGestor = gestorNome || null;
    showView('mj');
    renderMetaJunho();
    setTimeout(()=>{ document.getElementById('mjKpiRow').scrollIntoView({behavior:'smooth', block:'start'}); }, 30);
  };

  window.__mjToggleTeamExpand = function(teamName){
    if (mjExpandedTeams.has(teamName)) mjExpandedTeams.delete(teamName); else mjExpandedTeams.add(teamName);
    renderMetaJunho();
  };

  window.setGlobalMonth = function(month){
    if (!MJ_TEAMS_BY_MONTH[month]) return;
    currentMonth = month;
    MJ_TEAMS = MJ_TEAMS_BY_MONTH[currentMonth];
    updateMonthHint();
    mjSelectedGestor = null;
    if (currentTeam !== 'ALL_TEAMS' && !MJ_TEAMS[currentTeam]) currentTeam = Object.keys(MJ_TEAMS)[0];
    renderMetaJunho();
    // Comparativo → Assessorias também lê o mês de referência (via getCurrentMonth), então
    // precisa re-renderizar quando o usuário troca o mês no dropdown, senão fica mostrando
    // o mês antigo até o usuário mexer em outra coisa na tela.
    if (window.renderCompare) window.renderCompare();
    // Achado 2026-09-04, pedido do Victor: trocar o "Mês de Referência" não mudava nada no
    // Ranking de Vendas — RANKDATA agora tem histórico mensal (m/mc, ver updateRankingData),
    // só faltava reagir à troca do dropdown como as outras telas já fazem.
    if (window.rankInitialized && window.renderRanking) window.renderRanking();
  };
  window.getCurrentMonth = function(){ return currentMonth; };
  // "Junho/2026" etc. (mesmo formato do texto que já existia fixo no subtítulo do gráfico
  // "% Atingimento por Categoria" da Visão Geral) — exposto pra esse subtítulo acompanhar o
  // mês de referência de verdade, em vez de ficar travado no mês em que foi escrito.
  window.getCurrentMonthLabelSlash = function(){
    const [y, m] = String(currentMonth||'').split('-');
    return (MJ_MONTH_LABELS_PT[m] || m) + '/' + y;
  };
  // Mês cronologicamente mais recente já importado — independente de qual mês
  // o usuário está vendo no momento no dropdown "Mês de referência".
  window.getLatestKnownMonth = function(){ return mjOfficialMonths().pop(); };
  window.getPendenciasData = function(){ return {pme: PENDENCIAS_PME, pf: PENDENCIAS_PF, assinatura: PENDENCIAS_ASSINATURA}; };
  window.getPublishableState = function(){
    // Meses reconstruídos (MJ_SYNTH) nunca vão pro Firestore.
    const semSynth = o => { const r = {}; Object.keys(o).forEach(k => { if (!MJ_SYNTH.has(k)) r[k] = o[k]; }); return r; };
    return {
      MJ_TEAMS_BY_MONTH: semSynth(MJ_TEAMS_BY_MONTH),
      currentMonth: MJ_SYNTH.has(currentMonth) ? (mjOfficialMonths().pop() || currentMonth) : currentMonth,
      PENDENCIAS_PME: PENDENCIAS_PME,
      PENDENCIAS_PF: PENDENCIAS_PF,
      PENDENCIAS_ASSINATURA: PENDENCIAS_ASSINATURA,
      MJ_CORRETORAS_BY_MONTH: semSynth(MJ_CORRETORAS_BY_MONTH),
      MJ_NAO_ATRIBUIDO_BY_MONTH: semSynth(MJ_NAO_ATRIBUIDO_BY_MONTH),
      MJ_BENCHMARK: MJ_BENCHMARK,
    };
  };
  window.updatePendenciasData = function(newData){
    if (newData.pme) PENDENCIAS_PME = newData.pme;
    if (newData.pf) PENDENCIAS_PF = newData.pf;
  };
  // A aba "Planilha1" (que alimenta PENDENCIAS_PME) é um extrato menor da mesma base do
  // PLANIUM (aba completa, que alimenta PROPOSTAS/"Em Funil") — às vezes fica um pouco
  // atrasada: uma proposta recém-recebida já aparece no PLANIUM (conta pra "Em Funil" na
  // Conversão), mas ainda não chegou na Planilha1, ficando "invisível" pra quem tenta achar
  // ela pelo número no modal de Pendências (era exatamente o caso da proposta 493400,
  // reportado em 27/08/2026). Preenche essa lacuna: qualquer proposta ativa (pendência/
  // análise) que o PLANIUM já conhece, mas que não tem linha correspondente na Planilha1,
  // entra em PENDENCIAS_PME também — com os dados que o PLANIUM tem (sem CADASTRO/DITEC/
  // BITIX, que só existem na Planilha1) — melhor mostrar incompleta do que não achar nada.
  // Chamado pelo import (window.reconciliarPendenciasComPropostas), depois que tanto
  // Pendências PME/SS quanto o Planium (Propostas) já foram atualizados nessa rodada.
  window.reconciliarPendenciasComPropostas = function(){
    const propostas = window.getPropostasData ? window.getPropostasData() : [];
    if (!propostas.length) return 0;
    const isAtiva = st => /pend|analis/i.test(String(st||''));
    const existentes = new Set();
    Object.values(PENDENCIAS_PME).forEach(arr => arr.forEach(p => existentes.add(String(p.proposta))));
    let adicionadas = 0;
    propostas.filter(p => isAtiva(p.st) && p.g && !existentes.has(String(p.p))).forEach(p => {
      // PENDENCIAS_PME é organizado pelo nome "bonito" (ex.: "Patricia Monks" — é assim que
      // a Planilha1 grava, e é o que o Desempenho Comercial usa pra abrir esse modal). PROPOSTAS
      // (Planium) traz o nome cru ("PATRICIA PESSOA MONKS") — sem essa conversão, a proposta
      // reconciliada ia parar numa chave nova/separada, e só apareceria pra quem abrisse o
      // modal vindo da Conversão (que manda o nome cru), não do Desempenho Comercial.
      const gestorKey = window.getGestorFriendlyName ? window.getGestorFriendlyName(p.g) : p.g;
      (PENDENCIAS_PME[gestorKey] = PENDENCIAS_PME[gestorKey] || []).push({
        proposta: p.p, corretora: p.co,
        // DITEC/CADASTRO o Planium já traz (ver parsePlaniumWorkbook) — só BITIX fica em
        // branco mesmo, porque essa coluna só existe na Planilha1, não no Planium.
        status: { planium: p.st, cadastro: p.ca || '', ditec: p.di || '', bitix: '' },
        dataReceb: p.dr || '', dataVigencia: p.vg, beneficiarios: p.bn,
      });
      adicionadas++;
    });
    return adicionadas;
  };
  window.updateAssinaturaData = function(newData){
    if (newData) PENDENCIAS_ASSINATURA = newData;
  };

  window.updateIntegradoFromRaw = function(byGestor, naoAtribuido){
    // Grava o "não atribuído" do mês corrente também nesse caminho (antes só
    // updateMetaJunhoData fazia isso) — senão a Visão Geral ficava mostrando o valor do
    // último import manual, mesmo depois de um dia inteiro de imports só com o extrato bruto.
    if (naoAtribuido) MJ_NAO_ATRIBUIDO_BY_MONTH[currentMonth] = naoAtribuido;
    // Escreve sempre no balde do mês corrente (não num MJ_CORRETORAS achatado) — ver
    // comentário na declaração de MJ_CORRETORAS_BY_MONTH.
    const corretorasMes = MJ_CORRETORAS_BY_MONTH[currentMonth] = MJ_CORRETORAS_BY_MONTH[currentMonth] || {};
    const activeNames = new Set();
    Object.values(MJ_TEAMS).forEach(td => td.members.forEach(m => activeNames.add(m.nome)));
    Object.keys(corretorasMes).forEach(nome => { if (!activeNames.has(nome)) delete corretorasMes[nome]; });
    Object.keys(MJ_TEAMS).forEach(teamName => {
      const td = MJ_TEAMS[teamName];
      td.members.forEach(m => {
        const upd = byGestor[m.nome];
        if (upd){
          m.cat.IND.int = upd.ind; m.cat.SS.int = upd.ss; m.cat.PME.int = upd.pme; m.cat.ADM.int = upd.adm;
          m.total.int = upd.total;
          corretorasMes[m.nome] = upd.corretoras;
        }
      });
      td.total.int = td.members.reduce((s,m)=>s+m.total.int,0);
      ['IND','SS','PME','ADM'].forEach(k => { td.total.cat[k].int = td.members.reduce((s,m)=>s+m.cat[k].int,0); });
    });
    if (mjSelectedGestor) mjSelectedGestor = null;
    renderMetaJunho();
  };

  let pendCurrentGestor = null;
  let pendActiveTab = 'pme';
  let pendSelectedStatuses = new Set();
  // Nome de exibição de cada "esteira" (campo de status.{campo}) — usado nos chips de filtro
  // de Pendências PME, ver renderPendencias().
  const PEND_STATUS_FIELD_LABELS = {planium:'Planium', cadastro:'Cadastro', ditec:'Ditec', bitix:'Bitix'};
  // Reconstrói o rótulo legível ("Pendente · Ditec") a partir da chave guardada em
  // pendSelectedStatuses ("ditec::PENDENTE") — usado no relatório em PDF, que lê
  // pendSelectedStatuses fora do escopo de renderPendencias().
  function pendStatusKeyToLabel(k){
    const sep = k.indexOf('::');
    if (sep < 0) return k;
    const field = k.slice(0, sep), value = k.slice(sep+2);
    return `${value} · ${PEND_STATUS_FIELD_LABELS[field]||field}`;
  }
  // Guarda o resultado filtrado do último render — "Baixar relatório" usa exatamente o que
  // está na tela (gestor + mês + corretora + status já aplicados), sem recalcular nada.
  let pendLastPmeFiltered = [], pendLastPfFiltered = [];
  // Ordena por Beneficiários (PME) / Vidas (PF) — maior pro menor por padrão, clique no
  // cabeçalho inverte. Sem isso a lista vinha na ordem que chegou do arquivo, então um
  // contrato pequeno podia aparecer no meio de vários grandes sem nenhum padrão visível.
  let pendSortDir = -1;
  const pendMonthOf = dateStr => dateStr ? dateStr.slice(0,7) : null;

  // Junta as entradas de um gestor guardadas sob as duas variantes de nome possíveis (o
  // "bonito", ex. "Patricia Monks", e o cru da planilha, ex. "PATRICIA PESSOA MONKS") — hoje
  // isso só deveria existir por causa de dados já publicados antes da chave ser normalizada
  // (ver window.reconciliarPendenciasComPropostas), mas manter os dois juntos aqui evita que
  // uma proposta "suma" de novo por causa de dado antigo até a próxima atualização completa.
  // Não dá pra só comparar "friendly === gestorNome e parar por aí" (quando gestorNome já
  // vem bonito, tipo do Desempenho Comercial) — precisa varrer as chaves do dicionário e
  // achar quais delas convertem pro mesmo nome bonito, senão a variante crua fica de fora.
  // gestorNome nulo/vazio = "todos os gestores" (pedido do Victor, 2026-09-29, "Consultar
  // Funil", portado do V2 nesta mesma data): reaproveita a mesma função pra cada gestor
  // conhecido, marcando cada proposta com o dono dela (_gestor) — só usado quando a tela
  // mostra todo mundo junto, pra render a coluna Gestor. Não muda em nada o caminho de UM
  // gestor específico (abaixo, inalterado).
  function pendenciasDoGestor(dict, gestorNome, idField){
    if (!gestorNome){
      const friendlies = [...new Set(Object.keys(dict).map(k => window.getGestorFriendlyName ? window.getGestorFriendlyName(k) : k))].sort();
      return friendlies.flatMap(f => pendenciasDoGestor(dict, f, idField).map(p => Object.assign({}, p, { _gestor: f })));
    }
    const friendly = window.getGestorFriendlyName ? window.getGestorFriendlyName(gestorNome) : gestorNome;
    const chaves = Object.keys(dict).filter(k =>
      k === friendly || k === gestorNome ||
      (window.getGestorFriendlyName && window.getGestorFriendlyName(k) === friendly));
    const vistos = new Set();
    const combinado = [];
    chaves.forEach(k => (dict[k]||[]).forEach(p => {
      const id = p[idField];
      if (vistos.has(id)) return;
      vistos.add(id);
      combinado.push(p);
    }));
    return combinado;
  }
  function renderPendencias(){
    const gestorNome = pendCurrentGestor;
    const pme = pendenciasDoGestor(PENDENCIAS_PME, gestorNome, 'proposta');
    const pf = pendenciasDoGestor(PENDENCIAS_PF, gestorNome, 'orcamento');
    document.getElementById('pendFilterLabel').textContent = pendActiveTab === 'pme' ? 'Filtrar por Data Vigência' : 'Filtrar por Data Status';
    document.getElementById('pendPropostaLabel').textContent = pendActiveTab === 'pme' ? 'Buscar por Nº da Proposta' : 'Buscar por Nº do Orçamento';
    document.getElementById('pendPropostaSearch').placeholder = pendActiveTab === 'pme' ? 'Ex.: 12345' : 'Ex.: 67890';
    document.getElementById('pendModalGestor').textContent = gestorNome || 'Todas as equipes';

    // "Consultar Funil" (pedido do Victor, 2026-09-29, portado do V2) — o dropdown de Gestor
    // DENTRO do popup troca pendCurrentGestor e re-renderiza, igual mês/corretora já faziam;
    // nulo = todos os gestores juntos. A coluna Gestor da tabela só aparece nesse caso (sozinho
    // ela é óbvia/redundante — sempre a mesma pessoa).
    const gestorSel = document.getElementById('pendGestorFilter');
    if (document.activeElement !== gestorSel){
      const todosGestores = [...new Set(Object.keys(Object.assign({}, PENDENCIAS_PME, PENDENCIAS_PF)).map(k => window.getGestorFriendlyName ? window.getGestorFriendlyName(k) : k))].sort();
      gestorSel.innerHTML = '<option value="">Todos os gestores</option>' + todosGestores.map(g => `<option value="${g}"${g===gestorNome?' selected':''}>${g}</option>`).join('');
    }
    const showGestorCol = !gestorNome;
    document.getElementById('pendGestorThPme').style.display = showGestorCol ? '' : 'none';
    document.getElementById('pendGestorThPf').style.display = showGestorCol ? '' : 'none';

    const list = pendActiveTab === 'pme' ? pme : pf;
    const dateField = pendActiveTab === 'pme' ? 'dataVigencia' : 'dataStatus';
    const months = [...new Set(list.map(p => pendMonthOf(p[dateField])).filter(Boolean))].sort();
    const sel = document.getElementById('pendMonthFilter');
    const prevVal = sel.value;
    sel.innerHTML = '<option value="">Todos os meses</option>' + months.map(m => `<option value="${m}">${m}</option>`).join('');
    sel.value = months.includes(prevVal) ? prevVal : '';
    const activeMonth = sel.value;

    const corretoras = [...new Set(list.map(p => p.corretora).filter(Boolean))].sort();
    const corSel = document.getElementById('pendCorretoraFilter');
    const prevCor = corSel.value;
    corSel.innerHTML = '<option value="">Todas</option>' + corretoras.map(c => `<option value="${c}">${c}</option>`).join('');
    corSel.value = corretoras.includes(prevCor) ? prevCor : '';
    const activeCorretora = corSel.value;

    // Pedido do Victor, 2026-09-29: "PENDENTE" (Ditec) e "pendencia" (Planium) pareciam
    // duplicados nos chips de filtro, mas são status de esteiras DIFERENTES dentro da mesma
    // proposta — cada campo de status.{planium,cadastro,ditec,bitix} é uma etapa separada do
    // fluxo. Antes só mostrava o valor cru ("PENDENTE"/"pendencia" soltos), sem deixar claro
    // de qual esteira cada um vinha. Agora cada chip carrega o par {campo, valor} e mostra os
    // dois ("Pendente · Ditec"), tanto pra exibir quanto pra filtrar — dois status com o mesmo
    // texto mas de campos diferentes viram chips distintos, nunca fundidos num só sem querer.
    const statusesOf = p => {
      if (Array.isArray(p.status)) return p.status.filter(v=>v && v!=='0').map(v => ({field:null, value:v}));
      if (p.status && typeof p.status === 'object'){
        return Object.entries(p.status).filter(([k,v])=>v && v!=='0').map(([field,value]) => ({field, value}));
      }
      return (p.status && p.status !== '0') ? [{field:null, value:p.status}] : [];
    };
    const statusKey = o => (o.field ? o.field+'::' : '') + o.value;
    const statusLabel = o => pendStatusKeyToLabel(statusKey(o));

    // Quantas vezes cada status aparece no recorte atual — usada pra ordenar por relevância
    // (mais frequente primeiro, dentro de cada esteira) e, no modo "todos os gestores", pra
    // esconder valores que aparecem 1 única vez: amostragem real em 2026-09-29 (no V2, mesma
    // lógica) mostrou que os casos com exatamente 1 ocorrência tinham um ID de registro colado
    // no próprio texto do status (ex. "INICIADO ANÁLISE:EC625813") — glitch de digitação na
    // origem (Ditec/SIGO), não categoria real do funil. Com um gestor específico selecionado a
    // lista já é curta, então não filtra nada ali — só no agregado de todos os gestores é que
    // esse ruído aparece.
    const statusCounts = {};
    list.flatMap(statusesOf).forEach(o => { const k = statusKey(o); statusCounts[k] = (statusCounts[k]||0) + 1; });

    const seenKeys = new Set();
    const statuses = [];
    list.flatMap(statusesOf).forEach(o => { const k = statusKey(o); if (!seenKeys.has(k)){ seenKeys.add(k); statuses.push(o); } });
    pendSelectedStatuses.forEach(k => { if (!seenKeys.has(k)) pendSelectedStatuses.delete(k); });

    const FIELD_ORDER = ['planium','cadastro','ditec','bitix'];
    const visibleStatuses = statuses
      .filter(o => gestorNome || statusCounts[statusKey(o)] > 1)
      .sort((a,b) => {
        const fa = FIELD_ORDER.indexOf(a.field), fb = FIELD_ORDER.indexOf(b.field);
        if (fa !== fb) return fa - fb;
        return statusCounts[statusKey(b)] - statusCounts[statusKey(a)];
      });
    const chipsWrap = document.getElementById('pendStatusChips');
    let lastField;
    chipsWrap.innerHTML = visibleStatuses.map(o => {
      const k = statusKey(o);
      const groupLabel = (o.field && o.field !== lastField) ? `<span class="status-chip-group">${PEND_STATUS_FIELD_LABELS[o.field]||o.field}</span>` : '';
      lastField = o.field;
      return groupLabel + `<span class="status-chip${pendSelectedStatuses.has(k)?' active':''}" data-status="${k}">${statusLabel(o)} <span class="status-chip-count">${statusCounts[k]}</span></span>`;
    }).join('');
    chipsWrap.querySelectorAll('.status-chip').forEach(chip => {
      window.__kb(chip).addEventListener('click', () => {
        const k = chip.dataset.status;
        if (pendSelectedStatuses.has(k)) pendSelectedStatuses.delete(k); else pendSelectedStatuses.add(k);
        renderPendencias();
      });
    });
    document.getElementById('pendStatusClear').style.display = pendSelectedStatuses.size ? '' : 'none';

    // Busca por número — texto livre, casa parcialmente (contém), ignora espaços nas pontas.
    // Proposta (PME) e Orçamento (PF) são campos diferentes, mas o mesmo campo de busca serve
    // pros dois: cada aba já sabe qual número procurar (dataVigencia/dataStatus segue o mesmo padrão).
    const searchRaw = document.getElementById('pendPropostaSearch').value.trim().toLowerCase();

    const pmeFiltered = pme.filter(p => (!activeMonth || pendMonthOf(p.dataVigencia) === activeMonth) && (!activeCorretora || p.corretora === activeCorretora) && (pendActiveTab !== 'pme' || pendSelectedStatuses.size === 0 || statusesOf(p).some(o=>pendSelectedStatuses.has(statusKey(o)))) && (!searchRaw || String(p.proposta||'').toLowerCase().indexOf(searchRaw) >= 0))
      .sort((a,b) => pendSortDir * ((a.beneficiarios||0) - (b.beneficiarios||0)));
    const pfFiltered = pf.filter(p => (!activeMonth || pendMonthOf(p.dataStatus) === activeMonth) && (!activeCorretora || p.corretora === activeCorretora) && (pendActiveTab !== 'pf' || pendSelectedStatuses.size === 0 || statusesOf(p).some(o=>pendSelectedStatuses.has(statusKey(o)))) && (!searchRaw || String(p.orcamento||'').toLowerCase().indexOf(searchRaw) >= 0))
      .sort((a,b) => pendSortDir * ((a.vidas||0) - (b.vidas||0)));
    pendLastPmeFiltered = pmeFiltered;
    pendLastPfFiltered = pfFiltered;
    // "Baixar relatório" continua exigindo UM gestor específico (ver comentário em
    // pendGerarPDF) — em "todos os gestores" fica desabilitado, não só sem fazer nada ao clicar.
    document.getElementById('pendPdfBtn').disabled = !gestorNome || (pendActiveTab === 'pme' ? !pmeFiltered.length : !pfFiltered.length);
    document.getElementById('pendPdfBtn').style.opacity = document.getElementById('pendPdfBtn').disabled ? '.5' : '';
    document.getElementById('pendPdfBtn').style.cursor = document.getElementById('pendPdfBtn').disabled ? 'default' : 'pointer';
    document.getElementById('pendPdfBtn').title = gestorNome ? '' : 'Selecione um gestor específico pra baixar o relatório';

    document.getElementById('pendCountPme').textContent = pmeFiltered.reduce((s,p)=>s+(p.beneficiarios||0),0);
    document.getElementById('pendCountPf').textContent = pfFiltered.reduce((s,p)=>s+(p.vidas||0),0);
    const beneficiariosTotal = pendActiveTab === 'pme'
      ? pmeFiltered.reduce((s,p)=>s+(p.beneficiarios||0),0)
      : pfFiltered.reduce((s,p)=>s+(p.vidas||0),0);
    document.getElementById('pendBeneficiariosTotal').textContent = `Total de beneficiários (filtro atual): ${beneficiariosTotal}`;
    // Estado vazio com nome do filtro ativo + botão "Limpar filtros" — sugestão de polimento
    // visual aprovada por Victor 2026-10-01 (demonstrativo "Polimento Visual"), aplicada aqui
    // porque é o único lugar do app com estado de filtro conhecido o bastante (mês/corretora/
    // status/busca, todos locais a renderPendencias) pra montar a mensagem e o botão de verdade,
    // em vez de um texto genérico "nenhum resultado encontrado".
    const pendFilterParts = [];
    if (activeMonth) pendFilterParts.push(activeMonth);
    if (activeCorretora) pendFilterParts.push(activeCorretora);
    if (pendSelectedStatuses.size) pendFilterParts.push(pendSelectedStatuses.size === 1 ? '1 status' : pendSelectedStatuses.size+' status');
    if (searchRaw) pendFilterParts.push(`busca "${searchRaw}"`);
    const pendHasActiveFilters = pendFilterParts.length > 0;
    const pendEmptyRow = (colspan, label) => `<tr><td colspan="${colspan}"><div class="pend-empty">
        <span class="pend-empty-ic"><i class="ic-search"></i></span>
        <strong>Nenhuma ${label} com esse filtro</strong>
        <p>${pendHasActiveFilters ? 'Filtros ativos: '+pendFilterParts.join(' · ')+'.' : 'Não há pendências cadastradas pra esse gestor no momento.'}</p>
        ${pendHasActiveFilters ? '<button type="button" class="btn-reset pend-empty-clear">Limpar filtros</button>' : ''}
      </div></td></tr>`;
    document.getElementById('pendPmeBody').innerHTML = pmeFiltered.length ? pmeFiltered.map(p => `
      <tr><td>${p.proposta}</td><td class="name">${p.corretora}</td>${showGestorCol?`<td>${p._gestor||''}</td>`:''}<td>
        ${p.status.planium ? `<span class="tag ${p.status.planium==='pendencia'?'react':'noelig'}">${p.status.planium}</span>` : ''}
        <div style="font-size:10.5px; color:var(--muted); margin-top:4px; line-height:1.6;">${['cadastro','ditec','bitix'].filter(k=>p.status[k] && p.status[k]!=='0').map(k=>`${k.charAt(0).toUpperCase()+k.slice(1)}: <b>${p.status[k]}</b>`).join(' · ')}</div>
      </td><td class="num">${p.beneficiarios}</td><td>${p.dataReceb}</td><td>${p.dataVigencia}</td></tr>
    `).join('') : pendEmptyRow(showGestorCol?7:6, 'pendência PME/SS');
    document.getElementById('pendPfBody').innerHTML = pfFiltered.length ? pfFiltered.map(p => `
      <tr><td>${p.orcamento}</td><td class="name">${p.corretora}</td>${showGestorCol?`<td>${p._gestor||''}</td>`:''}<td><span class="tag react">${p.status}</span></td><td class="num">${p.vidas}</td><td>${p.dataStatus}</td></tr>
    `).join('') : pendEmptyRow(showGestorCol?6:5, 'pendência PF');
    document.querySelectorAll('#pendPmeBody .pend-empty-clear, #pendPfBody .pend-empty-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('pendMonthFilter').value = '';
        document.getElementById('pendCorretoraFilter').value = '';
        document.getElementById('pendPropostaSearch').value = '';
        pendSelectedStatuses.clear();
        renderPendencias();
      });
    });
  }

  window.showPendenciasModal = function(gestorNome){
    // Aceita tanto o nome "bonito" (ex.: "Pablo Amora", como vem do Desempenho Comercial)
    // quanto o nome cru da planilha (ex.: "PABLO SERGIO RIBEIRO AMORA", como a aba Conversão
    // usa, vindo do PLANIUM) — quem normaliza/junta as duas variantes é pendenciasDoGestor(),
    // chamada dentro de renderPendencias(), então aqui só guarda o que veio mesmo.
    pendCurrentGestor = gestorNome || null;
    pendActiveTab = 'pme';
    document.getElementById('pendModalGestor').textContent = gestorNome || 'Todas as equipes';
    document.getElementById('pendTabPme').classList.add('active');
    document.getElementById('pendTabPf').classList.remove('active');
    document.getElementById('pendPmeSection').style.display = '';
    document.getElementById('pendPfSection').style.display = 'none';
    document.getElementById('pendMonthFilter').value = '';
    document.getElementById('pendCorretoraFilter').value = '';
    document.getElementById('pendPropostaSearch').value = '';
    pendSelectedStatuses.clear();
    renderPendencias();
    document.getElementById('pendModalOverlay').style.display = 'flex';
  };
  document.getElementById('btnClosePend').addEventListener('click', () => { document.getElementById('pendModalOverlay').style.display = 'none'; });
  document.getElementById('pendModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'pendModalOverlay') document.getElementById('pendModalOverlay').style.display = 'none'; });
  document.getElementById('pendStatusClear').addEventListener('click', () => { pendSelectedStatuses.clear(); renderPendencias(); });
  document.getElementById('pendMonthFilter').addEventListener('change', renderPendencias);
  document.getElementById('pendCorretoraFilter').addEventListener('change', renderPendencias);
  document.getElementById('pendPropostaSearch').addEventListener('input', renderPendencias);
  // Troca o gestor SEM fechar o popup — pedido do Victor, 2026-09-29 ("Consultar Funil"),
  // portado do V2: dropdown vazio = todos os gestores juntos, mesma variável que já controlava
  // tudo o resto.
  document.getElementById('pendGestorFilter').addEventListener('change', (e) => {
    pendCurrentGestor = e.target.value || null;
    document.getElementById('pendModalGestor').textContent = pendCurrentGestor || 'Todas as equipes';
    document.getElementById('pendMonthFilter').value = '';
    document.getElementById('pendCorretoraFilter').value = '';
    pendSelectedStatuses.clear();
    renderPendencias();
  });
  // Botão "Consultar Funil" do Resumo do Dia — abre o mesmo popup de Pendências, só que sem
  // gestor pré-selecionado (todo mundo junto), com o filtro de gestor já disponível lá dentro.
  document.getElementById('btnConsultarFunil').addEventListener('click', () => {
    document.getElementById('resumoModalOverlay').style.display = 'none';
    window.showPendenciasModal(null);
  });

  // "Baixar relatório" — mesmo padrão de PDF-via-HTML do Ranking (rkmGerarPDF, removido em
  // 2026-09-04: casava por nome de corretora entre extrato de vendas e funil, o que não é
  // confiável — "AFFINITY" vendida como QUALI PLANOS no BI, registrada como F8 no Planium).
  // Aqui não tem esse problema: já está tudo filtrado por GESTOR (que os dois sistemas
  // concordam), então baixa exatamente o que está na tela — sem tentar casar nome nenhum.
  function pendGerarPDF(){
    if (!pendCurrentGestor) return;
    const isPme = pendActiveTab === 'pme';
    const rows = (isPme ? pendLastPmeFiltered : pendLastPfFiltered).slice();
    if (!rows.length) return;
    const esc = t => String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const dataBR = iso => iso ? String(iso).split('-').reverse().join('/') : '—';
    const hoje = new Date().toLocaleDateString('pt-BR');
    const fmtN = n => Math.round(n||0).toLocaleString('pt-BR');
    const stColor = st => {
      const s = String(st||'').toLowerCase();
      if (s.indexOf('implant')>=0 || s.indexOf('concluid')>=0 || s.indexOf('liberad')>=0 || s.indexOf('assinado')>=0 || s.indexOf('processado')>=0) return '#16B87A';
      if (s.indexOf('pend')>=0) return '#F26B21';
      if (s.indexOf('cancel')>=0 || s.indexOf('recusad')>=0 || s.indexOf('devolv')>=0) return '#F5364A';
      return '#56608F';
    };
    if (isPme) rows.sort((a,b) => (b.dataVigencia||'').localeCompare(a.dataVigencia||''));
    else rows.sort((a,b) => (b.dataStatus||'').localeCompare(a.dataStatus||''));
    const total = rows.reduce((s,p)=>s+(isPme?(p.beneficiarios||0):(p.vidas||0)), 0);
    const mesFiltroTxt = document.getElementById('pendMonthFilter').value || 'Todos os meses';
    const corFiltroTxt = document.getElementById('pendCorretoraFilter').value || 'Todas as corretoras';
    const stsFiltroTxt = pendSelectedStatuses.size ? [...pendSelectedStatuses].map(pendStatusKeyToLabel).join(', ') : 'Todos os status';

    const linhas = isPme ? rows.map(p => `<tr>
      <td>${esc(p.proposta)}</td>
      <td>${esc(p.corretora)}</td>
      <td class="c">${dataBR(p.dataReceb)}</td>
      <td class="c">${dataBR(p.dataVigencia)}</td>
      <td class="c"><span class="st" style="color:${stColor(p.status.planium)};border-color:${stColor(p.status.planium)}33;background:${stColor(p.status.planium)}14;">${esc(p.status.planium)||'—'}</span></td>
      <td class="c">${esc(p.status.cadastro) || '—'}</td>
      <td class="c">${esc(p.status.ditec) || '—'}</td>
      <td class="c">${esc(p.status.bitix) || '—'}</td>
      <td class="c b">${p.beneficiarios||0}</td>
    </tr>`).join('') : rows.map(p => `<tr>
      <td>${esc(p.orcamento)}</td>
      <td>${esc(p.corretora)}</td>
      <td class="c">${dataBR(p.dataStatus)}</td>
      <td class="c"><span class="st" style="color:${stColor(p.status)};border-color:${stColor(p.status)}33;background:${stColor(p.status)}14;">${esc(p.status)||'—'}</span></td>
      <td class="c b">${p.vidas||0}</td>
    </tr>`).join('');
    const headers = isPme
      ? `<th style="width:10%">Proposta</th><th style="width:23%">Corretora</th><th style="width:10%;text-align:center">Recebido</th><th style="width:10%;text-align:center">Vigência</th><th style="width:14%;text-align:center">Planium</th><th style="width:12%;text-align:center">Cadastro</th><th style="width:8%;text-align:center">DITEC</th><th style="width:8%;text-align:center">BITIX</th><th style="width:5%;text-align:center">Vidas</th>`
      : `<th style="width:13%">Orçamento</th><th style="width:32%">Corretora</th><th style="width:17%;text-align:center">Data Status</th><th style="width:20%;text-align:center">Status</th><th style="width:8%;text-align:center">Vidas</th>`;
    const colspanTotal = isPme ? 8 : 4;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Pendências ${isPme?'PME':'PF'} — ${esc(pendCurrentGestor)}</title>
<style>
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#131C4F;font-size:9px}
.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1D33A8;padding-bottom:8px;margin-bottom:12px}
.hd h1{font-size:15px;color:#101E63;letter-spacing:-.3px}
.hd .sb{font-size:10px;color:#56608F;margin-top:3px}
.hd .rt{text-align:right;font-size:8.5px;color:#56608F;line-height:1.5}
.hd .rt b{color:#101E63;font-size:10px}
.kp{display:flex;gap:8px;margin-bottom:12px}
.kp div{flex:1;border:1px solid #E3E9F8;border-radius:7px;padding:7px 9px;background:#F8FAFF}
.kp .l{font-size:7.5px;font-weight:700;color:#56608F;text-transform:uppercase;letter-spacing:.4px}
.kp .v{font-size:14px;font-weight:800;color:#101E63;margin-top:2px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th{background:#101E63;color:#fff;font-size:7px;text-transform:uppercase;letter-spacing:.3px;padding:5px 4px;text-align:left}
td{padding:4px;border-bottom:1px solid #E8EDF7;font-size:8px;overflow-wrap:break-word}
tr:nth-child(even) td{background:#F8FAFF}
td.c{text-align:center}td.b{font-weight:700}
.st{display:inline-block;padding:1px 5px;border-radius:20px;border:1px solid;font-size:7px;font-weight:700;text-transform:capitalize;white-space:nowrap}
tfoot td{background:#EEF2FD;font-weight:800;font-size:9px;border-top:2px solid #1D33A8}
.ft{margin-top:12px;font-size:7.5px;color:#8B93B8;border-top:1px solid #E3E9F8;padding-top:6px;display:flex;justify-content:space-between}
@media print{.noprint{display:none}}
.noprint{position:fixed;top:10px;right:10px;background:#1D33A8;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,.2)}
</style></head><body>
<button class="noprint" onclick="window.print()">🖨️ Salvar como PDF (Ctrl+P)</button>
<div class="hd">
  <div><h1>Relatório de Pendências ${isPme?'PME/SS':'PF'}</h1><div class="sb">${esc(pendCurrentGestor)}</div></div>
  <div class="rt"><b>Hapvida NDI SP</b><br>Corretora: ${esc(corFiltroTxt)} · Mês: ${esc(mesFiltroTxt)}<br>Status: ${esc(stsFiltroTxt)}<br>Emitido em ${hoje}</div>
</div>
<div class="kp">
  <div><div class="l">Registros</div><div class="v">${rows.length}</div></div>
  <div><div class="l">Vidas</div><div class="v">${fmtN(total)}</div></div>
</div>
<table>
  <thead><tr>${headers}</tr></thead>
  <tbody>${linhas}</tbody>
  <tfoot><tr><td colspan="${colspanTotal}">Total — ${rows.length} registro(s)</td><td class="c">${fmtN(total)}</td></tr></tfoot>
</table>
<div class="ft"><span>Hapvida NotreDame Intermédica · Diretoria Regional SP · NDI SP</span><span>Fonte: Relatório ${isPme?'PME (PLANIUM)':'PF'} · Documento gerado automaticamente</span></div>
</body></html>`;
    try {
      const blob = new Blob(['﻿' + html], {type:'text/html;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const nomeArq = 'Pendencias_' + (isPme?'PME':'PF') + '_' + String(pendCurrentGestor).replace(/[^A-Za-z0-9]+/g,'_').slice(0,40) + '.html';
      const a = document.createElement('a');
      a.href = url; a.download = nomeArq;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 10000);
    } catch(err){
      alert('Erro ao gerar o arquivo: ' + err.message);
    }
  }
  document.getElementById('pendPdfBtn').addEventListener('click', pendGerarPDF);

  document.querySelectorAll('#pendModal thead th[data-k]').forEach(th => {
    window.__kb(th).addEventListener('click', () => {
      pendSortDir *= -1;
      document.querySelectorAll('#pendModal thead th[data-k]').forEach(h => h.setAttribute('data-dir', pendSortDir>0?'asc':'desc'));
      renderPendencias();
    });
  });
  document.getElementById('pendTabPme').addEventListener('click', () => {
    pendActiveTab = 'pme';
    document.getElementById('pendTabPme').classList.add('active'); document.getElementById('pendTabPf').classList.remove('active');
    document.getElementById('pendPmeSection').style.display = ''; document.getElementById('pendPfSection').style.display = 'none';
    document.getElementById('pendMonthFilter').value = '';
    document.getElementById('pendCorretoraFilter').value = '';
    document.getElementById('pendPropostaSearch').value = '';
    pendSelectedStatuses.clear();
    renderPendencias();
  });
  document.getElementById('pendTabPf').addEventListener('click', () => {
    pendActiveTab = 'pf';
    document.getElementById('pendTabPf').classList.add('active'); document.getElementById('pendTabPme').classList.remove('active');
    document.getElementById('pendPfSection').style.display = ''; document.getElementById('pendPmeSection').style.display = 'none';
    document.getElementById('pendMonthFilter').value = '';
    document.getElementById('pendCorretoraFilter').value = '';
    document.getElementById('pendPropostaSearch').value = '';
    pendSelectedStatuses.clear();
    renderPendencias();
  });

  /* ---- Resumo do Dia ---- */
  // Todos os gestores que aparecem nas Pendências PME/PF (não só Cauda Longa) — deriva direto
  // dos dados em vez de lista fixa, então acompanha sozinho se algum gestor entrar/sair.
  const RESUMO_GESTORES = [...new Set([...Object.keys(PENDENCIAS_PME), ...Object.keys(PENDENCIAS_PF)])].sort();
  // Mapa gestor → equipe, mesmo critério já usado em outras partes do painel (Conquista
  // Premiada). Fica duplicado aqui (em vez de compartilhado) porque vive num <script> isolado —
  // mesmo padrão já usado antes nesta base de código pra esse tipo de mapa pequeno e estável.
  const RESUMO_GESTOR_EQUIPE = {
    'Agatha Sakamoto':'CAUDA LONGA', 'Patricia Monks':'CAUDA LONGA', 'Jonathan Leal':'CAUDA LONGA', 'Pablo Amora':'CAUDA LONGA',
    'Erika de Sousa Silva':'PLATAFORMA SP', 'Camila Alves Pertinhez':'PLATAFORMA SP', 'Lais dos Santos Martins':'PLATAFORMA SP', 'Wilder Coca Patzi':'PLATAFORMA SP',
    'Karollainny Rangel de Sousa Lopes':'DIGITAL', 'Daniela Novais dos Santos':'DIGITAL', 'Amanda dos Santos Sobral':'DIGITAL', 'Maxuel Pimentel Nobrega':'DIGITAL',
    'Vivian de Cassia Ambrosio':'PLATAFORMA ABC/ALTO TIETÊ/BX', 'Guilherme de Lima Musachi':'PLATAFORMA ABC/ALTO TIETÊ/BX', 'Izabele de Oliveira da Silva':'PLATAFORMA ABC/ALTO TIETÊ/BX',
    'Kaique Araujo da Silva':'INTERIOR SP', 'Daniela Frederico Martins (Campinas)':'INTERIOR SP', 'Daniela Frederico Martins (AM)':'INTERIOR SP', 'Flavia Auana Silva de Oliveira':'INTERIOR SP',
  };
  const resumoEquipeOf = g => RESUMO_GESTOR_EQUIPE[g] || 'Outras equipes';
  const RESUMO_EQUIPES = [...new Set(RESUMO_GESTORES.map(resumoEquipeOf))].sort();
  let resumoActiveTab = 'pme';

  function initialsOf(nome){
    const partes = nome.trim().split(/\s+/);
    return ((partes[0]||'')[0] + (partes[1]||'')[0]).toUpperCase();
  }

  // Lista efetiva de gestores a mostrar, cruzando os dois filtros (equipe + gestor específico).
  function resumoGestoresFiltrados(){
    const gestorSel = document.getElementById('resumoGestorSel').value;
    if (gestorSel) return [gestorSel];
    const equipeSel = document.getElementById('resumoEquipeSel').value;
    return equipeSel ? RESUMO_GESTORES.filter(g => resumoEquipeOf(g) === equipeSel) : RESUMO_GESTORES;
  }

  // Soma beneficiários por status.planium ('analise'/'pendencia') — mesma lógica binária
  // já usada na tabela de Pendências PME, só agregada por gestor em vez de listada linha a linha.
  function resumoPmeStats(gestorNome){
    const rows = PENDENCIAS_PME[gestorNome] || [];
    let analise = 0, pendencia = 0;
    rows.forEach(p => {
      const v = p.beneficiarios || 0;
      if (p.status && p.status.planium === 'analise') analise += v;
      else if (p.status && p.status.planium === 'pendencia') pendencia += v;
    });
    return { funil: analise + pendencia, analise, pendencia };
  }

  // Soma PME (funil todo) + PF (só status ainda em andamento, ver PF_STATUS_PENDENTE) pro
  // conjunto de gestores filtrado — é a "visão do sênior" pedida por Victor 2026-09-15: quanto
  // a equipe toda ainda tem pra atuar, além do gap de meta já mostrado no Meta Junho.
  function resumoTotais(gestores){
    let pme = 0, pf = 0;
    gestores.forEach(g => {
      pme += resumoPmeStats(g).funil;
      (PENDENCIAS_PF[g] || []).forEach(p => { if (PF_STATUS_PENDENTE.indexOf(p.status) >= 0) pf += (p.vidas || 0); });
    });
    return { pme, pf, total: pme + pf };
  }

  function renderResumoTotalBar(gestores){
    const t = resumoTotais(gestores);
    document.getElementById('rtbPme').textContent = fmt0(t.pme);
    document.getElementById('rtbPf').textContent = fmt0(t.pf);
    document.getElementById('rtbTotal').textContent = fmt0(t.total);
  }

  function renderResumoPme(gestores){
    document.getElementById('resumoCards').innerHTML = gestores.map(g => {
      const s = resumoPmeStats(g);
      return `<div class="resumo-card" style="cursor:pointer" role="button" tabindex="0" onclick="window.__openResumoDetail('${g.replace(/'/g,"\\'")}','pme')" title="Ver detalhes de ${g}">
        <div class="rc-head"><div class="rc-avatar">${initialsOf(g)}</div><div class="rc-name">${g}</div></div>
        <div class="rc-stats">
          <div class="rc-stat"><div class="rc-label">Em Funil</div><div class="rc-value" style="color:var(--navy);">${s.funil}</div></div>
          <div class="rc-stat"><div class="rc-label">Em Análise</div><div class="rc-value" style="color:var(--primary-light);">${s.analise}</div></div>
          <div class="rc-stat"><div class="rc-label">Em Pendência</div><div class="rc-value" style="color:#FFB81C;">${s.pendencia}</div></div>
        </div>
      </div>`;
    }).join('');
  }

  function renderResumoPf(gestores){
    const statusSet = new Set();
    gestores.forEach(g => (PENDENCIAS_PF[g]||[]).forEach(p => { if (p.status) statusSet.add(p.status); }));
    const statuses = [...statusSet].sort();
    const thead = `<thead><tr><th>Gestor</th>${statuses.map(s=>`<th class="num">${s}</th>`).join('')}<th class="num">Total</th></tr></thead>`;
    const tbody = gestores.map(g => {
      const rows = PENDENCIAS_PF[g] || [];
      const porStatus = statuses.map(s => rows.filter(p=>p.status===s).reduce((sum,p)=>sum+(p.vidas||0),0));
      const total = porStatus.reduce((a,b)=>a+b,0);
      return `<tr style="cursor:pointer" role="button" tabindex="0" onclick="window.__openResumoDetail('${g.replace(/'/g,"\\'")}','pf')" title="Ver detalhes de ${g}"><td class="name">${g}</td>${porStatus.map(v=>`<td class="num">${v||''}</td>`).join('')}<td class="num" style="font-weight:700;">${total}</td></tr>`;
    }).join('');
    document.getElementById('resumoPfTable').innerHTML = thead + '<tbody>' + tbody + '</tbody>';
  }

  function renderResumo(){
    const gestores = resumoGestoresFiltrados();
    if (resumoActiveTab === 'pme') renderResumoPme(gestores); else renderResumoPf(gestores);
    renderResumoTotalBar(gestores);
  }

  // Clique num card/linha do Resumo do Dia leva pro popup detalhado que já existe no Desempenho
  // Comercial (mesma tabela de propostas/orçamentos por gestor) — reaproveita window.showPendenciasModal
  // em vez de duplicar a lógica de tabela, só troca de aba (PME/PF) pra bater com o que estava sendo visto aqui.
  window.__openResumoDetail = function(gestorNome, tab){
    document.getElementById('resumoModalOverlay').style.display = 'none';
    if (typeof showView === 'function') showView('mj'); // leva pra tela de Desempenho Comercial por trás do popup
    window.showPendenciasModal(gestorNome);
    if (tab === 'pf') document.getElementById('pendTabPf').click();
  };

  // Repopula o select de Gestor de acordo com a equipe escolhida — só os gestores daquela
  // equipe (ou todos, se "Todas as equipes"). Preserva a seleção de gestor se ela ainda for
  // válida dentro da nova equipe; senão volta pra "Todos os gestores".
  function resumoAtualizarGestorSel(){
    const equipeSel = document.getElementById('resumoEquipeSel').value;
    const gestorSelEl = document.getElementById('resumoGestorSel');
    const prevGestor = gestorSelEl.value;
    const opcoes = equipeSel ? RESUMO_GESTORES.filter(g => resumoEquipeOf(g) === equipeSel) : RESUMO_GESTORES;
    gestorSelEl.innerHTML = '<option value="">Todos os gestores</option>' + opcoes.map(g=>`<option value="${g}">${g}</option>`).join('');
    gestorSelEl.value = opcoes.includes(prevGestor) ? prevGestor : '';
  }

  window.showResumoModal = function(){
    const equipeSelEl = document.getElementById('resumoEquipeSel');
    if (equipeSelEl.options.length <= 1) {
      equipeSelEl.innerHTML = '<option value="">Todas as equipes</option>' + RESUMO_EQUIPES.map(eq=>`<option value="${eq}">${eq}</option>`).join('');
    }
    resumoAtualizarGestorSel();
    resumoActiveTab = 'pme';
    document.getElementById('resumoTabPme').classList.add('active');
    document.getElementById('resumoTabPf').classList.remove('active');
    document.getElementById('resumoPmeView').style.display = '';
    document.getElementById('resumoPfView').style.display = 'none';
    renderResumo();
    document.getElementById('resumoModalOverlay').style.display = 'flex';
  };
  document.getElementById('btnOpenResumo').addEventListener('click', window.showResumoModal);
  document.getElementById('btnCloseResumo').addEventListener('click', () => { document.getElementById('resumoModalOverlay').style.display = 'none'; });
  document.getElementById('resumoModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'resumoModalOverlay') document.getElementById('resumoModalOverlay').style.display = 'none'; });
  document.getElementById('resumoEquipeSel').addEventListener('change', () => { resumoAtualizarGestorSel(); renderResumo(); });
  document.getElementById('resumoGestorSel').addEventListener('change', renderResumo);
  document.getElementById('resumoTabPme').addEventListener('click', () => {
    resumoActiveTab = 'pme';
    document.getElementById('resumoTabPme').classList.add('active'); document.getElementById('resumoTabPf').classList.remove('active');
    document.getElementById('resumoPmeView').style.display = ''; document.getElementById('resumoPfView').style.display = 'none';
    renderResumo();
  });
  document.getElementById('resumoTabPf').addEventListener('click', () => {
    resumoActiveTab = 'pf';
    document.getElementById('resumoTabPf').classList.add('active'); document.getElementById('resumoTabPme').classList.remove('active');
    document.getElementById('resumoPfView').style.display = ''; document.getElementById('resumoPmeView').style.display = 'none';
    renderResumo();
  });
  document.getElementById('btnCopyResumo').addEventListener('click', () => {
    const gestores = resumoGestoresFiltrados();
    const texto = gestores.map(g => {
      const s = resumoPmeStats(g);
      const primeiroNome = g.split(' ')[0].toUpperCase();
      return `${primeiroNome} · ${s.funil} VIDAS EM FUNIL · ${s.analise} VIDAS EM ANALISE · ${s.pendencia} VIDAS EM PENDENCIA`;
    }).join('\n');
    const btn = document.getElementById('btnCopyResumo');
    const original = btn.innerHTML;
    const marcarCopiado = () => { btn.innerHTML = '<i class=ic-check></i> Copiado!'; setTimeout(() => { btn.innerHTML = original; }, 1800); };
    const marcarFalha = () => { btn.innerHTML = 'Não copiou — selecione manualmente'; setTimeout(() => { btn.innerHTML = original; }, 2600); };
    // Fallback pra quando a Clipboard API é recusada (aba sem foco, permissão negada,
    // navegador mais antigo): textarea temporário + execCommand('copy'), sem depender de
    // diálogo (window.prompt pode vir bloqueado em alguns contextos).
    const copyViaTextarea = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) marcarCopiado(); else marcarFalha();
      } catch (e) { marcarFalha(); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(marcarCopiado).catch(copyViaTextarea);
    } else {
      copyViaTextarea();
    }
  });
})();

// ===== extraído de index.html linhas 3598-6566 =====
/* =========================================================
   VIEW 2 — ELEGIBILIDADE & REATIVAÇÃO (dados e lógica isolados em IIFE)
   ========================================================= */
(function(){
  // "Jan/25", "Fev/25"... gerado a partir de quantos meses os registros de Elegibilidade
  // realmente têm (sempre começando em Jan/2025) — antes era uma lista fixa de texto que
  // ficava desatualizada a cada mês novo (a Hapvida acrescenta um mês por atualização).
  // 19 é só o fallback se, por algum motivo, ainda não houver dado nenhum carregado.
  const MONTH_ABBR_PT = {'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'};
  function buildMonthLabels(count){
    const labels = []; let y = 2025, m = 1;
    for (let i = 0; i < count; i++){
      labels.push(MONTH_ABBR_PT[String(m).padStart(2,'0')] + '/' + String(y).slice(2));
      m++; if (m > 12){ m = 1; y++; }
    }
    return labels;
  }
  const eligSampleRow = (window.__DASH_DATA__ && window.__DASH_DATA__.DATA && window.__DASH_DATA__.DATA[0]) || null;
  const MONTH_LABELS = buildMonthLabels((eligSampleRow && eligSampleRow.m) ? eligSampleRow.m.length : 19);
  window.MONTH_LABELS = MONTH_LABELS;
  let totalMonths = MONTH_LABELS.length;
  // Índice global (mesma base 0=Jan/25 de MONTH_LABELS) a partir do qual a equipe ESCOPADA
  // (window.__eligTeamScope__) realmente tem dado real — as 3 equipes novas (Digital,
  // Plataforma SP, Plataforma ABC/Alto Tietê/BX) só entraram na base em Jan/26, então os
  // meses de 2025 nos arrays delas são zero-padding (ver padFront em parseEligibilidadeWorkbook),
  // não meses "sem elegíveis" de verdade. Setado mais abaixo, depois que o escopo é conhecido;
  // 0 = sem restrição (Cauda Longa e visão sem escopo continuam vendo desde Jan/25).
  let eligDataStartIdx = 0;
  function buildYearBuckets(){
    const y26months = Array.from({length: totalMonths-12}, (_,i)=>12+i);
    const complete26 = totalMonths >= 24;
    const lastLabel = MONTH_LABELS[totalMonths-1].split('/')[0];
    return [
      {label:'2025', months:[0,1,2,3,4,5,6,7,8,9,10,11]},
      {label: '2026', months: y26months},
    ];
  }
  function buildSemestreBuckets(){
    const sems = [
      {label:'1º Semestre/25', months:[0,1,2,3,4,5]},
      {label:'2º Semestre/25', months:[6,7,8,9,10,11]},
    ];
    const months26 = totalMonths - 12;
    if (months26 > 0){
      const sem1Len = Math.min(6, months26);
      const sem1Months = Array.from({length:sem1Len}, (_,i)=>12+i);
      const sem1Complete = months26 >= 6;
      sems.push({label: '1º Semestre/26', months: sem1Months});
      if (months26 > 6){
        const sem2Months = Array.from({length:months26-6}, (_,i)=>18+i);
        sems.push({label:'2º Semestre/26', months: sem2Months});
      }
    }
    return sems;
  }
  function buildTrimestreBuckets(){
    const tris = [
      {label:'1º Trimestre/25', months:[0,1,2]},
      {label:'2º Trimestre/25', months:[3,4,5]},
      {label:'3º Trimestre/25', months:[6,7,8]},
      {label:'4º Trimestre/25', months:[9,10,11]},
    ];
    const months26 = totalMonths - 12;
    let triNum = 1;
    for (let start = 0; start < months26; start += 3){
      const len = Math.min(3, months26-start);
      const monthsArr = Array.from({length:len}, (_,i)=>12+start+i);
      const complete = len === 3;
      const lastM = MONTH_LABELS[12+start+len-1].split('/')[0];
      tris.push({label: `${triNum}º Trimestre/26`, months: monthsArr});
      triNum++;
    }
    return tris;
  }
  const PERIOD_DEFS = {
    ano: buildYearBuckets(),
    semestre: buildSemestreBuckets(),
    trimestre: buildTrimestreBuckets(),
    mensal: MONTH_LABELS.map((label,i) => ({label, months:[i]})),
  };
  // Recalcula MONTH_LABELS/PERIOD_DEFS quando a Elegibilidade é atualizada NA MESMA
  // sessão (sem recarregar a página) e o arquivo novo já tem mais meses do que o painel
  // conhecia até então. Sem isso, um mês novo (ex.: Agosto) só apareceria nos filtros de
  // período depois de recarregar a página inteira — muta os arrays/objeto existentes em
  // vez de criar novos, pra quem já tinha uma referência a eles (ex.: window.MONTH_LABELS,
  // usado por outras abas) continuar enxergando os dados atualizados.
  function refreshMonthDerivedState(){
    const sampleRow = (typeof DATA !== 'undefined' && DATA && DATA[0]) ? DATA[0] : null;
    const newCount = (sampleRow && sampleRow.m) ? sampleRow.m.length : MONTH_LABELS.length;
    if (newCount === MONTH_LABELS.length) return;
    const newLabels = buildMonthLabels(newCount);
    MONTH_LABELS.splice(0, MONTH_LABELS.length, ...newLabels);
    totalMonths = MONTH_LABELS.length;
    PERIOD_DEFS.ano = buildYearBuckets();
    PERIOD_DEFS.semestre = buildSemestreBuckets();
    PERIOD_DEFS.trimestre = buildTrimestreBuckets();
    PERIOD_DEFS.mensal = MONTH_LABELS.map((label,i) => ({label, months:[i]}));
    applyEligDataStartTrim();
  }
  // Remove dos seletores de período (Ano/Semestre/Trimestre/Mensal) os meses anteriores a
  // eligDataStartIdx — pra uma equipe escopada cujo histórico real só começa depois de Jan/25
  // (zero-padding, ver comentário acima), evita oferecer um "2025" ou "1º Trimestre/25" que na
  // prática não tem nenhum dado real por trás. Chamada de novo dentro de refreshMonthDerivedState
  // porque essa reconstrói PERIOD_DEFS do zero a cada import.
  function applyEligDataStartTrim(){
    if (!eligDataStartIdx) return;
    const trim = list => list
      .map(b => Object.assign({}, b, { months: b.months.filter(m => m >= eligDataStartIdx) }))
      .filter(b => b.months.length);
    PERIOD_DEFS.ano = trim(PERIOD_DEFS.ano);
    PERIOD_DEFS.semestre = trim(PERIOD_DEFS.semestre);
    PERIOD_DEFS.trimestre = trim(PERIOD_DEFS.trimestre);
    PERIOD_DEFS.mensal = trim(PERIOD_DEFS.mensal);
  }
  // Intervalo personalizado (De/Até) — monta uma entrada sintética PERIOD_DEFS.custom[0] com
  // os meses do intervalo escolhido, pra reaproveitar 100% do código que já existe (rótulos,
  // meta, gap etc. em todo canto já leem PERIOD_DEFS[tipo][índice] sem saber se é um período
  // fixo ou personalizado).
  function rebuildCustomPeriod(){
    const fromIdx = Number(document.getElementById('fCustomFrom').value);
    const toIdx = Number(document.getElementById('fCustomTo').value);
    const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
    const months = Array.from({length: hi - lo + 1}, (_, i) => lo + i);
    const label = `${MONTH_LABELS[lo]} – ${MONTH_LABELS[hi]}`;
    PERIOD_DEFS.custom = [{ label, months }];
    const valSel = document.getElementById('fPeriodValue');
    valSel.innerHTML = `<option value="0">${label}</option>`;
    valSel.value = '0';
  }
  function populatePeriodValue(defaultToLast){
    const typeSel = document.getElementById('fPeriodType');
    const valSel = document.getElementById('fPeriodValue');
    const type = typeSel.value;
    document.getElementById('fPeriodValueGroup').style.display = type === 'custom' ? 'none' : '';
    document.getElementById('fCustomFromGroup').style.display = type === 'custom' ? '' : 'none';
    document.getElementById('fCustomToGroup').style.display = type === 'custom' ? '' : 'none';
    if (type === 'custom'){
      valSel.disabled = false;
      rebuildCustomPeriod();
      return;
    }
    if (type === 'all'){
      valSel.innerHTML = '<option value="">—</option>';
      valSel.disabled = true;
      return;
    }
    valSel.disabled = false;
    const opts = PERIOD_DEFS[type];
    valSel.innerHTML = opts.map((o,i)=>`<option value="${i}">${o.label}</option>`).join('');
    if (defaultToLast) valSel.value = String(opts.length - 1);
  }
  function getPeriodMonths(){
    const type = document.getElementById('fPeriodType').value;
    if (type === 'all') return null;
    const idx = Number(document.getElementById('fPeriodValue').value);
    const opt = PERIOD_DEFS[type][idx];
    if (!opt) return null;
    // Marca o array como "literal" só quando vem do intervalo Personalizado — ver o porquê
    // no comentário dentro de computePeriodElegRank.
    opt.months.__literal = (type === 'custom');
    return opt.months;
  }
  // ===== CORTE DE ERA REGULATÓRIA =====
  // A partir de Julho/26 (índice 18 = início do 3TRI26): régua nova ×0,80
  // (elegível = não caiu >20% vs trimestre anterior) e classificação com Bronze 7.
  // Até o 2TRI26 (inclusive): régua antiga ×1,10 e faixas antigas.
  const ERA_NEW_START_IDX = 18; // Jul/26

  // Classificação NOVA (vigente 3TRI26+) — espelha a aba CLASSIFICAÇÃO da planilha
  const RANK_THRESHOLDS_NEW = [
    {min:3150, label:'Safira'}, {min:2205, label:'Diamante'}, {min:1735, label:'Ouro'}, {min:1260, label:'Prata'},
    {min:945, label:'Bronze 1'}, {min:630, label:'Bronze 2'}, {min:574, label:'Bronze 3'},
    {min:315, label:'Bronze 4'}, {min:160, label:'Bronze 5'}, {min:65, label:'Bronze 6'}, {min:30, label:'Bronze 7'},
  ];
  // Classificação ANTIGA (períodos até 2TRI26) — mantida para não reescrever a história
  const RANK_THRESHOLDS_OLD = [
    {min:3000, label:'Safira'}, {min:2100, label:'Diamante'}, {min:1650, label:'Ouro'}, {min:1200, label:'Prata'},
    {min:900, label:'Bronze 1'}, {min:600, label:'Bronze 2'}, {min:300, label:'Bronze 3'},
    {min:150, label:'Bronze 4'}, {min:60, label:'Bronze 5'}, {min:15, label:'Bronze 6'},
  ];
  function isNewEra(selectedMonths){ return Math.max.apply(null, selectedMonths) >= ERA_NEW_START_IDX; }
  function computeRankingFromVolume(vol, selectedMonths){
    const table = (selectedMonths && isNewEra(selectedMonths)) ? RANK_THRESHOLDS_NEW : RANK_THRESHOLDS_OLD;
    for (const t of table) if (vol >= t.min) return t.label;
    return 'Não Classificado';
  }
  function getPrevEquivalentMonths(selectedMonths){
    if (!selectedMonths || !selectedMonths.length) return null;
    const len = selectedMonths.length;
    const prev = selectedMonths.map(m => m - len);
    if (prev.some(m => m < 0)) return null;
    return prev;
  }
  function computePeriodElegRank(d, selectedMonths){
    // selectedMonths.__literal (marcado por getPeriodMonths() só pro intervalo Personalizado)
    // pede o intervalo EXATO que o usuário escolheu, sem substituir pelo cálculo oficial de
    // trimestre — diferente de Mensal/Trimestre/Semestre/Ano, onde selecionar "o período atual"
    // é ambíguo e cai na régua oficial por definição. Sem essa distinção, um intervalo
    // personalizado que termina no mês mais recente (o caso mais comum, "de X até agora") era
    // silenciosamente trocado pelos números do trimestre vigente, ignorando o que foi escolhido.
    const isCurrentPeriod = !selectedMonths.__literal && Math.max.apply(null, selectedMonths) === d.m.length - 1;

    // displayTotal/displayMeta = números do período EXATO escolhido (ex.: só Setembro, se foi
    // isso que o usuário filtrou em Mensal) — SEMPRE calculados, nunca substituídos pelo
    // trimestre. Achado real 2026-09-30 (Victor, corretora QUALI PLANOS): filtrando por Mensal/
    // Setembro, o card "Set/26 Atual" mostrava 3.778 — o total do 3TRI inteiro (Jul+Ago+Set), não
    // o de setembro sozinho (1.280) — a quebra por categoria logo abaixo do card, que sempre usou
    // esses mesmos meses literais (nunca teve esse bug), foi o que expôs a diferença. Usados só
    // pelos cards "Atual/Meta/Gap" (rotulados com o período exato selecionado); a classificação
    // de Elegibilidade/Ranking abaixo continua sempre por TRIMESTRE oficial (ver isCurrentPeriod
    // logo abaixo) — são duas perguntas diferentes ("quanto vendeu NESSE período" vs "está
    // elegível pela regra oficial, que é sempre trimestral"), não devem se misturar.
    const displayTotal = selectedMonths.reduce((s,i)=>s+(d.m[i]||0), 0);
    const displayPrevMonths = getPrevEquivalentMonths(selectedMonths);
    const displayPrevTotal = displayPrevMonths ? displayPrevMonths.reduce((s,i)=>s+(d.m[i]||0), 0) : 0;
    const displayFactor = isNewEra(selectedMonths) ? 0.80 : 1.10;
    const displayMeta = displayPrevMonths ? displayPrevTotal * displayFactor : 0;

    if (isCurrentPeriod){
      // A elegibilidade "oficial" é sempre calculada por TRIMESTRE — o trimestre vigente
      // (mesmo parcial, se ainda não fechou) contra o trimestre ANTERIOR completo — nunca por
      // mês isolado, e independe de qual período o usuário tiver selecionado na tela. Confirmado
      // comparando com o arquivo mestre real da Hapvida (10/08/26): Meta 3TRI26 = 2TRI26 Total ×
      // 0,80 exatamente, e Elegível = 3TRI-até-agora ≥ essa meta. Usa sempre PERIOD_DEFS.trimestre
      // (que já cresce sozinho conforme os meses do trimestre vão sendo importados) em vez do
      // selectedMonths recebido, pra não repetir o erro de comparar só "mês atual vs mês anterior".
      const triList = PERIOD_DEFS.trimestre;
      const curTri = triList[triList.length - 1];
      const prevTri = triList.length >= 2 ? triList[triList.length - 2] : null;
      const periodTotal = curTri.months.reduce((s,i)=>s+(d.m[i]||0), 0);
      const prevTotal = prevTri ? prevTri.months.reduce((s,i)=>s+(d.m[i]||0), 0) : 0;
      const factor = isNewEra(curTri.months) ? 0.80 : 1.10;
      const meta = prevTri ? prevTotal * factor : 0;
      // Precisa de uma meta real (trimestre anterior > 0) pra "elegível" valer algo — uma
      // corretora que ficou 3 meses zerada e vendeu qualquer coisinha agora não deveria virar
      // elegível só por não ter de onde "cair". Testei permitir isso e inflou o número muito
      // além do real (corretoras com histórico esporádico "reativando" em massa).
      const el = (meta > 0 && periodTotal >= meta) ? 1 : 0;
      const rk = computeRankingFromVolume(periodTotal, curTri.months);
      return { periodTotal, meta, el, rk, factor, displayTotal, displayMeta, isCurrentPeriod };
    }
    const periodTotal = displayTotal;
    const rk = computeRankingFromVolume(periodTotal, selectedMonths);
    let el = (displayMeta > 0 && periodTotal >= displayMeta) ? 1 : 0;
    // Mês único, já superado como "mês vigente" (ex.: Agosto depois que Setembro chegou) —
    // achado real 2026-09-09 (Victor: "se você olhar na planilha que tem a coluna de agosto,
    // vai ver que a quantidade de elegíveis não bate"). O "el" calculado acima (mês isolado vs
    // mês anterior × fator) é uma conta PRÓPRIA — nunca foi a régua oficial da Hapvida (sempre
    // por trimestre, ver o branch isCurrentPeriod acima) e por isso nunca batia com o arquivo
    // mestre real (92 elegíveis reais vs 106 inventados, no caso de Agosto). Quando existe um
    // retrato salvo de "qual era a classificação oficial quando esse mês ainda era o vigente"
    // (d.elByMonth[idx], gravado por updateEligibilidadeData/applyCorretorasToEligibilidade —
    // ver comentários lá), usa ele no lugar — meta/factor continuam os mesmos de sempre (só
    // informativos aqui, nenhuma tela soma/usa esse "meta" pra decidir "el"). Só se aplica a mês
    // único (não a trimestre/semestre/ano explícito, que continuam como estavam — não reportado
    // como problema, não mexido por segurança).
    if (selectedMonths.length === 1 && d.elByMonth && d.elByMonth[selectedMonths[0]] !== undefined){
      el = d.elByMonth[selectedMonths[0]];
    }
    return { periodTotal, meta: displayMeta, el, rk, factor: displayFactor, displayTotal, displayMeta, isCurrentPeriod };
  }

  /* =========================================================
     CAMPANHA "CONQUISTA PREMIADA — 3TRI/2026"
     Faixas e R$/vida extraídos do regulamento oficial (HMO).
     Só cobre São Paulo (Metropolitana §4.1 / Interior §4.2) —
     único escopo relevante para o NDI SP. Assume sempre HMO
     (a base não distingue HMO/PPO). Não inclui o bônus extra de
     performance de carteira (depende de dado que não temos: %
     de crescimento da carteira ativa).
     ========================================================= */
  const CONQUISTA_METRO = [
    {label:'Não Classificado', min:0,    rate:0},
    {label:'Bronze 7',         min:30,   rate:55},
    {label:'Bronze 6',         min:65,   rate:65},
    {label:'Bronze 5',         min:160,  rate:75},
    {label:'Bronze 4',         min:315,  rate:85},
    {label:'Bronze 3',         min:475,  rate:90},
    {label:'Bronze 2',         min:630,  rate:95},
    {label:'Bronze 1',         min:945,  rate:110},
    {label:'Prata',            min:1260, rate:135},
    {label:'Ouro',             min:1735, rate:150},
    {label:'Diamante',         min:2205, rate:165},
    {label:'Safira',           min:3150, rate:210},
  ];
  const CONQUISTA_INTERIOR = [
    {label:'Não Classificado', min:0,    rate:0},
    {label:'Bronze',           min:30,   rate:40},
    {label:'Prata',            min:100,  rate:50},
    {label:'Ouro',             min:200,  rate:60},
    {label:'Diamante',         min:600,  rate:70},
    {label:'Safira',           min:2000, rate:80},
  ];
  // Campanha "Hap-Top-SP" — regra anterior à atual, vigente de 2TRI/25 até 2TRI/26
  // (regulamento oficial do 2TRI/25, mesma tabela usada em todo trimestre anterior ao
  // 3TRI/26). Tabela única pro estado de SP inteiro — não separa Metropolitana/Interior.
  const CONQUISTA_LEGACY = [
    {label:'Não Classificado', min:0,    rate:0},
    {label:'Bronze 6',         min:15,   rate:50},
    {label:'Bronze 5',         min:60,   rate:60},
    {label:'Bronze 4',         min:150,  rate:70},
    {label:'Bronze 3',         min:300,  rate:80},
    {label:'Bronze 2',         min:600,  rate:90},
    {label:'Bronze 1',         min:900,  rate:105},
    {label:'Prata',            min:1200, rate:130},
    {label:'Ouro',             min:1650, rate:145},
    {label:'Diamante',         min:2100, rate:160},
    {label:'Safira',           min:3000, rate:200},
  ];
  // Equipe do gestor decide a tabela (Metropolitana x Interior). Mapa local e
  // autocontido — hoje, todo gestor desta view pertence à equipe CAUDA LONGA
  // (nunca INTERIOR SP), então na prática sempre cai na tabela Metropolitana.
  const CONQUISTA_EQUIPE_BY_GESTOR = {
    'Agatha Sakamoto':'CAUDA LONGA', 'Patricia Monks':'CAUDA LONGA',
    'Jonathan Leal':'CAUDA LONGA', 'Pablo Amora':'CAUDA LONGA',
  };
  // Distribuição da bonificação na cadeia comercial Hapvida (regulamento §2.2.1):
  // Executivos 75% / Supervisores 20% / Gerentes 5%. A corretora recebe o R$/vida
  // cheio da tabela; isso é só a fatia interna do executivo/gestor sobre esse total.
  const CONQUISTA_EXEC_SHARE = 0.75;
  function conquistaTierLookup(table, total){
    let idx = 0;
    for (let i = 0; i < table.length; i++){ if (total >= table[i].min) idx = i; }
    const cur = table[idx];
    const next = table[idx+1] || null;
    return {
      total, label: cur.label, rate: cur.rate,
      nextLabel: next ? next.label : null, nextRate: next ? next.rate : null,
      faltam: next ? Math.max(0, next.min - total) : 0,
      pct: next ? Math.min(100, total / next.min * 100) : 100,
      isTop: !next,
      bonusFull: total * cur.rate,
      bonusExec: total * cur.rate * CONQUISTA_EXEC_SHARE,
    };
  }
  // Conquista Premiada só existe pra um trimestre específico selecionado no filtro
  // principal (fPeriodType==='trimestre') — fora disso (Mensal/Semestre/Ano/Todos os
  // 18 meses) a campanha fica indisponível, já que os limiares de vidas são pensados
  // pra uma janela de exatamente 3 meses. Retorna null quando não aplicável.
  function getConquistaPeriod(){
    const type = document.getElementById('fPeriodType').value;
    if (type !== 'trimestre') return null;
    const idx = Number(document.getElementById('fPeriodValue').value);
    return PERIOD_DEFS.trimestre[idx] || null;
  }
  function computeConquista(d){
    const campaignTri = getConquistaPeriod();
    if (!campaignTri) return null;
    // Regra vigente (3TRI/26+, Metro/Interior) só pro(s) trimestre(s) da era nova;
    // qualquer trimestre anterior (2TRI/25 até 2TRI/26) usa a regra Hap-Top-SP antiga.
    let table, regiao;
    if (isNewEra(campaignTri.months)){
      const equipe = CONQUISTA_EQUIPE_BY_GESTOR[d.g] || 'CAUDA LONGA';
      const isInterior = equipe === 'INTERIOR SP';
      table = isInterior ? CONQUISTA_INTERIOR : CONQUISTA_METRO;
      regiao = isInterior ? 'Interior de SP' : 'Metropolitana de SP';
    } else {
      table = CONQUISTA_LEGACY;
      regiao = 'São Paulo (regra Hap-Top-SP)';
    }
    const total = campaignTri.months.reduce((s,i)=>s+(d.m[i]||0), 0);
    const tier = conquistaTierLookup(table, total);
    return Object.assign({
      campaignLabel: campaignTri.label,
      regiao,
      table,
    }, tier);
  }
  function conquistaSuggestion(calc){
    if (calc.isTop) return 'Já está na faixa máxima da campanha (Safira) — manter o ritmo garante a bonificação máxima.';
    if (calc.faltam <= 0) return `Volume já suficiente para ${calc.nextLabel} — classificação deve atualizar no próximo fechamento.`;
    if (calc.pct >= 85) return `Muito perto de virar ${calc.nextLabel} — faltam só ${fmt0(calc.faltam)} vidas. Priorize contato imediato com essa corretora.`;
    if (calc.pct >= 60) return `Boa chance de virar ${calc.nextLabel} ainda no trimestre — foco em ativar propostas paradas ou reativar corretoras inativas da carteira dela.`;
    if (calc.pct >= 30) return `Distância moderada até ${calc.nextLabel} — acompanhamento de rotina ajuda a manter a evolução.`;
    return `Ainda distante de ${calc.nextLabel} — sem urgência imediata, mas vale monitorar a evolução mês a mês.`;
  }
  // Elegibilidade completa da campanha: precisa ter alcançado alguma faixa (>=30 vidas,
  // "hasTier") E não ter caído mais de 20% vs o trimestre anterior (mesma regra/flag que
  // computePeriodElegRank já usa pro período corrente — reaproveitada aqui, não duplicada).
  function computeConquistaFull(d){
    const cq = computeConquista(d);
    if (!cq) return null;
    const campaignTri = getConquistaPeriod();
    const elCalc = computePeriodElegRank(d, campaignTri.months);
    const hasTier = cq.label !== 'Não Classificado';
    const isEligible = hasTier && elCalc.el === 1;
    return Object.assign({ hasTier, isEligible }, cq);
  }

  let DATA = window.__DASH_DATA__.DATA;
  // Restringe Elegibilidade por equipe pra Executivo/Sênior escopado (window.__eligTeamScope__,
  // setado no login — ver index.html). Corretora "Sem Gestor Atribuído" ou de um gestor fora do
  // mapa abaixo não tem equipe pra comparar — fica de fora de QUALQUER escopo restrito (mais
  // seguro que aparecer pra todo mundo por padrão).
  // IMPORTANTE (achado real 2026-09-28): isto usada a filtrar a variável DATA em si, direto na
  // carga — só que window.getEligibilidadeData() (usada pelo "Publicar" E por outras abas —
  // Visão Geral, Ranking, reconciliação de Propostas) lê essa MESMA variável. Resultado: uma
  // sessão escopada (ex.: Alexandre, restrito à Plataforma SP) que clicasse em Publicar por
  // QUALQUER motivo sobrescrevia a Elegibilidade inteira só com a fatia da equipe dela — foi
  // exatamente isso que apagou Digital/Plataforma SP/ABC da produção. Correção: DATA nunca mais
  // é filtrada — fica sempre completa (é a única base usada pra mesclar import, publicar, e
  // por qualquer outra aba). A restrição por equipe agora só entra na hora de MOSTRAR a
  // Elegibilidade na tela, via scopedData() (função abaixo), usada em applyFilters/EL_GESTORES/
  // RANKS_PRESENT/Conquista Premiada — os únicos lugares que renderizam esta aba pra o usuário.
  const ELIG_GESTOR_TEAM = {
    'Agatha Sakamoto':'CAUDA LONGA', 'Patricia Monks':'CAUDA LONGA', 'Jonathan Leal':'CAUDA LONGA', 'Pablo Amora':'CAUDA LONGA',
    'Erika de Sousa Silva':'PLATAFORMA SP', 'Camila Alves Pertinhez':'PLATAFORMA SP', 'Lais dos Santos Martins':'PLATAFORMA SP', 'Wilder Coca Patzi':'PLATAFORMA SP',
    'Karollainny Rangel de Sousa Lopes':'DIGITAL', 'Daniela Novais dos Santos':'DIGITAL', 'Amanda dos Santos Sobral':'DIGITAL', 'Maxuel Pimentel Nobrega':'DIGITAL',
    'Vivian de Cassia Ambrosio':'PLATAFORMA ABC/ALTO TIETÊ/BX', 'Guilherme de Lima Musachi':'PLATAFORMA ABC/ALTO TIETÊ/BX', 'Izabele de Oliveira da Silva':'PLATAFORMA ABC/ALTO TIETÊ/BX',
  };
  // Só pra EXIBIÇÃO — nunca usar isto como base de merge/publicação, só DATA (completa) pode
  // ser usada pra isso. Recalcula toda vez que é chamada, então sempre reflete DATA atual
  // (inclusive depois de um import no meio da sessão).
  function scopedData(){
    return window.__eligTeamScope__ ? DATA.filter(d => ELIG_GESTOR_TEAM[d.g] === window.__eligTeamScope__) : DATA;
  }
  // Mês global (0=Jan/25) em que cada equipe realmente passou a ter histórico na base —
  // Cauda Longa está desde o início (Jan/25); as 3 equipes novas entraram só em Jan/26
  // (índice 12), confirmado nos arquivos reais delas (9 meses, Jan-Set/26). Usado só pra
  // limpar os seletores de período de meses "fantasmas" (zero-padding) — não afeta os
  // números em si, que já vêm certos.
  const ELIG_TEAM_DATA_START = {
    'CAUDA LONGA': 0,
    'PLATAFORMA SP': 12,
    'DIGITAL': 12,
    'PLATAFORMA ABC/ALTO TIETÊ/BX': 12,
  };
  eligDataStartIdx = window.__eligTeamScope__ ? (ELIG_TEAM_DATA_START[window.__eligTeamScope__] || 0) : 0;
  applyEligDataStartTrim();
  let RANKDATA = window.__DASH_DATA__.RANKDATA;
  // Carteira (código→gestor) publicada junto com o resto — antes só existia na memória da
  // aba onde foi importada, então tinha que ser subida de novo toda vez que alguém abria o
  // dashboard pra atualizar o dia (Victor, 2026-09-09: "quando eu importo apenas a planilha
  // do BI, ele está pedindo a planilha do banco de dados"). Mesmo fix já validado e em
  // produção no V2 desde 2026-08-27 — só faltava portar pro V1, ver comentário no FS_SECTIONS
  // em index.html. Agora subir ela uma vez (ou quando ela mudar de verdade) já basta: fica
  // disponível pra todo mundo a partir da próxima publicação.
  window.CARTEIRA_MAP = window.__DASH_DATA__.CARTEIRA_MAP || null;
  let PROPOSTAS = window.__DASH_DATA__.PROPOSTAS;
  let RANK_CUR_LABEL = window.__DASH_DATA__.RANK_CUR_LABEL;
  let RANK_PREV_LABEL = window.__DASH_DATA__.RANK_PREV_LABEL;
  // Histórico de tempo-de-resolução (base do "macro" da aba Conversão) — cada vez que uma
  // proposta que estava ativa (pendência/análise) some da lista ou vira status final numa
  // importação nova, grava aqui quanto tempo ela ficou parada. Só acumula a partir de agora
  // (sem reconstruir o passado) — ver window.updatePropostasData.
  let SLA_HISTORICO = window.__DASH_DATA__.SLA_HISTORICO || [];
  // "Ontem vs hoje" da aba Conversão — um retrato por gestor (assinatura/funil) gravado a
  // cada atualização, guardado por data. Diferente do SLA_HISTORICO (que é por proposta
  // resolvida), aqui é só o total do dia, pra bater com o jeito que a planilha "Crescimento
  // Geral" do sênior compara ontem x hoje.
  let DAILY_SNAPSHOTS = window.__DASH_DATA__.DAILY_SNAPSHOTS || {};
  // "Ontem x hoje" oficial da aba Conversão — vem direto do relatório "Crescimento Geral"
  // que o sênior já preenche todo dia (colunas ASSINATURA/FUNIL/RANKING ONTEM e HOJE).
  // Substitui o DAILY_SNAPSHOTS acima pra esse fim específico: o snapshot automático só
  // funcionava se o dashboard fosse atualizado em dois dias-calendário diferentes, e
  // comparava um "ontem" congelado com um "hoje" ao vivo — números de fontes diferentes,
  // que raramente batiam com o que a planilha do sênior mostrava. Aqui os dois lados
  // (ontem E hoje) vêm sempre da mesma importação, então nunca desencontram.
  let CONV_ONTEM_HOJE = window.__DASH_DATA__.CONV_ONTEM_HOJE || {};
  function computeGestorSnapshotNow(){
    const assinaturaData = (window.getPendenciasData ? window.getPendenciasData().assinatura : {}) || {};
    const rankByGestor = {};
    (RANKDATA||[]).forEach(r => { if (r.g) rankByGestor[r.g] = (rankByGestor[r.g]||0) + (r.cur||0); });
    const gestores = [...new Set(PROPOSTAS.map(p=>p.g).filter(Boolean).concat(Object.keys(assinaturaData)).concat(Object.keys(rankByGestor)))];
    const snap = {};
    gestores.forEach(g => {
      const ps = PROPOSTAS.filter(p=>p.g===g);
      const funilAtivo = ps.filter(p=>/pend|analis/i.test(p.st)).reduce((s,p)=>s+(p.bn||0),0);
      const assinatura = (assinaturaData[g]||[]).reduce((s,r)=>s+(r.beneficiarios||0),0);
      const implantadas = ps.filter(p=>/implant/i.test(p.st)).length;
      snap[g] = { funilAtivo, assinatura, ranking: rankByGestor[g]||0, implantadas, totalPropostas: ps.length };
    });
    return snap;
  }
  function saveDailySnapshot(){
    const hoje = new Date().toISOString().slice(0,10);
    DAILY_SNAPSHOTS[hoje] = computeGestorSnapshotNow();
    // Mantém só os últimos 60 dias — suficiente pra qualquer comparação de período, sem o
    // data.json crescer sem limite.
    const datas = Object.keys(DAILY_SNAPSHOTS).sort();
    while (datas.length > 60){ delete DAILY_SNAPSHOTS[datas.shift()]; }
  }
  function getYesterdaySnapshot(){
    const hoje = new Date().toISOString().slice(0,10);
    const datas = Object.keys(DAILY_SNAPSHOTS).filter(d => d < hoje).sort();
    return datas.length ? DAILY_SNAPSHOTS[datas[datas.length-1]] : null;
  }
  function slaAddDU(d,n){ let c=new Date(d), a=0; while(a<n){ c.setDate(c.getDate()+1); if (c.getDay()!==0 && c.getDay()!==6) a++; } return c; }
  function slaDuDiff(a,b){ let c=0, cur=new Date(a); while(cur<b){ if (cur.getDay()!==0 && cur.getDay()!==6) c++; cur.setDate(cur.getDate()+1); } return c; }
  function slaParseYMD(s){ const [y,m,d] = String(s||'').split('-').map(Number); return (y&&m&&d) ? new Date(y,m-1,d) : null; }
  // SLA de "aging" — há quanto tempo (dias úteis) uma proposta está parada na etapa atual,
  // comparado com hoje. PME: prazo de 3 dias úteis. Mesma lógica usada no painel do sênior.
  function slaCalc(dataEntradaStr, prazoDU){
    const dataEntrada = slaParseYMD(dataEntradaStr);
    if (!dataEntrada) return {de:0, atraso:0, label:'—'};
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const de = slaDuDiff(dataEntrada, hoje);
    const prazo = slaAddDU(dataEntrada, prazoDU||3);
    const atraso = hoje>prazo ? slaDuDiff(prazo, hoje) : 0;
    return {de, atraso, label: atraso===0?'No prazo':atraso<=2?'Atenção':'Crítico'};
  }
  const GESTOR_EQUIPE = {"VENDA INTERNA": "VENDA INTERNA", "PATRICIA PESSOA MONKS": "CAUDA LONGA", "KAROLLAINNY RANGEL DE SOUSA LOPES": "DIGITAL", "PABLO SERGIO RIBEIRO AMORA": "CAUDA LONGA", "GUILHERME DE LIMA MUSACHI": "PLATAFORMA ABC/ALTO TIETÊ/BX", "CAMILA ALVES PERTINHEZ": "PLATAFORMA SP", "JONATHAN LEAL DOS SANTOS SILVA": "CAUDA LONGA", "MAXUEL PIMENTEL NOBREGA": "DIGITAL", "AGATHA EIKO RODRIGUES SAKAMOTO": "CAUDA LONGA", "DANIELA NOVAIS DOS SANTOS": "DIGITAL", "ERIKA DE SOUSA SILVA": "PLATAFORMA SP", "LAIS DOS SANTOS MARTINS": "PLATAFORMA SP", "WILDER COCA PATZI": "PLATAFORMA SP", "AMANDA DOS SANTOS SOBRAL": "DIGITAL", "IZABELE DE OLIVEIRA DA SILVA": "PLATAFORMA ABC/ALTO TIETÊ/BX", "KAIQUE ARAUJO DA SILVA": "INTERIOR SP", "VIVIAN DE CASSIA AMBROSIO": "PLATAFORMA ABC/ALTO TIETÊ/BX", "DANIELA FREDERICO MARTINS CAMPINAS": "INTERIOR SP", "FLAVIA AUANA SILVA DE OLIVEIRA": "INTERIOR SP", "DANIELA FREDERICO MARTINS AM": "INTERIOR SP"};
  // Exposto em window pois o parser do "Crescimento Geral" (mais abaixo no arquivo) vive
  // numa IIFE diferente desta — sem isso, GESTOR_EQUIPE não existe nesse escopo (2026-09-04).
  // Executiva nova na Plataforma (Out/26, planilha NDI SP) — ainda não está na Carteira.
  if (!GESTOR_EQUIPE['AGATHA AMARAL RIBEIRO']) GESTOR_EQUIPE['AGATHA AMARAL RIBEIRO'] = 'PLATAFORMA SP';
  window.GESTOR_EQUIPE = GESTOR_EQUIPE;

  const fmt0 = n => Math.round(n).toLocaleString('pt-BR');
  const RANK_ORDER = ["Bronze 1","Bronze 2","Bronze 3","Bronze 4","Bronze 5","Bronze 6","Não Classificado"];
  const EL_GESTORES = [...new Set(scopedData().map(d=>d.g))].sort();
  const RANKS_PRESENT = RANK_ORDER.filter(r => scopedData().some(d=>d.rk===r));

  // Filtro de Gestor virou multi-seleção (checkboxes num painel, não mais um <select> —
  // ver CSS .fgb-* em index.html) pra quem enxerga vários gestores poder comparar 2+ ao
  // mesmo tempo em vez de só "Todos" ou um por vez (pedido do Victor, 2026-09-17).
  // selectedGestores vazio = "Todos", mesmo significado de sempre — todo o resto do código
  // (applyFilters, gráficos "por gestor" que já agrupam dinamicamente os `rows`/`filtered`
  // restantes por d.g) segue funcionando certo com 2+ gestores sem precisar de mudança,
  // porque nunca dependia de ter exatamente 1 selecionado.
  let selectedGestores = new Set();
  const fGestorBtn = document.getElementById('fGestorBtn');
  const fGestorPanel = document.getElementById('fGestorPanel');
  const fGestorOptions = document.getElementById('fGestorOptions');
  const fGestorAllCb = document.getElementById('fGestorAllCb');
  function gestorLabelText(){
    if (selectedGestores.size === 0) return 'Todos';
    if (selectedGestores.size === 1) return [...selectedGestores][0];
    return selectedGestores.size + ' gestores selecionados';
  }
  function syncGestorUI(){
    fGestorBtn.textContent = gestorLabelText();
    fGestorBtn.title = selectedGestores.size > 1 ? [...selectedGestores].join(', ') : '';
    fGestorAllCb.checked = selectedGestores.size === 0;
    const grp = fGestorBtn.closest('.f-group'); if (grp) grp.classList.toggle('is-filtered', selectedGestores.size > 0);
  }
  function syncGestorCheckboxes(){
    fGestorOptions.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = selectedGestores.has(EL_GESTORES[Number(cb.dataset.gi)]); });
    syncGestorUI();
  }
  // Chamada no clique numa barra "por gestor" (drill-down pra 1 gestor só) e no
  // jumpToElegibilidade (vindo de outra aba) — substitui a seleção inteira.
  function setSelectedGestores(list){
    selectedGestores = new Set(list);
    syncGestorCheckboxes();
  }
  // Reconstrói a lista de checkboxes a partir de EL_GESTORES — chamada no carregamento
  // inicial e de novo a cada import (EL_GESTORES pode ganhar um gestor novo). Descarta da
  // seleção qualquer gestor que não exista mais na base (nome mudou/equipe removida).
  function renderGestorOptions(){
    selectedGestores = new Set([...selectedGestores].filter(g => EL_GESTORES.includes(g)));
    fGestorOptions.innerHTML = EL_GESTORES.map((g,i) => `<label class="fgb-option"><input type="checkbox" data-gi="${i}"> ${g}</label>`).join('');
    fGestorOptions.querySelectorAll('input[type=checkbox]').forEach(cb => {
      const g = EL_GESTORES[Number(cb.dataset.gi)];
      cb.checked = selectedGestores.has(g);
      cb.addEventListener('change', () => {
        if (cb.checked) selectedGestores.add(g); else selectedGestores.delete(g);
        syncGestorUI();
        page = 1; renderActive();
      });
    });
    syncGestorUI();
  }
  renderGestorOptions();
  fGestorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = fGestorPanel.style.display === 'none';
    fGestorPanel.style.display = willOpen ? 'block' : 'none';
    fGestorBtn.setAttribute('aria-expanded', String(willOpen));
  });
  fGestorPanel.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => {
    fGestorPanel.style.display = 'none';
    fGestorBtn.setAttribute('aria-expanded', 'false');
  });
  fGestorAllCb.addEventListener('change', () => {
    if (fGestorAllCb.checked){ setSelectedGestores([]); page = 1; renderActive(); }
    else if (selectedGestores.size === 0){
      // Não deixa desmarcar "Todos" sem nada pra colocar no lugar (viraria "nenhum gestor").
      fGestorAllCb.checked = true;
    }
  });
  // Nome mantido só por causa dos 2 pontos (import de arquivo novo) que ainda chamam essa
  // função pelo nome antigo — reaproveita renderGestorOptions() por trás.
  function syncGestorLocalOptions(){ renderGestorOptions(); }
  const selRank = document.getElementById('fRank');
  RANKS_PRESENT.forEach(r => { const o=document.createElement('option'); o.value=r; o.textContent=r; selRank.appendChild(o); });

  let sortKey = 'tot', sortDir = -1, page = 1, perPage = 50;
  // Clique num dos 4 cards executivos (Elegíveis/Quase/Em Risco/Não Elegíveis) filtra a aba
  // inteira pra essa fatia — igual clicar numa barra do gráfico "Elegibilidade por Gestor" já
  // fazia. Clicar de novo no mesmo card limpa o filtro (toggle). null = nenhum filtro de KPI ativo.
  let activeKpiFilter = null; // null | 'eleg' | 'quase' | 'risco' | 'distantes'
  function isReactivation(d){ return d.u3 === 0 && d.tot >= 20; }

  // Destaca visualmente (classe .is-filtered, ver CSS) os campos de filtro da Elegibilidade
  // que estão com valor diferente do padrão — mesmo critério de "fatia estreita" que
  // isAnyFilterActive() já usa, só que por campo em vez de agregado (pedido do Victor,
  // 2026-09-09). Chamada de dentro de applyFilters() pra rodar em toda troca de filtro e
  // também no carregamento inicial da aba, sem precisar de listeners próprios.
  function updateActiveFilterHighlights(){
    const fields = [
      [document.getElementById('fEleg'), document.getElementById('fEleg').value !== ''],
      [selRank, selRank.value !== ''],
      [document.getElementById('fSearch'), document.getElementById('fSearch').value.trim() !== '']
    ];
    fields.forEach(function(pair){
      var grp = pair[0].closest('.f-group');
      if (grp) grp.classList.toggle('is-filtered', pair[1]);
    });
    var reactBox = document.getElementById('fReact');
    var reactGroup = reactBox.closest('.f-toggle');
    if (reactGroup) reactGroup.classList.toggle('is-filtered', reactBox.checked);
  }

  function applyFilters(){
    updateActiveFilterHighlights();
    const el = document.getElementById('fEleg').value, rk = selRank.value;
    const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
    // No modo assessorias, a busca filtra assessorias (aplicada em aggregateAssessorias), não corretoras
    const q = (typeof elMode !== 'undefined' && elMode === 'assessorias') ? '' : norm(document.getElementById('fSearch').value);
    const onlyReact = document.getElementById('fReact').checked;
    const periodMonthsFilter = getPeriodMonths();
    return scopedData().filter(d => {
      if (selectedGestores.size && !selectedGestores.has(d.g)) return false;
      const calc = periodMonthsFilter ? computePeriodElegRank(d, periodMonthsFilter) : null;
      if (el !== '' && String(calc ? calc.el : d.el) !== el) return false;
      if (rk && (calc ? calc.rk : d.rk) !== rk) return false;
      if (q && !(norm(d.n).includes(q) || norm(d.c).includes(q))) return false;
      if (onlyReact && !isReactivation(d)) return false;
      // Filtro de KPI (clique num dos 4 cards executivos) — mesma classificação usada nos
      // próprios cards (faixaIdx/recent2), só que aplicada aqui pra filtrar a aba inteira.
      if (activeKpiFilter){
        const ctx = calc || getElegCtx(d, null);
        const isEl = ctx.el === 1;
        if (activeKpiFilter === 'eleg' && !isEl) return false;
        if (activeKpiFilter === 'quase' && !(!isEl && faixaIdx(ctx) === 3)) return false;
        if (activeKpiFilter === 'distantes' && !(!isEl && faixaIdx(ctx) !== 3)) return false;
        if (activeKpiFilter === 'risco'){
          if (!isEl) return false;
          const lm = periodMonthsFilter ? Math.max.apply(null, periodMonthsFilter) : d.m.length - 1;
          const recent2 = (d.m[lm]||0) + (lm>0 ? (d.m[lm-1]||0) : 0);
          if (recent2 !== 0) return false;
        }
      }
      return true;
    });
  }

  function isAnyFilterActive(){
    return !!(selectedGestores.size || document.getElementById('fEleg').value || selRank.value ||
      document.getElementById('fSearch').value.trim() || document.getElementById('fReact').checked || activeKpiFilter);
  }

  function monthsSinceLastSale(d){
    for (let i = d.m.length - 1; i >= 0; i--) { if (d.m[i] > 0) return (d.m.length - 1 - i); }
    return d.m.length;
  }
  function dormancyBucket(months){
    if (months <= 3) return '3 meses';
    if (months <= 6) return '4–6 meses';
    if (months <= 12) return '7–12 meses';
    return '13+ meses';
  }
  const DORMANCY_ORDER = ['3 meses','4–6 meses','7–12 meses','13+ meses'];
  const GESTOR_COLORS = {'Agatha Sakamoto':'#2E52D4','Patricia Monks':'#F26B21','Jonathan Leal':'#101E63','Pablo Amora':'#16B87A','Sem Gestor Atribuído':'#94a3b8',
    'Erika de Sousa Silva':'#0EA5E9','Camila Alves Pertinhez':'#8B5CF6','Lais dos Santos Martins':'#EC4899','Wilder Coca Patzi':'#14B8A6',
    'Karollainny Rangel de Sousa Lopes':'#F59E0B','Daniela Novais dos Santos':'#EF4444','Amanda dos Santos Sobral':'#6366F1','Maxuel Pimentel Nobrega':'#84CC16',
    'Vivian de Cassia Ambrosio':'#06B6D4','Guilherme de Lima Musachi':'#A855F7','Izabele de Oliveira da Silva':'#F97316'};
  // Gráfico horizontal "por gestor": com 15 gestores a altura fixa (280px) fazia o Chart.js
  // pular rótulos (barra sem nome) — cresce a caixa conforme o número de gestores.
  function fitGestorChartHeight(n){
    const box = document.getElementById('chartElGestor').parentElement;
    box.style.height = Math.max(280, n * 28 + 60) + 'px';
  }

  function showChartDrilldown(title, list){
    // Precisa mostrar o overlay ANTES de criar o gráfico: com o container ainda
    // "display:none", o canvas mede largura/altura 0 e o Chart.js nasce invisível.
    document.getElementById('chartDrilldownOverlay').style.display = 'flex';
    const sorted = [...list].sort((a,b)=>b.tot-a.tot);
    const totalVidas = sorted.reduce((s,d)=>s+d.tot,0);
    const thTotDrill = document.getElementById('thTotMesesDrilldown');
    if (thTotDrill && sorted.length && sorted[0].m) thTotDrill.textContent = `Total ${sorted[0].m.length}M`;
    document.getElementById('chartDrilldownTitle').textContent = `${title} (${sorted.length} corretora${sorted.length!==1?'s':''})`;
    document.getElementById('chartDrilldownSub').textContent = `${fmt0(totalVidas)} vidas em potencial · clique em uma linha para ver a evolução mensal`;

    // Distribuição por gestor — mesma cor usada no resto da view, pra ficar fácil de
    // reconhecer de relance quem concentra a maior parte da lista.
    const byGestor = {};
    sorted.forEach(d => { (byGestor[d.g] = byGestor[d.g] || []).push(d); });
    const gestorNames = Object.keys(byGestor).sort((a,b)=>byGestor[b].length-byGestor[a].length);
    destroyChart('drilldownGestor');
    charts.drilldownGestor = new Chart(document.getElementById('chartDrilldownGestor'), {
      type:'bar',
      data:{ labels: gestorNames.map(shortGestor), datasets:[{ data: gestorNames.map(g=>byGestor[g].length),
        backgroundColor: gestorNames.map(g=>GESTOR_COLORS[g]||'#94a3b8'), borderRadius:6, maxBarThickness:22 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${c.parsed.x} corretora${c.parsed.x!==1?'s':''}`}}},
        scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{precision:0, font:{size:9}}}, y:{grid:{display:false}, ticks:{font:{size:10, weight:'600'}}} } }
    });
    const maiorGestor = gestorNames[0];
    const mediaParado = sorted.length ? Math.round(sorted.reduce((s,d)=>s+monthsSinceLastSale(d),0)/sorted.length) : 0;
    document.getElementById('chartDrilldownStats').innerHTML = `
      <div><div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;">Vidas em potencial</div><div style="font-size:19px; font-weight:800; color:var(--navy);">${fmt0(totalVidas)}</div></div>
      <div><div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;">Maior concentração</div><div style="font-size:14px; font-weight:700; color:var(--navy);">${maiorGestor ? shortGestor(maiorGestor) : '—'}</div></div>
      <div><div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;">Média sem vender</div><div style="font-size:19px; font-weight:800; color:var(--navy);">${mediaParado} meses</div></div>
    `;

    document.getElementById('chartDrilldownBody').innerHTML = sorted.map(d => `
      <tr class="clickable" data-c="${d.c}">
        <td style="color:var(--muted); font-size:11.5px;">${d.c}</td>
        <td class="name">${d.n}</td>
        <td>${d.g.replace(' Sakamoto','').replace(' Monks','').replace(' Leal','').replace(' Amora','')}</td>
        <td class="num">${fmt0(d.tot)}</td>
        <td class="num">${monthsSinceLastSale(d)} meses</td>
      </tr>`).join('');
    document.querySelectorAll('#chartDrilldownBody tr').forEach(tr => {
      window.__kb(tr).addEventListener('click', () => showDetail(tr.dataset.c));
    });
  }
  document.getElementById('chartDrilldownClose').addEventListener('click', () => {
    document.getElementById('chartDrilldownOverlay').style.display = 'none';
  });
  document.getElementById('chartDrilldownOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'chartDrilldownOverlay') document.getElementById('chartDrilldownOverlay').style.display = 'none';
  });

  let charts = {};
  function destroyChart(key){ if(charts[key]){ charts[key].destroy(); delete charts[key]; } }

  /* =========================================================
     VISÃO EXECUTIVA — Elegibilidade
     Regra de ouro mantida: modo "Todos os meses" usa a coluna
     oficial da planilha (el/rk/t2/meta = ciclo 2TRI26). Períodos
     filtrados usam o recálculo ×1,10 já existente. Todo valor
     recalculado é rotulado como tal.
     ========================================================= */
  const FAIXA_LABELS = ['0–25%','26–50%','51–75%','76–99%','≥100%'];
  const FAIXA_COLORS = ['#F5364A','#F26B21','#FFB81C','#84CC16','#16B87A'];
  const SEM_META_COLOR = '#cbd5e1';
  const shortGestor = g => String(g).replace(' Sakamoto','').replace(' Monks','').replace(' Leal','').replace(' Amora','').replace('Sem Gestor Atribuído','Sem Gestor');
  const hexToRgba = (hex, a) => { const h=[1,3,5].map(p=>parseInt(hex.substr(p,2),16)); return `rgba(${h[0]},${h[1]},${h[2]},${a})`; };

  function getElegCtx(d, periodMonths){
    if (periodMonths) return computePeriodElegRank(d, periodMonths);
    return { periodTotal: d.t2, meta: d.meta, el: d.el, rk: d.rk };
  }
  function getPrevElegCtx(d, periodMonths){
    if (periodMonths){
      const prev = getPrevEquivalentMonths(periodMonths);
      return prev ? computePeriodElegRank(d, prev) : null;
    }
    return computePeriodElegRank(d, [15,16,17]); // 2TRI26 recalculado (trimestre anterior ao ciclo vigente)
  }
  function faixaIdx(ctx){
    if (!(ctx.meta > 0)) return -1; // sem meta (sem histórico no período anterior)
    const a = ctx.periodTotal / ctx.meta;
    if (a >= 1) return 4;
    if (a >= 0.76) return 3;
    if (a >= 0.51) return 2;
    if (a >= 0.26) return 1;
    return 0;
  }

  // ===== Análise por Assessoria (modo alternável) =====
  const shortGestorAss = g => String(g).replace(' Sakamoto','').replace(' Monks','').replace(' Leal','').replace(' Amora','').replace('Sem Gestor Atribuído','Sem Gestor');
  const assCtx = (d, periodMonths) => periodMonths ? computePeriodElegRank(d, periodMonths) : { periodTotal: d.m[d.m.length-1], meta: d.meta3tri||0, el: d.el, rk: d.rk };
  let assCurrentSort = 'vidas', assCurrentDir = -1;
  let assSelectedKey = null;   // assessoria aberta no detalhe (null = ranking)

  function aggregateAssessorias(filtered){
    const periodMonths = getPeriodMonths();
    const groups = {};
    filtered.forEach(d => {
      const key = d.ass || '__SEM__';
      (groups[key] = groups[key] || []).push({ d, ctx: assCtx(d, periodMonths) });
    });
    let aggs = Object.entries(groups).map(([key, rows]) => {
      const n = rows.length;
      const eleg = rows.filter(r=>r.ctx.el===1).length;
      const vidas = rows.reduce((s,r)=>s+r.ctx.periodTotal,0);
      const meta = rows.reduce((s,r)=>s+(r.ctx.meta||0),0);
      // código da assessoria: pega o mais comum entre as corretoras do grupo
      const acod = key==='__SEM__' ? '' : (rows.map(r=>r.d.acod).find(x=>x && String(x).trim() !== '0') || '');
      return { key, acod, name: key==='__SEM__'?'Sem assessoria vinculada':key, rows, n, eleg,
        vidas, meta, pctEl: n?eleg/n*100:0, ating: meta>0?vidas/meta*100:0 };
    });
    // Busca por nome ou código da assessoria (só no modo assessorias)
    const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const q = norm(document.getElementById('fSearch').value);
    if (q && elMode === 'assessorias'){
      aggs = aggs.filter(a => norm(a.name).includes(q) || norm(a.acod).includes(q));
    }
    return aggs;
  }

  function renderAssessoria(filtered){
    const periodMonths = getPeriodMonths();
    const aggs = aggregateAssessorias(filtered);

    // ---- Overview consolidado (todas as assessorias) ----
    const reais = aggs.filter(a=>a.key!=='__SEM__');
    const totalVidas = aggs.reduce((s,a)=>s+a.vidas,0);
    const totalCorr = aggs.reduce((s,a)=>s+a.n,0);
    const totalEleg = aggs.reduce((s,a)=>s+a.eleg,0);
    const bestVidas = reais.slice().sort((a,b)=>b.vidas-a.vidas)[0];
    document.getElementById('assOverview').innerHTML = `
      <div class="ass-ov-card" style="--aov:var(--primary-light)"><div class="aov-label">Assessorias</div><div class="aov-val">${fmt0(reais.length)}</div><div class="aov-sub">+ ${aggs.some(a=>a.key==='__SEM__')?fmt0(aggs.find(a=>a.key==='__SEM__').n):0} corretoras sem vínculo</div></div>
      <div class="ass-ov-card" style="--aov:var(--accent-mint)"><div class="aov-label">Vidas no Ciclo</div><div class="aov-val">${fmt0(totalVidas)}</div><div class="aov-sub">${fmt0(totalCorr)} corretoras no filtro</div></div>
      <div class="ass-ov-card" style="--aov:var(--accent-gold)"><div class="aov-label">Elegíveis (total)</div><div class="aov-val">${fmt0(totalEleg)}</div><div class="aov-sub">${totalCorr?(totalEleg/totalCorr*100).toFixed(1):0}% da base</div></div>
      <div class="ass-ov-card" style="--aov:var(--accent-coral)"><div class="aov-label">Maior Produtora</div><div class="aov-val" style="font-size:16px; line-height:1.3; margin-top:8px;">${bestVidas?shortAssName(bestVidas.name):'—'}</div><div class="aov-sub">${bestVidas?fmt0(bestVidas.vidas)+' vidas':''}</div></div>`;

    // ---- Gráfico: Top assessorias por vidas ----
    const topV = reais.slice().sort((a,b)=>b.vidas-a.vidas).slice(0,12);
    destroyChart('assVidas');
    charts.assVidas = new Chart(document.getElementById('chartAssVidas'), {
      type:'bar',
      data:{ labels: topV.map(a=>shortAssName(a.name)), datasets:[{ data: topV.map(a=>a.vidas),
        backgroundColor:'#2E52D4', borderRadius:6, maxBarThickness:26 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        onClick:(e,els)=>{ if(els&&els.length){ openAssDetail(topV[els[0].index].key); } },
        onHover:(e,els)=>{ if(e.native) e.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${fmt0(c.parsed.x)} vidas · clique para abrir`}}},
        scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}} } }
    });

    // ---- Gráfico: % elegibilidade por assessoria ----
    const topE = reais.filter(a=>a.n>=3).slice().sort((a,b)=>b.pctEl-a.pctEl).slice(0,12);
    destroyChart('assEleg');
    charts.assEleg = new Chart(document.getElementById('chartAssEleg'), {
      type:'bar',
      data:{ labels: topE.map(a=>shortAssName(a.name)), datasets:[{ data: topE.map(a=>a.pctEl),
        backgroundColor: topE.map(a=>a.pctEl>=10?'#16B87A':(a.pctEl>0?'#FFB81C':'#cbd5e1')), borderRadius:6, maxBarThickness:26 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        onClick:(e,els)=>{ if(els&&els.length){ openAssDetail(topE[els[0].index].key); } },
        onHover:(e,els)=>{ if(e.native) e.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{const a=topE[c.dataIndex]; return [`${c.parsed.x.toFixed(1)}% elegíveis`, `${a.eleg} de ${a.n} corretoras`, 'clique para abrir'];}}}},
        scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{callback:v=>v+'%'}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}} } }
    });
    document.getElementById('assEleg') && (document.querySelector('#elModeAssessorias .grid-2 .panel:nth-child(2) .panel-sub').textContent = 'Assessorias com 3+ corretoras · clique para abrir o detalhe' + (periodMonths?' · recalculado':''));

    // ---- Tabela de ranking ----
    renderAssRankTable(aggs);
    document.getElementById('assRankSub').innerHTML = `${reais.length} assessorias no filtro atual · clique numa linha para ver as corretoras vinculadas` + (periodMonths?' <span class="recalc-tag">Recalculado</span>':'');

    // ---- Se havia um detalhe aberto, re-renderiza ----
    if (assSelectedKey !== null){
      const still = aggs.find(a=>a.key===assSelectedKey);
      if (still) renderAssessoriaDetail(still, periodMonths);
      else closeAssDetail();
    }
  }

  function renderAssRankTable(aggs){
    const dir = assCurrentDir, key = assCurrentSort;
    const cmp = (a,b)=>{
      let va, vb;
      if (key==='name'){ return dir*a.name.localeCompare(b.name); }
      va=a[key]; vb=b[key]; return dir*((va||0)-(vb||0));
    };
    // 'Sem assessoria vinculada' sempre por último — não é assessoria real
    const reais = aggs.filter(a=>a.key!=='__SEM__').sort(cmp);
    const semv = aggs.filter(a=>a.key==='__SEM__');
    const sorted = reais.concat(semv);
    document.getElementById('assRankBody').innerHTML = sorted.map(a=>{
      const cls = a.pctEl>=10?'good':(a.pctEl>0?'warn':'zero');
      return `<tr data-k="${a.key.replace(/"/g,'&quot;')}">
        <td><div class="ass-rank-name">${a.name}</div>${a.acod?`<span style="font-size:10px;color:var(--muted);">cód. ${a.acod}</span>`:''}</td>
        <td class="num">${fmt0(a.n)}</td>
        <td class="num">${fmt0(a.vidas)}</td>
        <td class="num">${fmt0(a.eleg)}</td>
        <td class="num"><span class="ass-rank-pct ${cls}">${a.pctEl.toFixed(1)}%</span></td>
        <td class="num">${a.meta>0?a.ating.toFixed(0)+'%':'—'}</td>
      </tr>`;
    }).join('');
    document.querySelectorAll('#assRankBody tr').forEach(tr=>window.__kb(tr).addEventListener('click',()=>openAssDetail(tr.dataset.k)));
  }

  function openAssDetail(key){
    assSelectedKey = key;
    const periodMonths = getPeriodMonths();
    const aggs = aggregateAssessorias(applyFilters());
    const agg = aggs.find(a=>a.key===key);
    if (!agg) return;
    document.getElementById('assDetailWrap').style.display = 'block';
    renderAssessoriaDetail(agg, periodMonths);
    document.getElementById('assDetailWrap').scrollIntoView({behavior:'smooth', block:'start'});
  }
  function closeAssDetail(){
    assSelectedKey = null;
    document.getElementById('assDetailWrap').style.display = 'none';
  }

  function renderAssessoriaDetail(agg, periodMonths){
    const detail = document.getElementById('assDetail');
    document.getElementById('assDetailTitle').textContent = agg.name;
    const { rows, n, eleg, vidas, meta, pctEl, ating } = agg;
    const gestoresSet = [...new Set(rows.map(r=>shortGestorAss(r.d.g)))];
    const cycleTxt = periodMonths ? 'no período' : 'ciclo oficial';
    const kpis = `
      <div class="ass-kpis">
        <div class="ass-kpi" style="--ak:var(--primary-light)"><div class="ak-label">Corretoras</div><div class="ak-val">${fmt0(n)}</div><div class="ak-sub">${gestoresSet.length} gestor(es): ${gestoresSet.slice(0,3).join(', ')}${gestoresSet.length>3?'…':''}</div></div>
        <div class="ass-kpi" style="--ak:var(--accent-mint)"><div class="ak-label">Vidas Produzidas</div><div class="ak-val">${fmt0(vidas)}</div><div class="ak-sub">${cycleTxt}</div></div>
        <div class="ass-kpi" style="--ak:${pctEl>=10?'var(--accent-mint)':'var(--accent-gold)'}"><div class="ak-label">% Elegíveis</div><div class="ak-val">${pctEl.toFixed(1)}%</div><div class="ak-sub">${eleg} de ${n} corretoras</div></div>
        <div class="ass-kpi" style="--ak:${ating>=100?'var(--accent-mint)':'var(--accent-coral)'}"><div class="ak-label">Atingimento da Meta</div><div class="ak-val">${meta>0?ating.toFixed(0)+'%':'—'}</div><div class="ak-sub">${fmt0(vidas)} / ${fmt0(meta)} vidas</div></div>
      </div>`;
    const maxVidas = Math.max.apply(null, rows.map(r=>r.ctx.periodTotal).concat([1]));
    const sorted = rows.slice().sort((a,b)=>b.ctx.periodTotal - a.ctx.periodTotal);
    const tableRows = sorted.map(r => {
      const barW = (r.ctx.periodTotal/maxVidas*100).toFixed(1);
      return `<tr class="clickable" data-c="${r.d.c}">
        <td><div class="ass-corr-name">${r.d.n}</div><span style="font-size:10px;color:var(--muted);">${shortGestorAss(r.d.g)}</span></td>
        <td><span class="ass-rank-chip">${r.ctx.rk}</span></td>
        <td class="num">${fmt0(r.ctx.periodTotal)}</td>
        <td><div class="ass-mini-bar"><i style="width:${barW}%"></i></div></td>
        <td class="num">${r.ctx.meta>0?(r.ctx.periodTotal/r.ctx.meta*100).toFixed(0)+'%':'—'}</td>
        <td style="text-align:center;"><span class="ass-pill ${r.ctx.el===1?'el':'nel'}">${r.ctx.el===1?'Elegível':'Não eleg.'}</span></td>
      </tr>`;
    }).join('');
    detail.innerHTML = kpis + `
      <div class="panel">
        <h2>${agg.name}</h2>
        <div class="panel-sub">${n} corretora(s) vinculada(s) · ordenadas por produção · clique numa linha para o detalhe completo${periodMonths?' · <span class="recalc-tag">Recalculado</span>':''}</div>
        <div style="overflow-x:auto; max-height:480px; overflow-y:auto;">
          <table class="ass-corr-table">
            <thead><tr><th>Corretora</th><th>Ranking</th><th class="num">Vidas</th><th>Produção</th><th class="num">Meta %</th><th style="text-align:center;">Status</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;
    detail.querySelectorAll('tr.clickable').forEach(tr => window.__kb(tr).addEventListener('click', ()=>showDetail(tr.dataset.c, {fromAssessoria: agg.name})));
  }

  const shortAssName = name => { name = String(name); return name.length > 26 ? name.slice(0,24)+'…' : name; };

  // Alternância de modo Corretoras/Assessorias
  let elMode = 'corretoras';
  function setElMode(mode){
    elMode = mode;
    document.querySelectorAll('#elViewSwitch .vs-btn').forEach(b=>b.classList.toggle('active', b.dataset.mode===mode));
    document.getElementById('elModeCorretoras').style.display = mode==='corretoras' ? '' : 'none';
    document.getElementById('elModeAssessorias').style.display = mode==='assessorias' ? '' : 'none';
    // Barra de filtros "consciente do modo": renomeia a busca
    const lbl = document.getElementById('fSearchLabel');
    const inp = document.getElementById('fSearch');
    if (mode==='assessorias'){ lbl.textContent = 'Buscar assessoria'; inp.placeholder = 'Nome ou código da assessoria...'; }
    else { lbl.textContent = 'Buscar corretora'; inp.placeholder = 'Nome ou código...'; }
    if (mode==='assessorias') renderAssessoria(applyFilters());
    else render();
  }
  document.querySelectorAll('#elViewSwitch .vs-btn').forEach(b=>b.addEventListener('click',()=>setElMode(b.dataset.mode)));
  document.getElementById('assDetailBack').addEventListener('click', closeAssDetail);
  document.querySelectorAll('#assRankTable thead th').forEach((th,i)=>{
    const keys=['name','n','vidas','eleg','pctEl','ating'];
    window.__kb(th).addEventListener('click',()=>{ const k=keys[i]; if(assCurrentSort===k) assCurrentDir*=-1; else {assCurrentSort=k; assCurrentDir=(k==='name'?1:-1);} renderAssRankTable(aggregateAssessorias(applyFilters())); });
  });

  // Conquista Premiada — visão geral da campanha (independe dos filtros da tela;
  // sempre reflete a base inteira, como um placar fixo por gestor).
  // Estado dos filtros do modal Conquista Premiada (independente dos filtros da tela)
  let cqgFilterGestor = '', cqgFilterClass = '', cqgFilterEleg = '', cqgBusca = '', cqgPage = 0;
  const CQG_PP = 15;

  function conquistaRowsAll(){
    return scopedData().map(d => { const cq = computeConquistaFull(d); return cq ? Object.assign({d}, cq) : null; }).filter(Boolean);
  }

  function applyConquistaFilters(rows){
    const q = cqgBusca.trim().toLowerCase();
    return rows.filter(r => {
      if (cqgFilterGestor && r.d.g !== cqgFilterGestor) return false;
      if (cqgFilterClass && r.label !== cqgFilterClass) return false;
      if (cqgFilterEleg === 'elegivel' && !r.isEligible) return false;
      if (cqgFilterEleg === 'falta' && !(r.hasTier && !r.isEligible)) return false;
      if (cqgFilterEleg === 'naoeleg' && r.hasTier) return false;
      if (q && !(r.d.n.toLowerCase().includes(q) || r.d.c.toLowerCase().includes(q))) return false;
      return true;
    });
  }

  function conquistaStatusTag(r){
    if (r.isEligible) return '<span class="tag elig">Elegível</span>';
    if (r.hasTier) return '<span class="tag" style="background:rgba(255,184,28,.18); color:#a5690f;">Falta vidas</span>';
    return '<span class="tag noelig">Não elegível</span>';
  }

  function renderConquistaTable(){
    const rows = conquistaRowsAll();
    const filtered = applyConquistaFilters(rows).sort((a,b)=>b.total-a.total);
    const totalPag = Math.max(1, Math.ceil(filtered.length/CQG_PP));
    if (cqgPage >= totalPag) cqgPage = totalPag - 1;
    if (cqgPage < 0) cqgPage = 0;
    const pageRows = filtered.slice(cqgPage*CQG_PP, (cqgPage+1)*CQG_PP);
    document.getElementById('cqgTableBody').innerHTML = pageRows.map(r => `
      <tr class="clickable" data-c="${r.d.c}">
        <td style="color:var(--muted); font-size:11.5px;">${r.d.c}</td>
        <td class="name">${r.d.n}</td>
        <td>${r.d.g}</td>
        <td class="num">${fmt0(r.total)}</td>
        <td>${r.label}</td>
        <td class="num">R$ ${fmt0(r.rate)}</td>
        <td class="num">R$ ${fmt0(r.bonusExec)}</td>
        <td>${conquistaStatusTag(r)}</td>
      </tr>`).join('') || `<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:16px;">Nenhuma corretora encontrada com esses filtros.</td></tr>`;
    document.getElementById('cqgPagInfo').textContent = `Página ${cqgPage+1} de ${totalPag} (${filtered.length} resultado(s))`;
    document.querySelectorAll('#cqgTableBody tr[data-c]').forEach(tr => {
      window.__kb(tr).addEventListener('click', () => { closeConquistaModal(); showDetail(tr.dataset.c); });
    });
  }

  function renderConquistaGeral(){
    const rows = conquistaRowsAll();
    const n = rows.length;
    const elegiveis = rows.filter(r => r.isEligible);
    const faltaVidas = rows.filter(r => r.hasTier && !r.isEligible);
    const naoEleg = rows.filter(r => !r.hasTier);
    const bonusTotal = rows.reduce((s,r)=>s + (r.hasTier ? r.bonusFull : 0), 0);
    const bonusExecTotal = rows.reduce((s,r)=>s + (r.hasTier ? r.bonusExec : 0), 0);

    document.getElementById('cqgPeriodo').textContent = rows[0] ? rows[0].campaignLabel : '—';

    const kpis = [
      {bar:'#1D33A8', ico:'<i class=ic-users></i>', icoBg:'rgba(29,51,168,.10)', color:'#101E63',
       label:'Base Total', value: fmt0(n), pct:'com histórico no trimestre', eleg:''},
      {bar:'#16B87A', ico:'<i class=ic-check></i>', icoBg:'rgba(22,184,122,.12)', color:'#16B87A',
       label:'Elegíveis', value: fmt0(elegiveis.length), pct: n?(elegiveis.length/n*100).toFixed(1)+'% da base':'0%', eleg:'elegivel'},
      {bar:'#FFB81C', ico:'<i class=ic-trend></i>', icoBg:'rgba(255,184,28,.16)', color:'#a5690f',
       label:'Falta Vidas', value: fmt0(faltaVidas.length), pct:'classificadas, mas caíram vs. trimestre anterior', eleg:'falta'},
      {bar:'#F5364A', ico:'<i class=ic-alarm></i>', icoBg:'rgba(245,54,74,.10)', color:'#F5364A',
       label:'Não Elegíveis', value: fmt0(naoEleg.length), pct:'abaixo do mínimo da campanha (30 vidas)', eleg:'naoeleg'},
      {bar:'linear-gradient(90deg,#F26B21,#FFB81C)', ico:'<i class=ic-award></i>', icoBg:'rgba(242,107,33,.12)', color:'#F26B21',
       label:'Bônus Est. (75% exec.)', value: 'R$ ' + fmt0(bonusExecTotal), pct: 'total corretoras: R$ ' + fmt0(bonusTotal), eleg:''},
    ];
    document.getElementById('cqgKpiRow').innerHTML = kpis.map((k,i) => `
      <div class="exec-kpi cqg-kpi ${k.eleg?'clickable':''}" data-cqi="${i}" style="--ek-bar:${k.bar}; --ek-ico-bg:${k.icoBg}; --ek-color:${k.color};" ${k.eleg?'title="Clique para filtrar a lista abaixo"':''}>
        <div class="ek-ico">${k.ico}</div>
        <div class="ek-label">${k.label}</div>
        <div class="ek-value">${k.value}</div>
        <div class="ek-pct">${k.pct}</div>
      </div>`).join('');
    document.querySelectorAll('#cqgKpiRow .cqg-kpi[data-cqi]').forEach(el => {
      const k = kpis[Number(el.dataset.cqi)];
      if (!k || !k.eleg) return;
      window.__kb(el).addEventListener('click', () => {
        cqgFilterEleg = (cqgFilterEleg === k.eleg) ? '' : k.eleg;
        document.getElementById('cqgFEleg').value = cqgFilterEleg;
        cqgPage = 0;
        renderConquistaTable();
      });
    });

    const gestorGrid = document.getElementById('cqgGestorGrid');
    // "Sem Gestor Atribuído" fica de fora dos cards (mas continua nos KPIs gerais acima).
    const gestorNames = [...new Set(scopedData().map(d=>d.g))].filter(g => g !== 'Sem Gestor Atribuído').sort();
    gestorGrid.innerHTML = gestorNames.map(g => {
      const gRows = rows.filter(r => r.d.g === g);
      const gEleg = gRows.filter(r => r.isEligible);
      const gFalta = gRows.filter(r => r.hasTier && !r.isEligible);
      const gNao = gRows.filter(r => !r.hasTier);
      const gBonusExec = gRows.reduce((s,r)=>s+(r.hasTier?r.bonusExec:0),0);
      const cor = GESTOR_COLORS[g] || '#94a3b8';
      const top3 = [...gRows].sort((a,b)=>b.total-a.total).slice(0,3);
      const selected = cqgFilterGestor === g;
      return `<div class="cqg-card${selected?' selected':''}" data-g="${g}" style="background:var(--card); border-radius:12px; padding:14px 16px; border-top:3px solid ${cor}; box-shadow:0 1px 3px rgba(16,30,99,.06); cursor:pointer;">
        <div style="font-size:14px; font-weight:800; color:${cor}; margin-bottom:8px;">${g}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
          <div style="background:var(--bg); border-radius:6px; padding:6px 8px;"><div style="font-size:14px; font-weight:800; color:#16B87A;">${gEleg.length}</div><div style="font-size:9px; color:var(--muted); text-transform:uppercase;">Elegíveis</div></div>
          <div style="background:var(--bg); border-radius:6px; padding:6px 8px;"><div style="font-size:14px; font-weight:800; color:#a5690f;">${gFalta.length}</div><div style="font-size:9px; color:var(--muted); text-transform:uppercase;">Falta Vidas</div></div>
          <div style="background:var(--bg); border-radius:6px; padding:6px 8px;"><div style="font-size:14px; font-weight:800; color:#F5364A;">${gNao.length}</div><div style="font-size:9px; color:var(--muted); text-transform:uppercase;">Não Eleg.</div></div>
          <div style="background:var(--bg); border-radius:6px; padding:6px 8px;"><div style="font-size:11px; font-weight:800; color:${cor};">R$ ${fmt0(gBonusExec)}</div><div style="font-size:9px; color:var(--muted); text-transform:uppercase;">Bônus (75%)</div></div>
        </div>
        ${top3.length ? `<div style="font-size:9.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.4px; margin:8px 0 4px;">Top 3 corretoras</div>` + top3.map((t,i) => `
          <div class="cqg-top3-row" data-c="${t.d.c}" style="background:var(--bg); border-radius:6px; padding:6px 8px; margin-bottom:4px; border-left:3px solid ${i===0?cor:'var(--line)'}; cursor:pointer; display:flex; align-items:center; gap:8px;">
            <span style="font-size:10px; font-weight:700; color:${i===0?cor:'var(--muted)'}; width:14px;">${i+1}º</span>
            <div style="flex:1; overflow:hidden;">
              <div style="font-size:10.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.d.n}</div>
              <div style="font-size:10px; color:var(--muted);">${t.label} · ${fmt0(t.total)} vidas</div>
            </div>
          </div>`).join('') : '<div style="font-size:11px; color:var(--muted);">Sem produção no trimestre.</div>'}
      </div>`;
    }).join('');
    gestorGrid.querySelectorAll('.cqg-top3-row').forEach(el => {
      window.__kb(el).addEventListener('click', (e) => { e.stopPropagation(); closeConquistaModal(); showDetail(el.dataset.c); });
    });
    gestorGrid.querySelectorAll('.cqg-card').forEach(el => {
      window.__kb(el).addEventListener('click', () => {
        const g = el.dataset.g;
        cqgFilterGestor = (cqgFilterGestor === g) ? '' : g;
        document.getElementById('cqgFGestor').value = cqgFilterGestor;
        cqgPage = 0;
        renderConquistaGeral();
      });
    });

    // popula os selects de filtro (uma vez basta, mas é barato refazer sempre)
    const selGestorEl = document.getElementById('cqgFGestor');
    const curGestorVal = selGestorEl.value;
    selGestorEl.innerHTML = '<option value="">Todos</option>' + gestorNames.map(g=>`<option value="${g}">${g}</option>`).join('');
    selGestorEl.value = cqgFilterGestor || curGestorVal || '';
    const classesPresent = [...new Set(rows.filter(r=>r.hasTier).map(r=>r.label))];
    const campaignTriNow = getConquistaPeriod();
    const classOrderAll = (campaignTriNow && isNewEra(campaignTriNow.months)) ? CONQUISTA_METRO.map(t=>t.label) : CONQUISTA_LEGACY.map(t=>t.label);
    const classesSorted = classOrderAll.filter(c => classesPresent.includes(c));
    const selClassEl = document.getElementById('cqgFClass');
    const curClassVal = selClassEl.value;
    selClassEl.innerHTML = '<option value="">Todas</option>' + classesSorted.map(c=>`<option value="${c}">${c}</option>`).join('');
    selClassEl.value = cqgFilterClass || curClassVal || '';

    renderConquistaTable();
  }

  function closeConquistaModal(){
    document.getElementById('conquistaModalOverlay').style.display = 'none';
  }
  document.getElementById('btnOpenConquista').addEventListener('click', () => {
    document.getElementById('conquistaModalOverlay').style.display = 'flex';
    renderConquistaGeral();
  });
  document.getElementById('btnCloseConquista').addEventListener('click', closeConquistaModal);
  document.getElementById('conquistaModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'conquistaModalOverlay') closeConquistaModal();
  });
  document.getElementById('cqgFGestor').addEventListener('change', (e) => { cqgFilterGestor = e.target.value; cqgPage = 0; renderConquistaGeral(); });
  document.getElementById('cqgFClass').addEventListener('change', (e) => { cqgFilterClass = e.target.value; cqgPage = 0; renderConquistaTable(); });
  document.getElementById('cqgFEleg').addEventListener('change', (e) => { cqgFilterEleg = e.target.value; cqgPage = 0; renderConquistaTable(); });
  document.getElementById('cqgBusca').addEventListener('input', window.debounce(() => {
    cqgBusca = document.getElementById('cqgBusca').value; cqgPage = 0; renderConquistaTable();
  }, 250));
  document.getElementById('cqgBtnLimpar').addEventListener('click', () => {
    cqgFilterGestor = ''; cqgFilterClass = ''; cqgFilterEleg = ''; cqgBusca = ''; cqgPage = 0;
    document.getElementById('cqgFGestor').value = '';
    document.getElementById('cqgFClass').value = '';
    document.getElementById('cqgFEleg').value = '';
    document.getElementById('cqgBusca').value = '';
    renderConquistaGeral();
  });
  document.getElementById('cqgPagPrev').addEventListener('click', () => { cqgPage = Math.max(0, cqgPage-1); renderConquistaTable(); });
  document.getElementById('cqgPagNext').addEventListener('click', () => { cqgPage = cqgPage+1; renderConquistaTable(); });

  function renderExecutive(filtered){
    // Com "Apenas oportunidades de reativação" marcado, os painéis de Elegibilidade
    // (funil, faixas, heatmap, evolução, top próximas/perdidas) ficam incoerentes —
    // por definição essas corretoras têm zero produção recente, então tudo ali daria
    // zero. Troca por um resumo focado em reativação, direto no topo (sem precisar
    // rolar até a tabela "Base de Corretoras" lá embaixo pra achar a informação real).
    const onlyReact = document.getElementById('fReact').checked;
    if (onlyReact){
      document.getElementById('execSearchBanner').style.display = 'none';
      document.getElementById('execKpiFilterBanner').style.display = 'none';
      document.getElementById('execSearchResultsPanel').style.display = 'none';
      document.getElementById('execGestorHeatmapRow').style.display = ''; // Elegib. por Gestor é reaproveitado abaixo (reativação por gestor)
      document.getElementById('heatmapPanel').style.display = 'none';
      document.getElementById('execFunnelFaixasRow').style.display = 'none';
      document.getElementById('execProxLossRow').style.display = 'none';
      document.getElementById('execEvolPanel').style.display = 'none';
      document.getElementById('reactTablePanel').style.display = '';

      const n = filtered.length;
      const totalVidas = filtered.reduce((s,d)=>s+d.tot,0);
      const media = n ? totalVidas / n : 0;
      const maisPotencial = n ? filtered.reduce((a,b)=> a.tot > b.tot ? a : b) : null;
      const mediaInativa = n ? filtered.reduce((s,d)=>s+monthsSinceLastSale(d),0) / n : 0;

      const kpiDefs = [
        { bar:'#F26B21', ico:'<i class=ic-target></i>', icoBg:'rgba(242,107,33,.12)', color:'#F26B21',
          label:'Corretoras em Oportunidade', value: fmt0(n), pct:'histórico relevante, zero produção recente',
          list: filtered, title:'Oportunidades de reativação' },
        { bar:'#1D33A8', ico:'<i class=ic-trend></i>', icoBg:'rgba(29,51,168,.10)', color:'#101E63',
          label:'Vidas Históricas em Potencial', value: fmt0(totalVidas), pct: n?('média de '+fmt0(media)+' por corretora'):'0' },
        { bar:'#16B87A', ico:'<i class=ic-award></i>', icoBg:'rgba(22,184,122,.12)', color:'#16B87A',
          label:'Maior Potencial Único', value: maisPotencial?fmt0(maisPotencial.tot):'—', pct: maisPotencial?maisPotencial.n:'—',
          list: maisPotencial ? [maisPotencial] : null, title: maisPotencial ? maisPotencial.n : '' },
        { bar:'#FFB81C', ico:'<i class=ic-alarm></i>', icoBg:'rgba(255,184,28,.16)', color:'#a5690f',
          label:'Tempo Médio Inativo', value: mediaInativa.toFixed(1)+' meses', pct:'desde a última venda' },
      ];
      document.getElementById('execKpiRow').innerHTML = kpiDefs.map((k,i)=>`
        <div class="exec-kpi ${k.list?'clickable':''}" data-i="${i}" style="--ek-bar:${k.bar}; --ek-ico-bg:${k.icoBg}; --ek-color:${k.color};" ${k.list?'title="Clique para ver as corretoras"':''}>
          <div class="ek-ico">${k.ico}</div>
          <div class="ek-label">${k.label}</div>
          <div class="ek-value">${k.value}</div>
          <div class="ek-pct">${k.pct}</div>
        </div>`).join('');
      document.querySelectorAll('#execKpiRow .exec-kpi[data-i]').forEach(el => {
        const k = kpiDefs[Number(el.dataset.i)];
        if (!k || !k.list) return;
        window.__kb(el).addEventListener('click', () => {
          if (k.list.length === 1) showDetail(k.list[0].c);
          else showChartDrilldown(k.title, k.list);
        });
      });

      destroyChart('elGestor');
      const reactByGestor = {};
      filtered.forEach(d => { (reactByGestor[d.g] = reactByGestor[d.g] || []).push(d); });
      const reactGestorNames = Object.keys(reactByGestor).sort((a,b)=>reactByGestor[b].length-reactByGestor[a].length);
      document.getElementById('elGestorTitle').textContent = 'Oportunidades de Reativação por Gestor';
      document.getElementById('elGestorSub').textContent = `${fmt0(n)} corretoras no total — clique numa barra para filtrar por gestor`;
      fitGestorChartHeight(reactGestorNames.length);
      charts.elGestor = new Chart(document.getElementById('chartElGestor'), {
        type:'bar',
        data:{ labels: reactGestorNames.map(shortGestor), datasets:[{ data: reactGestorNames.map(g=>reactByGestor[g].length),
          backgroundColor: reactGestorNames.map(g=>GESTOR_COLORS[g]||'#94a3b8'), borderRadius:7, maxBarThickness:34 }] },
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
          onClick:(evt,els)=>{ if(!els||!els.length) return; setSelectedGestores([reactGestorNames[els[0].index]]); render(); },
          onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
          plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{
            const g = reactGestorNames[c.dataIndex]; const l = reactByGestor[g];
            const potg = l.reduce((s,d)=>s+d.tot,0);
            return [`${l.length} oportunidade(s)`, `${fmt0(potg)} vidas em potencial`, 'Clique para filtrar'];
          }}}},
          scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{autoSkip:false, font:{size:11, weight:'600'}}} } }
      });

      const sortedReact = [...filtered].sort((a,b)=>b.tot-a.tot);
      document.getElementById('reactTableBody').innerHTML = sortedReact.length ? sortedReact.map(d => `
        <tr class="clickable" data-c="${d.c}">
          <td class="name">${d.n}</td>
          <td>${shortGestor(d.g)}</td>
          <td class="num">${fmt0(d.tot)}</td>
          <td>${monthsSinceLastSale(d)} meses</td>
        </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px;">Nenhuma corretora encontrada com esses filtros.</td></tr>`;
      document.querySelectorAll('#reactTableBody tr[data-c]').forEach(tr => window.__kb(tr).addEventListener('click', () => showDetail(tr.dataset.c)));

      window.__execInsights = n ? [{ico:'<i class=ic-target></i>', text:`<b>${fmt0(n)} corretoras</b> com histórico relevante estão sem vender há pelo menos 3 meses — <b>${fmt0(totalVidas)} vidas</b> em potencial de reativação.`}] : [];
      return;
    }
    document.getElementById('heatmapPanel').style.display = '';
    document.getElementById('execFunnelFaixasRow').style.display = '';
    document.getElementById('execProxLossRow').style.display = '';
    document.getElementById('execEvolPanel').style.display = '';
    document.getElementById('reactTablePanel').style.display = 'none';
    document.getElementById('elGestorTitle').textContent = 'Elegibilidade por Gestor';

    const periodMonths = getPeriodMonths();
    const periodType = document.getElementById('fPeriodType').value;
    const periodIdx = Number(document.getElementById('fPeriodValue').value);
    const cycleLabel = periodMonths ? ((PERIOD_DEFS[periodType][periodIdx]||{}).label || 'período') : 'Ciclo oficial (3TRI26)';
    // Rótulo da base de comparação do chip "vs ...": o delta compara com os N meses imediatamente
    // anteriores (N = nº de meses do período, getPrevEquivalentMonths). Com trimestre COMPLETO é o
    // trimestre anterior; com trimestre parcial (ex.: só Outubro) é só o(s) mês(es) antes — rotular
    // como "3º Trimestre" era enganoso (corrigido 2026-10-06).
    const prevLabel = (() => {
      if (!periodMonths) return '2TRI26';
      const pe = getPrevEquivalentMonths(periodMonths);
      if (periodType === 'trimestre' && periodMonths.length < 3 && pe && pe.length){
        const ml = i => (window.MONTH_LABELS && window.MONTH_LABELS[i]) || ('mês ' + i);
        return pe.length === 1 ? ml(pe[0]) : (ml(pe[0]) + ' a ' + ml(pe[pe.length - 1]));
      }
      return (PERIOD_DEFS[periodType][periodIdx-1]||{}).label || 'período anterior';
    })();
    const periodFactor = periodMonths ? (isNewEra(periodMonths) ? 0.80 : 1.10) : 0.80;
    const factorTxt = periodFactor === 0.80 ? '×0,80' : '×1,10';
    const recalcSuffix = ' <span class="recalc-tag">Recalc. ' + factorTxt + '</span>';

    // ---- contexto por corretora (uma passada, O(n)) ----
    const rows = filtered.map(d => {
      const ctx = getElegCtx(d, periodMonths);
      const prev = getPrevElegCtx(d, periodMonths);
      const lm = periodMonths ? Math.max.apply(null, periodMonths) : d.m.length - 1;
      const recent2 = (d.m[lm]||0) + (lm>0 ? (d.m[lm-1]||0) : 0);
      return { d, ctx, prev, fx: faixaIdx(ctx), recent2 };
    });
    const n = rows.length;
    const eleg      = rows.filter(r => r.ctx.el === 1);
    const quase     = rows.filter(r => r.ctx.el !== 1 && r.fx === 3);
    const risco     = eleg.filter(r => r.recent2 === 0);
    const distantes = rows.filter(r => r.ctx.el !== 1 && r.fx !== 3);
    const prevEleg  = rows.filter(r => r.prev && r.prev.el === 1);
    const prevQuase = rows.filter(r => r.prev && r.prev.el !== 1 && r.prev.meta > 0 && (r.prev.periodTotal / r.prev.meta) >= 0.76 && (r.prev.periodTotal / r.prev.meta) < 1);
    // Antes essa lista era "Perderam Elegibilidade" (quem caiu) — trocado por quem mais
    // cresceu no período: mesma comparação (atual vs. anterior), só que do lado que dá pra
    // mostrar pra uma corretora sem constranger ninguém (pedido do gestor sênior).
    const gained    = rows.filter(r => r.prev && (r.ctx.periodTotal - r.prev.periodTotal) > 0)
                          .sort((a,b) => (b.ctx.periodTotal-b.prev.periodTotal) - (a.ctx.periodTotal-a.prev.periodTotal));
    const pctEl = n ? (eleg.length / n * 100) : 0;

    // Quando a busca por nome/código está ativa, os cards abaixo recalculam em cima só do
    // resultado (correto matematicamente — "0 elegíveis" pode ser real pra 1 corretora), mas
    // sem contexto isso parece "não achei nada". Deixa isso explícito antes dos cards.
    const searchQ = document.getElementById('fSearch').value.trim();
    const searchBanner = document.getElementById('execSearchBanner');
    // Qualquer filtro que restrinja a uma fatia específica (busca por nome/código, clique num
    // dos cards de KPI, ou os dropdowns de Elegibilidade/Ranking) faz os gráficos de % pararem
    // de fazer sentido: com poucas corretoras eles ficam vazios, e com uma categoria inteira já
    // pré-selecionada (ex.: "Não Elegíveis") o resultado vira meio óbvio/redundante — os
    // dropdowns causavam esse mesmo problema mas não entravam nessa checagem. Troca por algo
    // direto: cards por corretora quando sobra pouca gente, ou um resumo por gestor quando a
    // fatia ainda é grande (mesmo comportamento já validado pros outros casos).
    const elFilterActive = document.getElementById('fEleg').value !== '';
    const rkFilterActive = selRank.value !== '';
    const isNarrowed = !!(searchQ || activeKpiFilter || elFilterActive || rkFilterActive);
    const smallSlice = isNarrowed && n > 0 && n <= 8;
    const bigSlice = isNarrowed && n > 8;
    // Rótulo do filtro ativo, pra título das duas views "fatia estreita" (smallSlice/bigSlice)
    // — cobre os 4 jeitos de chegar numa fatia restrita: card de KPI, busca por texto, e os
    // dropdowns de Elegibilidade e Ranking. Precisa vir ANTES do bloco "if (smallSlice)" logo
    // abaixo, que já usa essa variável.
    const narrowedLabel = searchQ ? `"${searchQ}"`
      : activeKpiFilter ? ({ eleg:'Elegíveis', quase:'Quase Elegíveis (76–99%)', risco:'Em Risco', distantes:'Não Elegíveis (distantes)' }[activeKpiFilter] || activeKpiFilter)
      : elFilterActive ? (document.getElementById('fEleg').selectedOptions[0].text)
      : rkFilterActive ? ('Ranking: ' + selRank.value)
      : 'filtro ativo';
    if (searchQ) {
      searchBanner.style.display = '';
      searchBanner.innerHTML = n
        ? `🔍 Busca ativa: mostrando os números apenas de <b>${n} corretora${n!==1?'s':''}</b> encontrada${n!==1?'s':''} para "<b>${searchQ}</b>" — ${smallSlice ? 'veja o detalhe de cada uma logo abaixo' : 'os cards acima refletem só esse resultado, não o time todo'}.`
        : `🔍 Nenhuma corretora encontrada para "<b>${searchQ}</b>". Confira o nome ou código digitado.`;
    } else {
      searchBanner.style.display = 'none';
    }

    document.getElementById('execSearchResultsPanel').style.display = smallSlice ? '' : 'none';
    document.getElementById('execFilterSummaryPanel').style.display = bigSlice ? '' : 'none';
    document.getElementById('execGestorHeatmapRow').style.display = isNarrowed ? 'none' : '';
    document.getElementById('execFunnelFaixasRow').style.display = isNarrowed ? 'none' : '';
    document.getElementById('execProxLossRow').style.display = isNarrowed ? 'none' : '';
    document.getElementById('execEvolPanel').style.display = isNarrowed ? 'none' : '';
    document.getElementById('segInatWrap').style.display = isNarrowed ? 'none' : '';
    document.getElementById('insightsPanel').style.display = isNarrowed ? 'none' : '';
    document.getElementById('elegRankGridPanel').style.display = isNarrowed ? 'none' : '';
    // Pedido do Victor: as duas fileiras de cards-resumo (topo + "Operação e Reativação")
    // ficam feias/sem sentido quando a tela já está filtrada numa fatia pequena (busca por
    // nome/código OU clique num dos próprios cards de KPI) — nesses casos o "Resultado da
    // busca" e a tabela "Base de Corretoras" já mostram a informação direta, sem precisar
    // do resumo agregado por cima. Some com as duas nos dois casos, iguala o resto da tela.
    document.getElementById('execKpiRow').style.display = isNarrowed ? 'none' : '';
    document.getElementById('elKpiRowLabel').style.display = isNarrowed ? 'none' : '';
    document.getElementById('elKpiRow').style.display = isNarrowed ? 'none' : '';
    // Quando a busca já resolve pra poucas corretoras, "Resultado da busca" (cards, clicável
    // pra abrir o detalhe) e a tabela "Base de Corretoras" mostravam exatamente as mesmas
    // linhas — redundante. Some com a tabela só nesse caso (smallSlice); quando a fatia é
    // grande (bigSlice, ex.: clicou em "Não Elegíveis" com 70+ corretoras) a tabela continua
    // sendo o único jeito de navegar pela lista inteira, então permanece visível.
    document.getElementById('baseCorretorasPanel').style.display = smallSlice ? 'none' : '';

    if (smallSlice){
      document.getElementById('execSearchResultsTitle').textContent = searchQ ? 'Resultado da busca' : `Resultado do filtro — ${narrowedLabel}`;
      // Se o painel de detalhe estava "morando" dentro de um card (efeito acordeão) e a
      // lista de resultados vai ser reconstruída agora (buscou de novo, mudou filtro...),
      // resgata ele pro lugar de origem ANTES de sobrescrever o innerHTML — senão o
      // innerHTML=... abaixo apaga o nó inteiro (mesmo sendo o #detailPanel compartilhado
      // com o resto da tela) e ele some da página pra sempre, quebrando todo clique futuro.
      const dpRescue = document.getElementById('detailPanel');
      document.getElementById('detailPanelAnchor').insertAdjacentElement('afterend', dpRescue);
      dpRescue.classList.remove('show');
      document.getElementById('execSearchResultsCards').innerHTML = rows.map(r => {
        const gap = r.ctx.periodTotal - r.ctx.meta;
        return `<div class="search-result-card" data-c="${r.d.c}">
          <div class="sr-head">
            <div>
              <div class="sr-name">${r.d.n}</div>
              <div class="sr-meta">Código ${r.d.c} · Gestor: ${shortGestor(r.d.g)} · Ranking: ${r.ctx.rk}</div>
            </div>
            ${r.ctx.el===1 ? '<span class="tag elig">Elegível</span>' : '<span class="tag noelig">Não elegível</span>'}
          </div>
          <div class="sr-stats">
            <div class="sr-stat"><div class="sr-label">Total ${r.d.m ? r.d.m.length : 17}M</div><div class="sr-value" style="color:var(--navy);">${fmt0(r.d.tot)}</div></div>
            <div class="sr-stat"><div class="sr-label">${cycleLabel} Atual</div><div class="sr-value" style="color:var(--primary-light);">${fmt0(r.ctx.periodTotal)}</div></div>
            <div class="sr-stat"><div class="sr-label">Meta ${cycleLabel}</div><div class="sr-value" style="color:#a5690f;">${fmt0(r.ctx.meta)}</div></div>
            <div class="sr-stat"><div class="sr-label">Gap</div><div class="sr-value" style="color:${gap>=0?'#16B87A':'#F5364A'};">${gap>=0?'+':''}${fmt0(gap)}</div></div>
          </div>
        </div>`;
      }).join('');
      // Pedido do Victor: em vez de abrir o painel de detalhe separado, mais embaixo na
      // tela, o card clicado em "Resultado da busca" expande no próprio lugar (efeito
      // acordeão) — o painel (mesmo, reaproveitando toda a lógica de showDetail) é movido
      // pra dentro do card. Clicar de novo no card já aberto fecha; clicar em outro card
      // move o painel pra lá (só um aberto por vez).
      document.querySelectorAll('#execSearchResultsCards .search-result-card').forEach(card => {
        window.__kb(card).addEventListener('click', () => {
          const panel = document.getElementById('detailPanel');
          const jaAbertoAqui = panel.classList.contains('show') && panel.parentElement === card;
          if (jaAbertoAqui){ panel.classList.remove('show'); return; }
          showDetail(card.dataset.c, {attachTo: card, scroll: true});
        });
      });
    }

    if (bigSlice){
      document.getElementById('execFilterSummaryTitle').textContent = `Resumo da fatia filtrada — ${narrowedLabel}`;
      const byGestorSlice = {};
      rows.forEach(r => { (byGestorSlice[r.d.g] = byGestorSlice[r.d.g] || []).push(r); });
      const gestorNamesSlice = Object.keys(byGestorSlice).sort((a,b)=>byGestorSlice[b].length-byGestorSlice[a].length);
      destroyChart('filterSummaryGestor');
      charts.filterSummaryGestor = new Chart(document.getElementById('chartFilterSummaryGestor'), {
        type:'bar',
        data:{ labels: gestorNamesSlice.map(shortGestor), datasets:[{ data: gestorNamesSlice.map(g=>byGestorSlice[g].length),
          backgroundColor: gestorNamesSlice.map(g=>GESTOR_COLORS[g]||'#94a3b8'), borderRadius:6, maxBarThickness:22 }] },
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
          plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${c.parsed.x} corretora${c.parsed.x!==1?'s':''}`}}},
          scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{precision:0, font:{size:9}}}, y:{grid:{display:false}, ticks:{font:{size:10, weight:'600'}}} } }
      });
      const totalVidasSlice = rows.reduce((s,r)=>s+r.d.tot,0);
      const maiorGestorSlice = gestorNamesSlice[0];
      document.getElementById('execFilterSummaryStats').innerHTML = `
        <div><div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;">Corretoras na fatia</div><div style="font-size:19px; font-weight:800; color:var(--navy);">${fmt0(n)}</div></div>
        <div><div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;">Vidas (total 17M)</div><div style="font-size:19px; font-weight:800; color:var(--navy);">${fmt0(totalVidasSlice)}</div></div>
        <div><div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;">Maior concentração</div><div style="font-size:14px; font-weight:700; color:var(--navy);">${maiorGestorSlice ? shortGestor(maiorGestorSlice) : '—'}</div></div>
      `;
    }

    const deltaChip = (cur, prev, invert) => {
      if (prev === null) return `<span class="ek-delta flat">— sem base p/ comparar</span>`;
      const diff = cur - prev;
      const cls = diff === 0 ? 'flat' : ((diff > 0) !== !!invert ? 'up' : 'down');
      const arrow = diff === 0 ? '·' : (diff > 0 ? '▲' : '▼');
      return `<span class="ek-delta ${cls}">${arrow} ${diff>0?'+':''}${fmt0(diff)} vs ${prevLabel}</span>`;
    };
    const hasPrev = rows.some(r => r.prev);

    // ---- KPIs executivos ----
    const kpiDefs = [
      { key:'eleg', bar:'#16B87A', ico:'<i class=ic-check></i>', icoBg:'rgba(22,184,122,.12)', color:'#16B87A',
        label:'Elegíveis', value: fmt0(eleg.length), pct: pctEl.toFixed(1)+'% do total',
        delta: deltaChip(eleg.length, hasPrev ? prevEleg.length : null),
        note: periodMonths ? cycleLabel+' (recalc.)' : 'Coluna oficial da planilha',
        list: eleg, title:'Elegíveis — '+cycleLabel },
      { key:'quase', bar:'#FFB81C', ico:'<i class=ic-trend></i>', icoBg:'rgba(255,184,28,.16)', color:'#a5690f',
        label:'Quase Elegíveis (76–99%)', value: fmt0(quase.length), pct: n?(quase.length/n*100).toFixed(1)+'% do total':'0%',
        delta: deltaChip(quase.length, hasPrev ? prevQuase.length : null),
        note:'Menor esforço → maior retorno', list: quase, title:'Quase elegíveis (76–99% da meta) — '+cycleLabel },
      { key:'risco', bar:'#F26B21', ico:'<i class=ic-warn></i>', icoBg:'rgba(242,107,33,.12)', color:'#F26B21',
        label:'Em Risco', value: fmt0(risco.length), pct: eleg.length?(risco.length/eleg.length*100).toFixed(1)+'% das elegíveis':'0%',
        delta:'<span class="ek-delta '+(risco.length?'down':'up')+'">'+(risco.length?'requer contato':'nenhuma')+'</span>',
        note:'Elegíveis sem venda nos últimos 2 meses', list: risco, title:'Em risco — elegíveis sem vendas recentes' },
      { key:'distantes', bar:'#F5364A', ico:'<i class=ic-alarm></i>', icoBg:'rgba(245,54,74,.10)', color:'#F5364A',
        label:'Não Elegíveis (distantes)', value: fmt0(distantes.length), pct: n?(distantes.length/n*100).toFixed(1)+'% do total':'0%',
        delta:'<span class="ek-delta flat">abaixo de 76% da meta</span>',
        note:'Foco em reativação estrutural', list: distantes, title:'Não elegíveis abaixo de 76% da meta — '+cycleLabel },
      // color omitido de propósito (2026-10-01, achado da auditoria de contraste): era '#101E63'
      // fixo (igual à --navy do modo claro) — os outros 4 cards usam cor semântica (verde/amarelo/
      // laranja/vermelho) que faz sentido ficar igual nos dois temas, mas "Total de Corretoras"
      // não tem significado de cor nenhum, só pegava o navy por engano. --ek-color some, .ek-value
      // cai no próprio fallback do CSS (var(--ek-color, var(--navy))) — que já é escuro no claro e
      // claro no escuro sozinho.
      { key:null, bar:'#1D33A8', ico:'<i class=ic-users></i>', icoBg:'rgba(29,51,168,.10)',
        label:'Total de Corretoras', value: fmt0(n), pct:'100% do filtro atual',
        delta:'<span class="ek-delta flat">base analisada</span>', note:'', list:null },
    ];
    document.getElementById('execKpiRow').innerHTML = kpiDefs.map((k,i)=>{
      const isActive = k.key && activeKpiFilter === k.key;
      return `<div class="exec-kpi ${k.key?'clickable':''}" data-i="${i}" style="--ek-bar:${k.bar}; --ek-ico-bg:${k.icoBg};${k.color?` --ek-color:${k.color};`:''} ${isActive?'box-shadow:0 0 0 2.5px '+k.bar+'; transform:translateY(-1px);':''}" ${k.key?`title="${isActive?'Clique para limpar o filtro':'Clique para filtrar o dashboard por essa fatia'}"`:''}>
        <div class="ek-ico">${k.ico}</div>
        <div class="ek-label">${k.label}${isActive?' <span style="font-size:9.5px; font-weight:800; letter-spacing:.3px;">● FILTRANDO</span>':''}</div>
        <div class="ek-value">${k.value}</div>
        <div class="ek-pct">${k.pct}</div>
        <div>${k.delta}</div>
        ${k.note?`<div class="ek-note">${k.note}</div>`:''}
      </div>`;
    }).join('') + `
      <div class="exec-kpi" style="--ek-bar:linear-gradient(90deg,#2E52D4,#16B87A);">
        <div class="ek-ico" style="background:rgba(46,82,212,.10);"><i class=ic-award></i></div>
        <div class="ek-label">Elegibilidade Geral</div>
        <div class="gauge-box"><canvas id="chartGauge"></canvas>
          <div class="gauge-center"><div class="g-pct">${pctEl.toFixed(1)}%</div><div class="g-frac">${fmt0(eleg.length)} / ${fmt0(n)} elegíveis</div></div>
        </div>
      </div>`;
    document.querySelectorAll('#execKpiRow .exec-kpi[data-i]').forEach(el => {
      const k = kpiDefs[Number(el.dataset.i)];
      if (k && k.key) window.__kb(el).addEventListener('click', () => {
        activeKpiFilter = (activeKpiFilter === k.key) ? null : k.key;
        page = 1;
        renderActive();
      });
    });

    const kpiFilterBanner = document.getElementById('execKpiFilterBanner');
    if (activeKpiFilter){
      const activeDef = kpiDefs.find(k => k.key === activeKpiFilter);
      kpiFilterBanner.style.display = 'flex';
      kpiFilterBanner.innerHTML = `<span>🎯 Filtro ativo: <b>${activeDef ? activeDef.label : activeKpiFilter}</b> — todo o painel (gráficos e tabela) está mostrando só essa fatia.</span><button class="btn-reset" id="btnClearKpiFilter" style="font-size:11.5px; padding:4px 10px;">Voltar ao normal</button>`;
      document.getElementById('btnClearKpiFilter').addEventListener('click', () => { activeKpiFilter = null; page = 1; renderActive(); });
    } else {
      kpiFilterBanner.style.display = 'none';
    }

    destroyChart('gauge');
    charts.gauge = new Chart(document.getElementById('chartGauge'), {
      type:'doughnut',
      data:{ datasets:[{ data:[pctEl, Math.max(0,100-pctEl)], backgroundColor:['#16B87A','#e8edf7'], borderWidth:0, borderRadius:6 }] },
      options:{ responsive:true, maintainAspectRatio:false, rotation:-90, circumference:180, cutout:'74%',
        plugins:{legend:{display:false}, tooltip:{enabled:false}}, animation:{animateRotate:true, duration:700} }
    });

    // ---- Elegibilidade por gestor ----
    const byGestor = {};
    rows.forEach(r => { (byGestor[r.d.g] = byGestor[r.d.g] || []).push(r); });
    const gestorNames = Object.keys(byGestor).sort((a,b)=>byGestor[b].length-byGestor[a].length);
    const gestorPcts = gestorNames.map(g => { const l=byGestor[g]; return l.length ? l.filter(r=>r.ctx.el===1).length/l.length*100 : 0; });
    document.getElementById('elGestorSub').innerHTML = `% de corretoras elegíveis por gestor — média geral: <b>${pctEl.toFixed(1)}%</b> (linha tracejada) · clique numa barra para filtrar a aba inteira` + (periodMonths ? recalcSuffix : '');
    const avgLinePlugin = { id:'avgLine', afterDatasetsDraw(chart){
      const x = chart.scales.x.getPixelForValue(pctEl); const {top, bottom} = chart.chartArea;
      const c = chart.ctx; c.save(); c.strokeStyle='#101E63'; c.setLineDash([5,4]); c.lineWidth=1.5;
      c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke(); c.restore();
    }};
    destroyChart('elGestor');
    fitGestorChartHeight(gestorNames.length);
    charts.elGestor = new Chart(document.getElementById('chartElGestor'), {
      type:'bar',
      data:{ labels: gestorNames.map(shortGestor), datasets:[{ data: gestorPcts,
        backgroundColor: gestorNames.map(g=>GESTOR_COLORS[g]||'#94a3b8'), borderRadius:7, maxBarThickness:34 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        onClick:(evt,els)=>{ if(!els||!els.length) return; setSelectedGestores([gestorNames[els[0].index]]); render(); },
        onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{
          const g = gestorNames[c.dataIndex]; const l = byGestor[g];
          return [`${c.parsed.x.toFixed(1)}% elegíveis`, `${l.filter(r=>r.ctx.el===1).length} de ${l.length} corretoras`, 'Clique para filtrar'];
        }}}},
        scales:{ x:{beginAtZero:true, max:Math.max(10, Math.ceil(Math.max.apply(null, gestorPcts.concat([pctEl]))/5)*5+5), grid:{color:'#eef1f6'}, ticks:{callback:v=>v+'%'}}, y:{grid:{display:false}, ticks:{autoSkip:false, font:{size:11, weight:'600'}}} } },
      plugins:[avgLinePlugin]
    });

    // ---- Heatmap Gestor × Faixa ----
    const hmCols = FAIXA_LABELS.concat(['Sem meta']);
    const hmColors = FAIXA_COLORS.concat([SEM_META_COLOR]);
    let hmHtml = '<tr><th class="hm-gestor"></th>' + hmCols.map(c=>`<th>${c}</th>`).join('') + '</tr>';
    const hmLists = {};
    gestorNames.forEach(g => {
      const l = byGestor[g];
      const counts = hmCols.map((_,ci) => l.filter(r => (ci===5 ? r.fx===-1 : r.fx===ci)));
      const rowMax = Math.max.apply(null, counts.map(c=>c.length).concat([1]));
      hmHtml += `<tr><th class="hm-gestor">${shortGestor(g)}</th>` + counts.map((list,ci)=>{
        const key = g+'|'+ci; hmLists[key] = list;
        const alpha = list.length ? (0.18 + 0.72*(list.length/rowMax)) : 0.05;
        const pctRow = l.length ? (list.length/l.length*100).toFixed(0) : 0;
        return `<td class="hm-cell" data-k="${key}" style="background:${hexToRgba(hmColors[ci], alpha)};" title="${shortGestor(g)} · ${hmCols[ci]}: ${list.length} corretora(s) — clique para ver">${list.length}<small>${pctRow}%</small></td>`;
      }).join('') + '</tr>';
    });
    document.getElementById('heatmapTable').innerHTML = hmHtml;
    document.getElementById('heatmapSub').innerHTML = `Corretoras por gestor em cada faixa de atingimento da meta — ${cycleLabel} · clique numa célula` + (periodMonths ? recalcSuffix : '');
    document.getElementById('heatmapLegend').innerHTML = hmCols.map((c,i)=>`<span><i style="background:${hmColors[i]};"></i>${c}</span>`).join('') + '<span style="margin-left:auto;">Intensidade = concentração dentro do gestor</span>';
    document.querySelectorAll('#heatmapTable .hm-cell').forEach(td => window.__kb(td).addEventListener('click', () => {
      const key = td.dataset.k; const [g, ci] = key.split('|');
      showChartDrilldown(`${shortGestor(g)} — faixa ${hmCols[Number(ci)]}`, (hmLists[key]||[]).map(r=>r.d));
    }));

    // ---- Funil ----
    const s1 = rows, s2 = rows.filter(r=>r.d.tot>0), s3 = rows.filter(r=>r.ctx.periodTotal>0),
          s4 = rows.filter(r=>r.ctx.meta>0 && r.ctx.periodTotal>=r.ctx.meta), s5 = eleg;
    const stages = [
      {label:'Total de Corretoras', sub:'Base no filtro atual', list:s1, color:'#101E63'},
      {label:'Já Produziram', sub:'Ao menos 1 vida no histórico completo', list:s2, color:'#1D33A8'},
      {label:'Produziram no Ciclo', sub:cycleLabel, list:s3, color:'#2E52D4'},
      {label:'Atingiram a Meta', sub:'Volume ≥ meta '+factorTxt, list:s4, color:'#FFB81C'},
      {label:'Elegíveis', sub: periodMonths?'Recalculado p/ o período':'Coluna oficial', list:s5, color:'#16B87A'},
    ];
    document.getElementById('funnelSub').innerHTML = `Da base total até as elegíveis — conversão geral: <b>${n?(s5.length/n*100).toFixed(1):0}%</b> · clique numa etapa` + (periodMonths ? recalcSuffix : '');
    let fHtml = '';
    stages.forEach((s,i)=>{
      const w = n ? Math.max(12, s.list.length/n*100) : 12;
      const pct = n ? (s.list.length/n*100).toFixed(1) : '0';
      if (i>0){
        const prevC = stages[i-1].list.length;
        const conv = prevC ? (s.list.length/prevC*100).toFixed(1) : '0';
        fHtml += `<div class="funnel-conv"><div class="fc-txt">↓ conversão <b>${conv}%</b></div><div></div></div>`;
      }
      fHtml += `<div class="funnel-stage"><div class="funnel-bar-area"><div class="funnel-bar" data-i="${i}" style="width:${w}%; background:${s.color};">${fmt0(s.list.length)}</div></div><div class="funnel-meta"><b>${s.label}</b><span>${s.sub} · ${pct}% do total</span></div></div>`;
    });
    document.getElementById('funnelWrap').innerHTML = fHtml;
    document.querySelectorAll('#funnelWrap .funnel-bar').forEach(b => window.__kb(b).addEventListener('click', () => {
      const s = stages[Number(b.dataset.i)]; showChartDrilldown('Funil — '+s.label, s.list.map(r=>r.d));
    }));

    // ---- Faixas de atingimento ----
    const faixaLists = FAIXA_LABELS.map((_,i)=>rows.filter(r=>r.fx===i));
    const semMetaCount = rows.filter(r=>r.fx===-1).length;
    destroyChart('faixas');
    charts.faixas = new Chart(document.getElementById('chartFaixas'), {
      type:'bar',
      data:{ labels: FAIXA_LABELS, datasets:[{ data: faixaLists.map(l=>l.length), backgroundColor: FAIXA_COLORS, borderRadius:7, maxBarThickness:56 }] },
      options:{ responsive:true, maintainAspectRatio:false,
        onClick:(evt,els)=>{ if(!els||!els.length) return; const i=els[0].index; showChartDrilldown('Faixa de atingimento '+FAIXA_LABELS[i], faixaLists[i].map(r=>r.d)); },
        onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>[`${c.parsed.y} corretora(s)`, n?`${(c.parsed.y/n*100).toFixed(1)}% da base`:'', 'Clique para ver a lista']}}},
        scales:{ y:{beginAtZero:true, grid:{color:'#eef1f6'}}, x:{grid:{display:false}, ticks:{font:{size:11, weight:'700'}}} } }
    });
    const quaseGap = quase.reduce((s,r)=>s+Math.max(0, Math.ceil(r.ctx.meta - r.ctx.periodTotal)),0);
    document.getElementById('faixasSub').innerHTML = `% da meta (${cycleLabel}) atingido por corretora — clique numa barra` + (periodMonths ? recalcSuffix : '');
    document.getElementById('faixasNote').innerHTML = quase.length
      ? `<i class=ic-bulb></i> <b>${fmt0(quase.length)} corretoras</b> estão entre 76–99% da meta — faltam <b>${fmt0(quaseGap)} vidas</b> no total para todas virarem elegíveis.` + (semMetaCount?` <span style="color:var(--muted); font-weight:500;">(${fmt0(semMetaCount)} sem meta definida — sem histórico no período-base — fora do gráfico.)</span>`:'')
      : `Nenhuma corretora na zona de 76–99% neste filtro.` + (semMetaCount?` <span style="color:var(--muted); font-weight:500;">${fmt0(semMetaCount)} sem meta definida fora do gráfico.</span>`:'');

    // ---- Top 10 mais próximas ----
    const prox = rows.filter(r => r.ctx.el !== 1 && r.ctx.meta > 0 && r.ctx.periodTotal < r.ctx.meta)
                     .sort((a,b) => (b.ctx.periodTotal/b.ctx.meta) - (a.ctx.periodTotal/a.ctx.meta)).slice(0,10);
    document.getElementById('proxTitle').textContent = `Top ${prox.length||10} Mais Próximas da Elegibilidade`;
    document.getElementById('proxList').innerHTML = prox.length ? prox.map((r,i)=>{
      const a = r.ctx.periodTotal/r.ctx.meta*100;
      const gap = Math.max(1, Math.ceil(r.ctx.meta - r.ctx.periodTotal));
      return `<div class="prox-row" data-c="${r.d.c}">
        <div class="p-rank">${i+1}</div>
        <div class="p-name"><b>${r.d.n}</b><span>${shortGestor(r.d.g)} · ${r.ctx.rk}</span></div>
        <div class="p-bar"><i style="width:${Math.min(100,a).toFixed(1)}%"></i></div>
        <div class="p-gap"><b>${a.toFixed(0)}%</b><span>faltam ${fmt0(gap)}</span></div>
      </div>`;
    }).join('') : '<div class="loss-empty"><i class=ic-check></i> Nenhuma corretora não-elegível com meta definida neste filtro.</div>';
    document.querySelectorAll('#proxList .prox-row').forEach(el => window.__kb(el).addEventListener('click', ()=>showDetail(el.dataset.c)));

    // ---- Maiores crescimentos do período ----
    document.getElementById('gainSub').innerHTML = `Comparado a <b>${prevLabel}</b> — reconhecimento para reforçar em campo` + recalcSuffix;
    document.getElementById('gainList').innerHTML = gained.length ? gained.slice(0,8).map(r=>{
      const growth = r.ctx.periodTotal - r.prev.periodTotal;
      return `<div class="gain-row" data-c="${r.d.c}">
        <div class="g-ico"><i class=ic-trend></i></div>
        <div class="g-name"><b>${r.d.n}</b><span>${shortGestor(r.d.g)} · ${fmt0(r.prev.periodTotal)} → ${fmt0(r.ctx.periodTotal)} vidas</span></div>
        <div class="g-delta">+${fmt0(growth)}<span>vidas vs ${prevLabel}</span></div>
      </div>`;
    }).join('') + (gained.length>8?`<div style="font-size:11px; color:var(--muted); text-align:center; padding-top:4px;">+ ${gained.length-8} corretora(s) — use os filtros para ver todas</div>`:'')
      : '<div class="loss-empty"><i class=ic-check></i> Nenhuma corretora com crescimento na comparação com '+prevLabel+'.</div>';
    document.querySelectorAll('#gainList .gain-row').forEach(el => window.__kb(el).addEventListener('click', ()=>showDetail(el.dataset.c)));

    // ---- Evolução trimestral (recalculada) ----
    const lastIdx = MONTH_LABELS.length - 1;
    const evoTris = PERIOD_DEFS.trimestre.filter(t => t.months.length === 3 && Math.max.apply(null,t.months) < lastIdx && getPrevEquivalentMonths(t.months));
    const evoPcts = evoTris.map(t => {
      if (!n) return 0;
      const c = filtered.reduce((s,d)=>s+(computePeriodElegRank(d, t.months).el===1?1:0),0);
      return c/n*100;
    });
    destroyChart('elEvol');
    const evoCanvas = document.getElementById('chartElEvolucao');
    const evoCtx2d = evoCanvas.getContext('2d');
    const evoGrad = evoCtx2d.createLinearGradient(0,0,0,260);
    evoGrad.addColorStop(0,'rgba(46,82,212,.22)'); evoGrad.addColorStop(1,'rgba(46,82,212,0)');
    charts.elEvol = new Chart(evoCanvas, {
      type:'line',
      data:{ labels: evoTris.map(t=>t.label.replace('º Trimestre/','TRI')), datasets:[{ data: evoPcts,
        borderColor:'#2E52D4', backgroundColor:evoGrad, fill:true, tension:.35, borderWidth:2.5,
        pointRadius:4, pointBackgroundColor:'#fff', pointBorderColor:'#2E52D4', pointBorderWidth:2.5, pointHoverRadius:6 }] },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${c.parsed.y.toFixed(1)}% elegíveis (recalculado)`}}},
        scales:{ y:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{callback:v=>v+'%'}}, x:{grid:{display:false}, ticks:{font:{size:11, weight:'600'}}} } }
    });

    // ---- Insights executivos (consumidos pelo painel de insights existente) ----
    const execInsights = [];
    if (quase.length) execInsights.push({ico:'<i class=ic-trend></i>', text:`<b>${fmt0(quase.length)} corretoras</b> estão entre 76–99% da meta — <b>${fmt0(quaseGap)} vidas</b> separam o time desse salto de elegibilidade.`});
    if (gained.length) execInsights.push({ico:'<i class=ic-trophy></i>', text:`<b>${fmt0(gained.length)} corretoras</b> aumentaram a produção vs ${prevLabel} — bom momento para reforçar o relacionamento.`});
    if (risco.length) execInsights.push({ico:'<i class=ic-alarm></i>', text:`<b>${fmt0(risco.length)} elegíveis</b> estão sem vendas nos últimos 2 meses — risco de perder o status no próximo ciclo.`});
    if (gestorNames.length > 1){
      const bi = gestorPcts.indexOf(Math.max.apply(null, gestorPcts));
      execInsights.push({ico:'<i class=ic-trophy></i>', text:`<b>${shortGestor(gestorNames[bi])}</b> tem a maior taxa de elegibilidade da equipe (${gestorPcts[bi].toFixed(1)}%).`});
    }
    window.__execInsights = execInsights;
  }

  function render(){
    const filtered = applyFilters();
    document.getElementById('resultCount').textContent = filtered.length.toLocaleString('pt-BR') + ' corretora(s)';

    const totSum = filtered.reduce((s,d)=>s+d.tot,0);
    // "Modo mês vigente": true quando o mês selecionado é o mês mais recente já importado
    // (não um mês histórico) — nesse caso mostramos o 3TRI26 em andamento (live) em vez do
    // 2TRI26 já fechado. Antes isso estava fixo em "é julho?", o que travava em julho pra
    // sempre; agora acompanha qualquer mês novo (agosto, setembro...) automaticamente.
    const isLatestMonthMode = (window.getCurrentMonth ? window.getCurrentMonth() : null) === (window.getLatestKnownMonth ? window.getLatestKnownMonth() : null);
    const periodMonthsKpi = getPeriodMonths();
    let t2Sum, metaSum, periodLabelKpi;
    if (periodMonthsKpi){
      const periodValueIdxKpi = Number(document.getElementById('fPeriodValue').value);
      const periodTypeKpi = document.getElementById('fPeriodType').value;
      const periodLabelText = (PERIOD_DEFS[periodTypeKpi][periodValueIdxKpi] || {}).label || '';
      t2Sum = filtered.reduce((s,d)=>s+computePeriodElegRank(d, periodMonthsKpi).periodTotal, 0);
      metaSum = filtered.reduce((s,d)=>s+computePeriodElegRank(d, periodMonthsKpi).meta, 0);
      periodLabelKpi = `${periodLabelText} vs Meta`;
    } else {
      t2Sum = isLatestMonthMode ? filtered.reduce((s,d)=>s+(d.m[d.m.length-1]||0),0) : filtered.reduce((s,d)=>s+d.t2,0);
      metaSum = isLatestMonthMode ? filtered.reduce((s,d)=>s+(d.meta3tri||0),0) : filtered.reduce((s,d)=>s+d.meta,0);
      periodLabelKpi = isLatestMonthMode ? '3TRI26 (parcial) vs Meta' : '2TRI26 vs Meta';
    }
    const eligCount = periodMonthsKpi ? filtered.filter(d=>computePeriodElegRank(d, periodMonthsKpi).el===1).length : filtered.filter(d=>d.el===1).length;
    const eligPct = filtered.length ? (eligCount/filtered.length*100) : 0;
    const reactList = filtered.filter(isReactivation);

    // kpis unificado construido mais abaixo, apos semProducao/inativas90/periodLabel estarem prontos

    const filtersActive = isAnyFilterActive();
    document.getElementById('reactBanner').style.display = filtersActive ? 'none' : '';
    if (!filtersActive) {
      document.getElementById('reactCount').textContent = reactList.length;
      document.getElementById('reactPotential').textContent = fmt0(reactList.reduce((s,d)=>s+d.tot,0));
      document.getElementById('reactPeak').textContent = reactList.length ? fmt0(Math.max(...reactList.map(d=>d.tot))) : '0';
    }

    // ===== Situação de Atividade da Carteira (distinto do flag "Elegível" da campanha) =====
    const periodMonths = getPeriodMonths(); // null = "Todos os meses"
    const periodType = document.getElementById('fPeriodType').value;
    const periodLabel = periodType === 'all' ? 'todos os meses' : (PERIOD_DEFS[periodType][Number(document.getElementById('fPeriodValue').value)] || {}).label || '';
    const showAbsoluteCharts = !periodMonths;
    const reactListEffective = showAbsoluteCharts ? reactList : filtered.filter(d => {
      const minMonthPeriod = Math.min.apply(null, periodMonths);
      const hadHistoryBefore = d.m.slice(0, minMonthPeriod).some(v=>v>0);
      const periodTotalReact = periodMonths.reduce((s,i)=>s+(d.m[i]||0),0);
      return hadHistoryBefore && periodTotalReact === 0;
    });
    const gestorLabel = selectedGestores.size === 0 ? 'todos os gestores'
      : selectedGestores.size === 1 ? [...selectedGestores][0]
      : [...selectedGestores].map(shortGestor).join(', ');
    document.getElementById('segmentacaoSub').textContent = `Quem vende agora, quem já vendeu e parou, e quem nunca vendeu — gestor: ${gestorLabel} · clique numa fatia`;
    document.getElementById('inatividadeSub').textContent = `Há quanto tempo cada corretora parou de vender — gestor: ${gestorLabel} · clique numa barra`;
    const inPeriod = d => (periodMonths || Array.from({length:18},(_,i)=>i)).some(i => d.m[i] > 0);

    const semProducao = filtered.filter(d => !inPeriod(d));
    const produziram = filtered.filter(d => inPeriod(d));
    const inativas90 = filtered.filter(d => monthsSinceLastSale(d) > 3);
    const potencialSemProducao = semProducao.reduce((s,d)=>s+d.tot,0);

    const kpis = [
      {icon:"<i class=ic-building></i>", label:'Corretoras na Base', value: fmt0(filtered.length), sub:'Base ativa analisada', cls:'', action:()=>document.getElementById('baseCorretorasWrap').scrollIntoView({behavior:'smooth'})},
      {icon:"<i class=ic-target></i>", label:periodLabelKpi, value: fmt0(t2Sum)+' / '+fmt0(metaSum), sub: t2Sum>=metaSum ? 'Meta batida' : 'Faltam '+fmt0(metaSum-t2Sum)+' vidas', cls: t2Sum>=metaSum?'pos':'neg'},
      {icon:"<i class=ic-cart></i>", label:`Sem Produção (${periodLabel})`, value: fmt0(semProducao.length), sub: filtered.length?((semProducao.length/filtered.length*100).toFixed(1)+'% da base'):'0%', cls:'warn', action:()=>showChartDrilldown(`Sem Produção — ${periodLabel}`, semProducao)},
      {icon:"<i class=ic-alarm></i>", label:'Inativas > 90 dias', value: fmt0(inativas90.length), sub:'Sem venda há mais de 3 meses', cls:'neg', action:()=>showChartDrilldown('Inativas há mais de 90 dias', inativas90)},
      {icon:"<i class=ic-target></i>", label:'Oportunidades de Reativação', value: reactListEffective.length.toLocaleString('pt-BR'), sub: fmt0(reactListEffective.reduce((s,d)=>s+d.tot,0))+' vidas em potencial', cls:'warn'},
    ];
    document.getElementById('elKpiRow').innerHTML = kpis.map((k,i)=>`<div class="kpi" ${k.action?'style="cursor:pointer" title="Clique para ver as corretoras"':''} data-idx="${i}"><div class="kpi-icon">${k.icon}</div><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="sub ${k.cls}">${k.sub}</div></div>`).join('');
    document.querySelectorAll('#elKpiRow .kpi').forEach((el,i) => { if (kpis[i].action) window.__kb(el).addEventListener('click', kpis[i].action); });

    renderExecutive(filtered);

    destroyChart('atividade');
    let jaVendeuMasParouList, nuncaVendeuList, segmentacaoData;
    if (showAbsoluteCharts){
      jaVendeuMasParouList = semProducao.filter(d => d.tot > 0);
      nuncaVendeuList = semProducao.filter(d => d.tot === 0);
      segmentacaoData = [
        {label:'Produziram no período', list: produziram},
        {label:'Já vendeu, parou (oportunidade)', list: jaVendeuMasParouList},
        {label:'Nunca vendeu', list: nuncaVendeuList},
      ];
      document.getElementById('segmentacaoSub').textContent = `Quem vende agora, quem já vendeu e parou, e quem nunca vendeu — gestor: ${gestorLabel} · clique numa fatia`;
    } else {
      const minMonthPeriod = Math.min.apply(null, periodMonths);
      jaVendeuMasParouList = semProducao.filter(d => d.m.slice(0, minMonthPeriod).some(v=>v>0));
      nuncaVendeuList = semProducao.filter(d => !d.m.slice(0, minMonthPeriod).some(v=>v>0));
      segmentacaoData = [
        {label:'Produziram no período', list: produziram},
        {label:'Vendia antes, parou no período', list: jaVendeuMasParouList},
        {label:'Nunca vendeu (nem antes)', list: nuncaVendeuList},
      ];
      document.getElementById('segmentacaoSub').textContent = `Quem produziu, quem parou, e quem nunca vendeu — dentro de ${periodLabel} · clique numa fatia`;
    }
    document.getElementById('segEmptyState').style.display = 'none';
    document.getElementById('chartAtividade').style.visibility = 'visible';
    charts.atividade = new Chart(document.getElementById('chartAtividade'), {
      type:'doughnut',
      data:{ labels:segmentacaoData.map(s=>s.label), datasets:[{ data:segmentacaoData.map(s=>s.list.length), backgroundColor:['#16B87A','#F26B21','#cbd5e1'], borderWidth:0 }] },
      options:{ responsive:true, maintainAspectRatio:false,
        onClick:(evt,els)=>{ if(!els||!els.length) return; const s = segmentacaoData[els[0].index]; showChartDrilldown(s.label, s.list); },
        onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
        plugins:{legend:{position:'bottom', labels:{boxWidth:12,font:{size:10.5}}}} }
    });

    destroyChart('evolucaoAtiva');
    document.getElementById('inatEmptyState').style.display = 'none';
    document.getElementById('chartEvolucaoAtiva').style.visibility = 'visible';
    let dormBucketLabels, dormListsFinal, dormChartTitle;
    if (showAbsoluteCharts){
      const DORM_BUCKETS = ['Ativa (mês atual)','1–3 meses','4–6 meses','7–12 meses','13+ meses','Nunca vendeu'];
      const dormLists = [[],[],[],[],[],[]];
      filtered.forEach(d => {
        if (d.tot === 0){ dormLists[5].push(d); return; }
        const ms = monthsSinceLastSale(d);
        if (ms === 0) dormLists[0].push(d);
        else if (ms <= 3) dormLists[1].push(d);
        else if (ms <= 6) dormLists[2].push(d);
        else if (ms <= 12) dormLists[3].push(d);
        else dormLists[4].push(d);
      });
      dormBucketLabels = DORM_BUCKETS; dormListsFinal = dormLists;
      document.getElementById('inatividadeSub').textContent = `Há quanto tempo cada corretora parou de vender — gestor: ${gestorLabel} · clique numa barra`;
      dormChartTitle = 'Tempo de Inatividade — ';
    } else {
      const nMeses = periodMonths.length;
      const activeMonthsCount = d => periodMonths.filter(i => d.m[i] > 0).length;
      if (nMeses <= 4){
        dormBucketLabels = Array.from({length:nMeses+1}, (_,i) => i===0 ? 'Não vendeu' : (i===nMeses ? (nMeses===1 ? 'Vendeu' : `Vendeu nos ${nMeses} meses`) : `${i} de ${nMeses} meses`));
        dormListsFinal = dormBucketLabels.map((_,i) => filtered.filter(d => activeMonthsCount(d) === i));
      } else {
        dormBucketLabels = ['Nenhum mês', 'Até 1/3 dos meses', 'Metade dos meses', 'Maioria dos meses', 'Todos os meses'];
        dormListsFinal = filtered.reduce((acc,d) => {
          const pct = activeMonthsCount(d) / nMeses;
          if (pct === 0) acc[0].push(d);
          else if (pct <= 0.34) acc[1].push(d);
          else if (pct <= 0.6) acc[2].push(d);
          else if (pct < 1) acc[3].push(d);
          else acc[4].push(d);
          return acc;
        }, [[],[],[],[],[]]);
      }
      document.getElementById('inatividadeSub').textContent = `Em quantos meses de ${periodLabel} cada corretora vendeu — clique numa barra`;
      dormChartTitle = `Consistência em ${periodLabel} — `;
    }
    const gradientColors = n => {
      const stops = ['#F5364A','#F26B21','#FFB81C','#84CC16','#16B87A']; // ruim -> bom
      if (n === 1) return [stops[0]];
      return Array.from({length:n}, (_,i) => {
        const t = i/(n-1);
        const pos = t*(stops.length-1);
        const lo = Math.floor(pos), hi = Math.ceil(pos), frac = pos-lo;
        const c1 = stops[lo], c2 = stops[hi];
        if (c1 === c2) return c1;
        const hex = c => [1,3,5].map(p=>parseInt(c.substr(p,2),16));
        const [r1,g1,b1] = hex(c1), [r2,g2,b2] = hex(c2);
        const mix = (a,b) => Math.round(a+(b-a)*frac);
        return `rgb(${mix(r1,r2)},${mix(g1,g2)},${mix(b1,b2)})`;
      });
    };
    const dormColors = showAbsoluteCharts ? ['#16B87A','#FFB81C','#F26B21','#F5364A','#9a3412','#cbd5e1'] : gradientColors(dormBucketLabels.length);
    charts.evolucaoAtiva = new Chart(document.getElementById('chartEvolucaoAtiva'), {
      type:'bar',
      data:{ labels: dormBucketLabels, datasets:[{ data: dormListsFinal.map(l=>l.length), backgroundColor: dormColors, borderRadius:5 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        onClick:(evt,els)=>{ if(!els||!els.length) return; const idx = els[0].index; showChartDrilldown(dormChartTitle+dormBucketLabels[idx], dormListsFinal[idx]); },
        onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
        plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{font:{size:10}}} } }
    });

    // Insights automáticos — 100% derivados dos números já calculados acima, sem texto inventado
    const insights = (window.__execInsights || []).slice();
    if (semProducao.length > 0){
      insights.push({ico:'<i class=ic-target></i>', text:`<b>${fmt0(semProducao.length)} corretoras</b> sem produção em <b>${periodLabel}</b> — potencial de <b>${fmt0(potencialSemProducao)} vidas</b> represadas.`});
    }
    if (inativas90.length > 0){
      const potInativas = inativas90.reduce((s,d)=>s+d.tot,0);
      insights.push({ico:'<i class=ic-alarm></i>', text:`<b>${fmt0(inativas90.length)} corretoras</b> estão inativas há mais de 90 dias — potencial de ${fmt0(potInativas)} vidas.`});
    }
    const byGestorSemProd = {};
    semProducao.forEach(d => { byGestorSemProd[d.g] = (byGestorSemProd[d.g]||0)+1; });
    const topGestorSemProd = Object.entries(byGestorSemProd).sort((a,b)=>b[1]-a[1])[0];
    if (topGestorSemProd && Object.keys(byGestorSemProd).length > 1){
      insights.push({ico:'<i class=ic-user></i>', text:`<b>${topGestorSemProd[0]}</b> concentra o maior número de corretoras sem produção (${topGestorSemProd[1]}).`});
    }
    if (filtered.length > 0){
      const rankCount5 = {}; filtered.forEach(d=>{ rankCount5[d.rk]=(rankCount5[d.rk]||0)+1; });
      const topRank = Object.entries(rankCount5).sort((a,b)=>b[1]-a[1])[0];
      if (topRank) insights.push({ico:'<i class=ic-trophy></i>', text:`A classificação <b>${topRank[0]}</b> concentra o maior número de corretoras (${topRank[1]} de ${filtered.length}).`});
    }
    if (insights.length === 0) insights.push({ico:'<i class=ic-check></i>', text:'Nenhum ponto crítico identificado no filtro atual.'});
    document.getElementById('insightsList').innerHTML = insights.map(i=>`<li class="insight-item"><span class="ico">${i.ico}</span><span>${i.text}</span></li>`).join('');

    destroyChart('eleg');
    charts.eleg = new Chart(document.getElementById('chartEleg'), {
      type:'doughnut',
      data:{ labels:['Elegível','Não elegível'], datasets:[{ data:[eligCount, filtered.length-eligCount], backgroundColor:['#16B87A','#cbd5e1'], borderWidth:0 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{boxWidth:12,font:{size:11}}}} }
    });

    const rankPresentBronze = RANKS_PRESENT.filter(r => r !== 'Não Classificado');
    const rankLists = rankPresentBronze.map(r => filtered.filter(d=>d.rk===r));
    const naoClassCount = filtered.filter(d=>d.rk==='Não Classificado').length;
    document.getElementById('rankNaoClassificado').textContent = `Não Classificado: ${fmt0(naoClassCount)} corretoras (${filtered.length?((naoClassCount/filtered.length*100).toFixed(1)):'0'}% da base) — fora do gráfico abaixo por volume desproporcional`;
    destroyChart('rank');
    charts.rank = new Chart(document.getElementById('chartRank'), {
      type:'bar',
      data:{ labels:rankPresentBronze, datasets:[{ data:rankLists.map(l=>l.length), backgroundColor:'#2E52D4', borderRadius:6 }] },
      options:{ responsive:true, maintainAspectRatio:false,
        onClick:(evt,els)=>{ if(!els||!els.length) return; const idx = els[0].index; showChartDrilldown('Ranking — '+rankPresentBronze[idx], rankLists[idx]); },
        onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
        plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true, grid:{color:'#eef1f6'}}, x:{grid:{display:false}, ticks:{font:{size:10}}} } }
    });

    const RANKING_MIN = 5; // abaixo disso, "Top N" não é uma comparação útil
    // Mesma regra do resto da view: com busca ou card de KPI filtrando, "Top 15" dentro de uma
    // fatia já pré-selecionada (ex.: Top 15 DENTRO de "Não Elegíveis") é redundante — a tabela
    // "Base de Corretoras" acima (já ordenável) cobre esse caso melhor.
    const isNarrowedRanking = !!(document.getElementById('fSearch').value.trim() || activeKpiFilter);
    const showRankingCharts = filtered.length >= RANKING_MIN && !isNarrowedRanking;
    document.getElementById('rankingChartsSection').style.display = showRankingCharts ? '' : 'none';
    document.getElementById('fewResultsNotice').style.display = (!showRankingCharts && !isNarrowedRanking && filtered.length > 0) ? '' : 'none';
    if (!showRankingCharts || !document.getElementById('fReact').checked) {
      document.getElementById('chartDrilldownOverlay').style.display = 'none';
    }

    if (showRankingCharts) {
      const reactOnlyMode = document.getElementById('fReact').checked;
      if (!reactOnlyMode) document.getElementById('chartDrilldownOverlay').style.display = 'none';

      if (reactOnlyMode) {
        // Modo reativação: troca os 2 gráficos por análises específicas (gestor + tempo parado)
        document.getElementById('top15Title').textContent = 'Reativação por Gestor';
        document.getElementById('top15Sub').textContent = 'Quantidade de oportunidades e potencial em vidas por gestor — clique numa barra para ver as corretoras';
        const byGestor = {};
        filtered.forEach(d => { (byGestor[d.g] = byGestor[d.g] || []).push(d); });
        const gestorNames2 = Object.keys(byGestor).sort((a,b)=>byGestor[b].length-byGestor[a].length);
        destroyChart('top15');
        charts.top15 = new Chart(document.getElementById('chartTop15'), {
          type:'bar',
          data:{ labels: gestorNames2, datasets:[{ label:'Corretoras', data: gestorNames2.map(g=>byGestor[g].length), backgroundColor: gestorNames2.map(g=>GESTOR_COLORS[g]||'#94a3b8'), borderRadius:5 }] },
          options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, onClick:(evt, els)=>{ if(!els || !els.length) return; const idx = els[0].index; setTimeout(()=>{ showChartDrilldown('Reativação — '+gestorNames2[idx], byGestor[gestorNames2[idx]]); }, 0); }, onHover:(evt,els)=>{ if(evt && evt.native && evt.native.target) evt.native.target.style.cursor = (els && els.length) ? 'pointer' : 'default'; }, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{
              const g = c.label; const vidas = fmt0((byGestor[g]||[]).reduce((s,d)=>s+d.tot,0));
              return [`${c.raw} corretora(s)`, `${vidas} vidas em potencial`, 'Clique para ver a lista'];
            }}}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{stepSize:1}}, y:{grid:{display:false}} } }
        });

        document.getElementById('reactChartTitle').textContent = 'Tempo desde a Última Venda';
        document.getElementById('reactSub').textContent = 'Quanto mais recente a queda, mais fácil a reativação — clique numa barra para ver as corretoras';
        const byDormancy = {}; DORMANCY_ORDER.forEach(b=>byDormancy[b]=[]);
        filtered.forEach(d => { byDormancy[dormancyBucket(monthsSinceLastSale(d))].push(d); });
        destroyChart('react');
        const reactCanvas = document.getElementById('chartReact');
        const reactEmpty = document.getElementById('reactEmptyState');
        reactCanvas.style.visibility = 'visible';
        reactEmpty.style.display = 'none';
        charts.react = new Chart(reactCanvas, {
          type:'bar',
          data:{ labels: DORMANCY_ORDER, datasets:[{ label:'Corretoras', data: DORMANCY_ORDER.map(b=>byDormancy[b].length), backgroundColor: ['#FFB81C','#F26B21','#F5364A','#9a3412'], borderRadius:5 }] },
          options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, onClick:(evt, els)=>{ if(!els || !els.length) return; const idx = els[0].index; setTimeout(()=>{ const b = DORMANCY_ORDER[idx]; showChartDrilldown('Parado há '+b, byDormancy[b]); }, 0); }, onHover:(evt,els)=>{ if(evt && evt.native && evt.native.target) evt.native.target.style.cursor = (els && els.length) ? 'pointer' : 'default'; }, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{
              const b = c.label; const vidas = fmt0((byDormancy[b]||[]).reduce((s,d)=>s+d.tot,0));
              return [`${c.raw} corretora(s)`, `${vidas} vidas em potencial`, 'Clique para ver a lista'];
            }}}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{stepSize:1}}, y:{grid:{display:false}} } }
        });

      } else {
        const periodMonthsTop15 = getPeriodMonths();
        let top15Label = 'Total 17 Meses';
        let top15Value = d => d.tot;
        if (periodMonthsTop15){
          const periodValueIdxTop15 = Number(document.getElementById('fPeriodValue').value);
          const periodTypeTop15 = document.getElementById('fPeriodType').value;
          top15Label = (PERIOD_DEFS[periodTypeTop15][periodValueIdxTop15] || {}).label || '';
          top15Value = d => computePeriodElegRank(d, periodMonthsTop15).periodTotal;
        }
        document.getElementById('top15Sub').textContent = periodMonthsTop15 ? `Maiores produtoras no período selecionado (${top15Label})` : 'Maiores produtoras acumuladas no período (filtro atual)';
        document.getElementById('reactSub').textContent = 'Maior potencial histórico, zero produção nos últimos 3 meses';

        const top15 = [...filtered].sort((a,b)=>top15Value(b)-top15Value(a)).slice(0,15);
        document.getElementById('top15Title').textContent = `Top ${top15.length} Corretoras — ${top15Label}`;
        destroyChart('top15');
        charts.top15 = new Chart(document.getElementById('chartTop15'), {
          type:'bar',
          data:{ labels: top15.map(d=>d.n.length>28?d.n.slice(0,28)+'…':d.n), datasets:[{ data: top15.map(top15Value), backgroundColor:'#101E63', borderRadius:5 }] },
          options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{font:{size:10}}} } }
        });

        const topReact = [...reactListEffective].sort((a,b)=>b.tot-a.tot).slice(0,15);
        document.getElementById('reactChartTitle').textContent = topReact.length ? `Top ${topReact.length} Oportunidades de Reativação` : 'Oportunidades de Reativação';
        document.getElementById('reactSub').textContent = showAbsoluteCharts ? 'Maior potencial histórico, zero produção nos últimos 3 meses' : `Vendia antes, zerou em ${periodLabel} — ordenado pelo histórico total`;
        destroyChart('react');
        const reactCanvas = document.getElementById('chartReact');
        const reactEmpty = document.getElementById('reactEmptyState');
        if (topReact.length === 0) {
          reactCanvas.style.visibility = 'hidden';
          reactEmpty.textContent = 'Nenhuma oportunidade de reativação dentro deste filtro.';
          reactEmpty.style.display = 'flex';
        } else {
          reactCanvas.style.visibility = 'visible';
          reactEmpty.style.display = 'none';
          charts.react = new Chart(reactCanvas, {
            type:'bar',
            data:{ labels: topReact.map(d=>d.n.length>28?d.n.slice(0,28)+'…':d.n), datasets:[{ data: topReact.map(d=>d.tot), backgroundColor:'#F26B21', borderRadius:5 }] },
            options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{font:{size:10}}} } }
          });
        }
      }
    } else {
      destroyChart('top15');
      destroyChart('react');
      if (filtered.length >= 1) {
        const top = [...filtered].sort((a,b)=>b.tot-a.tot)[0];
        showDetail(top.c, {scroll:false});
      } else {
        document.getElementById('detailPanel').classList.remove('show');
      }
    }

    // Título da tabela reflete o filtro ativo — sem isso "Base de Corretoras" ficava genérico
    // mesmo com o card "Não Elegíveis" (ou busca/gestor) filtrando a tela inteira, dando a
    // impressão de que a tabela ainda mostrava tudo.
    const kpiFilterLabels = { eleg:'Elegíveis', quase:'Quase Elegíveis (76–99%)', risco:'Em Risco', distantes:'Não Elegíveis' };
    const titleParts = [];
    if (activeKpiFilter) titleParts.push(kpiFilterLabels[activeKpiFilter] || activeKpiFilter);
    if (selectedGestores.size === 1) titleParts.push(shortGestor([...selectedGestores][0]));
    else if (selectedGestores.size > 1) titleParts.push(selectedGestores.size + ' gestores');
    const searchQTable = document.getElementById('fSearch').value.trim();
    document.getElementById('baseCorretorasTitle').textContent = titleParts.length ? `Corretoras ${titleParts.join(' · ')}` : 'Base de Corretoras';
    document.getElementById('baseCorretorasSub').textContent = searchQTable
      ? `Resultado da busca por "${searchQTable}" · Clique em uma linha para ver a evolução mensal`
      : 'Clique em uma linha para ver a evolução mensal · Clique no cabeçalho para ordenar';

    renderTable(filtered);
  }

  function renderTable(filtered){
    // "Total 17M" ficou travado desse texto desde quando só existia a Cauda Longa (histórico
    // desde o ano passado) — achado 2026-10-01, Victor: as outras 3 equipes só têm 9 meses, e a
    // própria Cauda Longa já passou dos 17 há tempo. Usa o tamanho real do histórico (igual ao
    // resto da tela já faz com "N MESES TOTAIS" na importação), não mais um número fixo.
    const totMesesEl = document.getElementById('thTotMeses');
    if (totMesesEl && DATA.length && DATA[0].m) totMesesEl.textContent = `Total ${DATA[0].m.length}M`;
    const sorted = [...filtered].sort((a,b)=>{
      let av=a[sortKey], bv=b[sortKey];
      if (typeof av === 'string') return sortDir * av.localeCompare(bv);
      return sortDir * (av-bv);
    });
    const totalPages = Math.max(1, Math.ceil(sorted.length/perPage));
    if (page>totalPages) page = totalPages;
    const pageRows = sorted.slice((page-1)*perPage, page*perPage);

    const isLatestMonthModeHeader = (window.getCurrentMonth ? window.getCurrentMonth() : null) === (window.getLatestKnownMonth ? window.getLatestKnownMonth() : null);
    const curMonthAbbrHeader = (() => { const ym = window.getCurrentMonth ? window.getCurrentMonth() : ''; return MONTH_ABBR_PT[ym.split('-')[1]] || ym; })();
    const periodTypeHeader = document.getElementById('fPeriodType').value;
    const periodMonthsHeader = getPeriodMonths();
    if (periodMonthsHeader){
      const periodValueIdx = Number(document.getElementById('fPeriodValue').value);
      const periodLabelHeader = (PERIOD_DEFS[periodTypeHeader][periodValueIdx] || {}).label || '';
      document.getElementById('thAtual').textContent = periodLabelHeader;
      document.getElementById('thMeta').textContent = 'Meta ' + periodLabelHeader;
    } else {
      document.getElementById('thAtual').textContent = isLatestMonthModeHeader ? curMonthAbbrHeader : '2TRI26 Atual';
      document.getElementById('thMeta').textContent = isLatestMonthModeHeader ? ('Meta ' + curMonthAbbrHeader) : 'Meta 2TRI26';
    }
    document.getElementById('elTableBody').innerHTML = pageRows.map(d => {
      const react = isReactivation(d);
      const statusTag = react ? `<span class="tag react">Reativação</span>` : (d.el===1 ? `<span class="tag elig">Elegível</span>` : `<span class="tag noelig">—</span>`);
      const periodMonthsRow = getPeriodMonths();
      const idxsRow = periodMonthsRow || Array.from({length:d.m.length}, (_,i)=>i);
      const catInd = d.mc ? idxsRow.reduce((s,i)=>s+(d.mc.pf[i]||0),0) : 0;
      const catSs = d.mc ? idxsRow.reduce((s,i)=>s+(d.mc.ss[i]||0),0) : 0;
      const catPme = d.mc ? idxsRow.reduce((s,i)=>s+(d.mc.pme[i]||0),0) : 0;
      const catTotal = catInd + catSs + catPme;
      const periodCalc = periodMonthsRow ? computePeriodElegRank(d, periodMonthsRow) : null;
      const isLatestMonthModeRow = (window.getCurrentMonth ? window.getCurrentMonth() : null) === (window.getLatestKnownMonth ? window.getLatestKnownMonth() : null);
      const atualRow = periodCalc ? periodCalc.periodTotal : (isLatestMonthModeRow ? (d.m[d.m.length-1]||0) : d.t2);
      const metaRow = periodCalc ? periodCalc.meta : (isLatestMonthModeRow ? (d.meta3tri||0) : d.meta);
      const gapRow = atualRow - metaRow;
      const elRow = periodCalc ? periodCalc.el : d.el;
      const rkRow = periodCalc ? periodCalc.rk : d.rk;
      return `<tr class="clickable" data-c="${d.c}">
        <td style="color:var(--muted); font-size:11.5px;">${d.c}</td>
        <td class="name">${d.n}</td>
        <td>${d.g.replace(' Sakamoto','').replace(' Monks','').replace(' Leal','').replace(' Amora','')}</td>
        <td>${rkRow}</td>
        <td>${elRow===1?'<span class="tag elig">Elegível</span>':'<span class="tag noelig">Não elegível</span>'}</td>
        <td class="num">${fmt0(catInd)}</td>
        <td class="num">${fmt0(catSs)}</td>
        <td class="num">${fmt0(catPme)}</td>
        <td class="num"><b>${fmt0(catTotal)}</b></td>
        <td class="num">${fmt0(d.tot)}</td>
        <td class="num">${fmt0(atualRow)}</td>
        <td class="num">${fmt0(metaRow)}</td>
        <td class="num" style="color:${gapRow>=0?'#16B87A':'#F5364A'}">${gapRow>=0?'+':''}${fmt0(gapRow)}</td>
        <td class="num">${fmt0(d.u3)}</td>
        <td>${statusTag}</td>
      </tr>`;
    }).join('');

    document.getElementById('pageInfo').textContent = `Página ${page} de ${totalPages} (${sorted.length} resultados)`;
    document.getElementById('btnPrev').disabled = page<=1;
    document.getElementById('btnNext').disabled = page>=totalPages;

    document.querySelectorAll('#elTableBody tr').forEach(tr=>{
      window.__kb(tr).addEventListener('click', ()=>{
        document.querySelectorAll('#elTableBody tr').forEach(r=>r.classList.remove('selected'));
        tr.classList.add('selected');
        showDetail(tr.dataset.c);
      });
    });
  }

  function showDetail(codigo, opts){
    opts = opts || {scroll:true};
    const d = scopedData().find(x=>x.c===codigo);
    if(!d) return;
    // O painel de detalhe é um único elemento reaproveitado por todo mundo que chama
    // showDetail (tabela, assessoria, ranking...). Por padrão ele mora no lugar de sempre
    // (marcado por #detailPanelAnchor); quando vem de um card de "Resultado da busca"
    // (opts.attachTo), move ele pra dentro do card, dando o efeito de acordeão pedido.
    const panelEl = document.getElementById('detailPanel');
    if (opts.attachTo) opts.attachTo.appendChild(panelEl);
    else document.getElementById('detailPanelAnchor').insertAdjacentElement('afterend', panelEl);
    panelEl.classList.add('show');
    document.getElementById('detailName').textContent = d.n;

    // Aviso de "duas contagens diferentes": muitas assessorias têm uma corretora "matriz" com
    // o mesmo nome da própria assessoria (ex.: "L & R CORRETORA DE PLANOS DE SAUDE LTDA" é ao
    // mesmo tempo o nome de uma assessoria com várias corretoras vinculadas E de uma corretora
    // individual, sem nenhum vínculo — os dois são registros separados em DATA). Detecta isso
    // direto pelos dados (não só quando o clique vem da tabela da assessoria), porque dá pra
    // chegar nessa corretora também pela busca normal em "Corretoras" — o mesmo risco de confundir
    // "esta corretora" com "o agregado da assessoria" existe nos dois casos.
    const noteEl = document.getElementById('detailAssessoriaNote');
    const nomeUp = String(d.n).trim().toUpperCase();
    const membrosAssessoria = scopedData().filter(x => x.ass && String(x.ass).trim().toUpperCase() === nomeUp);
    if (membrosAssessoria.length){
      const totalMembros = membrosAssessoria.reduce((s,x)=>s+(x.tot||0),0);
      noteEl.style.display = '';
      noteEl.textContent = `⚠️ Atenção: existe uma assessoria com esse mesmo nome, agregando ${membrosAssessoria.length} corretora${membrosAssessoria.length!==1?'s':''} vinculada${membrosAssessoria.length!==1?'s':''} (${fmt0(totalMembros)} vidas no total 17M somadas entre elas) — os números abaixo são só desta corretora (código ${d.c}), não esse agregado. Veja o agregado em Elegibilidade → Assessorias.`;
    } else if (opts.fromAssessoria){
      noteEl.style.display = '';
      noteEl.textContent = `Você está vendo só os dados desta corretora (código ${d.c}), vinculada à assessoria "${opts.fromAssessoria}" — não o total agregado da assessoria.`;
    } else {
      noteEl.style.display = 'none';
    }

    // Painel deve refletir o período selecionado no filtro (Ano/Semestre/Trimestre/Mensal),
    // não sempre o ciclo oficial 2TRI26 — usa o mesmo helper que o resto da view já usa.
    const periodMonths = getPeriodMonths();
    const periodType = document.getElementById('fPeriodType').value;
    const periodIdx = Number(document.getElementById('fPeriodValue').value);
    const periodLabel = periodMonths ? ((PERIOD_DEFS[periodType][periodIdx]||{}).label || 'período') : '2TRI26';
    const calc = periodMonths ? computePeriodElegRank(d, periodMonths) : null;
    const curTotal = calc ? calc.periodTotal : d.t2;
    const curMeta = calc ? calc.meta : d.meta;
    const curGap = curTotal - curMeta;
    const curRank = calc ? calc.rk : d.rk;

    // Números do período EXATO selecionado (ex.: só Setembro, se Mensal/Setembro foi o que o
    // usuário filtrou) — usados SÓ nos cards "Atual/Meta/Gap" abaixo, rotulados com esse mesmo
    // período (periodLabel). curTotal/curMeta/curRank (acima) continuam os OFICIAIS (por
    // trimestre, quando aplicável) — usados pela Elegibilidade e pelo "faltam X vidas pra
    // alcançar <faixa>" logo abaixo, que respondem uma pergunta diferente ("está elegível pela
    // regra oficial, sempre trimestral") da que os cards respondem ("quanto vendeu NESSE
    // período"). Achado real 2026-09-30 (Victor, corretora QUALI PLANOS) — ver comentário em
    // computePeriodElegRank.
    const dispTotal = calc ? calc.displayTotal : d.t2;
    const dispMeta = calc ? calc.displayMeta : d.meta;
    const dispGap = dispTotal - dispMeta;

    document.getElementById('detailMeta').textContent = `Código ${d.c} · Gestor: ${d.g} · Grade: ${d.gr || '—'} · Ranking: ${curRank}`;
    document.getElementById('dT2Label').textContent = periodLabel;
    document.getElementById('dMetaLabel').textContent = periodLabel;
    document.getElementById('dGapLabel').textContent = periodLabel;
    document.getElementById('dTot').textContent = fmt0(d.tot);
    document.getElementById('dT2').textContent = fmt0(dispTotal);
    document.getElementById('dMeta').textContent = fmt0(dispMeta);
    document.getElementById('dGap').textContent = (dispGap>=0?'+':'')+fmt0(dispGap);
    document.getElementById('dPico').textContent = fmt0(d.pico);
    document.getElementById('dU3').textContent = fmt0(d.u3);

    // Análise de elegibilidade da corretora nesse período — pedido do Victor: além dos
    // números crus, deixar claro se está elegível e, se não, quanto falta e o quão perto
    // está. Usa a mesma régua (76%/51%/26%) já usada nos cards "Quase Elegíveis"/"Não
    // Elegíveis" lá em cima (faixaIdx), pra ficar consistente com o resto da tela.
    const elegEl = document.getElementById('detailElegStatus');
    const isElig = calc ? calc.el === 1 : d.el === 1;
    const pctMeta = curMeta > 0 ? (curTotal / curMeta * 100) : null;
    // Quando o período selecionado é o "vigente" (ex.: Mensal/Setembro sendo o mês mais
    // recente), os números usados aqui (curTotal/curMeta) são os do TRIMESTRE oficial, não os do
    // mês sozinho mostrado nos cards acima — nota curta pra não parecer contradição entre os dois
    // (achado 2026-09-30, mesmo contexto do comentário em computePeriodElegRank).
    const eligOficialNote = (calc && calc.isCurrentPeriod) ? ' <span style="font-weight:400; opacity:.75;">(regra oficial — sempre por trimestre)</span>' : '';
    if (isElig){
      elegEl.style.background = 'rgba(22,184,122,.10)';
      elegEl.style.border = '1px solid rgba(22,184,122,.3)';
      elegEl.style.color = '#0f6b4f';
      elegEl.innerHTML = `<i class=ic-check></i> <b>Elegível</b>${eligOficialNote}` + (pctMeta!==null
        ? ` — ${fmt0(curTotal)} de ${fmt0(curMeta)} vidas necessárias (${pctMeta.toFixed(0)}% da meta)${curGap>0?', +'+fmt0(curGap)+' acima do mínimo':''}.`
        : ' — sem meta cadastrada pro período (coluna oficial da planilha).');
    } else if (pctMeta !== null){
      const faltam = curMeta - curTotal;
      const tom = pctMeta >= 76 ? 'quase lá — bem perto de virar elegível'
        : pctMeta >= 51 ? 'esforço médio pela frente'
        : pctMeta >= 26 ? 'ainda bem distante da meta'
        : 'muito distante da meta — foco em reativação estrutural';
      elegEl.style.background = 'rgba(245,54,74,.08)';
      elegEl.style.border = '1px solid rgba(245,54,74,.3)';
      elegEl.style.color = '#b91c1c';
      elegEl.innerHTML = `<i class=ic-alarm></i> <b>Não elegível</b>${eligOficialNote} — faltam <b>${fmt0(faltam)} vidas</b> (está em <b>${pctMeta.toFixed(0)}%</b> da meta) para virar elegível · ${tom}.`;
    } else {
      elegEl.style.background = '#f1f5f9';
      elegEl.style.border = '1px solid var(--line)';
      elegEl.style.color = 'var(--muted)';
      elegEl.innerHTML = `<i class=ic-bulb></i> Sem meta cadastrada pra esse período (sem histórico suficiente) — não dá pra calcular a elegibilidade aqui.`;
    }

    // BUG corrigido 2026-09-30 (Victor, urgente, print real de "QUALY VITTA"/Ranking Ouro
    // mostrando "falta pra Bronze 6"): esse trecho usava uma tabela própria, incompleta e
    // desatualizada (RANK_THRESHOLDS_EST, só Bronze 1-6, nome de "estimativa" porque tinha sido
    // copiada à mão e nunca acompanhou a era nova) — quando o ranking atual nem existia nela
    // (Prata/Ouro/Diamante/Safira), o índice não-encontrado (-1) caía no ramo "curIdx>0 ? ... :
    // ÚLTIMO item da lista", ou seja, sempre "Bronze 6" pra qualquer corretora acima de Bronze,
    // disfarçado de mensagem específica. Corrigido reaproveitando a MESMA tabela real usada pra
    // calcular o ranking em si (RANK_THRESHOLDS_NEW/OLD, já com Safira/Diamante/Ouro/Prata/
    // Bronze — ver computeRankingFromVolume), ordenada do maior pro menor: a próxima faixa é
    // sempre a posição anterior no array, não mais uma tabela paralela que podia divergir.
    const rankTable = (periodMonths && isNewEra(periodMonths)) ? RANK_THRESHOLDS_NEW : RANK_THRESHOLDS_OLD;
    const rgEl = document.getElementById('detailRankGap');
    const curRankIdx = rankTable.findIndex(t => t.label === curRank);
    if (curRankIdx === 0){
      rgEl.innerHTML = `<i class=ic-award></i> Já está na faixa máxima (${curRank}).`;
    } else {
      // curRankIdx === -1 (ex.: "Não Classificado") cai no mesmo "senão" abaixo — a próxima
      // faixa alcançável é a última da tabela (a mais baixa), não um caso especial à parte.
      const nextTier = curRankIdx > 0 ? rankTable[curRankIdx-1] : rankTable[rankTable.length-1];
      const falta = Math.max(0, nextTier.min - curTotal);
      const pct = nextTier.min ? Math.min(100, curTotal/nextTier.min*100) : 0;
      rgEl.innerHTML = falta > 0
        ? `<i class=ic-chart></i> Faltam <b>${fmt0(falta)} vidas</b> (está em <b>${pct.toFixed(0)}%</b>) para alcançar <b>${nextTier.label}</b>`
        : `<i class=ic-trophy></i> Volume já suficiente para <b>${nextTier.label}</b> — classificação deve atualizar no próximo fechamento`;
    }

    const cq = computeConquista(d);
    const detailConquistaEl = document.getElementById('detailConquista');
    if (!cq){
      detailConquistaEl.style.display = 'none';
    } else {
      detailConquistaEl.style.display = '';
      document.getElementById('cqPeriodo').textContent = cq.campaignLabel;
      document.getElementById('cqBadge').textContent = cq.label + ' · ' + cq.regiao;
      document.getElementById('cqRate').textContent = 'R$ ' + fmt0(cq.rate) + '/vida';
      document.getElementById('cqVidas').textContent = fmt0(cq.total);
      document.getElementById('cqBonusFull').textContent = 'R$ ' + fmt0(cq.bonusFull);
      document.getElementById('cqBonusExec').textContent = 'R$ ' + fmt0(cq.bonusExec);
      const cqProgressWrap = document.getElementById('cqProgressWrap');
      const cqBar = document.getElementById('cqProgressBar');
      const cqText = document.getElementById('cqProgressText');
      if (cq.isTop){
        cqProgressWrap.style.display = 'none';
      } else {
        cqProgressWrap.style.display = '';
        cqBar.style.width = cq.pct.toFixed(0) + '%';
        cqText.innerHTML = `Faltam <b>${fmt0(cq.faltam)} vidas</b> (está em <b>${cq.pct.toFixed(0)}%</b>) para virar <b>${cq.nextLabel}</b> — R$ ${fmt0(cq.rate)}/vida → R$ ${fmt0(cq.nextRate)}/vida`;
      }
      document.getElementById('cqSuggestion').textContent = conquistaSuggestion(cq);

      const renderConquistaSim = vidas => {
        const sim = conquistaTierLookup(cq.table, vidas);
        document.getElementById('cqSimVidas').textContent = fmt0(vidas) + ' vidas (simulado)';
        document.getElementById('cqSimBadge').textContent = sim.label;
        document.getElementById('cqSimRate').textContent = 'R$ ' + fmt0(sim.rate);
        document.getElementById('cqSimBonusFull').textContent = 'R$ ' + fmt0(sim.bonusFull);
        document.getElementById('cqSimBonusExec').textContent = 'R$ ' + fmt0(sim.bonusExec);
      };
      const cqSlider = document.getElementById('cqSimSlider');
      const cqSliderMax = Math.max(cq.table[cq.table.length-1].min, Math.ceil(cq.total * 1.1), 100);
      cqSlider.min = 0;
      cqSlider.max = cqSliderMax;
      cqSlider.value = cq.total;
      document.getElementById('cqSimMax').textContent = fmt0(cqSliderMax) + ' vidas';
      renderConquistaSim(cq.total);
      cqSlider.oninput = () => renderConquistaSim(Number(cqSlider.value));
    }

    if (d.mc){
      const periodMonths = getPeriodMonths();
      const idxs = periodMonths || Array.from({length:d.m.length}, (_,i)=>i);
      const sumPf = idxs.reduce((s,i)=>s+(d.mc.pf[i]||0), 0);
      const sumSs = idxs.reduce((s,i)=>s+(d.mc.ss[i]||0), 0);
      const sumPme = idxs.reduce((s,i)=>s+(d.mc.pme[i]||0), 0);
      document.getElementById('dCatInd').textContent = fmt0(sumPf);
      document.getElementById('dCatSs').textContent = fmt0(sumSs);
      document.getElementById('dCatPme').textContent = fmt0(sumPme);
      document.getElementById('detailCatStats').style.display = '';
    } else {
      document.getElementById('detailCatStats').style.display = 'none';
    }

    destroyChart('detail');
    charts.detail = new Chart(document.getElementById('chartDetail'), {
      type:'line',
      data:{ labels: MONTH_LABELS, datasets:[{ data:d.m, borderColor:'#2E52D4', backgroundColor:'rgba(37,99,235,.1)', fill:true, tension:.25, pointRadius:2 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true, grid:{color:'#eef1f6'}}, x:{grid:{display:false}, ticks:{font:{size:9}}} } }
    });
    if (opts.scroll) document.getElementById('detailPanel').scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  document.getElementById('detailClose').addEventListener('click', ()=>{ document.getElementById('detailPanel').classList.remove('show'); });

  // Escopado a #baseCorretorasWrap: o seletor 'thead th[data-k]' sem escopo também batia nos
  // cabeçalhos ordenáveis do modal de Pendências (mesmo padrão data-k reaproveitado ali), fazendo
  // os dois handlers dispararem no mesmo clique e brigarem pelo atributo data-dir.
  document.querySelectorAll('#baseCorretorasWrap thead th[data-k]').forEach(th=>{
    window.__kb(th).addEventListener('click', ()=>{
      const k = th.dataset.k;
      if (sortKey===k){ sortDir *= -1; } else { sortKey=k; sortDir = (k==='n'||k==='g'||k==='rk'||k==='el') ? 1 : -1; }
      document.querySelectorAll('#baseCorretorasWrap thead th[data-k]').forEach(h=>{ h.classList.remove('sorted'); h.removeAttribute('data-dir'); });
      th.classList.add('sorted');
      th.setAttribute('data-dir', sortDir > 0 ? 'asc' : 'desc');
      page = 1;
      renderTable(applyFilters());
    });
  });

  ['fEleg','fRank'].forEach(id=>document.getElementById(id).addEventListener('change', ()=>{ page=1; renderActive(); }));
  document.getElementById('fSearch').addEventListener('input', window.debounce(()=>{ page=1; renderActive(); }, 250));
  document.getElementById('fReact').addEventListener('change', ()=>{ page=1; renderActive(); });
  document.getElementById('btnReset').addEventListener('click', ()=>{
    setSelectedGestores([]); document.getElementById('fEleg').value=''; selRank.value='';
    document.getElementById('fSearch').value=''; document.getElementById('fReact').checked=false;
    activeKpiFilter = null;
    page=1; renderActive();
  });
  document.getElementById('btnPrev').addEventListener('click', ()=>{ if(page>1){page--; renderTable(applyFilters());} });
  document.getElementById('btnNext').addEventListener('click', ()=>{ page++; renderTable(applyFilters()); });

  // Conquista Premiada só faz sentido pra um trimestre específico (ver getConquistaPeriod) —
  // o botão que abre a visão geral da campanha some fora dessa seleção.
  function updateConquistaAvailability(){
    document.getElementById('btnOpenConquista').style.display = getConquistaPeriod() ? '' : 'none';
  }
  // Selects "De"/"Até" do intervalo personalizado — populados uma vez com todos os meses
  // conhecidos. Padrão: últimos 12 meses (ajustável), só pra começar com algo razoável.
  // Pra uma equipe escopada com histórico mais curto (eligDataStartIdx > 0), nem oferece os
  // meses anteriores — são zero-padding, não meses reais dela (ver comentário em eligDataStartIdx).
  (function initCustomRangeSelects(){
    const opts = MONTH_LABELS
      .map((label,i) => ({i, label}))
      .filter(x => x.i >= eligDataStartIdx)
      .map(x => `<option value="${x.i}">${x.label}</option>`).join('');
    document.getElementById('fCustomFrom').innerHTML = opts;
    document.getElementById('fCustomTo').innerHTML = opts;
    document.getElementById('fCustomFrom').value = String(Math.max(eligDataStartIdx, MONTH_LABELS.length - 12));
    document.getElementById('fCustomTo').value = String(MONTH_LABELS.length - 1);
  })();
  populatePeriodValue(true);
  updateConquistaAvailability();
  document.getElementById('fPeriodType').addEventListener('change', ()=>{ populatePeriodValue(true); renderActive(); updateConquistaAvailability(); });
  document.getElementById('fPeriodValue').addEventListener('change', ()=>{ renderActive(); updateConquistaAvailability(); });
  document.getElementById('fCustomFrom').addEventListener('change', ()=>{ rebuildCustomPeriod(); renderActive(); updateConquistaAvailability(); });
  document.getElementById('fCustomTo').addEventListener('change', ()=>{ rebuildCustomPeriod(); renderActive(); updateConquistaAvailability(); });

  // ===================== RANKING DE VENDAS =====================
  const rkFmt = n => Math.round(n).toLocaleString('pt-BR');
  const rkShortName = s => { s=String(s); return s.length>26 ? s.slice(0,24)+'…' : s; };
  const rkShortGestor = g => { const p=String(g).trim().split(/\s+/); return p.length>1 ? p[0]+' '+p[p.length-1] : g; };
  let rankSeeAllOn = false;
  let rankPopulated = false;

  function rankPopulateGestores(){
    const eq = document.getElementById('rankEquipe').value;
    const gSel = document.getElementById('rankGestor');
    const prev = gSel.value;
    // Gestores restritos à equipe escolhida (ou todos, se nenhuma)
    const pool = eq ? RANKDATA.filter(r => r.e === eq) : RANKDATA;
    const gestores = [...new Set(pool.map(r=>r.g).filter(Boolean))].sort();
    gSel.innerHTML = '<option value="">Todos os gestores</option>' + gestores.map(g=>`<option value="${g}">${rkShortGestor(g)}</option>`).join('');
    // Preserva o gestor se ainda pertence à equipe; senão volta a "Todos"
    gSel.value = gestores.includes(prev) ? prev : '';
  }

  function rankPopulateFilters(){
    const eqSel = document.getElementById('rankEquipe');
    const equipes = [...new Set(RANKDATA.map(r=>r.e).filter(e=>e && e!=='—'))].sort();
    eqSel.innerHTML = '<option value="">Todas as equipes (SP)</option>' + equipes.map(e=>`<option value="${e}">${e}</option>`).join('');
    rankPopulateGestores();
    // Rótulos de mês (rankMonthsLabel/rankPodiumMonth/rankThCur/rankThPrev) NÃO ficam mais
    // aqui — isso só roda uma vez por import (rankPopulated), mas o "Mês de Referência" pode
    // mudar sem reimportar nada, então os rótulos precisam ser recalculados em TODO render
    // (ver renderRanking, curLabel/prevLabel via rankCurLabel()/rankPrevLabel()).
    rankPopulated = true;
  }

  // Linhas do ranking do mês selecionado. Mês RECONSTRUÍDO (Jan–Mai, sem histórico gravado em
  // RANKDATA.m/mc — o painel só guarda esse histórico a partir de 04/09) vem do módulo "Metas por
  // executivo" (extratos do BI + Carteira atual); qualquer outro mês usa RANKDATA como sempre.
  // Também cobre mês com fechamento oficial mas SEM histórico no RANKDATA (ex.: Junho — o painel só
  // começou a guardar m/mc em 04/09): usa o extrato do BI embutido em vez de mostrar a tela vazia.
  let rankUsingSynth = false, rankSynthHasPrev = true;
  // Mesmo gestor com o nome em convenções diferentes ("Pablo Amora" x "PABLO SERGIO RIBEIRO AMORA"):
  // as palavras do nome curto estão todas no nome longo.
  const rkNormG = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  const rkSameG = (a, b) => {
    const A = rkNormG(a), B = rkNormG(b);
    if (!A || !B) return false;
    if (A === B) return true;
    const stop = new Set(['DE','DA','DO','DOS','DAS']);
    const ta = A.split(' ').filter(t => !stop.has(t)), tb = B.split(' ').filter(t => !stop.has(t));
    const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    return small.length >= 2 && small.every(t => big.includes(t));
  };
  function rankSourceRows(){
    rankUsingSynth = false;
    const mo = window.getCurrentMonth ? window.getCurrentMonth() : null;
    if (mo && window.rankSynthRows && !rankIsLatestMonth()){
      const idx = rankMonthIndexOf(mo);
      const synth = window.rankSynthRows(mo);
      if (synth){
        // RANKDATA só guarda o histórico mensal desde 04/09: se o mês não está lá (ou está
        // incompleto — menos de 90% do que o extrato do BI tem), usa o extrato embutido.
        const have = RANKDATA.reduce((s, r) => s + ((r.m && r.m[idx]) || 0), 0);
        const need = synth.reduce((s, r) => s + r.cur, 0);
        // Filtro por segmento (Individual/PIM/Middle/ADM) precisa do mix do mês: se o RANKDATA só
        // tem o total daquele mês (caso do mês anterior de um import), o segmento daria tudo zero.
        const segEl = document.getElementById('rankSeg');
        const segAtivo = segEl && segEl.value && segEl.value !== 't';
        const temMix = RANKDATA.some(r => r.mc && ['ind','pim','mid','adm'].some(k => r.mc[k] && r.mc[k][idx] > 0));
        if (have < need * 0.9 || (segAtivo && !temMix)){
          rankUsingSynth = true; rankSynthHasPrev = synth.hasPrev !== false;
          // Gestor/equipe no MESMO formato das linhas do RANKDATA (senão os filtros de equipe/gestor,
          // montados a partir do RANKDATA, não acham as linhas reconstruídas).
          const gSet = [...new Set(RANKDATA.map(r => r.g).filter(g => g && g !== '#N/D'))];
          const eByG = {}; RANKDATA.forEach(r => { if (r.g && r.e && r.e !== '—' && !eByG[r.g]) eByG[r.g] = r.e; });
          const GE = window.GESTOR_EQUIPE || {}, geKeys = Object.keys(GE), memo = {};
          const resolve = f => memo[f] || (memo[f] = (() => {
            const g = gSet.find(x => rkSameG(f, x)) || geKeys.find(x => rkSameG(f, x)) || f;
            return { g, e: eByG[g] || GE[g] || GE[geKeys.find(x => rkSameG(f, x))] || '—' };
          })());
          return synth.map(r => { const x = resolve(r.g); return { ...r, g: x.g, e: x.e }; });
        }
      }
    }
    return RANKDATA;
  }
  function rankApplyFilters(){
    const eq = document.getElementById('rankEquipe').value;
    const g = document.getElementById('rankGestor').value;
    const seg = document.getElementById('rankSeg').value;
    const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const q = norm(document.getElementById('rankSearch').value);
    return rankSourceRows().map(r => {
      // valor conforme segmento escolhido E o "Mês de Referência" selecionado (rankValueForMonth
      // busca no histórico m[]/mc[] quando não é o mês mais recente — ver comentário lá)
      const v = rankValueForMonth(r, seg);
      return { ...r, _cur: v.cur, _prev: v.prev };
    }).filter(r => {
      if (eq && r.e !== eq) return false;
      if (g && r.g !== g) return false;
      if (q && !(norm(r.n).includes(q) || norm(r.c).includes(q))) return false;
      // Corretora sem venda nenhuma (cur e prev zerados) some da lista por padrão — faz
      // sentido, "Ranking de Vendas" é ranking de quem vendeu. Mas quando a linha só existe
      // porque updateRankingData a injetou por ter proposta real em aberto no Planium (ver
      // comentário lá — caso F8), uma busca ativa por ela (nome ou código) deve continuar
      // achando, senão a única forma de abrir "Propostas desta corretora" fica inacessível
      // de novo — o problema original que essa injeção tenta resolver.
      if (!q && r._cur <= 0 && r._prev <= 0) return false;
      return true;
    });
  }

  function renderRanking(){
    if (!rankPopulated) rankPopulateFilters();
    const seg = document.getElementById('rankSeg').value;
    const rows = rankApplyFilters().sort((a,b)=> b._cur - a._cur);
    const totalCur = rows.reduce((s,r)=>s+r._cur,0);
    const totalPrev = rows.reduce((s,r)=>s+r._prev,0);
    const ativas = rows.filter(r=>r._cur>0).length;
    const ticket = ativas ? totalCur/ativas : 0;
    const top10 = rows.slice(0,10).reduce((s,r)=>s+r._cur,0);
    const conc = totalCur ? top10/totalCur*100 : 0;
    const deltaTot = totalPrev>0 ? ((totalCur-totalPrev)/totalPrev*100) : null;

    // Rótulos do mês selecionado (não necessariamente o último importado — ver
    // rankCurLabel/rankPrevLabel/rankIsLatestMonth). Recalculados em TODO render porque o
    // "Mês de Referência" pode mudar sem reimportar nada.
    const curLabel = rankCurLabel(), prevLabel = rankPrevLabel();
    document.getElementById('rankMonthsLabel').textContent = curLabel + ' vs ' + prevLabel;
    document.getElementById('rankPodiumMonth').textContent = curLabel.split('/')[0];
    document.getElementById('rankThCur').textContent = curLabel.split('/')[0];
    document.getElementById('rankThPrev').textContent = prevLabel.split('/')[0];

    document.getElementById('rankCount').textContent = rows.length + ' corretora(s)';
    document.getElementById('rankSearchLabel').textContent = 'Buscar corretora';

    // Segmento ativo desabilita comparação (só temos mês atual por segmento). Mês reconstruído
    // sem extrato do mês anterior (Janeiro) também: não há base pra comparar com Dezembro/25.
    const noPrev = rankUsingSynth && !rankSynthHasPrev;
    const segActive = seg !== 't' || noPrev;

    // KPIs
    const deltaTxt = segActive ? '<span class="ek-note" style="color:var(--muted)">' + (noPrev ? 'sem histórico do mês anterior' : 'comparação só no total') + '</span>'
      : (deltaTot===null ? '' : `<span style="color:${deltaTot>=0?'#1b7a63':'var(--accent-red)'};font-weight:700">${deltaTot>=0?'▲':'▼'} ${Math.abs(deltaTot).toFixed(0)}% vs ${prevLabel.split('/')[0]}</span>`);
    document.getElementById('rankKpiRow').innerHTML = `
      <div class="kpi" style="--k:var(--primary-light)"><div class="label">Vidas Vendidas</div><div class="value">${rkFmt(totalCur)}</div><div class="sub">${curLabel} · ${deltaTxt}</div></div>
      <div class="kpi" style="--k:var(--accent-mint)"><div class="label">Corretoras Ativas</div><div class="value">${rkFmt(ativas)}</div><div class="sub">venderam ao menos 1 vida</div></div>
      <div class="kpi" style="--k:var(--accent-gold)"><div class="label">Ticket Médio</div><div class="value">${ticket.toFixed(1)}</div><div class="sub">vidas por corretora ativa</div></div>
      <div class="kpi" style="--k:var(--accent-coral)"><div class="label">Concentração Top 10</div><div class="value">${conc.toFixed(0)}%</div><div class="sub">${rkFmt(top10)} de ${rkFmt(totalCur)} vidas</div></div>`;

    // Pódio
    const podium = rows.slice(0,3);
    const podOrder = [podium[1], podium[0], podium[2]]; // 2º, 1º, 3º
    const podClass = ['p2','p1','p3']; const medals=['🥈','🥇','🥉'];
    document.getElementById('rankPodium').innerHTML = podOrder.map((r,i)=>{
      if (!r) return '<div></div>';
      const d = r._cur - r._prev;
      const dtxt = segActive ? '' : (r._prev>0 ? `<div class="pd">${d>=0?'▲ +':'▼ '}${rkFmt(Math.abs(d))} vs ${prevLabel.split('/')[0]}</div>` : `<div class="pd">novo no mês</div>`);
      return `<div class="pod ${podClass[i]}"><div class="medal">${medals[i]}</div><div class="pname">${rkShortName(r.n)}</div><div class="pv">${rkFmt(r._cur)}</div><div class="pl">vidas</div><div class="pg">${rkShortGestor(r.g)}</div>${dtxt}</div>`;
    }).join('');

    // Tabela
    // ||1: fallback pra quando a única linha em tela é uma corretora só-com-proposta
    // (cur=0, injetada por updateRankingData — ver comentário lá), senão maxCur=0 e a
    // barra de proporção da linha vira NaN% (0/0).
    const maxCur = (rows.length ? rows[0]._cur : 1) || 1;
    const shown = rankSeeAllOn ? rows : rows.slice(0,20);
    document.getElementById('rankBody').innerHTML = shown.map((r,i)=>{
      const d = r._cur - r._prev;
      let dcls, dtxt;
      if (segActive){ dcls='gone'; dtxt='—'; }
      else if (r._prev===0 && r._cur>0){ dcls='new'; dtxt='novo'; }
      else if (r._cur===0 && r._prev>0){ dcls='gone'; dtxt='sem venda'; }
      else if (d>0){ dcls='up'; dtxt='▲ +'+rkFmt(d); }
      else if (d<0){ dcls='down'; dtxt='▼ '+rkFmt(Math.abs(d)); }
      else { dcls='gone'; dtxt='='; }
      return `<tr data-c="${r.c}">
        <td class="pos ${i<3?'top':''}">${i+1}</td>
        <td><div class="rk-name">${r.n}</div></td>
        <td><div class="rk-eq">${r.e==='—'?'':r.e}</div><div class="rk-g">${rkShortGestor(r.g)}</div></td>
        <td class="num" style="font-weight:800">${rkFmt(r._cur)}</td>
        <td class="num" style="color:var(--muted)">${segActive?'—':rkFmt(r._prev)}</td>
        <td><span class="rk-delta ${dcls}">${dtxt}</span></td>
        <td><div class="rk-bar"><i style="width:${(r._cur/maxCur*100).toFixed(0)}%"></i></div></td>
      </tr>`;
    }).join('');
    document.getElementById('rankTableSub').innerHTML = (rankSeeAllOn?`Todas as ${rows.length}`:'Top 20') + ' corretoras · a coluna "vs mês anterior" compara com ' + prevLabel + (segActive?(noPrev?' · <b>sem histórico de ' + prevLabel.split('/')[0] + ': comparação indisponível</b>':' · <b>segmento filtrado: comparação indisponível</b>'):'') + (rankUsingSynth?' · <i>mês reconstruído do extrato do BI + Carteira atual (equipes de SP, sem Interior)</i>':'') + ' · clique numa linha para o histórico';
    document.getElementById('rankSeeAll').textContent = rankSeeAllOn ? 'Mostrar só o Top 20 ▴' : `Ver todas as ${rows.length} ▾`;
    document.querySelectorAll('#rankBody tr').forEach(tr=>window.__kb(tr).addEventListener('click',()=>rankShowDetail(tr.dataset.c)));

    rankRenderCharts(rows, totalCur, totalPrev, seg, curLabel, prevLabel);
  }

  function rankRenderCharts(rows, totalCur, totalPrev, seg, curLabel, prevLabel){
    const segActive = seg !== 't';
    // Mês atual vs anterior
    destroyChart('rkMonths');
    charts.rkMonths = new Chart(document.getElementById('rankChartMonths'), {
      type:'bar',
      data:{ labels:[prevLabel, curLabel], datasets:[{ data:[segActive?0:totalPrev, totalCur], backgroundColor:['#94a3b8','#2E52D4'], borderRadius:8, maxBarThickness:90 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>rkFmt(c.parsed.y)+' vidas'}}}, scales:{y:{beginAtZero:true, grid:{color:'#eef1f6'}}, x:{grid:{display:false}}} }
    });
    // Concentração por faixas — leitura direta de quanto cada grupo de corretoras produz
    const sortedC = rows.slice().sort((a,b)=>b._cur-a._cur);
    const faixas = [
      {label:'Top 10',      slice:[0,10],  color:'#2E52D4'},
      {label:'11º ao 50º',  slice:[10,50], color:'#16B87A'},
      {label:'51º ao 100º', slice:[50,100],color:'#FFB81C'},
      {label:'Demais',      slice:[100,sortedC.length], color:'#cbd5e1'},
    ].map(f => {
      const grupo = sortedC.slice(f.slice[0], f.slice[1]);
      const vidas = grupo.reduce((s,r)=>s+r._cur,0);
      return {...f, vidas, qtd: grupo.length, pct: totalCur? vidas/totalCur*100 : 0};
    }).filter(f=>f.qtd>0);
    destroyChart('rkPareto');
    charts.rkPareto = new Chart(document.getElementById('rankChartPareto'), {
      type:'bar',
      data:{ labels: faixas.map(f=>f.label),
        datasets:[{ data: faixas.map(f=>f.vidas), backgroundColor: faixas.map(f=>f.color), borderRadius:7, maxBarThickness:38 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{
          const f = faixas[c.dataIndex];
          return [`${rkFmt(f.vidas)} vidas`, `${f.pct.toFixed(0)}% do total`, `${f.qtd} corretora(s)`];
        }}}},
        scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{callback:v=>rkFmt(v)}}, y:{grid:{display:false}, ticks:{font:{size:11, weight:'700'}}} } }
    });
    // Legenda textual abaixo do gráfico
    const concEl = document.getElementById('rankConcNote');
    if (concEl && faixas.length){
      concEl.innerHTML = faixas.map(f=>`<span style="display:inline-flex;align-items:center;gap:6px;margin-right:18px;white-space:nowrap;"><i style="width:10px;height:10px;border-radius:3px;background:${f.color};display:inline-block;flex-shrink:0;"></i><span><b style="color:var(--navy);">${f.label}:</b> ${rkFmt(f.vidas)} vidas · ${f.pct.toFixed(0)}%</span></span>`).join('');
    }
    // Mix de produto (só faz sentido no total) — pelo mês selecionado, não sempre o mais
    // recente (rankValueForMonth já sabe buscar no histórico mc[] quando precisa).
    const mix = { ind:0, pim:0, mid:0, adm:0 };
    rows.forEach(r=>{ mix.ind+=rankValueForMonth(r,'ind').cur; mix.pim+=rankValueForMonth(r,'pim').cur; mix.mid+=rankValueForMonth(r,'mid').cur; mix.adm+=rankValueForMonth(r,'adm').cur; });
    destroyChart('rkMix');
    charts.rkMix = new Chart(document.getElementById('rankChartMix'), {
      type:'doughnut',
      data:{ labels:['PIM (3-29)','Individual','Administradora','Middle/PME'], datasets:[{ data:[mix.pim, mix.ind, mix.adm, mix.mid], backgroundColor:['#2E52D4','#16B87A','#FFB81C','#F26B21'], borderWidth:0 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{legend:{position:'right', labels:{font:{size:11}, padding:10}}, tooltip:{callbacks:{label:c=>c.label+': '+rkFmt(c.parsed)+' vidas'}}} }
    });
    // ---- Gráficos adaptativos: mudam quando há 1 gestor filtrado ----
    const gestorSel = document.getElementById('rankGestor').value;
    const equipeSel = document.getElementById('rankEquipe').value;
    const h1 = document.querySelector('#rankChartGestor').closest('.panel').querySelector('h2');
    const s1 = document.querySelector('#rankChartGestor').closest('.panel').querySelector('.panel-sub');
    const h2 = document.querySelector('#rankChartEquipe').closest('.panel').querySelector('h2');
    const s2 = document.querySelector('#rankChartEquipe').closest('.panel').querySelector('.panel-sub');
    destroyChart('rkGestor'); destroyChart('rkEquipe');

    const barOptsH = {indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>rkFmt(c.parsed.x)+' vidas'}}}, scales:{x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}}}};
    const barOptsV = {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>rkFmt(c.parsed.y)+' vidas'}}}, scales:{y:{beginAtZero:true, grid:{color:'#eef1f6'}}, x:{grid:{display:false}, ticks:{font:{size:10}}}}};
    const topCorretoras = (lista, n) => lista.slice().sort((a,b)=>b._cur-a._cur).slice(0,n);

    // Gráfico de comparação mês atual vs anterior (usado quando o recorte é único)
    const evolucaoChart = (canvasId, chartKey, titulo, sub, lista) => {
      const cur = lista.reduce((s,r)=>s+r._cur,0);
      const prev = lista.reduce((s,r)=>s+(r.prev||0),0);
      const h = document.querySelector('#'+canvasId).closest('.panel').querySelector('h2');
      const sb = document.querySelector('#'+canvasId).closest('.panel').querySelector('.panel-sub');
      h.textContent = titulo; sb.textContent = sub;
      charts[chartKey] = new Chart(document.getElementById(canvasId), {
        type:'bar',
        data:{ labels:[prevLabel, curLabel], datasets:[{ data:[segActive?0:prev, cur], backgroundColor:['#94a3b8','#2E52D4'], borderRadius:8, maxBarThickness:80 }] },
        options: barOptsV
      });
    };

    if (gestorSel){
      // ---- Recorte: 1 GESTOR ----
      evolucaoChart('rankChartGestor','rkGestor','Evolução do Gestor',
        `${rkShortGestor(gestorSel)} — ${curLabel} vs ${prevLabel}`, rows);
      const topC = topCorretoras(rows, 10);
      h2.textContent = 'Top Corretoras do Gestor';
      s2.textContent = `Maiores produtoras de ${rkShortGestor(gestorSel)} em ${curLabel.split('/')[0]}`;
      charts.rkEquipe = new Chart(document.getElementById('rankChartEquipe'), {
        type:'bar',
        data:{ labels: topC.map(r=>rkShortName(r.n)), datasets:[{ data: topC.map(r=>r._cur), backgroundColor:'#2E52D4', borderRadius:6, maxBarThickness:26 }] },
        options: barOptsH
      });
    } else if (equipeSel){
      // ---- Recorte: 1 EQUIPE (sem gestor) ----
      // Gráfico 1: gestores DESSA equipe (comparação interna, útil)
      h1.textContent = 'Gestores da Equipe';
      s1.textContent = `Produção de cada gestor de ${equipeSel} em ${curLabel.split('/')[0]}`;
      const byG = {}; rows.forEach(r=>{ byG[r.g]=(byG[r.g]||0)+r._cur; });
      const gArr = Object.entries(byG).sort((a,b)=>b[1]-a[1]);
      charts.rkGestor = new Chart(document.getElementById('rankChartGestor'), {
        type:'bar',
        data:{ labels: gArr.map(x=>rkShortGestor(x[0])), datasets:[{ data: gArr.map(x=>x[1]), backgroundColor:'#2E52D4', borderRadius:6, maxBarThickness:30 }] },
        options: barOptsH
      });
      // Gráfico 2: top corretoras da equipe (em vez da barra solitária)
      const topC = topCorretoras(rows, 10);
      h2.textContent = 'Top Corretoras da Equipe';
      s2.textContent = `Maiores produtoras de ${equipeSel} em ${curLabel.split('/')[0]}`;
      charts.rkEquipe = new Chart(document.getElementById('rankChartEquipe'), {
        type:'bar',
        data:{ labels: topC.map(r=>rkShortName(r.n)), datasets:[{ data: topC.map(r=>r._cur), backgroundColor:'#16B87A', borderRadius:6, maxBarThickness:26 }] },
        options: barOptsH
      });
    } else {
      // ---- Visão geral ----
      h1.textContent = 'Vendas por Gestor';
      s1.textContent = 'Produção do mês atual por gestor (top 12)';
      const byG = {}; rows.forEach(r=>{ byG[r.g]=(byG[r.g]||0)+r._cur; });
      const topG = Object.entries(byG).sort((a,b)=>b[1]-a[1]).slice(0,12);
      charts.rkGestor = new Chart(document.getElementById('rankChartGestor'), {
        type:'bar',
        data:{ labels: topG.map(x=>rkShortGestor(x[0])), datasets:[{ data: topG.map(x=>x[1]), backgroundColor:'#2E52D4', borderRadius:6, maxBarThickness:28 }] },
        options: barOptsH
      });
      h2.textContent = 'Ranking por Equipe';
      s2.textContent = 'Vidas por equipe de SP no mês atual';
      const byE = {}; rows.forEach(r=>{ if(r.e&&r.e!=='—') byE[r.e]=(byE[r.e]||0)+r._cur; });
      const eqArr = Object.entries(byE).sort((a,b)=>b[1]-a[1]);
      charts.rkEquipe = new Chart(document.getElementById('rankChartEquipe'), {
        type:'bar',
        data:{ labels: eqArr.map(x=>x[0]), datasets:[{ data: eqArr.map(x=>x[1]), backgroundColor:['#2E52D4','#16B87A','#FFB81C','#F26B21','#1D33A8','#8b93b8'], borderRadius:7, maxBarThickness:52 }] },
        options: barOptsV
      });
    }
  }

  function rankShowDetail(codigo){
    const r = rankSourceRows().find(x=>x.c===codigo);
    if (!r) return;
    // Segue o "Mês de Referência" selecionado, não sempre o último importado — mesma fonte
    // (rankValueForMonth) já usada pela tabela/gráficos, senão clicar numa linha vendo Agosto
    // abriria o detalhe com os números de Setembro.
    const v = rankValueForMonth(r, 't');
    const curLabel = rankCurLabel(), prevLabel = rankPrevLabel();
    const ind = rankValueForMonth(r,'ind').cur, pim = rankValueForMonth(r,'pim').cur, mid = rankValueForMonth(r,'mid').cur, adm = rankValueForMonth(r,'adm').cur;
    const d = v.cur - v.prev;
    const dPct = v.prev>0 ? (d/v.prev*100) : null;
    const totalMix = ind+pim+mid+adm;
    const dCls = d>0?'#1b7a63':(d<0?'#F5364A':'#56608F');
    const dArrow = d>0?'▲':(d<0?'▼':'•');
    const dTxt = (rankUsingSynth && !rankSynthHasPrev) ? 'Sem histórico de '+prevLabel.split('/')[0]+' pra comparar'
      : v.prev===0 ? 'Novo no mês (não vendeu em '+prevLabel.split('/')[0]+')'
      : `${dArrow} ${d>=0?'+':''}${rkFmt(d)} vidas${dPct!==null?' ('+(dPct>=0?'+':'')+dPct.toFixed(0)+'%)':''} vs ${prevLabel.split('/')[0]}`;

    document.getElementById('rkmName').textContent = r.n;
    document.getElementById('rkmMeta').innerHTML = `<b>${r.e==='—'?'Sem equipe':r.e}</b> · ${r.g||'—'} · cód. ${r.c}`;

    const mixRow = (label, val, color) => {
      const pct = totalMix ? (val/totalMix*100) : 0;
      return `<div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;"><span style="color:var(--muted)">${label}</span><b style="color:var(--navy)">${rkFmt(val)}</b></div>
        <div style="height:7px; background:#eef1f6; border-radius:4px; overflow:hidden;"><i style="display:block; height:100%; width:${pct}%; background:${color}; border-radius:4px;"></i></div>
      </div>`;
    };

    document.getElementById('rkmBody').innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
        <div class="rkm-stat-box" style="border:1px solid var(--line); border-radius:12px; padding:14px 16px;">
          <div style="font-size:10px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.4px;">${curLabel}</div>
          <div style="font-size:28px; font-weight:800; color:var(--primary-light); letter-spacing:-.02em; margin-top:4px;">${rkFmt(v.cur)}</div>
          <div style="font-size:11px; color:var(--muted);">vidas</div>
        </div>
        <div class="rkm-stat-box" style="border:1px solid var(--line); border-radius:12px; padding:14px 16px;">
          <div style="font-size:10px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.4px;">${prevLabel}</div>
          <div style="font-size:28px; font-weight:800; color:var(--muted); letter-spacing:-.02em; margin-top:4px;">${rkFmt(v.prev)}</div>
          <div style="font-size:11px; color:var(--muted);">vidas</div>
        </div>
      </div>
      <div style="text-align:center; font-size:13px; font-weight:800; color:${dCls}; padding:10px; background:${d>0?'rgba(22,184,122,.08)':(d<0?'rgba(245,54,74,.06)':'#f1f5f9')}; border-radius:10px; margin-bottom:20px;">${dTxt}</div>
      <div style="font-size:11px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:12px;">Mix de produto (${curLabel.split('/')[0]})</div>
      ${totalMix>0 ? mixRow('Individual', ind, '#16B87A') + mixRow('PIM (3-29 vidas)', pim, '#2E52D4') + mixRow('Middle / PME', mid, '#F26B21') + mixRow('Administradora', adm, '#FFB81C') : '<div style="font-size:12px; color:var(--muted);">Sem detalhamento de produto neste mês.</div>'}`;

    document.getElementById('rkModalOverlay').style.display = 'flex';
    // Achado 2026-09-04: o nome de corretora do extrato de vendas (aqui) e o do funil
    // (PENDENCIAS_PME/PF) às vezes são coisas diferentes de verdade pro mesmo cliente — ex.:
    // "AFFINITY" vendida como QUALI PLANOS no BI, mas registrada como F8 no Planium. Tentar
    // casar por nome de corretora entre os dois sistemas não é confiável (já vazou duas
    // vezes: truncamento de nome, e agora corretora diferente pra valer). Gestor os dois
    // sistemas concordam, então a ponte pras pendências é por ali, não por nome de corretora
    // — mesmo padrão já usado em openConversaoDetail (window.showPendenciasModal(gestor)).
    const btnPend = document.getElementById('rkmVerPendBtn');
    if (r.g){
      btnPend.style.display = '';
      document.getElementById('rkmVerPendGestor').textContent = r.g;
      btnPend.onclick = () => {
        document.getElementById('rkModalOverlay').style.display = 'none';
        if (window.showPendenciasModal) window.showPendenciasModal(r.g);
      };
    } else {
      btnPend.style.display = 'none';
    }
  }

  // ---- Propostas (aba PLANIUM) por corretora ----
  const rkNormName = s => String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\b(LTDA|ME|EPP|EIRELI|S\/?A|SA|CORRETORA|DE|SEGUROS|E)\b/g,'').replace(/[^A-Z0-9]/g,'');
  const MES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesLabel = ym => { const [y,m] = ym.split('-'); return `${MES_NOMES[parseInt(m,10)-1]}/${y.slice(2)}`; };
  // "YYYY-MM" um mês antes/depois — usado pra deduzir o rótulo do "mês anterior" do Ranking
  // quando só o mês atual é detectado (ex.: detectou Agosto, mês anterior é Julho).
  const shiftMonth = (ym, delta) => {
    const [y, m] = ym.split('-').map(Number);
    const total = y * 12 + (m - 1) + delta;
    return Math.floor(total / 12) + '-' + String(total % 12 + 1).padStart(2, '0');
  };
  // Mesmo índice que MONTH_LABELS/cmpMonthIndex usam (index 0 = Jan/2025) — não reaproveita
  // cmpMonthIndex direto porque ele lê window.getCurrentMonth() sozinho, e aqui às vezes
  // precisa calcular pra um mês diferente do selecionado (detectedMonth, na hora do import).
  function rankMonthIndexOf(ym){
    if (!ym) return -1;
    const parts = String(ym).split('-');
    const y = Number(parts[0]), m = Number(parts[1]);
    if (!y || !m) return -1;
    return (y - 2025) * 12 + (m - 1);
  }
  // "Mês de Referência" (dropdown global) == último mês de verdade importado pro Ranking?
  // Se sim, usa os campos cur/prev "ao vivo" (mesmo comportamento de sempre). Se não (alguém
  // escolheu um mês mais antigo), busca no histórico m[]/mc[] gravado por updateRankingData.
  function rankIsLatestMonth(){
    const sel = window.getCurrentMonth ? window.getCurrentMonth() : null;
    const latest = window.getLatestKnownMonth ? window.getLatestKnownMonth() : null;
    return !sel || !latest || sel === latest;
  }
  function rankValueForMonth(r, seg){
    if (rankIsLatestMonth()){
      return (seg && seg !== 't') ? {cur: r[seg]||0, prev: 0} : {cur: r.cur||0, prev: r.prev||0};
    }
    const idx = rankMonthIndexOf(window.getCurrentMonth ? window.getCurrentMonth() : null);
    if (idx < 0) return (seg && seg !== 't') ? {cur: r[seg]||0, prev: 0} : {cur: r.cur||0, prev: r.prev||0};
    if (seg && seg !== 't'){
      const arr = r.mc && r.mc[seg];
      return { cur: (arr && arr[idx]) || 0, prev: 0 };
    }
    return { cur: (r.m && r.m[idx]) || 0, prev: (r.m && r.m[idx-1]) || 0 };
  }
  function rankCurLabel(){
    return rankIsLatestMonth() ? RANK_CUR_LABEL : mesLabel(window.getCurrentMonth());
  }
  function rankPrevLabel(){
    return rankIsLatestMonth() ? RANK_PREV_LABEL : mesLabel(shiftMonth(window.getCurrentMonth(), -1));
  }

  document.getElementById('rkmClose').addEventListener('click', ()=>{ document.getElementById('rkModalOverlay').style.display='none'; });
  document.getElementById('rkModalOverlay').addEventListener('click', (e)=>{ if(e.target.id==='rkModalOverlay') document.getElementById('rkModalOverlay').style.display='none'; });

  // Wiring dos filtros do ranking
  document.getElementById('rankEquipe').addEventListener('change', ()=>{ rankPopulateGestores(); rankSeeAllOn=false; renderRanking(); });
  ['rankGestor','rankSeg'].forEach(id=>document.getElementById(id).addEventListener('change', ()=>{ rankSeeAllOn=false; renderRanking(); }));
  document.getElementById('rankSearch').addEventListener('input', window.debounce(()=>{ rankSeeAllOn=false; renderRanking(); }, 250));
  document.getElementById('rankReset').addEventListener('click', ()=>{
    document.getElementById('rankEquipe').value=''; document.getElementById('rankGestor').value='';
    document.getElementById('rankSeg').value='t'; document.getElementById('rankSearch').value='';
    rankPopulateGestores();
    rankSeeAllOn=false; renderRanking();
  });
  document.getElementById('rankSeeAll').addEventListener('click', ()=>{ rankSeeAllOn=!rankSeeAllOn; renderRanking(); });
  window.renderRanking = renderRanking;
  window.getRankData = () => RANKDATA;
  window.getPropostasData = () => PROPOSTAS;
  // A aba "PLANIUM" do arquivo de Pendências PME/SS é um extrato completo (todas as propostas,
  // não só as pendentes) — substitui a lista inteira, igual a um "Meta Junho" novo substitui o
  // mês inteiro, em vez de tentar mesclar linha a linha com o que já existia.
  window.updatePropostasData = function(newList){
    if (!newList || !newList.length) return;
    // Detecta resolução comparando com a leva anterior: proposta que ANTES estava ativa
    // (pendência/análise) e que na leva NOVA não está mais ativa (virou implantada, foi
    // devolvida/cancelada, ou simplesmente não aparece mais) — grava quanto tempo ela ficou
    // parada. Isso é o "cofrinho" que alimenta a visão macro (trimestral/semestral) mais pra
    // frente; nunca deixa a atualização normal quebrar por causa disso (try/catch).
    try {
      const isAtiva = st => /pend|analis/i.test(String(st||''));
      const oldActive = {};
      (PROPOSTAS||[]).forEach(p => { if (p.p && p.dr && isAtiva(p.st)) oldActive[p.p] = p; });
      if (Object.keys(oldActive).length){
        const newMap = {};
        newList.forEach(p => { if (p.p) newMap[p.p] = p; });
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const hojeStr = hoje.toISOString().slice(0,10);
        Object.keys(oldActive).forEach(id => {
          const antigo = oldActive[id];
          const novo = newMap[id];
          if (novo && isAtiva(novo.st)) return; // continua ativa, nada a registrar ainda
          const dataEntrada = slaParseYMD(antigo.dr);
          if (!dataEntrada) return;
          SLA_HISTORICO.push({
            gestor: antigo.g, proposta: id, tipo: 'PME',
            dataEntrada: antigo.dr, dataResolucao: hojeStr,
            duracaoDU: slaDuDiff(dataEntrada, hoje),
            statusFinal: novo ? novo.st : (antigo.st + ' (sumiu da lista)'),
          });
        });
      }
    } catch(e){ console.warn('SLA_HISTORICO: não foi possível processar', e); }
    PROPOSTAS = newList;
    if (window.rankInitialized) renderRanking();
  };
  window.getSlaHistorico = () => SLA_HISTORICO;
  window.getDailySnapshots = () => DAILY_SNAPSHOTS;
  window.saveDailySnapshot = saveDailySnapshot;
  window.getConvOntemHoje = () => CONV_ONTEM_HOJE;
  window.updateConvOntemHoje = function(newData){
    Object.keys(newData||{}).forEach(g => { CONV_ONTEM_HOJE[g] = newData[g]; });
  };

  // ══════════════════════════════════════════════════════════════
  // ABA CONVERSÃO — SLA (aging), Aguardando Assinatura e % Conversão
  // por executivo, tudo a partir do que já é importado hoje (PLANIUM
  // + Notificadas). A parte "macro" (trimestral) só mostra números
  // reais quando SLA_HISTORICO já tiver dado suficiente acumulado.
  // ══════════════════════════════════════════════════════════════
  let convFiltroEquipe = 'CAUDA LONGA';
  let convFiltroGestor = '';
  let convFiltersReady = false;
  function convPopulateGestorSelect(){
    const selG = document.getElementById('convGestor');
    const gestoresPossiveis = Object.keys(GESTOR_EQUIPE).filter(g => !convFiltroEquipe || GESTOR_EQUIPE[g]===convFiltroEquipe).sort();
    selG.innerHTML = '<option value="">Todos os gestores</option>' + gestoresPossiveis.map(g => `<option value="${g}">${g}</option>`).join('');
    selG.value = convFiltroGestor;
  }
  function convSetupFilters(){
    if (convFiltersReady) return;
    convFiltersReady = true;
    const equipes = [...new Set(Object.values(GESTOR_EQUIPE))].sort();
    const selE = document.getElementById('convEquipe');
    selE.innerHTML = '<option value="">Todas as equipes</option>' + equipes.map(eq => `<option value="${eq}">${eq}</option>`).join('');
    selE.value = convFiltroEquipe;
    convPopulateGestorSelect();
    selE.addEventListener('change', () => { convFiltroEquipe = selE.value; convFiltroGestor=''; convPopulateGestorSelect(); window.renderConversao(); });
    document.getElementById('convGestor').addEventListener('change', (e) => { convFiltroGestor = e.target.value; window.renderConversao(); });
  }

  window.renderConversao = function(){
    convSetupFilters();
    const fmt0c = n => Math.round(n||0).toLocaleString('pt-BR');
    const iniciaisConv = nome => String(nome||'').trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
    const isAtiva = st => /pend|analis/i.test(String(st||''));
    const isImplantada = st => /implant/i.test(String(st||''));

    const assinaturaData = (window.getPendenciasData ? window.getPendenciasData().assinatura : {}) || {};
    const todosGestores = [...new Set(PROPOSTAS.map(p=>p.g).filter(Boolean).concat(Object.keys(assinaturaData)))];
    const gestores = todosGestores.filter(g => {
      if (convFiltroGestor) return g === convFiltroGestor;
      if (convFiltroEquipe) return GESTOR_EQUIPE[g] === convFiltroEquipe;
      return true;
    }).sort();
    document.getElementById('convCount').textContent = gestores.length + (gestores.length===1 ? ' gestor' : ' gestores');

    const convReport = (window.getConvOntemHoje ? window.getConvOntemHoje() : {}) || {};
    const cresce = (hoje, ant) => (ant===undefined || ant===null || ant===0) ? null : Math.round((hoje-ant)/ant*100);

    const rows = gestores.map(g => {
      const ps = PROPOSTAS.filter(p=>p.g===g);
      const implantadas = ps.filter(p=>isImplantada(p.st));
      const ativas = ps.filter(p=>isAtiva(p.st));
      const slas = ativas.filter(p=>p.dr).map(p=>slaCalc(p.dr, 3));
      const criticos = slas.filter(s=>s.label==='Crítico').length;
      const atrasoMedio = slas.length ? Math.round(slas.reduce((s,x)=>s+x.atraso,0)/slas.length) : 0;
      const conv = ps.length ? Math.round(implantadas.length/ps.length*100) : null;
      const assinRows = assinaturaData[g] || [];
      const assinTotal = assinRows.reduce((s,r)=>s+(r.beneficiarios||0),0);
      const ativasVidas = ativas.reduce((s,p)=>s+(p.bn||0),0);
      // Ontem→hoje só aparece quando o "Crescimento Geral" já foi importado pra esse gestor —
      // os dois lados (ontem E hoje) vêm sempre da mesma planilha, nunca misturando com o
      // dado ao vivo do PROPOSTAS (que é de outra fonte e atualiza em outro ritmo).
      const cg = convReport[g] || null;
      return { gestor:g, total:ps.length, ativasCount: ativas.length,
        ativasVidas, criticos, atrasoMedio, conv, assinTotal,
        funilOntem: cg ? cg.funilOntem : null, funilHojeReport: cg ? cg.funilHoje : null,
        assinOntem: cg ? cg.assinaturaOntem : null, assinHojeReport: cg ? cg.assinaturaHoje : null,
        cresFunil: cg ? cresce(cg.funilHoje, cg.funilOntem) : null,
        cresAssin: cg ? cresce(cg.assinaturaHoje, cg.assinaturaOntem) : null };
    }).filter(r => r.total>0 || r.assinTotal>0).sort((a,b)=> b.total - a.total);

    const totalPropostas = rows.reduce((s,r)=>s+r.total,0);
    const totalImplantadas = gestores.reduce((s,g)=>s+PROPOSTAS.filter(p=>p.g===g && isImplantada(p.st)).length,0);
    const convGeral = totalPropostas ? Math.round(totalImplantadas/totalPropostas*100) : 0;
    const totalAssin = rows.reduce((s,r)=>s+r.assinTotal,0);
    const totalCriticos = rows.reduce((s,r)=>s+r.criticos,0);
    const totalAtivasVidas = rows.reduce((s,r)=>s+r.ativasVidas,0);

    const kpis = [
      {icon:"<i class=ic-trend></i>", label:"% Conversão do Funil", value: convGeral+'%', sub: totalImplantadas+' de '+fmt0c(totalPropostas)+' propostas', subClass: convGeral>=70?'pos':(convGeral<40?'neg':'warn')},
      {icon:"<i class=ic-clip></i>", label:"Aguardando Assinatura", value: fmt0c(totalAssin)+' vidas', sub: 'em '+rows.filter(r=>r.assinTotal>0).length+' gestores', subClass:''},
      {icon:"<i class=ic-alarm></i>", label:"Críticos de SLA", value: totalCriticos, sub: totalCriticos ? 'ação imediata' : 'nenhum agora', subClass: totalCriticos?'neg':'pos'},
      {icon:"<i class=ic-clock></i>", label:"Em Funil (ativo)", value: fmt0c(totalAtivasVidas)+' vidas', sub: 'análise + pendência', subClass:''},
    ];
    document.getElementById('convKpiRow').innerHTML = kpis.map(k => `
      <div class="kpi"><div class="kpi-icon">${k.icon}</div><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="sub ${k.subClass}">${k.sub}</div></div>
    `).join('');

    // Seta de crescimento — pra Funil e Assinatura, MENOS é melhor (menos gente parada),
    // por isso a cor é invertida em relação ao sentido comum de "subiu = verde".
    const cresLabel = (pct) => {
      if (pct===null) return '<span style="color:var(--muted); font-size:11px;">importe o Crescimento Geral</span>';
      const cor = pct===0 ? 'var(--muted)' : (pct>0 ? 'var(--accent-red)' : 'var(--accent-mint)');
      const seta = pct===0 ? '·' : (pct>0 ? '▲' : '▼');
      return `<span style="color:${cor}; font-weight:700; font-size:11px;">${seta} ${Math.abs(pct)}% vs ontem</span>`;
    };

    // Cada número do card leva pra parte específica dele (busca de pendências, lista de
    // assinatura, ou o detalhe/gráficos) — sempre com stopPropagation pra não também disparar
    // o clique geral do card (que abre o detalhe completo, continua funcionando como "ver tudo").
    const go = (fn, gestor) => `event.stopPropagation(); window.${fn}('${gestor.replace(/'/g,"\\'")}')`;
    document.getElementById('convGrid').innerHTML = rows.map(r => { const g = r.gestor; return `
      <div class="resumo-card" style="cursor:pointer;" role="button" tabindex="0" onclick="window.openConversaoDetail('${g.replace(/'/g,"\\'")}')" title="Ver detalhe de ${g}">
        <div class="rc-head"><div class="rc-avatar">${iniciaisConv(g)}</div><div class="rc-name">${g}</div>
          ${r.criticos ? `<span onclick="${go('showPendenciasModal',g)}" role="button" tabindex="0" style="font-size:9px; font-weight:800; padding:3px 8px; border-radius:20px; background:rgba(245,54,74,.12); color:var(--accent-red); white-space:nowrap; cursor:pointer;" title="Ver pendências de ${g}">${r.criticos} crítico${r.criticos>1?'s':''}</span>` : ''}
        </div>
        <div class="rc-stats" style="row-gap:10px;">
          <div onclick="${go('showPendenciasModal',g)}" role="button" tabindex="0" style="cursor:pointer;" title="Ver pendências de ${g}"><div class="rc-label">SLA médio</div><div class="rc-value" style="font-size:15px; color:${r.atrasoMedio>0?'var(--accent-red)':'var(--accent-mint)'};">${r.atrasoMedio>0 ? '+'+r.atrasoMedio+'d' : 'No prazo'}</div></div>
          <div onclick="${go('openAssinaturaList',g)}" role="button" tabindex="0" style="cursor:pointer;" title="Ver lista de assinaturas de ${g}"><div class="rc-label">Aguard. Assinatura</div><div class="rc-value" style="font-size:15px; color:var(--primary-light);">${fmt0c(r.assinTotal)}</div></div>
          <div onclick="${go('showPendenciasModal',g)}" role="button" tabindex="0" style="cursor:pointer;" title="Ver pendências de ${g}"><div class="rc-label">Em Funil</div><div class="rc-value" style="font-size:15px; color:var(--accent-gold);">${r.ativasCount}</div></div>
          <div onclick="${go('openConversaoDetail',g)}" role="button" tabindex="0" style="cursor:pointer;" title="Ver detalhe de ${g}"><div class="rc-label">% Conversão</div><div class="rc-value" style="font-size:15px; color:${r.conv!==null && r.conv>=70?'var(--accent-mint)':'var(--navy)'};">${r.conv!==null ? r.conv+'%' : '—'}</div></div>
        </div>
        <div style="display:flex; justify-content:space-between; gap:10px; margin-top:12px; padding-top:10px; border-top:1px solid var(--line);">
          <div onclick="${go('openConversaoDetail',g)}" role="button" tabindex="0" style="cursor:pointer;" title="Ver detalhe de ${g}"><div class="rc-label">Funil ontem→hoje</div><div style="font-size:12px; color:var(--navy);">${r.funilOntem!==null ? fmt0c(r.funilOntem)+' → '+fmt0c(r.funilHojeReport) : '—'}</div>${cresLabel(r.cresFunil)}</div>
          <div onclick="${go('openAssinaturaList',g)}" role="button" tabindex="0" style="cursor:pointer; text-align:right;" title="Ver lista de assinaturas de ${g}"><div class="rc-label">Assinatura ontem→hoje</div><div style="font-size:12px; color:var(--navy);">${r.assinOntem!==null ? fmt0c(r.assinOntem)+' → '+fmt0c(r.assinHojeReport) : '—'}</div>${cresLabel(r.cresAssin)}</div>
        </div>
      </div>`; }).join('');

    const macroBody = document.getElementById('convMacroBody');
    const gestoresSet = new Set(gestores);
    const slaHistFiltrado = SLA_HISTORICO.filter(h => gestoresSet.has(h.gestor));
    if (!slaHistFiltrado.length){
      macroBody.innerHTML = `<div style="font-size:12.5px; color:var(--muted); background:var(--bg); border-radius:10px; padding:16px; line-height:1.6;">
        <i class=ic-clock></i> Ainda não há nenhuma pendência resolvida registrada (pro filtro atual). Toda vez que você atualizar o PME/Planium e alguma pendência sumir da lista de ativas, o dia dela aparece aqui — não precisa esperar nada além de continuar atualizando os dados normalmente.
      </div>`;
    } else {
      // Agrupado por dia de resolução (mais recente primeiro) — assim o painel já fica útil
      // desde o primeiro dia com dado, em vez de esperar um trimestre inteiro acumular pra
      // mostrar alguma coisa. Trimestre/semestre viram, na prática, só "mais linhas aqui em
      // baixo" conforme o tempo passa, sem precisar de nenhuma lógica extra de período.
      const byDay = {};
      slaHistFiltrado.forEach(h => { (byDay[h.dataResolucao] = byDay[h.dataResolucao] || []).push(h); });
      const dias = Object.keys(byDay).sort().reverse();
      const totalGeral = slaHistFiltrado.length;
      const mediaGeral = Math.round(slaHistFiltrado.reduce((s,h)=>s+h.duracaoDU,0)/totalGeral);
      macroBody.innerHTML = `<div style="font-size:11.5px; color:var(--muted); margin-bottom:10px;">${totalGeral} pendência${totalGeral>1?'s':''} resolvida${totalGeral>1?'s':''} desde que começamos a acompanhar · média geral: <b style="color:var(--navy);">${mediaGeral} dias úteis</b></div>` +
        dias.map(dia => {
          const arr = byDay[dia];
          const mediaDia = Math.round(arr.reduce((s,h)=>s+h.duracaoDU,0)/arr.length);
          const porGestor = {};
          arr.forEach(h => { (porGestor[h.gestor] = porGestor[h.gestor] || []).push(h.duracaoDU); });
          const gestorLine = Object.keys(porGestor).sort().map(g => {
            const vals = porGestor[g];
            const m = Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
            return `<span style="margin-right:16px; display:inline-block; margin-top:2px;">${g}: <b style="color:var(--navy);">${m}d</b> <span style="color:var(--muted);">(${vals.length})</span></span>`;
          }).join('');
          return `<div style="padding:10px 0; border-bottom:1px solid var(--line); font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="color:var(--navy); font-weight:700;">${dia.split('-').reverse().join('/')}</span>
              <span style="color:var(--muted);">${arr.length} resolvida${arr.length>1?'s':''} · média ${mediaDia}d</span>
            </div>
            <div style="color:var(--muted);">${gestorLine}</div>
          </div>`;
        }).join('');
    }
  };

  // Detalhe por executivo (clique num card da aba Conversão) — tabela + gráficos batendo
  // com as mesmas colunas que a planilha "Crescimento Geral" do sênior acompanha:
  // Assinatura, Funil e Ranking, sempre ontem × hoje.
  let convDetailCharts = {};
  window.openConversaoDetail = function(gestor){
    const isAtiva = st => /pend|analis/i.test(String(st||''));
    const isImplantada = st => /implant/i.test(String(st||''));
    const fmt0d = n => Math.round(n||0).toLocaleString('pt-BR');
    const cresc = (h,o) => (o===undefined||o===null||o===0) ? null : Math.round((h-o)/o*100);

    const assinaturaData = (window.getPendenciasData ? window.getPendenciasData().assinatura : {}) || {};
    const ps = PROPOSTAS.filter(p=>p.g===gestor);
    const ativas = ps.filter(p=>isAtiva(p.st));
    const implantadas = ps.filter(p=>isImplantada(p.st));
    const funilHoje = ativas.reduce((s,p)=>s+(p.bn||0),0);
    const assinHoje = (assinaturaData[gestor]||[]).reduce((s,r)=>s+(r.beneficiarios||0),0);
    const rankingHoje = (RANKDATA||[]).filter(r=>r.g===gestor).reduce((s,r)=>s+(r.cur||0),0);
    // Mesma fonte pros dois lados (ontem e hoje): quando o "Crescimento Geral" já foi
    // importado pra esse gestor, os dois números vêm dele — nunca mistura com o dado ao
    // vivo do PROPOSTAS, que teria outro ritmo de atualização e não bateria.
    const cgData = (window.getConvOntemHoje ? window.getConvOntemHoje() : {})[gestor] || null;

    document.getElementById('convDetailAvatar').textContent = gestor.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
    document.getElementById('convDetailName').textContent = gestor;
    document.getElementById('convDetailEquipe').textContent = GESTOR_EQUIPE[gestor] ? 'Equipe ' + GESTOR_EQUIPE[gestor] : 'Sem equipe cadastrada';

    const linhas = [
      {label:'Aguardando Assinatura', ontem: cgData ? cgData.assinaturaOntem : null, hoje: cgData ? cgData.assinaturaHoje : assinHoje},
      {label:'Funil (análise + pendência)', ontem: cgData ? cgData.funilOntem : null, hoje: cgData ? cgData.funilHoje : funilHoje},
      {label:'Ranking (volume de vendas)', ontem: cgData ? cgData.rankingOntem : null, hoje: cgData ? cgData.rankingHoje : rankingHoje},
      {label:'Propostas implantadas', ontem: null, hoje: implantadas.length},
    ];
    document.getElementById('convDetailTableBody').innerHTML = linhas.map(l => {
      const c = l.ontem!==null ? cresc(l.hoje, l.ontem) : null;
      const corC = c===null ? 'var(--muted)' : (c===0?'var(--muted)':(c>0?'var(--accent-mint)':'var(--accent-red)'));
      return `<tr>
        <td style="padding:9px 4px; font-size:12.5px; color:var(--muted); font-weight:600; border-bottom:1px solid var(--line);">${l.label}</td>
        <td style="padding:9px 4px; text-align:right; font-size:12.5px; border-bottom:1px solid var(--line);">${l.ontem!==null?fmt0d(l.ontem):'—'}</td>
        <td style="padding:9px 4px; text-align:right; font-size:12.5px; font-weight:700; color:var(--navy); border-bottom:1px solid var(--line);">${fmt0d(l.hoje)}</td>
        <td style="padding:9px 4px; text-align:right; font-size:12.5px; font-weight:700; color:${corC}; border-bottom:1px solid var(--line);">${c===null?'—':(c>0?'▲':(c<0?'▼':'·'))+' '+Math.abs(c)+'%'}</td>
      </tr>`;
    }).join('');

    if (convDetailCharts.bar) convDetailCharts.bar.destroy();
    convDetailCharts.bar = new Chart(document.getElementById('convDetailChartBar'), {
      type:'bar',
      data:{ labels:['Assinatura','Funil','Ranking'],
        datasets:[
          {label:'Ontem', data:[cgData?cgData.assinaturaOntem:0, cgData?cgData.funilOntem:0, cgData?cgData.rankingOntem:0], backgroundColor:'#cbd5e1', borderRadius:6, barPercentage:.6},
          {label:'Hoje', data:[cgData?cgData.assinaturaHoje:assinHoje, cgData?cgData.funilHoje:funilHoje, cgData?cgData.rankingHoje:rankingHoje], backgroundColor:'#2E52D4', borderRadius:6, barPercentage:.6},
        ] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{boxWidth:12,font:{size:11}}}}, scales:{y:{beginAtZero:true, grid:{color:'#eef1f6'}}} }
    });

    const statusCount = {};
    ps.forEach(p => {
      const st = String(p.st||'');
      const k = isImplantada(st) ? 'Implantada' : (/pend/i.test(st) ? 'Pendência' : (/analis/i.test(st) ? 'Em análise' : (/devolv/i.test(st) ? 'Devolvida' : (/cancel/i.test(st) ? 'Cancelada' : 'Outros'))));
      statusCount[k] = (statusCount[k]||0) + 1;
    });
    const statusColors = {Implantada:'#16B87A', Pendência:'#F26B21', 'Em análise':'#FFB81C', Devolvida:'#F5364A', Cancelada:'#8B93B8', Outros:'#94a3b8'};
    const statusLabels = Object.keys(statusCount);
    if (convDetailCharts.status) convDetailCharts.status.destroy();
    convDetailCharts.status = new Chart(document.getElementById('convDetailChartStatus'), {
      type:'doughnut',
      data:{ labels: statusLabels, datasets:[{ data: statusLabels.map(l=>statusCount[l]), backgroundColor: statusLabels.map(l=>statusColors[l]||'#94a3b8') }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'right', labels:{boxWidth:11,font:{size:10.5}}}} }
    });

    document.getElementById('convDetailPendBtn').onclick = () => { document.getElementById('convDetailOverlay').style.display='none'; window.showPendenciasModal(gestor); };
    document.getElementById('convDetailOverlay').style.display = 'flex';
  };
  document.getElementById('btnCloseConvDetail').addEventListener('click', () => { document.getElementById('convDetailOverlay').style.display='none'; });
  document.getElementById('convDetailOverlay').addEventListener('click', (e) => { if (e.target.id === 'convDetailOverlay') e.currentTarget.style.display='none'; });

  // Lista de "Aguardando Assinatura" de um executivo — não existia tela nenhuma pra isso
  // antes (só o número agregado). Clique no número do card leva direto pra cá.
  window.openAssinaturaList = function(gestor){
    const assinaturaData = (window.getPendenciasData ? window.getPendenciasData().assinatura : {}) || {};
    const rows = (assinaturaData[gestor] || []).slice().sort((a,b) => (b.dataCriacao||'').localeCompare(a.dataCriacao||''));
    document.getElementById('convAssinGestor').textContent = gestor;
    const total = rows.reduce((s,r)=>s+(r.beneficiarios||0),0);
    document.getElementById('convAssinSub').textContent = `${rows.length} contrato${rows.length!==1?'s':''} · ${total} vida${total!==1?'s':''} aguardando assinatura`;
    const motivoLabel = alvo => alvo==='cliente' ? 'Cliente' : (alvo==='decsau' ? 'Declaração de saúde' : (alvo || '—'));
    document.getElementById('convAssinBody').innerHTML = rows.length ? rows.map(r => `<tr>
        <td>${r.contratante||'—'}</td><td>${r.doc||'—'}</td><td>${r.corretora||'—'}</td>
        <td>${motivoLabel(r.alvo)}</td>
        <td class="num">${r.beneficiarios||0}</td>
        <td>${r.dataCriacao ? r.dataCriacao.split('-').reverse().join('/') : '—'}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--muted); padding:20px;">Nenhum registro.</td></tr>';
    document.getElementById('convAssinOverlay').style.display = 'flex';
  };
  document.getElementById('btnCloseConvAssin').addEventListener('click', () => { document.getElementById('convAssinOverlay').style.display='none'; });
  document.getElementById('convAssinOverlay').addEventListener('click', (e) => { if (e.target.id === 'convAssinOverlay') e.currentTarget.style.display='none'; });
  window.getRankLabels = () => ({cur: RANK_CUR_LABEL, prev: RANK_PREV_LABEL});
  window.updateRankingData = function(curList, prevList, detectedMonth){
    // Antes RANK_CUR_LABEL/RANK_PREV_LABEL ("Julho/26" etc.) nunca mudavam depois da carga
    // inicial — a aba Ranking sempre mostrava os mesmos dois meses no cabeçalho, não importa
    // quantas vezes um mês novo fosse importado. Agora, quando dá pra saber de qual mês o
    // arquivo é (detectedMonth, vindo do mesmo arquivo "NDI SP - Por Gestor"), os rótulos
    // acompanham: mês atual = detectedMonth, mês anterior = o mês imediatamente antes dele.
    if (detectedMonth){
      RANK_CUR_LABEL = mesLabel(detectedMonth);
      RANK_PREV_LABEL = mesLabel(shiftMonth(detectedMonth, -1));
    }
    // GESTOR_EQUIPE é indexado pelo nome CRU completo em maiúsculas (ex.: "PABLO SERGIO
    // RIBEIRO AMORA") — mas "g" (abaixo) às vezes chega no nome BONITO, que pra alguns
    // gestores é abreviado (ex.: "Pablo Amora", sem o nome do meio — ver
    // FULL_19_GESTOR_RAW_MAP/window.getGestorFriendlyName). Um simples .toUpperCase() só
    // resolve os gestores cujo nome bonito é o nome completo (ex.: "Camila Alves
    // Pertinhez") — continua falhando pra quem tem abreviação de verdade. Achado real
    // 2026-09-10, mesma thread do "Ranking de vendas instável ao filtrar": Jonathan Leal e
    // Pablo Amora (Cauda Longa) tinham venda real no RANKDATA mas ficavam com e:'—',
    // porque "JONATHAN LEAL"/"PABLO AMORA" (maiúsculo do nome bonito) não batem com as
    // chaves completas de GESTOR_EQUIPE. Resolvido traduzindo cada chave de GESTOR_EQUIPE
    // pro nome bonito equivalente (mesma função que já resolve o sentido contrário em
    // outras telas) e montando o mapa reverso uma vez por import — cobre os dois formatos
    // que "g" pode assumir, sem precisar adivinhar qual caminho gerou a linha.
    const EQUIPE_BY_FRIENDLY = {};
    if (window.getGestorFriendlyName){
      Object.keys(GESTOR_EQUIPE).forEach(raw => { EQUIPE_BY_FRIENDLY[window.getGestorFriendlyName(raw)] = GESTOR_EQUIPE[raw]; });
    }
    function resolveEquipe(g){
      const gStr = String(g||'');
      return EQUIPE_BY_FRIENDLY[gStr] || GESTOR_EQUIPE[gStr.toUpperCase()] || '—';
    }
    // Mantém o que já existe se um dos lados não vier
    const curMap = {}, prevMap = {};
    if (curList) curList.forEach(r => curMap[r.c] = r);
    else RANKDATA.forEach(r => { if (r.cur>0||r.ind||r.pim||r.mid||r.adm) curMap[r.c] = {c:r.c,n:r.n,g:r.g,t:r.cur,ind:r.ind,pim:r.pim,mid:r.mid,adm:r.adm}; });
    if (prevList) prevList.forEach(r => prevMap[r.c] = r);
    else RANKDATA.forEach(r => { if (r.prev>0) prevMap[r.c] = {c:r.c,t:r.prev}; });
    const codes = new Set([...Object.keys(curMap), ...Object.keys(prevMap)]);
    // Corretora com proposta real em aberto no Planium (PROPOSTAS) mas zero venda no mês
    // atual E no anterior nunca ganhava linha aqui — RANKDATA só nasce da aba EXPORT (só
    // quem vendeu), então ela ficava sem linha na tabela do Ranking, e clicar numa linha é
    // o que dá acesso ao botão "Ver pendências de [gestor]" (ver rankShowDetail). Caso real
    // achado 2026-09-04: código 0540, F8 CORRETORA DE SEGUROS VIDA E BENEFICIOS LTDA —
    // fluxo real de propostas, zero venda em 20 meses, gestora Camila Alves Pertinhez
    // (PLATAFORMA SP, gestora válida da diretoria) — inacessível no Ranking por causa
    // disso. Mesmo corte de escopo+atividade do detectNewCorretorasCaudaLonga (ver
    // comentário lá): GESTOR_EQUIPE pra não deixar passar a Carteira nacional inteira, e só
    // quem tem proposta de verdade rodando, pra não virar milhares de linhas com 0 vidas.
    if (window.CARTEIRA_MAP && typeof PROPOSTAS !== 'undefined' && PROPOSTAS.length){
      const propostasNormList = [...new Set(PROPOSTAS.map(p => rkNormName(p.co)).filter(Boolean))];
      // Prefixo, não igualdade — a razão social do Planium e a da Carteira nem sempre
      // batem char-a-char: achado real testando a própria F8, "...VIDA E BENEFIC LTDA" no
      // Planium x "...VIDA E BENEFICIOS LTDA" na Carteira.
      const hasPropostaReal = razao => {
        const n = rkNormName(razao);
        return n && propostasNormList.some(pn => pn === n || pn.indexOf(n) === 0 || n.indexOf(pn) === 0);
      };
      Object.keys(window.CARTEIRA_MAP.byCodigo).forEach(codigo => {
        if (codes.has(codigo)) return;
        const entries = window.CARTEIRA_MAP.byCodigo[codigo].filter(e => {
          const team = GESTOR_EQUIPE[(e.gestorRaw||'').toUpperCase()];
          if (!team || team === 'INTERIOR SP' || team === 'VENDA INTERNA') return false;
          return hasPropostaReal(e.razao);
        });
        if (!entries.length) return;
        const e = entries[0];
        // g precisa passar por getGestorFriendlyName igual toda linha "de verdade" do
        // Ranking (ver corretorasRawToRankList) — sem isso essa corretora injetada cria um
        // segundo "gestor" com o nome cru (ex.: "LAIS DOS SANTOS MARTINS" duplicando "Lais
        // dos Santos Martins" no filtro), com 0 venda, escondendo o resto das vendas reais
        // dela quando alguém filtra por esse segundo nome. Achado 2026-09-15, caso real:
        // Lais dos Santos Martins (Plataforma SP).
        const gFriendly = window.getGestorFriendlyName ? window.getGestorFriendlyName(e.gestorRaw) : e.gestorRaw;
        curMap[codigo] = { c: codigo, n: e.razao, g: gFriendly, t:0, ind:0, pim:0, mid:0, adm:0 };
        codes.add(codigo);
      });
    }
    // Vínculo de assessoria (ass/acod, colunas H/I da Carteira — ver parseCarteiraWorkbook)
    // gravado direto em cada linha do RANKDATA, não só mantido em memória via
    // window.CARTEIRA_MAP — assim sobrevive à publicação/próxima sessão (CARTEIRA_MAP some
    // a cada F5, só existe de novo quando alguém reimporta a Carteira). Alimenta o
    // Comparativo → Assessorias com a diretoria inteira, não só a carteira Cauda Longa (ver
    // cmpAggregateAssessorias — pedido de Victor 2026-09-04: "a aba COMPARATIVO é pra
    // aparecer tudo"). Guarda o que já existia (RANKDATA anterior) pra não apagar o vínculo
    // numa importação comum (só sales, sem reanexar a Carteira).
    const existingAssByCode = {};
    // Histórico mensal (m/mc) — achado 2026-09-04, pedido do Victor: trocar o "Mês de
    // Referência" no dropdown não mudava nada no Ranking de Vendas, porque RANKDATA só
    // guardava dois números por corretora (mês atual/anterior do último Extrato do BI
    // importado) — o mês mais velho era descartado a cada import novo, sem ficar guardado
    // em lugar nenhum. Agora cada linha ganha m[] (total por mês) e mc.ind/pim/mid/adm[]
    // (mix por mês), mesmo padrão de índice que MONTH_LABELS/cmpMonthIndex já usam
    // (index 0 = Jan/2025) — dá pra reaproveitar a lógica de mês já validada em vez de
    // inventar outra. Carrega o que já existia (RANKDATA anterior) linha por código, senão
    // cada import novo apagaria o histórico acumulado até aqui.
    const existingRankByCode = {};
    RANKDATA.forEach(r => {
      if (r.ass) existingAssByCode[r.c] = {ass: r.ass, acod: r.acod};
      existingRankByCode[r.c] = r;
    });
    const detectedIdx = detectedMonth ? rankMonthIndexOf(detectedMonth) : -1;
    const merged = [];
    codes.forEach(c => {
      const cu = curMap[c], pv = prevMap[c];
      const base = cu || pv;
      const g = (cu && cu.g) || (pv && pv.g) || '';
      let ass = '', acod = '';
      if (window.CARTEIRA_MAP && window.CARTEIRA_MAP.byCodigo[c] && window.CARTEIRA_MAP.byCodigo[c].length){
        const ce = window.CARTEIRA_MAP.byCodigo[c].find(e => e.assessoria) || null;
        if (ce){ ass = ce.assessoria; acod = ce.codAss; }
      } else if (existingAssByCode[c]){
        ass = existingAssByCode[c].ass; acod = existingAssByCode[c].acod;
      }
      const curVal = cu ? Math.round(cu.t*10)/10 : 0;
      const prevVal = pv ? Math.round(pv.t*10)/10 : 0;
      const old = existingRankByCode[c];
      const m = (old && old.m) ? old.m.slice() : [];
      const mc = (old && old.mc) ? {ind:(old.mc.ind||[]).slice(), pim:(old.mc.pim||[]).slice(), mid:(old.mc.mid||[]).slice(), adm:(old.mc.adm||[]).slice()} : {ind:[], pim:[], mid:[], adm:[]};
      if (detectedIdx >= 0){
        m[detectedIdx] = curVal;
        mc.ind[detectedIdx] = cu ? (cu.ind||0) : 0;
        mc.pim[detectedIdx] = cu ? (cu.pim||0) : 0;
        mc.mid[detectedIdx] = cu ? (cu.mid||0) : 0;
        mc.adm[detectedIdx] = cu ? (cu.adm||0) : 0;
        // Preenche o mês anterior só se ainda não tinha nada gravado ali (não sobrescreve
        // histórico de verdade com o total mais pobre que "prev" carrega, sem mix).
        const pIdx = detectedIdx - 1;
        if (pIdx >= 0 && (m[pIdx] === undefined || m[pIdx] === null)) m[pIdx] = prevVal;
      }
      merged.push({
        c, n: base.n || '', g, e: resolveEquipe(g), ass, acod,
        cur: curVal, prev: prevVal,
        ind: cu ? cu.ind : 0, pim: cu ? cu.pim : 0, mid: cu ? cu.mid : 0, adm: cu ? cu.adm : 0,
        m, mc,
      });
    });
    merged.sort((a,b)=>b.cur-a.cur);
    RANKDATA = merged;
    rankPopulated = false;
    if (window.rankInitialized) renderRanking();
  };

  window.renderEligibilidade = render;
  function renderActive(){ if (elMode==='assessorias') renderAssessoria(applyFilters()); else render(); }
  window.renderActiveEl = renderActive;
  window.jumpToElegibilidade = function(opts){
    opts = opts || {};
    showView('el');
    if (!elInitialized){ elInitialized = true; }
    setSelectedGestores(opts.gestor ? [opts.gestor] : []);
    document.getElementById('fReact').checked = !!opts.reactivationOnly;
    page = 1;
    render();
  };
  window.getEligibilidadeData = function(){ return DATA; };
  window.applyCorretorasToEligibilidade = function(byGestor, detectedMonth){
    // Compara código normalizado dos dois lados (célula numérica do Excel perde zero à
    // esquerda, extrato do BI sempre vem com zero) — sem isso, toda corretora cujo código na
    // Elegibilidade é número puro nunca batia com o extrato, ficando com o mês corrente
    // sempre zerado/desatualizado mesmo com a venda certinha no Desempenho Comercial.
    const allCorretoras = {};
    Object.values(byGestor).forEach(g => {
      (g.corretoras||[]).forEach(c => { allCorretoras[window.normalizeCodigo(c.c)] = c; });
    });
    let atualizadas = 0;
    // Índice do mês que este import deve corrigir — corrigido 2026-09-14 (Victor: "o código
    // está ajustado para reconhecer o extrato de qual mês é? Por que no extrato do BI ele
    // informa de qual mês é, e com isso dá pra fazer a distribuição correta"). O fix de
    // 2026-09-09 (dia-10) SÓ chutava pelo calendário porque, naquele momento, não tínhamos
    // acesso ao mês real do arquivo — mas o arquivo "NDI SP - Por Gestor" completo já informa
    // isso de verdade (detectMetaMonth, lê o nome da aba "NDI SP - <MÊS>") e esse valor já
    // chegava até btnConfirmImport (pendingMeta.detectedMonth), só nunca tinha sido repassado
    // pra cá. Agora, quando quem chamou sabe o mês real (detectedMonth, "AAAA-MM"), usa ele
    // direto — sem chute nenhum, nem de calendário. Só cai pro chute do dia-10 quando
    // ninguém sabe o mês de verdade (upload só do extrato bruto de Corretoras, que não carrega
    // essa informação em lugar nenhum do próprio arquivo).
    let targetIdx;
    if (detectedMonth){
      const parts = String(detectedMonth).split('-');
      const y = Number(parts[0]), m = Number(parts[1]);
      targetIdx = (y && m) ? (y - 2025) * 12 + (m - 1) : -1;
    }
    if (targetIdx === undefined || targetIdx < 0){
      // Sem mês real disponível — cai pro mesmo chute de calendário de antes (dia 1-10 mira
      // no mês anterior, dia 11+ no mês corrente), única saída possível nesse caso.
      const graceNow = new Date();
      let graceTargetY = graceNow.getFullYear(), graceTargetM = graceNow.getMonth() + 1; // 1-12
      if (graceNow.getDate() <= 10){
        graceTargetM -= 1;
        if (graceTargetM < 1){ graceTargetM = 12; graceTargetY -= 1; }
      }
      targetIdx = (graceTargetY - 2025) * 12 + (graceTargetM - 1); // mesmo índice que MONTH_LABELS (0 = Jan/2025)
    }
    // Abre a coluna do mês sozinho quando o extrato traz um mês que a planilha ainda não tem —
    // achado 2026-09-17, pedido do Victor: reabrir manualmente a planilha mestre "Elegibilidade
    // completa" com uma coluna a mais, TODA equipe, TODO mês, "vai ser algo muito massivo".
    // Estende m[]/mc.*[] com zero pra todas as corretoras (nunca inventa número — mesmo
    // princípio já usado pro histórico ausente das equipes novas) e refaz MONTH_LABELS/
    // PERIOD_DEFS (refreshMonthDerivedState, já existia pra esse mesmo propósito quando a
    // planilha mestre trazia mais meses — só nunca tinha sido chamado por este caminho).
    if (targetIdx >= 0 && DATA.length && DATA[0].m && targetIdx >= DATA[0].m.length){
      const faltam = targetIdx - DATA[0].m.length + 1;
      DATA.forEach(d => {
        for (let i = 0; i < faltam; i++){
          d.m.push(0);
          if (d.mc){ d.mc.pf.push(0); d.mc.ss.push(0); d.mc.pme.push(0); }
        }
      });
      if (typeof refreshMonthDerivedState === 'function') refreshMonthDerivedState();
    }
    // Trimestre vigente (o último balde de PERIOD_DEFS.trimestre — sempre o trimestre em
    // andamento, mesmo parcial) — usado abaixo pra recalcular Elegível/Ranking igual
    // computePeriodElegRank já usa pro período corrente. Resolvido depois da possível abertura
    // de coluna acima, pra já refletir o mês novo se for o caso.
    const curTri = (typeof PERIOD_DEFS !== 'undefined' && PERIOD_DEFS.trimestre && PERIOD_DEFS.trimestre.length)
      ? PERIOD_DEFS.trimestre[PERIOD_DEFS.trimestre.length - 1] : null;
    DATA.forEach(d => {
      const c = allCorretoras[window.normalizeCodigo(d.c)];
      if (c){
        // Cai pro último índice existente quando o mês-alvo ainda nem tem coluna (ex.:
        // arquivo de um mês que a planilha mestre ainda não abriu) — não tem onde escrever,
        // mantém o comportamento de sempre.
        const lastIdx = (targetIdx >= 0 && targetIdx < d.m.length) ? targetIdx : d.m.length - 1;
        d.m[lastIdx] = c.total;
        if (d.mc){ d.mc.pf[lastIdx] = c.ind; d.mc.ss[lastIdx] = c.ss; d.mc.pme[lastIdx] = c.pme; }
        // Mudar d.m acima não basta — Elegível/Ranking (d.el/d.rk) e a meta do trimestre
        // vigente (d.meta3tri) só eram calculados uma vez, na hora de subir a planilha
        // "Elegibilidade (17 meses)" inteira, e ficavam congelados depois disso (Desempenho
        // Comercial atualiza ao vivo, Elegibilidade não). Reusa computePeriodElegRank (já
        // validado contra o arquivo mestre real da Hapvida) com o trimestre vigente, do
        // mesmo jeito que a tela já faz quando alguém filtra por período manualmente. NÃO
        // mexe em d.t1/d.t2/d.meta/d.gap — esses descrevem o trimestre já fechado, que não
        // muda com vendas novas de hoje.
        if (curTri && typeof computePeriodElegRank === 'function'){
          const calc = computePeriodElegRank(d, curTri.months);
          d.meta3tri = calc.meta;
          d.el = calc.el;
          d.rk = calc.rk;
          // Mantém o retrato histórico (d.elByMonth, ver updateEligibilidadeData/
          // computePeriodElegRank) em dia junto com o mês sendo corrigido agora — assim, se
          // Setembro virar o mês vigente antes de Agosto de fato fechar, o filtro "Mensal →
          // Agosto" ainda mostra a classificação oficial mais recente conhecida pra Agosto,
          // em vez de cair de volta pra uma conta inventada.
          if (!d.elByMonth) d.elByMonth = {};
          d.elByMonth[lastIdx] = calc.el;
        }
        atualizadas++;
      }
      // Fora do "if (c)" de propósito (achado 2026-10-01, pedido do Victor: "Total 17M" com
      // número mais baixo do que deveria pra ~9% das corretoras, sempre faltando exatamente o
      // mês mais recente) — antes só recalculava o total geral de quem aparecia no extrato do
      // dia; uma corretora sem venda registrada no dia específico em que o mês fechava/abria
      // ficava com esse total "preso" num valor antigo, mesmo com d.m[] certo por baixo. Não
      // consegui provar a sequência exata que causa isso (só existe ESTE lugar que grava os
      // dois campos, e sempre junto — pode ter sido um reimport histórico cruzando com uma
      // atualização ao vivo), mas recalcular pra TODO MUNDO aqui, sempre, fecha a brecha de
      // qualquer jeito: d.m[] já está correto nesse ponto (só ganhou o mês novo zerado, se foi
      // o caso, o que não muda a soma de quem não apareceu no extrato de hoje).
      d.tot = d.m.reduce((s,v)=>s+v, 0);
    });
    return atualizadas;
  };
  const CL_RAW_TO_FRIENDLY = {
    'AGATHA EIKO RODRIGUES SAKAMOTO':'Agatha Sakamoto','PATRICIA PESSOA MONKS':'Patricia Monks',
    'JONATHAN LEAL DOS SANTOS SILVA':'Jonathan Leal','PABLO SERGIO RIBEIRO AMORA':'Pablo Amora'
  };
  window.detectNewCorretorasCaudaLonga = function(carteira, dryRun){
    // Mesma normalização aplicada aqui — carteira.byCodigo já vem normalizado, mas d.c
    // (código cru da aba ELEGIBILIDADE) não vinha, então uma corretora já cadastrada com
    // código sem zero à esquerda podia ser marcada como "nova" só por não bater string-a-
    // string contra a chave normalizada da Carteira.
    const existingCodes = new Set(DATA.map(d=>window.normalizeCodigo(d.c)));
    const seen = new Set();
    const found = [];
    Object.keys(carteira.byCodigo).forEach(codigo => {
      if (existingCodes.has(codigo) || seen.has(codigo)) return;
      const entries = carteira.byCodigo[codigo].filter(e => e.equipe === 'CAUDA LONGA');
      if (!entries.length) return;
      seen.add(codigo);
      const e = entries[0];
      const friendly = CL_RAW_TO_FRIENDLY[e.gestorRaw.toUpperCase()] || 'Sem Gestor Atribuído';
      const zeros = Array(MONTH_LABELS.length).fill(0);
      found.push({
        c: codigo, n: e.razao || '(Nome não informado)', g: friendly, gr: '—',
        m: [...zeros], mc: {pf:[...zeros], ss:[...zeros], pme:[...zeros]},
        t1: 0, t2: 0, meta: 0, gap: 0, tot: 0, el: 0, rk: 'Não Classificado', u3: 0, pico: 0, meta3tri: 0,
      });
    });
    if (!dryRun && found.length){
      found.forEach(rec => DATA.push(rec));
      EL_GESTORES.length = 0;
      [...new Set(scopedData().map(d=>d.g))].sort().forEach(g=>EL_GESTORES.push(g));
      syncGestorLocalOptions();
      RANKS_PRESENT.length = 0;
      RANK_ORDER.filter(r => scopedData().some(d=>d.rk===r)).forEach(r=>RANKS_PRESENT.push(r));
    }
    return found;
  };

  // ===== EXPORTAR ELEGIBILIDADE EM .XLSX (pedido do Victor, 2026-10-01) =====
  // Gera de volta o arquivo no MESMO formato que parseEligibilidadeWorkbook (IIFE de import,
  // mais abaixo) espera — mesmos nomes de coluna, mesmo esquema de 2 linhas de cabeçalho por
  // bloco de mês (nome do mês na linha 1, "TOTAL" na linha 2, 3 colunas PF/SS/PME antes dela) —
  // pra ser reimportável pelo próprio importador do dashboard, não só um espelho visual. Um
  // arquivo por equipe (mesmo recorte de ELIG_GESTOR_TEAM, acima), igual ao que a Hapvida manda
  // hoje. Montei conferindo célula por célula contra o que parseEligibilidadeWorkbook lê
  // (monthCols = i+3, mc.pf/ss/pme = c-3/c-2/c-1, monthly = c) — testado de ponta a ponta
  // reimportando o próprio export e comparando os registros resultantes contra os originais
  // antes de considerar pronto. Fica nesta IIFE (não na de import) porque precisa de DATA/
  // ELIG_GESTOR_TEAM direto — window.exportEligibilidadeXlsx exposto pro botão (outro script).
  const MONTH_NUM_TO_NAME = {1:'JANEIRO',2:'FEVEREIRO',3:'MARCO',4:'ABRIL',5:'MAIO',6:'JUNHO',7:'JULHO',8:'AGOSTO',9:'SETEMBRO',10:'OUTUBRO',11:'NOVEMBRO',12:'DEZEMBRO'};
  function globalIdxToMonthHeader(idx){
    const year = 2025 + Math.floor(idx/12), monthNum = (idx % 12) + 1;
    return `${MONTH_NUM_TO_NAME[monthNum]} ${String(year).slice(2)}`;
  }
  function buildEligibilidadeExportAOA(team){
    const rows = DATA.filter(d => ELIG_GESTOR_TEAM[d.g] === team);
    if (!rows.length) return null;
    const monthCount = rows[0].m.length;
    // Trimestres FECHADOS (grupos completos de 3 meses, índice 0 = Jan/25) — mesma convenção de
    // buildTrimestreBuckets, mas aqui no formato de rótulo do ARQUIVO ("1TRI26 TOTAL"), diferente
    // do rótulo de exibição da tela ("1º Trimestre/26"). Inclui TODOS os fechados, não só os 2
    // últimos — o importador só usa os 2 últimos mesmo (triTotalCols.length-2/-1), os anteriores
    // ficam só como referência histórica no arquivo, igual a planilha real cresce com o tempo.
    const closedQuarters = [];
    for (let start = 0; start + 3 <= monthCount; start += 3){
      const year = 2025 + Math.floor(start/12), qInYear = Math.floor((start%12)/3) + 1;
      closedQuarters.push({ label: `${qInYear}TRI${String(year).slice(2)} TOTAL`, months: [start, start+1, start+2] });
    }
    const header1 = ['CODIGO','RAZAO SOCIAL','GRADE DE COMISSAO','ASSESSORIA','GESTOR'];
    const header2 = ['','','','',''];
    for (let i = 0; i < monthCount; i++){
      header1.push(globalIdxToMonthHeader(i), '', '', '');
      header2.push('', '', '', 'TOTAL');
    }
    closedQuarters.forEach(q => { header1.push(q.label); header2.push(''); });
    header1.push(`${monthCount} MESES TOTAIS`, 'ELEGIBILIDADE', 'RANKING');
    header2.push('', '', '');

    const aoa = [header1, header2];
    rows.forEach(d => {
      // GRADE só existe de verdade pra Cauda Longa (mesma régua de parseEligibilidadeWorkbook,
      // que já deixa opcional pras outras equipes) — deixa em branco pras demais, não inventa.
      const row = [d.c, d.n, (team === 'CAUDA LONGA' ? (d.gr || '') : ''), d.ass || '', d.g];
      for (let i = 0; i < monthCount; i++){
        row.push(d.mc ? (d.mc.pf[i]||0) : 0, d.mc ? (d.mc.ss[i]||0) : 0, d.mc ? (d.mc.pme[i]||0) : 0, d.m[i]||0);
      }
      closedQuarters.forEach(q => { row.push(q.months.reduce((s,i)=>s+(d.m[i]||0), 0)); });
      const totGeral = d.m.reduce((s,v)=>s+v, 0);
      row.push(totGeral, d.el === 1 ? 'Elegível' : 'Não Elegível', d.rk || 'Não Classificado');
      aoa.push(row);
    });
    return aoa;
  }
  window.exportEligibilidadeXlsx = function(team){
    const aoa = buildEligibilidadeExportAOA(team);
    if (!aoa){ alert('Nenhuma corretora encontrada pra essa equipe.'); return; }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ELEGIBILIDADE');
    const teamSlug = team.replace(/[^A-Za-z0-9]+/g, '_');
    const hoje = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `Elegibilidade_${teamSlug}_${hoje}.xlsx`);
  };
  document.getElementById('btnExportElig').addEventListener('click', () => {
    window.exportEligibilidadeXlsx(document.getElementById('elExportTeam').value);
  });
  window.updateEligibilidadeData = function(newRecords){
    // Funde com o DATA já existente em vez de substituir tudo — achado real 2026-09-09,
    // thread "Agosto não bate": (1) uma planilha mestre mais ANTIGA/mais curta (ex.: reimportar
    // o arquivo só-Agosto depois de já ter o com Setembro) nunca deve encolher m[]/mc[] de quem
    // já tem mais meses — só serve pra corrigir o retrato histórico daquele mês específico (ver
    // elByMonth abaixo), mesma ideia da "correção de mês passado" que o Desempenho Comercial já
    // tinha. (2) d.elByMonth[idx] guarda a classificação OFICIAL (d.el da época) de cada mês, no
    // instante em que ele ainda era o vigente — sem isso, o mês anterior "esquece" seu valor
    // real assim que um mês novo assume, e computePeriodElegRank precisava inventar uma conta
    // própria (mês isolado vs anterior × fator) pra mês passado — nunca batia com o arquivo
    // mestre real da Hapvida (92 elegíveis reais vs 106 inventados, no caso de Agosto).
    const oldByCode = {};
    DATA.forEach(d => { oldByCode[window.normalizeCodigo(d.c)] = d; });
    const touchedCodes = {};
    const updated = newRecords.map(rec => {
      const key = window.normalizeCodigo(rec.c);
      touchedCodes[key] = true;
      const old = oldByCode[key];
      const fileLastIdx = rec.m.length - 1;
      if (old && old.m && old.m.length > rec.m.length){
        // Arquivo mais curto que o que já tínhamos — só atualiza o retrato histórico do mês
        // que ele cobre, mantém m/mc/el/rk/tot atuais (mais completos) intocados.
        const elByMonth = Object.assign({}, old.elByMonth);
        elByMonth[fileLastIdx] = rec.el;
        return Object.assign({}, old, { elByMonth });
      }
      // Arquivo do tamanho normal (igual ou mais recente) — vira a base nova, carregando o
      // retrato histórico anterior + grava o retrato deste mês também.
      const elByMonth = Object.assign({}, old && old.elByMonth);
      elByMonth[fileLastIdx] = rec.el;
      return Object.assign({}, rec, { elByMonth });
    });
    // Preserva registros de OUTRAS equipes que este import não tocou — antes, `DATA =
    // newRecords.map(...)` descartava silenciosamente qualquer código que não estivesse no
    // arquivo importado. Isso nunca deu problema enquanto só existia a Cauda Longa (o arquivo
    // "mestre" sempre trazia TODAS as corretoras de uma vez), mas quebraria na hora de subir
    // as 4 equipes em arquivos separados: subir o da Digital apagaria Cauda Longa/ABC/
    // Plataforma inteiras. Achado 2026-09-17, planejando a expansão pra 4 equipes.
    const untouched = DATA.filter(d => !touchedCodes[window.normalizeCodigo(d.c)]);
    DATA = updated.concat(untouched);
    // Alinha m[]/mc[] de todo mundo no mesmo tamanho — uma equipe pode ter seu próprio import
    // "atrasado" (ainda não chegou no mês mais recente que outra equipe/a Cauda Longa já tem)
    // sem que isso apareça na comparação por código acima (só compara contra o histórico DA
    // MESMA corretora, nunca contra outra equipe). Sempre completa por TRÁS com zero (meses
    // que aquele import ainda não cobre) — nunca por decisão de negócio, só união de tamanho.
    const maxLen = DATA.reduce((mx,d) => Math.max(mx, d.m ? d.m.length : 0), 0);
    DATA.forEach(d => {
      if (!d.m) return;
      while (d.m.length < maxLen) d.m.push(0);
      if (d.mc){ ['pf','ss','pme'].forEach(k => { if (d.mc[k]) while (d.mc[k].length < maxLen) d.mc[k].push(0); }); }
    });
    refreshMonthDerivedState();
    EL_GESTORES.length = 0;
    [...new Set(scopedData().map(d=>d.g))].sort().forEach(g=>EL_GESTORES.push(g));
    syncGestorLocalOptions();
    RANKS_PRESENT.length = 0;
    RANK_ORDER.filter(r => scopedData().some(d=>d.rk===r)).forEach(r=>RANKS_PRESENT.push(r));
    selRank.innerHTML = '<option value="">Todos</option>';
    RANKS_PRESENT.forEach(r => { const o=document.createElement('option'); o.value=r; o.textContent=r; selRank.appendChild(o); });
    document.getElementById('hdrTotalCount') && (document.getElementById('hdrTotalCount').textContent = DATA.length.toLocaleString('pt-BR'));
    render();
  };
})();

// ===== extraído de index.html linhas 6567-6845 =====
/* =========================================================
   VIEW 0 — VISÃO GERAL (consolida Desempenho Comercial + Elegibilidade)
   ========================================================= */
(function(){
  const fmt0 = n => Math.round(n).toLocaleString('pt-BR');
  const pctf = n => (n*100).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
  const pctColor = p => p >= 1 ? 'var(--green)' : (p >= 0.7 ? 'var(--amber)' : 'var(--red)');
  const CL_LABEL = "Estevão Cardoso (Cauda Longa)";
  // Referência direta ao mesmo array que a Elegibilidade já monta (window.MONTH_LABELS,
  // dinâmico) — antes essa view tinha sua PRÓPRIA cópia fixa de texto (desatualizada,
  // faltando até Julho/26), o que já causava divergência entre partes desta mesma tela.
  const MONTH_LABELS = window.MONTH_LABELS;
  const catLabels = {IND:'Individual', SS:'Super Simples', PME:'PME', ADM:'Administradora'};
  const iniciais = nome => nome.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
  let ovCharts = {};
  function destroyOv(key){ if(ovCharts[key]){ ovCharts[key].destroy(); delete ovCharts[key]; } }

  function populateTeamSelect(mjData){
    const sel = document.getElementById('ovTeam');
    const prevValue = sel.value;
    const teamNames = Object.keys(mjData.teams);
    let html = '<option value="ALL_TEAMS"><i class=ic-building></i> Todos os Times (NDI SP)</option>';
    html += teamNames.map(t => `<option value="${t}"><i class=ic-building></i> ${t}</option>`).join('');
    sel.innerHTML = html;
    const stillValid = prevValue && (prevValue === 'ALL_TEAMS' || teamNames.includes(prevValue));
    sel.value = stillValid ? prevValue : 'ALL_TEAMS';
  }

  function populateExecutivoSelect(mjData, teamName, resetToAll){
    const sel = document.getElementById('ovExecutivo');
    const prevValue = sel.value;
    if (teamName === 'ALL_TEAMS'){
      sel.innerHTML = '<option value="all">Todos os gestores</option>';
      sel.value = 'all';
      return;
    }
    const members = (mjData.teams[teamName] || {members:[]}).members;
    let html = '<option value="all">Todos (time inteiro)</option>';
    members.forEach(m => { html += `<option value="${m.nome}">${m.nome}</option>`; });
    sel.innerHTML = html;
    const stillValid = !resetToAll && prevValue && Array.from(sel.options).some(o=>o.value===prevValue);
    sel.value = stillValid ? prevValue : 'all';
  }

  function renderOverview(){
    const mjData = window.getMetaJunhoData ? window.getMetaJunhoData() : null;
    const eligAll = window.getEligibilidadeData ? window.getEligibilidadeData() : [];
    if (!mjData || !mjData.teams || !Object.keys(mjData.teams).some(k => /\(Cauda Longa\)\s*$/.test(k))) return;

    const teamSel = document.getElementById('ovTeam');
    const wasTeamChange = teamSel.dataset.lastTeam !== undefined && teamSel.dataset.lastTeam !== teamSel.value;
    populateTeamSelect(mjData);
    const teamName = teamSel.value;
    populateExecutivoSelect(mjData, teamName, wasTeamChange);
    teamSel.dataset.lastTeam = teamName;

    const isAllTeams = teamName === 'ALL_TEAMS';
    const execVal = document.getElementById('ovExecutivo').value;
    const isTeamScope = execVal === 'all';
    const isCaudaLongaScope = !isAllTeams && teamName.indexOf('Cauda Longa') >= 0;

    let scopeTotal, scopeMembers, scopeLabel;
    if (isAllTeams){
      // Agregado dos 5 times — equivalente à linha "NDI SP TOTAL" (Fabyanna Boaventura) do relatório
      scopeTotal = {meta:0, int:0};
      const catAgg = {IND:{meta:0,int:0},SS:{meta:0,int:0},PME:{meta:0,int:0},ADM:{meta:0,int:0}};
      scopeMembers = [];
      Object.values(mjData.teams).forEach(td => {
        scopeTotal.meta += td.total.meta; scopeTotal.int += td.total.int;
        ['IND','SS','PME','ADM'].forEach(k => { catAgg[k].meta += td.total.cat[k].meta; catAgg[k].int += td.total.cat[k].int; });
        scopeMembers = scopeMembers.concat(td.members);
      });
      scopeTotal.cat = catAgg;
      if (mjData.naoAtribuido){
        scopeTotal.int += mjData.naoAtribuido.ind + mjData.naoAtribuido.ss + mjData.naoAtribuido.pme;
      }
      scopeLabel = 'Todos os Times (NDI SP) — Fabyanna Boaventura, Diretora';
    } else if (isTeamScope){
      const td = mjData.teams[teamName];
      scopeTotal = td.total; scopeMembers = td.members; scopeLabel = teamName;
    } else {
      const m = mjData.teams[teamName].members.find(mm => mm.nome === execVal);
      scopeTotal = m ? m.total : {meta:0,int:0};
      scopeMembers = m ? [m] : [];
      scopeLabel = execVal;
    }
    const pctTotal = scopeTotal.meta ? scopeTotal.int/scopeTotal.meta : 0;
    const gap = scopeTotal.meta - scopeTotal.int;

    // Base de elegibilidade só cobre a carteira Cauda Longa
    const elig = isCaudaLongaScope ? (isTeamScope ? eligAll : eligAll.filter(d => d.g === execVal)) : [];
    // (legenda de aviso removida — os cards de Elegibilidade já somem sozinhos fora de Cauda Longa)

    const totSum17m = elig.reduce((s,d)=>s+d.tot,0);
    const eligCount = elig.filter(d=>d.el===1).length;
    const eligPct = elig.length ? eligCount/elig.length*100 : 0;
    const reactList = elig.filter(d => d.u3===0 && d.tot>=20);
    const jumpGestor = isTeamScope ? '' : execVal;
    const jumpTeamName = teamName;

    const kpis = [
      {icon:"<i class=ic-target></i>", label:"% Atingimento (Desempenho Comercial)", value: pctf(pctTotal), sub: pctTotal>=1?"Meta batida":"Faltam "+pctf(1-pctTotal), cls: pctTotal>=1?'pos':'neg',
        onclick:`window.jumpToMetaJunho('${jumpTeamName.replace(/'/g,"\\'")}')`},
      {icon:"<i class=ic-warn></i>", label:"Gap p/ Meta", value: (gap>0?fmt0(gap):"0")+" vidas", sub: gap>0?"Abaixo da meta":"Meta batida ou superada", cls: gap>0?'neg':'pos',
        onclick:`window.jumpToMetaJunho('${jumpTeamName.replace(/'/g,"\\'")}')`},
      {icon:"<i class=ic-users></i>", label:"Gestores no Escopo", value: scopeMembers.length, sub: scopeLabel, cls:'', onclick:`document.getElementById('ovGestorGrid').scrollIntoView({behavior:'smooth'})`},
    ];
    if (isCaudaLongaScope){
      kpis.push(
        {icon:"<i class=ic-trend></i>", label:"Vidas — Total 17 Meses", value: fmt0(totSum17m), sub: elig.length+" corretoras na base", cls:'',
          onclick:`window.jumpToElegibilidade({gestor:'${jumpGestor.replace(/'/g,"\\'")}'})`},
        {icon:"<i class=ic-check></i>", label:"% Elegíveis", value: eligPct.toFixed(1)+'%', sub: eligCount+' de '+elig.length, cls: eligPct>=10?'pos':'warn',
          onclick:`window.jumpToElegibilidade({gestor:'${jumpGestor.replace(/'/g,"\\'")}'})`}
      );
    }
    document.getElementById('ovKpiRow').innerHTML = kpis.map(k=>`<div class="kpi" style="cursor:pointer" role="button" tabindex="0" title="Clique para ver o detalhe" onclick="${k.onclick}"><div class="kpi-icon">${k.icon}</div><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="sub ${k.cls}">${k.sub}</div></div>`).join('');

    // Evolução — só existe para escopo Cauda Longa (depende da base de Elegibilidade)
    document.getElementById('ovEvolucaoPanel').style.display = isCaudaLongaScope ? '' : 'none';
    document.getElementById('ovTopRow').style.gridTemplateColumns = isCaudaLongaScope ? '' : '1fr';
    if (isCaudaLongaScope){
      // Tamanho do array precisa acompanhar MONTH_LABELS (dinâmico) — antes era fixo em
      // 18 posições, então o mês mais recente sempre ficava de fora (virava NaN no gráfico).
      const monthly = new Array(MONTH_LABELS.length).fill(0);
      elig.forEach(d => { d.m.forEach((v,i) => { monthly[i] = (monthly[i]||0) + v; }); });
      document.getElementById('ovEvolucaoSub').textContent = `Total de vidas por mês, últimos ${MONTH_LABELS.length} meses (${MONTH_LABELS[0]}–${MONTH_LABELS[MONTH_LABELS.length-1]})`;
      destroyOv('evolucao');
      ovCharts.evolucao = new Chart(document.getElementById('ovChartEvolucao'), {
        type:'bar',
        data:{ labels: MONTH_LABELS, datasets:[{ data: monthly, backgroundColor:'#101E63', borderRadius:4 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true, grid:{color:'#eef1f6'}}, x:{grid:{display:false}, ticks:{font:{size:9}}} } }
      });
    } else {
      destroyOv('evolucao');
    }

    // Categoria (universal — funciona pra qualquer time/gestor)
    // Subtítulo era um texto fixo ("Junho/2026, time completo") escrito manualmente quando
    // essa tela foi feita — nunca acompanhou nem o mês de referência real nem o filtro de
    // equipe/gestor selecionado. Agora usa o mês atual (window.getCurrentMonthLabelSlash) e
    // o mesmo texto de escopo já usado no card "Gestores no Escopo" logo acima.
    const mesRefSub = window.getCurrentMonthLabelSlash ? window.getCurrentMonthLabelSlash() : '';
    document.getElementById('ovCategoriaSub').textContent = `Meta vs. Integrado — ${mesRefSub}, ${isAllTeams ? 'time completo' : scopeLabel}`;
    const catKeys = Object.keys(catLabels);
    const scopeCat = scopeTotal.cat || (scopeMembers[0] ? scopeMembers[0].cat : {IND:{meta:0,int:0},SS:{meta:0,int:0},PME:{meta:0,int:0},ADM:{meta:0,int:0}});
    destroyOv('categoria');
    ovCharts.categoria = new Chart(document.getElementById('ovChartCategoria'), {
      type:'bar',
      data:{ labels:catKeys.map(k=>catLabels[k]), datasets:[{ data:catKeys.map(k=>(scopeCat[k].meta?scopeCat[k].int/scopeCat[k].meta:0)*100), backgroundColor:catKeys.map(k=>{ const p = scopeCat[k].meta?scopeCat[k].int/scopeCat[k].meta:0; return p>=1?'#16B87A':(p>=0.7?'#FFB81C':'#F5364A'); }), borderRadius:6 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>c.raw.toFixed(1)+'%'}}}, scales:{x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{callback:v=>v+'%'}}, y:{grid:{display:false}}} }
    });

    // Gestor mini-cards (clicáveis — levam pro detalhe daquele gestor na Elegibilidade, se for Cauda Longa)
    // — só faz sentido quando um time específico está selecionado; no agregado (ALL_TEAMS), 19 cards
    // vira parede de informação repetida. Nesse caso mostramos o time inteiro em vez do gestor individual.
    document.getElementById('ovGestorPanel').style.display = isAllTeams ? 'none' : '';
    document.getElementById('ovAllTeamsRow').style.display = isAllTeams ? '' : 'none';

    if (isAllTeams){
      const teamRows = Object.keys(mjData.teams).map(t => {
        const tt = mjData.teams[t].total;
        return {name:t, meta:tt.meta, int:tt.int, pct: tt.meta ? tt.int/tt.meta : 0};
      }).sort((a,b)=>b.pct-a.pct);
      destroyOv('teams');
      ovCharts.teams = new Chart(document.getElementById('ovChartTeams'), {
        type:'bar',
        data:{ labels: teamRows.map(r=>r.name), datasets:[{ data: teamRows.map(r=>r.pct*100), backgroundColor: teamRows.map(r=>r.pct>=1?'#16B87A':(r.pct>=0.7?'#FFB81C':'#F5364A')), borderRadius:6 }] },
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
          onClick:(evt,els)=>{ if(!els||!els.length) return; window.jumpToMetaJunho(teamRows[els[0].index].name); },
          onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
          plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>c.raw.toFixed(1)+'%'}}}, scales:{x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{callback:v=>v+'%'}}, y:{grid:{display:false}}} }
      });
      destroyOv('teamsShare');
      ovCharts.teamsShare = new Chart(document.getElementById('ovChartTeamsShare'), {
        type:'doughnut',
        data:{ labels: teamRows.map(r=>r.name), datasets:[{ data: teamRows.map(r=>r.int), backgroundColor:['#2E52D4','#F26B21','#101E63','#16B87A','#FFB81C'], borderWidth:0 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{boxWidth:10,font:{size:9.5}}}} }
      });
    } else {
      document.getElementById('ovGestorGrid').innerHTML = scopeMembers.map(m => {
        const p = m.total.meta ? m.total.int/m.total.meta : 0;
        const clickable = `style="cursor:pointer" role="button" tabindex="0" onclick="window.jumpToMetaJunho('${teamName.replace(/'/g,"\\'")}', '${m.nome.replace(/'/g,"\\'")}')" title="Ver números deste gestor no Desempenho Comercial"`;
        return `<div class="gestor-card" ${clickable}><div class="avatar" style="background:${m.cor}">${iniciais(m.nome)}</div><div class="name">${m.nome}</div><div class="role">Gestor(a) Comercial</div>
          <div class="total-pct" style="color:${pctColor(p)}">${pctf(p)}</div>
          <div class="total-label">${fmt0(m.total.int)} / ${fmt0(m.total.meta)} vidas (meta total)</div></div>`;
      }).join('');
    }

    // Seção dependente de Elegibilidade — oculta inteira fora do escopo Cauda Longa
    document.getElementById('ovEligSection').style.display = 'none';
    if (isCaudaLongaScope){
      document.getElementById('ovOtherTeamCorretoras').style.display = 'none';
      const periodOpt = document.getElementById('ovTopPeriod').value;
      const tm = window.MONTH_LABELS.length;
      const periodRanges = {
        tot: null, // usa d.tot diretamente (17 meses completos)
        ano2025: Array.from({length:12},(_,i)=>i),
        ano2026: Array.from({length:tm-12},(_,i)=>12+i),
        sem: Array.from({length:Math.min(6,tm-12)},(_,i)=>tm-Math.min(6,tm-12)+i),
        tri: Array.from({length:Math.min(3,tm-12)},(_,i)=>tm-Math.min(3,tm-12)+i),
        mes: [tm-1],
      };
      const ultimoMesLabel = window.MONTH_LABELS[tm-1];
      const nomeTrimestre = Math.floor(((tm-1-12))/3)+1;
      const periodLabels = {tot:'17 Meses (Total)', ano2025:'Ano 2025', ano2026:'Ano 2026', sem:'Último Semestre', tri:`Último Trimestre (${nomeTrimestre}TRI26)`, mes:`Mês Atual (${ultimoMesLabel})`};
      const range = periodRanges[periodOpt];
      const sumFor = d => range ? range.reduce((s,i)=>s+d.m[i],0) : d.tot;
      document.getElementById('ovTopSub').textContent = `Maiores produtoras — ${periodLabels[periodOpt]} · clique numa barra para ver a venda por categoria`;

      const top8 = [...elig].map(d=>({d, val:sumFor(d)})).sort((a,b)=>b.val-a.val).slice(0,8);
      destroyOv('top');
      ovCharts.top = new Chart(document.getElementById('ovChartTop'), {
        type:'bar',
        data:{ labels: top8.map(t=>t.d.n.length>26?t.d.n.slice(0,26)+'…':t.d.n), datasets:[{ data: top8.map(t=>t.val), backgroundColor:'#101E63', borderRadius:5 }] },
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
          onClick:(evt,els)=>{ if(!els||!els.length) return; showCorretoraCategoryDetail(top8[els[0].index].d, range, periodLabels[periodOpt]); },
          onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
          plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{font:{size:10}}} } }
      });
      const topReact = [...reactList].sort((a,b)=>b.tot-a.tot).slice(0,8);
      destroyOv('react');
      ovCharts.react = new Chart(document.getElementById('ovChartReact'), {
        type:'bar',
        data:{ labels: topReact.map(d=>d.n.length>26?d.n.slice(0,26)+'…':d.n), datasets:[{ data: topReact.map(d=>d.tot), backgroundColor:'#F26B21', borderRadius:5 }] },
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{font:{size:10}}} } }
      });
    } else {
      destroyOv('top'); destroyOv('react');
      document.getElementById('ovOtherTeamCorretoras').style.display = isAllTeams ? 'none' : '';
      if (!isAllTeams){
        const corretorasData = mjData.corretoras || {};
        let combined = [];
        scopeMembers.forEach(m => {
          (corretorasData[m.nome] || []).forEach(c => combined.push(Object.assign({}, c, {gestorNome: m.nome})));
        });
        const top15 = [...combined].sort((a,b)=>b.total-a.total).slice(0,15);
        document.getElementById('ovOtherTeamCorretorasTitle').textContent = `Top 15 Corretoras — ${scopeLabel}`;
        document.getElementById('ovOtherTeamCorretorasBody').innerHTML = top15.length ? top15.map(c => `
          <tr><td class="name">${c.n}</td><td>${c.gestorNome}</td><td class="num">${c.ind}</td><td class="num">${c.ss}</td><td class="num">${c.pme}</td><td class="num"><b>${c.total}</b></td></tr>
        `).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px;">Nenhuma venda no período para este escopo.</td></tr>`;
      }
    }
  }

  function showCorretoraCategoryDetail(d, range, periodLabel){
    const idxs = range || Array.from({length:18},(_,i)=>i);
    let pf=0, ss=0, pme=0;
    if (d.mc){
      idxs.forEach(i => { pf += d.mc.pf[i]||0; ss += d.mc.ss[i]||0; pme += d.mc.pme[i]||0; });
    }
    document.getElementById('ovCorretoraDetailName').textContent = d.n;
    document.getElementById('ovCorretoraDetailMeta').textContent = `Código ${d.c} · Gestor: ${d.g} · Período: ${periodLabel} · Total: ${fmt0(pf+ss+pme)} vidas`;
    destroyOv('corretoraCat');
    ovCharts.corretoraCat = new Chart(document.getElementById('ovChartCorretoraCat'), {
      type:'bar',
      data:{ labels:['Individual','Super Simples','PME'], datasets:[{ data:[pf,ss,pme], backgroundColor:['#2E52D4','#FFB81C','#16B87A'], borderRadius:6 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}} } }
    });
    const panel = document.getElementById('ovCorretoraDetail');
    panel.classList.add('show');
    panel.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
  document.getElementById('ovCorretoraDetailClose').addEventListener('click', () => {
    document.getElementById('ovCorretoraDetail').classList.remove('show');
  });
  document.getElementById('ovTopPeriod').addEventListener('change', renderOverview);

  document.getElementById('ovTeam').addEventListener('change', renderOverview);
  document.getElementById('ovExecutivo').addEventListener('change', renderOverview);
  document.getElementById('ovResetFilters').addEventListener('click', () => {
    document.getElementById('ovTeam').value = 'ALL_TEAMS';
    document.getElementById('ovTeam').dataset.lastTeam = '';
    renderOverview();
  });
  window.renderOverview = renderOverview;
  renderOverview();
})();

// ===== extraído de index.html linhas 6846-7286 =====
/* =========================================================
   VIEW 3 — COMPARATIVO (time vs. time, gestor vs. gestor, ou misto)
   ========================================================= */
(function(){
  const fmt0 = n => Math.round(n).toLocaleString('pt-BR');
  const pctf = n => (n*100).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
  const shortName = nome => { const p = nome.trim().split(/\s+/); return p.length > 1 && nome.length > 14 ? (p[0] + ' ' + p[p.length-1][0] + '.') : nome; };
  const catLabels = {IND:'Individual', SS:'Super Simples', PME:'PME', ADM:'Administradora'};
  let cmpChart = null;

  let cmpMode = 'equipe';   // 'equipe' | 'corretora' | 'assessoria'
  const cmpLabels = () => (window.getRankLabels ? window.getRankLabels() : {cur:'Mês atual', prev:'Mês anterior'});
  const cmpCorrLabel = r => `${r.c} — ${r.n}`;
  function cmpPopulateDatalists(){
    return (window.getRankData ? window.getRankData() : []).filter(r=>r.cur>0||r.prev>0).sort((a,b)=>b.cur-a.cur);
  }
  // Resolve qual posição de d.m/d.mc corresponde ao mês selecionado no dropdown "Mês de
  // Referência" (window.getCurrentMonth()) — MONTH_LABELS sempre começa em Jan/2025 (índice 0),
  // então dá pra calcular a posição direto do "YYYY-MM" sem precisar de outra lista.
  function cmpMonthIndex(){
    const iso = window.getCurrentMonth ? window.getCurrentMonth() : null;
    if (!iso) return -1;
    const parts = iso.split('-');
    const y = Number(parts[0]), m = Number(parts[1]);
    if (!y || !m) return -1;
    return (y - 2025) * 12 + (m - 1);
  }
  // Valor do mês selecionado num array mensal (d.m ou d.mc.pf/ss/pme) — cai pro último mês
  // conhecido se o mês de referência estiver fora do que esse array cobre (não deveria
  // acontecer em uso normal, é só uma rede de segurança).
  function cmpValueAtCurMonth(arr){
    if (!arr || !arr.length) return 0;
    const idx = cmpMonthIndex();
    if (idx >= 0 && idx < arr.length) return arr[idx] || 0;
    return arr[arr.length-1] || 0;
  }
  // Rótulo do mês selecionado (ex.: "Ago/26") — acompanha o dropdown "Mês de Referência";
  // cai pro mês mais recente conhecido se por algum motivo não achar o índice certo.
  const cmpCurMonthLabel = () => {
    const labels = window.MONTH_LABELS;
    if (!labels || !labels.length) return 'mês atual';
    const idx = cmpMonthIndex();
    return (idx >= 0 && idx < labels.length) ? labels[idx] : labels[labels.length-1];
  };
  // Achado 2026-09-04 (caso F8, código 0540): antes lia só window.getEligibilidadeData()
  // (Elegibilidade, carteira Cauda Longa) — F8 é assessoria de outra gestora (Plataforma
  // SP), então nunca aparecia aqui mesmo tendo corretoras de verdade vinculadas. Victor foi
  // claro: "a aba COMPARATIVO é pra aparecer tudo" — igual ao modo Corretora (que já lê
  // RANKDATA, diretoria inteira), não só Cauda Longa. Agora lê RANKDATA e agrupa por
  // r.ass (gravado ali por updateRankingData a partir da Carteira — ver comentário lá).
  // Sem "% elegível" — elegibilidade é uma classificação só do Cauda Longa, não existe pra
  // corretora de outro time; ver getEntityData/renderCompare, que já param de mostrar isso.
  function cmpAggregateAssessorias(){
    const data = window.getRankData ? window.getRankData() : [];
    const groups = {};
    data.forEach(r => {
      if (!r.ass) return; // sem assessoria vinculada não faz sentido como entidade pra comparar
      (groups[r.ass] = groups[r.ass] || []).push(r);
    });
    return Object.entries(groups).map(([name, rows]) => {
      const acod = rows.map(r=>r.acod).find(Boolean) || '';
      const n = rows.length;
      const cat = {
        IND: {meta:0, int: rows.reduce((s,r)=>s + (r.ind||0), 0)},
        SS:  {meta:0, int: rows.reduce((s,r)=>s + (r.pim||0), 0)},
        PME: {meta:0, int: rows.reduce((s,r)=>s + (r.mid||0), 0)},
        ADM: {meta:0, int: rows.reduce((s,r)=>s + (r.adm||0), 0)},
      };
      const vidas = rows.reduce((s,r)=>s + (r.cur||0), 0);
      return { name, acod, n, vidas, cat };
    });
  }
  // Renderiza a lista rolável de um combobox, filtrada pelo texto digitado
  // Monta a lista de itens conforme o modo atual (corretoras, assessorias OU times/gestores)
  function cmpItens(){
    if (cmpMode === 'corretora'){
      return cmpPopulateDatalists().map(r => ({
        value: 'corr:'+r.c, cod: r.c, nome: r.n, extra: fmt0(r.cur), grupo: r.e==='—'?'Sem equipe':r.e
      }));
    }
    if (cmpMode === 'assessoria'){
      return cmpAggregateAssessorias().sort((a,b)=>b.vidas-a.vidas).map(a => ({
        value: 'ass:'+a.name, cod: a.acod, nome: a.name, extra: a.n+' corretoras', grupo: 'Assessorias'
      }));
    }
    const mjData = window.getMetaJunhoData ? window.getMetaJunhoData() : null;
    if (!mjData) return [];
    const out = [];
    Object.keys(mjData.teams).forEach(t => out.push({value:'team:'+t, cod:'', nome:t, extra:'Time', grupo:'Times'}));
    Object.keys(mjData.teams).forEach(t => {
      mjData.teams[t].members.forEach(m => out.push({value:'gestor:'+m.nome, cod:'', nome:m.nome, extra:'', grupo:'Gestores — '+t}));
    });
    return out;
  }
  const cmpItemLabel = it => it.cod ? `${it.cod} — ${it.nome}` : it.nome;

  function cmpRenderDrop(which, filtro){
    const itens = cmpItens();
    const q = String(filtro||'').toUpperCase().trim();
    const filtrada = q ? itens.filter(it => it.nome.toUpperCase().indexOf(q)>=0 || (it.cod && it.cod.toUpperCase().indexOf(q)>=0)) : itens;
    const drop = document.getElementById('cmpDrop'+which);
    if (!filtrada.length){ drop.innerHTML = '<div class="cmp-empty">Nenhum resultado encontrado</div>'; return; }
    const lim = filtrada.slice(0, 400);
    let html = ''; let grupoAtual = null;
    const agrupar = cmpMode !== 'corretora';   // corretoras vêm ordenadas por vidas, sem grupo
    lim.forEach(it => {
      if (agrupar && it.grupo !== grupoAtual){ grupoAtual = it.grupo; html += `<div class="cmp-group">${grupoAtual}</div>`; }
      html += `<div class="cmp-opt" data-v="${it.value.replace(/"/g,'&quot;')}">
        ${it.cod ? `<span class="co-c">${it.cod}</span>` : ''}
        <span class="co-n">${it.nome}${!agrupar && it.grupo ? `<span style="display:block;font-size:9.5px;color:var(--muted);font-weight:500;">${it.grupo}</span>` : ''}</span>
        ${it.extra ? `<span class="co-v">${it.extra}</span>` : ''}
      </div>`;
    });
    if (filtrada.length > 400) html += '<div class="cmp-empty">+ '+(filtrada.length-400)+' — refine a busca</div>';
    drop.innerHTML = html;
    drop.querySelectorAll('.cmp-opt').forEach(op => op.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const it = itens.find(x => x.value === op.dataset.v);
      if (!it) return;
      const inp = document.getElementById('cmpInput'+which);
      inp.value = cmpItemLabel(it);
      document.getElementById('cmp'+which+'Value').value = it.value;
      const combo = document.getElementById('cmpCombo'+which);
      combo.classList.remove('open'); combo.classList.add('has-value');
      renderCompare();
    }));
  }

  function cmpWireCombo(which){
    const combo = document.getElementById('cmpCombo'+which);
    const inp = document.getElementById('cmpInput'+which);
    const btn = combo.querySelector('.cmp-clear');
    inp.addEventListener('focus', ()=>{ cmpRenderDrop(which, ''); combo.classList.add('open'); });
    inp.addEventListener('click', ()=>{ cmpRenderDrop(which, inp.value === cmpLastLabel[which] ? '' : inp.value); combo.classList.add('open'); });
    inp.addEventListener('input', ()=>{
      combo.classList.toggle('has-value', !!inp.value);
      cmpRenderDrop(which, inp.value); combo.classList.add('open');
    });
    inp.addEventListener('blur', ()=>{ setTimeout(()=>combo.classList.remove('open'), 120); });
    inp.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ combo.classList.remove('open'); inp.blur(); } });
    btn.addEventListener('click', ()=>{
      inp.value=''; combo.classList.remove('has-value');
      cmpRenderDrop(which, ''); combo.classList.add('open'); inp.focus();
    });
  }
  const cmpLastLabel = {A:'', B:''};
  // Resolve o texto digitado (código ou nome) para o registro da corretora
  function cmpResolveCorretora(txt){
    const lista = (window.getRankData ? window.getRankData() : []);
    const t = String(txt||'').trim().toUpperCase();
    if (!t) return null;
    const cod = t.split('—')[0].trim();
    let r = lista.find(x => x.c.toUpperCase() === cod);
    if (r) return r;
    r = lista.find(x => cmpCorrLabel(x).toUpperCase() === t);
    if (r) return r;
    r = lista.find(x => x.n.toUpperCase() === t);
    if (r) return r;
    const cands = lista.filter(x => x.n.toUpperCase().indexOf(t) >= 0 || x.c.toUpperCase().indexOf(t) >= 0);
    return cands.length ? cands.sort((a,b)=>b.cur-a.cur)[0] : null;
  }

  function populateEntitySelect(sel, mjData){
    const prev = sel.value;
    if (cmpMode === 'corretora'){ return; }
    let html = '<optgroup label="Times">';
    Object.keys(mjData.teams).forEach(t => { html += `<option value="team:${t}"><i class=ic-building></i> ${t}</option>`; });
    html += '</optgroup>';
    Object.keys(mjData.teams).forEach(t => {
      html += `<optgroup label="Gestores — ${t}">`;
      mjData.teams[t].members.forEach(m => { html += `<option value="gestor:${m.nome}">${m.nome}</option>`; });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
    if (prev && Array.from(sel.options).some(o=>o.value===prev)) sel.value = prev;
  }

  const iniciais = nome => nome.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
  const TEAM_PALETTE = ['#2E52D4','#F26B21','#101E63','#16B87A','#FFB81C'];
  // #101E63 é um azul-marinho quase preto — ótimo como FUNDO de avatar/barra (com texto branco em
  // cima), mas ilegível quando essa mesma cor é usada como COR DE TEXTO no modo escuro (ex.: o
  // percentual grande do Confronto Head-to-Head). Só nos usos de texto, troca pela versão clara
  // já usada pro mesmo problema em outras partes do painel (--primary-dark no modo escuro).
  const corTexto = hex => (document.documentElement.getAttribute('data-theme') === 'dark' && hex === '#101E63') ? '#8FA6F5' : hex;

  function getEntityData(mjData, value){
    const type = value.split(':')[0], name = value.slice(value.indexOf(':')+1);
    if (type === 'corr'){
      const r = (window.getRankData ? window.getRankData() : []).find(x=>x.c===name);
      if (!r) return {label:'—', role:'Corretora', cor:'#94a3b8', total:{meta:0,int:0}, cat:{IND:{meta:0,int:0},SS:{meta:0,int:0},PME:{meta:0,int:0},ADM:{meta:0,int:0}}};
      // Para corretora: "meta" = mês anterior (referência de comparação), "int" = mês atual
      return {
        label: r.n,
        role: `Corretora — ${r.e==='—'?'sem equipe':r.e} · ${String(r.g||'').split(/\s+/).slice(0,2).join(' ')}`,
        cor: '#2E52D4',
        total: {meta: r.prev, int: r.cur},
        cat: {
          IND: {meta:0, int: r.ind||0},
          SS:  {meta:0, int: r.pim||0},
          PME: {meta:0, int: r.mid||0},
          ADM: {meta:0, int: r.adm||0},
        },
        isCorretora: true,
      };
    }
    if (type === 'ass'){
      const a = cmpAggregateAssessorias().find(x => x.name === name);
      if (!a) return {label:'—', role:'Assessoria', cor:'#94a3b8', total:{meta:0,int:0}, cat:{IND:{meta:0,int:0},SS:{meta:0,int:0},PME:{meta:0,int:0},ADM:{meta:0,int:0}}, isAssessoria:true, corretorasCount:0};
      return {
        label: a.name + (a.acod ? ` (${a.acod})` : ''),
        role: `Assessoria — ${a.n} corretora${a.n===1?'':'s'} vinculada${a.n===1?'':'s'}`,
        cor: '#16B87A',
        total: {meta: 0, int: a.vidas},
        cat: a.cat,
        isAssessoria: true,
        corretorasCount: a.n,
      };
    }
    if (type === 'team'){
      const td = mjData.teams[name];
      const teamIdx = Object.keys(mjData.teams).indexOf(name);
      return {label:name, role:'Time', cor: TEAM_PALETTE[teamIdx % TEAM_PALETTE.length], total: td.total, cat: td.total.cat};
    }
    let member = null, teamOf = '';
    Object.entries(mjData.teams).forEach(([t,td]) => { const m = td.members.find(mm=>mm.nome===name); if(m){ member = m; teamOf = t; } });
    return {label:name, role: teamOf ? `Gestor(a) — ${teamOf}` : 'Gestor(a)', cor: member ? member.cor : '#94a3b8',
      total: member ? member.total : {meta:0,int:0}, cat: member ? member.cat : {IND:{meta:0,int:0},SS:{meta:0,int:0},PME:{meta:0,int:0},ADM:{meta:0,int:0}}};
  }

  function row(label, valA, valB, fmtFn, mode){
    let betterA=false, betterB=false;
    if (mode==='higher'){ if(valA>valB) betterA=true; else if(valB>valA) betterB=true; }
    else if (mode==='lower'){ if(valA<valB) betterA=true; else if(valB<valA) betterB=true; }
    return `<tr>
      <td>${label}</td>
      <td class="num${betterA?' win':''}">${fmtFn(valA)}</td>
      <td class="num${betterB?' win':''}">${fmtFn(valB)}</td>
    </tr>`;
  }

  function renderCompare(){
    const mjData = window.getMetaJunhoData ? window.getMetaJunhoData() : null;
    if (!mjData) return;
    // Seleção via combobox unificado (funciona nos dois modos)
    const itens = cmpItens();
    if (!itens.length) return;
    const vA = document.getElementById('cmpAValue'), vB = document.getElementById('cmpBValue');
    const inA = document.getElementById('cmpInputA'), inB = document.getElementById('cmpInputB');
    const acha = v => itens.find(x => x.value === v);
    let itA = acha(vA.value), itB = acha(vB.value);
    if (!itA) itA = itens.find(x => x.value.indexOf('team:Estevão') === 0) || itens[0];
    if (!itB || itB.value === itA.value) itB = itens.find(x => x.value !== itA.value) || itens[1] || itA;
    if (!itA || !itB) return;
    vA.value = itA.value; vB.value = itB.value;
    if (document.activeElement !== inA){ inA.value = cmpItemLabel(itA); document.getElementById('cmpComboA').classList.add('has-value'); }
    if (document.activeElement !== inB){ inB.value = cmpItemLabel(itB); document.getElementById('cmpComboB').classList.add('has-value'); }
    const hint = document.getElementById('cmpHint');
    hint.style.display = ''; hint.textContent = itens.length + (cmpMode==='corretora' ? ' corretoras disponíveis' : (cmpMode==='assessoria' ? ' assessorias (toda a diretoria)' : ' times e gestores'));
    const selA = {value: itA.value}, selB = {value: itB.value};

    const A = getEntityData(mjData, selA.value);
    const B = getEntityData(mjData, selB.value);
    document.getElementById('cmpTitle').textContent = `${A.label} vs. ${B.label}`;
    document.getElementById('cmpHeadA').textContent = A.label;
    document.getElementById('cmpHeadB').textContent = B.label;

    const pctColor = p => p >= 1 ? 'var(--green)' : (p >= 0.7 ? 'var(--amber)' : 'var(--red)');
    // isRaw: modo "valor absoluto" (sem % de meta) — cobre tanto Corretora (mês atual vs
    // anterior) quanto Assessoria (total do mês atual); isCorrReal/isAss distinguem o texto
    // específico de cada um (a Assessoria não tem "mês anterior" pra comparar).
    const isCorrReal = !!(A.isCorretora || B.isCorretora);
    const isAss = !!(A.isAssessoria || B.isAssessoria);
    const isRaw = isCorrReal || isAss;
    function entityCard(E){
      const raw = !!(E.isCorretora || E.isAssessoria);
      const p = E.total.meta ? E.total.int/E.total.meta : 0;
      const maxCat = raw ? Math.max.apply(null, Object.keys(catLabels).map(k=>E.cat[k].int).concat([1])) : 0;
      const catsHtml = Object.keys(catLabels).map(k => {
        const c = E.cat[k];
        const cp = raw ? (maxCat ? c.int/maxCat : 0) : (c.meta ? c.int/c.meta : 0);
        const pct = Math.min(cp*100, 100);
return `<div class="cat-row"><div class="cat-name">${k}</div><div class="bar-bg"><div class="bar-fill" style="width:${pct}%; background:${raw ? E.cor : pctColor(cp)}"></div></div><div class="cat-pct">${raw ? fmt0(c.int) : pctf(cp)}</div></div>`;
      }).join('');
      const totalLabel = E.isAssessoria
        ? `${cmpCurMonthLabel()} · ${E.corretorasCount||0} corretora${(E.corretorasCount||0)===1?'':'s'} vinculada${(E.corretorasCount||0)===1?'':'s'}`
        : (E.isCorretora ? (cmpLabels().cur + ' · ' + fmt0(E.total.meta) + ' em ' + cmpLabels().prev) : (fmt0(E.total.int) + ' / ' + fmt0(E.total.meta) + ' vidas (meta total)'));
      return `<div class="gestor-card"><div class="avatar" style="background:${E.cor}">${iniciais(E.label)}</div><div class="name">${E.label}</div><div class="role">${E.role}</div>
        <div class="total-pct" style="color:${raw ? corTexto(E.cor) : pctColor(p)}">${raw ? fmt0(E.total.int) : pctf(p)}</div>
        <div class="total-label">${totalLabel}</div>${catsHtml}</div>`;
    }
    document.getElementById('cmpCardsGrid').innerHTML = entityCard(A) + entityCard(B);

    // ===== Confronto Head-to-Head =====
    const pA = A.total.meta ? A.total.int/A.total.meta : 0;
    const pB = B.total.meta ? B.total.int/B.total.meta : 0;
    const geralWinner = Math.abs(pA-pB) < 0.001 ? 'tie' : (pA > pB ? 'A' : 'B');
    const gapVsA = Math.max(0, A.total.meta - A.total.int);
    const gapVsB = Math.max(0, B.total.meta - B.total.int);
    let tagA = geralWinner==='A' ? '<span class="vs-tag">melhor % atingimento</span>'
      : (gapVsA>0 ? `<span class="vs-tag neutral">faltam ${fmt0(gapVsA)} vidas</span>` : '<span class="vs-tag">meta batida</span>');
    let tagB = geralWinner==='B' ? '<span class="vs-tag">melhor % atingimento</span>'
      : (gapVsB>0 ? `<span class="vs-tag neutral">faltam ${fmt0(gapVsB)} vidas</span>` : '<span class="vs-tag">meta batida</span>');
    if (isCorrReal){
      const dA = A.total.int - A.total.meta, dB = B.total.int - B.total.meta;
      const mk = d => d===0 ? '<span class="vs-tag neutral">estável vs mês anterior</span>'
        : (d>0 ? `<span class="vs-tag">▲ +${fmt0(d)} vs ${cmpLabels().prev.split('/')[0]}</span>`
               : `<span class="vs-tag neutral">▼ ${fmt0(Math.abs(d))} vs ${cmpLabels().prev.split('/')[0]}</span>`);
      tagA = mk(dA); tagB = mk(dB);
    } else if (isAss){
      tagA = `<span class="vs-tag neutral">${A.corretorasCount||0} corretora${(A.corretorasCount||0)===1?'':'s'} vinculada${(A.corretorasCount||0)===1?'':'s'}</span>`;
      tagB = `<span class="vs-tag neutral">${B.corretorasCount||0} corretora${(B.corretorasCount||0)===1?'':'s'} vinculada${(B.corretorasCount||0)===1?'':'s'}</span>`;
    }
    const vsSubtitle = E => E.isAssessoria
      ? (fmt0(E.total.int) + ' vidas · ' + cmpCurMonthLabel())
      : (E.isCorretora ? (cmpLabels().cur+' · '+fmt0(E.total.meta)+' em '+cmpLabels().prev) : (fmt0(E.total.int)+' / '+fmt0(E.total.meta)+' vidas'));
    document.getElementById('cmpVsHero').innerHTML = `
      <div class="vs-side left">
        <div class="vs-avatar" style="background:${A.cor}">${iniciais(A.label)}</div>
        <div class="vs-name">${A.label}</div>
        <div class="vs-role">${A.role}</div>
        <div class="vs-bigpct" style="color:${corTexto(A.cor)}">${isRaw ? fmt0(A.total.int) : pctf(pA)}</div>
        <div class="vs-vidas">${vsSubtitle(A)}</div>
        ${tagA}
      </div>
      <div class="vs-center">VS</div>
      <div class="vs-side right">
        <div class="vs-avatar" style="background:${B.cor}">${iniciais(B.label)}</div>
        <div class="vs-name">${B.label}</div>
        <div class="vs-role">${B.role}</div>
        <div class="vs-bigpct" style="color:${corTexto(B.cor)}">${isRaw ? fmt0(B.total.int) : pctf(pB)}</div>
        <div class="vs-vidas">${vsSubtitle(B)}</div>
        ${tagB}
      </div>`;

    // ===== Batalha por Categoria =====
    // Barra escala proporcional ao % até 100% (meta); excedente vira selo. Vencedor por % de atingimento.
    const battleHtml = Object.keys(catLabels).map(k => {
      const cA = A.cat[k], cB = B.cat[k];
      const maxK = Math.max(cA.int, cB.int, 1);
      const paK = isRaw ? (cA.int/maxK) : (cA.meta ? cA.int/cA.meta : 0);
      const pbK = isRaw ? (cB.int/maxK) : (cB.meta ? cB.int/cB.meta : 0);
      const winner = Math.abs(paK-pbK) < 0.001 ? null : (paK > pbK ? 'A' : 'B');
      const barPct = p => Math.min(p*100, 100).toFixed(1);
      const badge = p => (!isRaw && p > 1) ? `<span class="cb-badge">+${Math.round((p-1)*100)}%</span>` : '';
      const winLabel = winner==='A' ? `<span class="cb-win" style="color:${corTexto(A.cor)}">◀ ${shortName(A.label)}</span>`
        : winner==='B' ? `<span class="cb-win" style="color:${corTexto(B.cor)}">${shortName(B.label)} ▶</span>`
        : `<span class="cb-win" style="color:var(--muted)">empate</span>`;
      return `<div class="cat-battle-row">
        <div class="cb-side l">
          ${badge(paK)}<span class="cb-pct">${isRaw ? fmt0(cA.int) : pctf(paK)}</span>
          <div class="cb-track-wrap"><div class="cb-fill" style="width:${barPct(paK)}%; background:${A.cor}"></div></div>
        </div>
        <div class="cb-label"><span class="cb-cat">${catLabels[k]}</span>${winLabel}</div>
        <div class="cb-side r">
          <div class="cb-track-wrap"><div class="cb-fill" style="width:${barPct(pbK)}%; background:${B.cor}"></div></div>
          <span class="cb-pct">${isRaw ? fmt0(cB.int) : pctf(pbK)}</span>${badge(pbK)}
        </div>
      </div>`;
    }).join('');
    document.getElementById('cmpBattle').innerHTML = battleHtml;

    const pctA = A.total.meta ? A.total.int/A.total.meta : 0;
    const pctB = B.total.meta ? B.total.int/B.total.meta : 0;
    const gapA = Math.max(0, A.total.meta - A.total.int);
    const gapB = Math.max(0, B.total.meta - B.total.int);

    let rows = isRaw ? '' : row('Meta', A.total.meta, B.total.meta, v=>fmt0(v)+' vidas', 'neutral');
    const tSub = document.getElementById('cmpTableSub');
    if (tSub) tSub.textContent = isAss
      ? `Assessorias, lado a lado — total de vidas em ${cmpCurMonthLabel()} (mês atual). O melhor valor de cada linha aparece em destaque.`
      : (isCorrReal
        ? `Volume de vidas lado a lado — ${cmpLabels().cur} vs ${cmpLabels().prev}. O melhor valor de cada linha aparece em destaque.`
        : 'Time inteiro ou gestor individual, lado a lado. O melhor valor de cada linha aparece em destaque.');
    if (isCorrReal){
      rows += row(cmpLabels().prev + ' (mês anterior)', A.total.meta, B.total.meta, v=>fmt0(v)+' vidas', 'higher');
      rows += row('Variação vs mês anterior', A.total.int-A.total.meta, B.total.int-B.total.meta, v=>(v>=0?'+':'')+fmt0(v)+' vidas', 'higher');
    } else if (isAss){
      rows += row('Nº de Corretoras', A.corretorasCount||0, B.corretorasCount||0, v=>fmt0(v), 'higher');
    } else {
      rows += row('Integrado (Realizado)', A.total.int, B.total.int, v=>fmt0(v)+' vidas', 'higher');
      rows += row('% Atingimento', pctA, pctB, pctf, 'higher');
      rows += row('Gap p/ Meta', gapA, gapB, v=>fmt0(v)+' vidas', 'lower');
    }
    Object.keys(catLabels).forEach(k => {
      if (isRaw){
        rows += row(catLabels[k], A.cat[k].int, B.cat[k].int, v=>fmt0(v)+' vidas', 'higher');
      } else {
        const pA = A.cat[k].meta ? A.cat[k].int/A.cat[k].meta : 0;
        const pB = B.cat[k].meta ? B.cat[k].int/B.cat[k].meta : 0;
        rows += row('% ' + catLabels[k], pA, pB, pctf, 'higher');
      }
    });
    document.getElementById('cmpTableBody').innerHTML = rows;

    if (cmpChart) { cmpChart.destroy(); cmpChart = null; }
    const catKeys = Object.keys(catLabels);
    const valA = catKeys.map(k => isRaw ? A.cat[k].int : (A.cat[k].meta ? A.cat[k].int/A.cat[k].meta*100 : 0));
    const valB = catKeys.map(k => isRaw ? B.cat[k].int : (B.cat[k].meta ? B.cat[k].int/B.cat[k].meta*100 : 0));
    const hCat = document.getElementById('cmpChartCategoria').closest('.panel').querySelector('h2');
    const sCat = document.getElementById('cmpChartCategoria').closest('.panel').querySelector('.panel-sub');
    if (hCat) hCat.textContent = isRaw ? 'Vidas por Categoria — A vs. B' : '% Atingimento por Categoria — A vs. B';
    if (sCat) sCat.textContent = isAss
      ? `Individual, Super Simples e PME — total de vidas em ${cmpCurMonthLabel()} (mês atual)`
      : (isCorrReal
        ? `Volume de vidas em ${cmpLabels().cur} por segmento`
        : 'Individual, Super Simples, PME e Administradora lado a lado');
    cmpChart = new Chart(document.getElementById('cmpChartCategoria'), {
      type:'bar',
      data:{ labels: catKeys.map(k=>catLabels[k]), datasets:[
        {label:A.label, data: valA, backgroundColor:'#2E52D4', borderRadius:6, maxBarThickness:46},
        {label:B.label, data: valB, backgroundColor:'#F26B21', borderRadius:6, maxBarThickness:46},
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{legend:{position:'bottom', labels:{boxWidth:12,font:{size:11}}},
          tooltip:{callbacks:{label:c=> c.dataset.label + ': ' + (isRaw ? fmt0(c.parsed.y)+' vidas' : c.parsed.y.toFixed(1)+'%')}}},
        scales:{ y:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{callback:v=> isRaw ? fmt0(v) : v+'%'}}, x:{grid:{display:false}} } }
    });
  }

  document.querySelectorAll('#cmpModeSwitch .vs-btn').forEach(b => b.addEventListener('click', () => {
    cmpMode = b.dataset.mode;
    document.querySelectorAll('#cmpModeSwitch .vs-btn').forEach(x=>x.classList.toggle('active', x===b));
    const corr = cmpMode === 'corretora';
    const ass = cmpMode === 'assessoria';
    document.getElementById('cmpLabelA').textContent = corr ? 'Corretora A' : (ass ? 'Assessoria A' : 'Entidade A');
    document.getElementById('cmpLabelB').textContent = corr ? 'Corretora B' : (ass ? 'Assessoria B' : 'Entidade B');
    const ph = corr ? 'Digite o código ou nome da corretora...' : (ass ? 'Digite o nome ou código da assessoria...' : 'Digite o nome do time ou gestor...');
    ['A','B'].forEach(w => {
      document.getElementById('cmpInput'+w).placeholder = ph;
      document.getElementById('cmpInput'+w).value = '';
      document.getElementById('cmp'+w+'Value').value = '';
      document.getElementById('cmpCombo'+w).classList.remove('open');
    });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    renderCompare();
  }));
  cmpWireCombo('A'); cmpWireCombo('B');
  window.renderCompare = renderCompare;
})();

// ===== extraído de index.html linhas 7287-8731 =====
/* =========================================================
   IMPORTAÇÃO DE DADOS — parsing client-side via SheetJS
   ========================================================= */
(function(){
  const CL_GESTORES_RAW = {
    'AGATHA EIKO RODRIGUES SAKAMOTO':'Agatha Sakamoto',
    'PATRICIA PESSOA MONKS':'Patricia Monks',
    'JONATHAN LEAL DOS SANTOS SILVA':'Jonathan Leal',
    'PABLO SERGIO RIBEIRO AMORA':'Pablo Amora'
  };
  const SENIOR_TEAM_LABELS = {
    'CAMILA FOIADELLI': 'Camila Foiadelli (Plataforma)',
    'LEONARDO MARIANO': 'Leonardo Mariano (ABC)',
    'ESTEVÃO CARDOSO': 'Estevão Cardoso (Cauda Longa)',
    'MARCELO LIMA': 'Marcelo Lima (Digital)',   // só vale se a planilha vier sem a coluna FILIAL (ver FILIAL_TIPO)
    'MARIA APARECIDA': 'Maria Aparecida (Digital)',
    'MARIA CABRAL': 'Maria Cabral (Interior)'
  };
  const PALETTE = ['#2E52D4','#F26B21','#101E63','#16B87A','#FFB81C','#1D33A8'];
  const PT_CONNECTORS = new Set(['de','da','do','das','dos','e']);
  function titlecasePt(raw){
    return String(raw).trim().split(/\s+/).map(w => {
      const lw = w.toLowerCase();
      if (PT_CONNECTORS.has(lw)) return lw;
      return lw ? lw[0].toUpperCase() + lw.slice(1) : lw;
    }).join(' ');
  }

  function findSheet(workbook, prefix){
    const name = workbook.SheetNames.find(n => n.toUpperCase().indexOf(prefix.toUpperCase()) === 0);
    return name ? workbook.Sheets[name] : null;
  }
  function sheetRows(sheet){ return XLSX.utils.sheet_to_json(sheet, {header:1, defval:null, raw:true}); }
  function num(v){ const n = Number(v); return isNaN(n) ? 0 : n; }

  const META_MONTH_NAME_TO_NUM = {
    'JANEIRO':'01','FEVEREIRO':'02','MARÇO':'03','MARCO':'03','ABRIL':'04','MAIO':'05','JUNHO':'06',
    'JULHO':'07','AGOSTO':'08','SETEMBRO':'09','OUTUBRO':'10','NOVEMBRO':'11','DEZEMBRO':'12',
  };
  // A aba de Meta já teve dois nomes diferentes vindos da Hapvida: "NDI SP - META <MÊS>"
  // (formato antigo) e "NDI SP - <MÊS>" (formato usado a partir de ago/26, sem "META").
  // Tenta os dois prefixos, do mais específico pro mais genérico, e devolve também qual
  // prefixo bateu — precisamos disso pra extrair o nome do mês corretamente logo depois.
  const META_SHEET_PREFIXES = ['NDI SP - META', 'NDI SP - '];
  function findMetaSheetInfo(workbook){
    for (const prefix of META_SHEET_PREFIXES){
      const name = workbook.SheetNames.find(n => n.toUpperCase().indexOf(prefix.toUpperCase()) === 0);
      if (name) return { name, prefix, sheet: workbook.Sheets[name] };
    }
    return null;
  }
  // Detecta o mês real da planilha pelo nome da aba ("NDI SP - META JUNHO" ou
  // "NDI SP - AGOSTO" -> "2026-06"/"2026-08"), em vez de assumir que todo arquivo
  // enviado é sempre do mês corrente. O ano usa como referência o mês mais recente já
  // conhecido (fallbackYearMonth) — simplificação razoável, já que corretoras não
  // corrigem meses de anos diferentes na prática.
  function detectMetaMonth(workbook, fallbackYearMonth){
    const info = findMetaSheetInfo(workbook);
    if (!info || !fallbackYearMonth) return fallbackYearMonth;
    const monthWord = info.name.toUpperCase().replace(info.prefix.toUpperCase(), '').trim();
    const monthNum = META_MONTH_NAME_TO_NUM[monthWord];
    if (!monthNum) return fallbackYearMonth;
    const year = fallbackYearMonth.split('-')[0];
    return year + '-' + monthNum;
  }

  function parseMetaJunhoWorkbook(workbook){
    const metaInfo = findMetaSheetInfo(workbook);
    if (!metaInfo) throw new Error('Não encontrei a aba "NDI SP - META..." nem "NDI SP - <mês>..." no arquivo.');
    const metaSheet = metaInfo.sheet;
    const detectedMonth = detectMetaMonth(workbook, (window.getLatestKnownMonth ? window.getLatestKnownMonth() : null) || (window.getCurrentMonth ? window.getCurrentMonth() : null));

    const metaRows = sheetRows(metaSheet);
    const teams = {};
    const benchmark = [];
    const rawToFriendly = {};
    const naoAtribuido = { ind:0, ss:0, pme:0, adm:0 };
    let buffer = [];
    // Tipo do time pela coluna FILIAL (PLATAFORMA/ABC/CAUDA LONGA/DIGITAL/INTERIOR), preenchida na 1ª linha
    // de cada bloco — o rótulo do time é "<Sênior> (<Tipo>)" e NÃO depende mais de quem é o sênior:
    // em 06/10/2026 o sênior da Cauda Longa virou Marcelo Lima e o do Digital virou Maria Aparecida.
    const FILIAL_TIPO = {'PLATAFORMA':'Plataforma','ABC':'ABC','CAUDA LONGA':'Cauda Longa','DIGITAL':'Digital','INTERIOR':'Interior'};
    let blockFilial = '';
    for (let i = 3; i < metaRows.length; i++){
      const row = metaRows[i] || [];
      if (typeof row[0] === 'string' && FILIAL_TIPO[row[0].trim().toUpperCase()]) blockFilial = row[0].trim().toUpperCase();
      const gestorName = row[1];
      if (!gestorName || typeof gestorName !== 'string') continue;
      const gestorNameUpper = gestorName.trim().toUpperCase();
      if (gestorNameUpper.indexOf('SEM EXECUTIVO') >= 0 || gestorNameUpper.indexOf('NÃO ESTÃO NO DATABASE') >= 0 || gestorNameUpper.indexOf('NAO ESTAO NO DATABASE') >= 0){
        naoAtribuido.ind += num(row[3]); naoAtribuido.ss += num(row[6]); naoAtribuido.pme += num(row[9]); naoAtribuido.adm += num(row[12]);
        continue;
      }
      if (gestorNameUpper === 'TOTAL') continue;
      if (gestorName.trim().indexOf('TOTAL ') === 0){
        const seniorRaw = gestorName.trim().replace('TOTAL ','').trim();
        const tipoTime = FILIAL_TIPO[blockFilial];
        const teamLabel = tipoTime ? (titlecasePt(seniorRaw) + ' (' + tipoTime + ')') : (SENIOR_TEAM_LABELS[seniorRaw] || titlecasePt(seniorRaw));
        blockFilial = '';
        benchmark.push({time: teamLabel, meta:num(row[14]), int:num(row[15]), pct:num(row[16])});
        teams[teamLabel] = {
          members: buffer.slice(),
          total: {
            cat: { IND:{meta:num(row[2]),int:num(row[3])}, SS:{meta:num(row[5]),int:num(row[6])}, PME:{meta:num(row[8]),int:num(row[9])}, ADM:{meta:num(row[11]),int:num(row[12])} },
            meta: num(row[14]), int: num(row[15])
          }
        };
        buffer = [];
        continue;
      }
      const friendlyName = CL_GESTORES_RAW[gestorName] || titlecasePt(gestorName);
      rawToFriendly[gestorName] = friendlyName;
      buffer.push({
        nome: friendlyName,
        cor: PALETTE[buffer.length % PALETTE.length],
        cat: { IND:{meta:num(row[2]),int:num(row[3])}, SS:{meta:num(row[5]),int:num(row[6])}, PME:{meta:num(row[8]),int:num(row[9])}, ADM:{meta:num(row[11]),int:num(row[12])} },
        total: { meta:num(row[14]), int:num(row[15]) }
      });
    }
    // Time Cauda Longa achado pelo TIPO, qualquer que seja o sênior (Estevão até 09/2026, Marcelo Lima depois).
    const caudaKey = Object.keys(teams).find(k => /\(Cauda Longa\)\s*$/.test(k));
    const cauda = caudaKey ? teams[caudaKey] : null;
    if (!cauda) throw new Error('Não encontrei o time "Cauda Longa" na planilha (esperado um bloco FILIAL = CAUDA LONGA seguido de "TOTAL <sênior>").');
    const clFound = cauda.members.map(m=>m.nome);
    const missing = Object.values(CL_GESTORES_RAW).filter(n => !clFound.includes(n));
    if (missing.length) throw new Error('Não encontrei na planilha os gestores: ' + missing.join(', '));

    // Corretoras — vendas do período por gestor, para os 5 times (sem regra de elegibilidade)
    const corretoras = {};
    const exportSheet = findSheet(workbook, 'EXPORT');
    if (exportSheet){
      const expRows = sheetRows(exportSheet);
      const agg = {};
      for (let i = 2; i < expRows.length; i++){
        const row = expRows[i] || [];
        const codigo = row[1], nomeCorretora = row[2], gestorRaw = row[3], filial = row[9];
        if (!gestorRaw || !rawToFriendly[gestorRaw]) continue;
        const friendly = rawToFriendly[gestorRaw];
        const key = friendly + '|' + codigo;
        if (!agg[key]) agg[key] = {nome: nomeCorretora, ind:0, ss:0, pme:0, total:0, filiais:new Set(), gestor:friendly, codigo:String(codigo)};
        agg[key].ind += num(row[4]); agg[key].ss += num(row[5]); agg[key].pme += num(row[6]);
        agg[key].total += num(row[4]) + num(row[5]) + num(row[6]);
        if (filial) agg[key].filiais.add(filial);
      }
      Object.values(agg).forEach(c => {
        const filialLabel = c.filiais.size > 1 ? `Diversas (${c.filiais.size} filiais)` : ([...c.filiais][0] || '');
        const entry = {c: c.codigo, n: c.nome ? String(c.nome).trim() : '', ind: c.ind, ss: c.ss, pme: c.pme, total: c.total, filial: filialLabel};
        (corretoras[c.gestor] = corretoras[c.gestor] || []).push(entry);
      });
      Object.keys(corretoras).forEach(g => corretoras[g].sort((a,b)=>b.total-a.total));
    }

    return {teams, benchmark, corretoras, naoAtribuido, detectedMonth};
  }

  function parseEligibilidadeWorkbook(workbook){
    const eligSheet = findSheet(workbook, 'ELEGIBILIDADE');
    const baseSheet = findSheet(workbook, 'BASE DE DADOS');
    if (!eligSheet) throw new Error('Não encontrei a aba "ELEGIBILIDADE" neste arquivo. Se este é o "Corretoras", ele já atualiza a Elegibilidade sozinho — suba-o só no campo "Desempenho Comercial" (com a Carteira), e deixe este campo vazio.');

    const rows = sheetRows(eligSheet);
    // Colunas de mês (ex.: "JANEIRO 25", "AGOSTO 26"...) e as de resumo (trimestre
    // anterior/vigente, total 17 meses, elegibilidade e ranking oficiais) são achadas
    // pelo texto do cabeçalho, não por posição fixa — a Hapvida acrescenta uma coluna
    // de mês nova a cada atualização (empurrando tudo que vem depois pra direita), o
    // que já quebrou essa planilha mais de uma vez com índices fixos. Assim, cresce
    // sozinho a cada mês, sem precisar mexer no código de novo.
    const eligHeader1 = (rows[0]||[]).map(h => h==null ? '' : h);
    const eligHeader2 = (rows[1]||[]).map(h => h==null ? '' : h);
    const normHdr = s => String(s||'').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const findEligHeaderCol = (...texts) => {
      const wanted = texts.map(normHdr);
      for (let i = 0; i < eligHeader1.length; i++){ if (wanted.indexOf(normHdr(eligHeader1[i])) >= 0) return i; }
      return -1;
    };
    const MONTH_HEADER_RE = /^(JANEIRO|FEVEREIRO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO) ?\d{2}$/;
    const monthCols = [];
    for (let i = 0; i < eligHeader1.length; i++){
      if (MONTH_HEADER_RE.test(normHdr(eligHeader1[i])) && normHdr(eligHeader2[i+3]) === 'TOTAL') monthCols.push(i+3);
    }
    if (!monthCols.length) throw new Error('Não consegui identificar as colunas de meses na aba ELEGIBILIDADE — o layout da planilha pode ter mudado.');
    // Equipes novas (Plataforma SP/ABC/Digital) só têm dado a partir de Jan/2026 — o arquivo
    // delas literalmente só tem 9 colunas de mês, contra as ~21 da Cauda Longa (que começa em
    // Jan/2025). Pra entrar no mesmo DATA[] compartilhado (todo registro precisa ter m[] do
    // mesmo tamanho — MONTH_LABELS/PERIOD_DEFS são derivados de DATA[0].m.length), completa
    // com zero por trás os meses de 2025 que essas equipes não têm — nunca inventa número
    // (mesmo princípio já usado em applyCorretorasToEligibilidade). Pra Cauda Longa (primeiro
    // mês = Jan/25) isso dá padCount=0, comportamento idêntico a antes.
    const MONTH_NAME_TO_NUM = {JANEIRO:1,FEVEREIRO:2,MARCO:3,ABRIL:4,MAIO:5,JUNHO:6,JULHO:7,AGOSTO:8,SETEMBRO:9,OUTUBRO:10,NOVEMBRO:11,DEZEMBRO:12};
    const monthHeaderToGlobalIdx = headerText => {
      const m = normHdr(headerText).match(/^([A-Z]+) ?(\d{2})$/);
      if (!m || !MONTH_NAME_TO_NUM[m[1]]) return 0;
      return (2000 + Number(m[2]) - 2025) * 12 + (MONTH_NAME_TO_NUM[m[1]] - 1);
    };
    const padCount = Math.max(0, monthHeaderToGlobalIdx(eligHeader1[monthCols[0] - 3]));
    const padFront = arr => padCount > 0 ? [...Array(padCount).fill(0), ...arr] : arr;
    // Colunas de total por trimestre (ex.: "1TRI26 TOTAL", "2TRI26 TOTAL", "3TRI26 TOTAL"...)
    // achadas por PADRÃO de texto, não por nome de trimestre fixo — antes eram hardcoded
    // '1TRI26 TOTAL'/'2TRI26 TOTAL' (os dois únicos trimestres fechados quando esse código
    // foi escrito, com 3TRI/26 em andamento) e quebravam assim que o trimestre seguinte
    // fechasse e a Hapvida acrescentasse a próxima coluna. A régua vigente sempre usa os
    // DOIS TRIMESTRES FECHADOS MAIS RECENTES pra calcular meta/gap do trimestre em
    // andamento (t1 = penúltimo fechado, t2 = último fechado) — como a Hapvida sempre
    // acrescenta a coluna nova mais à direita (mesmo padrão de monthCols acima), pegar as
    // duas últimas colunas que baterem o padrão já garante os trimestres certos, sem
    // precisar mexer nesse código de novo a cada virada de trimestre.
    const TRI_TOTAL_RE = /^\dTRI\d{2} TOTAL$/;
    const triTotalCols = [];
    for (let i = 0; i < eligHeader1.length; i++){
      if (TRI_TOTAL_RE.test(normHdr(eligHeader1[i]))) triTotalCols.push(i);
    }
    if (triTotalCols.length < 2) throw new Error('Não consegui identificar ao menos dois trimestres fechados (colunas tipo "2TRI26 TOTAL") na aba ELEGIBILIDADE — preciso de dois pra calcular a régua vigente. O layout da planilha pode ter mudado.');
    const idxT1 = triTotalCols[triTotalCols.length - 2];
    const idxT2 = triTotalCols[triTotalCols.length - 1];
    // "<N> MESES TOTAIS" — antes hardcoded "17 MESES TOTAIS" (só a Cauda Longa tinha 17 meses
    // quando esse código foi escrito); as equipes novas têm 9 ("9 MESES TOTAIS", Jan-Set/26).
    // Padrão genérico por qualquer quantidade de meses, mesma ideia de monthCols/triTotalCols
    // acima — cresce sozinho, sem precisar reconhecer um número específico.
    const MESES_TOTAIS_RE = /^\d+\s*MESES TOTAIS$/;
    let idxTot17 = -1;
    for (let i = 0; i < eligHeader1.length; i++){ if (MESES_TOTAIS_RE.test(normHdr(eligHeader1[i]))){ idxTot17 = i; break; } }
    const idxEleg = findEligHeaderCol('ELEGIBILIDADE');
    const idxRank = findEligHeaderCol('RANKING');
    if (idxTot17 < 0 || idxEleg < 0 || idxRank < 0){
      throw new Error('Não consegui identificar as colunas de resumo (N meses totais/Elegibilidade/Ranking) na aba ELEGIBILIDADE — o layout da planilha pode ter mudado.');
    }
    // Colunas de metadado (código/nome/grade/assessoria/gestor) — antes eram posição fixa
    // (row[0..4]), o que só funcionava pra Cauda Longa. As equipes novas têm 4 colunas (sem
    // grade) em ordem diferente (CÓDIGO, RAZAO SOCIAL, ASSESSORIA, GESTOR/GERENTE) — agora
    // acha cada uma pelo texto do cabeçalho, então funciona com qualquer ordem/presença.
    // Grade fica opcional (Victor confirmou: "a coluna grade não é necessário para as outras
    // carteiras") — só a Cauda Longa tem, e já era só exibida com fallback "—" no detalhe.
    const idxCodigo = findEligHeaderCol('CODIGO');
    const idxNome = findEligHeaderCol('NOME CORRETOR', 'RAZAO SOCIAL', 'NOME');
    const idxGrade = findEligHeaderCol('GRADE DE COMISSAO', 'GRADE');
    const idxAssessoria = findEligHeaderCol('ASSESSORIA', 'ASSESORIA');
    const idxGestorRaw = findEligHeaderCol('GESTOR', 'GERENTE');
    if (idxCodigo < 0 || idxNome < 0){
      throw new Error('Não consegui identificar as colunas de código/nome da corretora na aba ELEGIBILIDADE — o layout da planilha pode ter mudado.');
    }

    const enrich = {};
    if (baseSheet){
      const baseRows = sheetRows(baseSheet);
      for (let i = 2; i < baseRows.length; i++){
        const row = baseRows[i] || [];
        const codigo = row[1], gestorRaw = row[3];
        if (codigo && gestorRaw && CL_GESTORES_RAW[gestorRaw] && !enrich[codigo]) enrich[codigo] = CL_GESTORES_RAW[gestorRaw];
      }
    }
    // Mapa código da corretora -> código da assessoria (COD_ASS), da aba DATABASE
    const codAssMap = {};
    const dbSheet = findSheet(workbook, 'DATABASE');
    if (dbSheet){
      const dbRows = sheetRows(dbSheet);
      for (let i = 1; i < dbRows.length; i++){
        const row = dbRows[i] || [];
        const codCorr = row[1];          // B CÓDIGO
        const codAss = row[6];           // G COD_ASS
        if (codCorr != null && codCorr !== '' && codAss != null && codAss !== '' && String(codAss).trim() !== '0'){
          const key = String(codCorr).trim();
          if (!codAssMap[key]) codAssMap[key] = String(codAss).trim();
        }
      }
    }

    const records = [];
    for (let i = 2; i < rows.length; i++){
      const row = rows[i] || [];
      const codigo = row[idxCodigo];
      if (codigo === null || codigo === undefined || codigo === '') continue;
      const nome = (row[idxNome] === null || row[idxNome] === undefined || row[idxNome] === '') ? '(Sem nome cadastrado)' : String(row[idxNome]).trim();
      const grade = (idxGrade >= 0 && row[idxGrade] != null) ? String(row[idxGrade]) : '';
      const assessoriaRaw = (idxAssessoria < 0 || row[idxAssessoria] === null || row[idxAssessoria] === undefined || row[idxAssessoria] === '' || String(row[idxAssessoria]).trim() === '0') ? '' : String(row[idxAssessoria]).trim();
      const gestorRaw = idxGestorRaw >= 0 ? row[idxGestorRaw] : '';
      // getGestorFriendlyName cobre os ~19 gestores da diretoria inteira (não só os 4 de
      // Cauda Longa que CL_GESTORES_RAW conhecia) — resolve Camila/Lais/Wilder/Erika
      // (Plataforma SP), Vivian/Guilherme/Izabele (ABC), Karollainny/Amanda/Daniela/Maxuel
      // (Digital) do mesmo jeito que já resolvia os 4 daqui. Sem mapeamento conhecido, devolve
      // o nome cru (ainda melhor que "Sem Gestor Atribuído" de cara).
      let gestorLabel;
      if (gestorRaw) gestorLabel = window.getGestorFriendlyName ? window.getGestorFriendlyName(gestorRaw) : gestorRaw;
      else if (enrich[codigo]) gestorLabel = enrich[codigo];
      else gestorLabel = 'Sem Gestor Atribuído';

      const monthly = padFront(monthCols.map(c => num(row[c])));
      const mc = {
        pf: padFront(monthCols.map(c => num(row[c-3]))),
        ss: padFront(monthCols.map(c => num(row[c-2]))),
        pme: padFront(monthCols.map(c => num(row[c-1]))),
      };
      const t1 = num(row[idxT1]), t2 = num(row[idxT2]);
      const meta = t1 * 1.10;              // meta do 2TRI26 — régua da época (×1,10)
      const gap = t2 - meta;
      const meta3tri = t2 * 0.80;          // meta do 3TRI26 — régua vigente (×0,80: não cair >20% vs 2TRI26)
      const tot = num(row[idxTot17]);
      const elegText = row[idxEleg];
      const rk = row[idxRank];
      // Últimos 3 meses conhecidos — sempre os 3 últimos elementos de "monthly" (que já
      // cresce sozinho a cada mês novo), nunca posições fixas.
      const u3 = (monthly[monthly.length-1]||0) + (monthly[monthly.length-2]||0) + (monthly[monthly.length-3]||0);
      const pico = monthly.length ? Math.max.apply(null, monthly) : 0;
      records.push({
        c: String(codigo), n: nome, g: gestorLabel, gr: grade, ass: assessoriaRaw, acod: codAssMap[String(codigo)] || '', m: monthly, mc,
        t1, t2, meta, gap, meta3tri, tot,
        el: (String(elegText||'').trim() === 'Elegível') ? 1 : 0,
        rk: rk ? String(rk) : 'Não Classificado',
        u3, pico
      });
    }
    if (records.length === 0) throw new Error('Nenhuma corretora encontrada na aba ELEGIBILIDADE.');
    return records;
  }

  function fmtN(n){ return Math.round(n).toLocaleString('pt-BR'); }

  const META_MONTH_LABELS = {'01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho','07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro'};
  function metaMonthLabel(yearMonth){
    if (!yearMonth) return '';
    const [y,m] = yearMonth.split('-');
    return (META_MONTH_LABELS[m] || m) + '/' + y;
  }
  function diffMetaJunho(newData){
    const old = window.getMetaJunhoData(newData.detectedMonth);
    let html = '<h3 style="font-size:14px;color:var(--navy);margin-bottom:8px;"><i class=ic-chart></i> Desempenho Comercial — Resumo das mudanças</h3>';
    const latestKnownMonth = window.getLatestKnownMonth ? window.getLatestKnownMonth() : window.getCurrentMonth();
    // "Histórico" é só quando o arquivo é de um mês ANTERIOR ao mais recente já
    // conhecido — um mês novo (ex.: Agosto chegando depois de Julho) não é "mês
    // passado", é o próprio mês vigente. Comparar com "!==" tratava qualquer mês novo
    // como se fosse uma correção histórica, o que pulava a atualização de Elegibilidade
    // e Ranking mesmo sendo o arquivo do mês atual.
    if (newData.detectedMonth && latestKnownMonth && newData.detectedMonth < latestKnownMonth){
      html += `<div style="font-size:12.5px; margin-bottom:10px; padding:10px 14px; border-radius:8px; background:#fff7ed; color:#9a3412;"><i class=ic-warn></i> Este arquivo é de <b>${metaMonthLabel(newData.detectedMonth)}</b> — não é o mês mais recente (<b>${metaMonthLabel(latestKnownMonth)}</b>). Vou corrigir só o histórico de ${metaMonthLabel(newData.detectedMonth)} no Desempenho Comercial; Elegibilidade e Ranking do mês atual não serão alterados.</div>`;
    }
    html += '<table style="width:100%;font-size:12.5px;margin-bottom:10px;border-collapse:collapse;"><thead><tr style="border-bottom:1px solid var(--line);"><th style="text-align:left;padding:4px;">Time</th><th style="text-align:right;padding:4px;">Meta (atual→novo)</th><th style="text-align:right;padding:4px;">Integrado (atual→novo)</th></tr></thead><tbody>';
    Object.keys(newData.teams).forEach(t => {
      // Casa o time antigo pelo rótulo e, se o sênior mudou (ex.: Cauda Longa: Estevão -> Marcelo Lima), pelo TIPO do time.
      const tipoDe = l => ((/\(([^)]*)\)\s*$/.exec(l) || [])[1]) || '';
      const oldKey = old.teams[t] ? t : Object.keys(old.teams).find(k => tipoDe(k) && tipoDe(k) === tipoDe(t));
      const oldT = (oldKey && old.teams[oldKey].total) || {meta:0,int:0};
      const newT = newData.teams[t].total;
      const bold = t.indexOf('Cauda Longa') >= 0 ? 'font-weight:700;' : '';
      html += `<tr style="${bold}"><td style="padding:4px;">${t}</td><td style="text-align:right;padding:4px;">${fmtN(oldT.meta)} → ${fmtN(newT.meta)}</td><td style="text-align:right;padding:4px;">${fmtN(oldT.int)} → ${fmtN(newT.int)}</td></tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  function diffEligibilidade(newRecords){
    const old = window.getEligibilidadeData();
    // Compara só contra o retrato anterior DOS MESMOS GESTORES que aparecem neste arquivo — não
    // contra a base inteira (todas as equipes). Achado real 2026-09-17: com a Elegibilidade
    // cobrindo 4 equipes em arquivos separados, comparar contra tudo fazia qualquer import de
    // UMA equipe parecer que ia "remover" as outras 3 inteiras (ex.: subir só a ABC mostrava
    // "9202 removidas" — as outras 9202 corretoras de Cauda Longa/Digital/Plataforma, que na
    // real não são tocadas, já que updateEligibilidadeData preserva quem não está no arquivo).
    // Victor cancelou um import correto por causa desse texto assustador antes de eu achar isso.
    const newGestores = new Set(newRecords.map(d => d.g));
    const oldScoped = old.filter(d => newGestores.has(d.g));
    const oldCodes = new Set(oldScoped.map(d=>d.c));
    const newCodes = new Set(newRecords.map(d=>d.c));
    const added = newRecords.filter(d => !oldCodes.has(d.c));
    const removed = oldScoped.filter(d => !newCodes.has(d.c));
    const oldTotSum = oldScoped.reduce((s,d)=>s+d.tot,0);
    const newTotSum = newRecords.reduce((s,d)=>s+d.tot,0);

    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-target></i> Elegibilidade — Resumo das mudanças</h3>';
    html += '<div style="font-size:12.5px;line-height:1.8;">';
    html += `<div>Corretoras destes gestores: <b>${oldScoped.length}</b> → <b>${newRecords.length}</b> (${added.length} novas, ${removed.length} removidas)</div>`;
    html += `<div>Total 17 meses (vidas): <b>${fmtN(oldTotSum)}</b> → <b>${fmtN(newTotSum)}</b></div>`;
    html += '</div>';
    if (added.length){
      html += `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--blue);">Ver ${added.length} corretora(s) nova(s)</summary><ul style="font-size:12px;margin:6px 0 0 18px;">`;
      added.slice(0,30).forEach(d => html += `<li>${d.n} (${d.g})</li>`);
      if (added.length > 30) html += `<li>... e mais ${added.length-30}</li>`;
      html += '</ul></details>';
    }
    if (removed.length){
      html += `<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--red);">Ver ${removed.length} corretora(s) removida(s)</summary><ul style="font-size:12px;margin:6px 0 0 18px;">`;
      removed.slice(0,30).forEach(d => html += `<li>${d.n} (${d.g})</li>`);
      if (removed.length > 30) html += `<li>... e mais ${removed.length-30}</li>`;
      html += '</ul></details>';
    }
    return html;
  }

  let pendingMeta = null, pendingElig = null, pendingCarteira = null, pendingPendPme = null, pendingPendPf = null, pendingCorretorasRaw = null, pendingEligBridge = null, pendingPropostas = null, pendingAssinatura = null, pendingCrescimentoGeral = null;
  let pendingRankCur = null, pendingRankPrev = null;

  // Gestores da equipe do Rio (excluídos do ranking de SP)
  const RANK_RIO_GESTORES = ['CARLOS EDUARDO FARIAS DA SILVA','FABIO FERREIRA DE AVELLAR','TBA RJ','BIANCA PEIXOTO LEITE'];
  // Gestores desligados — corretoras dela continuam na Carteira (não removidas mais, ver
  // parseCarteiraWorkbook) mas são excluídas por completo do fluxo de Corretoras bruto,
  // igual ao Rio: nem em time nenhum, nem em "não atribuído". Corrigido — antes, tirar
  // essas linhas direto da Carteira fazia o código achar "nem existe" pra esses códigos,
  // empurrando-os pro balde de "não atribuído" quando na real deveriam simplesmente sumir
  // (confirmado: a própria planilha manual de Victor também não conta essas vidas em lugar
  // nenhum do total, mesmo achando "Flavia Auana" pelo VLOOKUP).
  const GESTORES_DESLIGADOS = ['FLAVIA AUANA SILVA DE OLIVEIRA'];
  // Gestores do time "Interior" (Maria Aparecida Cabral) — existem no arquivo de Meta e na
  // Carteira, mas esse time não faz parte da diretoria da Fabyanna, fora do escopo deste
  // dash. Mesma exclusão total do Rio/Desligados: nem em time nenhum, nem em "não
  // atribuído".
  const INTERIOR_GESTORES = ['KAIQUE ARAUJO DA SILVA','DANIELA FREDERICO MARTINS CAMPINAS','DANIELA FREDERICO MARTINS AM'];
  // "VENDA INTERNA" (código "900", RAZAO SOCIAL "HAPVIDA" na Carteira) é o marcador
  // interno da própria Hapvida, nunca uma corretora — não faz parte dos números do dash.
  // Só dá pra excluir com segurança depois de corrigir a colisão "900"/"0900" em
  // normalizeCodigo (ver comentário lá) — sem isso, "900" parecia "ambíguo" com uma
  // corretora de verdade que só compartilhava os 3 primeiros dígitos.
  const VENDA_INTERNA_MARCADOR = 'VENDA INTERNA';
  function isOutOfScopeGestor(rawUp){
    return RANK_RIO_GESTORES.includes(rawUp) || GESTORES_DESLIGADOS.includes(rawUp) || INTERIOR_GESTORES.includes(rawUp) || rawUp === VENDA_INTERNA_MARCADOR;
  }
  // Correção manual confirmada por Victor pra um cadastro duplicado específico na Carteira
  // que nenhuma regra genérica acerta sozinha: código "0834" (IN COMPANY CORRETORA DE
  // SEGUROS LTDA ME, CNPJ 9616507000149) tem DUAS linhas — Flavia Auana (Interior) e Pablo
  // Amora (Cauda Longa). Confirmado contra o relatório real "NDI SP - Por Gestor": essa
  // corretora É da Flavia de verdade; a linha do Pablo pra esse CNPJ está errada, não deve
  // ser movida. Sem esse override, o "match" exato código+nome (carteira.map, que fica com
  // a ÚLTIMA linha processada) resolvia pro Pablo por acidente de ordem das linhas, não por
  // regra de negócio nenhuma. Checado ANTES de tudo em resolveGestorFromCarteira pra nem
  // passar pelo match exato.
  // 06GV (SIGO CONSULTING): mesmo código/CNPJ cadastrado pra duas corretoras diferentes na Carteira.
  // Victor decidiu em 2026-10-05: vai pra Vivian (bate com o RANKING ANUAL). 0834 continua Flavia.
  const CODIGO_GESTOR_OVERRIDE = { '0834': 'FLAVIA AUANA SILVA DE OLIVEIRA', '06GV': 'VIVIAN DE CASSIA AMBROSIO' };
  // Parser da base "NDI SP - Por Gestor" -> mapa código -> {t,ind,pim,mid,adm,n,g}
  function parseRankingWorkbook(workbook){
    // Fonte de VENDAS = aba EXPORT do relatório "NDI SP - Por Gestor" (mesma do Desempenho Comercial).
    // A aba BASE DE DADOS é cadastro/fallback — não é a fonte primária de venda.
    let sheet = null;
    for (const name of workbook.SheetNames){
      if (name.toUpperCase().indexOf('EXPORT') === 0){ sheet = workbook.Sheets[name]; break; }
    }
    if (!sheet){
      // fallback: BASE DE DADOS (mesma estrutura de colunas), caso o arquivo não tenha EXPORT
      for (const name of workbook.SheetNames){
        if (name.toUpperCase().indexOf('BASE DE DADOS') === 0){ sheet = workbook.Sheets[name]; break; }
      }
    }
    if (!sheet) throw new Error('Não encontrei a aba EXPORT (relatório NDI SP - Por Gestor) neste arquivo.');
    const rows = sheetRows(sheet);
    if (!rows.length) throw new Error('A aba de vendas está vazia.');

    // Detecta as colunas pelo CABEÇALHO — o layout varia entre meses
    // (ex.: se não houve venda em Administradora, o Excel omite essa coluna).
    const header = (rows[0] || []).map(h => String(h == null ? '' : h).toUpperCase().trim());
    const findCol = (...termos) => {
      for (let c = 0; c < header.length; c++){
        for (const t of termos){ if (header[c].indexOf(t) >= 0) return c; }
      }
      return -1;
    };
    const cCod   = findCol('CODIGO', 'CÓDIGO');
    const cNome  = findCol('CORRETORA');
    const cGest  = findCol('GESTOR');
    const cTot   = findCol('TOTAL');
    const cInd   = findCol('INDIVIDUAL');
    const cPim   = findCol('PIM');
    const cMid   = findCol('MIDDLE');
    const cAdm   = findCol('ADMINISTRADORA');
    if (cCod < 0 || cTot < 0){
      throw new Error('Não reconheci as colunas da aba de vendas (esperado "CODIGO" e "Total"). Cabeçalho encontrado: ' + header.filter(Boolean).slice(0,10).join(', '));
    }

    const agg = {};
    for (let i = 2; i < rows.length; i++){
      const row = rows[i] || [];
      const cod = row[cCod], nome = cNome >= 0 ? row[cNome] : '', gestor = cGest >= 0 ? row[cGest] : '';
      if (cod === null || cod === undefined || String(cod).trim() === '' || String(cod).indexOf('#') === 0) continue;
      const g = String(gestor || '').trim();
      if (RANK_RIO_GESTORES.includes(g)) continue;               // exclui Rio
      if (String(nome || '').toUpperCase().indexOf('HAPVIDA') >= 0) continue;  // exclui venda interna
      const k = String(cod).trim();
      if (!agg[k]) agg[k] = { c:k, n:String(nome||'').trim(), g, t:0, ind:0, pim:0, mid:0, adm:0 };
      agg[k].t   += num(row[cTot]);
      agg[k].ind += cInd >= 0 ? num(row[cInd]) : 0;
      agg[k].pim += cPim >= 0 ? num(row[cPim]) : 0;
      agg[k].mid += cMid >= 0 ? num(row[cMid]) : 0;
      agg[k].adm += cAdm >= 0 ? num(row[cAdm]) : 0;
    }
    const list = Object.values(agg).filter(r => r.t > 0);
    if (!list.length) throw new Error('Nenhuma venda válida encontrada na base de ranking.');
    return list;
  }

  function normalizeName(s){ return String(s).trim().toUpperCase().replace(/\s+/g,' '); }

  function extractEligibilidadeDataFromExport(workbook){
    const sheet = findSheet(workbook, 'EXPORT');
    if (!sheet) return null;
    const rows = sheetRows(sheet);
    const header = (rows[0]||[]).map(h => String(h||'').trim().toUpperCase());
    const findCol = needle => header.findIndex(h => h.indexOf(needle) === 0);
    const iCodigo = findCol('CODIGO');
    const iCorretora = findCol('CORRETORA');
    const iGestor = findCol('GESTOR');
    const iInd = findCol('01-INDIVIDUAL');
    const iSs = findCol('02-PIM');
    const iPme = findCol('03-MIDDLE');
    const iAdm = findCol('07-ADMINISTRADORA');
    const iTotal = findCol('TOTAL');
    if (iCodigo < 0 || iGestor < 0) return null;
    const num = v => { const n = parseFloat(String(v==null?'0':v).replace(',','.')); return isNaN(n) ? 0 : n; };
    const byGestor = {};
    for (let i = 1; i < rows.length; i++){
      const row = rows[i] || [];
      const codigo = row[iCodigo];
      if (!codigo) continue;
      const gestorRaw = row[iGestor] ? String(row[iGestor]).trim().toUpperCase() : '';
      const friendly = FULL_19_GESTOR_RAW_MAP[gestorRaw] || null;
      if (!friendly) continue;
      const entry = {
        c: String(codigo).trim(),
        n: row[iCorretora] ? String(row[iCorretora]).trim() : '',
        ind: iInd>=0 ? num(row[iInd]) : 0, ss: iSs>=0 ? num(row[iSs]) : 0, pme: iPme>=0 ? num(row[iPme]) : 0, adm: iAdm>=0 ? num(row[iAdm]) : 0,
        total: (iInd>=0 ? num(row[iInd]) : 0) + (iSs>=0 ? num(row[iSs]) : 0) + (iPme>=0 ? num(row[iPme]) : 0),
      };
      if (!byGestor[friendly]) byGestor[friendly] = { corretoras: [] };
      byGestor[friendly].corretoras.push(entry);
    }
    return byGestor;
  }

  // Códigos numéricos "puros" (ex.: "0002") ficam gravados como número no Excel da Carteira,
  // perdendo o zero à esquerda ("2") — enquanto no extrato bruto o código sempre chega como
  // texto, com o zero. Sem normalizar os dois lados pro mesmo formato antes de comparar, um
  // monte de código que na verdade existe na Carteira caía em "sem gestor" por engano.
  function normalizeCodigo(v){
    // Códigos de corretora de verdade sempre têm 4 caracteres (ex.: "0002", "03BL", "9560").
    // Números guardados como célula numérica de verdade (Excel perde o zero à esquerda no
    // valor bruto, ex.: célula "2" exibida como "0002" só por formatação) precisam ser
    // preenchidos de volta pra 4 dígitos pra bater com o texto sempre-preenchido do extrato
    // do BI ("0002").
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return String(Math.trunc(v)).padStart(4, '0');
    // Só isso — NÃO usar parseInt/stripar zero à esquerda de strings. Código "900" (HAPVIDA,
    // venda interna) e "0900" (MAXDALA CONSULTORIA, corretora de verdade) são DOIS registros
    // diferentes na Carteira, ambos já guardados como texto — stripar o zero de "0900" os
    // transformava no mesmo código "900", fazendo o motor achar (errado) que "900" tinha dois
    // "candidatos" quando na real são corretoras completamente diferentes, sem relação
    // nenhuma. "900" (3 dígitos, sem padding) é a única exceção de propósito — marcador
    // interno da Hapvida, nunca uma corretora — e deve continuar distinto de qualquer código
    // de 4 dígitos.
    return String(v).trim().toUpperCase();
  }
  window.normalizeCodigo = normalizeCodigo;

  function parseCarteiraWorkbook(workbook){
    const sheet = findSheet(workbook, 'COMERCIAL');
    if (!sheet) throw new Error('Não encontrei a aba "COMERCIAL" no arquivo da Carteira.');
    const rows = sheetRows(sheet);
    const map = {}; const byCodigo = {};
    let count = 0;
    for (let i = 1; i < rows.length; i++){
      const row = rows[i] || [];
      const codigo = row[1], razao = row[2], gestorRaw = row[3], filial = row[4], equipe = row[5], codAss = row[6], assessoria = row[7], senior = row[9];
      if (!codigo || !razao) continue;
      const codNorm = normalizeCodigo(codigo);
      const key = codNorm + '|' + normalizeName(razao);
      // codAss/assessoria (colunas H/I): quando essa corretora é atendida por uma
      // assessoria (outra corretora que serve de intermediária pro gestor dela — caso
      // real F8, código 0540, achado 2026-09-04), pra alimentar o Comparativo →
      // Assessorias com a diretoria inteira (ver updateRankingData/cmpAggregateAssessorias).
      const codAssNorm = (codAss && String(codAss).trim() && String(codAss).trim() !== '0') ? normalizeCodigo(codAss) : '';
      const entry = { gestorRaw: gestorRaw ? String(gestorRaw).trim() : '', equipe: equipe ? String(equipe).trim() : '', senior: senior ? String(senior).trim() : '', filial: filial ? String(filial).trim() : '', razao: String(razao).trim(), codAss: codAssNorm, assessoria: (assessoria && String(assessoria).trim() !== '0') ? String(assessoria).trim() : '' };
      map[key] = entry;
      (byCodigo[codNorm] = byCodigo[codNorm] || []).push(entry);
      count++;
    }
    if (count === 0) throw new Error('Nenhuma linha válida encontrada na aba COMERCIAL.');
    return { map, byCodigo, totalRows: count };
  }

  function resolveGestorFromCarteira(record, carteira, preferTeam){
    const codNorm = normalizeCodigo(record.c);
    const candidates = carteira.byCodigo[codNorm];
    if (CODIGO_GESTOR_OVERRIDE[codNorm] && candidates && candidates.length){
      const forced = candidates.find(c => c.gestorRaw && c.gestorRaw.trim().toUpperCase() === CODIGO_GESTOR_OVERRIDE[codNorm]);
      if (forced) return forced;
    }
    const key = codNorm + '|' + normalizeName(record.n);
    if (carteira.map[key]) return carteira.map[key];
    if (!candidates || !candidates.length) return null;
    if (candidates.length === 1) return candidates[0];
    if (preferTeam){
      const preferred = candidates.find(c => c.equipe && c.equipe.toUpperCase().indexOf(preferTeam) === 0);
      if (preferred) return preferred;
    }
    // Quando o preferTeam não acha ninguém, sobra decidir o que fazer com múltiplos
    // candidatos "ruins" (Rio/Desligado/Interior/Venda Interna). Se depois de tirar todo
    // mundo fora de escopo sobrar exatamente UM candidato, não tem mais ambiguidade real,
    // retorna ele. Se sobrar zero ou mais de um, continua null — não adivinha.
    const validos = candidates.filter(c => {
      const up = c.gestorRaw ? c.gestorRaw.trim().toUpperCase() : '';
      return !isOutOfScopeGestor(up);
    });
    if (validos.length === 1) return validos[0];
    return null;
  }

  function parseCorretorasRawWorkbook(workbook, carteiraOverride){
    const sheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'EXPORT') || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = sheetRows(sheet);
    const header = (rows[0]||[]).map(h => String(h||'').trim().toUpperCase());
    const findCol = needle => header.findIndex(h => h.indexOf(needle) === 0);
    const iCanal = findCol('CANAL'), iInd = findCol('01-INDIVIDUAL'), iSs = findCol('02-PIM'), iPme = findCol('03-MIDDLE'), iAdm = findCol('07-ADMINISTRADORA');
    const iTotal = header.indexOf('TOTAL');
    if (iCanal < 0 || iInd < 0 || iSs < 0 || iPme < 0 || iTotal < 0) throw new Error('A aba não tem as colunas esperadas do relatório de corretoras (Canal, Individual, PIM, Middle, Total).');

    const carteira = carteiraOverride || window.CARTEIRA_MAP || null;
    const agg = {};
    // Mês real do extrato — achado 2026-09-14 (Victor: "o próprio extrato já mostra qual é o
    // mês... se você reparar no final, ele informa"). O bloco "Filtros aplicados:" que o BI
    // sempre deixa na última linha da aba EXPORT (junto com a linha "Total" de rodapé) já era
    // descartado aqui, tratado só como lixo — mas ele traz "Date é DD/MM/AAAA" (o dia da
    // grade/competência usada pra gerar o relatório), a mesma informação que o "NDI SP - Por
    // Gestor" completo só tem via nome de aba. Sem isso, upload só do extrato bruto (sem o
    // "NDI SP - Por Gestor" inteiro) nunca sabia de verdade qual mês estava corrigindo — só
    // dava pra chutar pelo calendário (ver applyCorretorasToEligibilidade), o que Victor
    // apontou como o motivo de precisar reanexar a planilha completa toda vez pra Elegibilidade
    // bater 100% durante a janela de fechamento da grade (até o dia 10).
    let detectedMonth = null;
    for (let i = 2; i < rows.length; i++){
      const row = rows[i] || [];
      const canal = row[iCanal];
      if (!canal) continue;
      const canalTxt = String(canal).trim();
      // Pula a linha de rodapé "Total" e o bloco de texto dos filtros aplicados que o BI
      // sempre deixa embaixo da última corretora — sem essa checagem, os dois viravam
      // "corretoras" fantasmas sem gestor, inflando muito o total de vidas não atribuídas
      // (a linha "Total" sozinha somava as vidas de TODAS as corretoras de novo).
      if (/^total$/i.test(canalTxt) || canalTxt.length > 100){
        if (!detectedMonth){
          const m = canalTxt.match(/Date\s*é\s*(\d{2})\/(\d{2})\/(\d{4})/i);
          if (m) detectedMonth = m[3] + '-' + m[2]; // "AAAA-MM", mesmo formato de detectMetaMonth
        }
        continue;
      }
      const parts = canalTxt.split('-').map(s=>s.trim());
      const codigo = parts[0];
      if (!codigo) continue;
      const filial = parts.length >= 3 ? parts[parts.length-2] : '';
      const nome = parts.length >= 3 ? parts.slice(1, parts.length-2).join('-').trim() : (parts[1]||'').trim();
      if (!agg[codigo]) agg[codigo] = {nome, filiais:new Set(), ind:0, ss:0, pme:0, adm:0, total:0};
      agg[codigo].ind += num(row[iInd]);
      agg[codigo].ss += num(row[iSs]);
      agg[codigo].pme += num(row[iPme]);
      agg[codigo].adm += iAdm>=0 ? num(row[iAdm]) : 0;
      agg[codigo].total += num(row[iInd]) + num(row[iSs]) + num(row[iPme]);
      if (filial) agg[codigo].filiais.add(filial);
    }
    const resultado = attributeCorretorasAgg(agg, carteira);
    resultado.detectedMonth = detectedMonth;
    return resultado;
  }

  // Atribuição corretora → executivo (Carteira). Separada do parser pra a visão por trimestre
  // reaproveitar a MESMA regra com os extratos de Jan–Set embutidos no código (INT_CODE_SEED).
  // agg: { código: {nome, filiais:Set, ind, ss, pme, adm, total} }
  function attributeCorretorasAgg(agg, carteira){
    const byGestor = {};
    let semGestorCount = 0, semGestorVidas = 0;
    // Quebra por categoria de quem ficou sem gestor — pra alimentar o mesmo "balde" de
    // não-atribuído que a Visão Geral mostra (MJ_NAO_ATRIBUIDO_BY_MONTH). Sem isso, importar
    // só o extrato bruto (sem a planilha "NDI SP - Por Gestor" inteira) deixava esse número
    // parado no valor do último import manual.
    const semGestorCat = {ind:0, ss:0, pme:0, adm:0};
    Object.keys(agg).forEach(codigo => {
      const c = agg[codigo];
      let friendly = null;
      if (carteira){
        // Prefere CAUDA LONGA quando o código aparece mais de uma vez na Carteira (mesmo
        // código usado por corretoras diferentes em times diferentes) — mesma regra já
        // aplicada em diffCarteira/applyCarteira.
        const r = resolveGestorFromCarteira({c: codigo, n: c.nome}, carteira, 'CAUDA LONGA');
        if (r && r.gestorRaw){
          const rawUp = r.gestorRaw.trim().toUpperCase();
          // Gestores do Rio de Janeiro, desligados ou do time "Interior" (fora da diretoria
          // da Fabyanna) não contam como "sem gestor": são vendas de verdade, só que de fora
          // do escopo deste dashboard, e não devem aparecer nem no Integrado nem no "código
          // não localizado".
          if (isOutOfScopeGestor(rawUp)) return;
          friendly = FULL_19_GESTOR_RAW_MAP[rawUp] || null;
        } else {
          // r veio null: pode ser "código não existe na Carteira" OU "existe, mas todo mundo
          // que aparece pra esse código é Rio/Desligado/Interior". Só cai em "não atribuído"
          // de verdade quando sobra pelo menos um candidato de dentro do escopo (ambíguo
          // entre times, por ex.) ou quando o código simplesmente não existe na Carteira.
          const candidatosDoCodigo = carteira.byCodigo[normalizeCodigo(codigo)];
          if (candidatosDoCodigo && candidatosDoCodigo.length &&
              candidatosDoCodigo.every(cd => cd.gestorRaw && isOutOfScopeGestor(cd.gestorRaw.trim().toUpperCase()))){
            return;
          }
        }
      }
      if (!friendly){
        // Chegou aqui só quando o código EXISTE na Carteira (dentro do escopo NDI SP) mas
        // não deu pra achar um gestor de verdade — esse sim é "sem gestor" de verdade
        // (cadastro incompleto na Carteira).
        semGestorCount++; semGestorVidas += c.total;
        semGestorCat.ind += c.ind; semGestorCat.ss += c.ss; semGestorCat.pme += c.pme; semGestorCat.adm += c.adm;
        return;
      }
      if (!byGestor[friendly]) byGestor[friendly] = { ind:0, ss:0, pme:0, adm:0, total:0, corretoras:[] };
      byGestor[friendly].ind += c.ind; byGestor[friendly].ss += c.ss; byGestor[friendly].pme += c.pme; byGestor[friendly].adm += c.adm; byGestor[friendly].total += c.total;
      const filialLabel = c.filiais.size > 1 ? `Diversas (${c.filiais.size})` : ([...c.filiais][0]||'');
      byGestor[friendly].corretoras.push({c: codigo, n: c.nome, ind:c.ind, ss:c.ss, pme:c.pme, total:c.total, filial: filialLabel});
    });
    Object.values(byGestor).forEach(g => g.corretoras.sort((a,b)=>b.total-a.total));

    return { byGestor, semGestorCount, semGestorVidas, semGestorCat, hasCarteira: !!carteira };
  }
  // Usados pelo módulo "Metas por executivo" (fim do arquivo): ler extratos de MESES PASSADOS sem
  // passar por updateIntegradoFromRaw (que sempre grava no mês ativo) e atribuir o seed embutido.
  window.parseCorretorasRawWorkbook = parseCorretorasRawWorkbook;
  window.attributeCorretorasAgg = attributeCorretorasAgg;

  // Achata o resultado de parseCorretorasRawWorkbook pro formato que updateRankingData
  // espera — assim o upload do extrato bruto (sem o arquivo "NDI SP - Por Gestor" inteiro)
  // também atualiza o Ranking de Vendas, não só Desempenho Comercial/Elegibilidade.
  function corretorasRawToRankList(byGestor){
    const list = [];
    Object.keys(byGestor).forEach(g => {
      byGestor[g].corretoras.forEach(c => {
        list.push({c: c.c, n: c.n, g: g, t: c.total, ind: c.ind, pim: c.ss, mid: c.pme, adm: 0});
      });
    });
    return list;
  }

  function diffCorretorasRaw(parsed){
    const gestorCount = Object.keys(parsed.byGestor).length;
    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-chart></i> Corretoras (bruto) — Resumo</h3>';
    html += '<div style="font-size:12.5px;line-height:1.8;">';
    html += `<div><b>Meta não é alterada</b> — só o Integrado (realizado) é atualizado.</div>`;
    html += `<div>Integrado atualizado para <b>${gestorCount}</b> gestores.</div>`;
    if (window.getEligibilidadeData){
      const codigosArquivo = new Set();
      Object.values(parsed.byGestor).forEach(g => (g.corretoras||[]).forEach(c => codigosArquivo.add(normalizeCodigo(c.c))));
      const eligData = window.getEligibilidadeData();
      const matchCount = eligData.filter(d => codigosArquivo.has(normalizeCodigo(d.c))).length;
      // Mostra de antemão QUAL mês vai receber a correção — achado 2026-09-14 (Victor pediu
      // mais clareza sobre a distribuição por mês, depois corrigiu que o extrato SIM informa
      // o mês real — ver "Date é DD/MM/AAAA" no rodapé, lido agora em parseCorretorasRawWorkbook
      // e devolvido em parsed.detectedMonth). Antes dizia "Julho" fixo, sempre, não importa o
      // mês real. Usa o mês real quando o rodapé trouxe um; só cai no mesmo chute de calendário
      // que applyCorretorasToEligibilidade usa (dia 1-10 mira no mês anterior, dia 11+ no
      // corrente) se por algum motivo esse mês não veio no arquivo.
      let mesIdxPreview;
      if (parsed.detectedMonth){
        const parts = parsed.detectedMonth.split('-');
        mesIdxPreview = (Number(parts[0]) - 2025) * 12 + (Number(parts[1]) - 1);
      } else {
        const gNow = new Date();
        let gY = gNow.getFullYear(), gM = gNow.getMonth() + 1;
        if (gNow.getDate() <= 10){ gM -= 1; if (gM < 1){ gM = 12; gY -= 1; } }
        mesIdxPreview = (gY - 2025) * 12 + (gM - 1);
      }
      // Calcula o rótulo direto (não só olha MONTH_LABELS) — o mês pode ainda não ter coluna
      // na planilha nesse momento da prévia; applyCorretorasToEligibilidade abre a coluna
      // sozinho na hora de confirmar (ver comentário lá, 2026-09-17), então a prévia precisa
      // mostrar o nome certo mesmo antes disso acontecer, em vez do genérico "mês corrente".
      const mesLabelPreview = (mesIdxPreview >= 0 && typeof buildMonthLabels === 'function')
        ? buildMonthLabels(mesIdxPreview + 1)[mesIdxPreview] : 'mês corrente';
      html += `<div>Elegibilidade — histórico de <b>${mesLabelPreview}</b> será gravado em <b>${matchCount}</b> das ${eligData.length} corretoras (Cauda Longa).</div>`;
    }
    if (!parsed.hasCarteira){
      html += `<div style="color:var(--red);"><i class=ic-warn></i> Carteira não carregada nesta sessão — nenhuma corretora pôde ser vinculada a gestor. Carregue o arquivo da Carteira junto para resolver.</div>`;
    } else if (parsed.semGestorCount > 0){
      html += `<div style="color:var(--amber);">${parsed.semGestorCount} corretoras não encontradas na Carteira (${fmtN(parsed.semGestorVidas)} vidas) — ficaram de fora do agregado.</div>`;
    }
    html += '</div>';
    return html;
  }

  function diffCarteira(carteira, baseData){
    const current = baseData || window.getEligibilidadeData();
    const semGestor = current.filter(d => d.g === 'Sem Gestor Atribuído');
    let resolved = 0;
    const resolvedNames = [];
    semGestor.forEach(d => {
      const r = resolveGestorFromCarteira(d, carteira, 'CAUDA LONGA');
      const friendly = r && r.gestorRaw ? (CL_GESTORES_RAW[r.gestorRaw] || null) : null;
      if (friendly){ resolved++; resolvedNames.push(`${d.n} → ${friendly}`); }
    });
    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-clip></i> Carteira — Resumo</h3>';
    html += '<div style="font-size:12.5px;line-height:1.8;">';
    html += `<div>${carteira.totalRows.toLocaleString('pt-BR')} vínculos código→gestor carregados (todos os times NDI SP).</div>`;
    html += `<div>Corretoras sem gestor identificado hoje: <b>${semGestor.length}</b></div>`;
    html += `<div>Resolvidas com esta Carteira: <b style="color:var(--green)">${resolved}</b></div>`;
    html += `<div>Continuam sem correspondência: <b style="color:${semGestor.length-resolved>0?'var(--red)':'var(--green)'}">${semGestor.length-resolved}</b></div>`;
    if (window.detectNewCorretorasCaudaLonga){
      const novas = window.detectNewCorretorasCaudaLonga(carteira, true);
      if (novas.length){
        html += `<div style="color:var(--blue); margin-top:6px;"><i class=ic-new></i> <b>${novas.length}</b> corretora(s) nova(s) do Cauda Longa identificada(s) — serão adicionadas à Elegibilidade com histórico zerado, prontas para receber a venda do mês corrente.</div>`;
      } else {
        html += `<div style="color:var(--muted); margin-top:6px;">Nenhuma corretora nova identificada para o Cauda Longa nesta Carteira.</div>`;
      }
    }
    html += '</div>';
    if (resolvedNames.length){
      html += `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--blue);">Ver corretoras resolvidas</summary><ul style="font-size:12px;margin:6px 0 0 18px;">`;
      resolvedNames.forEach(n => html += `<li>${n}</li>`);
      html += '</ul></details>';
    }
    return html;
  }

  function applyCarteira(carteira){
    window.CARTEIRA_MAP = carteira;
    const current = window.getEligibilidadeData();
    const patched = current.map(d => {
      if (d.g !== 'Sem Gestor Atribuído') return d;
      const r = resolveGestorFromCarteira(d, carteira, 'CAUDA LONGA');
      const friendly = r && r.gestorRaw ? (CL_GESTORES_RAW[r.gestorRaw] || null) : null;
      return friendly ? Object.assign({}, d, {g: friendly}) : d;
    });
    window.updateEligibilidadeData(patched);
    if (window.detectNewCorretorasCaudaLonga) window.detectNewCorretorasCaudaLonga(carteira, false);
  }

  const ABREV_GESTOR_MAP = {
    'CAMILA PERTINHEZ': 'Camila Alves Pertinhez', 'ERIKA SOUZA': 'Erika de Sousa Silva',
    'LAIS MARTINS': 'Lais dos Santos Martins', 'VIVIAN AMBROSIO': 'Vivian de Cassia Ambrosio',
    'WILDER PATZI': 'Wilder Coca Patzi', 'PABLO AMORA': 'Pablo Amora', 'JONATHAN LEAL': 'Jonathan Leal',
    'KAROLLAINNY LOPES': 'Karollainny Rangel de Sousa Lopes', 'PATRICIA PESSOA': 'Patricia Monks',
    'DANIELA FREDERICO CAMPINAS': 'Daniela Frederico Martins (Campinas)', 'AGATHA SAKAMOTO': 'Agatha Sakamoto',
    'GUILHERME MUSACHI': 'Guilherme de Lima Musachi', 'FLAVIA AUANA': 'Flavia Auana Silva de Oliveira',
    'KAIQUE SILVA': 'Kaique Araujo da Silva', 'AMANDA SOBRAL': 'Amanda dos Santos Sobral',
    'DANIELA NOVAIS': 'Daniela Novais dos Santos', 'MAXUEL NOBREGA': 'Maxuel Pimentel Nobrega',
    'DANIELA FREDERICO AM': 'Daniela Frederico Martins (AM)',
    'IZABELE LAURENTINO': 'Izabele de Oliveira da Silva',
  };
  const PENDENCIA_STATUS_PF = ['PENDENTE','Pendente de auditoria médica','AUDITORIA MEDICA','VALIDO E AUSENTE CRITICA','Validos com dados divergentes','CONFIRMACAO CLIENTE'];

  function excelDateToStr(v){
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date) return v.toISOString().slice(0,10);
    if (typeof v === 'number'){
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return d.toISOString().slice(0,10);
    }
    return String(v).slice(0,10);
  }

  function parsePmePendenciasWorkbook(workbook){
    const sheet = findSheet(workbook, 'Planilha1');
    if (!sheet) throw new Error('Não encontrei a aba "Planilha1" no arquivo de Pendências PME/SS.');
    const rows = sheetRows(sheet);
    const header = (rows[0]||[]).map(h => String(h||'').trim().toUpperCase());
    const idx = name => header.indexOf(name);
    const iProposta = idx('PROPOSTA'), iGestor = idx('GESTOR'), iBenef = idx('BENEFICIARIOS'),
          iDataReceb = idx('DATA RECEBIMENTO'), iDataVig = idx('DATA VIGÊNCIA'), iPlanium = idx('PLANIUM'), iCorretora = idx('CORRETORA'),
          iCadastro = idx('CADASTRO'), iDitec = idx('DITEC'), iBitix = idx('BITIX');
    if ([iProposta,iGestor,iPlanium,iCorretora].some(i=>i<0)) throw new Error('A aba "Planilha1" não tem as colunas esperadas (PROPOSTA, GESTOR, PLANIUM, CORRETORA).');
    const pickStatuses = (row) => ({
      planium: iPlanium>=0 ? String(row[iPlanium]||'').trim() : '',
      cadastro: iCadastro>=0 ? String(row[iCadastro]||'').trim() : '',
      ditec: iDitec>=0 ? String(row[iDitec]||'').trim() : '',
      bitix: iBitix>=0 ? String(row[iBitix]||'').trim() : '',
    });

    const data = {};
    const naoMapeados = {};
    for (let i = 1; i < rows.length; i++){
      const row = rows[i] || [];
      const gestorAbrev = row[iGestor];
      if (!gestorAbrev) continue;
      const gestorKey = String(gestorAbrev).trim().toUpperCase();
      const friendly = FULL_19_GESTOR_RAW_MAP[gestorKey] || ABREV_GESTOR_MAP[gestorKey];
      if (!friendly){ naoMapeados[gestorAbrev] = (naoMapeados[gestorAbrev]||0)+1; continue; }
      (data[friendly] = data[friendly] || []).push({
        proposta: String(row[iProposta]||''), corretora: String(row[iCorretora]||''),
        status: pickStatuses(row), dataReceb: excelDateToStr(row[iDataReceb]),
        dataVigencia: excelDateToStr(row[iDataVig]), beneficiarios: num(row[iBenef]),
      });
    }
    if (Object.keys(data).length === 0) throw new Error('Nenhuma pendência PME/SS reconhecida — verifique se os nomes de gestor mudaram de formato.');
    return { data, naoMapeados };
  }

  // Aba "PLANIUM" do MESMO arquivo de Pendências PME/SS — é o histórico completo de propostas
  // (todas, não só as pendentes), fonte real da lista usada no Ranking de Vendas → popup da
  // corretora → "Baixar relatório". Sem isso, essa lista nunca era atualizada pelo fluxo normal
  // de "Atualizar Dados" e ficava congelada desde a primeira vez que o site foi publicado —
  // corretoras podiam mostrar pendência "sumida" (na verdade só desatualizada).
  function parsePlaniumWorkbook(workbook){
    const sheet = findSheet(workbook, 'PLANIUM');
    if (!sheet) throw new Error('Não encontrei a aba "PLANIUM" no arquivo de Pendências PME/SS.');
    const rows = sheetRows(sheet);
    // Diferente da "Planilha1" (cabeçalho na linha 1), aqui a linha 1 vem em branco e o
    // cabeçalho real fica na linha 2 — por isso procura a linha certa em vez de assumir rows[0].
    const headerRowIdx = rows.findIndex(r => (r||[]).some(c => String(c||'').trim().toLowerCase() === 'oper_propnum'));
    if (headerRowIdx < 0) throw new Error('A aba "PLANIUM" não tem as colunas esperadas.');
    const header = rows[headerRowIdx].map(h => String(h||'').trim());
    const idx = name => header.indexOf(name);
    const iProp = idx('oper_propnum'), iCn = idx('contratante_cnpj'), iEm = idx('contratante_nome'),
          iVg = idx('date_vigencia'), iSt = idx('status'), iBn = idx('beneficiarios'),
          iVd = idx('vendedor_nome'), iCo = idx('corretora_nome'), iGe = idx('GESTOR'), iDr = idx('DATA RECEBIMENTO'),
          iDi = idx('DITEC'), iCa = idx('CADASTRO');
    if ([iProp,iEm,iVg,iSt,iBn,iCo].some(i=>i<0)) throw new Error('A aba "PLANIUM" não tem as colunas esperadas (oper_propnum, contratante_nome, date_vigencia, status, beneficiarios, corretora_nome).');
    const fmtCnpj = v => {
      if (v === null || v === undefined || v === '') return '';
      const digits = String(v).replace(/\D/g,'').padStart(14,'0');
      return digits.length===14 ? `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12,14)}` : String(v);
    };
    const propostas = [];
    for (let i = headerRowIdx+1; i < rows.length; i++){
      const row = rows[i] || [];
      const p = row[iProp], co = row[iCo];
      if (!p || !co) continue; // linha vazia ou sem corretora vinculada
      propostas.push({
        p: String(p), cn: fmtCnpj(row[iCn]), em: String(row[iEm]||''),
        vg: excelDateToStr(row[iVg]), st: String(row[iSt]||'').trim(),
        bn: num(row[iBn]), vd: String(row[iVd]||''), co: String(co).trim(),
        // Campos novos (SLA/Conversão por executivo) — opcionais, não quebram nada que já
        // consumia esse array antes deles existirem.
        g: iGe>=0 ? String(row[iGe]||'').trim() : '',
        dr: iDr>=0 ? excelDateToStr(row[iDr]) : '',
        // DITEC/CADASTRO — o Planium já tem essas duas colunas (só BITIX que não existe
        // aqui, só na Planilha1). Usado pra reconciliarPendenciasComPropostas mostrar em
        // qual etapa a proposta está parada, em vez de deixar em branco.
        di: iDi>=0 ? String(row[iDi]||'').trim() : '',
        ca: iCa>=0 ? String(row[iCa]||'').trim() : '',
      });
    }
    if (!propostas.length) throw new Error('Nenhuma proposta reconhecida na aba "PLANIUM".');
    return propostas;
  }
  function diffPropostas(list){
    const keyOf = st => {
      const v = String(st||'').toLowerCase();
      if (v.indexOf('implant') >= 0) return 'Implantada';
      if (v.indexOf('pend') >= 0) return 'Pendência';
      if (v.indexOf('devolv') >= 0) return 'Devolvida';
      if (v.indexOf('analis') >= 0 || v.indexOf('anális') >= 0) return 'Em análise';
      if (v.indexOf('cancel') >= 0) return 'Cancelada';
      return 'Outros';
    };
    const porStatus = {};
    list.forEach(p => { const k = keyOf(p.st); porStatus[k] = (porStatus[k]||0)+1; });
    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-trophy></i> Propostas (Ranking de Vendas) — Resumo</h3>';
    html += `<div style="font-size:12.5px;line-height:1.8;"><div><b>${list.length}</b> propostas carregadas — ${Object.entries(porStatus).map(([k,v])=>`${k}: <b>${v}</b>`).join(' · ')}.</div></div>`;
    return html;
  }

  const FULL_19_GESTOR_RAW_MAP = {
    'AGATHA EIKO RODRIGUES SAKAMOTO':'Agatha Sakamoto','PATRICIA PESSOA MONKS':'Patricia Monks',
    'JONATHAN LEAL DOS SANTOS SILVA':'Jonathan Leal','PABLO SERGIO RIBEIRO AMORA':'Pablo Amora',
    'WILDER COCA PATZI':'Wilder Coca Patzi','LAIS DOS SANTOS MARTINS':'Lais dos Santos Martins',
    'CAMILA ALVES PERTINHEZ':'Camila Alves Pertinhez','ERIKA DE SOUSA SILVA':'Erika de Sousa Silva',
    'IZABELE DE OLIVEIRA DA SILVA':'Izabele de Oliveira da Silva','VIVIAN DE CASSIA AMBROSIO':'Vivian de Cassia Ambrosio',
    'GUILHERME DE LIMA MUSACHI':'Guilherme de Lima Musachi',
    'KAROLLAINNY RANGEL DE SOUSA LOPES':'Karollainny Rangel de Sousa Lopes','AMANDA DOS SANTOS SOBRAL':'Amanda dos Santos Sobral',
    'DANIELA NOVAIS DOS SANTOS':'Daniela Novais dos Santos','MAXUEL PIMENTEL NOBREGA':'Maxuel Pimentel Nobrega',
    'DANIELA FREDERICO MARTINS CAMPINAS':'Daniela Frederico Martins (Campinas)','DANIELA FREDERICO MARTINS AM':'Daniela Frederico Martins (AM)',
    'KAIQUE ARAUJO DA SILVA':'Kaique Araujo da Silva','FLAVIA AUANA SILVA DE OLIVEIRA':'Flavia Auana Silva de Oliveira',
    'AGATHA AMARAL RIBEIRO':'Agatha Amaral Ribeiro'
  };
  // Exposto pra outras views converterem nome cru da planilha ("PABLO SERGIO RIBEIRO
  // AMORA", como o PLANIUM/Conversão usa) pro nome bonito ("Pablo Amora", como
  // PENDENCIAS_PME/PF são gravadas) — ver window.showPendenciasModal.
  window.getGestorFriendlyName = function(raw){
    const key = String(raw||'').trim().toUpperCase();
    return FULL_19_GESTOR_RAW_MAP[key] || ABREV_GESTOR_MAP[key] || raw;
  };

  function parsePfPendenciasWorkbook(workbook){
    const sheet = findSheet(workbook, '2026_ORCAMENTOS') || findSheet(workbook, 'ORCAMENTOS');
    if (!sheet) throw new Error('Não encontrei a aba de orçamentos no arquivo PF.');
    const rows = sheetRows(sheet);
    const header = (rows[0]||[]).map(h => String(h||'').trim().toUpperCase());
    const idx = name => header.indexOf(name);
    const iConc = idx('CONCESSIONÁRIA'), iGestor = idx('GESTOR'), iStatus = idx('STATUS ORÇAMENTO'),
          iOrcamento = idx('Nº ORÇAMENTO'), iDataStatus = idx('DATA STATUS'), iVidas = idx('QTDE VIDAS');
    if ([iConc,iGestor,iStatus,iOrcamento].some(i=>i<0)) throw new Error('A aba de orçamentos não tem as colunas esperadas.');

    const data = {};
    for (let i = 1; i < rows.length; i++){
      const row = rows[i] || [];
      const status = row[iStatus];
      if (!status) continue;
      const gestorRaw = row[iGestor];
      if (!gestorRaw) continue;
      const friendly = FULL_19_GESTOR_RAW_MAP[String(gestorRaw).trim().toUpperCase()];
      if (!friendly) continue;
      const concStr = String(row[iConc]||'');
      const nomeLimpo = concStr.split('-').slice(1).join('-').trim();
      (data[friendly] = data[friendly] || []).push({
        orcamento: String(row[iOrcamento]||'').replace(/\.0$/,''), corretora: nomeLimpo,
        status: String(status).trim(), dataStatus: excelDateToStr(row[iDataStatus]), vidas: num(row[iVidas]),
      });
    }
    if (Object.keys(data).length === 0) throw new Error('Nenhuma pendência PF reconhecida no arquivo.');
    return { data };
  }

  // "datacriacao" vem como texto "dd/mm/aaaa hh:mm" (não é data real do Excel, é string
  // crua do export) — excelDateToStr sozinha não dá conta desse formato (ela só reconhece
  // Date/serial/"aaaa-mm-dd..."), por isso um conversor à parte aqui.
  function assinaturaDateToStr(v){
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date) return v.toISOString().slice(0,10);
    if (typeof v === 'number'){
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return d.toISOString().slice(0,10);
    }
    const s = String(v).trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return s.slice(0,10);
  }
  // Formata CNPJ (14 dígitos) ou CPF (11 dígitos) pro padrão brasileiro — pedido do Victor,
  // 2026-09-09: "é interessante aparecer o CNPJ do contratante, pra que os executivos possam
  // localizar no sistema". Um único helper pros dois formatos porque o arquivo real
  // (stats_export_gndi) traz "contratante_cnpj" e "contratante_cpf" como colunas separadas —
  // contrato PJ preenche uma, contrato PF preenche a outra (confirmado no arquivo real de
  // 09/09: linha de exemplo com "contrato":"pj" tinha as duas colunas não-vazias, então não dá
  // pra assumir "só uma delas sempre vem vazia" — o CNPJ é preferido quando os dois vêm, já que
  // foi o que o Victor pediu, mas cai pro CPF se só ele existir).
  function formatCnpjCpf(v){
    const digits = String(v==null?'':v).replace(/\D/g,'');
    if (!digits) return '';
    if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return digits; // formato inesperado (nem 11 nem 14 dígitos) — mostra cru em vez de escondido
  }
  function parseAssinaturaWorkbook(workbook){
    const sheet = findSheet(workbook, 'stats_export_gndi');
    if (!sheet) throw new Error('Não encontrei a aba "stats_export_gndi..." no arquivo de Aguardando Assinatura.');
    const rows = sheetRows(sheet);
    const header = (rows[0]||[]).map(h => String(h||'').trim());
    const idx = name => header.indexOf(name);
    const iAlvo = idx('alvo'), iGestor = idx('GESTOR'), iCorretora = idx('CORRETORA'),
          iData = idx('datacriacao'), iBenef = idx('beneficiarios'), iContratante = idx('contratante_nome'),
          iCnpj = idx('contratante_cnpj'), iCpf = idx('contratante_cpf');
    if ([iAlvo,iGestor].some(i=>i<0)) throw new Error('A aba não tem as colunas esperadas ("alvo", "GESTOR") — confirme que já rodou o cruzamento de GESTOR/CORRETORA antes de subir este arquivo.');
    const data = {};
    for (let i = 1; i < rows.length; i++){
      const row = rows[i] || [];
      const gestorRaw = row[iGestor];
      if (!gestorRaw) continue;
      const gestor = String(gestorRaw).trim();
      const docRaw = (iCnpj>=0 && row[iCnpj]) ? row[iCnpj] : (iCpf>=0 ? row[iCpf] : null);
      (data[gestor] = data[gestor] || []).push({
        alvo: String(row[iAlvo]||'').trim(),
        corretora: iCorretora>=0 ? String(row[iCorretora]||'').trim() : '',
        contratante: iContratante>=0 ? String(row[iContratante]||'').trim() : '',
        doc: formatCnpjCpf(docRaw),
        dataCriacao: iData>=0 ? assinaturaDateToStr(row[iData]) : '',
        beneficiarios: iBenef>=0 ? num(row[iBenef]) : 1,
      });
    }
    if (Object.keys(data).length === 0) throw new Error('Nenhum registro de "aguardando assinatura" reconhecido no arquivo.');
    return { data };
  }
  // "CRESCIMENTO GERAL" (aba GERAL) — planilha que o sênior já preenche todo dia, com o
  // ontem e o hoje reais de Assinatura/Funil/Ranking por gestor. Vira a fonte oficial do
  // "ontem → hoje" da aba Conversão (ver CONV_ONTEM_HOJE), no lugar do snapshot automático.
  // A aba tem um bloco por carteira (Plataforma/ABC/Cauda Longa/Digital) — a Conversão em si
  // já é da diretoria inteira (ver convSetupFilters/GESTOR_EQUIPE), então o reconhecimento
  // aqui tem que cobrir os mesmos gestores, não só os 4 da Cauda Longa.
  // Achado 2026-09-04: só os 4 nomes da Cauda Longa eram aceitos aqui (CG_KNOWN_NAMES,
  // lista fixa) — os outros ~11 gestores da planilha (Plataforma/ABC/Digital) caíam sempre em
  // "não reconhecido" e nunca recebiam ontem/hoje, mesmo com o arquivo certo importado todo
  // dia. Trocado pra usar GESTOR_EQUIPE (mesma lista já usada pelo Ranking/Comparativo pra
  // decidir quem é da diretoria), excluindo só os times fora de escopo (Interior SP, Venda
  // Interna) — mesmo critério já aplicado em updateRankingData.
  // Guarda pelo nome EXATO da planilha (maiúsculo, nome completo) — é assim que PROPOSTAS.g
  // já vem do relatório Planium, então bate direto sem precisar converter pra apelido curto.
  const CG_OUT_OF_SCOPE_TEAMS = new Set(['INTERIOR SP', 'VENDA INTERNA']);
  function parseCrescimentoGeralWorkbook(workbook){
    const sheet = workbook.Sheets['GERAL'] || findSheet(workbook, 'GERAL');
    if (!sheet) throw new Error('Não encontrei a aba "GERAL" no arquivo Crescimento Geral.');
    const rows = sheetRows(sheet);
    const data = {};
    const naoReconhecidos = [];
    for (let i = 0; i < rows.length; i++){
      const row = rows[i] || [];
      const nomeRaw = String(row[0]||'').trim();
      // pula linhas em branco, cabeçalhos de carteira ("CARTEIRA X"), a linha de rótulos
      // das colunas e as linhas de "TOTAL" — só sobram linhas de gestor de verdade.
      if (!nomeRaw || nomeRaw.toUpperCase() === 'TOTAL' || nomeRaw.toUpperCase().indexOf('CARTEIRA') === 0) continue;
      const nomeUp = nomeRaw.toUpperCase();
      const equipe = window.GESTOR_EQUIPE[nomeUp];
      if (!equipe || CG_OUT_OF_SCOPE_TEAMS.has(equipe)){ naoReconhecidos.push(nomeRaw); continue; }
      data[nomeRaw] = {
        assinaturaOntem: num(row[2]), assinaturaHoje: num(row[3]),
        funilOntem: num(row[5]), funilHoje: num(row[6]),
        rankingOntem: num(row[8]), rankingHoje: num(row[9]),
      };
    }
    if (Object.keys(data).length === 0) throw new Error('Nenhum gestor da diretoria foi encontrado na aba "GERAL" (nenhum nome bateu com GESTOR_EQUIPE).');
    return { data, naoReconhecidos };
  }
  function diffCrescimentoGeral(parsed){
    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-trend></i> Crescimento Geral — Resumo</h3>';
    html += `<div style="font-size:12.5px;line-height:1.8;"><div>Ontem × hoje atualizado pra <b>${Object.keys(parsed.data).length}</b> gestor${Object.keys(parsed.data).length!==1?'es':''}.</div></div>`;
    if (parsed.naoReconhecidos && parsed.naoReconhecidos.length){
      html += `<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--red);">Nomes não reconhecidos (${parsed.naoReconhecidos.length}) — ficaram de fora</summary><ul style="font-size:12px;margin:6px 0 0 18px;">`;
      parsed.naoReconhecidos.forEach(n => html += `<li>${n}</li>`);
      html += '</ul></details>';
    }
    return html;
  }
  function diffAssinatura(parsed){
    const totalReg = Object.values(parsed.data).reduce((s,arr)=>s+arr.length,0);
    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-clip></i> Aguardando Assinatura — Resumo</h3>';
    html += `<div style="font-size:12.5px;line-height:1.8;"><div><b>${totalReg}</b> contratos aguardando assinatura, em <b>${Object.keys(parsed.data).length}</b> gestores.</div></div>`;
    return html;
  }
  function diffPendPme(parsed){
    const totalPend = Object.values(parsed.data).reduce((s,arr)=>s+arr.length,0);
    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-clip></i> Pendências PME/SS — Resumo</h3>';
    html += `<div style="font-size:12.5px;line-height:1.8;"><div><b>${totalPend}</b> pendências carregadas, em <b>${Object.keys(parsed.data).length}</b> gestores.</div></div>`;
    const naoMapNames = Object.keys(parsed.naoMapeados||{});
    if (naoMapNames.length){
      html += `<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--red);">Gestores não reconhecidos (${naoMapNames.length}) — ficaram de fora</summary><ul style="font-size:12px;margin:6px 0 0 18px;">`;
      naoMapNames.forEach(n => html += `<li>${n} (${parsed.naoMapeados[n]} pendências)</li>`);
      html += '</ul></details>';
    }
    return html;
  }
  function diffPendPf(parsed){
    const totalPend = Object.values(parsed.data).reduce((s,arr)=>s+arr.length,0);
    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-clip></i> Pendências PF — Resumo</h3>';
    html += `<div style="font-size:12.5px;line-height:1.8;"><div><b>${totalPend}</b> pendências carregadas, em <b>${Object.keys(parsed.data).length}</b> gestores.</div></div>`;
    return html;
  }

  function readFileAsWorkbook(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try { resolve(XLSX.read(new Uint8Array(e.target.result), {type:'array'})); }
        catch(err){ reject(err); }
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Botões "remover" + estado visual dos campos de arquivo
  const IMPORT_FILE_IDS = ['fileMetaJunho','fileElegibilidade','fileCarteira','filePendPme','filePendPf','fileAssinatura','fileCrescimentoGeral','fileRankPrev'];
  function syncFileFieldState(id){
    const input = document.getElementById(id);
    const field = input.closest('.file-field');
    if (field) field.classList.toggle('has-file', input.files.length > 0);
  }
  IMPORT_FILE_IDS.forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('change', () => syncFileFieldState(id));
  });
  document.querySelectorAll('.file-clear').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.value = '';
      syncFileFieldState(btn.dataset.target);
    });
  });

  // Auto-detecção: identifica o tipo de cada planilha pelo conteúdo, não pelo campo.
  // Assim, arquivo no campo errado ainda é roteado corretamente.
  function detectWorkbookKind(wb){
    const has = prefix => wb.SheetNames.some(n => n.toUpperCase().indexOf(prefix.toUpperCase()) === 0);
    const hasExact = name => wb.SheetNames.some(n => n.toUpperCase().trim() === name.toUpperCase());
    // Mesmos dois formatos de aba de Meta que parseMetaJunhoWorkbook aceita — a Hapvida
    // já trocou o nome uma vez (de "NDI SP - META <MÊS>" pra "NDI SP - <MÊS>").
    if (META_SHEET_PREFIXES.some(p => has(p))) return 'meta';
    if (has('ELEGIBILIDADE') || hasExact('ELEGIBILIDADE')) return 'elig';
    // Achado no V2 em 2026-08-27 (portado agora pro V1): o extrato bruto de Corretoras (aba
    // única "Export", sem nenhuma "TB_BASE DE DADOS" junto) nunca era reconhecido aqui — só a
    // condição "BASE" cobria o caso onde o arquivo "NDI SP - Por Gestor" inteiro vinha com
    // essa aba extra. parseCorretorasRawWorkbook já procura uma aba "EXPORT" (exata), então
    // esse formato precisa contar como 'corretoras' também.
    if (hasExact('EXPORT') || (has('BASE') && !has('ELEGIBILIDADE'))) return 'corretoras';
    // Carteira/Gestores ("BANCO DE DADOS - COMERCIAL", abas CONSULTA/COMERCIAL/ASSESSORIAS) —
    // faltava esse ramo inteiro. Sem ele, esse arquivo nunca batia em nenhum kind (não tem
    // aba "BASE...", só "COMERCIAL") e caía direto em "não reconhecido" — SEM erro visível
    // nenhum na tela sempre que subido junto do Extrato do BI, porque o outro arquivo da
    // mesma leva já tinha sido reconhecido como 'meta' e a checagem de "nada reconhecido"
    // só dispara quando NENHUM arquivo bate. Achado 2026-09-04: Victor subiu Carteira +
    // Extrato do BI juntos, o resumo de Desempenho Comercial/Ranking apareceu normal, mas a
    // Carteira nunca era processada (pendingCarteira ficava null) — corretora nova (ex.: F8,
    // código 0540) nunca entrava em lugar nenhum, sem nenhum aviso de que algo tinha falhado.
    // has() (prefixo), não hasExact() — mesma regra de findSheet('COMERCIAL') que
    // parseCarteiraWorkbook já usa, sobrevive a algo tipo "COMERCIAL 2026" no futuro.
    if (has('COMERCIAL')) return 'carteira';
    return 'unknown';
  }

  function closeImportModal(){
    document.getElementById('importModalOverlay').style.display = 'none';
    document.getElementById('importSummary').style.display = 'none';
    document.getElementById('publishStep').style.display = 'none';
    document.getElementById('publishStatus').textContent = '';
    document.getElementById('importStatus').textContent = '';
    document.getElementById('fileMetaJunho').value = '';
    document.getElementById('fileElegibilidade').value = '';
    document.getElementById('fileCarteira').value = '';
    document.getElementById('filePendPme').value = '';
    document.getElementById('filePendPf').value = '';
    IMPORT_FILE_IDS.forEach(id => { const f = document.getElementById(id).closest('.file-field'); if (f) f.classList.remove('has-file'); });
    pendingMeta = null; pendingElig = null; pendingCarteira = null; pendingPendPme = null; pendingPendPf = null; pendingCorretorasRaw = null; pendingEligBridge = null; pendingPropostas = null; pendingAssinatura = null; pendingCrescimentoGeral = null;
  }

  document.getElementById('btnOpenImport').addEventListener('click', () => {
    document.getElementById('importModalOverlay').style.display = 'flex';
  });
  document.getElementById('btnCloseImport').addEventListener('click', closeImportModal);
  document.getElementById('btnCancelImportInner').addEventListener('click', closeImportModal);
  document.getElementById('importModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'importModalOverlay') closeImportModal();
  });

  document.getElementById('btnProcessImport').addEventListener('click', async () => {
    const statusEl = document.getElementById('importStatus');
    const summaryEl = document.getElementById('importSummary');
    const btn = document.getElementById('btnProcessImport');
    const metaFile = document.getElementById('fileMetaJunho').files[0];
    const eligFile = document.getElementById('fileElegibilidade').files[0];
    const carteiraFile = document.getElementById('fileCarteira').files[0];
    const pendPmeFile = document.getElementById('filePendPme').files[0];
    const pendPfFile = document.getElementById('filePendPf').files[0];
    const assinaturaFile = document.getElementById('fileAssinatura').files[0];
    const crescimentoGeralFile = document.getElementById('fileCrescimentoGeral').files[0];
    const rankPrevFile = document.getElementById('fileRankPrev').files[0];
    if (!metaFile && !eligFile && !carteiraFile && !pendPmeFile && !pendPfFile && !assinaturaFile && !crescimentoGeralFile && !rankPrevFile){
      statusEl.innerHTML = '<p style="color:var(--red);font-size:12.5px;">Selecione ao menos um arquivo.</p>';
      return;
    }
    const originalBtnText = btn.textContent;
    btn.disabled = true;
    btn.style.opacity = '.65';
    btn.style.cursor = 'default';
    btn.innerHTML = '<span class="spinner"></span> Processando...';
    summaryEl.style.display = 'none';
    pendingMeta = null; pendingElig = null; pendingCarteira = null; pendingPendPme = null; pendingPendPf = null; pendingCorretorasRaw = null; pendingEligBridge = null; pendingPropostas = null; pendingAssinatura = null; pendingCrescimentoGeral = null;
    let summaryHtml = '';
    try {
      // ---- AUTO-DETECÇÃO: roteia cada arquivo pelo conteúdo, não pelo campo ----
      const mainFiles = [];
      if (metaFile) mainFiles.push(metaFile);
      if (eligFile) mainFiles.push(eligFile);
      if (carteiraFile) mainFiles.push(carteiraFile);

      let metaWb = null, eligWb = null, corretorasWb = null, carteiraWb = null;
      const naoReconhecidos = [];
      for (const file of mainFiles){
        statusEl.innerHTML = `<p style="font-size:12.5px;color:var(--muted);">Lendo ${file.name}...</p>`;
        const wb = await readFileAsWorkbook(file);
        const kind = detectWorkbookKind(wb);
        if (kind === 'meta' && !metaWb){ metaWb = wb; }
        else if (kind === 'elig' && !eligWb){ eligWb = wb; }
        else if (kind === 'corretoras' && !corretorasWb){ corretorasWb = wb; }
        else if (kind === 'carteira' && !carteiraWb){ carteiraWb = wb; }
        else { naoReconhecidos.push(file.name); }
      }

      if (carteiraWb){
        try { pendingCarteira = parseCarteiraWorkbook(carteiraWb); }
        catch(e){ summaryHtml += `<div style="color:var(--red);font-size:12.5px;"><i class=ic-warn></i> Não consegui interpretar a Carteira/Gestores: ${e.message}</div>`; }
      }

      if (naoReconhecidos.length && !metaWb && !eligWb && !corretorasWb){
        throw new Error('Não reconheci o conteúdo de: ' + naoReconhecidos.join(', ') + '. Esperado o relatório "NDI SP - Por Gestor" (aba NDI SP - META) ou o arquivo mestre de Elegibilidade (aba ELEGIBILIDADE). Confira se anexou a planilha certa.');
      }

      if (metaWb){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Processando Desempenho Comercial...</p>';
        pendingMeta = parseMetaJunhoWorkbook(metaWb);
        summaryHtml += diffMetaJunho(pendingMeta);
        // Planilha de mês passado (ex.: corrigindo Junho) só atualiza o histórico daquele
        // mês — as bridges de Ranking/Elegibilidade abaixo assumem "mês corrente" (sempre
        // mexem no último índice de dados), então só rodam se for o mês mais recente.
        const latestKnownMonth = window.getLatestKnownMonth ? window.getLatestKnownMonth() : window.getCurrentMonth();
        // ">=" (não "===") — um mês NOVO (ex.: Agosto chegando depois de Julho) também
        // deve rodar as bridges normalmente, só um mês ANTERIOR ao mais recente é que é
        // "histórico" e deve pular. Com "===" um mês novo era tratado como histórico e a
        // Elegibilidade/Ranking do mês atual não eram atualizados.
        const isLiveMonthUpload = !pendingMeta.detectedMonth || pendingMeta.detectedMonth >= latestKnownMonth;
        if (isLiveMonthUpload){
          // O mesmo arquivo alimenta o Ranking de Vendas (mês atual) — mesma fonte, sem divergência
          try {
            pendingRankCur = parseRankingWorkbook(metaWb);
            const totR = pendingRankCur.reduce((s,r)=>s+r.t,0);
            summaryHtml += `<div style="font-size:12.5px; margin-top:6px; color:var(--blue);">Ranking de Vendas (mês atual) — ${pendingRankCur.length} corretoras, ${Math.round(totR).toLocaleString('pt-BR')} vidas (SP, sem Rio/Hapvida), do mesmo arquivo.</div>`;
          } catch(e){
            summaryHtml += `<div style="font-size:12px; margin-top:6px; color:var(--muted);">Ranking não atualizado: ${e.message}</div>`;
          }
          pendingEligBridge = extractEligibilidadeDataFromExport(metaWb);
          if (pendingEligBridge && window.getEligibilidadeData){
            const codigosArquivo = new Set();
            Object.values(pendingEligBridge).forEach(g => (g.corretoras||[]).forEach(c => codigosArquivo.add(window.normalizeCodigo(c.c))));
            const eligData = window.getEligibilidadeData();
            const matchCount = eligData.filter(d => codigosArquivo.has(window.normalizeCodigo(d.c))).length;
            summaryHtml += `<div style="font-size:12.5px; margin-top:6px; color:var(--blue);">Elegibilidade — histórico do mês será gravado em <b>${matchCount}</b> das ${eligData.length} corretoras (Cauda Longa), direto pela planilha manual.</div>`;
          }
        } else {
          pendingRankCur = null;
          pendingEligBridge = null;
        }
      }
      if (corretorasWb && !metaWb){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Processando Corretoras...</p>';
        pendingCorretorasRaw = parseCorretorasRawWorkbook(corretorasWb, pendingCarteira);
        // TRAVA (2026-10-06): o extrato cru grava o Integrado no mês SELECIONADO no painel
        // (updateIntegradoFromRaw) — um extrato de outro mês (ex.: Outubro com o painel em Setembro)
        // sobrescreveria aquele mês no Desempenho Comercial. O mês do extrato vem do rodapé
        // ("Date é 01/MM/AAAA"); extrato sem esse rodapé (formato antigo) passa como sempre.
        const mesAtivoRaw = window.getCurrentMonth ? window.getCurrentMonth() : null;
        const mesExtratoRaw = pendingCorretorasRaw.detectedMonth;
        if (mesExtratoRaw && mesAtivoRaw){
          const ativoSint = !!(window.isSynthMonth && window.isSynthMonth(mesAtivoRaw));
          if (mesExtratoRaw !== mesAtivoRaw || ativoSint){
            const lblExt = metaMonthLabel(mesExtratoRaw), lblAtivo = metaMonthLabel(mesAtivoRaw);
            pendingCorretorasRaw = null;
            if (mesExtratoRaw > mesAtivoRaw && !ativoSint){
              throw new Error(`Este extrato é de ${lblExt}, mas o painel está em ${lblAtivo}. Pra abrir um mês novo, suba primeiro o Excel "NDI SP - POR GESTOR" de ${lblExt} (ele cria o mês e a meta); depois os extratos de ${lblExt} entram normalmente. Nada foi alterado.`);
            }
            throw new Error(`Este extrato é de ${lblExt}, mas o painel está com ${lblAtivo}${ativoSint ? ' (mês reconstruído)' : ''} selecionado em "Mês de referência" — ele sobrescreveria esse mês. Selecione ${lblExt} (se ele já foi importado) ou, pra corrigir um mês passado só na visão por trimestre, use o campo "Integrado de meses passados". Nada foi alterado.`);
          }
        }
        summaryHtml += diffCorretorasRaw(pendingCorretorasRaw);
      }
      if (eligWb){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Processando Elegibilidade (pode levar alguns segundos)...</p>';
        pendingElig = parseEligibilidadeWorkbook(eligWb);
        summaryHtml += diffEligibilidade(pendingElig);
      }
      if (pendingCarteira){
        summaryHtml += diffCarteira(pendingCarteira, pendingElig);
      }
      if (pendPmeFile){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Lendo Pendências PME/SS...</p>';
        const wb = await readFileAsWorkbook(pendPmeFile);
        pendingPendPme = parsePmePendenciasWorkbook(wb);
        summaryHtml += diffPendPme(pendingPendPme);
        // Mesmo arquivo tem a aba "PLANIUM" (histórico completo de propostas) — atualiza junto
        // a lista usada no Ranking de Vendas, sem precisar de um upload separado.
        try {
          pendingPropostas = parsePlaniumWorkbook(wb);
          summaryHtml += diffPropostas(pendingPropostas);
        } catch(e){
          summaryHtml += `<div style="font-size:12px; margin-top:6px; color:var(--muted);">Propostas do Ranking não atualizadas: ${e.message}</div>`;
        }
      }
      if (pendPfFile){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Lendo Pendências PF...</p>';
        const wb = await readFileAsWorkbook(pendPfFile);
        pendingPendPf = parsePfPendenciasWorkbook(wb);
        summaryHtml += diffPendPf(pendingPendPf);
      }
      if (assinaturaFile){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Lendo Aguardando Assinatura...</p>';
        const wb = await readFileAsWorkbook(assinaturaFile);
        pendingAssinatura = parseAssinaturaWorkbook(wb);
        summaryHtml += diffAssinatura(pendingAssinatura);
      }
      if (crescimentoGeralFile){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Lendo Crescimento Geral...</p>';
        const wb = await readFileAsWorkbook(crescimentoGeralFile);
        pendingCrescimentoGeral = parseCrescimentoGeralWorkbook(wb);
        summaryHtml += diffCrescimentoGeral(pendingCrescimentoGeral);
      }
      if (rankPrevFile){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Lendo Ranking — mês anterior...</p>';
        const wb = await readFileAsWorkbook(rankPrevFile);
        pendingRankPrev = parseRankingWorkbook(wb);
        const tot = pendingRankPrev.reduce((s,r)=>s+r.t,0);
        summaryHtml += `<div style="font-size:12.5px; margin-top:6px;"><b>Ranking (mês anterior):</b> ${pendingRankPrev.length} corretoras, ${Math.round(tot).toLocaleString('pt-BR')} vidas.</div>`;
      }
      statusEl.innerHTML = '';
      document.getElementById('importSummaryBody').innerHTML = summaryHtml;
      summaryEl.style.display = 'block';
    } catch(err){
      statusEl.innerHTML = `<p style="color:var(--red);font-size:12.5px;">Erro: ${err.message}</p>`;
    } finally {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
      btn.textContent = originalBtnText;
    }
  });

  document.getElementById('btnConfirmImport').addEventListener('click', () => {
    // Grava o carimbo real de "última importação" por fonte — pedido do Victor, 2026-09-14
    // (ver LAST_UPDATED_BY_SOURCE lá no topo do arquivo). Um por card do modal "Atualizar
    // Dados"; pendingMeta/pendingCorretorasRaw são os dois jeitos de a mesma "Extrato do BI"
    // chegar (arquivo completo ou só o extrato bruto), então contam como a mesma fonte.
    if (window.markSourceUpdated){
      if (pendingMeta || pendingCorretorasRaw) window.markSourceUpdated('corretoras');
      if (pendingCarteira) window.markSourceUpdated('carteira');
      if (pendingPendPme) window.markSourceUpdated('funilPme');
      if (pendingPendPf) window.markSourceUpdated('funilPf');
      if (pendingAssinatura) window.markSourceUpdated('assinatura');
      if (pendingCrescimentoGeral) window.markSourceUpdated('crescimentoGeral');
      if (pendingElig) window.markSourceUpdated('elegibilidade');
      if (window.renderSourceStatus) window.renderSourceStatus();
    }
    if (pendingMeta) window.updateMetaJunhoData(pendingMeta);
    if (pendingCorretorasRaw) {
      window.updateIntegradoFromRaw(pendingCorretorasRaw.byGestor, pendingCorretorasRaw.semGestorCat);
      if (window.applyCorretorasToEligibilidade){
        // Correção 2026-09-14 (Victor: "o próprio extrato já mostra qual é o mês... se você
        // reparar no final, ele informa") — o extrato bruto de Corretoras SIM tem o mês real,
        // só que escondido no bloco "Filtros aplicados: ... Date é DD/MM/AAAA" no rodapé da
        // aba EXPORT, que antes era só descartado como lixo (ver parseCorretorasRawWorkbook).
        // Passa esse mês real agora — só cai no chute de calendário (dentro da função) no caso
        // raríssimo de um extrato sem esse rodapé (formato antigo, por exemplo).
        const n = window.applyCorretorasToEligibilidade(pendingCorretorasRaw.byGestor, pendingCorretorasRaw.detectedMonth);
        console.log(`Elegibilidade: ${n} corretoras atualizadas com o extrato bruto de Corretoras (mês: ${pendingCorretorasRaw.detectedMonth || 'não detectado, usou chute de calendário'}).`);
      }
    }
    if (pendingEligBridge && window.applyCorretorasToEligibilidade){
      // Esse caminho SEMPRE tem o mês real (pendingMeta já foi setado logo acima, mesmo
      // bloco "if (metaWb)" que gera o pendingEligBridge) — passa ele direto, sem chute.
      // Achado 2026-09-14 (Victor: "no extrato do BI ele informa de qual mês é, e com isso
      // dá pra fazer a distribuição correta").
      const n2 = window.applyCorretorasToEligibilidade(pendingEligBridge, pendingMeta && pendingMeta.detectedMonth);
      console.log(`Elegibilidade: ${n2} corretoras atualizadas via planilha "NDI SP - Por Gestor" (mês: ${pendingMeta && pendingMeta.detectedMonth || 'não detectado'}).`);
    }
    if (pendingElig) window.updateEligibilidadeData(pendingElig);
    if (pendingCarteira) applyCarteira(pendingCarteira);
    // Só passa o mês detectado quando pendingRankCur realmente veio de uma importação "ao
    // vivo" desta rodada (não de uma correção de mês passado) — mantém "Julho/26 vs Junho/26"
    // etc. sempre igual ao mês do arquivo mais recente, em vez de travado no valor inicial.
    if (pendingRankCur || pendingRankPrev) window.updateRankingData(pendingRankCur, pendingRankPrev, (pendingRankCur && pendingMeta) ? pendingMeta.detectedMonth : null);
    // Upload só do extrato bruto de Corretoras (sem a planilha "NDI SP - Por Gestor" inteira)
    // também atualiza o Ranking de Vendas agora — antes só o caminho com Meta fazia isso,
    // obrigando a subir o arquivo inteiro todo dia só pra manter o Ranking em dia.
    else if (pendingCorretorasRaw){
      const rankCurFromRaw = corretorasRawToRankList(pendingCorretorasRaw.byGestor);
      // Mesma correção 2026-09-14 do Elegibilidade acima: usa o mês real lido do rodapé do
      // extrato (pendingCorretorasRaw.detectedMonth) em vez de window.getCurrentMonth() —
      // esse "mês corrente" oficial (do Desempenho Comercial) não é o mesmo "mês que este
      // extrato específico representa" durante a janela de fechamento da grade (até dia 10),
      // que é exatamente o caso que estava quebrando.
      window.updateRankingData(rankCurFromRaw, null, pendingCorretorasRaw.detectedMonth || (window.getCurrentMonth ? window.getCurrentMonth() : null));
    }
    if (pendingPendPme || pendingPendPf) {
      window.updatePendenciasData({
        pme: pendingPendPme ? pendingPendPme.data : undefined,
        pf: pendingPendPf ? pendingPendPf.data : undefined,
      });
    }
    if (pendingPropostas && window.updatePropostasData) window.updatePropostasData(pendingPropostas);
    // Reconcilia Pendências (Planilha1) com o Planium (PROPOSTAS) — cobre propostas recém-
    // chegadas que o Planium já tem mas a Planilha1 ainda não, pra nunca mais "sumir" do
    // modal de Pendências / busca por número. Só faz sentido rodar quando os dois vieram
    // juntos nessa importação (senão não tem com o que comparar).
    if (pendingPendPme && pendingPropostas && window.reconciliarPendenciasComPropostas) window.reconciliarPendenciasComPropostas();
    if (pendingAssinatura && window.updateAssinaturaData) window.updateAssinaturaData(pendingAssinatura.data);
    if (pendingCrescimentoGeral && window.updateConvOntemHoje) window.updateConvOntemHoje(pendingCrescimentoGeral.data);
    if ((pendingPropostas || pendingAssinatura) && window.saveDailySnapshot) window.saveDailySnapshot();
    const ts = new Date().toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
    const el = document.getElementById('sidebarUpdatedAt'); if (el) el.textContent = ts;
    if (window.renderOverview) window.renderOverview();
    if (window.renderCompare) window.renderCompare();
    if (window.renderEligibilidade) window.renderEligibilidade();
    if (window.renderConversao) window.renderConversao();
    // Não fecha o modal: mostra o passo de publicação (persistência real no GitHub Pages)
    document.getElementById('importSummary').style.display = 'none';
    document.getElementById('publishStep').style.display = 'block';
    const isAdmin = window.__userRole__ === 'admin';
    document.getElementById('publishAdminControls').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('publishNonAdminMsg').style.display = isAdmin ? 'none' : 'block';
  });

  /* =========================================================
     PUBLICAÇÃO — grava cada seção no Firestore (fatiada, ver
     fsWriteSection no <script> do Firestore em index.html),
     substitui o antigo "Publicar no GitHub" (Contents API +
     token pessoal) na migração de segurança de 2026-09-08. Quem
     publica só precisa estar logado como admin na allowlist_v1
     — sem token nenhum, a sessão já autenticada é a credencial, e
     as próprias Regras do Firestore recusam a escrita se a
     pessoa não for admin (não é só uma trava de tela).
     O id do botão continua "btnPublishGithub" por preguiça de
     mexer no CSS/outras referências — não é mais GitHub, é só
     histórico do nome.
     ========================================================= */
  function buildDataPayload(){
    const st = window.getPublishableState();
    return {
      MJ_TEAMS_BY_MONTH: st.MJ_TEAMS_BY_MONTH,
      currentMonth: st.currentMonth,
      PENDENCIAS_PME: st.PENDENCIAS_PME,
      PENDENCIAS_PF: st.PENDENCIAS_PF,
      PENDENCIAS_ASSINATURA: st.PENDENCIAS_ASSINATURA,
      MJ_CORRETORAS_BY_MONTH: st.MJ_CORRETORAS_BY_MONTH,
      MJ_NAO_ATRIBUIDO_BY_MONTH: st.MJ_NAO_ATRIBUIDO_BY_MONTH,
      MJ_BENCHMARK: st.MJ_BENCHMARK,
      DATA: window.getEligibilidadeData ? window.getEligibilidadeData() : [],
      RANKDATA: window.getRankData ? window.getRankData() : [],
      PROPOSTAS: window.getPropostasData ? window.getPropostasData() : [],
      SLA_HISTORICO: window.getSlaHistorico ? window.getSlaHistorico() : [],
      DAILY_SNAPSHOTS: window.getDailySnapshots ? window.getDailySnapshots() : {},
      CONV_ONTEM_HOJE: window.getConvOntemHoje ? window.getConvOntemHoje() : {},
      META_EXEC_BY_MONTH: window.getMetaExecData ? window.getMetaExecData() : {},
      INT_EXEC_BY_MONTH: window.getIntExecData ? window.getIntExecData() : {},
      RANK_CUR_LABEL: window.getRankLabels ? window.getRankLabels().cur : 'Mês atual',
      RANK_PREV_LABEL: window.getRankLabels ? window.getRankLabels().prev : 'Mês anterior',
      CARTEIRA_MAP: window.CARTEIRA_MAP || null,
      LAST_UPDATED_BY_SOURCE: window.getLastUpdatedBySource ? window.getLastUpdatedBySource() : {},
      // Grava o momento da publicação DENTRO do dado — antes esse "Última atualização"
      // vinha de um texto fixo no index.html (PUBLISHED_AT), que só mudava quando alguém
      // editava o código; agora acompanha de verdade cada publicação de dados.
      publishedAt: new Date().toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'}),
    };
  }
  function buildDataJson(){
    return JSON.stringify(buildDataPayload());
  }

  async function publishToFirestore(){
    const status = document.getElementById('publishStatus');
    const btn = document.getElementById('btnPublishGithub');
    btn.disabled = true; btn.style.opacity = '.65';
    status.innerHTML = '<span class="spinner" style="border-color:rgba(16,30,99,.25); border-top-color:var(--navy);"></span> Fazendo backup dos dados atuais...';
    try {
      // Backup SEMPRE antes de sobrescrever — se falhar, para aqui e não publica nada (pedido
      // do Victor, 2026-09-28: rede de segurança pra reverter se uma publicação sair errada).
      // Guarda os últimos 20 automaticamente (ver window.__backupCurrentData__ em index.html).
      if (window.__backupCurrentData__) await window.__backupCurrentData__();
      status.innerHTML = '<span class="spinner" style="border-color:rgba(16,30,99,.25); border-top-color:var(--navy);"></span> Publicando...';
      const payload = buildDataPayload();
      // META_EXEC_BY_MONTH / INT_EXEC_BY_MONTH (metas por executivo e Integrado de meses passados,
      // 2026-10) são opcionais: só gravam se houver algo importado, e uma falha nelas (ex.: Regra do
      // Firestore ainda sem essas seções) vira aviso, nunca derruba a publicação das seções que já
      // funcionavam.
      const optionalKeys = ['META_EXEC_BY_MONTH', 'INT_EXEC_BY_MONTH'];
      const keys = Object.keys(payload).filter(k => optionalKeys.indexOf(k) < 0);
      // Publica todas as seções em paralelo — mais rápido, e cada uma é independente
      // (um erro numa não corrompe as outras, viram gravações parciais no pior caso).
      await Promise.all(keys.map(k => window.fsWriteSection(k, payload[k])));
      let avisoMeta = '';
      const rotulos = { META_EXEC_BY_MONTH:'as metas por executivo', INT_EXEC_BY_MONTH:'o Integrado de meses passados' };
      for (const k of optionalKeys){
        if (!payload[k] || !Object.keys(payload[k]).length) continue;
        try { await window.fsWriteSection(k, payload[k]); }
        catch(e){ avisoMeta += ' <span style="color:var(--red); font-weight:600;">Atenção: ' + rotulos[k] + ' importado(s) NÃO foi(ram) salvo(s) (' + e.message + ').</span>'; }
      }
      status.innerHTML = '<span style="color:#1b7a63; font-weight:700;">Publicado! Quem já estiver com o painel aberto vê a atualização só no próximo login/recarregamento.</span>' + avisoMeta;
    } catch(err){
      const permMsg = (err.code === 'permission-denied')
        ? ' Seu usuário pode não estar marcado como admin na allowlist_v1 do Firestore — confira com quem administra o painel.'
        : '';
      status.innerHTML = '<span style="color:var(--red);">Erro ao publicar: ' + err.message + '.' + permMsg + ' Pode baixar o backup abaixo e tentar de novo depois.</span>';
    } finally {
      btn.disabled = false; btn.style.opacity = '';
    }
  }

  document.getElementById('btnPublishGithub').addEventListener('click', publishToFirestore);
  document.getElementById('btnDownloadJson').addEventListener('click', () => {
    const jsonStr = buildDataJson();
    const blob = new Blob([jsonStr], {type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 8000);
  });
  window.__buildDataJson = buildDataJson;
})();


/* =========================================================
   METAS POR EXECUTIVO + VISÃO POR TRIMESTRE (Desempenho Comercial)
   Pedido do sênior via Victor, 2026-10-02: ver os números dos EXECUTIVOS (Meta x Integrado)
   por trimestre fechado (1T/2T/3T...), não só mês a mês — e não a Elegibilidade.

   Fontes (combinado com Victor):
   - META: planilhas "META VAREJO 2026" (1 arquivo por trimestre, 1 aba por mês, equipe →
     executivo, colunas IND/SS/PME/ADESÃO/TOTAL). Só as metas são usadas desses arquivos.
     ADESÃO = ADM (mesma categoria, nome diferente). O 1º tri (Jan/Fev/Mar) não tem arquivo —
     veio de prints, digitado à mão e conferido contra os totais de cada equipe (META_EXEC_SEED).
   - INTEGRADO: continua vindo do import normal do Extrato do BI (MJ_TEAMS_BY_MONTH), casado
     por nome. Mês sem import = sem Integrado (a tela mostra "—", nunca zero inventado).
   Regras (Victor): Interior fora (aqui = equipes dos gerentes sênior Maria Aparecida Cabral e
   Leonardo Galerani — a da Cabral aparece DENTRO da seção "SP HAP NDI" nos arquivos de
   2º/3º tri, por isso exclui por nome, não só pela seção "SP INTERIOR"). REVISADO por Victor em
   2026-10-02: a visão é da CARTEIRA — todo trimestre mostra cada executivo na equipe em que ele
   está HOJE (mês mais recente com meta), ver teamOfNow(); quem saiu da estrutura não entra.
   (Antes: "executivo fica na equipe em que estava em cada mês" — revertido a pedido.)
   ========================================================= */
(function(){
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  const MES_PT = {JANEIRO:'01',FEVEREIRO:'02',MARCO:'03',ABRIL:'04',MAIO:'05',JUNHO:'06',JULHO:'07',AGOSTO:'08',SETEMBRO:'09',OUTUBRO:'10',NOVEMBRO:'11',DEZEMBRO:'12'};
  const MES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const MES_LONGO = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  // Mesmos rótulos de equipe que o resto do painel usa (SENIOR_TEAM_LABELS no import) — a ordem
  // aqui é a ordem em que as equipes aparecem na tabela.
  const SENIOR_LABELS = [
    ['FOIADELLI', 'Camila Foiadelli (Plataforma)'],
    ['MARIANO',   'Leonardo Mariano (ABC)'],
    ['CARDOSO',   'Estevão Cardoso (Cauda Longa)'],
    ['MARCELO',   'Marcelo Lima (Digital)'],
  ];
  // Só o Galerani (Interior) segue excluído por nome; a Cabral virou sênior do Digital em 10/2026, então a
  // exclusão por nome saiu — quem não está na estrutura atual (Excel) já fica de fora (teamOfNow).
  const SENIOR_EXCLUIDOS = ['GALERANI'];
  // A partir de 10/2026 (4º TRI): Marcelo Lima lidera a Cauda Longa e Maria Aparecida (Cabral) o Digital. O rótulo aqui é só\n  // informativo — quem decide a equipe de cada pessoa é a estrutura atual (teamOfNow).
  const SENIOR_LABELS_NOVO = [
    ['FOIADELLI', 'Camila Foiadelli (Plataforma)'],
    ['MARIANO',   'Leonardo Mariano (ABC)'],
    ['MARCELO',   'Marcelo Lima (Cauda Longa)'],
    ['CABRAL',    'Maria Aparecida (Digital)'],
  ];
  // Tipo do time = texto entre parênteses do rótulo: Marcelo Lima (Cauda Longa) vira Cauda Longa.
  const tipoTime = l => { const m = /\(([^)]*)\)\s*$/.exec(String(l || '')); return m ? m[1] : ''; };
  const ORDEM_TIPOS = ['Plataforma', 'ABC', 'Cauda Longa', 'Digital'];
  const NOME_BONITO = {
    'AGATHA SAKAMOTO':'Agatha Sakamoto', 'AGATHA EIKO RODRIGUES SAKAMOTO':'Agatha Sakamoto', 'PATRICIA PESSOA MONKS':'Patricia Monks',
    'JONATHAN LEAL DOS SANTOS SILVA':'Jonathan Leal', 'PABLO SERGIO RIBEIRO AMORA':'Pablo Amora',
  };
  const CONECT = new Set(['de','da','do','das','dos','e']);
  const titulo = raw => String(raw).trim().split(/\s+/).map(w => { const l = w.toLowerCase(); return CONECT.has(l) ? l : l.charAt(0).toUpperCase() + l.slice(1); }).join(' ');
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const fmt0 = n => Math.round(n).toLocaleString('pt-BR');
  const pct1 = n => (n * 100).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';

  function lev(a, b){
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({length:n+1}, (_, j) => j);
    for (let i = 1; i <= m; i++){
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  // ---------- parser da planilha "META VAREJO" ----------
  function parseMetaExecWorkbook(wb){
    const avisos = [];
    const months = {};
    let year = null;
    const geral = wb.SheetNames.find(n => norm(n) === 'TRI GERAL');
    if (geral){
      const g = XLSX.utils.sheet_to_json(wb.Sheets[geral], {header:1, defval:null});
      const m = /(\d{4})/.exec(String((g[0] && g[0][0]) || ''));
      if (m) year = m[1];
    }
    if (!year) year = String(new Date().getFullYear());
    wb.SheetNames.forEach(sheetName => {
      const mm = MES_PT[norm(sheetName)];
      if (!mm) return;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1, defval:null});
      const teams = {};
      let section = 'ndi', team = null;
      rows.forEach(row => {
        const a = row[0] == null ? '' : String(row[0]).trim();
        const b = row[1] == null ? '' : String(row[1]).trim();
        const an = norm(a), bn = norm(b);
        if (an === 'SP INTERIOR'){ section = 'int'; team = null; return; }
        if (an === 'SP HAP NDI'){ section = 'ndi'; team = null; return; }
        if (bn === 'GERENTE SENIOR'){
          team = null;
          if (section !== 'ndi') return;
          if (SENIOR_EXCLUIDOS.some(k => an.indexOf(k) >= 0)) return;
          const hit = (((year + '-' + mm) >= '2026-10') ? SENIOR_LABELS_NOVO : SENIOR_LABELS).find(([k]) => an.indexOf(k) >= 0);
          if (hit) team = hit[1];
          else {
            team = titulo(a.replace(/^GERENTE SENIOR:?\s*/i, ''));
            avisos.push(`Gerente sênior não reconhecido em ${sheetName}: "${a}" — entrou como equipe nova "${team}". Se for Interior, avise.`);
          }
          return;
        }
        if (!team || !a || !bn) return;
        if (bn.indexOf('DIRETORA') === 0){ team = null; return; }
        const an2 = norm(a.replace(/\s+-\s+.*$/, ''));
        if (!an2 || an2.indexOf('A CONTRATAR') === 0 || an2 === 'TBA') return; // vaga em aberto, sem pessoa
        const nome = NOME_BONITO[an2] || titulo(a.replace(/\s+-\s+.*$/, ''));
        const rec = { nome, ind:r2(row[2]), ss:r2(row[3]), pme:r2(row[4]), adm:r2(row[5]), total:r2(row[6]) };
        const list = teams[team] = teams[team] || [];
        const dup = list.find(x => norm(x.nome) === norm(nome));
        if (dup){ ['ind','ss','pme','adm','total'].forEach(k => { dup[k] = r2(dup[k] + rec[k]); }); }
        else list.push(rec);
      });
      if (Object.keys(teams).length) months[year + '-' + mm] = teams;
    });
    if (!Object.keys(months).length) throw new Error('Não achei abas de mês (Janeiro, Fevereiro...) com equipes "GERENTE SENIOR" nesse arquivo.');
    return { months, avisos };
  }

  // ---------- dados ----------
  let META_EXEC_BY_MONTH = window.__DASH_DATA__.META_EXEC_BY_MONTH || {};
  // Integrado por executivo de MESES PASSADOS que nunca passaram pelo import normal (Jan–Mai/26),
  // vindo dos extratos "Corretoras" de cada mês + Carteira atual. { 'AAAA-MM': { nome: {ind,ss,pme,adm,total} } }
  // Só vale quando o mês NÃO existe em MJ_TEAMS_BY_MONTH (o import oficial sempre ganha).
  let INT_EXEC_BY_MONTH = window.__DASH_DATA__.INT_EXEC_BY_MONTH || {};
  window.getIntExecData = () => INT_EXEC_BY_MONTH;
  // Extratos "Corretoras" do BI de Jan–Set/26 EMBUTIDOS no código, por CÓDIGO de corretora:
  // { 'AAAA-MM': { código: [IND, SS, PME, ADM] } } (Integrado = IND+SS+PME+ADM, ver intFor).
  // O executivo de cada código NÃO está gravado aqui: sai da Carteira que o painel já tem
  // (window.CARTEIRA_MAP), pela mesma regra do import normal (attributeCorretorasAgg) — então
  // quando a Carteira mudar, o histórico acompanha. Gerado em 2026-10-05 dos extratos
  // Corretoras de 02/10 (Jan–Mai) e 05/10 (Jun–Set). Pra corrigir/estender um mês, use o campo
  // "Integrado de meses passados" (INT_EXEC_BY_MONTH ganha do seed). Nome da corretora só
  // guardado onde a Carteira tem o código duplicado (desempate por nome).
  const INT_CODE_SEED = {"2026-01":{"0003":[0,12],"000F":[1,2],"001I":[0,1],"002Q":[0,3],"003H":[0,2],"003M":[0,2],"006A":[0,2],"006J":[1],"006L":[1],"006Z":[14,38],"007A":[11,31,91],"0081":[1],"008T":[0,9],"009H":[2],"009P":[0,2],"009T":[0,0,37],"00AA":[1,9],"00B0":[1,1],"00BD":[1],"00C5":[0,1],"00CD":[0,1],"00CJ":[2],"00CT":[0,2],"00D3":[0,1],"00DM":[0,6],"00DU":[2],"00ED":[1],"00EF":[0,3],"00EG":[1,5],"00EY":[9,13],"00F1":[1],"00FC":[0,1],"00FT":[2,1],"00GF":[0,2],"00HU":[1,1],"00HX":[0,3],"00I6":[35,81],"00IM":[1],"00J0":[1],"00JA":[1],"00K3":[0,5],"00KI":[0,4],"00L3":[14,39],"00L4":[0,2,2],"00L7":[1],"00LG":[2],"00LH":[0,2],"00M4":[0,2],"00MS":[15,14],"00NA":[1],"00NG":[0,1],"00NL":[2,1],"00NZ":[0,2],"00QF":[22,87],"00QL":[0,1],"00R3":[3,3],"00R5":[2],"00R6":[2,2],"00RN":[0,7],"00SU":[2],"00SZ":[0,8],"00TP":[0,2],"00UY":[4,2],"00VF":[10,40],"00WT":[1],"00XD":[1],"00XQ":[15,12],"00XW":[6,17],"00XX":[109,205,34],"00Y9":[0,31,44],"00YB":[2],"00YE":[0,2],"00YT":[3],"00Z3":[13,41],"00Z8":[0,3],"00ZL":[1,4],"00ZR":[3],"00ZW":[0,21],"0112":[0,1],"011G":[1,2],"011N":[5,2],"011Y":[1],"0128":[0,4,30],"012E":[31,57,30],"012L":[0,2],"0134":[1],"013L":[0,6],"013X":[5,42],"0146":[0,10],"014I":[1],"014S":[1],"0150":[0,22],"015P":[1,28],"016K":[6,6],"016L":[3,3],"017M":[0,6],"018C":[1],"018Q":[6,1],"0190":[1,9],"019H":[1],"01AC":[4,4],"01BI":[0,5],"01BL":[32,123],"01BW":[1],"01C8":[0,4],"01DA":[2,7],"01DK":[8,11],"01E6":[0,2],"01EL":[9,3],"01EU":[3,8],"01EV":[1,2],"01F1":[0,0,0,1],"01F3":[0,3],"01G7":[1],"01GI":[18,11],"01H0":[0,11],"01HM":[1,3],"01IA":[0,3],"01IL":[1,10],"01J4":[0,1],"01J8":[2,2],"01JX":[4,11],"01JY":[1],"01K4":[0,4],"01KA":[1,2],"01KB":[1],"01KT":[0,2],"01KZ":[14,60],"01LH":[0,2],"01MH":[0,4],"01NT":[1],"01PJ":[3,3],"01PL":[2,6],"01PV":[0,4],"01QM":[1,6],"01R1":[15,23],"01SA":[0,7],"01SC":[1],"01TC":[0,0,56],"01TQ":[0,4],"01TR":[1,1],"01TV":[1],"01U8":[1],"01UH":[1,2],"01V8":[5,4],"01WZ":[0,2],"01XW":[0,3],"01XX":[4,2],"01XZ":[56,192,42],"01Y0":[6,6],"01YI":[2,16],"01YU":[0,1],"01Z3":[0,9],"01ZH":[1],"01ZS":[0,5],"01ZU":[0,2],"0213":[0,0,0,54],"021E":[0,20],"022H":[0,3],"022K":[2,3],"0233":[1],"023Y":[71,185,81],"0241":[370,467],"0244":[0,6],"024I":[2,12],"024M":[0,17],"024T":[1],"0253":[31,107],"025K":[1],"026K":[2],"027E":[1,7],"0285":[0,2],"0288":[0,2],"028X":[18,34],"028Z":[0,1],"0290":[0,2],"0294":[1],"029A":[17,19],"029T":[0,2],"02AI":[2],"02AN":[4],"02B0":[1],"02BU":[32,20],"02CP":[0,5],"02D2":[1],"02D7":[0,1],"02DY":[0,6],"02EN":[1],"02EW":[1],"02FE":[1],"02FU":[1],"02G0":[1],"02G6":[2],"02GW":[7,16,62],"02HH":[0,1],"02HR":[0,2],"02KL":[1],"02KQ":[0,2],"02KR":[0,5],"02LD":[28,26],"02LF":[0,2],"02LW":[185,345],"02NI":[0,2],"02P9":[0,15],"02Q4":[0,2],"02S4":[1,1],"02T6":[4,5],"02U8":[0,4],"02UG":[1],"02VL":[8,9,1],"02VP":[1,5],"02WS":[3],"02XF":[2,11],"0305":[1],"031A":[0,11],"032Y":[1],"0348":[24,112],"034R":[0,2],"0365":[0,3],"036X":[2],"0374":[197,498,143],"038D":[0,2],"038L":[0,5],"039S":[16,18],"03A8":[2,3],"03AI":[1],"03BL":[10,13],"03BN":[3,8],"03CS":[1],"03DV":[0,4],"03EG":[1,4],"03FC":[3],"03HY":[6,23,4],"03J9":[19,25,12],"03K8":[1],"03KK":[1],"03KZ":[2],"03PG":[0,2],"03PS":[0,2],"03QZ":[0,2],"03RB":[0,2],"03RF":[2],"03RR":[1],"03SL":[0,2],"03U1":[2],"03VL":[7,12],"03X3":[0,3],"03X6":[4,1],"03XQ":[0,3],"03YI":[3],"03YN":[1],"03YR":[0,2],"03YT":[0,2],"03Z8":[1],"040B":[1],"041A":[0,0,0,8],"0428":[0,2],"0431":[0,0,32],"043H":[0,4],"0440":[1],"0442":[1],"0443":[1],"0445":[0,2],"0448":[0,2],"044L":[0,5],"044Q":[0,10],"044S":[1],"0459":[0,0,46],"045K":[2],"046F":[0,2],"046Z":[1],"047X":[0,0,70],"048L":[1],"0490":[19,23],"04A7":[1,2],"04AE":[0,3],"04AN":[0,9],"04AW":[0,0,2],"04AX":[1],"04AY":[0,3],"04B4":[0,2],"04B8":[2,2],"04BF":[12,39],"04BN":[6,2],"04BU":[0,0,0,1],"04BX":[1],"04CI":[0,6,2],"04CZ":[1],"04D6":[1],"04DU":[11,21],"04DX":[0,4],"04EP":[0,3],"04F3":[0,2],"04F4":[8,25],"04FA":[2],"04FI":[4,1],"04FP":[0,2],"04FW":[0,2],"04GD":[1,13],"04GI":[7,25],"04GW":[1],"04HA":[3],"04HT":[10,9],"04HY":[3,3],"04I1":[1],"04ID":[1],"04JJ":[0,0,1],"04JN":[2,16,22,2],"04JV":[39,56,62],"04K4":[0,6],"04KM":[3,15],"04KR":[0,2],"04LJ":[5,18],"04LL":[1],"04LY":[2],"04MF":[0,11],"04MN":[1],"04N7":[1,4],"04PD":[0,2],"04QQ":[7,21],"04R0":[0,2],"04RK":[1],"04S0":[0,3],"04S7":[27,37],"04T6":[0,11],"04TJ":[2,4],"04US":[1,2],"04V9":[0,2],"04VC":[9,8],"04VH":[2],"04VN":[1],"04W1":[2,1],"04WF":[2,3],"04X1":[1],"04Y4":[3],"04YJ":[1],"04Z0":[1],"04Z6":[0,2],"04ZB":[5,16],"04ZE":[0,1],"04ZS":[0,2],"0506":[0,5],"051A":[0,2],"051E":[2],"051G":[0,3],"051K":[0,6],"0524":[0,1],"0525":[1,3],"052I":[0,4],"0533":[0,4],"054A":[0,0,30],"054H":[0,2],"054Z":[0,10],"055Q":[0,1],"0568":[1],"056E":[0,4,97],"056M":[0,8],"056X":[1],"0577":[2,1],"057L":[0,2],"057Q":[0,2],"057V":[2],"058J":[0,1],"058X":[1],"059L":[0,2],"059U":[0,1],"05A3":[0,0,0,20],"05AA":[8,2],"05B7":[1],"05CH":[0,5],"05EF":[0,4],"05EI":[2],"05EL":[3],"05GG":[11,15],"05GN":[1],"05GQ":[0,2],"05GX":[2],"05GY":[1],"05H7":[4,3],"05HA":[1],"05HB":[2,4],"05HC":[0,13],"05I4":[1],"05IF":[0,3],"05J2":[0,5],"05JC":[0,9],"05JT":[0,2],"05KL":[0,2],"05LZ":[0,1],"05MJ":[1],"05N3":[0,1],"05N8":[0,9],"05NH":[0,1],"05NK":[2,3],"05QK":[3],"05R6":[1,6],"05RA":[1,7],"05RG":[0,7],"05RH":[0,12],"05RT":[1,1],"05S8":[3],"05SR":[2],"05SX":[0,2],"05SY":[1,3],"05T9":[1],"05TP":[1],"05UA":[0,9],"05V0":[0,3],"05WB":[0,6],"05WM":[0,2],"05XK":[0,5],"05YM":[6],"05ZZ":[3,1],"060A":[1],"060C":[3,3],"060G":[0,3],"060H":[35,36],"0614":[1,4],"061H":[0,3],"061J":[16,40,45],"062G":[3,4],"062S":[1],"063T":[1],"063Y":[2,6],"063Z":[0,6],"0640":[18,27,39],"0648":[2],"064Q":[0,1],"064U":[1],"064W":[2],"065B":[0,2],"065F":[4],"065V":[0,3],"065W":[1],"0669":[0,2],"066A":[20,13],"066L":[0,3],"066W":[1,2],"0675":[0,5],"067S":[0,0,30],"0686":[1],"068T":[1],"068V":[4],"069V":[1,2],"06A3":[1],"06AD":[0,4],"06AU":[121,390,30],"06B4":[1],"06C5":[1,1],"06CA":[1,2,1],"06CC":[7,34],"06D8":[0,2],"06DM":[0,14],"06E0":[8,13],"06E4":[2],"06EK":[1],"06ET":[1],"06EY":[0,1],"06FD":[3,15],"06FS":[0,2],"06FT":[0,2,3],"06FW":[1],"06FX":[1,4],"06GS":[0,1],"06GV":[4,3],"06H8":[0,6],"06HK":[0,2],"06I0":[0,2],"06IF":[0,4],"06IM":[0,4],"06JB":[1],"06JD":[0,2],"06JX":[0,3],"06LC":[1],"06LL":[0,1],"06M2":[0,3],"06NN":[1],"06NU":[0,4],"06PT":[1],"06Q5":[45,78],"06QC":[3,10],"06QM":[0,1],"06QT":[0,10],"06S2":[7,16],"06SR":[10,33],"06T4":[1],"06TE":[1],"06TP":[0,1],"06TR":[69,247],"06UF":[2],"06UK":[0,4],"06V1":[0,0,89],"06W6":[0,2],"06W8":[0,11,37],"06WT":[1],"06WY":[5,10],"06X6":[1],"06XS":[1],"06XX":[1],"06Y6":[0,1],"06YL":[74,126],"06Z4":[1],"06ZE":[0,3],"06ZK":[3],"0701":[4],"070G":[4,5],"070S":[1],"0710":[5,3],"0729":[1],"072Z":[4,9,42],"0731":[1,4],"073G":[47,80],"073U":[0,2],"0740":[0,8],"0742":[5,13],"074K":[0,5],"076U":[1,2],"0777":[0,3],"0779":[1],"077N":[2,6],"077V":[0,1],"078I":[0,2],"078N":[0,6],"0792":[7,10],"079M":[1],"079U":[0,1],"079Z":[12,31],"07BZ":[1],"07D0":[2],"07D4":[1],"07DI":[0,2],"07DN":[1,2],"07EA":[2],"07EB":[6,9],"07FI":[0,2],"07FL":[0,5],"07G4":[1],"07G5":[0,2],"07I2":[1],"07JI":[0,4],"07JR":[5,2],"07KD":[2],"07KL":[1,6],"07LG":[2,2],"07MF":[0,3],"07MH":[1],"07N0":[1],"07ND":[0,0,2],"07NQ":[5],"07NU":[1],"07NW":[1,4],"07PN":[0,3],"07PR":[1],"07PS":[1],"07RE":[0,3],"07S8":[0,2],"07SK":[2],"07TX":[3],"07VW":[0,2],"07VX":[0,2],"07W3":[3,2],"07WF":[1],"07WW":[1,18],"07WX":[5,3],"07X0":[0,4],"07XQ":[7],"07XT":[8,2],"07Y4":[6,3],"07YC":[0,1],"07YQ":[3,8],"07ZF":[12,16],"07ZG":[4],"07ZH":[0,0,38],"07ZI":[2],"07ZM":[0,1],"07ZP":[16,15],"080E":[1,5],"080U":[0,2],"0818":[2],"082J":[5,8],"082S":[0,2],"0834":[5,6],"084I":[3,18,0,5],"0855":[2],"086E":[1],"086H":[1,5],"086I":[1],"0877":[0,3],"088A":[0,7],"088X":[99,306,76],"0898":[0,8],"089G":[96,90,30],"089R":[3,10],"08AJ":[1],"08AL":[1],"08BE":[1],"08C8":[9,9],"08CB":[8,27],"08CC":[0,3],"08CK":[0,2],"08CP":[0,4],"08CT":[0,4],"08D6":[2,1],"08D9":[6,11],"08DE":[0,3],"08E5":[3],"08E7":[0,2],"08EV":[1],"08F0":[0,1],"08FG":[0,0,99],"08FL":[1],"08FZ":[0,12,86],"08H8":[0,2],"08HE":[0,20],"08HI":[0,2],"08IW":[0,12],"08IY":[1,1],"08KJ":[2],"08L9":[3,4],"08LH":[0,4],"08LU":[1],"08LY":[42,15],"08MH":[2],"08MU":[0,1],"08P7":[0,2],"08PG":[11,11],"08PN":[0,1],"08QS":[0,4],"08RA":[3,4,1],"08RC":[1],"08RH":[0,3],"08RR":[0,0,0,1],"08S2":[0,9],"08TM":[3,0,48],"08TQ":[1,0,5],"08TZ":[1],"08UF":[0,4],"08UL":[2],"08UV":[103,124,30],"08W4":[2],"08WD":[0,2],"08X9":[2],"08XD":[0,2],"08Y8":[38,64,33],"08YV":[0,13],"08Z0":[1],"08Z2":[3,4],"08ZL":[0,4],"08ZZ":[1],"0908":[3,1],"090D":[0,2],"090E":[1,6],"090Y":[4,3],"091G":[3,5],"0921":[9,26],"0924":[0,3],"092M":[0,2],"093C":[0,1],"093M":[0,7],"0940":[2],"0942":[0,8],"094A":[1,19],"094D":[0,2],"096P":[2],"0996":[18,8],"0999":[61,81],"099G":[14,75,1],"099N":[82,177],"099W":[0,2],"0AE7":[2,4],"0AED":[0,3],"0AEL":[1,1],"0AEU":[0,2],"0AF5":[1],"0AF8":[0,4],"0AFB":[107,148],"0AFU":[0,3],"0AFZ":[109,89],"1":[1],"194A":[8],"196A":[9,18],"1A12":[1],"21A9":[0,1],"224A":[113,120],"231A":[2,3],"236A":[5,4],"23AA":[17,84],"24A9":[4],"266A":[18,22],"267A":[2],"26A1":[1],"275A":[13,28,8],"286A":[0,0,33,2],"28A6":[6],"28A7":[0,3],"28A9":[1],"297A":[0,1],"2A15":[1],"2A17":[1],"2A21":[5],"2A68":[2,10],"2A6A":[0,3],"2A72":[0,3],"2AA2":[0,9],"3191":[4,7],"34A3":[1],"34A5":[0,0,0,45],"34A9":[0,3],"351A":[1,5],"369A":[12,41],"38A5":[44,92],"38AA":[13,4],"396A":[0,4],"397A":[0,3],"3A19":[2,6],"3A62":[1,13],"4218":[1,3],"425A":[1],"4341":[7,4],"439A":[10],"44A2":[7],"44A6":[1,7],"5394":[1],"5418":[6,12],"8025":[3],"900":[106,0,0,583],"9406":[2],"9560":[17,24],"9600":[2,2],"9644":[3],"9654":[10,4],"9655":[6,3],"9824":[0,0,0,3]},"2026-02":{"000F":[1,2],"001U":[0,2],"0024":[21],"0050":[0,2],"0051":[0,5],"006J":[0,2],"006Z":[9,28],"0075":[2,6],"007A":[8,25,20],"007M":[0,3],"007Q":[0,2],"0081":[2],"0083":[4],"008L":[1],"008T":[0,12],"009F":[0,3],"009H":[7,6],"009K":[0,1],"00AA":[0,5],"00AD":[1,13],"00AE":[0,3],"00B0":[1,2],"00B6":[2],"00B9":[0,4],"00BJ":[0,2],"00C4":[0,4],"00CD":[1],"00CI":[2,2],"00CJ":[1],"00CR":[1],"00CT":[1],"00CV":[0,1],"00D5":[0,0,97],"00DU":[0,5],"00E1":[2,2],"00EG":[0,2],"00EH":[0,3],"00ER":[1],"00EY":[11,17,9],"00FQ":[0,1],"00GK":[0,3],"00H2":[0,1],"00H8":[1],"00HP":[1,12],"00HU":[2,5],"00HV":[5],"00I6":[41,112],"00IM":[1],"00KG":[0,2],"00KI":[1,2],"00L3":[18,47],"00L4":[2,4],"00LA":[1],"00LG":[0,3],"00MD":[0,0,78],"00MS":[5,24],"00NA":[0,4],"00NL":[1],"00NZ":[2,1],"00PG":[4],"00QF":[10,67],"00QL":[1],"00R3":[2,6],"00R5":[3],"00R6":[1,4],"00RN":[0,2],"00SU":[0,6],"00SZ":[0,2],"00T9":[5],"00TU":[0,5],"00UG":[1],"00V0":[0,0,47],"00VF":[7,43],"00VM":[1],"00WV":[0,2],"00XQ":[19,13],"00XW":[10,14],"00XX":[80,202],"00Y9":[0,11,47],"00YD":[1],"00YT":[2,8],"00Z3":[21,34],"00ZN":[0,1],"00ZR":[1],"011N":[0,2],"011Y":[0,3],"012E":[24,99],"013K":[0,2],"013L":[2,4],"013X":[18,23],"0146":[0,2],"0150":[0,2],"0156":[2],"015F":[0,1],"015H":[0,20],"015P":[1,31],"016K":[1,1],"016L":[5],"0178":[1,2],"0182":[1,1],"018Q":[2,1],"018X":[0,4],"0190":[0,17],"0191":[0,8],"019J":[2,3],"01A5":[1],"01AC":[2,26],"01BB":[1],"01BI":[0,4],"01BL":[38,130,1],"01C8":[0,2],"01CN":[2],"01DA":[0,4],"01DC":[0,4],"01DK":[8,18],"01DY":[1],"01E6":[1],"01EL":[1,7],"01EP":[1],"01EU":[5],"01EV":[0,6],"01G7":[0,2],"01GI":[10,23],"01GL":[0,4],"01HM":[0,4],"01IL":[0,13],"01J8":[1],"01JX":[0,5],"01JY":[3],"01K4":[0,3],"01KA":[2],"01KJ":[0,2],"01KZ":[11,36],"01M5":[1],"01N2":[1],"01P5":[1],"01PJ":[0,10],"01PL":[3,6],"01PV":[0,5],"01Q3":[0,4],"01Q6":[0,2],"01QM":[2],"01R1":[16,18],"01R9":[0,3],"01SY":[0,5],"01TT":[0,2],"01TZ":[0,1],"01UH":[4,12],"01UU":[0,3],"01V8":[1,5],"01W2":[1],"01WZ":[1],"01X0":[1],"01XM":[0,19],"01XQ":[2],"01XX":[1],"01XZ":[47,198,2],"01Y0":[5,14,31],"01YD":[0,3],"01YI":[3,12],"01YU":[1,18],"01Z3":[1,7],"01ZH":[0,2],"01ZL":[0,2],"01ZS":[0,3],"01ZT":[0,3],"01ZU":[1],"0213":[0,0,0,19],"021E":[0,29],"022Q":[1,2],"022T":[0,0,3],"0233":[2,1],"023Y":[67,246,23],"0241":[379,572],"0244":[0,42,30],"024I":[0,6],"024M":[0,44],"0253":[23,103],"025E":[1],"025X":[1],"026K":[1],"027E":[1,2],"027W":[0,4],"028X":[13,25],"029A":[15,51],"02AI":[1,2],"02B0":[2,5],"02BU":[19,31,71],"02C9":[0,2],"02D2":[1,4],"02D7":[1],"02EU":[1],"02EW":[2,1,2],"02F9":[0,6],"02FD":[0,1],"02FS":[0,2],"02FU":[1],"02G0":[0,2],"02GW":[2,12],"02HM":[0,2],"02HN":[1],"02HR":[2,1],"02IC":[1],"02KL":[0,3],"02LD":[20,24],"02LL":[0,2],"02LW":[159,505],"02M7":[1],"02MM":[0,2],"02MY":[1],"02NQ":[1,0,36],"02PU":[0,3],"02PY":[2],"02S1":[0,3],"02S4":[2,4],"02S6":[0,3],"02T6":[4,14],"02U8":[0,2],"02UM":[1,5],"02UY":[0,2],"02VL":[3,8],"02VP":[0,3],"02WS":[2,5],"02XF":[2,5],"02ZA":[1],"030U":[1,3],"031M":[0,12],"0322":[1],"0326":[1],"0327":[0,2],"033H":[0,2],"0342":[0,3],"0348":[15,67],"035C":[0,2],"0365":[0,6],"036K":[1,2],"036X":[1],"036Y":[0,1],"0374":[159,716,54],"038L":[1],"039I":[0,6],"039S":[11,6],"03A8":[1,5],"03BL":[5,12],"03BN":[1,3],"03EG":[2,3],"03FY":[0,0,33],"03GF":[0,2],"03GM":[0,7],"03GQ":[0,1],"03GW":[0,2],"03H0":[0,0,99],"03HY":[12,17],"03IQ":[0,2],"03J9":[9,32,1],"03K8":[0,5],"03KZ":[1],"03L7":[1],"03LI":[0,12],"03NF":[1],"03QF":[0,2,38],"03RR":[3],"03SA":[0,2],"03SI":[0,1],"03SL":[1,5],"03TY":[1],"03UG":[2],"03VL":[7,8],"03WB":[0,1],"03X6":[2],"03XQ":[0,5],"03XV":[0,1],"03ZC":[0,2],"040X":[1],"0415":[0,2],"042M":[0,4],"0440":[0,3],"044L":[0,12],"044N":[0,6],"044Q":[0,2],"044S":[2],"046F":[0,5],"046H":[0,0,52],"047X":[0,0,31],"0486":[0,0,22],"0489":[0,2],"048L":[1],"048T":[2],"048X":[0,0,57],"0490":[18,11],"049V":[1,2],"04AN":[0,2],"04AY":[0,7],"04B8":[3,5],"04BF":[13,41],"04BN":[1,3],"04BU":[0,0,0,4],"04C1":[0,1],"04CI":[0,5,2],"04CZ":[0,2],"04D6":[1],"04DR":[1],"04DU":[7,10],"04DX":[0,3],"04EE":[0,3],"04F3":[0,13],"04F4":[3,23],"04FA":[1],"04FI":[2,4],"04FP":[1,3],"04GB":[1],"04GD":[0,11],"04GI":[4,28],"04HA":[3],"04HT":[6],"04HY":[1,5],"04JJ":[0,0,48],"04JN":[2,2,1],"04JV":[30,57,53],"04K4":[0,7],"04KM":[1,17],"04KR":[0,2],"04L2":[1],"04LJ":[5,30],"04LY":[1],"04MF":[3,2],"04MN":[0,1],"04MQ":[0,3],"04N7":[0,4],"04NR":[1,3],"04PD":[5,4],"04QQ":[4,7],"04QZ":[0,2],"04R0":[2,2],"04RK":[1],"04S0":[1,1],"04S7":[17,35,7],"04SS":[1,5],"04TJ":[1,3],"04US":[2,2],"04UY":[0,2],"04V9":[0,15],"04VC":[5,19],"04VH":[2],"04VL":[0,2],"04VX":[0,1],"04W1":[1,2],"04WF":[0,1],"04WV":[0,0,0,1],"04X1":[0,0,30],"04XP":[0,1],"04Y4":[1],"04Y7":[0,2],"04YS":[3],"04ZB":[5,10],"04ZN":[3],"0502":[0,2],"0506":[0,4],"050D":[1],"0512":[1],"051A":[1,2],"051K":[0,6],"051W":[0,4],"0524":[0,0,112],"0525":[0,6],"052P":[1,4],"0535":[3,1],"054B":[2],"054H":[0,5],"054P":[1],"054Z":[0,5],"055I":[0,2],"055Q":[0,4],"055Y":[0,3],"0568":[0,3],"056E":[1],"056N":[0,2],"056R":[1],"056X":[0,4],"0577":[1,5],"057I":[0,3],"057Q":[2],"058C":[0,2],"059L":[2],"059S":[0,2],"059Z":[0,15],"05A3":[0,0,0,1],"05AA":[4,3],"05B7":[6],"05BP":[0,3],"05CH":[0,10],"05DB":[0,3],"05DX":[1],"05EI":[3,2],"05EL":[3,2],"05ER":[1],"05EU":[0,0,89],"05EV":[0,3],"05FV":[0,2],"05GG":[21,7],"05GX":[1,5],"05H7":[8,16],"05HB":[3],"05HV":[0,5],"05HY":[0,2],"05I4":[1],"05JC":[2,6],"05JF":[0,2],"05JR":[1],"05JT":[0,2],"05KD":[1],"05KN":[0,4],"05L4":[0,1],"05L6":[2],"05LZ":[0,4],"05MJ":[0,2],"05N8":[0,4],"05NM":[1],"05P0":[2,3],"05P1":[0,7],"05PT":[1],"05Q5":[0,1],"05QB":[0,5],"05QK":[1],"05QT":[0,3],"05R6":[0,9],"05RA":[2,11],"05RH":[0,7],"05RT":[1,1],"05SR":[3,4],"05SX":[5],"05SY":[0,3],"05T9":[1],"05V3":[0,2],"05WM":[0,4],"05X1":[1],"05XH":[0,1],"05XK":[2],"05XW":[1],"05YM":[0,8],"05Z4":[0,1],"05ZZ":[2,2],"060H":[37,27],"061A":[0,0,30],"061J":[22,45,2],"061P":[0,2],"062E":[0,3],"062G":[0,3],"062J":[1],"062S":[0,0,30],"063W":[0,4],"063Y":[5,6],"0640":[11,28],"0648":[2],"064Q":[0,3],"064U":[1],"064W":[1],"0656":[1],"065C":[3],"065W":[0,13],"066A":[11,8],"066U":[0,2],"0675":[0,2],"067G":[0,3],"067S":[0,8],"0683":[1],"0686":[2],"068V":[8,31],"0696":[1,0,31],"06AD":[0,3],"06AL":[0,2],"06AU":[131,386],"06B2":[0,0,32],"06B4":[0,4],"06B6":[1],"06BN":[0,5],"06CA":[0,0,1],"06CC":[2,8],"06D8":[0,12],"06E0":[3,28],"06E7":[0,2],"06EK":[0,1],"06FD":[4,18],"06FM":[0,2],"06FS":[0,4],"06FT":[2,0,2],"06FX":[0,7],"06G5":[0,2],"06GF":[1,2],"06GQ":[0,2],"06GS":[0,2],"06JB":[2],"06KF":[0,7],"06KH":[0,2],"06M2":[0,2],"06N2":[1],"06NA":[0,2],"06NI":[1,4],"06Q1":[0,2],"06Q5":[46,109],"06QC":[3],"06QF":[0,3],"06QZ":[1],"06S2":[9,28],"06SR":[7,24],"06T4":[1],"06TE":[0,4],"06TP":[1],"06TR":[49,321],"06U2":[0,1],"06UF":[0,2],"06V1":[0,16,124],"06W6":[0,4],"06W8":[5,2],"06WT":[0,4],"06WY":[9,15],"06X1":[0,2],"06X7":[0,3],"06XQ":[0,5],"06Y6":[1],"06YE":[0,2],"06YL":[48,130],"06Z4":[1,4],"06ZH":[0,0,2],"0701":[1],"0706":[0,3],"070G":[4,8],"070S":[2],"070W":[0,2],"0710":[4],"0715":[1,11],"071B":[0,2],"071Y":[1],"072Z":[5,4],"0731":[0,15],"0734":[0,2],"073G":[33,118],"073U":[5,5],"0742":[2,5],"074D":[0,4],"074K":[0,4],"074N":[1,4],"076J":[1],"0779":[1],"077B":[0,1],"077N":[2,13],"078J":[0,2],"078N":[0,5],"078Z":[1],"0792":[4,26],"079C":[0,2],"079Z":[18,70,34],"07A9":[1],"07AL":[0,4],"07CV":[0,2],"07D0":[3],"07D1":[1,3],"07D6":[1],"07DI":[2],"07DL":[2],"07DN":[0,1],"07EA":[1],"07EB":[2],"07G5":[0,5],"07G9":[0,2],"07J2":[1,3],"07JR":[2,10],"07LG":[1,1],"07MH":[4,5],"07NQ":[1,2],"07NU":[1],"07P3":[2],"07Q5":[0,2],"07Q6":[0,6],"07SK":[1,3],"07U9":[0,4],"07UA":[2],"07W3":[1,4],"07WW":[0,11],"07X0":[0,4],"07X7":[0,2],"07XQ":[2],"07XT":[1,5],"07Y4":[1,6],"07YB":[2,6],"07YQ":[2],"07ZF":[19,18],"07ZG":[2],"07ZJ":[0,18,9],"07ZM":[2,2],"07ZP":[9,16],"0805":[1],"080E":[2],"081V":[0,4],"082J":[4,9],"082R":[1],"0834":[1,5],"0849":[2],"084I":[3,22,0,1],"0855":[4],"0867":[0,2],"086H":[3,14],"088A":[1,5],"088X":[89,327,52],"0898":[0,2],"089G":[95,87],"089R":[2,11],"08A1":[1],"08AJ":[2],"08BC":[2],"08BN":[0,5],"08BS":[0,14],"08C8":[9,20],"08CB":[12,42],"08CJ":[1],"08CK":[1,5],"08CT":[4],"08D6":[0,10],"08D9":[4,25],"08DE":[0,10],"08DS":[0,2],"08FA":[1],"08FB":[1],"08FZ":[1,13,3],"08H4":[0,2],"08H8":[0,4],"08HI":[2,8],"08IP":[1],"08JP":[1],"08KJ":[1,4],"08L2":[0,2],"08LH":[0,3],"08LQ":[0,3],"08LU":[0,3],"08LY":[35,21],"08NL":[1,4],"08P7":[0,2],"08PG":[11,21],"08PK":[1],"08PT":[0,1],"08PV":[0,1],"08QS":[1,6],"08RA":[1,15],"08RR":[0,0,0,5],"08TM":[1],"08TZ":[0,9],"08UL":[1,7],"08UV":[56,146,6],"08V8":[0,10],"08W4":[4],"08XG":[0,2],"08XI":[0,2],"08XW":[0,2],"08Y8":[31,107,70],"08Z2":[0,1],"090E":[1,10],"090X":[2],"090Y":[1],"0915":[0,0,59],"091G":[5,6],"0921":[11,20],"092M":[2,8],"092N":[1],"0937":[0,2],"093C":[1,1],"093M":[0,6],"093V":[1],"0942":[0,4],"094A":[5,39],"095J":[0,1],"096I":[1],"096P":[2],"0994":[1,2],"0996":[18,30],"0999":[54,71],"099G":[14,61],"099N":[95,204],"09AD":[0,2],"09AV":[0,3],"09B0":[1],"0ABU":[4],"0AE6":[0,3],"0AE7":[1,5],"0AEU":[0,7],"0AF5":[1,2],"0AFB":[146,303],"0AFU":[0,6],"0AFZ":[112,172],"194A":[5,2],"196A":[6,23],"1A12":[1],"21A9":[3,6],"224A":[132,60],"231A":[5],"236A":[5],"239A":[1],"23AA":[15,94],"2497":[1],"24A9":[3],"262A":[0,2],"266A":[32,45],"267A":[2,2],"26A1":[2,3],"26A6":[1],"275A":[10,34],"27A6":[2],"286A":[0,0,0,3],"28A6":[2,0,1],"296A":[1,2],"2A21":[5,1],"2A2A":[0,1],"2A4A":[6],"2A68":[5,13],"2A6A":[1,2],"2A78":[0,3],"2AA2":[1],"3191":[5,2],"322A":[2],"34A3":[2],"34A5":[0,0,0,30],"34A8":[0,0,32],"34A9":[2,3],"351A":[0,4],"35A3":[1],"35A9":[0,2],"369A":[8,44],"36A5":[1],"378A":[1,12],"38A5":[22,86],"38AA":[6],"3A19":[2,2],"3A62":[3,46],"3A8A":[1],"3A95":[0,2],"3A9A":[0,3],"3AA1":[0,10,75],"42AA":[2],"4341":[1,2],"439A":[4],"44A2":[2,3],"44A6":[5,39],"459A":[0,3],"47A5":[2,2],"4A46":[0,2],"4A53":[2],"5351":[2],"5394":[1],"5418":[8,23],"7786":[2,2],"8025":[2],"8954":[1],"900":[82,0,0,702],"9406":[1],"9560":[17,17],"9600":[3],"9641":[1],"9644":[2],"9645":[5],"9654":[6],"9655":[8,2]},"2026-03":{"0002":[0,3],"000F":[1],"000K":[0,1],"0012":[1],"0024":[3],"002H":[2],"002Q":[0,4],"0038":[0,5],"004Q":[1],"0050":[3,2],"0051":[0,2],"005M":[0,1],"006J":[1],"006Z":[16,21],"0075":[6,10],"007A":[36,52],"007Q":[0,1],"008L":[0,2],"008T":[0,6],"0091":[0,23],"0096":[0,4],"0099":[0,3],"009F":[1,1],"009H":[4,5],"009T":[0,0,8],"00AA":[2,3],"00AB":[0,4],"00B0":[3,3],"00B2":[0,2],"00B5":[1],"00B6":[0,4],"00B7":[1],"00B9":[0,2],"00C4":[0,6],"00CD":[0,4],"00CI":[3],"00CJ":[2,10],"00CR":[1],"00D5":[0,0,63],"00DC":[0,3],"00DU":[0,0,1],"00E1":[1],"00EG":[0,25],"00EH":[1],"00EJ":[1,2],"00EY":[20,27,2],"00F1":[0,1],"00FT":[0,2],"00GK":[0,2],"00H6":[0,2],"00H8":[1,9],"00HP":[0,2],"00HR":[2],"00HU":[2,7],"00HV":[3,10],"00I5":[1],"00I6":[83,79],"00J3":[1],"00JN":[0,5],"00K2":[1],"00KA":[0,3],"00KE":[0,3],"00KI":[0,3],"00L3":[21,46],"00L4":[0,2],"00LH":[0,4],"00LU":[0,1],"00MS":[8,30],"00N4":[0,2],"00NA":[3,5],"00P0":[1],"00PG":[0,5],"00PM":[0,2],"00PW":[0,3],"00QF":[26,142],"00QQ":[0,1],"00R3":[4,2],"00R5":[0,3],"00R6":[2,19],"00R7":[0,2],"00RN":[0,2],"00S4":[0,2],"00SB":[2],"00T9":[4,2],"00TK":[1,0,34],"00TU":[0,4],"00VF":[16,63],"00W6":[0,5],"00XQ":[12,10],"00XW":[4,20],"00XX":[119,243,1],"00Y9":[0,6],"00YE":[1],"00YT":[5,3],"00Z3":[16,28,37],"00ZL":[5,3],"00ZW":[0,1],"010P":[0,1],"011Y":[1],"0122":[0,2],"0128":[1],"012B":[1],"012E":[52,125],"0132":[0,4],"013L":[1,4],"013X":[53,60],"0150":[0,3],"015P":[4,30],"016F":[1],"016K":[0,20],"016L":[0,4],"0178":[1],"017F":[1],"0182":[1],"018Q":[4,7],"018V":[0,1],"0190":[3,3],"0191":[0,3],"019J":[0,3],"01A7":[0,2],"01AC":[2,26],"01BI":[1,15],"01BL":[43,155,42],"01BW":[2],"01C8":[1],"01CM":[0,1],"01CN":[1,3],"01CX":[0,6],"01DA":[1,12],"01DC":[0,3],"01DK":[22,38],"01DQ":[0,0,61],"01E6":[0,0,99],"01EG":[0,3],"01EL":[3,10],"01EU":[12,4],"01EV":[1,1],"01FM":[2,2],"01GI":[36,49],"01HM":[0,2],"01HZ":[1],"01IL":[1,9],"01J8":[0,4],"01JX":[3,4],"01JY":[4,3],"01KA":[0,4],"01KT":[0,3],"01KZ":[17,61],"01LC":[0,1],"01MH":[0,2],"01N5":[1],"01PJ":[6,13],"01PL":[4,3],"01PV":[0,6],"01Q6":[0,2],"01Q8":[2],"01QX":[1],"01R1":[13,35],"01RK":[0,3],"01SC":[1,4],"01SK":[0,3],"01SS":[0,2],"01TC":[0,0,16],"01TQ":[0,6],"01TZ":[0,2],"01UH":[11,11],"01UU":[0,3],"01V1":[2],"01V8":[3,4],"01WC":[0,1],"01WZ":[3],"01XG":[0,2],"01XU":[0,3],"01XX":[2],"01XZ":[57,260,4],"01Y0":[13,14,3],"01YI":[5,16],"01YU":[2,30],"01Z3":[0,13],"01ZH":[0,1],"01ZJ":[0,3],"01ZK":[1],"01ZT":[1,3],"01ZU":[0,3],"0213":[0,0,0,22],"021E":[0,70],"022K":[0,3],"023A":[0,2],"023T":[1],"023Y":[78,350,5],"0241":[490,831],"0244":[6,16,3],"024I":[0,23],"024M":[0,55],"0251":[0,2],"0253":[39,94,30],"025B":[0,2],"026K":[2],"0274":[1],"027A":[0,2],"027D":[1],"027E":[1,16],"027W":[1,3],"0281":[0,3],"028W":[1],"028X":[23,49],"0290":[0,5],"0294":[0,2],"029A":[14,34,1],"029D":[1],"029T":[0,11],"029Y":[2,1],"02AI":[2,4],"02AN":[2],"02B0":[6,16],"02BQ":[1],"02BU":[21,80],"02C0":[0,0,35],"02C6":[0,2],"02CQ":[1],"02D2":[2,1],"02D7":[1],"02DR":[0,3],"02EI":[1],"02EU":[0,1],"02EW":[3,2,3],"02FD":[0,5],"02FE":[1],"02FU":[0,2],"02G6":[2],"02G7":[1],"02GW":[6,52],"02HS":[0,1],"02I1":[1],"02IU":[0,1],"02JH":[0,4],"02JS":[0,1],"02LD":[34,48],"02LQ":[1],"02LW":[250,859,100],"02M2":[0,2],"02MA":[0,4],"02MM":[1],"02NQ":[1,1,1],"02PU":[1],"02R2":[0,2],"02S4":[1,3],"02ST":[0,2],"02T6":[5,12],"02UB":[1,2],"02UM":[0,7],"02VL":[16,10],"02VP":[5,5],"02WS":[2,5],"02XF":[0,9],"02XG":[0,2],"02YD":[2,12],"02Z3":[0,2],"0316":[0,3],"0326":[0,4],"032K":[1],"032W":[1],"0342":[0,2],"0348":[53,115],"0361":[0,1],"0365":[1],"036K":[2,4],"036S":[0,3],"0374":[214,1020,104],"037A":[0,2],"038L":[2],"039I":[0,2],"039S":[23,25],"03A8":[1],"03BL":[13,22],"03BN":[3,1],"03CF":[0,3],"03DU":[0,5],"03DV":[1,2],"03E0":[1],"03EG":[5,2],"03FY":[0,1,15],"03GR":[0,3],"03HY":[6,43,1],"03J9":[29,16,84],"03K8":[2,7],"03KK":[2],"03KZ":[1,5],"03LS":[0,2],"03NJ":[0,1],"03PG":[2],"03PS":[1],"03QI":[0,1],"03QY":[0,2],"03RB":[1],"03RG":[1],"03RR":[1],"03SI":[0,1],"03SL":[0,2],"03TP":[1],"03TY":[0,1],"03V3":[1],"03VC":[0,4],"03VL":[16,4],"03W8":[0,2],"03WG":[1],"03X6":[6,2],"03YN":[2,4],"03YT":[0,2],"03Z8":[0,4],"03ZU":[0,2],"0417":[0,2],"041A":[0,0,0,13],"0431":[0,0,4],"0435":[1],"0440":[0,2],"0442":[1],"0445":[0,7],"044L":[0,1],"044Q":[0,4],"0459":[0,0,20],"045K":[0,2],"0461":[0,2],"046F":[0,26],"0473":[1],"047F":[1],"0486":[0,0,6],"0489":[1],"048T":[2],"048X":[0,0,1],"0490":[27,22],"0491":[2,1],"049Q":[1],"049V":[2,1],"04A7":[1,3],"04AN":[0,8],"04AX":[1],"04B0":[0,3],"04B8":[4,20],"04BF":[28,74],"04BN":[2],"04BU":[0,0,0,2],"04C1":[0,1],"04C3":[0,3],"04CJ":[0,3],"04D3":[0,1],"04D6":[1],"04DU":[9,22],"04EE":[0,8],"04EP":[1,5],"04F3":[0,1],"04F4":[6,22],"04FA":[1],"04FI":[1,3],"04FP":[1,6],"04G9":[1],"04GD":[4,5,8],"04GI":[7,49],"04GK":[2],"04GR":[0,5],"04GX":[0,3],"04HA":[2,10],"04HB":[1],"04HT":[10,9],"04HX":[1],"04HY":[1,17],"04JN":[1,3],"04JU":[0,1],"04JV":[22,54,13],"04K4":[0,17],"04KM":[4,5],"04KR":[0,4],"04LJ":[10,20],"04LL":[0,2],"04MF":[2,12],"04MN":[0,1],"04MQ":[0,2],"04NR":[0,3],"04NV":[0,2],"04PC":[1],"04PD":[2],"04PI":[2,4],"04Q9":[0,1],"04QQ":[11,34],"04QZ":[1],"04R0":[1,5],"04R7":[0,3],"04RA":[0,2],"04RE":[3],"04RK":[1],"04S0":[2,3],"04S7":[39,38,3],"04SM":[0,1],"04SS":[0,2],"04US":[0,3],"04VC":[4,7],"04VD":[0,4],"04VF":[2],"04VR":[1],"04W1":[0,9],"04WF":[2,4],"04WM":[0,2],"04WR":[0,2],"04WT":[1],"04XK":[1],"04YS":[1],"04YU":[0,2],"04ZB":[12,20],"04ZD":[0,2],"0506":[3,2],"0512":[0,2],"051A":[1],"051E":[2,10],"051K":[1],"0524":[2,11],"0525":[1],"052B":[2],"0535":[2],"053Z":[0,4],"0544":[2],"054P":[1],"054U":[0,4],"054Z":[1,4],"0556":[1],"055Q":[2,15],"0568":[2,19],"056E":[0,7,1],"056N":[0,2],"056X":[1,3],"0577":[2,16],"057N":[0,2],"0587":[0,2],"058C":[1],"05A3":[0,0,0,117],"05A9":[0,7],"05AA":[7,3],"05B7":[1,4],"05BP":[1],"05CE":[0,2],"05CH":[0,6],"05DF":[0,3],"05EI":[2,26],"05EL":[1,2],"05ER":[3,11],"05FY":[0,3],"05G6":[1],"05GA":[2],"05GG":[22,34],"05GN":[2,1],"05GY":[0,6],"05H1":[0,4],"05H7":[4,10],"05HB":[7,7],"05IH":[0,3],"05JC":[1,12],"05K1":[2],"05K2":[0,1],"05KJ":[0,4],"05KK":[0,2],"05KL":[4,1],"05KN":[2,3],"05LN":[0,4],"05LV":[1],"05N3":[0,3],"05N8":[0,6],"05NK":[1,4],"05NZ":[0,2],"05P1":[0,4],"05PL":[0,5],"05PT":[0,3],"05QK":[5,6],"05QT":[1],"05R6":[1,2],"05RA":[0,3],"05RG":[0,9],"05RH":[0,3],"05RT":[0,3],"05S8":[1],"05SR":[2,13],"05SX":[3,5],"05SY":[1,4],"05T6":[0,2],"05TP":[3],"05UA":[1],"05UK":[2],"05W0":[1],"05W5":[1],"05WM":[0,1],"05XK":[0,3],"05Y2":[0,1],"05YG":[0,3],"05YL":[0,5],"05YM":[6],"05YU":[0,2],"05ZP":[1],"05ZZ":[2,1],"060C":[1],"060H":[43,54],"060P":[3],"0616":[1],"061D":[0,2],"061F":[1],"061J":[28,120],"0620":[0,1],"062E":[0,3],"062G":[3,3],"063T":[1,3],"063W":[2],"063Y":[10,2],"0640":[18,6],"0648":[1],"064Q":[0,4],"065I":[0,1],"065S":[0,1],"065W":[2,2],"0663":[1],"066A":[29,21],"066L":[0,2],"066W":[3],"067J":[0,2],"067S":[1,11],"067U":[1,1],"0683":[1,4],"068V":[9,23],"0696":[1,2],"0699":[0,6],"069L":[0,4],"069V":[1],"06A6":[1,4],"06A9":[2],"06AD":[2],"06AU":[179,567],"06B2":[0,0,13],"06B4":[0,2],"06C5":[1],"06CA":[0,7],"06CC":[7,22],"06D0":[1],"06D8":[1,13],"06DM":[0,11],"06E0":[1,9],"06EK":[0,5],"06FD":[8,36,1],"06FM":[0,3],"06GQ":[0,3],"06GV":[2,4],"06HA":[0,0,68],"06HK":[1,2],"06IF":[1],"06IM":[0,3],"06J4":[0,3],"06J7":[0,1],"06JB":[0,2],"06JD":[0,3],"06L5":[0,15],"06LC":[1],"06N9":[2],"06NI":[0,4],"06NV":[2],"06P3":[0,3],"06PM":[1,6],"06PU":[3],"06PX":[1],"06Q5":[66,123],"06Q8":[0,2],"06QC":[2,5],"06QF":[1],"06S2":[6,43,35],"06S9":[0,2],"06SR":[9,32],"06T6":[1],"06TR":[95,350,4],"06UF":[0,3],"06UQ":[1,5],"06V1":[0,15,34],"06V3":[0,1],"06VP":[1],"06W6":[0,3],"06W8":[2,20,2],"06WT":[2,2],"06WY":[7,20],"06X1":[0,2],"06XF":[1],"06Y0":[0,4],"06YE":[0,3],"06YL":[133,219],"06ZE":[0,8],"06ZH":[0,0,3],"06ZK":[1],"0701":[0,2],"0706":[0,4],"070G":[6,5,1],"070S":[1],"070W":[0,6],"0710":[9,8],"0715":[4],"072Z":[2,2],"0731":[1,25],"0734":[0,2],"073G":[53,136],"073U":[1,13],"0742":[2,17],"074A":[2],"074D":[0,2],"074K":[0,3],"076A":[0,4],"077N":[1,30],"077U":[0,13],"077V":[0,1],"078K":[0,3],"0792":[0,15],"079Z":[20,49],"07B2":[0,4],"07BI":[1],"07BX":[0,6],"07CV":[1],"07D0":[7],"07D5":[1],"07DL":[1],"07DN":[1],"07EA":[1,4],"07EB":[4,2],"07EG":[0,1,32],"07ES":[0,2],"07FF":[0,2],"07FI":[0,2],"07FX":[1],"07G5":[0,1],"07G9":[0,4],"07GG":[1],"07GR":[4],"07HB":[1],"07IA":[1,5],"07J2":[2],"07J9":[1],"07JR":[5,4],"07K0":[0,3],"07LG":[4,2],"07LS":[1],"07MF":[0,2],"07MH":[0,4],"07NQ":[3,3],"07PR":[1],"07Q6":[3],"07RH":[0,2],"07RM":[0,9],"07SK":[4,1],"07ST":[2],"07TX":[2],"07TY":[0,2],"07UM":[0,2],"07VW":[0,3],"07VY":[0,3],"07W3":[2,20],"07WM":[2],"07WT":[1],"07WX":[0,3],"07XQ":[0,2],"07XT":[5,12],"07Y4":[0,9],"07YB":[4],"07YC":[1],"07YE":[1],"07YQ":[5,2],"07Z4":[2],"07ZA":[1,4],"07ZF":[21,39],"07ZG":[1],"07ZH":[0,0,10],"07ZJ":[0,16],"07ZM":[2],"07ZP":[9,48],"080E":[2,6],"080U":[0,2],"0818":[1,2],"081P":[0,2],"082G":[1],"082J":[2],"0834":[0,8],"083G":[1],"0849":[0,4],"084B":[0,1],"084I":[8,24,45,2],"084M":[0,2],"084S":[0,2],"0855":[2,5],"085K":[0,2],"086E":[0,30],"086H":[2,13,3],"088A":[1],"088B":[1],"088G":[0,4],"088X":[99,485,88],"0898":[0,3],"089G":[141,137],"089R":[4,8],"08AJ":[1,3],"08AK":[0,3],"08AL":[1],"08BC":[0,3],"08C8":[8,10],"08CB":[8,19],"08CK":[1,2],"08CP":[2,8],"08CT":[1,6],"08CY":[0,3],"08D0":[0,3],"08D6":[0,5],"08D9":[11,12],"08DS":[3,9],"08E5":[0,4],"08E7":[0,16],"08EF":[0,1],"08EV":[1],"08FB":[1],"08FD":[1],"08FR":[0,22],"08FZ":[5,16,4],"08H4":[0,15],"08H8":[0,4],"08HE":[0,2,68],"08HK":[2,2],"08IW":[0,3],"08K5":[1],"08KJ":[1,9],"08L9":[3,7],"08LQ":[0,4],"08LY":[30,29],"08P7":[0,10],"08PE":[1],"08PG":[3,47],"08PK":[2],"08PT":[0,1],"08QK":[1,4],"08QS":[1],"08RA":[3,4,2],"08RW":[0,1],"08SM":[2,3],"08TD":[1],"08TM":[2,1],"08TQ":[1],"08TZ":[2],"08UF":[1,2],"08UL":[0,4],"08UU":[0,3],"08UV":[69,208],"08V0":[0,1],"08W4":[13],"08W9":[0,0,122],"08X5":[0,4],"08XD":[0,6],"08XI":[0,7],"08Y8":[31,122,115],"08ZL":[4,9],"0908":[0,3],"090D":[0,6],"090E":[1],"090F":[0,5],"090Y":[1,9],"091G":[12,20],"091W":[1],"0921":[10,39],"092M":[1,1],"092N":[0,5],"0937":[0,2],"093C":[0,2],"093K":[0,1],"093M":[1,5],"094A":[6,53],"094D":[2],"094V":[1,1],"0959":[0,2],"096I":[2,4],"096P":[4],"0996":[45,28],"0999":[42,100],"099G":[19,128],"099I":[2],"099N":[112,246],"09AD":[1],"09AG":[0,6],"09B0":[0,3],"09B5":[0,3],"0AE5":[0,1],"0AE6":[1,4],"0AE7":[2],"0AER":[1],"0AEU":[0,3],"0AF8":[2],"0AFB":[250,420,168],"0AFJ":[1],"0AFU":[0,4],"0AFZ":[100,292],"194A":[7],"196A":[10,10],"1A99":[0,2],"21A9":[0,1],"224A":[205,153],"231A":[4],"236A":[5,3],"239A":[0,2],"23AA":[11,62],"2497":[1],"24A9":[7],"262A":[1],"266A":[30,24],"267A":[1,2],"26A1":[1,5],"275A":[22,27],"286A":[0,0,2],"28A6":[4,4],"28A7":[2],"296A":[1,3],"297A":[2,3],"298A":[1],"29A1":[0,1],"2A17":[3],"2A21":[5,14],"2A31":[0,1],"2A4A":[1,2],"2A68":[6,2],"2A6A":[0,6],"2A72":[0,3],"34A3":[2],"34A5":[0,0,0,7],"34A9":[0,2],"35A9":[0,6],"369A":[39,76,32],"36A5":[0,1],"374A":[2,3],"376A":[0,2],"378A":[1,8],"37A2":[0,1],"38A5":[64,162],"38AA":[9],"396A":[1],"3A19":[2,4],"3A62":[6,65],"3A81":[1],"3A8A":[0,10],"4111":[1],"4134":[1],"425A":[0,2],"42AA":[1,5],"4341":[8],"439A":[12,6],"44A2":[5,7],"44A6":[30,280],"46A3":[4],"4A45":[1,2],"4A46":[0,2],"4A53":[18,275],"4A74":[3],"4A81":[0,2],"4A99":[0,1],"4AA8":[22,36],"515A":[0,12],"5418":[4,13],"7786":[0,2],"8025":[1,4],"900":[96,0,0,964],"9560":[14,41],"9600":[1],"9641":[2],"9644":[3],"9645":[1,3],"9654":[5,7],"9655":[12]},"2026-04":{"000N":[2],"000S":[1],"002N":[0,5],"0037":[1],"003H":[0,3],"003M":[1,1],"004Q":[2],"006Z":[22,29],"0074":[0,21],"0075":[2,7],"007A":[19,67],"008W":[0,2],"0091":[0,22],"009F":[3,3],"009H":[4,11],"009T":[0,5,1],"00AA":[1,3],"00AQ":[1],"00B0":[1,6],"00BP":[0,3],"00C4":[0,5],"00CI":[0,1],"00CJ":[2],"00D9":[0,2],"00DA":[4],"00DU":[2],"00E1":[1,2],"00E7":[0,6],"00E9":[0,3],"00EG":[6,30],"00EY":[13,37],"00FC":[0,6],"00FT":[0,11],"00GK":[1,1],"00H8":[1],"00HM":[0,2],"00HU":[2,6],"00HV":[0,2],"00I6":[63,91,48],"00JA":[1],"00K2":[1,2],"00KI":[1,4],"00L3":[30,51],"00L4":[4,2],"00L7":[0,6],"00LG":[1,2],"00LU":[0,3],"00M9":[2],"00MD":[0,2],"00MS":[1,20],"00NA":[1],"00NZ":[3],"00PG":[2,1],"00QF":[19,165,31],"00R3":[2],"00R6":[2,3],"00SU":[0,9],"00SZ":[1,3],"00T9":[0,5],"00V0":[1,0,5],"00VC":[0,2],"00VF":[15,65],"00VL":[0,4],"00VW":[0,2],"00W6":[0,2],"00X4":[0,6],"00XQ":[26,31],"00XW":[9,10],"00XX":[96,263,1],"00Y1":[1],"00Y5":[0,16],"00Y6":[0,4],"00Y9":[0,1,2],"00YB":[1],"00YT":[0,12],"00Z0":[0,1],"00Z2":[2],"00Z3":[13,17,9],"00Z8":[0,4],"00ZK":[0,5],"00ZL":[6,15],"00ZR":[0,8],"00ZT":[1],"010P":[0,4],"011N":[1],"011T":[1],"011Y":[0,3],"0122":[2,6],"0128":[1,2],"012B":[1],"012E":[41,133,7],"0131":[0,2],"013H":[0,1],"013L":[0,4],"013X":[52,86],"015L":[0,6],"015P":[2,32],"016K":[1,7],"016L":[2,2],"0172":[0,1],"0176":[3],"0178":[1],"0182":[0,2],"018Q":[1,2],"0190":[2,3],"019E":[2],"01AC":[3,14],"01BI":[2,3],"01BL":[53,182,35],"01BU":[2,2],"01CK":[1],"01CN":[2],"01DA":[1,12],"01DK":[6,35],"01DQ":[0,0,1],"01DY":[0,2],"01EL":[0,7],"01EP":[1],"01ET":[0,1],"01EU":[6,16],"01EV":[1,3],"01F5":[0,3],"01GI":[44,80],"01IH":[0,5],"01IL":[1,5],"01J0":[1],"01J8":[4,3],"01JX":[3,7],"01JY":[1],"01KA":[1],"01KJ":[0,3],"01KT":[1,3],"01KZ":[13,30],"01MH":[0,3],"01ND":[1],"01NH":[0,3],"01P1":[1],"01P5":[1,4],"01PC":[0,2],"01PJ":[5,8],"01PL":[6],"01Q8":[0,3],"01QM":[3,3],"01QX":[2],"01R1":[8,17],"01RU":[2],"01SC":[2],"01SY":[1,4],"01TC":[0,0,46],"01TQ":[0,7,38],"01TV":[0,1],"01TZ":[0,2],"01UA":[1],"01UH":[4,3],"01UU":[0,2],"01V8":[5,27],"01WZ":[1],"01XM":[0,2],"01XN":[1],"01XW":[0,2],"01XX":[2,18],"01XZ":[36,256,1],"01Y0":[7,2],"01YI":[5,5],"01YU":[1,10],"01Z3":[2,19],"01ZH":[0,1],"01ZJ":[1],"01ZU":[1,5],"0204":[0,3],"0213":[0,0,0,30],"021C":[1],"021E":[0,59],"0225":[0,1],"023Y":[98,342,86],"0241":[363,819],"0244":[0,43,152],"024D":[0,3],"024I":[1,17],"024M":[0,7],"024S":[0,4],"0253":[34,125],"025X":[2,2],"0262":[1,4],"026K":[0,2],"027D":[1],"027E":[2,13],"027J":[2],"028C":[0,3],"028X":[16,41],"0290":[0,2],"029A":[13,24],"029G":[0,2],"029M":[1],"029Y":[0,1],"02A6":[1,2],"02AI":[5,2],"02B0":[4,7],"02B5":[0,3],"02BU":[17,46,7],"02CP":[0,4],"02CQ":[0,2],"02D7":[1],"02DP":[1],"02EQ":[3],"02EW":[1],"02FE":[1],"02FU":[1],"02GL":[0,5],"02GW":[6,40],"02HR":[0,2],"02IU":[0,9],"02KQ":[0,4],"02LD":[27,57],"02LQ":[0,5],"02LW":[269,784,1],"02MA":[0,1],"02MM":[1,4],"02NQ":[2,2,9],"02NY":[0,2],"02P9":[0,6],"02PM":[3],"02PP":[0,2],"02PU":[1],"02PY":[1],"02Q4":[0,1],"02S4":[0,4],"02SE":[0,3],"02ST":[5],"02T3":[0,2],"02T6":[5,13],"02UL":[3],"02UM":[0,4],"02VL":[5,3],"02VP":[4],"02WS":[1,9],"02WY":[0,3],"02XE":[0,3],"02XF":[1,5],"02XG":[0,1],"02XT":[0,3],"02YD":[1],"02Z5":[0,1],"030S":[0,7],"030U":[4],"031D":[0,1],"0322":[1],"0326":[0,3],"0327":[1],"032W":[0,1],"0342":[0,1],"0348":[32,151,33],"035M":[1],"036K":[0,7],"036S":[0,1],"0374":[183,1185,61],"0397":[0,6],"039S":[22,42],"03AI":[1],"03BL":[6,15],"03BN":[3],"03CS":[0,2],"03DL":[0,3],"03DT":[1],"03DU":[0,1],"03DV":[1],"03EG":[2,2],"03FY":[0,5,4],"03GR":[0,4],"03H0":[0,0,3],"03H8":[3],"03HY":[6,47],"03II":[0,1],"03IQ":[0,2],"03J9":[27,23,37],"03K8":[3,2],"03KZ":[3,3],"03L7":[0,2],"03LL":[0,1],"03LS":[0,2],"03NJ":[1],"03NW":[0,1],"03PS":[0,2],"03Q5":[0,2],"03QF":[0,0,3],"03VL":[11,23],"03X3":[0,2],"03X6":[7,10],"03XQ":[0,3],"03YN":[0,1],"03YR":[2,2],"0400":[0,1],"041A":[0,0,0,1],"041J":[0,2],"041Q":[0,2],"042M":[3,1],"0431":[0,0,4],"043J":[1],"0442":[0,2],"0448":[1],"044H":[0,2],"044L":[0,2],"044W":[1],"046H":[0,1],"046K":[0,4],"0473":[2],"047X":[3,3,2],"0486":[0,1],"048L":[1],"048T":[1],"048X":[0,0,23],"0490":[27,28],"0491":[3,3],"049A":[0,0,0,3],"049V":[1,7],"049Y":[0,2],"04A7":[2,3],"04AE":[1],"04AN":[0,12],"04AW":[0,6],"04B8":[1,3],"04BF":[31,86],"04BN":[5,1],"04BU":[0,0,0,3],"04CI":[0,5],"04CZ":[0,3],"04DE":[0,3],"04DH":[0,2],"04DU":[14,9],"04DZ":[0,4],"04EP":[1,12],"04F0":[0,3],"04F4":[3,18],"04FI":[0,9],"04FP":[0,7],"04GD":[0,7],"04GI":[4,45],"04GR":[0,2],"04HA":[6,16],"04HT":[9,1],"04HY":[2,6],"04IA":[1],"04IZ":[0,3],"04JA":[2],"04JJ":[0,0,6],"04JN":[0,2],"04JV":[42,48,36],"04K2":[0,2],"04K4":[0,15],"04KM":[4,17],"04KR":[1,2],"04KZ":[1],"04L2":[0,2],"04LJ":[3,20],"04LL":[2],"04LY":[1],"04MF":[2,7],"04MQ":[0,1],"04MX":[0,3],"04N7":[0,12],"04NK":[0,16],"04NR":[2],"04NV":[0,3],"04NX":[0,3],"04PD":[3,1],"04PI":[0,1],"04Q9":[3,22],"04QQ":[8,20],"04QZ":[1],"04R0":[3,15],"04R3":[0,3],"04RA":[0,2],"04RQ":[0,2],"04S0":[4,7],"04S7":[22,65],"04SM":[0,2],"04SS":[0,2],"04TC":[1],"04TE":[0,2],"04TI":[1],"04UF":[0,4],"04V4":[1],"04VC":[2,1],"04VH":[1,3],"04VL":[0,3],"04W1":[4,8],"04WF":[2,2],"04WM":[1],"04XE":[0,4],"04XK":[1],"04Y7":[0,1],"04Z0":[1,6],"04ZB":[5,27],"0502":[3,3],"0506":[4],"050D":[2],"0512":[1,2],"051A":[1],"051E":[0,2],"051K":[1,2],"0524":[0,20,241],"0525":[0,8],"052C":[1],"052P":[1],"0533":[0,2],"0535":[2],"053D":[1],"054H":[0,9],"054N":[0,1],"054P":[1,2],"054Z":[0,4],"055Q":[0,13],"055Y":[1,5],"0566":[0,1],"056E":[0,1,37],"056X":[1,2],"0577":[4,2],"057Q":[0,5],"057Z":[0,2],"058A":[0,2],"05A3":[0,0,0,11],"05AA":[5,5],"05CE":[1],"05CH":[0,9],"05E7":[0,17],"05ED":[0,5],"05EI":[2,2],"05EL":[0,6],"05ER":[0,2],"05FN":[0,3],"05FT":[0,3],"05GG":[17,28],"05GX":[0,1],"05H7":[5],"05H9":[0,4],"05HA":[1],"05HB":[4,5],"05HU":[2],"05HY":[0,4],"05IH":[0,3],"05JC":[2,4],"05K1":[2,6],"05KD":[1],"05KL":[1,2],"05KN":[2,5],"05KS":[1,4],"05LN":[0,4],"05LZ":[0,2],"05N3":[0,3],"05N8":[0,4],"05NK":[3],"05NM":[1],"05P0":[3],"05Q5":[0,1],"05QB":[0,1],"05QK":[2,4],"05R6":[0,1],"05RA":[0,5],"05RG":[0,3],"05RH":[1,4],"05S4":[2],"05SR":[1,3],"05SS":[0,2],"05SX":[2,4],"05T6":[0,6],"05TP":[0,1],"05U6":[0,1],"05UA":[0,4],"05VL":[0,1],"05W1":[0,1],"05WH":[2,4],"05WM":[0,6],"05X1":[0,1],"05XK":[1],"05YL":[1],"05YM":[2],"05YU":[0,1],"05ZP":[1],"05ZZ":[1,3],"060C":[4],"060H":[40,57],"060Z":[2],"0614":[1],"0619":[0,4],"061J":[25,99],"062E":[0,4],"062G":[2,7],"0633":[0,4],"063W":[1],"063Y":[13,4],"0640":[14,43],"064K":[1],"064P":[1],"064U":[1],"065C":[2,2],"065S":[0,7],"065V":[1],"065W":[1,9],"0663":[2],"066A":[9,15],"066G":[1],"066L":[0,1],"067G":[0,7],"067S":[2,24],"0683":[1],"068T":[2],"068V":[8,33],"0699":[0,1],"069V":[0,2],"06A6":[0,1],"06A9":[0,4],"06AD":[1],"06AU":[219,482,3],"06B2":[0,0,11],"06B4":[0,2],"06B6":[0,3],"06BN":[0,1],"06CA":[1,5],"06CC":[4,29],"06D0":[0,7],"06D8":[0,1],"06DX":[0,3],"06E0":[3,23],"06E7":[2],"06EQ":[0,2],"06FD":[1,15],"06FM":[0,4],"06FW":[0,2],"06FX":[0,4],"06G4":[2],"06GF":[0,2],"06GS":[2],"06GV":[0,16],"06H8":[0,1],"06HK":[3],"06J7":[4],"06JB":[2,5],"06JD":[0,1],"06KH":[0,3],"06KP":[0,1],"06MG":[0,3],"06MR":[2],"06NE":[2],"06NI":[2,2],"06NV":[0,3],"06PM":[1,3],"06PU":[3],"06PY":[0,13],"06Q1":[0,2],"06Q5":[69,114],"06Q8":[1],"06QC":[1,7],"06QT":[0,3],"06QZ":[0,1],"06RU":[0,6],"06S2":[7,48],"06SR":[10,21,73],"06T4":[2],"06TE":[1,4],"06TG":[2],"06TR":[92,423,124],"06TV":[1,4],"06TY":[0,1],"06U2":[0,1],"06UP":[1],"06UQ":[0,6],"06V1":[0,0,4],"06V3":[0,3],"06VP":[0,6],"06W8":[1,11,1],"06WT":[2,1],"06WY":[8,33],"06X1":[3],"06X7":[1],"06XQ":[0,5],"06YL":[78,271],"06Z2":[1],"06ZK":[0,17],"0701":[1,6],"070G":[7,23],"070S":[2,0,0,4],"070W":[0,3],"0710":[1,6],"071D":[0,4],"0724":[0,2],"072Z":[6,19],"0731":[1,19],"0732":[0,1],"073F":[0,5],"073G":[85,114],"073U":[3,12],"0740":[0,1],"0742":[1,16],"074K":[0,2],"075C":[0,1],"075F":[1,4],"076J":[0,2],"077N":[4,13],"078N":[1,2],"078Z":[1],"0792":[2,15],"079Z":[16,69],"07B5":[0,2],"07BA":[1],"07D0":[9],"07DI":[2],"07DN":[3],"07EA":[0,3],"07EB":[5,4],"07FI":[0,3],"07G5":[0,27],"07JJ":[1],"07JR":[1,3],"07LF":[1,4],"07LG":[1],"07LS":[0,12],"07MF":[0,5],"07MH":[0,1],"07NW":[0,6],"07P3":[1],"07PQ":[1,2],"07PR":[1,2],"07Q6":[1],"07QJ":[0,1],"07S6":[0,1],"07S8":[1],"07SK":[1,5],"07SU":[0,4],"07TC":[0,0,51],"07U6":[0,3],"07UM":[0,2],"07VX":[0,1],"07W3":[4,11],"07WM":[4],"07WT":[2],"07WW":[0,2],"07WX":[1],"07X7":[1],"07XQ":[1],"07XT":[4,5],"07Y4":[0,3],"07YQ":[1],"07Z4":[0,6],"07ZA":[1],"07ZF":[14,35],"07ZG":[2],"07ZH":[0,0,3],"07ZI":[1],"07ZJ":[1,2],"07ZM":[10,5],"07ZP":[19,50],"07ZW":[1],"080E":[3,3],"080U":[0,2],"0818":[0,3],"082B":[1],"082I":[0,2],"082J":[0,5],"0834":[1,1],"083T":[0,6],"083Y":[1],"084G":[0,2],"084I":[15,27,0,4],"084Y":[1,2],"0855":[2],"086E":[2,20],"086H":[4],"086I":[1,1],"086X":[1],"0871":[0,6],"0877":[1],"088A":[1,1],"088X":[107,445,1],"0898":[0,10],"089G":[109,159],"089R":[1,15],"08A1":[0,3],"08AJ":[1,5],"08AK":[1],"08AL":[2],"08BV":[0,2],"08C8":[10,19],"08CB":[16,46],"08CK":[0,2],"08CP":[0,2],"08D6":[0,11],"08D9":[4,21],"08DE":[0,1],"08DS":[0,2],"08E7":[0,2],"08EF":[0,3],"08FR":[0,1],"08FZ":[2,24,6],"08HK":[1,2],"08HW":[0,2],"08IM":[1],"08IP":[1,2],"08IS":[0,4],"08IW":[1,2],"08JM":[3],"08JP":[0,4],"08KJ":[0,1],"08L9":[1],"08LH":[1,24],"08LQ":[0,38],"08LY":[14,28],"08NL":[2],"08PF":[0,2],"08PG":[12,59],"08PK":[2],"08RA":[6,9],"08RC":[0,3],"08RR":[0,0,0,2],"08SM":[1],"08TD":[0,3],"08TM":[0,4],"08TQ":[0,0,30],"08TZ":[1],"08U0":[0,3],"08UN":[0,1],"08UV":[72,116],"08W4":[8,3],"08WE":[1],"08XI":[0,2],"08XZ":[0,4],"08Y8":[31,114,1],"08YV":[0,5,45],"08Z0":[2],"08Z2":[1],"08ZL":[3,2],"08ZM":[0,3],"08ZU":[0,10],"0900":[0,3],"0908":[0,3],"090E":[0,5],"090X":[2],"090Y":[2,11],"0915":[0,0,1],"091G":[12,31],"0921":[11,36],"092A":[0,2],"092M":[2,2],"092N":[1,5],"092R":[1],"093C":[1,3],"093M":[2,9],"0940":[1,3],"094A":[6,23],"094V":[0,1],"0952":[0,3],"096H":[0,2],"096P":[0,4],"0972":[0,1],"098W":[0,3],"0994":[1,6],"0996":[13,55],"0999":[51,100],"099G":[9,98],"099N":[103,227],"099U":[1],"09AD":[1,17],"0AE6":[5,2],"0AE7":[2,1],"0AEL":[0,1],"0AEU":[0,5],"0AF5":[1],"0AF8":[1],"0AFB":[179,397,1],"0AFS":[2],"0AFU":[1],"0AFZ":[35,40],"1161":[0,0,0,1],"194A":[5,2],"196A":[8,14],"1A12":[1,3],"1A99":[0,2],"224A":[217,153,42],"231A":[1,7],"236A":[5,2],"239A":[0,1],"23AA":[20,96],"24A9":[6],"266A":[16,41],"267A":[3],"26A1":[0,3],"2717":[1],"272A":[1],"275A":[20,50],"283A":[1],"2846":[1],"286A":[0,0,5,4],"28A6":[9,12],"28A7":[4,4],"296A":[1,4],"297A":[0,1],"2A15":[1],"2A21":[2,10],"2A31":[0,2],"2A4A":[1],"2A68":[12,7],"2A6A":[0,8],"2A95":[2],"2AA2":[0,8],"2AA3":[0,2],"2AA8":[0,5],"3191":[1,4],"33A3":[0,3],"34A3":[1],"34A5":[0,0,0,2],"351A":[2,2],"369A":[37,87],"374A":[0,1],"378A":[0,6],"37AA":[0,3],"38A5":[48,128],"38AA":[6,3],"3A19":[2],"3A62":[4,100],"3AA1":[0,7,4],"4111":[3],"4134":[1],"41A7":[1],"4218":[0,1],"4341":[1,6],"439A":[10,23,30],"43A2":[3,9],"44A2":[2,2],"44A3":[1],"44A6":[44,269],"44A7":[1],"459A":[2],"46A3":[8,13],"46A6":[0,3],"47A5":[2,8],"48A8":[0,2],"495A":[1],"4A35":[0,1],"4A39":[0,8],"4A45":[0,5],"4A53":[16,213],"4A64":[1,2],"4A74":[4],"4A7A":[2],"4A81":[0,5],"4A95":[1,2],"4A99":[0,4],"4AA5":[0,3],"4AA8":[83,173],"4AAA":[0,5],"515A":[2,8],"51A4":[0,5],"5351":[1],"536A":[0,1],"5418":[8,13],"5482":[1],"900":[162,2,15,1086],"9406":[2],"9560":[22,24],"9600":[2],"9617":[2],"9641":[5],"9644":[1],"9645":[3],"9654":[11],"9655":[16],"9824":[0,0,0,3]},"2026-05":{"000F":[0,4],"000S":[0,5],"000Y":[0,2],"0019":[2],"001Z":[0,4],"0026":[1],"002N":[0,5],"0037":[1],"003H":[0,3],"003M":[2,7],"0050":[0,8],"005H":[0,2],"006V":[0,2],"006Z":[13,84,55],"0075":[0,6],"007A":[13,38],"0081":[2],"008W":[0,1],"0091":[0,24],"0093":[0,4],"009H":[9,8],"00AA":[0,15],"00AD":[2],"00B0":[1,12],"00B2":[1],"00B6":[2],"00CI":[0,3],"00CJ":[1],"00CR":[1],"00CS":[0,0,0,1],"00D5":[0,0,44],"00DA":[3],"00DC":[0,1],"00E1":[1],"00E7":[0,7],"00EG":[1,7],"00EH":[3],"00EY":[28,35],"00F1":[1],"00GK":[1,2],"00H8":[4,2],"00HU":[6,5],"00HV":[1,2],"00HX":[1],"00I6":[76,164,6],"00J0":[0,2],"00JA":[1],"00JN":[0,6],"00JQ":[1],"00K3":[0,2],"00KI":[0,5],"00L3":[33,42],"00L4":[2,10],"00L7":[1],"00LK":[0,2],"00LS":[2,2],"00MD":[0,0,7],"00MS":[6,18],"00NA":[5],"00PB":[1],"00PF":[0,3],"00PW":[0,29],"00QF":[16,248,44],"00QU":[0,1],"00R3":[4,9],"00R6":[0,5],"00SE":[2],"00SU":[0,7],"00SZ":[2,4],"00T9":[3,10],"00TI":[1],"00TK":[0,0,1],"00TU":[0,2],"00V0":[0,0,21],"00VC":[0,4],"00VF":[12,89],"00W6":[0,2],"00WD":[1],"00WY":[1,5],"00X8":[0,1],"00XQ":[26,31],"00XT":[0,3],"00XW":[2,4],"00XX":[123,303],"00Y5":[0,4],"00Y6":[0,1],"00Y9":[0,0,4],"00YE":[0,3],"00YT":[4,1],"00Z3":[5,38,3],"00ZL":[3,7],"0102":[0,1],"010P":[1,4],"011G":[1],"011N":[0,4],"011S":[0,2,29],"0122":[0,13],"0128":[0,4],"012E":[37,167,109],"0135":[1],"013L":[0,1],"013X":[18,69],"015H":[0,1],"015I":[1],"015P":[1,19],"016B":[1],"016D":[0,3],"016K":[0,11],"016L":[1],"017M":[0,1],"0182":[1],"018Q":[2,7],"0190":[1],"019E":[1],"019P":[0,1],"01AC":[1,37],"01BB":[2],"01BI":[0,5],"01BL":[48,211,1],"01BU":[1],"01CI":[0,2],"01CK":[0,2],"01CN":[3],"01DA":[0,4],"01DK":[11,23],"01DY":[1],"01EL":[4,2],"01EU":[3,13],"01F2":[1,2],"01G7":[1],"01GI":[37,38],"01GL":[0,1],"01GU":[0,2],"01IL":[0,15],"01IW":[0,1],"01J4":[0,1],"01J8":[0,1],"01JX":[6,20],"01KA":[1],"01KZ":[10,36],"01LH":[1],"01N5":[0,6],"01N6":[0,4],"01P4":[0,1],"01P5":[3],"01PJ":[10,9],"01PL":[6],"01Q8":[1,1],"01QM":[1],"01QY":[1],"01R0":[0,2],"01R1":[11,13],"01RD":[1],"01RK":[0,1],"01RP":[0,13],"01SY":[0,13],"01T4":[0,1],"01TQ":[1,7],"01U9":[0,2],"01UH":[7,5],"01UM":[0,2],"01UN":[0,2],"01UT":[0,5],"01V8":[2,13],"01VX":[0,3],"01WZ":[1],"01XM":[0,1],"01XX":[1,6],"01XZ":[52,282,34],"01Y0":[11,7],"01YI":[2,12],"01YU":[0,21],"01Z3":[0,18],"01ZU":[4],"0204":[0,5],"020M":[1],"0213":[0,0,0,26],"021E":[1,69],"0222":[0,1],"022K":[0,2],"023A":[0,2],"023T":[1],"023Y":[133,400,36],"0241":[341,895],"0244":[2,19,86],"024I":[0,37],"024M":[0,1],"0253":[37,147],"0262":[2],"026G":[1,4],"026K":[2],"0276":[0,3],"027D":[1],"027E":[1,7],"027J":[1],"027W":[0,13],"028K":[0,2],"028X":[23,50],"0290":[0,1],"029A":[39,43],"029Y":[1],"02AI":[1,5],"02B0":[3,9],"02BH":[0,3],"02BL":[0,0,51],"02BU":[36,44,8],"02D2":[4,2],"02DX":[0,1],"02EV":[0,3],"02EW":[2,1],"02G8":[0,2],"02GR":[1],"02GW":[8,24],"02H1":[0,6],"02HJ":[0,2],"02HR":[0,2],"02LD":[47,38],"02LF":[1,2],"02LW":[265,846,36],"02MM":[3,3],"02NE":[0,1],"02NQ":[1,0,2],"02PP":[0,1],"02Q1":[1],"02S4":[1,2],"02ST":[0,2],"02T6":[8,17],"02U2":[0,1],"02VG":[1,26,29],"02VL":[5,9],"02VP":[2,16],"02WS":[5,23],"02WY":[1],"02XF":[2,6],"02Y1":[0,1],"02YD":[1],"02YE":[0,2],"0305":[1],"030U":[0,3],"031M":[1],"031V":[0,4],"0322":[0,3],"0326":[5,11],"033K":[0,3],"0342":[0,2],"0348":[34,208,96],"035C":[0,6],"035H":[0,2],"035Y":[2],"0365":[0,2],"036K":[0,7],"0374":[237,1169,144],"0381":[0,1],"038L":[0,1],"039I":[1],"039S":[22,31],"03A8":[2],"03AJ":[1],"03AX":[0,1],"03BL":[13,46],"03BN":[5,1],"03CS":[3],"03DL":[1],"03DT":[1],"03DU":[1],"03DV":[1],"03EG":[3,2],"03FY":[0,0,1],"03GQ":[1],"03GR":[1],"03GW":[0,4],"03H0":[0,0,1],"03H8":[5,4],"03HL":[0,1],"03HW":[0,7],"03HY":[5,58],"03IJ":[1],"03J9":[21,23,24],"03JK":[1],"03K8":[1,4],"03KZ":[0,2],"03LH":[1],"03LI":[0,2],"03LR":[1],"03LS":[1],"03N1":[0,3],"03NJ":[1],"03PP":[0,2],"03PS":[0,3],"03QF":[0,0,2],"03RB":[0,4],"03RP":[1],"03RR":[1],"03SA":[1],"03SL":[1,6],"03SW":[0,0,46],"03SX":[1],"03TP":[1],"03U4":[1],"03VC":[0,2],"03VL":[12,16],"03W8":[0,3],"03WM":[0,2],"03X3":[0,1],"03X6":[13,3],"03XQ":[0,2],"03YN":[1,1],"03ZJ":[0,3],"03ZU":[0,3],"0417":[0,3],"043J":[1],"0440":[0,1],"0442":[0,3],"0443":[1,4],"0445":[0,5],"044L":[1,3],"044S":[1],"044U":[1],"044X":[0,0,65],"045K":[0,6],"0463":[1],"046F":[0,3],"046H":[0,1,5],"0473":[1],"0478":[0,2],"048F":[0,2],"048T":[0,1],"048Y":[1],"0490":[29,27],"0491":[2],"049V":[0,3],"04A7":[1,2],"04AA":[0,2],"04AK":[0,3],"04AN":[0,7],"04AT":[0,7],"04AX":[1],"04AY":[0,4],"04B8":[5,15,52],"04BF":[22,58],"04BN":[4,3],"04BU":[0,0,0,2],"04BX":[1],"04CI":[1],"04CJ":[2],"04D0":[0,2],"04DU":[12,7],"04DW":[1],"04E8":[2],"04EP":[1,6],"04F3":[0,8],"04F4":[4,21],"04F7":[0,2],"04FA":[1],"04FI":[4,9],"04FP":[0,5],"04FW":[1,7],"04G9":[1],"04GD":[0,12],"04GI":[3,60,37],"04GR":[1],"04H2":[0,2],"04HA":[1,7],"04HC":[2],"04HT":[9,16],"04HY":[1,6],"04IM":[0,3],"04IZ":[0,1],"04JA":[0,4],"04JJ":[0,0,3],"04JN":[0,2,0,2],"04JV":[44,122],"04K2":[0,2],"04K4":[0,14],"04KM":[6,10],"04L3":[0,1],"04L5":[0,2],"04LJ":[7,17],"04LL":[2],"04LY":[0,2],"04M0":[0,3],"04MF":[0,7],"04MN":[2],"04MQ":[0,2],"04MX":[2],"04N7":[0,5],"04N8":[2],"04NR":[1],"04NV":[1],"04PD":[4,3],"04Q9":[0,6],"04QQ":[5,22],"04QZ":[1],"04R0":[2,18],"04S0":[0,2],"04S7":[36,75],"04SS":[0,11],"04TI":[2],"04TJ":[0,2],"04V9":[1],"04VC":[5,2],"04VL":[0,2],"04W1":[12,1],"04WF":[1,4],"04WM":[1,3],"04WT":[1],"04XP":[1],"04YE":[1],"04YJ":[0,1],"04YU":[0,1],"04Z0":[1],"04ZB":[9,27,93],"0502":[1],"0506":[2,1],"0517":[1],"0518":[1],"051A":[0,1],"051G":[0,8,30],"051K":[1],"051W":[0,3],"0524":[2,10,15],"0525":[0,1],"052F":[0,0,49],"052P":[1,1],"052R":[0,6],"052V":[0,3],"0533":[0,4],"0535":[0,8],"053Z":[0,2],"0546":[1],"054G":[1],"054H":[0,15,59],"0556":[1],"055Q":[0,1],"056C":[2],"056M":[1],"056V":[1,2],"0576":[0,3],"0577":[1,4],"0579":[0,3],"057A":[0,2],"057Q":[0,3],"057V":[0,3],"057Y":[1],"0582":[3],"059L":[0,2],"059Z":[0,38],"05A3":[0,0,0,90],"05AA":[2,4],"05AZ":[1],"05B7":[0,3],"05CH":[0,41],"05D2":[0,3],"05DF":[0,5],"05DX":[0,1],"05E7":[0,7],"05EI":[0,4],"05EL":[1,7],"05ER":[1,7],"05EU":[0,0,37],"05EV":[1],"05FF":[1],"05GG":[38,18],"05GS":[1],"05GX":[2],"05H7":[2,15],"05HB":[3,19],"05I8":[0,4],"05JC":[0,10],"05K1":[1,8],"05KD":[1],"05KL":[1,3],"05KN":[2,8],"05MJ":[1],"05N3":[1],"05N8":[0,4],"05NK":[2,4],"05P0":[1,2],"05QK":[4],"05QL":[0,45],"05R6":[0,4],"05RA":[6],"05RG":[0,4],"05RH":[1,1],"05RT":[0,2],"05RZ":[1],"05S6":[2],"05SP":[0,5],"05SR":[1,21],"05SS":[0,8],"05SX":[2],"05SY":[2],"05T9":[0,6],"05TP":[3],"05U0":[1],"05U6":[0,12],"05UA":[0,4],"05WH":[0,1],"05XK":[1,1],"05YM":[1,3],"05YU":[0,2],"05Z0":[0,1],"05ZZ":[5,12],"060H":[60,55],"0619":[0,1],"061J":[53,127],"0620":[0,12],"0625":[0,5],"062E":[0,6],"062G":[4,8],"062N":[0,2],"062S":[0,0,1],"062U":[1,1],"063T":[0,7],"063W":[0,2],"063Y":[12,4],"0640":[15,17],"0642":[0,6],"0648":[5],"064Q":[0,4],"065C":[1,11],"065F":[1,2],"065I":[1],"065S":[0,2],"065V":[1,3],"065W":[1,5],"0663":[1],"066A":[2,4],"066E":[0,2],"066L":[0,14],"066U":[0,3],"066W":[2],"0673":[1],"0675":[0,2],"067S":[2,9],"068V":[2,55],"0699":[0,5],"06A6":[1,2],"06AU":[217,551],"06B4":[0,4],"06B6":[0,2],"06CA":[0,5],"06CC":[5,19],"06D0":[1,2],"06DK":[0,1],"06E0":[3,16],"06EK":[0,1],"06ET":[1],"06FD":[12,5],"06FM":[0,3],"06FS":[0,2],"06FT":[1,6],"06FW":[0,2],"06FX":[0,9],"06GN":[0,1],"06GS":[0,2],"06GV":[3,1],"06H8":[1],"06HK":[1,6],"06HZ":[0,3],"06J7":[1],"06J8":[0,3],"06JB":[0,4],"06JS":[3],"06KX":[1],"06L5":[0,4],"06ND":[0,4],"06NH":[0,3],"06NI":[1,5],"06PM":[1],"06Q5":[70,171],"06Q7":[0,3],"06QC":[3,15],"06QZ":[0,3],"06S2":[3,19,5],"06S9":[0,4],"06SR":[14,26],"06SS":[1],"06TE":[2],"06TR":[112,417,97],"06UA":[0,0,4],"06V1":[0,9,215],"06W8":[5,33],"06WT":[3],"06WY":[11,36],"06WZ":[0,9],"06X1":[0,2],"06X6":[1],"06XM":[1,3],"06Y8":[0,2],"06YL":[104,329],"06YW":[0,2],"06Z4":[2],"06Z7":[2,22],"06ZH":[0,2],"06ZK":[0,3],"0701":[0,3],"070G":[7,32],"070S":[2,1],"070W":[0,7],"070Z":[1],"0710":[8,2],"0715":[4,2],"0724":[2,1],"072S":[0,2],"072Z":[5,11],"0731":[1,2],"0732":[0,4],"0734":[4,2],"073G":[82,191],"073U":[4,8],"0742":[4,8],"074D":[0,2],"074K":[1],"074N":[2],"0777":[0,3],"077N":[3,28],"077U":[0,1],"078Z":[0,3],"0792":[9,18],"0794":[1],"0797":[0,6],"0799":[0,2],"079C":[0,1],"079Z":[28,128,1],"07AE":[0,1],"07BX":[0,4],"07CF":[0,0,44],"07CV":[1],"07D0":[9],"07D1":[0,2],"07D6":[1],"07DI":[1],"07DL":[1],"07EA":[3],"07EB":[4,7],"07EG":[0,0,1],"07ES":[0,6],"07FI":[1,2],"07FL":[0,12],"07FX":[1],"07G2":[0,5],"07G5":[3,7],"07G9":[0,4],"07GB":[0,3],"07H1":[0,2],"07IA":[1],"07IC":[0,2],"07IU":[0,1],"07J9":[2],"07JR":[1,4],"07LG":[1,2],"07MF":[1],"07MH":[7,15],"07N0":[0,4],"07NI":[0,4],"07NW":[0,4],"07PR":[0,7],"07RM":[0,2],"07S3":[0,1],"07S6":[0,2],"07SK":[2,3],"07TC":[0,3],"07UA":[1,2],"07W3":[2,9],"07WF":[1],"07WI":[1],"07WP":[0,2],"07WT":[1],"07WV":[1],"07WW":[0,3],"07WX":[1],"07X5":[2,3],"07XQ":[1],"07XT":[10,8],"07Y4":[4,9],"07YA":[0,1],"07YB":[0,3],"07YC":[3],"07YE":[1],"07YI":[0,1],"07YQ":[1,4],"07ZF":[20,31],"07ZI":[0,1],"07ZJ":[1],"07ZL":[0,1],"07ZM":[2,10],"07ZP":[23,26,127],"07ZW":[2],"080E":[2,6],"080S":[0,0,83],"080U":[1],"0818":[0,6],"0819":[0,2],"082J":[1,3],"082Z":[0,1],"0834":[2,3],"083C":[0,2],"083T":[0,1],"083W":[0,4],"0849":[1],"084A":[0,2],"084B":[0,2],"084G":[0,1],"084I":[3,14,0,2],"084M":[0,3],"086H":[5,8],"086I":[0,1],"0877":[1,2],"088A":[6,2],"088X":[124,442,140],"0898":[0,15],"089G":[177,152],"089J":[0,1],"089R":[1,11],"08A1":[2],"08AJ":[1],"08AK":[1],"08BE":[1,8],"08BS":[0,2],"08C6":[1],"08C8":[7,16],"08CB":[15,57],"08CF":[1],"08CK":[1],"08CP":[0,8],"08CT":[2],"08D6":[1,5],"08D9":[9,26],"08DE":[0,2],"08DJ":[1],"08DS":[0,2],"08E4":[0,2],"08E5":[1],"08E7":[0,2],"08EF":[0,1],"08F3":[0,5],"08FR":[0,11],"08FU":[0,2],"08FZ":[2,8],"08H8":[0,8],"08HF":[0,2],"08IP":[2,7],"08IS":[1],"08IW":[0,8],"08J8":[0,1],"08KJ":[2,2],"08L9":[3,5],"08LH":[2],"08LQ":[6,10],"08LY":[40,38],"08P7":[1,8],"08PA":[1],"08PG":[15,73],"08PK":[3,4],"08PM":[0,2],"08PV":[0,5],"08QS":[1],"08RA":[3,19],"08RR":[0,0,0,1],"08SM":[1],"08TM":[0,12],"08TQ":[1],"08TY":[0,0,42],"08UV":[74,133],"08V8":[0,1],"08VL":[1],"08W4":[15,7],"08W5":[0,1],"08W9":[0,0,10],"08WE":[1],"08XE":[2],"08Y8":[40,145,4],"08ZL":[4,6],"08ZM":[0,2],"0908":[0,7],"090E":[1,4],"090X":[2],"090Y":[2,2],"091G":[22,18],"091W":[0,4],"0921":[7,35],"092M":[2],"092N":[0,23],"093C":[1],"093M":[2,7],"0940":[0,2],"094A":[5,29],"094K":[1],"094V":[2,4],"0952":[1,3],"096H":[1],"096P":[0,7],"0994":[3,22],"0996":[27,48],"0999":[68,104],"099G":[18,104],"099I":[2],"099N":[108,270],"099U":[2],"09AC":[0,9],"09AD":[0,4],"09AG":[4],"09AV":[1],"0AE6":[2],"0AE7":[3],"0AEL":[0,3],"0AEU":[0,3],"0AF8":[0,5],"0AFA":[1],"0AFB":[322,351,2],"0AFJ":[2],"0AFS":[2,4],"0AFU":[0,5],"0AFZ":[25,21],"194A":[2,2],"196A":[11,19],"21A9":[1,6],"224A":[242,181],"231A":[3,12],"236A":[4],"23AA":[22,98],"266A":[16,13],"267A":[6,22],"26A1":[3,3],"275A":[18,48],"286A":[0,0,0,8],"28A6":[2,14],"296A":[0,2],"297A":[1,2],"29A1":[3,3],"2A18":[0,2],"2A21":[3,13],"2A4A":[1],"2A68":[3,7],"2A6A":[0,8],"2A72":[1,4],"2AA6":[0,2],"3191":[1],"319A":[2],"31A4":[2],"322A":[0,2],"328A":[0,4],"32A3":[0,1],"34A3":[1,1],"34A5":[0,0,0,1],"34A8":[0,4],"34A9":[4],"351A":[0,3],"35A9":[0,1],"369A":[31,77,33],"374A":[1],"376A":[0,1],"378A":[0,4],"37A4":[0,2,72],"389A":[1],"38A5":[67,181],"395A":[0,0,32],"3A19":[6,4],"3A21":[0,2],"3A62":[2,96],"3AA1":[0,0,6],"4111":[1],"4134":[2],"425A":[0,2],"4341":[2],"439A":[9,26],"43A2":[1,3],"44A2":[11,14],"44A6":[38,278,60],"44A7":[3],"459A":[1,9],"45A2":[0,3],"46A3":[12,15],"46A6":[0,10],"47A5":[2],"495A":[1],"4A29":[2,2],"4A35":[1],"4A45":[0,6],"4A46":[1],"4A53":[20,322],"4A59":[1,2],"4A64":[2,4],"4A6A":[0,6],"4A74":[1],"4A7A":[2],"4A81":[0,4],"4A82":[0,3],"4A93":[0,2],"4A95":[1],"4A99":[2,3],"4AA2":[1],"4AA8":[90,199],"4AAA":[0,2],"515A":[1,30],"5394":[1],"53AA":[3,69],"5418":[10,4],"5482":[0,5],"5483":[0,10],"5499":[2,3],"54A9":[0,2],"5539":[0,0,31],"8025":[1,2],"900":[167,21,39,3039],"9161":[0,0,0,1],"9406":[2],"9560":[24,40],"9600":[2],"9617":[1,3],"9641":[5],"9644":[2],"9645":[12],"9654":[8],"9655":[20],"9824":[0,0,0,1]},"2026-06":{"003H":[0,8],"003K":[0,1],"003L":[1],"0050":[0,4],"005V":[1],"006J":[1],"006Z":[27,35],"007A":[22,121],"007P":[1],"007Q":[0,1],"007Y":[0,4],"008L":[0,3],"0091":[0,20],"0093":[0,2],"009H":[4,18],"00AA":[1,10],"00B0":[1],"00B6":[0,5],"00BD":[1,9],"00C4":[1],"00CI":[1],"00CJ":[3],"00CT":[0,2],"00CV":[1],"00D5":[0,0,5],"00DY":[0,2],"00E1":[1],"00E3":[0,2],"00E7":[0,2],"00E9":[0,3],"00EG":[2,22],"00EH":[2],"00EY":[12,38],"00F1":[0,5],"00FT":[0,3],"00H8":[1,6],"00HP":[0,3],"00HR":[1],"00HU":[1,2],"00HV":[0,0,40],"00HX":[0,1],"00I6":[91,190,108],"00IM":[0,4],"00J0":[1],"00JN":[3,4],"00K2":[0,1],"00KI":[0,3],"00KT":[0,2],"00L3":[37,29],"00L4":[3,3],"00LH":[0,3],"00LS":[1,14],"00MS":[2],"00N4":[0,13],"00NA":[2],"00PG":[0,2],"00QF":[49,229,72],"00R3":[5,14],"00R5":[1,1],"00R6":[0,2],"00SB":[0,2],"00SE":[1],"00SZ":[1],"00T9":[1],"00TK":[0,0,4],"00TU":[2],"00UY":[1],"00VF":[19,70],"00WR":[5,4],"00WT":[1],"00WV":[0,3],"00XD":[2],"00XQ":[22,13],"00XW":[1,3,70],"00XX":[130,295],"00Y5":[0,13],"00Y6":[0,2],"00YT":[5,1],"00Z3":[9,13,3],"00ZK":[1],"00ZL":[1,15],"011E":[0,2],"011S":[0,2,1],"011T":[2,1],"011Y":[2,5],"0122":[1,2],"0128":[2,23],"012E":[44,147],"0135":[2],"013K":[3],"013L":[4],"013X":[11,52],"0146":[2,4],"014I":[0,8],"0156":[2],"015I":[1,5],"015L":[0,7],"015P":[0,2],"0167":[0,4],"016K":[0,5],"016L":[2,4],"017B":[0,1],"0181":[1],"0182":[0,4],"018Q":[5],"018S":[0,1],"0190":[1,3],"0191":[2,2],"019E":[0,1],"019J":[0,5],"019P":[2],"01AC":[6,20],"01BI":[1,2],"01BL":[66,229,48],"01BU":[0,2],"01CK":[0,6],"01CM":[2],"01CN":[2,1],"01D4":[0,1],"01DA":[3,2],"01DC":[0,3],"01DK":[3,6],"01DQ":[0,0,3],"01E8":[1],"01EL":[3,13],"01EU":[2,24],"01EV":[1],"01F2":[0,5],"01G7":[4],"01GI":[40,23],"01H0":[0,3],"01H5":[2],"01HM":[2,4],"01HV":[0,1],"01HZ":[2],"01I3":[1],"01IA":[0,2],"01IL":[0,8],"01IW":[0,1],"01J8":[1],"01JK":[1],"01JU":[0,7],"01JX":[1,20],"01JY":[1,2],"01KA":[2],"01KT":[1],"01KZ":[12,35],"01LH":[0,7],"01N6":[3],"01P4":[0,1],"01PJ":[4],"01PL":[4],"01Q3":[0,1],"01Q6":[1,1],"01Q8":[0,5],"01QM":[2],"01R1":[3,63],"01RR":[1],"01RU":[0,2],"01SC":[3,2],"01SF":[0,2],"01SK":[0,1],"01SY":[0,15],"01T4":[0,1],"01TQ":[0,7],"01TV":[1,1],"01UH":[4,18],"01UT":[0,9],"01UU":[0,4],"01V8":[3,5],"01W2":[1],"01WC":[0,1],"01WN":[1],"01WZ":[0,1],"01XG":[1],"01XX":[3,5],"01XZ":[84,280,44],"01Y0":[7,10],"01YD":[0,5],"01YE":[1],"01YI":[4,10],"01YU":[0,1],"01Z3":[4,4],"01ZF":[2],"01ZH":[2],"01ZJ":[1,3],"01ZU":[4,2],"0204":[1],"0213":[0,0,0,17],"0215":[1],"021E":[0,45],"021V":[0,3],"0222":[1],"0225":[0,1],"022K":[2],"0233":[0,2],"023Y":[178,384,76],"0241":[407,761],"0244":[5,16,60],"024I":[3,18],"0253":[55,177,3],"0262":[2,3],"0266":[1],"026K":[1],"027D":[1],"027E":[2,9],"027J":[1],"027W":[0,13],"028K":[1,3],"028X":[18,93],"029A":[39,71,91],"02AI":[2,4],"02B0":[0,1],"02BU":[24,42],"02C0":[0,1,2],"02CQ":[1,4],"02D2":[5,1],"02EN":[0,1],"02EV":[0,17],"02EW":[4,2],"02F9":[1],"02FU":[1],"02GR":[1],"02GW":[7,37],"02HJ":[0,5],"02HR":[0,18],"02I1":[1],"02IU":[0,2],"02KE":[1],"02KR":[0,6],"02LD":[60,48,30],"02LF":[0,5,35],"02LJ":[0,3],"02LW":[251,766,3],"02LZ":[1],"02MA":[0,1],"02MG":[0,3],"02MM":[0,6],"02MY":[0,4],"02PY":[1],"02QT":[2],"02S4":[4,3],"02T6":[6,23],"02U6":[2],"02U8":[0,1],"02UY":[0,3],"02VG":[1,1],"02VL":[1,3],"02VP":[3,8],"02WS":[5,10],"02XF":[3,3],"02XG":[0,5],"02Y7":[0,9],"02YD":[1],"02ZX":[1],"031V":[0,5],"031W":[4],"0326":[8],"032Y":[0,1],"033K":[0,2],"0348":[35,260,68],"035C":[1],"0365":[0,2],"036K":[0,2],"036X":[0,3],"0374":[294,851,2],"037A":[0,6],"037P":[0,12],"038L":[1],"039S":[16,28],"03A8":[1],"03AI":[1,2],"03AX":[0,4],"03BL":[5,35],"03BN":[2,2],"03CS":[1,3],"03DV":[1,3],"03E3":[0,3],"03FY":[0,2],"03GF":[0,2],"03GM":[0,2],"03GR":[1,4],"03H6":[1],"03H8":[1,2],"03HY":[10,30],"03IQ":[0,2],"03J2":[2],"03J9":[19,32,6],"03K8":[3,3],"03KZ":[2,21],"03L1":[1,6],"03LS":[1,2],"03MK":[1],"03MM":[0,2],"03NS":[1],"03RB":[1,8],"03RG":[1,1],"03TP":[0,1],"03TY":[0,2],"03VL":[11,12],"03X6":[8,6],"03XQ":[0,8],"03XZ":[0,5],"03YN":[1],"03YR":[0,7],"03Z8":[1],"03ZJ":[0,3],"040F":[0,2],"041A":[0,0,0,5],"041S":[1],"042M":[1,2],"042Q":[0,0,80],"043J":[1],"0440":[0,1],"0443":[1],"0445":[0,3],"044L":[0,5],"044X":[0,0,4],"045K":[1],"0461":[1],"046H":[0,5],"046Z":[1],"0473":[2],"047X":[1],"0489":[1,2],"048L":[1,4],"048T":[1],"048X":[0,11],"0490":[27,26],"0491":[1],"049Q":[3],"049V":[2,2],"04A7":[2,4],"04AN":[0,26],"04AT":[0,1],"04AX":[0,7],"04AY":[0,7],"04B8":[5,6],"04BF":[25,56],"04BN":[5,2],"04BU":[0,0,0,3],"04BX":[1],"04C1":[1],"04CG":[0,2],"04CZ":[1],"04D0":[1],"04D6":[3],"04DH":[1],"04DU":[4,11],"04EJ":[0,6],"04EP":[0,7],"04EY":[0,2],"04F4":[4,26],"04FI":[2,14],"04FP":[0,7],"04GD":[0,16],"04GI":[4,33],"04HA":[3,2],"04HC":[1],"04HT":[12,14],"04HY":[1,6],"04IL":[0,1],"04JA":[0,1],"04JN":[3,7],"04JV":[61,80],"04JY":[1],"04K4":[0,26],"04KM":[6,9],"04KR":[0,3],"04L2":[2,8],"04L3":[0,3],"04LJ":[13,42],"04LY":[0,11],"04MF":[8,20],"04MX":[0,2],"04N7":[1,1],"04NK":[0,3],"04NR":[1],"04NX":[1,3],"04P4":[0,6],"04PD":[2,1],"04PH":[1,3],"04PI":[3],"04Q9":[1,8],"04QQ":[14,18],"04R0":[2,23],"04RK":[0,3],"04S0":[0,2],"04S7":[21,68],"04SS":[0,10],"04TJ":[1],"04US":[1],"04UY":[0,0,31],"04V9":[0,2],"04VC":[3,7],"04VH":[4,3,44],"04W1":[7,6],"04W5":[1],"04WF":[2,1],"04WM":[2],"04X1":[0,0,32],"04X4":[0,3],"04XL":[0,1],"04XM":[0,8],"04XP":[1,2],"04YS":[1],"04ZB":[5,27,1],"04ZH":[0,3],"04ZS":[0,1],"0506":[1,18],"050K":[0,2],"0512":[1],"0517":[2],"051E":[0,3],"051G":[0,4],"051Q":[0,2],"0524":[3,14,73],"0525":[0,8],"052L":[0,2],"052P":[0,0,79],"052R":[0,5,42],"0535":[1,4],"0541":[3],"0546":[1],"054B":[0,1],"054G":[2,4],"054H":[0,3],"054P":[0,0,53],"054Z":[0,0,86],"055Q":[0,10],"055Y":[2,3],"0566":[0,3],"0568":[0,2],"056C":[1],"0577":[0,1],"0579":[1,4],"057Z":[0,2],"058Z":[0,1],"059L":[1],"059U":[0,1],"05A3":[0,0,0,52],"05AA":[3,4],"05AZ":[2],"05B7":[3,5],"05CH":[0,21],"05D2":[1],"05E6":[0,1],"05EI":[3,4],"05EL":[2,3],"05ER":[1,3],"05EV":[1],"05EX":[0,2],"05FD":[1],"05FS":[0,2],"05G6":[0,3],"05GG":[22,25],"05GX":[2],"05GY":[0,2],"05H7":[1,31],"05H9":[0,3],"05HA":[6,1],"05HB":[6,27],"05HP":[0,2],"05HR":[0,1],"05HY":[1,1],"05J2":[0,2],"05JC":[0,3],"05JF":[0,1],"05JL":[1],"05K1":[2],"05K2":[0,7],"05KJ":[0,1],"05KL":[2],"05KN":[1,10],"05L4":[0,2],"05LU":[1],"05MA":[0,1],"05MJ":[2,2],"05N3":[0,5],"05N8":[2,2],"05NK":[2,2],"05P0":[2],"05P5":[0,1],"05PX":[0,29],"05Q5":[0,34],"05QK":[3],"05QL":[0,3],"05RA":[2,1],"05RG":[1],"05RH":[1],"05RX":[1],"05S4":[1],"05S6":[1],"05SP":[0,2],"05SR":[0,8],"05SX":[5,1],"05SY":[1],"05TP":[1],"05TV":[1],"05U6":[0,6],"05UA":[0,6],"05UV":[0,2],"05V0":[0,2],"05V8":[0,2],"05VL":[0,4],"05W1":[0,1],"05WH":[1],"05WM":[0,2],"05WQ":[0,2],"05X1":[1],"05XH":[0,2],"05YN":[0,4],"05ZZ":[6,8],"060C":[0,1],"060H":[51,43,57],"061A":[0,3],"061F":[0,4],"061J":[46,81],"062G":[3,1],"062J":[1],"062Q":[1],"063T":[0,1],"063Y":[9,5],"0640":[4,9],"0642":[0,4],"0648":[2],"064Q":[1,5],"064Z":[0,3],"065C":[4,2],"065F":[1],"065S":[0,1],"065W":[1,9],"066A":[4,1],"066U":[2],"066W":[2],"0673":[1],"067G":[0,2],"067I":[0,2],"067S":[1,11],"068V":[7,40],"0699":[0,3],"06A6":[0,2],"06AD":[1],"06AU":[254,558],"06B4":[0,4],"06B6":[0,8],"06BM":[0,3],"06C5":[0,3],"06CA":[0,5],"06CC":[9,24],"06D0":[0,11],"06DD":[0,2],"06E0":[9,13],"06E7":[2],"06EK":[0,9],"06FD":[10,22],"06FM":[0,7],"06FN":[0,2],"06FS":[0,2],"06FT":[1,3],"06FX":[0,3],"06GR":[0,9],"06GV":[0,21],"06H8":[1,7],"06HD":[1],"06HK":[4],"06I0":[0,4],"06J7":[0,0,55],"06JB":[2,2],"06L5":[0,2],"06LE":[0,2],"06NE":[2],"06NI":[4,8],"06NU":[0,3],"06NV":[0,2],"06PM":[1],"06PU":[1],"06Q1":[1],"06Q5":[63,88],"06QC":[2],"06QL":[0,4],"06RU":[0,5],"06S2":[7,18,4],"06SR":[8,62,6],"06SS":[1,3],"06TR":[99,390,76],"06TY":[0,3],"06UA":[0,0,4],"06UF":[0,4],"06UQ":[2],"06V1":[0,2,41],"06W0":[1],"06W4":[1],"06W6":[0,4],"06W8":[2,26],"06WT":[5,3],"06WY":[9,42],"06X1":[2,2],"06Y8":[0,1],"06YE":[0,28],"06YL":[83,247],"06YY":[0,2],"06Z4":[3],"06ZK":[0,3],"0701":[4],"070G":[10,33],"070S":[0,0,0,1],"070W":[0,7],"0710":[8,8],"0715":[1],"072Z":[4,4],"0731":[1,10],"0732":[0,5],"0734":[1,5],"073G":[69,133],"073U":[2,12],"073V":[0,1],"073W":[1],"0742":[0,11],"074D":[0,2],"074K":[0,3],"076J":[1],"077N":[2,21],"077U":[0,1],"077V":[0,1],"078N":[1,2],"0792":[12,8],"079Z":[28,65],"07BG":[1],"07BS":[1],"07BX":[0,2],"07D0":[7],"07D6":[0,2],"07DG":[1],"07DI":[0,3],"07EA":[0,3],"07EB":[4,3],"07EG":[2],"07FI":[0,8],"07FL":[0,5],"07GB":[0,3],"07HJ":[0,3],"07I2":[2],"07IA":[0,4],"07J9":[1],"07JR":[4,1],"07JU":[0,2],"07K0":[0,2],"07LG":[1,6],"07LS":[0,3],"07MH":[11,3],"07NI":[0,4],"07NQ":[0,2],"07NW":[0,1],"07PQ":[0,2],"07PR":[0,2],"07Q5":[0,2],"07Q6":[0,8],"07QF":[0,2],"07QM":[1],"07RH":[0,1],"07SK":[3,8],"07SY":[0,2],"07UD":[0,2],"07W3":[2,5],"07W6":[1],"07WM":[1,3],"07WT":[1,6],"07WX":[0,4],"07X5":[0,3],"07X7":[0,3],"07XT":[4,8,67],"07Y4":[2,2],"07YB":[2],"07YQ":[1,2],"07YR":[0,27],"07Z5":[2],"07ZA":[3],"07ZF":[18,19],"07ZH":[0,2],"07ZM":[6],"07ZP":[17,40,42],"07ZW":[3],"080C":[1],"080E":[0,13],"080S":[0,4,1],"080U":[0,2],"0818":[0,1],"082J":[8,6],"082Z":[0,1],"0834":[4,1],"083T":[0,6],"083Y":[0,3],"084I":[3,26,0,2],"0855":[2],"085F":[0,1],"086E":[0,9,32],"086H":[9,8],"086I":[0,4],"0871":[0,4],"0873":[0,2],"0877":[2],"088A":[4,3],"088X":[164,494,1],"0898":[0,2],"089G":[169,183],"089R":[1,10],"08A1":[2],"08AJ":[0,5],"08AK":[0,2],"08BE":[1],"08BS":[0,6],"08C8":[7,35],"08CB":[14,39],"08CK":[0,2,59],"08CP":[0,1],"08CT":[4],"08CY":[1],"08D6":[1,6],"08D9":[5,21],"08DS":[0,1],"08E4":[0,1],"08E5":[0,1],"08F3":[0,9],"08FD":[1],"08FR":[0,8],"08FX":[2],"08FZ":[2,3],"08H8":[0,4],"08HI":[0,2],"08HU":[0,1],"08IP":[1],"08IW":[0,13],"08IY":[1],"08J8":[1,1],"08JP":[0,13],"08KJ":[2],"08L2":[1],"08L9":[1,7],"08LQ":[0,14],"08LY":[42,15],"08MR":[1],"08PG":[25,52],"08PK":[1,3],"08QK":[0,2],"08QS":[0,5],"08RA":[5,9],"08RR":[0,0,0,1],"08SM":[2],"08TD":[0,3],"08TM":[3,6],"08TQ":[2,19,1],"08UF":[1],"08UU":[1],"08UV":[112,116],"08VL":[3,5],"08W4":[9,11],"08W5":[1],"08WE":[1,1],"08WU":[1],"08XG":[2],"08Y8":[37,132,87],"08YQ":[0,4],"08Z2":[3],"08ZL":[2,5],"0908":[2,4],"090A":[1],"090E":[0,5],"090F":[0,11],"090X":[1],"090Y":[3,6],"0915":[0,9],"091G":[16,13],"0921":[13,22],"092I":[0,2],"092M":[2,11],"092N":[1,1],"092R":[0,2],"092Z":[3],"093C":[0,0,105],"093M":[0,8],"0940":[0,2],"094A":[4,9],"094D":[4],"094V":[0,1],"0966":[0,11],"096H":[0,5],"096I":[1],"096P":[1],"0994":[4,3],"0996":[18,66],"0999":[59,105],"099G":[33,101],"099N":[167,251],"099W":[0,2],"099Y":[2],"09AD":[1],"0AE6":[0,3],"0AE7":[6,4],"0AEL":[1,5],"0AEU":[2],"0AF8":[1,5],"0AFB":[368,378,65],"0AFJ":[0,6],"0AFS":[0,2],"0AFZ":[31,19],"194A":[4,7],"196A":[10,27],"1A12":[6],"21A9":[0,5],"224A":[236,105],"231A":[3,6],"236A":[2,4],"23AA":[11,23],"24A4":[0,3],"266A":[18,44,75],"267A":[9,37],"275A":[15,56],"27A6":[1],"2845":[1],"28A6":[2,8],"28A7":[0,5],"296A":[0,5],"297A":[2,2],"29A1":[2],"2A21":[6,6],"2A4A":[1,4],"2A54":[1],"2A68":[4,10],"2A6A":[0,2],"2A72":[0,2],"2A78":[0,2],"2A82":[2],"2A98":[0,0,0,2],"3191":[4],"32A5":[1,2],"34A3":[2],"34A5":[0,0,0,3],"34A9":[2,4],"35A9":[0,4],"369A":[36,122],"36A5":[0,2],"376A":[0,1],"378A":[2,4],"37A1":[0,4],"37A4":[3],"38A5":[65,167],"3A19":[7,6],"3A43":[0,10],"3A62":[12,142],"3A81":[1,3],"3A8A":[0,3],"4134":[1],"42A8":[0,3],"42AA":[1],"4341":[2,6],"439A":[7,29],"43A2":[3,7],"44A2":[5,9],"44A6":[43,334],"44A7":[1],"44AA":[1],"46A3":[5,7],"46A4":[0,0,75],"46A6":[0,24],"49A4":[0,4],"4A28":[1],"4A35":[1,4],"4A45":[2],"4A53":[29,345],"4A59":[1],"4A64":[1,12],"4A6A":[0,7],"4A74":[4,2],"4A7A":[0,3],"4A81":[0,1],"4A95":[2],"4A99":[1,2],"4AA2":[0,7],"4AA8":[84,137],"4AAA":[0,1],"515A":[0,6],"51A4":[0,3],"51A7":[1],"5394":[1],"53AA":[5,54],"5418":[16,29],"5482":[2,16],"5483":[7,13],"5488":[2,3],"5491":[13,4],"5499":[1,4],"54A9":[1,6],"5519":[4,4],"5532":[0,2],"5553":[5,11],"5555":[0,8],"5565":[12,60],"5583":[0,2],"5584":[0,3],"5624":[4],"7786":[0,3],"8025":[1],"900":[181,4,1,2260],"9406":[1,2],"9560":[23,16],"9600":[9],"9627":[2],"9641":[5],"9644":[3],"9645":[10,5],"9654":[6,9],"9655":[17,2],"9657":[1]},"2026-07":{"0002":[0,3],"000N":[1],"001I":[0,5],"002Q":[0,3],"003H":[1,2],"003K":[0,4],"004Z":[0,1],"0050":[1,5],"005H":[0,5],"006Z":[15,33],"0074":[0,5],"007A":[31,105],"0082":[0,2],"008W":[0,2],"0091":[0,3],"009H":[1,5],"00AA":[0,6],"00AI":[0,1],"00B0":[0,4],"00B6":[1],"00BP":[0,1],"00D5":[0,43,220],"00D8":[0,2],"00DH":[1],"00DY":[0,4],"00EG":[3,22,60],"00EI":[1],"00EY":[10,21],"00FQ":[0,1],"00GK":[0,8],"00H8":[0,6],"00HR":[1],"00HU":[2],"00HV":[0,4],"00I6":[51,203],"00IM":[0,2],"00JA":[1],"00JN":[0,5],"00JQ":[0,2],"00JW":[0,2],"00KI":[0,3],"00L3":[32,45],"00L4":[2,3],"00L7":[1],"00M9":[0,5],"00MS":[1,5],"00N4":[0,6],"00NA":[5],"00NY":[1],"00PG":[0,4],"00PW":[1,2],"00QF":[25,196,38],"00QL":[1],"00R3":[3,7],"00R5":[2,6],"00R6":[2,5],"00R7":[1],"00SE":[1],"00SZ":[1,3],"00UX":[0,1],"00VC":[0,2],"00VF":[7,28],"00VK":[0,0,39],"00W6":[1],"00WQ":[1],"00XD":[0,8],"00XQ":[14,17],"00XW":[2,4,1],"00XX":[90,212],"00Y6":[0,1],"00YT":[1,7],"00Z2":[1],"00Z3":[8,6],"00ZK":[1],"00ZL":[3,9],"00ZT":[2],"00ZY":[0,1],"011N":[1],"011S":[0,0,1],"011X":[0,7],"0122":[2,3],"0128":[0,4],"012E":[36,127,15],"012X":[0,5],"013L":[2],"013X":[9,24],"0146":[3],"014T":[4],"0156":[2],"015F":[0,1],"015H":[0,3],"015I":[0,1],"015L":[0,6],"015P":[1,1],"016K":[0,6],"016L":[1],"0181":[1],"0182":[4],"018N":[2],"018Q":[2,2],"0190":[3],"0191":[1,3],"019P":[0,4],"01AC":[1,17,30],"01BI":[4,2],"01BL":[45,148,3],"01C8":[1],"01CH":[0,1],"01CK":[0,3],"01CL":[0,12],"01CM":[1],"01CN":[1],"01D4":[0,2],"01DA":[2,8],"01DK":[2,4],"01EL":[4,6],"01EU":[8,11],"01G7":[1],"01GI":[17,32],"01H0":[0,1],"01H9":[1],"01HM":[1,2],"01I9":[0,1],"01IL":[0,6],"01J8":[1,8],"01JC":[1],"01JX":[3,15],"01K4":[0,2],"01KA":[2],"01KZ":[14,38],"01LF":[1],"01LH":[1,0,32],"01M5":[0,1],"01N5":[0,3],"01ND":[1],"01NX":[0,2],"01PJ":[4,5],"01PL":[3],"01PV":[1],"01Q0":[0,1],"01Q8":[3],"01QX":[2,2],"01R0":[2],"01R1":[7,30],"01SC":[0,2],"01SY":[0,6],"01TQ":[0,3],"01TV":[1],"01UA":[0,3],"01UH":[3],"01UQ":[0,1],"01UT":[0,2],"01V8":[4,14],"01WB":[0,1],"01WN":[1,3],"01XX":[0,4],"01XZ":[57,213,36],"01Y0":[4,9],"01YE":[1],"01YI":[2,1],"01Z3":[0,7],"01ZH":[0,1],"01ZT":[0,2],"01ZU":[2,6],"0204":[0,1],"0213":[0,0,0,7],"0215":[0,2],"021E":[4,78],"0225":[0,1],"022K":[0,1,36],"023Y":[105,368,7],"0241":[185,611],"0244":[6,26],"024I":[0,18],"0253":[42,128],"025B":[1],"025Q":[1],"025X":[1],"025Z":[0,2],"0262":[2],"026G":[1],"027E":[2,10],"027J":[2,6],"0281":[1],"028K":[2],"028S":[1],"028X":[13,26],"0290":[0,1],"0293":[1],"029A":[21,79],"02A5":[0,3],"02A6":[0,1],"02AI":[1,14],"02B0":[2,7],"02BK":[0,1],"02BU":[21,47,47],"02BW":[4],"02C0":[0,1],"02D7":[0,6],"02EN":[0,8],"02EW":[0,3],"02G0":[0,2],"02G7":[1],"02G8":[2],"02GW":[9,32],"02HJ":[0,1],"02HR":[0,15],"02IU":[0,1],"02KD":[0,9],"02KL":[2],"02KR":[0,4],"02LD":[46,30],"02LW":[195,600,3],"02MM":[2],"02MY":[4],"02P9":[1,3],"02QF":[0,3],"02S4":[1],"02T3":[0,1],"02T6":[8,25],"02TL":[1],"02TQ":[1],"02U2":[2],"02U6":[1,2],"02UM":[0,4],"02UY":[0,4],"02VL":[2,8],"02VP":[1,3],"02WS":[2],"02XF":[0,8],"02XG":[0,2],"02YD":[0,2],"02Z3":[0,3],"030U":[2,2],"031W":[1],"0326":[1,2],"032X":[0,2],"0342":[0,1],"0348":[23,236,13],"0349":[0,2],"035C":[0,1],"035M":[0,2],"0374":[191,775,119],"038D":[1],"0397":[1],"039I":[0,10],"039S":[21,49],"03A8":[1],"03AJ":[0,3],"03BL":[24,26],"03BN":[0,3],"03CS":[0,2],"03DL":[1,2],"03DT":[0,1],"03DV":[1,1],"03EG":[1,6],"03F6":[0,2],"03GF":[0,1],"03GR":[0,2],"03H0":[0,6],"03H8":[2,3],"03HY":[8,32],"03J9":[19,15],"03JK":[0,3],"03KZ":[4],"03L7":[0,4],"03LS":[1],"03N5":[1],"03ND":[1,1],"03NJ":[2],"03PS":[0,1],"03QD":[2],"03QL":[1],"03RB":[0,3,92],"03RF":[1],"03RG":[1,2],"03S5":[0,2],"03SA":[0,3],"03SQ":[0,2],"03SW":[0,0,2],"03TP":[3],"03U4":[1,6],"03V3":[0,2],"03VL":[12,9],"03X6":[8,11],"03YN":[1],"03ZC":[1],"03ZP":[0,2],"03ZS":[1],"0400":[0,1],"040F":[0,2],"041A":[0,0,0,14],"041J":[0,1],"0435":[0,2],"044L":[0,1],"044N":[0,3],"044W":[1],"044X":[0,3,5],"045K":[0,2],"046F":[1],"046H":[0,4],"046I":[1],"046K":[0,3],"046Z":[0,2],"0478":[0,4],"047X":[1,2],"048X":[2,1],"048Y":[1],"0490":[20,13],"0491":[1],"049V":[0,3],"04A7":[1,2],"04AN":[0,7],"04AR":[0,3],"04AX":[0,4],"04AY":[0,4],"04B8":[3,4],"04BF":[5,66],"04BN":[1,4],"04BU":[0,0,0,2],"04BX":[2,4],"04CI":[2],"04D0":[0,19],"04D6":[0,4],"04DU":[4,8],"04EJ":[0,2],"04EP":[1],"04F3":[0,2],"04F4":[7,2],"04FI":[6,5],"04FP":[1,11],"04GD":[1,4,211],"04GI":[5,30],"04GR":[0,3],"04H2":[0,2],"04H3":[0,2],"04HA":[1,21],"04HT":[4,4],"04HY":[1,15],"04JA":[1],"04JN":[2,8,0,1],"04JV":[42,90,36],"04K4":[0,15],"04KM":[0,4],"04KR":[0,3],"04LJ":[6,64,81],"04LL":[1],"04LY":[3],"04MF":[3,12],"04MQ":[0,3],"04N2":[0,1],"04N7":[1],"04NK":[0,1],"04NR":[0,2],"04PD":[0,1],"04PI":[1,1],"04QQ":[10,29],"04QZ":[1],"04R0":[1,9],"04S0":[0,1],"04S7":[25,40,34],"04SS":[1,5],"04TC":[0,3],"04TJ":[2,4],"04US":[1],"04UY":[0,6],"04V4":[2],"04V9":[0,2],"04VC":[5,1],"04VH":[0,2],"04VR":[0,9],"04W1":[3,11],"04W8":[1],"04WM":[1,1],"04XL":[1],"04YS":[1,7],"04ZB":[4,37],"04ZS":[1],"0506":[0,3],"050K":[0,6],"0512":[1],"0518":[0,4],"051A":[1,4],"051G":[0,2],"0524":[0,5,12],"0525":[0,5],"052F":[0,0,66],"052P":[1],"052R":[0,0,2],"052W":[2],"0533":[0,10],"053Z":[1],"0546":[2],"0549":[1],"054H":[0,5],"054P":[0,1,15],"054R":[1],"054S":[0,3],"054Z":[0,0,1],"0556":[1],"055Q":[0,6],"055Y":[1,3],"0568":[0,3],"056C":[2],"056E":[0,0,3],"0577":[1],"0579":[0,2],"057Q":[0,5],"057V":[0,1],"0582":[0,4],"058A":[0,3],"059L":[1],"05A3":[0,0,0,228],"05AA":[5,11],"05AZ":[0,2],"05B7":[1,5],"05CH":[0,3],"05CL":[1],"05DF":[0,4],"05DX":[0,1],"05ED":[0,4],"05EI":[2,2],"05EL":[0,1],"05ER":[2],"05FT":[2,1],"05G6":[0,1],"05GG":[21,16],"05H7":[4,8],"05HA":[5],"05HB":[11,7],"05I4":[0,1],"05I8":[0,6],"05IH":[0,1],"05J2":[0,3],"05JC":[0,8],"05JL":[0,3],"05K2":[0,2],"05KL":[1],"05KN":[1],"05L7":[1],"05LZ":[1,7],"05M9":[0,2],"05P0":[1],"05PX":[1],"05QK":[2],"05QL":[0,3],"05QP":[2],"05QT":[1],"05RA":[2,2],"05RG":[0,1],"05RH":[0,10],"05RT":[1,2],"05S6":[1,4],"05SR":[2,1],"05SS":[0,2],"05SX":[1],"05T0":[0,4],"05T6":[0,0,31],"05TP":[0,2],"05UA":[1],"05VC":[0,3],"05VL":[0,1],"05WH":[6],"05YL":[1],"05YV":[0,0,0,2],"05ZZ":[4,7],"060H":[24,35],"060I":[0,3],"0616":[0,2],"061J":[17,56,102],"0625":[0,1],"062E":[0,1],"062G":[0,7],"063Y":[4,4],"063Z":[1],"0640":[2,15],"0648":[4],"064Q":[0,2],"064R":[1,2],"064Z":[0,4],"065C":[4,1],"065F":[0,8],"065G":[0,2],"065I":[0,2],"065S":[0,4],"065W":[0,10],"0663":[0,1],"066A":[7,7],"066W":[0,6],"067S":[0,12],"067U":[1,4],"0683":[1],"068V":[12,30],"0699":[0,6],"06A9":[0,4],"06AA":[0,2],"06AD":[0,4],"06AU":[131,322,52],"06C5":[0,1],"06CA":[1,5],"06CC":[4,11],"06D8":[2],"06DA":[0,4],"06E0":[7,6],"06E8":[1],"06EK":[0,6],"06EY":[4],"06FD":[8,14],"06FM":[1,1],"06FS":[0,21],"06FT":[1],"06FX":[0,2],"06GF":[4],"06GV":[1],"06HK":[0,3],"06I0":[0,3],"06JB":[0,2],"06JS":[1,3],"06JX":[0,9],"06MR":[1],"06NI":[3,3],"06NV":[2,3],"06Q5":[67,55],"06QC":[1],"06RF":[2],"06S2":[4,11],"06SR":[9,28,4],"06SS":[4,2],"06T4":[0,3],"06TE":[1,3],"06TP":[1],"06TQ":[0,4],"06TR":[77,328,26],"06UF":[0,9],"06UQ":[1,2],"06V1":[0,0,43],"06VP":[0,11,30],"06W6":[0,3],"06W8":[3,8],"06WY":[7,12],"06X1":[0,7],"06X3":[0,3],"06XX":[2,2],"06YL":[93,359],"06ZB":[0,2],"06ZH":[0,22],"06ZK":[0,1],"06ZR":[0,4],"06ZX":[0,2],"070G":[3,24],"070S":[1],"070W":[0,3],"0710":[7,8],"0715":[5,3],"0729":[0,4],"072Z":[2],"0731":[3,18],"0732":[0,2],"0734":[1],"073D":[0,1],"073G":[44,105],"073U":[0,8],"076N":[0,2],"076U":[1],"077N":[6,8],"078H":[0,2],"078K":[0,2],"078N":[1,1],"078Z":[1],"0792":[7,16],"079J":[0,4],"079Z":[19,68,36],"07B2":[0,2],"07BS":[1],"07BX":[0,2],"07CV":[0,1],"07D0":[3],"07D1":[1],"07DI":[1],"07DJ":[1],"07EB":[2,7],"07ES":[0,3],"07FI":[0,3],"07G5":[8,14],"07G9":[0,1],"07IA":[2,1],"07JR":[0,14],"07JV":[0,2],"07LF":[1],"07LG":[2],"07LS":[0,1],"07LV":[2],"07MH":[7,1],"07NR":[0,2],"07NW":[0,8],"07PB":[0,1],"07PN":[0,2],"07PR":[1,3],"07Q6":[0,3],"07QC":[0,12],"07QM":[1],"07SK":[1,6],"07TX":[2],"07UM":[1],"07VY":[0,1],"07W3":[1],"07WI":[0,5],"07WM":[1],"07WT":[2],"07WW":[1],"07WX":[1],"07XA":[0,3],"07XT":[3,0,14],"07Y4":[1,12],"07YC":[0,3],"07YE":[0,1],"07ZA":[1],"07ZF":[18,16],"07ZH":[0,1],"07ZI":[0,2],"07ZJ":[2],"07ZM":[0,1],"07ZP":[16,37,1],"0803":[2],"080E":[2,13],"080L":[1],"080S":[0,0,13],"082J":[1,4],"0834":[5,5],"083Y":[0,7],"084B":[0,4],"084G":[1],"084I":[3,0,0,4],"084M":[0,1],"084U":[0,4],"084Y":[3,3],"0855":[7],"086E":[0,15],"086H":[6,15],"086I":[1],"086X":[0,2],"0877":[1],"087E":[0,1],"088A":[1,2],"088D":[1],"088X":[98,361,138],"0898":[0,9],"089G":[96,124,89],"089R":[3,3],"08AK":[0,4],"08BE":[1],"08C8":[5,14],"08CB":[12,21],"08CP":[0,8],"08D6":[1,2,30],"08D9":[8,11],"08DS":[0,4],"08E5":[0,3],"08FD":[1],"08FR":[0,3],"08FZ":[4,11],"08H8":[0,2],"08HI":[1],"08HU":[0,1],"08IM":[1],"08IP":[1],"08IW":[0,6],"08J8":[1],"08JD":[2],"08KJ":[1,1],"08L9":[2,5],"08LH":[0,3],"08LQ":[0,8],"08LY":[47,22],"08MT":[1],"08NG":[0,2],"08NP":[0,6],"08P7":[0,2],"08PA":[0,5],"08PG":[10,38],"08PK":[0,3],"08Q1":[0,5],"08R5":[0,4],"08RA":[3,7],"08RW":[0,2],"08S1":[0,0,5],"08SB":[0,1],"08SM":[2],"08TD":[1],"08TM":[0,19],"08TQ":[1],"08TZ":[0,4],"08UV":[73,114],"08VE":[0,1],"08W4":[7,4],"08W5":[0,5],"08W9":[0,1],"08Y8":[21,90,82],"08YV":[0,0,42],"08Z2":[1,3],"08ZL":[2,3],"0908":[1,1],"090E":[0,20],"090Y":[0,2],"091G":[10,6],"0921":[11,40],"092M":[1],"092N":[0,3],"092Z":[1,3],"093C":[2,0,33],"0940":[0,6],"094A":[4,7],"094D":[1,1],"094K":[1],"094V":[2,2],"095M":[1],"096H":[0,1],"096I":[2,7],"096P":[0,1],"097Z":[0,4],"0994":[1,3],"0996":[17,79],"0999":[26,78],"099G":[13,66],"099N":[84,220],"09AG":[0,1],"09AK":[0,2],"0AE7":[3,4],"0AEU":[0,3],"0AF8":[1],"0AFA":[1],"0AFB":[121,261],"0AFS":[1,7],"0AFU":[1],"0AFZ":[10,15],"0AG0":[1],"194A":[6,5],"196A":[11,36],"1A12":[1],"21A9":[0,1],"224A":[83,96],"231A":[7,9],"239A":[0,4],"23AA":[8,36],"2497":[1],"25A7":[0,2],"266A":[5,14],"267A":[7,32],"26A1":[1],"275A":[12,54],"286A":[0,0,41],"28A6":[2,2],"28A7":[0,1],"297A":[0,3],"2A15":[5],"2A21":[7,2],"2A31":[0,1],"2A54":[0,2],"2A68":[1,12],"2A6A":[0,1],"2A72":[1,2],"2AA2":[0,2],"3191":[4],"328A":[0,2],"333A":[0,2],"34A5":[0,0,0,1],"34A9":[3],"351A":[0,1],"369A":[26,130,129],"36A5":[0,2],"378A":[0,10],"38A5":[49,129],"396A":[0,1],"3A19":[2,4],"3A28":[1],"3A48":[0,3],"3A51":[0,2,34],"3A62":[4,83],"425A":[0,2],"42A8":[0,5],"4341":[0,10],"439A":[6,42,4],"43A2":[3,4],"44A2":[5,3],"44A6":[6,303],"459A":[0,1],"45A2":[0,3],"46A3":[4,15],"46A6":[0,7],"494A":[0,1],"495A":[0,5],"4A19":[0,9],"4A29":[1,6],"4A45":[0,2],"4A53":[17,270],"4A55":[1],"4A74":[4,3],"4A7A":[0,2],"4A95":[1],"4A9A":[0,3],"4AA2":[2,2],"4AA8":[67,150],"4AAA":[0,2],"514A":[6,12],"515A":[1,19],"51A4":[0,1],"5351":[1],"53AA":[2,31],"5418":[16,14],"5482":[1,7],"5483":[4,11],"5488":[8,4],"5491":[4,4],"5495":[0,2],"5499":[1,2],"54A9":[0,9],"5519":[1,3],"5546":[3],"5552":[0,2],"5553":[4,17],"5555":[0,1],"5565":[17,60],"5566":[1,2],"5574":[1],"5583":[2,5],"5584":[0,2],"55A6":[7,50],"55A8":[0,17],"5624":[4,4],"5645":[1],"5679":[2,1],"7786":[1,3],"8025":[1,6],"900":[143,11,0,2452],"9560":[32,31],"9600":[2],"9641":[2],"9644":[1],"9645":[4,3],"9654":[14],"9655":[15,8]},"2026-08":{"0002":[0,6],"000F":[1],"000K":[0,3],"000N":[2],"000S":[0,2],"000Y":[0,2],"0019":[1],"0024":[0,2],"003H":[1],"003L":[0,2],"003M":[0,11],"004W":[0,32],"0050":[0,2],"006L":[1],"006P":[0,1],"006Z":[22,75,12],"0075":[0,1],"007A":[20,115],"008W":[0,2],"009F":[2],"009H":[1,13],"009T":[0,2],"00AA":[0,2],"00B0":[3,3],"00B6":[1],"00B9":[1],"00BD":[1,2],"00BX":[0,1],"00C4":[0,2],"00CJ":[1],"00D5":[0,0,4],"00DQ":[0,5],"00DU":[0,3],"00DY":[0,2],"00E1":[1,3],"00EG":[2,14,1],"00EH":[0,4],"00EJ":[1],"00EY":[16,26],"00FZ":[0,2],"00GF":[0,2],"00HD":[1,6],"00HU":[1,9],"00I6":[40,308],"00IM":[2],"00JA":[1],"00JF":[0,7],"00JM":[0,1],"00JN":[1],"00JW":[0,2],"00K2":[0,2],"00KI":[0,8],"00L3":[34,49],"00L4":[0,2],"00MV":[0,3],"00NA":[4],"00PW":[0,9],"00QF":[41,271,42],"00QL":[0,2],"00QQ":[1],"00QU":[0,5],"00R3":[2,11],"00R6":[0,9],"00SZ":[1],"00T9":[2,1],"00TK":[1],"00TU":[0,2],"00TV":[3,3],"00UK":[0,4],"00UT":[0,3],"00VF":[8,44],"00W6":[0,2],"00XQ":[25,42],"00XW":[4,0,6],"00XX":[100,334],"00Y1":[0,1],"00Y5":[0,13],"00YB":[0,3],"00YT":[1],"00Z3":[5,22],"00ZL":[4,15],"00ZM":[0,2],"00ZR":[2,3],"00ZU":[0,2],"00ZY":[1],"010A":[0,2],"011S":[0,6],"011X":[1,10],"011Y":[1],"0122":[1,4],"0128":[1,13],"012E":[29,135,31],"012V":[0,2],"0135":[2,3],"013K":[1],"013L":[1],"013X":[6,34],"0146":[1],"014T":[7],"0150":[0,2],"0156":[1],"015H":[1],"015P":[0,1],"016K":[0,2],"016L":[1],"0170":[2,4],"0178":[0,1],"017Y":[0,1],"0181":[0,2],"0182":[0,4],"018Q":[4,2],"0191":[0,10],"01AC":[0,18,3],"01BI":[1,9],"01BL":[50,199,1],"01CH":[0,2],"01CM":[2,2],"01CN":[1,7],"01DA":[0,1],"01DC":[0,1],"01DK":[3,5],"01DY":[0,1],"01EL":[3],"01EQ":[3],"01EU":[3,17],"01EV":[1,3],"01F2":[2],"01G7":[1],"01GI":[20,23],"01GL":[0,8],"01GT":[0,6],"01GU":[0,2],"01H0":[0,4],"01HJ":[0,1],"01HM":[0,3],"01IL":[1,6],"01J8":[5,4],"01JU":[0,6],"01JX":[0,20],"01KB":[1],"01KT":[0,4],"01KZ":[9,35],"01LH":[0,0,1],"01ND":[1],"01P1":[0,2],"01P5":[0,4],"01PJ":[1,3],"01PL":[2],"01QM":[1,1],"01R1":[6,40],"01RD":[0,3],"01RU":[4],"01RV":[1],"01SC":[0,2],"01SK":[0,3],"01SY":[0,4],"01TQ":[1],"01TR":[0,8],"01TT":[0,2],"01UH":[2,4],"01UW":[1],"01V5":[1,4],"01V8":[0,6],"01VX":[0,4],"01W9":[0,2],"01WB":[0,1],"01WC":[1],"01WZ":[0,2],"01XG":[1],"01XQ":[0,3],"01XX":[4,12],"01XZ":[61,337,36],"01Y0":[7,16],"01YI":[1,5],"01YU":[3,10],"01Z3":[2,13],"01ZH":[2],"01ZJ":[2,2],"01ZR":[0,2],"01ZT":[1],"01ZU":[0,0,69],"0204":[1],"0213":[0,0,0,26],"021E":[2,59],"021F":[0,1],"021U":[0,1],"022K":[0,4],"022T":[2,3],"0233":[0,2],"023Y":[114,358],"0241":[177,1022],"0244":[2,22],"024D":[0,3],"024H":[0,1],"024I":[2,36],"024L":[0,1],"024M":[0,7],"024Z":[1],"0253":[28,247],"025B":[0,1],"025G":[0,1],"025Q":[0,5],"026G":[1],"027E":[1,14],"027J":[2],"0288":[0,2],"028H":[0,2],"028X":[11,42],"029A":[41,118,1],"029C":[0,3],"029U":[0,1],"02AI":[1,1],"02B0":[0,5],"02B1":[1],"02BH":[0,3],"02BU":[20,100],"02BW":[31,86],"02C9":[0,5],"02D2":[7],"02D7":[0,4],"02EN":[0,1],"02EU":[0,2],"02EW":[0,4],"02FU":[1],"02G6":[1],"02GK":[0,1],"02GW":[7,51,31],"02HJ":[0,4],"02HM":[0,1],"02I1":[1],"02II":[0,1],"02IU":[1],"02LD":[25,44],"02LW":[154,867,4],"02MM":[2,9],"02MW":[0,3],"02NQ":[1],"02NY":[0,2],"02P9":[1],"02QF":[0,2],"02R9":[0,1],"02S4":[0,1],"02SL":[1,1],"02T6":[5,21],"02UB":[0,1],"02UY":[1],"02V3":[0,2],"02VG":[0,1],"02VL":[0,12],"02VP":[3,22],"02WS":[3,2],"02XF":[2,5],"02XG":[0,3],"02YD":[0,4],"02YL":[0,5],"02Z3":[0,0,80],"02ZX":[0,3],"0305":[2],"030S":[0,2],"031J":[0,3],"0326":[3,1],"0348":[23,210],"0349":[0,1],"034R":[0,3],"035M":[0,2],"0361":[0,2],"036X":[1],"0374":[162,1205,46],"037P":[0,1],"0380":[0,1],"038H":[0,3],"038S":[1],"039I":[0,2],"039N":[0,4],"039S":[11,45],"03A8":[0,2],"03AI":[1],"03BL":[8,31],"03BN":[4,1],"03DL":[1,1],"03DV":[1,7],"03DW":[1],"03DY":[1],"03E3":[3],"03EG":[5,2],"03FC":[1],"03G5":[0,2],"03GR":[1,3],"03H8":[0,3],"03HY":[10,28,34],"03IX":[1],"03J2":[0,1],"03J9":[13,25],"03K6":[0,1],"03K8":[0,4],"03KZ":[1,2],"03L5":[0,2],"03NJ":[0,5],"03PS":[0,1],"03RR":[0,1],"03SI":[0,2],"03SL":[0,1],"03TZ":[0,1],"03UD":[0,1],"03VL":[7,17],"03VM":[1],"03WT":[0,2],"03X6":[4,11],"03XQ":[0,2],"03Y6":[1],"03YA":[0,1],"03YN":[0,9],"03YR":[0,8],"03ZR":[0,6],"040V":[1],"041A":[0,0,0,5],"041J":[1,1],"041S":[0,2],"042D":[1,1],"043J":[0,2],"043V":[1],"0440":[1],"0445":[0,6],"044H":[0,4],"044L":[0,3],"044U":[2],"045K":[0,1],"046F":[0,1],"046H":[0,1],"047P":[0,1],"047X":[0,5],"048T":[0,21],"048X":[1],"0490":[15,17],"0491":[1],"0494":[0,2],"049U":[0,2],"049V":[2,3],"04A7":[2,8],"04AN":[0,31],"04AR":[1],"04AY":[0,10],"04B8":[4,3],"04BC":[0,4],"04BF":[16,79],"04BN":[1,6],"04BU":[0,0,0,2],"04BX":[0,3],"04CI":[0,2],"04D6":[0,3],"04DU":[1,9],"04E9":[0,1],"04EP":[0,2],"04F3":[0,2],"04F4":[7,17],"04FI":[0,2],"04FP":[1,11],"04FW":[1,5],"04GD":[0,10],"04GI":[7,53,2],"04GK":[0,1],"04HA":[2,5],"04HC":[0,4],"04HT":[7,6],"04HY":[1,14],"04IL":[0,2],"04JA":[0,3],"04JN":[0,1,0,1],"04JU":[0,4],"04JV":[27,86],"04K2":[0,3],"04K4":[0,17],"04KM":[2,14],"04KR":[0,1],"04L3":[1],"04LE":[0,2],"04LJ":[10,41],"04LL":[1],"04MF":[5,3],"04MN":[0,3],"04MQ":[0,19],"04MX":[0,1],"04N7":[0,7],"04NR":[0,4],"04P4":[0,1],"04PD":[3],"04PH":[0,2],"04PI":[5,1],"04PV":[0,2],"04Q9":[0,9],"04QQ":[6,18],"04QZ":[0,10],"04R0":[6,17],"04R3":[1],"04RQ":[1,4],"04S0":[0,3],"04S3":[0,1],"04S7":[30,58],"04SB":[1],"04SS":[0,13],"04TC":[0,2],"04TI":[3],"04TJ":[0,3],"04TX":[0,2],"04U1":[1],"04US":[1,3],"04UY":[0,2,1],"04V9":[0,2],"04VC":[0,14],"04W1":[2,30],"04WF":[7,1],"04WR":[1],"04X1":[0,0,7],"04XK":[0,2],"04XR":[1],"04Y2":[0,7],"04YS":[1,2],"04Z0":[1],"04Z6":[0,2],"04ZB":[6,52,7],"04ZC":[1],"04ZX":[0,4],"04ZZ":[0,7],"0502":[0,2],"0506":[1,4],"0508":[1],"050J":[0,2],"050Y":[1],"051A":[1,2],"051E":[1,2],"051G":[0,5],"051K":[1],"051Q":[0,0,30],"051W":[0,3],"0524":[3,8,9],"052A":[0,2],"052F":[0,0,16],"052P":[1,7],"052R":[0,7],"052W":[1],"053D":[0,1],"053Z":[0,2],"054B":[2],"054G":[1],"054H":[0,14],"054P":[0,0,5],"054S":[0,1],"054Z":[0,0,4],"055Q":[0,10],"055U":[0,3],"055Y":[5,2],"056C":[0,2],"056E":[1,1],"056I":[0,2],"0577":[1,1],"0579":[0,3],"057Q":[1],"057V":[0,4],"057Y":[1],"057Z":[0,10],"0580":[0,2],"0587":[0,4],"058X":[0,4],"059L":[1],"05A3":[0,0,0,148],"05AA":[2,6],"05B7":[3,9],"05CD":[1],"05CH":[0,5],"05CI":[0,3],"05CL":[0,1],"05DF":[1,1],"05ED":[0,2],"05EI":[4,3],"05EL":[3,3],"05ER":[2],"05EU":[0,2],"05GG":[14,50],"05GN":[0,4],"05GX":[2],"05H7":[3,9],"05HA":[1],"05HB":[2,13],"05HV":[0,2],"05I8":[0,1],"05JC":[1,7],"05K1":[1,6],"05K2":[0,8],"05KD":[0,1],"05KL":[0,2],"05KN":[1,12],"05LZ":[0,2],"05N3":[1,2],"05N8":[1],"05NK":[0,5],"05P0":[4,5],"05P5":[0,3],"05PX":[0,2],"05QD":[0,3],"05QK":[1],"05R6":[0,5],"05RA":[2,1],"05RG":[1,3],"05RH":[1,7],"05RT":[0,9],"05S6":[2,3],"05SR":[2,7],"05SS":[0,1],"05SX":[0,2],"05SY":[2,1],"05T9":[0,4],"05TP":[0,3],"05U6":[1],"05UA":[1,3],"05W0":[0,1],"05WH":[2,2],"05WM":[1],"05X1":[10,0,30],"05YM":[1],"05YY":[0,6],"060C":[1,6],"060H":[30,44,2],"060J":[1],"060Z":[0,6],"0614":[0,3],"061H":[1,3],"061J":[19,84,143],"0625":[0,1],"062G":[1,5],"062J":[1],"062S":[1],"062T":[1],"063T":[1],"063Y":[2,4],"0640":[1,19],"064Q":[0,2],"064R":[0,1],"064U":[1,3],"065C":[4,1],"065F":[1],"065I":[0,4],"065K":[0,5],"065S":[0,21],"065U":[0,1],"065W":[0,8],"066A":[13,14],"066E":[0,1],"066U":[0,1],"0675":[0,2],"067G":[1],"067S":[0,8],"067U":[1,3],"0683":[0,5],"068T":[0,1],"068V":[9,45],"0699":[0,1],"06A6":[0,1],"06A9":[0,5],"06AA":[0,3],"06AD":[0,1],"06AG":[1],"06AU":[129,490,1],"06B4":[0,1],"06B6":[0,4],"06C4":[2],"06CA":[0,21],"06CC":[4,3],"06D0":[0,1],"06D8":[0,5],"06E0":[11,11],"06E7":[0,14],"06EK":[0,7],"06EQ":[0,20],"06EY":[0,1],"06FD":[8,27],"06FS":[0,1],"06FT":[0,3],"06FY":[0,2],"06GF":[1],"06GS":[0,3],"06GV":[1],"06HA":[0,0,48],"06HK":[0,5],"06J5":[0,1],"06J7":[0,8],"06JB":[0,1],"06JS":[0,2],"06JU":[0,1],"06LC":[2],"06LF":[0,2],"06MY":[0,1],"06NI":[3,1],"06P3":[0,3],"06PK":[0,3],"06PM":[0,1],"06Q1":[1],"06Q5":[87,115],"06QC":[1,3],"06QT":[1],"06S2":[5,29],"06SR":[9,33],"06SS":[1,4],"06T4":[0,6],"06TE":[1,2],"06TR":[74,532,60],"06UF":[2,11],"06UM":[0,0,35],"06UP":[0,2],"06UQ":[1,1],"06V1":[0,5,99],"06VP":[0,6],"06W6":[0,3],"06W8":[2,4],"06WK":[0,4],"06WT":[4,1],"06WY":[12,17],"06X1":[1,4],"06X3":[0,1],"06XQ":[0,2],"06XX":[1,7],"06YE":[0,2],"06YL":[80,336],"06Z4":[2],"06Z7":[0,4],"06ZH":[0,2],"0701":[0,2],"070G":[6,27],"070S":[0,0,0,1],"070W":[0,2],"0710":[3,12],"0715":[0,7],"072U":[0,3],"072Z":[6,2],"0731":[0,18],"0732":[0,1],"0734":[1],"073G":[38,141],"073S":[0,3],"073U":[1,3],"073W":[1],"0741":[2],"0742":[0,9],"074C":[0,0,64],"074D":[0,1],"075U":[1],"076S":[0,1],"076U":[0,1,67],"0772":[0,3],"077N":[3,24],"077V":[0,1],"0781":[0,1],"078Z":[1],"0792":[11,12],"0797":[0,1],"079C":[0,2],"079F":[0,2],"079Z":[14,80,80],"07BS":[1,5],"07BZ":[0,1],"07D0":[7],"07D1":[1],"07D4":[0,7],"07DI":[3,1],"07DL":[0,2],"07EB":[5,6],"07ES":[0,11],"07FI":[2],"07FL":[2],"07G5":[0,7],"07G9":[0,2],"07HJ":[1],"07IA":[0,3],"07IC":[1],"07IU":[0,3],"07JR":[0,2],"07JV":[0,3],"07LJ":[1],"07LV":[1],"07MC":[1],"07MH":[4,1],"07ND":[0,3],"07NI":[0,2],"07NW":[0,31],"07PR":[0,3],"07PW":[0,2],"07Q5":[0,17],"07Q6":[1,4],"07QJ":[0,3],"07R1":[0,1],"07SK":[2,6],"07SU":[0,2],"07U3":[0,1],"07UM":[0,1],"07W3":[0,9],"07WF":[0,2],"07WM":[2],"07WT":[4],"07WW":[0,1],"07WX":[1],"07X5":[0,1],"07XT":[1,3,20],"07XZ":[0,4],"07Y4":[1,1],"07YB":[0,7],"07YC":[0,6],"07YE":[3],"07YL":[1],"07YQ":[1],"07YR":[0,17],"07ZA":[1,3],"07ZF":[16,33],"07ZG":[1],"07ZM":[0,2],"07ZP":[12,45,4],"080C":[1],"080E":[0,20],"080S":[0,0,2],"080U":[0,2],"0818":[0,1],"0819":[0,1],"082B":[1],"082I":[2],"082J":[2,6],"082Z":[0,2],"0834":[2,5],"083C":[0,1],"083T":[0,12],"083Y":[1],"084I":[5,10,0,4],"084Y":[0,1],"0855":[8,4],"086E":[1,1],"086F":[0,1],"086H":[4,8],"088A":[1,1],"088B":[1,2],"088N":[0,2],"088X":[86,471,41],"0898":[0,19],"089G":[96,133],"089R":[2,10],"08AK":[0,5],"08AL":[1,2],"08BE":[0,18],"08BV":[0,10],"08C8":[11,15],"08CB":[13,87],"08CK":[0,0,2],"08CP":[0,9],"08D0":[1],"08D6":[0,4],"08D9":[9,19],"08DG":[0,2],"08DS":[0,6],"08E5":[1],"08FR":[0,3],"08FZ":[3,18],"08GB":[2,5],"08H4":[0,4],"08HI":[0,5],"08HY":[0,1],"08IP":[2,2],"08IS":[1,2],"08IT":[0,3],"08IW":[0,5],"08IZ":[0,2],"08J8":[0,13],"08JL":[0,3],"08KJ":[0,1],"08L9":[4,1],"08LQ":[3,6],"08LU":[0,3],"08LY":[47,50],"08N5":[1],"08NF":[1],"08P5":[0,1],"08PA":[0,1],"08PG":[14,52],"08PH":[1],"08PK":[3,2],"08QS":[2],"08R5":[0,2],"08RA":[2,11,30],"08RR":[0,0,0,4],"08S1":[0,0,6],"08SB":[0,2],"08SM":[1,4],"08SQ":[0,4],"08TD":[1,1],"08TM":[0,16],"08TQ":[0,1],"08U2":[1],"08UV":[64,236],"08W4":[1,5],"08WE":[1],"08XM":[0,2],"08Y8":[5,48,39],"08YB":[0,5],"08Z0":[0,8],"08ZL":[2,2],"0908":[1],"090A":[0,6],"090E":[2],"090Y":[1],"091G":[4,13],"091W":[1],"0921":[9,39,94],"092M":[4,3],"092N":[0,5],"0937":[0,3],"093C":[4,4],"093K":[1],"093M":[0,4],"0940":[0,2],"094A":[7,6],"094V":[1],"096C":[0,1],"096I":[1,3],"096P":[0,4],"0972":[0,1],"0994":[2,8],"0996":[8,110],"0999":[27,129],"099G":[17,86],"099N":[82,216],"099Q":[1],"099U":[0,6],"099Z":[1],"09AD":[1],"09AG":[1],"09B5":[0,2],"0AE6":[1,3],"0AE7":[8,4],"0AEL":[0,6],"0AEU":[1,4],"0AF5":[1],"0AF8":[0,4],"0AFB":[119,454],"0AFJ":[1],"0AFZ":[10,26],"0AG8":[0,1],"194A":[5,23],"196A":[11,23],"1A12":[2,2],"21A9":[0,2],"224A":[173,207],"23AA":[13,39],"266A":[3,35],"267A":[7,46],"26A1":[0,4],"275A":[20,84],"286A":[0,0,11],"28A6":[2],"28A9":[0,1],"296A":[0,1],"297A":[1],"29A1":[2],"2A13":[0,2],"2A18":[0,1],"2A21":[0,25],"2A31":[0,1],"2A53":[0,3],"2A68":[1,22],"2A72":[0,7],"2A82":[0,1],"2A98":[0,0,0,2],"3191":[3,9],"328A":[0,5],"34A3":[0,1],"34A5":[0,0,0,2],"34A9":[1,5],"351A":[1,6],"357A":[1],"369A":[18,202,8],"36A5":[0,1],"374A":[0,4],"378A":[1,3],"37A4":[0,2],"38A5":[45,226],"395A":[0,1,2],"396A":[2],"3A19":[4,3],"3A62":[3,117],"3A81":[0,6],"3A8A":[1],"3AA1":[0,5],"42A1":[0,4],"42A9":[0,1],"42AA":[2],"4341":[2,6],"439A":[1,42],"43A2":[2,1],"44A2":[3,9],"44A6":[20,411],"44A7":[1],"459A":[0,2],"46A3":[12,16],"46A4":[0,0,25],"46A5":[0,1],"46A6":[0,18],"47A5":[0,2],"49A4":[0,2],"4A29":[2,3],"4A45":[0,3],"4A46":[0,2],"4A53":[14,289],"4A55":[0,1],"4A59":[0,2],"4A64":[1],"4A65":[1,6],"4A74":[3,11],"4A7A":[3],"4A81":[0,7],"4A9A":[2],"4AA8":[71,205],"4AAA":[1,4],"514A":[0,5],"515A":[5,10],"51A1":[1],"528A":[1,3],"5351":[2],"536A":[0,6],"53A5":[1],"53AA":[4,68],"5418":[16,41],"542A":[2],"5482":[2,8],"5483":[1,18],"5488":[4,24],"5491":[3],"5495":[0,1],"5499":[0,3],"54A6":[1,4],"54A9":[1,2],"5519":[0,2],"5527":[0,1],"5539":[0,0,1],"5546":[1],"5553":[6,23],"5557":[0,1],"5565":[32,116],"5566":[4,8],"5583":[3,3],"558A":[0,1],"55A6":[26,112],"5623":[1],"5624":[7,2],"5642":[0,13],"5645":[1,3],"5656":[0,4],"5692":[1,3],"5698":[0,3],"571A":[2],"5729":[1],"5786":[0,3],"7786":[1,2],"8025":[2],"900":[168,5,3,2314],"9406":[1,5],"9560":[15,26],"9600":[8,2],"9617":[1],"9627":[0,2],"9641":[2],"9644":[3],"9645":[11],"9654":[7,10],"9655":[15,11],"9656":[0,4]},"2026-09":{"0002":[0,2],"001I":[0,2],"003H":[1],"003J":[0,0,56],"003L":[0,1],"003M":[1,1],"004W":[0,4],"0050":[0,2],"005M":[0,1],"006Z":[16,100],"0075":[0,1],"007A":[21,95],"007B":[0,1],"007Y":[0,1],"008W":[0,2],"0090":[1],"009H":[7,3],"00A8":[0,2],"00AA":[0,6],"00AE":[1,2],"00B0":[1,2],"00B6":[0,2],"00B9":[3],"00BD":[0,1],"00BL":[0,2],"00C4":[0,4],"00CD":[0,1],"00CJ":[1,7],"00CT":[0,1],"00D5":[0,2],"00DH":[0,1],"00DM":[0,1],"00E1":[0,7],"00EG":[1,9,3],"00EY":[27,29],"00GK":[0,2],"00H8":[1,5],"00HA":[1],"00HD":[4],"00HU":[5,7],"00HV":[1],"00HX":[0,1],"00I6":[47,388,31],"00JF":[0,2],"00JM":[0,2],"00JQ":[1,1],"00K2":[0,3],"00KI":[0,4],"00L3":[24,71,53],"00L4":[2,12],"00LK":[0,3],"00LS":[0,2],"00MV":[0,2],"00N4":[0,30],"00NA":[2],"00NW":[0,8],"00PG":[0,2],"00PM":[0,2],"00QF":[51,398,36],"00R3":[1],"00R6":[0,6],"00RN":[0,2],"00SE":[1],"00SU":[0,1],"00T9":[1,5],"00TK":[1],"00TU":[1,2],"00TV":[1],"00VF":[6,39],"00XQ":[16,25],"00XW":[3,5,2],"00XX":[75,252,188],"00Y5":[7,38],"00Y6":[0,2],"00YB":[1,2],"00YE":[0,1],"00YS":[0,1],"00YT":[1],"00Z3":[7,15],"00Z8":[1],"00ZK":[1,1],"00ZL":[0,3],"00ZR":[1],"00ZT":[1],"0104":[0,2],"010A":[0,6],"010P":[0,1],"011N":[0,0,56],"011S":[0,1],"011Y":[0,5],"0122":[2,2],"0128":[0,3],"012B":[1],"012E":[21,139,120],"0135":[0,3],"013L":[1],"013X":[6,31],"0146":[0,5],"014S":[0,1],"014T":[2],"0150":[0,2],"015L":[0,1],"016K":[0,1],"016L":[0,1],"016P":[0,1],"0172":[0,3],"0181":[0,2],"0182":[1],"018L":[0,1],"018Q":[3],"0190":[1],"0191":[0,6],"019J":[0,5],"019S":[1],"01AC":[2,32,2],"01BI":[0,4],"01BL":[44,120,34],"01BU":[0,5],"01CH":[0,1],"01CK":[0,2],"01CM":[1],"01CN":[1,4],"01DA":[1,2],"01DK":[1,14,47],"01E8":[0,1],"01EL":[1],"01EU":[7,19],"01EV":[1],"01F2":[1],"01F5":[0,5],"01G7":[0,8],"01GI":[19,33],"01H0":[0,7],"01HJ":[0,3],"01HM":[0,2],"01IA":[0,3],"01IL":[1,6],"01J4":[0,1],"01J5":[1,8],"01J8":[0,2],"01JX":[0,8],"01KA":[1],"01KT":[1,3],"01KZ":[9,46],"01LF":[1],"01LZ":[0,17],"01N5":[1,4],"01N6":[1,4],"01ND":[1],"01NT":[2],"01P5":[1,2],"01PJ":[7,7],"01PL":[3,2],"01Q8":[0,3],"01QM":[2],"01R0":[1],"01R1":[6,59],"01RK":[1],"01RU":[1],"01SA":[1],"01SC":[1],"01SH":[1],"01SS":[1],"01TC":[0,0,62],"01TQ":[0,14,63],"01TR":[0,2],"01UH":[1,12],"01UM":[0,1],"01UT":[0,2],"01UU":[0,4],"01V0":[0,1],"01V8":[3,2],"01VJ":[1,1],"01W2":[2],"01X1":[0,2],"01XC":[0,4],"01XG":[1],"01XW":[1,2],"01XX":[2],"01XZ":[35,274],"01Y0":[8,11],"01YD":[0,3],"01YI":[6,5],"01YU":[5,22],"01Z3":[0,7],"01Z4":[1],"01ZJ":[0,10],"01ZT":[1],"01ZU":[5,4,1],"0204":[1],"0213":[0,0,0,7],"021E":[2,50],"021F":[1,1],"022C":[1],"022K":[0,2,2],"022Q":[0,7],"022T":[0,2],"023H":[2,1],"023Y":[92,407],"0241":[134,847],"0244":[0,12,47],"024H":[0,3],"024I":[0,23],"0253":[32,179],"025Q":[0,2],"0262":[1],"026Q":[0,3],"0274":[0,1],"027E":[1,3],"027J":[8],"027W":[0,2],"0282":[0,4],"028X":[11,60],"0293":[0,5],"0294":[0,2],"029A":[34,155],"029T":[1],"029Y":[1],"02A6":[0,1],"02AI":[1,9],"02AT":[0,1],"02B0":[1,2],"02B1":[1,2],"02BK":[0,1],"02BU":[25,59,59],"02BW":[35,54],"02D2":[0,3],"02EN":[1,3],"02EQ":[1],"02EW":[0,12],"02FU":[0,4],"02GW":[9,52],"02HE":[1],"02HH":[0,5],"02HJ":[0,11],"02I1":[0,3],"02IC":[0,2],"02JR":[0,3],"02KP":[0,1],"02KQ":[0,7],"02LD":[40,46],"02LW":[179,946,141],"02LZ":[1,1],"02NE":[0,8],"02NZ":[0,3],"02P9":[0,3],"02PY":[0,1],"02R9":[0,1],"02S4":[0,3],"02T6":[7,25],"02TQ":[0,2],"02UB":[1],"02UM":[0,1],"02UY":[0,5],"02VG":[0,1],"02VL":[4,8],"02VP":[3,4,30],"02WS":[6,3],"02XF":[2,8],"02XG":[0,2],"02Y7":[0,1],"02YD":[1],"02Z3":[0,0,1],"02ZX":[0,1],"031D":[0,1],"0322":[0,1],"0326":[2,3],"0348":[19,235],"034H":[1],"0361":[0,3],"036K":[0,4],"0374":[212,1134,1],"037P":[0,2],"0380":[0,2],"038R":[0,2],"039S":[13,125],"03A8":[2],"03AP":[0,4],"03BL":[6,34],"03BN":[2,1],"03CS":[1,1],"03DV":[2,2],"03E0":[0,3],"03EG":[4,2],"03GF":[0,3],"03H8":[5],"03HY":[13,14,34],"03IQ":[0,2],"03IX":[1],"03J9":[18,32],"03K6":[0,12],"03KZ":[0,1],"03L5":[0,2],"03LS":[0,6],"03MK":[1],"03MM":[0,2],"03MN":[1],"03PS":[0,4],"03RB":[1,5],"03RR":[1],"03SA":[1],"03SL":[2,1],"03UG":[0,3],"03V0":[5],"03VL":[7,6],"03WC":[1],"03WT":[0,12],"03X3":[1],"03X6":[12,13],"03XZ":[1],"03YA":[0,6],"03YN":[0,6],"03YR":[1,6],"03ZR":[2,2],"0400":[0,2],"040R":[2],"041A":[0,0,0,3],"041J":[0,1],"041Q":[0,3],"041S":[0,1],"042D":[0,1],"0437":[0,2],"043J":[1],"0440":[1],"0442":[0,3],"044H":[0,2],"044L":[0,13],"044S":[0,1],"0455":[0,1],"045K":[0,7],"045U":[0,3],"046F":[1],"046H":[0,4],"046K":[1],"046Z":[1,1],"0473":[1],"047U":[0,4],"048T":[0,2],"048X":[3,1],"0490":[32,20],"0491":[4],"049Q":[2,2],"049V":[0,1],"04A7":[2,7],"04AE":[0,2],"04AF":[1],"04AN":[1,11],"04AY":[0,2],"04B8":[0,21],"04BF":[24,80],"04BN":[2,2],"04BU":[0,0,0,2],"04D6":[1,3],"04DU":[1,10],"04EJ":[1],"04F3":[0,3],"04F4":[4,30],"04FI":[2,11],"04FP":[4,1],"04GD":[2,7],"04GI":[11,34],"04GK":[0,2],"04HA":[3,5],"04HC":[0,2],"04HT":[5,14],"04HY":[2,6],"04ID":[0,7],"04IY":[1],"04IZ":[0,7],"04JA":[0,2],"04JE":[5],"04JN":[2,10],"04JV":[38,107,37],"04K4":[0,3],"04KM":[0,6],"04KR":[0,2],"04LJ":[7,32,10],"04LL":[0,3],"04MF":[2,17],"04MN":[0,2],"04N7":[0,2],"04NR":[1,17],"04PD":[3,5],"04PI":[1,1],"04Q9":[0,5],"04QQ":[6,5],"04QZ":[0,6],"04R0":[4,15],"04S0":[1,6],"04S7":[18,37],"04SB":[0,3],"04SS":[1,8],"04TJ":[1],"04V9":[0,5],"04VC":[1],"04W1":[7,11],"04WF":[0,6],"04WR":[0,2],"04WT":[3],"04XJ":[0,1],"04XM":[0,1],"04YS":[1],"04ZB":[3,31,35],"0502":[0,2],"0506":[0,7],"050Y":[1],"051A":[2,5],"0524":[4,8,5],"0525":[1,14],"052F":[0,0,15],"052P":[0,1],"054H":[0,19],"054N":[0,7],"054P":[0,2,2],"054Z":[0,0,3],"055Q":[0,3],"055U":[1],"055Y":[1,6],"0568":[1,2],"056C":[0,2],"056E":[0,4],"056I":[0,7],"056M":[1],"0577":[2,6],"057W":[0,3],"057Y":[0,1],"057Z":[0,2],"059H":[0,3],"059L":[1,4],"05A3":[0,0,0,24],"05AA":[3],"05B7":[3,9],"05CH":[0,4],"05CJ":[0,1],"05CL":[0,1],"05DF":[1,21],"05EL":[2,15],"05FT":[0,2],"05FV":[0,1],"05G0":[1],"05GG":[16,30],"05H7":[3,22],"05HB":[4,7],"05HT":[0,8],"05HY":[0,1],"05JC":[1,10],"05JF":[0,3],"05K2":[0,8],"05KD":[1],"05KL":[0,1],"05KN":[0,4],"05L6":[3],"05LZ":[0,2],"05MJ":[0,7],"05N3":[0,1,69],"05N8":[0,2],"05NC":[0,3],"05NM":[1],"05NT":[0,1],"05P0":[3],"05P1":[0,2],"05PL":[2,8],"05Q5":[2],"05QK":[1],"05QT":[1],"05QU":[1],"05R6":[1],"05RA":[1,3],"05RG":[0,1],"05RH":[0,6],"05RT":[1],"05RZ":[0,2],"05S6":[2,9],"05SG":[0,1],"05SR":[1,5],"05SS":[0,1],"05SX":[0,2],"05SY":[1,5],"05T1":[1,3],"05T9":[0,2],"05TH":[0,2],"05TP":[2],"05TR":[0,0,50],"05U6":[0,2],"05UA":[0,1],"05VL":[0,2],"05VP":[0,1],"05W0":[1],"05WH":[0,4],"05WM":[1,2],"05WP":[0,6],"05XK":[2,2],"05Y2":[2],"05YM":[0,2],"05YW":[0,1],"060C":[1,1],"060H":[22,25],"060P":[0,1],"061H":[0,2],"061J":[28,103,71],"062G":[7,7],"063T":[1,1],"063Y":[4,5],"0640":[0,4],"064C":[0,2],"064Q":[0,3],"064R":[0,4],"064Z":[0,2],"065C":[1],"065F":[1],"065G":[0,2],"065K":[0,2],"065S":[0,15],"065W":[1,21],"0660":[0,2],"0663":[0,3],"066A":[5,26],"066W":[1],"067G":[4],"067S":[0,22],"067U":[1],"0683":[0,12],"068T":[0,1],"068V":[4,41],"0699":[1,4],"06AD":[0,0,40],"06AR":[0,3],"06AU":[143,589],"06B4":[0,5],"06BK":[2],"06BM":[0,1],"06C5":[1,3],"06CA":[0,5,30],"06CC":[3,8],"06D8":[0,5],"06DW":[0,1],"06E0":[3,16],"06E7":[0,1],"06E8":[1],"06EK":[0,2],"06ET":[0,2],"06EY":[0,3],"06FD":[3,33],"06FM":[0,2],"06FS":[0,6],"06FT":[0,3],"06FX":[0,4],"06FY":[1],"06GF":[2,1],"06GH":[0,2],"06GS":[0,7],"06GV":[1],"06GX":[1],"06HK":[3,1],"06IA":[0,11],"06IM":[0,2],"06J7":[0,1],"06JD":[1,2],"06JS":[0,3],"06KF":[0,1],"06LE":[1],"06LF":[0,4],"06LL":[0,1],"06MR":[0,1],"06MY":[0,3],"06PM":[1,5],"06Q1":[0,3],"06Q5":[66,107],"06QC":[4,4],"06QF":[1],"06QL":[0,3],"06QT":[2],"06QZ":[0,8],"06S2":[5,24],"06SR":[6,17],"06SS":[3],"06T3":[0,4],"06T4":[0,2],"06TP":[1],"06TR":[79,466,176],"06UF":[0,3],"06UP":[0,3],"06UQ":[0,2],"06V1":[0,0,253],"06VP":[2],"06W0":[1],"06W6":[0,1],"06W8":[3,10],"06WT":[2,4],"06WY":[16,49],"06X1":[1,20],"06X3":[0,1],"06X7":[0,3],"06XX":[0,4],"06YE":[0,2],"06YL":[66,488,88],"06Z7":[1,5],"06ZB":[0,2],"06ZI":[1],"06ZK":[0,3],"0701":[0,1],"070G":[10,13],"070S":[3,3],"070W":[0,2],"0710":[6,6],"0715":[3,6],"071D":[0,1],"071Y":[0,5],"0729":[1],"072Z":[5,8],"0731":[0,16],"073F":[0,4],"073G":[25,86],"073U":[0,4],"0741":[1],"0742":[3,2],"075U":[0,4],"076E":[0,7],"0772":[1],"0779":[3],"077E":[0,2],"077F":[0,4],"077N":[6,54],"077V":[1,1],"078J":[1],"078Z":[0,3],"0791":[0,3],"0792":[5,28],"0797":[1],"0799":[0,2],"079C":[0,2],"079F":[5],"079Z":[11,108,5],"07BA":[0,2],"07BE":[1],"07BX":[0,5],"07D0":[6],"07D7":[0,2],"07DI":[2],"07DL":[0,6],"07EA":[0,1],"07EB":[5,7],"07EU":[0,6],"07FI":[2,0,101],"07G9":[1],"07HJ":[0,2],"07HX":[0,3],"07I2":[0,1],"07IA":[0,2],"07JJ":[1],"07JP":[0,4],"07JR":[0,2],"07LC":[0,1],"07LG":[0,4],"07M9":[0,1],"07MF":[0,4],"07MH":[2,21],"07NI":[0,3],"07NY":[0,3],"07P3":[2,1],"07PR":[0,3],"07PS":[0,2],"07PW":[1],"07Q5":[1,2],"07QJ":[0,7],"07R0":[0,3],"07SJ":[0,2],"07SK":[1],"07TF":[0,4],"07U3":[0,1],"07W3":[3,11],"07WI":[0,5],"07WM":[2],"07WT":[2,2],"07WW":[0,5],"07WX":[1],"07X5":[1,2],"07X7":[1,2],"07XE":[1],"07XT":[2,15,9],"07Y4":[0,10],"07YB":[0,1],"07YQ":[2,0,41],"07ZA":[2],"07ZF":[14,20],"07ZH":[0,6],"07ZJ":[0,2],"07ZM":[0,5],"07ZP":[19,42],"07ZW":[2],"080C":[0,1],"080E":[0,13],"080L":[0,1],"080X":[0,2],"0818":[1,1],"0829":[0,1],"082J":[0,4],"0834":[1,1],"083T":[0,3],"084B":[2],"084G":[0,3],"084I":[2,36],"084Y":[0,4],"0855":[3],"085K":[0,4],"0867":[1],"086E":[0,20],"086H":[2,2],"086I":[1],"0873":[0,1],"087E":[0,2],"088A":[0,2],"088X":[92,454,366],"0898":[0,7],"089G":[109,141,33],"089J":[0,1],"089R":[2,3],"08AK":[1,2],"08BE":[0,8],"08BS":[0,0,88],"08BX":[1],"08C6":[1],"08C8":[3,19],"08CB":[8,21],"08CI":[0,1],"08CK":[0,16,5],"08CP":[0,7],"08CY":[1],"08D0":[0,2],"08D6":[1,7],"08D9":[2,29],"08DS":[0,11],"08F3":[0,8],"08FB":[0,3],"08FD":[1],"08FL":[1],"08FR":[0,8],"08FZ":[1,17],"08GB":[2],"08H4":[0,1],"08H8":[0,1],"08HI":[0,4],"08HU":[2],"08IP":[1],"08IW":[0,27],"08J8":[1],"08JP":[0,2],"08L9":[0,2],"08LH":[0,2],"08LQ":[0,7],"08LY":[46,64],"08NG":[0,3],"08PE":[0,2],"08PG":[14,58],"08PK":[1],"08PV":[0,14],"08Q1":[0,1],"08QS":[1,4],"08R5":[0,4],"08RA":[1,9],"08RC":[0,3],"08RH":[0,2],"08RR":[0,0,0,2],"08S1":[0,0,13],"08SM":[1,10],"08TD":[0,3],"08TM":[0,22],"08TZ":[1],"08UN":[0,2],"08UR":[0,4],"08UU":[1,4],"08UV":[66,226],"08VI":[1],"08W4":[6,6],"08X5":[0,2],"08Y8":[5,27,4],"08YV":[0,3],"08Z2":[0,1],"08ZL":[1],"0908":[0,1],"090A":[0,3],"090E":[1],"090F":[3],"090X":[1],"090Y":[0,4],"0915":[0,1],"091G":[5,37],"091W":[2],"0921":[36,61],"092M":[6,1],"092N":[1,3],"092W":[0,1],"093C":[0,4,51],"093M":[0,7],"094A":[2,18],"095U":[0,2],"096P":[2,1],"097Z":[1],"0996":[6,87],"0999":[34,180],"099G":[20,98],"099N":[117,242],"099Q":[2],"09AD":[1,5],"09AG":[0,1],"09GX":[1],"0AE6":[2],"0AE7":[2,5],"0AEL":[0,1],"0AEU":[3,2],"0AEX":[0,1],"0AF5":[2],"0AF8":[1],"0AFB":[197,500,84],"0AFS":[4],"0AFU":[0,2],"0AFZ":[11,20,84],"177A":[2],"194A":[4,23],"196A":[7,23],"1A12":[1],"224A":[130,216],"231A":[1],"236A":[1,2],"23AA":[1,42],"2497":[2],"262A":[0,1],"266A":[5,19],"267A":[3,98],"275A":[11,81],"283A":[0,2],"286A":[0,0,10],"28A6":[1,6],"28A7":[2,6],"28A9":[0,6],"297A":[1,6],"29A1":[0,2],"2A21":[8,16],"2A53":[1],"2A68":[1,23],"2A6A":[0,3],"2A72":[0,18],"3191":[2,2],"322A":[2,3],"333A":[1,5],"348A":[0,2],"34A3":[0,4],"351A":[1,3],"369A":[23,201,1],"36A5":[0,7],"378A":[1,6],"37A2":[0,7],"38A5":[46,409],"396A":[0,9],"3A19":[9,9],"3A28":[0,3],"3A51":[0,0,12],"3A62":[3,212],"3AA1":[0,1],"41A5":[0,2],"4218":[0,2],"4341":[3,5],"439A":[15,48],"43A2":[1,3],"44A2":[2,5],"44A6":[115,555],"44A7":[1,5],"44AA":[1],"459A":[1,4],"46A3":[7,31],"46A6":[0,13],"47A5":[3,3],"4A26":[0,2],"4A35":[2],"4A45":[1,9],"4A46":[1,3],"4A53":[9,244],"4A59":[0,4],"4A64":[1],"4A65":[0,12],"4A6A":[0,2],"4A74":[5,6],"4A7A":[1,4],"4A81":[1],"4A98":[1,1],"4A99":[1],"4A9A":[2,1],"4AA5":[0,4],"4AA8":[24,183],"4AAA":[0,1],"514A":[0,2],"515A":[2,26],"5351":[6],"536A":[0,1],"53A6":[0,2],"53AA":[4,46],"5418":[23,29],"542A":[2,4],"5483":[3,3],"5488":[3,5],"5491":[1,18],"5499":[1],"54A9":[1,10],"5519":[1],"5527":[0,2],"5546":[1],"5553":[2,30],"5555":[2,2],"5565":[47,217],"5566":[0,5],"5581":[0,3],"5583":[1],"5584":[2,13],"5591":[0,1],"5598":[1],"55A6":[26,117],"55A8":[0,3],"5623":[3,7],"5624":[0,5],"5642":[2,8],"5644":[0,1],"5664":[0,3],"5666":[0,2],"5679":[0,2],"5692":[0,4],"5698":[0,1],"571A":[1],"5741":[5],"5747":[0,1],"5756":[2],"5786":[0,2],"57A4":[0,1],"5818":[2],"588A":[0,5],"5932":[0,3],"8025":[2],"900":[161,3,11,2565],"9406":[0,2],"9560":[18,18],"9600":[5,11],"9617":[3],"9641":[6],"9644":[2,2],"9645":[12,3],"9654":[7,20],"9655":[17,2],"9656":[2],"9824":[0,0,0,1]}};
  const INT_CODE_NAMES = {"03BL":"SOARES CRUZ CORRETORA DE SEGUROS LTDA","04ZS":"GLOBAL OPSI ADMINISTRADORA E CORRETORA DE SEG","06GV":"REGINALDO FERREIRA AMORIM","0834":"IN COMPANY CORRETORA DE SEGUROS LTDA ME"};
  // {código: [nome da corretora no BI, cidade(s) separadas por |]} — só Jan–Mai e só códigos cujo
  // dono na Carteira (14) é um dos 15 executivos; alimenta a lista de corretoras dos meses
  // reconstruídos (mês com fechamento oficial usa o nome do próprio fechamento).
  const INT_CODE_INFO = {"0002":["COSTA LIMA CORRETORES DE SEGUROS S A","SAO PAULO"],"0003":["EQUIPE ADM E CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"000F":["SUENE LEANDRO DE SOUSA CARPANEZI CORRETAGEM D","SAO B. DO CAMPO"],"000K":["MARQUES CORRETORA DE SEGUROS E VIDA LTDA","SAO PAULO"],"000N":["RITACCO CORRETORA E CONSULTORIA DE SEGUROS LT","SAO PAULO"],"000S":["PASCHOAL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"000Y":["BRISK A E CORRETORA SEGUROS LTDA","SAO PAULO"],"0012":["FLORA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0019":["THRUMP CORRETORA DE SEGUROS LTDA","SAO PAULO"],"001I":["GRAFFING ADMINISTRACAO E CORRETAGEM DE SEGURO","SOROCABA"],"001U":["GOES MALAMAN ADM CORR SEGS LTDA","SAO PAULO"],"001Z":["CAMILLO A E CORRETORA SEGUROS LTDA","SAO PAULO"],"0024":["SBM ADMINISTRADORA E CORRETORA DE SEGUROS LTD","SAO PAULO"],"0026":["TECHPLAM CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"002H":["BENVENUTO CORRETORA DE SEGUROS","SAO PAULO"],"002N":["HELLNER CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"002Q":["LAR CORRETORA DE SEGUROS LTDA","SAO PAULO|SOROCABA"],"0037":["BRISI A E CORRETORA SEGUROS LTDA","SAO PAULO"],"0038":["VIDA SEGURA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"003H":["FLAVIO TORRES DE ALVARENGA CORRETORA DE SEGUR","SAO B. DO CAMPO"],"003M":["MASTERMED SAO PAULO CONSULTORIA E CORRETORA D","SAO PAULO"],"004Q":["ATM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0050":["WHISPER CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"0051":["PROMISSOR S A ADMINISTRACAO E CORRETAGEM DE S","SAO PAULO"],"005H":["VICENTINI ADMINISTRACAO CORRETAGEM SEGUR LTDA","SAO PAULO"],"005M":["ESTAR CORRETORA DE SEGUROS LTDA","SAO PAULO"],"006A":["ILHA CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"006J":["PARADELLA CORRETORA DE SEGUROS LTDA EPP","SAO PAULO"],"006L":["VOO LIVRE ADMINISTRADORA E CORRETORA DE SEGUR","SAO PAULO"],"006V":["TRIAL ADMINISTRADORA E CORRETORA DE SEGUROS S","SAO PAULO"],"006Z":["MYBRO CORRETORA DE SEGUROS E SAUDE LTDA","CAMPINAS|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SANTOS"],"0074":["3R4 CORRETORA DE SEGUROS LTDA","SAO PAULO"],"007M":["ALBANO ALVES CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"007Q":["MAFRA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"0081":["PORTINARIS CORRETORA DE SEGUROS SC LTDA","SAO PAULO"],"0083":["LEANZA E ASSOCIADOS CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"008L":["TIARGA CIA CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"008T":["FARO SEGUROS","SANTOS"],"008W":["OLIVEIRA E SILVA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0091":["REP LIFE CORRETORA DE SEGUROS LTDA","JUNDIAI|MOGI DAS CRUZES|SANTOS|SAO PAULO|SAO B. DO CAMPO"],"0093":["VIVAX CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0096":["2AS CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"0099":["LED CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"009F":["G2F CORRETORA LTDA","SAO PAULO"],"009H":["HEALTH CORP MASTER CORRETORA DE SEG E CONSULT","SAO B. DO CAMPO|SAO PAULO|SOROCABA|MOGI DAS CRUZES"],"009K":["SECURE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"009P":["SPLENDYDHA ADM CORRETORA SEGUROS LTDA ME","SAO PAULO"],"009T":["NAYFFE S CORRETAGEM DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"00AA":["PRO NEW CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00AB":["VILA UNIAO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00AD":["RHOLD CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"00AE":["HV ARBAITMAN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00AQ":["WLADEKA SENA CONSULTORIA E CORRETORA DE SEGUR","JUNDIAI"],"00B2":["JLP DUMAS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00B5":["TOPCARE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00B6":["LSA CORRETORA DE SEGUROS LTDA","SAO PAULO|CAMPINAS"],"00B9":["CONTRA RISCO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00BD":["MAZZA SERVICOS LTDA","SAO PAULO"],"00BJ":["CONTAGET CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"00BP":["VILAS BOAS CORRETORA DE SEGUROS LTDA","SOROCABA"],"00C4":["YOUPOP CORRETORA E ADMINISTRADORA DE SEGUROS","MOGI DAS CRUZES|SAO PAULO"],"00C5":["EPCS EDUARDO PRADO CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"00CJ":["MODENA ABC ASSESSORIA E CORRETORA DE SEGUROS","SAO B. DO CAMPO|SAO PAULO|JUNDIAI"],"00CR":["JBL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00CS":["","PACTO CORRETORA E APOIO A CORRETORAS DE SEGUR"],"00CV":["ELITE SEGUROS E CONSORCIOS LTDA","SAO PAULO"],"00D5":["NSRA GROUP CORRETORA DE SEGUROS E BENEFICIOS","SAO PAULO|MOGI DAS CRUZES"],"00D9":["HEAD INSURANCE CORRETORA DE SEGUROS LTDA EPP","SAO PAULO"],"00DA":["BENVENUTE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00DC":["PAULO BESSONI OLIVEIRA BARROSO","SAO B. DO CAMPO|SAO PAULO"],"00DM":["EDELCIO BREVES DOS SANTOS CIA LTDA","SAO B. DO CAMPO"],"00DU":["SCARAMEL LIFE ADMINISTRADORA E CORRETORA DE S","SAO B. DO CAMPO"],"00E1":["ROSSI CONSULTORIA EM SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"00E7":["ALINE GOIS CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"00E9":["ELLA CORRETORA E CONSULTORIA DE SEGUROS LTDA","SAO B. DO CAMPO"],"00ED":["AMANDA DINIZ CAMACHO CORRETOR DE SEGUROS","SAO PAULO"],"00EF":["ZERO ONZE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00EG":["INNOVAR CORRETORA DE PLANOS DE SAUDE LTDA","SAO B. DO CAMPO|SAO PAULO"],"00EH":["MAYK CRONEMBERGER FIDELIS COR DE SEGUROS LTDA","SAO PAULO"],"00EJ":["INTERLIGADOS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00ER":["GRP SEGUROS E SERVICOS TERCEIRIZADOS LTDA","SAO B. DO CAMPO"],"00EY":["JULISEG CORRETORA SEGUROS DE VIDA S S LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|CAMPINAS"],"00F1":["TSC CONSULTORIA EM SEGUROS LTDA","SAO PAULO"],"00FC":["S AIRES CONSULTORIA DE SEGUROS CORRETORA E CO","SAO PAULO"],"00FQ":["LP BUENO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00FT":["J SEG CORRETORADE SEGUROS LTDA","SAO PAULO"],"00GF":["START CONSULT CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00GK":["LUDASEG SEGUROS LTDA","SAO JOSE DOS CAMPOS|SAO PAULO|CAMPINAS|MOGI DAS CRUZES"],"00H2":["GLOBALSEG CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"00H6":["CAMARA PACHECO CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"00H8":["VILA VELHA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00HM":["CALCULE CONTRATE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00HP":["ALPHA RS CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"00HU":["PLANOS DE SAUDE KELLY LINA LIMITADA","SAO B. DO CAMPO|SAO PAULO"],"00HX":["PIACERE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00I5":["ONGUARD ASSESSORIA E CORRETORA DE SEGUROS LTD","SAO PAULO"],"00IM":["NOVA OPCAO ADMINISTRADORA E CORRETORA DE SEGU","SAO B. DO CAMPO"],"00J0":["G MAIOR ADMINISTRACAO E CORRETAGEM DE SEGUROS","SAO B. DO CAMPO"],"00J3":["REGENCY CORRETORA E ESTETICA LTDA","SAO PAULO"],"00JA":["MOURAO SEG CORRETORA DE SEGUROS E SAUDE LTDA","SAO PAULO"],"00JN":["MVM 10 PARTICIPACOES LTDA","MOGI DAS CRUZES|SAO PAULO"],"00JQ":["SGP CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00K2":["MAKESY CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00K3":["BEHOLD CORRETORA DE SEGUROS LTDA","JUNDIAI"],"00KA":["LETSEG CORRETORA DE SEGUROS E VIDA LTDA","SAO PAULO"],"00KE":["JSC CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"00KG":["CAMMINARE CONSULTORIA DE BENEFICIOS E CORRETO","SAO PAULO"],"00KI":["VIVA HEALTH CORRETORA DE SEGUROS LTDA","SAO PAULO|JUNDIAI"],"00L3":["IX8 PREMIUM CONSULTORIA E CORRETORA DE SEGURO","SAO B. DO CAMPO|SAO PAULO|JUNDIAI|SANTOS|CAMPINAS|MOGI DAS CRUZES|RIO DE JANEIRO|SOROCABA"],"00L4":["FLUIR CONSULTORIA EM BENEFICIOS LTDA","SAO PAULO|MOGI DAS CRUZES"],"00L7":["ASSISTENCIA ALTERNATIVA CORRETORA DE SEGUROS","SAO PAULO|SAO B. DO CAMPO"],"00LA":["PHOENIX SUL AMERICANA CORRETORA DE SEGUROS LT","SAO PAULO"],"00LG":["JIMENEZ ADM E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00LH":["ZALC CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00LK":["AURIS ADMINISTRADORA E CORRETORA DE SEG LTDA","SAO PAULO"],"00LS":["MARRAF ADMINISTRACAO E CORRETAGENS DE SEGUROS","MOGI DAS CRUZES"],"00LU":["MOSAICO ADMINISTRADORA E CORRETORA DE SEGUROS","SAO PAULO"],"00M4":["COPLANA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00MD":["LTS LIFE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00MS":["PR DELFIM CONSULTORIA LTDA","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|JUNDIAI|CAMPINAS"],"00N4":["IDEAL SEG CORRETORA DE MULTI SEGUROS LTDA","SAO PAULO"],"00NA":["OLIVERMED CORRETORA DE SEGUROS MARKETING SOCI","SAO PAULO|SAO B. DO CAMPO"],"00NG":["STAY HEALTHY CONSULTORIA E CORRETAGEM DE SEGU","SAO PAULO"],"00NZ":["MESQUITA SIQUEIRA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00P0":["ATLANTA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"00PB":["R N CORRETORA DE SEGUROS LTDA ME","MOGI DAS CRUZES"],"00PF":["AGUIA FENIX CORRETORA DE SEGUROS SS LTDA","SAO PAULO"],"00PG":["AGATA MAC CORRETORA DE SEGUROS LTDA EPP","SAO PAULO|RIO DE JANEIRO"],"00PM":["APOLO CORRETORA S S LTDA","SOROCABA"],"00PW":["IASA ADMINISTRACAO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00QF":["BLISS ASSESSORIA EM PLANO DE SAUDE LTDA","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"00QL":["RP CONSTANTINO ADMINISTRADORA E CORRETORA DE","SOROCABA"],"00QU":["B COR CONSULTORIA EM CORRETAGEM DE SEGUROS E","SANTOS"],"00R3":["CLICK CORRETORA LTDA","SAO PAULO"],"00R6":["CRIPE CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES"],"00R7":["YHWH CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00RN":["T5 CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00S4":["BRUNO SILVA CONS E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00SB":["TCA A E CORRETORA SEGUROS LTDA","SAO PAULO"],"00SE":["SECUR C N E CORRETAGEM SEGUROS LTDA","SAO PAULO"],"00SU":["ROSENI DOS ANJOS PEREIRA","SAO PAULO|SAO B. DO CAMPO"],"00SZ":["CORRETORES DO MILHAO CORRETORA DE SEGUROS E T","MOGI DAS CRUZES|SAO PAULO"],"00T9":["BOA SEGUROS E BENEFICIOS LTDA","SAO PAULO"],"00TI":["RUDDER SEGUROS LTDA","SAO PAULO"],"00TK":["MELHOR CORRETOR CONSULTORIA DE PLANOS DE SAUD","SAO PAULO"],"00TP":["ADDAX CORRETORA DE SEGUROS LTDA","AMERICANA"],"00UG":["DUAL CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00UY":["TANIA MORAES CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO"],"00VC":["R ANDRADE CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"00VF":["NOVA CASA DO CORRETOR CORRETORA DE SEGUROS E","CAMPINAS|MOGI DAS CRUZES|SANTOS|SAO B. DO CAMPO|SAO PAULO|JUNDIAI|RIO DE JANEIRO"],"00VL":["PARTNERS CONSULTORIA E CORRETAGEM DE SEGUROS","SAO PAULO"],"00VM":["FREEHEALTH CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"00VW":["DRIELLE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00W6":["R FONTEBASSI DOS SANTOS CORRETAGEM DE SEGUROS","SAO PAULO"],"00WD":["CERVANTES CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00WV":["LINKS CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"00WY":["RAMOS C E CORRETORA SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"00X4":["KATIA CORREA DA SILVA","MOGI DAS CRUZES|SAO PAULO"],"00X8":["LABADESE SEGUROS LTDA","SAO PAULO"],"00XD":["VENTURINI CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"00XQ":["B M CORRETORA DE PLANOS DE SAUDE LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"00XT":["INNOVACCI CORRETORA DE SEGUROS LTDA","JUNDIAI"],"00XW":["HEALTHINK GESTAO ESTRATEGICA E INTELIGENCIA D","JUNDIAI|SAO PAULO|CAMPINAS|RIO DE JANEIRO|AMERICANA|SAO B. DO CAMPO|SAO JOSE DOS CAMPOS|SOROCABA|SANTOS"],"00XX":["DINASTY CORRETORA DE SEGUROS UNIPESSOAL LTDA","CAMPINAS|MOGI DAS CRUZES|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|AMERICANA|RIO DE JANEIRO|JUNDIAI"],"00Y1":["LIFITSEG CONSULTORIA DE BENEFICIOS LTDA","JUNDIAI"],"00Y5":["HELP CONSULTORIA E CORRETAGEM DE SEGUROS LTDA","SAO PAULO|SOROCABA|SAO B. DO CAMPO"],"00Y6":["JOURNEY SOLUCOES EM SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"00YD":["NOA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00YE":["PGM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"00YT":["MULTFORM A MCONSULTORIA DE PLANOS DE SAUDE","MOGI DAS CRUZES|SAO PAULO|CAMPINAS"],"00Z0":["SYN CORRETORA DE SEGUROS E BENEFICIOS EIRELI","SAO PAULO"],"00Z2":["MVW ASSESSORIA E CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"00Z8":["GRIZZI CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"00ZK":["VENTURIN CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"00ZN":["SINCRA CORRETORA DE SEGUROS LTDA","SANTOS"],"00ZT":["LEVEL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"010P":["BENSEG CORRETORA DE PLANOS DE SAUDE LTDA","SAO PAULO|SAO B. DO CAMPO|MOGI DAS CRUZES"],"0112":["OLIVEIRA S CORRETORA SEGUROS EIRELI","SAO PAULO"],"011G":["PROXIMATI CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"011N":["RR BENEFICIOS E CORRETORA DE SEGUROS LTDA","SAO PAULO|JUNDIAI"],"011S":["SEIKO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"011Y":["VIVRE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0122":["CLEARWATER SEGUROS LTDA","AMERICANA|SAO B. DO CAMPO|SAO PAULO"],"0128":["LIBER CORRETORA DE SEGUROS LTDA","SAO PAULO|RIO DE JANEIRO|SAO JOSE DOS CAMPOS"],"012E":["YIA BROKER CORRETORA DE SEG MASSIFICADO LTDA","MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|SOROCABA|AMERICANA|SANTOS|CAMPINAS|JUNDIAI"],"012L":["ARTESEG CONSULTORIA E CORRETORA DE SEGUROS EI","SAO PAULO"],"0131":["C10 CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"0132":["DARIANO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0134":["EDUARDO RESINA FERNANDES","SAO PAULO"],"013H":["ANDRE RAIMUNDO BATISTA CORRETAGEM DE SEGUROS","SAO PAULO"],"013K":["R S CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"013X":["SPEAK BROKER CORRETORA LTDA","AMERICANA|RIO DE JANEIRO|SAO PAULO|CAMPINAS|MOGI DAS CRUZES|SAO B. DO CAMPO|JUNDIAI"],"0146":["SULAVITTA CORRETORA DE SEGUROS LTDA","SAO PAULO|SOROCABA"],"014I":["WISNER RONEY SILVA RODRIGUES","SAO PAULO"],"0150":["NSAFJ CORRETORA DE SEGUROS LTDA","SAO PAULO"],"015F":["A A DE CARVALHO GOES","MOGI DAS CRUZES"],"015H":["KLIFO CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"015I":["ROCHA & ROCHA BRASIL CORRETORA DE SEGURO LTDA","SAO PAULO"],"015L":["BARRA CONSULTORIA LTDA","SAO PAULO"],"015P":["SALUTAR INTERMEDIACAO DE PLANOS DE SAUDE LTDA","CAMPINAS|RIO DE JANEIRO|SAO PAULO|MOGI DAS CRUZES|SAO B. DO CAMPO|SOROCABA|JUNDIAI"],"016B":["PRIVITH CORRETORA DE SEGUROS LTDA","SAO PAULO"],"016D":["TAG CORRETORA CONSULTORIA MULTICAL SEG LTD","SAO PAULO"],"016F":["GUANDALINI A E C SEGUROS VIDA LTDA","SAO PAULO"],"016K":["ZOY CORRETORA DE SEGUROS E CAMBIO EIRELI","JUNDIAI|MOGI DAS CRUZES|SAO PAULO"],"016L":["CARUSO PARIS E MACEDO ASSESSORIA E CORRETORA","SAO B. DO CAMPO|SAO PAULO"],"0172":["MASTELL CORRETORA DE SEGUROS E SAUDE LTDA","SAO PAULO"],"0176":["SUR CORRETORA DE SEGUROS LTDA","SAO PAULO"],"017F":["GUERATO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"017M":["TD CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"018C":["GAP CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"018X":["BARDOT CONSULTORIA E CORRETORA DE SEGUROS LTD","SAO PAULO"],"0190":["PRIDE CONSULTORIA E CORRETAGEM LTDA","SAO PAULO|SAO B. DO CAMPO|CAMPINAS"],"019E":["AELCORR ADMINISTRADORA E CORRETORA DE SEGUROS","SAO PAULO"],"019H":["AG1000 CORRETORA DE SEGUROS E SERVICOS LTDA","RIO DE JANEIRO"],"019J":["PROVIDENCIA CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO|SAO B. DO CAMPO"],"019P":["L4 CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"01A5":["FENARRE CONSULTORIA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01A7":["UNIDOS MS4 CONS E CORRETAGEM SEG LTDA","SAO PAULO"],"01AC":["SUSSEGUE PRIME CORRETAGEM DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES"],"01BB":["JMV CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01BI":["HEALTH PLUS CORRETORA LTDA","MOGI DAS CRUZES|SAO PAULO|SANTOS|SAO B. DO CAMPO"],"01BL":["CLIMOM CORRETORA DE SEGUROS LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SANTOS"],"01BW":["JBB CORRETORA DE SEGUROS E SAUDE LTDA","SAO PAULO"],"01C8":["CRESPO E FARIAS CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"01CI":["EASYCARE CONSULTORIA E CORRETORA DE SEGUROS L","RIO DE JANEIRO"],"01CK":["MARIA LNDACY TORRES","SAO B. DO CAMPO|SAO PAULO"],"01CM":["SILMARA CALGERANI GONCALVES","SAO B. DO CAMPO"],"01CN":["BRUNA VIEIRA","SAO PAULO|MOGI DAS CRUZES|SAO B. DO CAMPO"],"01CX":["CLARIA AFFINITY CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"01DA":["NIPOSEG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01DC":["MICHELLE L M CORRETAGEM SEGUROS LTDA","SAO PAULO"],"01DK":["CURA SALUTE CORRETAGEM DE SEGUROS LTDA","CAMPINAS|SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|SOROCABA|JUNDIAI|RIO DE JANEIRO|SANTOS"],"01DQ":["ROBERTA MOREIRA WEY","SAO PAULO"],"01DY":["OFELI CORRETORA DE SEGUROS E BENEFICIOS LTDA","JUNDIAI|SAO PAULO"],"01E6":["LIDER SAUDE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01EG":["ESTAR MAIS CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"01EP":["FERRO E BORGES CORRETAGEM DE SEGUROS LTDA","CAMPINAS"],"01ET":["MB7 CORRETAGEM DE SEGUROS E PLANOS DE SAUDE P","SAO PAULO"],"01EV":["ITUACU SEGUROS DE VIDA SAUDE E BENS LTDA","SAO PAULO|MOGI DAS CRUZES"],"01F2":["CLIC CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"01F5":["A LINE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01FM":["OSEIAS FERREIRA DA SILVA CORRETORA DE SEGUROS","SAO PAULO"],"01G7":["MARISA CALGERANI","SAO PAULO|SAO B. DO CAMPO"],"01GI":["W QUALITY PROMOCOES E VENDAS DE PLANOS DE SAU","AMERICANA|CAMPINAS|MOGI DAS CRUZES|SAO PAULO|JUNDIAI"],"01GL":["8FS CORRETORA DE BENEFICIOS E SEGUROS LTDA","SAO PAULO"],"01GU":["MILAN CORREA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"01H0":["BP C SEGUROS E PLANOS SAUDE LTDA","SAO PAULO"],"01HZ":["J G DE L NETO CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"01IA":["ORBITA ADMINSTRADORA E CORRETORA DE SEGUROS L","SAO PAULO"],"01IH":["PATRO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01IL":["MOOV C E CORRETAGEM SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO|SAO B. DO CAMPO"],"01IW":["WE SAFE CORRETORA DE SEGUROS","SAO PAULO"],"01J0":["AQUI E SEGURO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01J4":["RISONALDO FERREIRA DOS PASSOS LTDA","SANTOS|SAO PAULO"],"01J8":["STEP CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"01JX":["CASSIA CILENE FELIX ARAUJO DE MELO","MOGI DAS CRUZES|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"01JY":["DIOGO DA M DOS SANTOS","SAO B. DO CAMPO|SAO PAULO"],"01KA":["PRESENCI IMOVEIS E SEGUROS LTDA","SAO PAULO"],"01KB":["C P LAGO CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"01KJ":["EDUARDO BARALDI","SAO PAULO"],"01KT":["CARLA B C PLANOS SAUDE E BENEFICIOS LTDA","AMERICANA"],"01KZ":["MILLENNIUM CORRETORA DE SEGUROS LTDA","CAMPINAS|SAO PAULO"],"01LC":["PIPELINE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01M5":["JB CORRETORA E ADMINISTRADORA DE SEGUROS LTDA","RIO DE JANEIRO"],"01MH":["MADRIH CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01N2":["VIVIANE MORAIS CORRETORA SEGUROS CONSULT DE B","SAO PAULO"],"01N6":["ROSINEIDE BARROSO","SAO B. DO CAMPO"],"01ND":["SAFE PLAN CORRETORA DE SEGUROS E PLANOS DE SA","SAO PAULO"],"01NH":["FLAVIA MARA TREVISOLI","SAO PAULO"],"01NT":["ELIZANDRA APARECIDA CELESTINO CORRETORA DE SE","SAO B. DO CAMPO"],"01P1":["CANDIDA AURELIA FERNANDEZ DE AGUIAR","SAO B. DO CAMPO"],"01P4":["JAC LZ CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01P5":["FIRST SOLUTION CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"01PC":["JH SEGUROS E PRESTACAO DE SERVICOS LTDA","SAO PAULO"],"01PJ":["MONICA SIMONE DA SILVA","SAO B. DO CAMPO|SAO PAULO"],"01PL":["LUMINUS A E C S E PLANOS SAUDE LTDA","SAO PAULO|SAO B. DO CAMPO|SANTOS"],"01PV":["LMB C S S EMPRESARIA UNIPESSOAL LIMITADA","SAO PAULO|RIO DE JANEIRO"],"01Q6":["BAER CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"01Q8":["KEEP THE FUTURE CONSULTORIA PLANEJAMENTO E SO","SAO B. DO CAMPO|RIO DE JANEIRO|SAO PAULO"],"01QM":["ROCHA E ROCHA CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"01QX":["PORTAL DO SEGURO LTDA","SAO PAULO"],"01QY":["REIPAV CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"01R0":["ANITA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01R9":["TRILHAR CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"01RD":["CAPITAL INTELIGENCIA FINANCEIRA CORRETORA","RIO DE JANEIRO"],"01RK":["EB CONSULTORIA E ADMINISTRADORA DE BENEFICIOS","SAO B. DO CAMPO"],"01RP":["GMSEG CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"01RU":["VANESSA SOUSA PEREIRA","SAO PAULO"],"01SA":["REALIZA CORRETORA DE SAUDE E SEGUROS LTDA","SAO PAULO"],"01SC":["JESIEL CERQUEIRA LUIZ","MOGI DAS CRUZES"],"01SK":["CORREA CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO|SAO PAULO"],"01SS":["HAP CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01SY":["ICORRETORA DE SEGUROS LTDA","SAO PAULO|JUNDIAI|MOGI DAS CRUZES"],"01T4":["R P PAIVA CORRETAGEM DE SEGUROS DE VIDA","SAO B. DO CAMPO"],"01TC":["GOODLINK SEGUROS E BENEFICIOS CONSULT E CORRE","SAO PAULO"],"01TT":["HEALTH & CARE CORRETORA DE SEGUROS LTDA.","SAO PAULO"],"01TV":["FS INSURANCE LTDA","SAO PAULO"],"01TZ":["ARCANJO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"01U8":["INVISTA E V C S E P PRIVADA EIRELI","RIO DE JANEIRO"],"01U9":["PIRES CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01UA":["AC G C SEGUROS E PLANOS SAUDE LTDA","SAO PAULO"],"01UH":["LEANDRO M C CORRETAGEM SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO|RIO DE JANEIRO"],"01UM":["AZUKI SEGUROS E INVESTIMENTOS LTDA","SAO B. DO CAMPO"],"01UN":["LK BROKERS CORRETORA E CONSULTORIA EM SEGUROS LTDA","SAO PAULO"],"01UT":["FUTURE CORRETORA E ADMINISTRADORA DE SEGUROS","SAO PAULO"],"01UU":["VJ CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01V1":["BORGES CORRETAGEM DE SEGUROS E NEGOCIOS LTDA","RIO DE JANEIRO"],"01V8":["NF CORRETORA DE SEGUROS MOCOCA LTDA","CAMPINAS|MOGI DAS CRUZES|SAO PAULO|AMERICANA|JUNDIAI|RIO DE JANEIRO|SANTOS|SOROCABA"],"01VX":["SKY CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01W2":["C.DIGITAL CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"01WC":["VIA ALLIANCE CORRETORA DE SEGUROS LTDA","JUNDIAI"],"01WZ":["ALEXANDRE ROQUETTI ASSESSORIA EIRELI","SAO PAULO"],"01X0":["ELITE ASSESSORIA E CORRETAGEM DE SEGUROS EIRE","SAO PAULO"],"01XG":["HADERA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01XM":["GFC REAL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01XN":["ONORE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"01XQ":["SRE CORRETORA DE SEGUROS E PLANOS DE SAUDE LT","MOGI DAS CRUZES"],"01XU":["CONAFER CONSULTORIA E CORRETORA DE SEGUROS LT","SAO PAULO"],"01XW":["MW SERVICOS E ASSESORIA LTDA","SAO B. DO CAMPO|SAO PAULO"],"01XX":["JV CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"01XZ":["MA CORRETORA DE PLANOS DE SAUDE EIRELI","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"01YD":["SUA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"01YI":["VIRTUS CORRETORA DE SEGUROS LTDA","SAO PAULO|CAMPINAS|SANTOS|AMERICANA"],"01YU":["FREGA FOOD INTERMEDIACAO LTDA","RIO DE JANEIRO|SAO PAULO|CAMPINAS"],"01Z3":["BTO CORRETORA EM PLANOS DE SAUDE E NEGOCIOS L","RIO DE JANEIRO|SAO PAULO|MOGI DAS CRUZES|SAO B. DO CAMPO"],"01ZH":["SILVANA LIMA CORRETORA DE SEGUROS LTDA","SAO PAULO|JUNDIAI"],"01ZJ":["WONDER C SEGUROS E CONSORCIOS LTDA","SAO PAULO"],"01ZK":["ALIANCA HEALTH CARE GESTAO E CONSULTORIA LTDA","SAO PAULO"],"01ZL":["ZIRPOLI CORRETORA SEGUROS LTDA","SOROCABA"],"01ZS":["INSURANCE P CORRETORA SEGUROS LTDA","SAO PAULO"],"01ZT":["NEUZA MAGALHAES LERIA","SAO PAULO|JUNDIAI"],"01ZU":["YOU CARE CONSULTORIA LTDA","SAO PAULO|SAO B. DO CAMPO"],"0204":["INTELI BRASIL CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"020M":["MR CONSULTORIA E SEGUROS LTDA","SAO PAULO"],"0213":["","CORPORE CORRETORA DE BENEFICIOS PLANOS DE SAU"],"021C":["LM GUIMARAES CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"021E":["CONTABILIZEI CORRETORA DE SEGUROS LTDA","CAMPINAS|MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO JOSE DOS CAMPOS|SAO PAULO|SANTOS|SOROCABA|JUNDIAI|AMERICANA"],"0222":["JG ADM E CORRETORA DE SEGUROS LTDA","SANTOS"],"022H":["REVIEW CORRETORA DE SEGUROS LTDA","JUNDIAI"],"022K":["PLANQUALY CORRETORA DE SEGUROS LTDA","SAO PAULO"],"022Q":["ESSENCIAL ONE CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"022T":["MEGA INTERNATIONAL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"023A":["AS SOUSA CORRETORA","SAO PAULO"],"023T":["VIVIANE CRISTINA DE SOUZA ZANATTA","CAMPINAS"],"023Y":["SUPERSEG CORRETORA DE SEGUROS SOCIEDADE UNIPE","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA|RIO DE JANEIRO|SANTOS"],"0241":["LINDA SRC SERVICOS DE PLANOS DE SAUDE LTDA","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"0244":["MEU CORRETOR CONSULTORIA DE SEGUROS LTDA","JUNDIAI|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO"],"024D":["TRI STAR CONSULTORIA E CORRETAGEM DE SEGUROS","MOGI DAS CRUZES"],"024I":["GARCIA DIEGO CORRETORA DE SEGUROS LTDA","CAMPINAS|MOGI DAS CRUZES|SANTOS|SAO PAULO|SAO B. DO CAMPO|JUNDIAI|SOROCABA"],"024M":["ROCHA SEGUROS E CONSULTORIA LTDA","SAO PAULO|MOGI DAS CRUZES|SOROCABA|SAO B. DO CAMPO"],"024S":["BEST CONSULTORIA EM BENEFICIOS LTDA","RIO DE JANEIRO"],"024T":["SP CORRETORA E ADMINISTRADORA DE SEGUROS LTDA","SAO PAULO"],"0251":["ADRIANA LOPES ADMINISTRACAO E CORRETAGEM DE S","SAO PAULO"],"0253":["PROTECT SEG CORRETORA DE SEGUROS LTDA","CAMPINAS|JUNDIAI|SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|RIO DE JANEIRO|SOROCABA"],"025B":["TRI SAUDE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"025E":["JP URIAS CORRETORA DE SEGUROS E VIDA LTDA","SAO PAULO"],"025K":["VITALY CORRETORA E CONSULTORIA EM SEGUROS LTD","SAO PAULO"],"0262":["VIDA360 CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"026G":["HELEN ROSANGELA FERREIRA CORRETAGEM DE SEGURO","SAO PAULO"],"026K":["ALESSANDRA PATRICIA DO NASCIMENTO 28126906820","CAMPINAS"],"0276":["S LOBEU CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO"],"027A":["ANA C A REGES CORRETAGEM SEGUROS LTDA","SAO PAULO"],"027E":["A H DE SOUZA SEGUROS","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|RIO DE JANEIRO|CAMPINAS|SANTOS"],"0281":["ZANUSSI BRASIL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0285":["WAKAMOTO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0288":["PJR ASSESSORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"028C":["TUON CORRETORA DE SEGUROS LTDA","SAO PAULO"],"028K":["MUNDIAL CORRETORA DE PLANOS DE SAUDE LTDA","JUNDIAI"],"028W":["BELOVED CORRETORA DE SEGUROS E ADMINISTRADORA","SOROCABA"],"028X":["PLATAFORMA V S C SEGUROS EIRELI","MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|CAMPINAS|SOROCABA"],"028Z":["FABIO HEINZE SILVA CORRETAGEM DE SEGUROS LTDA","RIO DE JANEIRO"],"0290":["BLADYS C E C S SOCIEADE UNIPESSOAL LTDA","SAO PAULO"],"0294":["T GOMES LEITE SEGUROS","JUNDIAI|SAO PAULO"],"029D":["FOCCO JRF CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"029G":["B SAFE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"029M":["QSEG CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"029T":["ABENER FERNANDES JUNIOR CORRETAGEM DE SEGUROS","SAO PAULO"],"029Y":["MS ADMINISTRACAO E CORRETORA DE SEGUROS LTDA","SAO PAULO|AMERICANA"],"02A6":["VINICIUS M TAMURA CORRETORA SEGUROS LTDA","MOGI DAS CRUZES"],"02AN":["IX8 CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02B0":["G5 REIS CORRETORA DE SEGUROS LTDA","SANTOS|SAO B. DO CAMPO|SAO PAULO|JUNDIAI"],"02B5":["SOUSA PINHO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02BH":["NEW FOCCO PAVEL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02BQ":["CAPELLANI CONSULTORIA E CORRETORA DE SEGUROS","SAO PAULO"],"02BU":["RAMED 4YOU CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|JUNDIAI|SOROCABA"],"02C0":["RODRIGO LOPES VIEIRA CORRETOR DE SEGUROS","SAO PAULO"],"02C6":["G GUERREIRO CORRETORA DE SEGUROS","RIO DE JANEIRO"],"02CP":["P.R. NEVES RIBEIRO CORRETORA DE SEGUROS LTDA","SAO PAULO|SOROCABA"],"02CQ":["NEW PASSION CORRETORA DE SEGUROS E BENEFICIOS","SAO PAULO"],"02DP":["MATIZ ADMINISTRADORA E CORRETORA DE SEGUROS L","MOGI DAS CRUZES"],"02DR":["PROTECAO MAXIMA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02DX":["VERTEMATTI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02DY":["SCHIESARI LAU CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02EI":["FEREVI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02EN":["ESPACO SEGURO CORRETORA DE SEGUROS EIRELI ME","SAO PAULO"],"02EQ":["ML3 CONSULTORIA E CORRETAGEM DE SEGUROS LIMIT","SAO PAULO"],"02EU":["NAFEN ADMINISTRADORA E CORRETORA DE SEGUROS L","MOGI DAS CRUZES"],"02EV":["ROTA SEG REPRESENTACOES LTDA","SAO PAULO"],"02F9":["PLANEJASEG CORRETORA E ADMINISTRADORA DE SEGU","SAO PAULO"],"02FD":["R CAMARA CONSULTORIA E CORRETORA DE SEGUROS D","SAO PAULO|SOROCABA"],"02FS":["IMPACTARE CONSULTORIA E CORRETAGEM SEGUROS","SAO PAULO"],"02FU":["RTB CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"02G0":["PRODUCTIONS CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"02G6":["DUAS ETAPAS CORRETORA DE SEGUROS E REPRESENTA","SAO B. DO CAMPO|SANTOS"],"02G7":["SOROSEG CORRETORA DE SEGUROS E ADMINISTRADORA","SOROCABA"],"02GL":["ORIX ASSESSORIA E CORRETORA DE SEGUROS LTDA M","SAO PAULO"],"02GR":["SAVINI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02GW":["R S CORRETORA SEGUROS E BENEFICIOS LTDA","CAMPINAS|SAO PAULO|MOGI DAS CRUZES|SAO B. DO CAMPO|SOROCABA"],"02H1":["SILAX CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02HH":["ALBUMY CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02HJ":["ISOCON SERVICOS PATRIMONIAIS E CORRETORA DE S","SAO PAULO"],"02HM":["FERNANDO PRATES CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02HN":["VISUAL LINE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02HR":["MFCI I UNION CORRETORA SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"02IC":["HAPPY L C E CONSULTORIA SEGUROS LTDA","SOROCABA"],"02IU":["FUKIMOTO CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02JH":["MONINF A E CORRETORA SEGUROS LTDA","SAO PAULO"],"02JS":["LIVRE CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02KL":["QUEM CORRETORA DE SEGUROS E SERVICOS LTDA","SAO PAULO"],"02KQ":["MINAGRO CORRETORA DE SEGUROS LTDA ME","SOROCABA"],"02KR":["SUMMIT CHASE CONSULTORIA E CORRETORA DE SEGUR","SAO PAULO"],"02LD":["TONUS ROCHA CORR SEGURIOS VIDA LTDAME","RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|CAMPINAS"],"02LF":["NODA GOMES RIBEIRO CORRETORA DE SEGUROS DE VI","MOGI DAS CRUZES|SAO PAULO"],"02LL":["ANDICOR CORRETORA DE SEGUROS E ADMINITRADORA","SAO B. DO CAMPO"],"02LQ":["GS MONARI CORRETORA E ADM DE SEGUROS LTDA","SOROCABA"],"02LW":["D P WHITE REPRES E SERV LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|AMERICANA"],"02M2":["AGICOM CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"02M7":["BY PASS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02MA":["GROUP VITTA SEGUROS LTDA","SAO PAULO"],"02MY":["M E DOS SANTOS REPRESENTACAO","CAMPINAS"],"02NE":["FN CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"02NI":["CAMILAS CAACORRETORA DESEGUROS LTDA ME","SAO PAULO"],"02NQ":["YASHAYA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02NY":["FAVACOR CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02P9":["TEBIS CORRETORA DE SEGUROS EIRELI EPP","SAO PAULO"],"02PM":["ULISSES SILVANA ADMC E CORG DE SEG LTDA","SAO PAULO"],"02PP":["WILMERS CONSULTORIA GERENC E C DE S VIDA LTDA","SAO PAULO"],"02PU":["MAURICIO MANOEL DA SILVA","SAO PAULO|JUNDIAI"],"02Q1":["RHEA CORRETORA DE SEGUROS E ASSESSORIA FINANC","SAO PAULO"],"02Q4":["COSFER ADM E CORRETORA DE SEGUROS LTDA","JUNDIAI"],"02R2":["TAIGA CORRETORA DE SEGUROS LTDA EPP","SAO PAULO"],"02S1":["CENTERCOR ADMINISTRADORA E CORRETORA DE","SAO PAULO"],"02S4":["D J ATLANTIS CORRETORA DE SEGUROS DE VIDA LTD","SAO PAULO|SAO B. DO CAMPO|MOGI DAS CRUZES|SOROCABA"],"02S6":["AMPLIUS BANDEIRANTE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02SE":["DAUBER CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO"],"02ST":["CEDO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02T3":["HBR CORRETORA DE SEGUROS E ADMINISTRADORA LTD","SAO PAULO"],"02T6":["C S A M INTERMEDIACOES LTDA","JUNDIAI|MOGI DAS CRUZES|SAO PAULO|SANTOS|SAO B. DO CAMPO"],"02U2":["A.F.U. ASSEKURANZ CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"02U8":["DSV CONSULTORIA CORRETORA DE SEGUROS S S LTDA","SAO B. DO CAMPO"],"02UB":["UNIKX CORRETORA DE SEGUROS SS LTDA","SAO PAULO"],"02UG":["AF ASSUMPCAO FREIRE ASSESSORIA E CORRETAGEM D","SAO PAULO"],"02UL":["TRACO SETE CORRETORA DE SEGUROS SS LTDA","SAO PAULO"],"02UM":["WTG CORRETORA DE SEGUROS EIRELI","SAO PAULO|SOROCABA"],"02VG":["P S SAO PAULO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"02VP":["ASPEN ADMINISTRADORA E CORRETORA DE SEGUROS S","SAO B. DO CAMPO|SAO PAULO"],"02XE":["NBSEGUROS ADMINISTRACAO E CORRETAGEM DE SEGUR","MOGI DAS CRUZES"],"02XF":["MARVILI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02XG":["YOSHIE MAIA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02XT":["ASSEVERAR CORRETORA E ADMINISTRADORA DE SEGUR","MOGI DAS CRUZES"],"02Y1":["DEDS TUDEL CORRETAGEM E CONSULTORIA DE SEG LT","SAO B. DO CAMPO"],"02YD":["CONSULT MENDONCA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"02Z3":["FLORO DE MELO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"02Z5":["J GRIMBERG CORRETORA DE SEGUROS DEVIDA SC LTD","SAO PAULO"],"02ZA":["OS NAVEGANTES CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"0305":["CASA VERDERAMO ASSESSORIA E CORRETORA DE SEGU","SAO PAULO"],"030S":["JRIBEIRO ADM E COR DE SEG SEG SAUDE VIDA E PR","JUNDIAI|SAO PAULO"],"030U":["FBN A E CORRETORA SEGUROS SS LTDA","SAO B. DO CAMPO|SAO PAULO"],"0316":["LOJACORR S A REDE DE CORRETORAS DE SEGUROS","SAO PAULO"],"031A":["RAPINI CORRETORA DE SEGUROS DE VIDA SC LTDA","SAO PAULO"],"031D":["CAMOSSATO CORRETORA DE SEGUROS LTDA ME","MOGI DAS CRUZES"],"031M":["LGM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"031V":["HIPOTENUSA CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO"],"0322":["NBA ASSESSORIA DE NEGOCIOS DE SAUDE LTDA","SAO B. DO CAMPO|SAO PAULO"],"0326":["UNIAO INTERMEDIACAO E CORRETAGEM DE SEGUROS L","SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"0327":["BONINI FREZZATO CORRETORA DE SEGURO DE VIDA L","SAO PAULO|SAO B. DO CAMPO"],"032K":["STARVISA CORRETORA DE SEGUROS SS LTDA","SAO PAULO"],"032Y":["CKAB O C E R E C SEGUROS VIDA LTD","SAO PAULO"],"033H":["V A MOREIRA SERVICOS","SAO PAULO"],"033K":["CALI CORRETORA DE SEGUROS SS LTDA","SAO B. DO CAMPO"],"0342":["NIGRELLI C E CORRETORA SEGUROS LTDA","RIO DE JANEIRO"],"034R":["C B TOLEDO E PAINEIRAS CORRETORA DE SEGU","SAO PAULO"],"035C":["LAINE C SEGUROS E INFORMATICA LTDA","SAO PAULO"],"035H":["A QUALITY CORRETORA DE SEGUROS E BENEFICIOS L","SAO PAULO"],"035M":["MAXI DAN CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO"],"035Y":["SENFREY CORRETORA DE SEGUROS LTDA ME","SAO PAULO|SOROCABA"],"0365":["VIRTUSEG ADMINISTRADORA E CORRETORA DE SEGURO","SAO PAULO|SAO B. DO CAMPO"],"036K":["BUSCARINI NEGOCIOS LTDA ME","SAO PAULO"],"036S":["ELLO CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"036Y":["CANADA C A E CORRETORA SEGUROS LTDA","SAO B. DO CAMPO"],"0374":["QUALI PLANOS DE SAUDE E SERVICOS EMPRESARIAIS","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SAO JOSE DOS CAMPOS"],"037A":["GUITTA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0381":["M6 CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"038D":["INTER ATLANTICA CORRETORA DE SEGUROS SS LTDA","JUNDIAI"],"0397":["DRL DO BRASIL CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"039I":["CAMPOS CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"03A8":["MELIUS CONSULT E CORRETORA DE SEGUROS","MOGI DAS CRUZES|SAO PAULO"],"03AI":["AMBROSEG ADMINISTRADORA E CORRETORA DE SEGURO","SAO PAULO|SAO B. DO CAMPO"],"03AJ":["BRASCOR BRASILEIRA CORRETORA DE SEGUROS SS LT","SAO PAULO"],"03AX":["M V F REPRESENTACES LTDA","SAO B. DO CAMPO"],"03BN":["EMERSON CAPAZ AVRAHAM YISRAEL CONSULTORI","SAO PAULO"],"03CF":["S.L.F. ASSESSORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03CS":["MASTER S CORRETORA SEGUROS EIRELI","MOGI DAS CRUZES"],"03DL":["DEL NUNES CONSULTORIA E CORRETORA DE SEGUROS","SAO PAULO"],"03DT":["NETTPLAN CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"03DU":["ACM CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"03DV":["DONDA CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO JOSE DOS CAMPOS"],"03E0":["SANTOS E MENDONCA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03EG":["FORMATTO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"03FC":["TSREPRESENTACAO EIRELI","AMERICANA"],"03FY":["ESTRE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03GF":["ARENA CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"03GM":["SAMANO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03GW":["NEW ZARC CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03H0":["TN A SOCIALE CORRETORA SEGUROS VIDA LTDA","SAO PAULO"],"03H8":["REPUBLICA ADM CORRET E ASSESSORIA DE SEG LTDA","MOGI DAS CRUZES|SAO PAULO"],"03HL":["JBSILVA ALCANTARA CORRETORA DE SEGUROS DE VID","SAO PAULO"],"03HW":["ALLENT CORRETORA DE SEGUROS E ADMINISTRADORA","SAO B. DO CAMPO"],"03HY":["VAN HELDEN CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SANTOS|CAMPINAS|RIO DE JANEIRO"],"03II":["CARPE DIEM INSURANCE CORRETORA DE SEGUROS LTD","SAO PAULO"],"03J9":["CJWS CORRETORA DE SEGUROS LTDA","JUNDIAI|SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|CAMPINAS|SOROCABA"],"03JK":["NAKAMURA CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"03K8":["ARSUFFI CORRETORA DE SEGUROS S/S LTDA","SAO B. DO CAMPO|SAO PAULO"],"03KK":["PONTO EM COMUM CORRETORA DE SEGUROS E BENEFIC","SAO PAULO"],"03L7":["CARRADO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03LH":["HOKKEN ALP ASSESSORIA E CORRETAGEM DE SEGUROS","SAO B. DO CAMPO"],"03LI":["AQUARIUM CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"03LR":["CARFLEX ADM E CORRETORA DE SEGUROS SS LTDA EP","SAO PAULO"],"03N1":["BRASIL VIDA CORRETORA DE SEGUROS DE VIDA LTDA","SAO B. DO CAMPO"],"03NF":["WISKINAO CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"03NJ":["SUZI CRISTINA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"03NW":["SJCHAMER CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03PG":["SEGUREMAIS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03PP":["COSTA VALENTE BLUE CONSULTORI CORRET SEG LTDA","SAO PAULO"],"03Q5":["COLINAS M CORRETORA SEGUROS SS LTDA","SAO PAULO"],"03QF":["TRIASEG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03QI":["VENERANDO C CORRETORA SEGUROS SC LTDA","SAO PAULO"],"03QY":["EXCELLENCY C E A SEGUROS LTDA","SAO PAULO"],"03QZ":["ROMAGIO CORRETORA DE SEGUROS SS LTDA","SAO PAULO"],"03RB":["COMETA H C E ADMINISTRADORA SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"03RF":["FSG C SEGUROS E INVESTIMENTOS LTDA","SAO PAULO"],"03RG":["RGL CORRETORA DE SEGUROS SOCIEDADE SIMPLES LIMITADA","SAO PAULO"],"03RP":["ROBERTO ROTTA ADM E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03RR":["ERG L C S V E CONSULTORIA EM PLANOS SA","SAO B. DO CAMPO|SAO PAULO"],"03SA":["MARCLAN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03SI":["AKIUM ASSESSORIA E CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"03SW":["PERFEICAO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03SX":["LEAL DE ANDRADE CORRETORA DE SEGUROS DE VIDA","SAO PAULO"],"03TP":["WORLD BUSINESS SOLUTIONS BRASIL CONSULT","SAO PAULO|SAO B. DO CAMPO"],"03TY":["QUIRON ADMINISTRADORA E CORRETORA DE SEGUROS","SAO PAULO"],"03U1":["SERGIO MATHEUS CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"03U4":["YAMANDU FIGUEROA MILAN","SAO PAULO"],"03UG":["PONTO CORRETORA DE SEGUROS LTDA","SAO PAULO|SOROCABA"],"03V3":["R L B CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03VC":["FARAH E ASSOCIADOS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03W8":["MARCIO ROBERTO SANTOS DA SILVA","SANTOS|JUNDIAI"],"03WB":["HEALTH CORP SOLUCOES EM SEGUROS E REPRES","SAO B. DO CAMPO"],"03WG":["KLEIN ALMEIDA ADM DE SEGUROS","SAO PAULO"],"03WM":["MBR BAUDUIN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03X3":["ARIEL CORRETORA DE SEGUROS LTDA","SOROCABA|SAO PAULO"],"03XV":["ACORSEG ANDREO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03YI":["FTTSEG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"03YN":["CONVENIO CERTO CORRETORA DE SEGUROS LTDA","SAO PAULO|JUNDIAI"],"03YR":["MJC CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"03YT":["ZZOPPA CONSULTORIA ADMINISTRACAO E CORRETORA","SAO PAULO"],"03Z8":["ANDRE LUIZ CISI","SAO PAULO|CAMPINAS"],"03ZC":["RPA C E CORRETAGEM SEGUROS LTDA","SAO PAULO"],"03ZJ":["ROCHA CARVALHO ADM CORRETORA SEGUROS LTDA","SAO PAULO"],"03ZU":["S M R M CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0400":["REAL PLAN CORRETORA E ADM DE SEG LTDA ME","SAO PAULO"],"040B":["ESPECIALISTA CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"040X":["PROMASP SARTORI ADM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0415":["PERUZZOS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"041J":["FJE CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"041Q":["TRX ASSESSORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0428":["COMPAGNO A E CORRETAGEM SEGUROS LTD","SAO PAULO"],"042M":["ALH CONSULTORIA E CORRETORA EM PLANOS DE SAUD","SAO PAULO"],"0435":["NUMERO 1 CORRETORA DE SEGUROS EIRELI ME","SAO B. DO CAMPO"],"043H":["CANTAROS ADMINISTRADORA E CORRETORA DE SEGURO","SAO B. DO CAMPO"],"0440":["FELIX HEALTH CORRETORA DE SEGUROS LTDA ME","SAO PAULO|MOGI DAS CRUZES"],"0442":["AV AMARAL DE SOUZA ARAUJO ASSESSORIA","MOGI DAS CRUZES|SAO B. DO CAMPO"],"0445":["CORPORATE HEALTH CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0448":["RR FENIX CORRETORA DE SEGUROS DE VIDA LTDA ME","CAMPINAS"],"044H":["MELHOR COM SAUDE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"044L":["COTESEGURO CORRETORA DE SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES"],"044N":["KARISMA CORRETORA DE SEGUROS E REPRESENTACAOC","JUNDIAI|SAO PAULO"],"044Q":["GROVO ASSESSORIA SAUDE LTDA","SAO PAULO"],"044S":["FRANCO CORRETORA DE SEGUROS LTDA ME","SAO PAULO|SAO B. DO CAMPO"],"044U":["MOLISANI CONSORCIO E SEGUROS LTDA","SAO PAULO"],"044W":["REALIZE SEG CONSULTORIA E CORRETORA DE SEG LT","SAO PAULO"],"044X":["ABBF CORRETORA DE SEGUROS E BENEFICIOS LTDA","SOROCABA"],"0459":["VITTA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"045K":["SHADDAI PROVENTUS CORRETORA DE SEGUROS LTDA","SANTOS|SAO PAULO|SAO B. DO CAMPO"],"0461":["BOUFARES A E CORRETORA SEGUROS LTDA","SAO PAULO"],"0463":["WS TOLARDO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"046F":["TVF CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"046H":["FDIAS CORRETORA DE SEGUROS EIRELI ME","SAO B. DO CAMPO|SAO PAULO|RIO DE JANEIRO"],"046K":["MAXIMUS SEGUROS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"046Z":["FIQUE BEM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0473":["DOMINGUES MARCONDES CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"047F":["SAUDE PREMIUM INTERMEDIACOES DE SERVICOS LTDA","SAO PAULO"],"047X":["SHIN L C S E APOIO ADMINISTRATIVO LTDA","SAO PAULO"],"0486":["A2R SERVICOS E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0489":["GONSALEZ CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"048F":["ALENCAR E ASSUNCAO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"048L":["FSANTOS CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"048T":["SA ASSESSORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"048X":["DIPLAN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0490":["CASSIUS F MOCARZEL CORRETORA E ASSESSORIA DE","MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|CAMPINAS|SOROCABA|JUNDIAI"],"0491":["THIAGO L OMENA COM COSMETICOS ME","SAO PAULO|SAO B. DO CAMPO|JUNDIAI"],"049Q":["ROLNIC CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"049V":["SILVIA CRISTINA ESPERIDIAO","SAO PAULO|SAO B. DO CAMPO"],"049Y":["TMS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04A7":["RENOVA CORRETORA DE SEGUROS EIRELI","SAO PAULO|RIO DE JANEIRO"],"04AA":["AZSEG CORRETORA DE SEGUROS EIRELI ME","SAO PAULO"],"04AE":["D P DE SOUZA RAMOS CORRETORES E AGENTES DE SE","SAO B. DO CAMPO|SAO PAULO"],"04AK":["C S TEZOLIN CORRETORA DE SEGUROS","SAO PAULO"],"04AN":["BREDER CORRETORA E CONSULTORIA DE PLANOS DE S","CAMPINAS|JUNDIAI|SOROCABA|RIO DE JANEIRO|SAO PAULO"],"04AT":["NAKASEG C E A SEGUROS EIRELI","SAO PAULO"],"04AW":["ADON CONSULTORIA DE BENEFIC CORRET SEG LTDA","SAO PAULO"],"04AX":["KCG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04AY":["POLO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|MOGI DAS CRUZES|SAO PAULO"],"04B0":["R CAZUZA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04B4":["FISCHER B C E C SEGUROS SS LTDA","SOROCABA"],"04B8":["PORTAL HEALTH CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"04BF":["THEO GESTAO DE BENEFICIOS CORRETORA DE SEGURO","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SANTOS|SOROCABA"],"04BN":["M A DOMINGUES CONSULTORIA DE SEGUROS E PLANOS","SAO PAULO"],"04BU":["","EMPIRE ASSESSORIA E CORRETORA DE SEGUROS E PL"],"04BX":["POSTURA CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"04C1":["FERREIRA E CAVAZZANA CONS ASS G BEN EMPR","SAO PAULO"],"04C3":["BENEFIXCIOS C E C S E BENEFICIOS LTDA","SAO PAULO"],"04CI":["MAX CORP CORRETORA DE SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES"],"04CJ":["DABLAN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04CZ":["THOCHA CORRETAGEM DE SEGUROS LTDA","SAO B. DO CAMPO|SOROCABA"],"04D0":["EDU SECURITY CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04DE":["GENUS CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"04DH":["SEGURO FACIL CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"04DR":["IMPERADOR JULIO CESAR CORRETORA DE SEGUROS LT","SAO B. DO CAMPO"],"04DU":["AMIGAO ASSESSORIA EM SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO|SANTOS|CAMPINAS|SOROCABA|AMERICANA"],"04DW":["ROUTT CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"04DX":["N A CORRETORA DE SEGUROS EIRELI ME","MOGI DAS CRUZES"],"04DZ":["ARON ADMINISTRADORA E CORRETORA SEGUROS LTDA","SAO PAULO"],"04E8":["LANDIN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04EE":["R G CORRETORA E ADMINISTRADORA DE SEGUROS E P","SAO PAULO"],"04EP":["VEGGA CORRETORA E CONSULTORIA DE SEGUROS LTA","SAO PAULO|MOGI DAS CRUZES"],"04F3":["TOP A CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04F4":["VIACORP PLUS CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|AMERICANA|MOGI DAS CRUZES|CAMPINAS"],"04F7":["ORIGINAL BROKER CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"04FA":["YOUSGR CORRETORA DE SEGUROS LTDA ME","SAO B. DO CAMPO|SAO PAULO"],"04FI":["G13 VENDAS DE PLANOS DE SAUDE LTDA","SAO PAULO|JUNDIAI|MOGI DAS CRUZES"],"04FP":["CENTER B BRASIL CORRETORA SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"04FW":["ASAP CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04G9":["EPL ADMINISTRACAOE CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"04GD":["FORT HOUSE CORRETORA DE SEGUROS LTDA ME","SAO B. DO CAMPO|SAO PAULO"],"04GI":["MIRAMONTES SEGUROS EIRELI","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|CAMPINAS|RIO DE JANEIRO"],"04GK":["CALU BRAGANTIN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04GR":["HAILTON BARBOSA GAMA","SAO PAULO"],"04GW":["KANARI CLASS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04GX":["MAGRINI CORRETORA DE SEGUROS EIRELI ME","SAO PAULO"],"04H2":["WOLSKI ADMINISTRADORA CORRETORA SEGUROS LTDA","SAO PAULO"],"04HA":["PAULO ANDRADE DE CARVALHO JUNIOR","SAO B. DO CAMPO|SAO PAULO|JUNDIAI"],"04HB":["MISEG ASSESSORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04HC":["AMORIM RODRIGUES CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"04HX":["MUTUALIS C E CORRETORA SEGUROS LTDA","SAO PAULO"],"04HY":["VANESSA DE LOURDES GONCALVES","SAO PAULO|SOROCABA"],"04I1":["PRISCAR CORRETORA DE SEGUROS","SAO PAULO"],"04IA":["HANNS CAROLINO PIMENTA","CAMPINAS"],"04ID":["LS DE SOUZA CORRETORA DE SEGUROS ME","SAO PAULO"],"04IM":["MB CORRETORA E CONSULTORIA DE SEGUROS LTDA","SAO PAULO"],"04IZ":["PROTECT PLUS CORRETORA DE SEGUROS EIRELI","SAO B. DO CAMPO"],"04JA":["GC GOMES ADMINISTRADORA E CORRETORA DE SEGURO","SAO PAULO"],"04JJ":["HUMANITTARE CONSULTORIA E CORRETORA DE SEGURO","SAO PAULO"],"04JN":["","ITSSEG CORRETORA DE SEGUROS S A|SAO PAULO|JUNDIAI|SAO B. DO CAMPO"],"04JU":["AV CAPITAL CORRETORA DE SEGUROS CAMBIO COBRAN","SAO PAULO"],"04JV":["BRAZIL HEALTH CONSULTORIA DE BENEFICIOS E COR","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SANTOS|RIO DE JANEIRO"],"04K2":["GHIRALDELLI A E CORRETORA SEGUROS LTDA","SAO PAULO"],"04KM":["ASBASTOS ADMINISTRADORA E CORRETORA DE SEGURO","SAO PAULO"],"04KR":["PREVISA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES"],"04KZ":["CARDIM CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"04L2":["LIAN CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"04L3":["LED CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04L5":["FEMPS CORRETORA DE SEGUROS E SERVICOS ADMINIS","SAO PAULO"],"04LJ":["PROCARE CORRETORA DE BENEFICIOS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SANTOS"],"04LL":["AGUIA B C E B E I NEGOCIOS EIR","SAO B. DO CAMPO|SANTOS"],"04M0":["P DUELLBERG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04MF":["DMELO CORRETORA DE SEGUROS E CONSULTORIA EIRE","CAMPINAS|SAO PAULO"],"04MN":["RODIO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04MQ":["ABSOLUTA SAUDE CONSULTORIA E CORRETORA DE SEG","SAO PAULO"],"04MX":["PILLASTRI CORRETORA DE SEGUROS E GESTAO DE BE","SAO PAULO"],"04N7":["CIFARELLI CORRETORA SEGUROS E BENEFICIOS LTDA","SAO PAULO|MOGI DAS CRUZES"],"04N8":["ABR CORRETAGEM DE SEGUROS LTDA","RIO DE JANEIRO|SAO PAULO"],"04NK":["CONECTE SEGUROS ADM CONSULTORIA E CORRETORA D","SAO PAULO"],"04NR":["NOVO FUTURO CORRETORA DE SEGUROS DE VIDA LTDA","CAMPINAS|SAO PAULO"],"04NV":["ABC HEALTH CONSULTORIA LTDA","SAO B. DO CAMPO"],"04NX":["IMPERIAL X CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"04PC":["ACENOS CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"04PD":["FA CORRETORA DE SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES"],"04PI":["AVIVACONSULTORIA E CORRETORA DE SEGUROS EIREL","SAO PAULO|SAO B. DO CAMPO"],"04Q9":["SIRION CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04QQ":["ALLCROSS SAO PAULO CORRETORA LTDA","SAO B. DO CAMPO|SAO JOSE DOS CAMPOS|SAO PAULO|SANTOS|MOGI DAS CRUZES|CAMPINAS|SOROCABA"],"04R0":["ABSOLUTA S C E CORRETORA SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"04R3":["FBS ADMINISTRACAO E CORRETAGEM DE SEG EIRELI","SAO PAULO"],"04R7":["ROCCO NOGUEIRA CONSULTORIA E ADM DE SEG LTDA","SAO B. DO CAMPO"],"04RA":["ENOVAX CONSULTORIA E CORRETAGEM DE SEGUROS LT","SAO PAULO|SAO B. DO CAMPO"],"04RE":["OLGACOR CORRETORA DE SEGUROS CONSUL E GESTAO","SAO PAULO"],"04RK":["ANDRE MANDALA ADMINISTRADORA E CORRETORA DE S","SAO PAULO"],"04RQ":["RBL CORRETORA DE SEGUROS LTDA","SOROCABA"],"04S0":["SMART LIFE CORRETORA DE SEGUROS LTDA ME","SAO PAULO|SAO B. DO CAMPO|JUNDIAI"],"04S7":["MY LIFE SONS CORRETORA DE SEGUROS LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|SANTOS|SAO B. DO CAMPO|SAO PAULO|RIO DE JANEIRO|SOROCABA"],"04SS":["DUTRA SEGUROS CONSULTORIA E VENDAS LTDA","SAO B. DO CAMPO|SAO PAULO|JUNDIAI"],"04T6":["ATTENTIONSEG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04TC":["TKT ASSESSORIA CONSULTORIA E CORRETAGEM DE SE","SAO B. DO CAMPO"],"04TE":["DAAZ CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04TI":["HOYT GUARULHOS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04TJ":["ELRAY SERVICOS E CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"04UF":["L O ALVES SEGURO DE SAUDE","SAO PAULO"],"04US":["PORTELLA CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"04UY":["PRESTIGE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04V9":["NOVA VISAO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|RIO DE JANEIRO"],"04VC":["WARLEI FLAVIO MOREIRA","SAO PAULO"],"04VD":["MEA CORRETAGEM DE SEGUROS LTDA","CAMPINAS"],"04VF":["MERKK CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04VH":["SANTOS E S NEGOCIOS EMPRESARIAIS LTDA","MOGI DAS CRUZES"],"04VL":["NAKASONE CORRETORA DE SEGUROS LTDA","SANTOS|SAO PAULO"],"04VN":["A J CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04VX":["SAFESEG CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"04W1":["LIG SAUDE ABC CORRETORA DE PLANOS DE SAUDE LT","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|JUNDIAI"],"04WF":["J.C OLIVEIRA CORRETORA DE SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES|RIO DE JANEIRO"],"04WT":["LURE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04WV":["","ALTER CORRETORA DE SEGUROS LTDA"],"04X1":["PLANSLIFE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04XE":["INTER UNIAO BENEFICIOS E CORRETORA DE SEGUROS","SAO PAULO"],"04XK":["HIRAYAMA ADMINISTRADORA E CORRETORA DE SEGURO","MOGI DAS CRUZES"],"04XP":["LFD MARINGOLO","SAO PAULO"],"04Y4":["DELLANAVA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"04Y7":["M A S CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO|SAO B. DO CAMPO"],"04YE":["RMB CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"04YJ":["CAP LIFE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"04YS":["VITTORISA CORRETORA DE SEGUROS EIRELI ME","SAO PAULO"],"04YU":["RS ABC ADMINISTRADORA E CORRETORA DE SEGUROS","SAO B. DO CAMPO"],"04Z0":["LEFRAN CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"04Z6":["LIGA ADMINISTRADORA E CORRETORA DE SEGUROS LT","SAO PAULO"],"04ZB":["SIMOES DANTAS INTERMEDIACAO LTDA EPP","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"04ZD":["BENCLUB CONSULTORIA ADMINISTRACAO E CORRETORA","SAO PAULO"],"04ZE":["FELICE ADMINISTRADORA E CORRETORA DE SEGUROS","SAO PAULO"],"04ZN":["VERSALLES C F E CORRETORA SEGUROS LTDA","SAO PAULO"],"0502":["NUMBER ONE CORRETORA DE SEGUROS LTDA EPP","SAO PAULO"],"0506":["WLE GONCALVES CONSULTORES DE PLANOS DE SAUDE","SAO PAULO|SANTOS"],"050D":["F A CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0512":["SINTONIA CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO"],"0517":["NAGI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0518":["EXP HAUS CORRETORA DE SEGUROS LTDA","JUNDIAI"],"051E":["A P DE ARAUJO CORRETORA DE SEGUROS","SAO B. DO CAMPO|SAO PAULO|SANTOS"],"051G":["AGS ALPHAVILLE CORRETORA DE SEGUROS EIRELI ME","SAO PAULO"],"051K":["INOVACAO SAUDE CORRETORA DE SEGUROS LTDA","SAO PAULO|SANTOS"],"0524":["LA BRASIL ADM E CORRETORA SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES"],"052B":["FORTITUDE CONSULTORIA E ADMINISTRACAO DE CORR","SAO PAULO"],"052C":["MOURA ZANDONADI CONSULTORIA ADMINISTRADORA E","SAO PAULO"],"052F":["BEST L C SEGUROS E BENEFICIOS LTDA","SAO PAULO"],"052I":["DIAFLEX ADMINISTRADORA E CORRETORA DE SEGUROS","SAO B. DO CAMPO"],"052P":["HLD CORRET SEG INTERMEDIACAO NEG SERV","SAO PAULO"],"052R":["NOI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"052V":["PRADA ADM E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0533":["JOAO PINHEIRO TADIM DE SEGUROS ME","SAO PAULO|SAO B. DO CAMPO"],"0535":["ESEGURO SERVICOS LTDA ME","SAO PAULO"],"053D":["RM ASTEC CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"0546":["LDM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"054A":["VIA CASTELLI CONSULTORIA E CORRETORA DE SEGUR","SAO PAULO"],"054B":["H DE L PEREZ GARDINI DRUMOND","SAO PAULO"],"054G":["COCA COCA ADMINISTRADORA E CORRETORA DE SEGUR","SAO B. DO CAMPO"],"054H":["LUANCA BRH CONSULTORIA E BENEFICIOS E CORRETO","MOGI DAS CRUZES|SAO PAULO"],"054N":["STARFOX C E CORRETAGEM SEGUROS LTDA","SAO PAULO"],"054Z":["NILCEIA DE PAULA OLIVEIRA GERMIM ME","SAO PAULO"],"0556":["CORRETAGEM E CONSULTORIA EM SEGUROS DUNAMIS L","SAO PAULO"],"055I":["PONTE VEDRA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"055Q":["QUEREN HAPUQUE DA SILVA AMARAL ME","SAO PAULO|JUNDIAI|SAO B. DO CAMPO"],"055Y":["LRC CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO"],"0566":["CEDRO 7 C SEGUROS E CONSORCIOS LTDA","SAO B. DO CAMPO"],"0568":["MASCHIOS CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"056E":["HORN CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"056M":["NOVA UPMED CORRETORA DE SEGUROS LTDA","CAMPINAS"],"056N":["LUCIO GOMES CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"056R":["MACHADO PAIARO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"056V":["QUALITY SAUDE LTDA","SANTOS|SOROCABA"],"056X":["MAKTUB CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0576":["MONTREAL","SAO PAULO"],"0577":["HEALTH BRASIL CORRETORA DE SEGUROS ME LTDA","SAO B. DO CAMPO|SAO PAULO"],"057A":["M B CORREIA ASSESSORIA IMOBILIARIA E SEGUROS","SAO PAULO"],"057I":["CEDRO INTERMEDIACAO EM NEGOCIOS COMERCIO E FR","SAO PAULO"],"057L":["KRN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"057N":["ZOOM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"057Q":["INCENTIVA CORRETORA DE SEGUROS EIRELI","SAO B. DO CAMPO"],"057V":["DRAGON A E CORRETORA SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"057Y":["ISABEL C D ORTIGOSO","CAMPINAS"],"057Z":["CB ZANINI CORRETORA DE SEGUROS","RIO DE JANEIRO"],"0582":["BRIDGE ADMINISTRADORA E CORRETORA DE SEGUROS","SAO PAULO"],"0587":["BRADU CORRETORA DE SEGUROS LTDA","SAO PAULO"],"058A":["SOLICITA CONSULTORIA E CORRETORA DE SEGUROS L","SAO PAULO"],"058C":["CGX CORRETORA DE SEGUROS EIRELI ME","SAO B. DO CAMPO"],"058J":["MT DE GOUVEIA CORRETORA DE SEGUROS","SAO PAULO"],"058X":["LEDICE ASSESSORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"059L":["JAMES RODRIGUES DE LIMA CAMPOS","SAO PAULO"],"059S":["MAXTOP CORRETORA DE SEGUROS LTDA","SAO PAULO"],"059U":["SA FACILITI CORRETORA DE SEGUROS E IMOBILIARI","SAO B. DO CAMPO"],"05A3":["","AFFIX CORRETORA DE SEGUROS LTDA"],"05A9":["RJG CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"05AA":["CRB SANTANA CORRETAGEM ME","SAO PAULO|JUNDIAI|SAO B. DO CAMPO"],"05AZ":["LEMA CORP CORRETORA DE SEGUROS LTDA","AMERICANA"],"05B7":["R F LEMOS CORRETORA DE SEGUROS EIRELI","MOGI DAS CRUZES|SAO PAULO"],"05BP":["MIXSUL CORRETORA DE SEGUROS EIRELI","SAO PAULO|RIO DE JANEIRO"],"05CE":["GABRIELA JULIANI VALLE DA SILVA","SAO PAULO"],"05CH":["IMA CORRETORA DE SEGUROS LTDA","JUNDIAI|SAO PAULO"],"05DB":["NORDICA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05DF":["RV CORRET ADMINISTRADORA SEGUROS LTDA ME","SAO PAULO|MOGI DAS CRUZES"],"05DX":["RSIMOES CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05ED":["ALIVE CONSULTORIA DE SEGUROS LTDA","SAO PAULO"],"05EF":["BE CARE BENEFICIOS E CORRETAGEM DE SEGUROS LT","SAO PAULO"],"05EI":["JOSE MARCOS CAMARA CARVALHO","SAO PAULO|SAO B. DO CAMPO"],"05EL":["LIVET CORRETORA DE SEGUROS LTDA","SAO PAULO|JUNDIAI|SAO B. DO CAMPO|SOROCABA"],"05ER":["EVOLVE CORRETORA DE SEGUROS EIRELI ME","SAO PAULO"],"05EU":["PGI P G I C CORRETORA SEGUROS LTDA","SAO PAULO"],"05EV":["LIFE CONSULTORIA CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"05FF":["AGL RODRIGUES CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"05FN":["F C MOURA CORRETORA DE SEGUROS","SAO PAULO"],"05FV":["VALORA CONSULTORIA EM BENEFICIOS E CORRETAGEM","SAO PAULO"],"05FY":["RODRIGO CARDOSO DE ARAUJO CORRETORA DE SEGURO","SAO PAULO"],"05G6":["LEGSEG CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"05GA":["GRAFA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05GG":["GASPAR CORRETORA PLATAFORMA DE SAUDE LTDA","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"05GQ":["T C DE ASSIS CORRETAGEM DE SEGUROS","SAO PAULO"],"05GS":["ALIANCA CARE CONSULTORIA ADM E CORRETORA DE S","SAO PAULO"],"05GY":["SOGOM CONSULTORIA E CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"05H1":["AMOLONHONI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05H9":["ORBE CORRETORA E ADMINISTRADORA DE SEGUROS TI","SAO PAULO"],"05HA":["SIDERAL CORRETORA DE SEGURO E SAUDE LTDA ME","SANTOS"],"05HB":["WS SAUDE ADMINSTRADORA E CORRETORA DE SEGUROS","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|JUNDIAI"],"05HU":["MARTINS C C E A SEGUROS LTDA","SAO B. DO CAMPO"],"05HV":["MARX CORRETORA DE SEGUROS EIRELI ME","SAO PAULO"],"05HY":["ICONE ADMINISTRADORA E CORRETORA DE SEGUROS E","SAO PAULO"],"05I4":["AZ INSURANCE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05IH":["CELINA XAVIER CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05J2":["CAMPOI E R ADM E CORRET SEGUROS LTDA ME","SAO PAULO"],"05JC":["WGFARIAS CORRETORA DE SEGUROS","SAO B. DO CAMPO|SAO PAULO"],"05JF":["ELISANGELA QUINTINO GUERRA","SAO PAULO"],"05JR":["MARIA CLAUDIA SCIOTA ALMEIDA DE OLIVEIRA","SAO PAULO"],"05JT":["MIL CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05K2":["CS2 CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05KD":["TRUE CONSULTING CORRETORA DE SEGUROS LTDA","SAO PAULO|RIO DE JANEIRO"],"05KK":["CAED CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05KL":["FLUXO SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO|JUNDIAI"],"05KN":["TRADE A E CRRETAGEM SEGUROS EIRELI","RIO DE JANEIRO|SAO PAULO|JUNDIAI|SAO B. DO CAMPO"],"05L4":["MACERATA CORRETORA DE SEGUROS EIRELI","SAO B. DO CAMPO"],"05L6":["DANSEG BARTOLOMEU CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"05LN":["AGV CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05LV":["POLAK CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05LZ":["CAVALCANTIS CORRETORA DE SEGUROS LTDA ME","SAO B. DO CAMPO|SAO PAULO"],"05MJ":["MENDES N CORRETORA SEGUROS LTDA","SAO PAULO|CAMPINAS"],"05N3":["MULTIPRIME CORRETORA E ADMINISTRADORA DE SEGU","SAO PAULO|SAO B. DO CAMPO"],"05N8":["AA SAUDE CONSULTORIA E CORRETORA DE SEGUROS L","SAO PAULO"],"05NH":["KF CONSULTORIA E CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"05NM":["F M LAURINDO CORRETORA DE SEGUROS ME","SAO B. DO CAMPO"],"05NZ":["VIBRATIO ADMINISTRADORA E CORRETORA DE SEGURO","SAO PAULO"],"05P1":["NEWPLANECOM ADM DE BENEFICIOS E CORRETAGEM DE","SAO PAULO"],"05PL":["AMV CARVALHO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"05PT":["RE JORDAO CORRETORA DE SEGUROS","SAO B. DO CAMPO|SAO PAULO"],"05Q5":["SEGFRONT ADMINISTRADORA E CORRETORA DE SEGURO","SAO PAULO"],"05QB":["NOVA BRASIL CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"05QL":["GOLDEN PROTECTION CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05QT":["R S MACAMBIRA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05R6":["MONTE LIFE ADMIN E CORRETORA DE SEGUROS","SAO PAULO|RIO DE JANEIRO|SAO B. DO CAMPO"],"05RA":["RHONEY R A LUNA CORRETAGEM DE SEGUROS","SAO PAULO|SOROCABA|MOGI DAS CRUZES|JUNDIAI|SAO B. DO CAMPO"],"05RG":["PRO-MOV CONSULTORIA EM BENEFICIOS LTDA","SAO PAULO|JUNDIAI"],"05RH":["LALOS CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"05RT":["EVIDENCIAL CORRETORA DE SEGUROS LTDA","SAO PAULO|JUNDIAI|MOGI DAS CRUZES"],"05RZ":["4K LIDER CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"05S4":["CLEODINEIA DE SOUZA MELLO SILVA","SAO PAULO"],"05S6":["ASCHE SOLUCOES CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"05S8":["AMAURI CHOJIM ZUKERAM","SAO PAULO"],"05SP":["MARCIA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"05SR":["BOM PLANO CONSULTORIA EM SEGUROS E PLANOS DE","SAO PAULO|RIO DE JANEIRO"],"05SS":["LUCIENE REGINA DOMINGOS","JUNDIAI"],"05SX":["AGFE CORRETORA DE SEGUROS LTDA","SAO PAULO|AMERICANA"],"05SY":["CABENE CORRETORA DE SEGUROS E SAUDE LTDA","CAMPINAS|SAO PAULO|AMERICANA"],"05T6":["FONTANETTI CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"05T9":["ADVANTA CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"05TP":["SUPREMA CORRETORA DE SEGUROS EIRELLI","MOGI DAS CRUZES"],"05U0":["ONI CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"05U6":["CORRETORA DE SEGUROS PANACEA","SAO PAULO"],"05UA":["ESPINELA CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"05UK":["R M RODRIGUES CORRETORA DE SEGUROS","SAO B. DO CAMPO"],"05V0":["TRISAN CORRETORA E CONSULTORIA DE BENEFICIOS","SAO B. DO CAMPO"],"05V3":["ALFARAZ CORRETORA DE SEGUROS LTDA ME","RIO DE JANEIRO"],"05VL":["USY CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05W0":["DGA CONSULTORIA E CORRETAGEM DE SEGUROS EIREL","SAO PAULO"],"05W5":["2RS CORRETORA E ADM DE SEGUROS LTDA","SAO PAULO"],"05WB":["WINNERS CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"05WH":["BASILIONS CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"05WM":["CBEM CONSULTORIA E SEGUROS LTDA","SAO PAULO"],"05X1":["MONTU CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05XH":["PROTECON BENEFICIOS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"05XK":["URBANO CORRETORA DE SEGUROS EIRELI","SAO PAULO|SAO B. DO CAMPO"],"05YG":["JK MUNIZ ELISA CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"05YL":["YOU Q MARTINS CORRETORA E SERVICOS LTDA","SAO PAULO"],"05YM":["BROKER FERNANDES CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"05YU":["ACESSIVEL CORRETORA DE SEGUROS LTDA ME","SAO B. DO CAMPO|SAO PAULO"],"05Z0":["ROBERTO FERREIRA DOS ANJOS EPP","MOGI DAS CRUZES"],"05Z4":["LEGANI MLOPES CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"05ZP":["BW CORRETORA DE SEGUROS E INTERMEDIACOES DE N","SAO PAULO"],"060A":["FAMILY RER CORRETORA DE SEGUROS LTDA","SAO PAULO"],"060C":["MARINETTO CORRETORA DE SEGUROS EIRELI","SAO PAULO|SOROCABA|MOGI DAS CRUZES"],"060G":["EVANDRO M CORRETOR SEGUROS VIDA EIRELI","SAO B. DO CAMPO"],"060H":["BDZ CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO"],"060P":["SALUS ASSESSORIA E CONSULTORIA EM PLANOS DE S","SAO PAULO"],"060Z":["GLUCK CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0614":["PB CORRETORA DE SEGUROS E PLANOS DE SAUDE LTD","MOGI DAS CRUZES"],"0616":["SEG FACIL CORRETORA DE SEGUROS E ADMINISTRACA","SAO B. DO CAMPO"],"0619":["IMPARATO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"061A":["MONTEREY CORRETORES E AGENTES DE SEGUROS LTDA","SAO PAULO"],"061D":["JB S P C E CORRETORA SEGUROS LTDA","SAO PAULO"],"061F":["SOLUCIONE CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"061H":["RGVOS CORRETORA DE SEGUROS DE VIDA E PLANOS D","JUNDIAI"],"061J":["G TREMANTI ADMINISTRADORA DE BENEICIOS LTDA","CAMPINAS|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|JUNDIAI|RIO DE JANEIRO|SANTOS"],"061P":["BRAZIL LIFE CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"0620":["SAFEST CORRETORA DE SEGUROS EIRELI","SAO PAULO|MOGI DAS CRUZES"],"0625":["INFINITY LIFE ADMINISTRADORA E CORRETORA DE S","SAO PAULO"],"062E":["A MINHA CORRETORA DE SERGUROS LTDA","SAO PAULO"],"062G":["JRQ CORRETORA DE SEGUROS LTDA EPP","SAO B. DO CAMPO|SAO PAULO"],"062J":["DODIMA CONSULTORIA E CORRETAGEM DE SEGUROS EI","SAO PAULO"],"062N":["UNICKO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"062S":["STARK SIEG CONSULTORIA E CORRETORA DE SEGUROS","RIO DE JANEIRO|CAMPINAS"],"0633":["MAGISEG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"063T":["WECARE C SEGUROS E BENEFICIOS EIRELI","SAO PAULO"],"063Y":["IMPACTE CORRETORA DE SEGUROS E SERVICOS DIGIT","SANTOS|SAO PAULO|SOROCABA|RIO DE JANEIRO|SAO B. DO CAMPO|MOGI DAS CRUZES"],"063Z":["JW CORRETAGEM DE SEGUROS E INTERMEDIACAO FINA","SAO PAULO"],"0642":["TRIUNO CONSULTORIA E CORRETORA DE SEGUROS LTD","SAO PAULO"],"0648":["ABISC CONSULTORIA E PLANOS DE SAUDE LTDA","SAO PAULO"],"064K":["TRIGUEIRO CORRETORA DE SEGUROS LTDA","SOROCABA"],"064P":["ADDE CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"064Q":["PC SENARIAS SEGUROS","SAO B. DO CAMPO|SAO PAULO"],"064U":["UMC CORRETORA ADMINISTRADORA SEGUR BENEF LTDA","SAO PAULO"],"064W":["LENI MORI PLANOS DE SAUDE E SEGUROS EM GERAL","MOGI DAS CRUZES"],"0656":["RODRIGO AUGUSTO MACEDO DOS REIS","SAO PAULO"],"065B":["YU CONSULTORIA E GESTAO DE BENEFICIOS LTDA","SAO PAULO"],"065C":["JP CORRETORA DE SEGUROS E SAUDE LTDA","SANTOS|SAO PAULO"],"065F":["BEM STAR CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO|SAO B. DO CAMPO"],"065I":["MEIRELES E MANTEY CORRETORA SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"065V":["SAMI ROBSON AMARAL","SAO PAULO"],"065W":["MALTA A E CORRETORA SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES"],"0663":["BARBERI PAULA CORRETORA SEGUROS EIRELI","SAO PAULO"],"0669":["FINFLEX A E CORRETORA SEGUROS LTDA","SAO PAULO"],"066E":["R DE CARVALHO SILVA CORRETORA DE SEGUROS","MOGI DAS CRUZES"],"066G":["EAGLE VISION CORRETORA DE SEGUROS LTDA","SAO PAULO"],"066L":["YOKA CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"066W":["WEBSAUDE CORRETORA LTDA","SAO PAULO|SAO B. DO CAMPO|SANTOS"],"0673":["FRANCA ROCHA SERVICOS ADMINISTRATIVOS EIRELI","SAO PAULO"],"0675":["MARCIO MOREIRA DE CARVALHO","SAO PAULO"],"067G":["CREATIVE POWER CORRETORA DE SEGUROS LTDA","SAO PAULO"],"067J":["MIGS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"067S":["BESEG CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO|CAMPINAS"],"067U":["MSHOKEN C E CORRETORA SEGUROS LTDA","SAO PAULO"],"068T":["BEETHOVEN RESOLVE CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"068V":["STAR LINE CORRETORA DE SEGUROS DE VIDA LTDA","SAO B. DO CAMPO|SAO PAULO|SOROCABA|MOGI DAS CRUZES|JUNDIAI|RIO DE JANEIRO"],"0696":["HER SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"0699":["TRIBOS URBANAS CONSUL E CORRETAGEM SEG LTDA","SAO PAULO|SAO B. DO CAMPO"],"069L":["RANYELMIX CONSULTORIA E CORRETORA DE SEGUROS","SAO PAULO"],"069V":["QUALICARE SEGUROS E SAUDE LTDA EPP","SAO PAULO|SOROCABA"],"06A3":["INOVA LM CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"06A9":["ASSURICH CONSULTORIA E CORRETORA DE SEGUROS L","SAO PAULO"],"06AD":["STARTSUCESS CORRETORA DE SEGUROS EIRELI","SAO PAULO|SAO B. DO CAMPO"],"06AL":["VITALCARE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06AU":["QUALY V S A INTERMEDIACAO EIRELI","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO JOSE DOS CAMPOS|SAO PAULO|SOROCABA|AMERICANA"],"06B4":["GESTOR B CONSULTORIA EM SEGUROS LTDA","SAO PAULO"],"06BN":["BIGINVEST CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06C5":["7SEG CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"06CA":["FRAGAZI CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"06CC":["MARIA SUELY SILVA DOS SANTOS CORRETORA DE SEG","SAO PAULO"],"06D0":["RANUCCI E RANUCCI CORRETORA E ASSESSORIA LTDA","SAO PAULO"],"06DK":["H GUERSON RODRIGUES","MOGI DAS CRUZES"],"06DX":["NM CAVALCANTI CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"06E4":["NUNES CORRETORA DE SEGUROS LTDA ME","JUNDIAI"],"06E7":["SETOR CONSULTORIA E GESTAO DE BENEFICIOS EIRE","RIO DE JANEIRO|SAO PAULO"],"06EQ":["DANIEL CANDIDO YLAMAS","SAO PAULO"],"06ET":["BR PLUS ADMINISTRADORA E CORRETORA DE SEGUROS","SAO PAULO"],"06FD":["BWR CORRETORA DE SEGUROS LTDA","CAMPINAS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|RIO DE JANEIRO|MOGI DAS CRUZES"],"06FM":["ROE CONSULTORIA E CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"06FS":["ALL CUBO CONSULTORIA E CORRETORA DE SEGUROS L","MOGI DAS CRUZES|SAO PAULO"],"06FT":["BKP C E CONSULTORIA BENEFICIOS LTDA","SAO PAULO|SAO B. DO CAMPO"],"06FW":["SUA CORRETORA E CONSULTORIA PLANO SAUDE LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO"],"06G4":["AGG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06G5":["DISSIL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06GF":["CONCEPT SEG PLANOS DE SAUDE EIRELI","SAO PAULO"],"06GN":["A BARRETO TAVARES CORRETORA DE SAUDE LTDA","RIO DE JANEIRO"],"06GS":["G D P FOCO SEGUROS LTDA","SAO PAULO"],"06GV":["REGINALDO FERREIRA AMORIM","SAO PAULO|SAO B. DO CAMPO"],"06H8":["EROVIA CONSULTORIA EM SEGUROS LTDA","SAO PAULO"],"06HA":["HAKA CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO"],"06HZ":["VERSADO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06I0":["JOSE LUIS HOLLANDA CAVALCANTI","SAO PAULO"],"06IF":["WDM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06IM":["RV S CORRETORA SEGUROS E BENEFICIOS LTDA","SAO PAULO"],"06J4":["PREVIR CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"06J7":["SEG MAIS CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"06J8":["FORCA 3 ADMINISTRADORA E CORRETORA DE SEGUROS","SAO PAULO"],"06JB":["LUCILENE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06JD":["LID CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"06JS":["MD ASSESSORIA E SERVICOS LTDA","SAO B. DO CAMPO|SAO PAULO"],"06JX":["LUIZ OLIVEIRA SILVA CORRETORA SEGUROS","SAO PAULO"],"06KF":["CRITERIA SEGUROS ADMINISTRADORA E CORRETORA D","RIO DE JANEIRO"],"06KH":["ARCOR CONFIDENCE CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"06KP":["REPRESENT S C E ASSESSORIA LTDA","SAO PAULO"],"06KX":["GVC GESTAO DE SAUDE EMPRESARIAL MEDICINA PREV","SAO PAULO"],"06LC":["PJ DE OLIVEIRA SEGUROS","SAO B. DO CAMPO|SANTOS"],"06LL":["BRANDAO E PRATES CORRETORA DE SEGUROS LTDA EP","SAO PAULO"],"06M2":["JACONIAS PEREIRA ME","SAO PAULO"],"06MG":["CONA CORRETORA NACIONAL DE SEGUROS LTDA","SAO PAULO"],"06MR":["LAMARY CARUSO SEGUROS","SAO PAULO"],"06N2":["H2P CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06N9":["CHEMBER CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06NA":["LUKENZO ADMINISTRADORA DE BENEFICIOS E CORRET","SAO PAULO"],"06ND":["SOLANGE SUZANA DE OLIVEIRA","SAO PAULO"],"06NH":["ESTRELA VIVA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06NI":["MARIA DE SOUSA BOA SORTE","MOGI DAS CRUZES|SAO PAULO"],"06NN":["ADM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06NU":["RMATOS CORRETORA DE SEGUROS CONSULTORIA DE NE","SAO PAULO"],"06NV":["SEKURO CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"06P3":["RH E FILHOS CORRETORA DE SEGUROS E BENEFICIOS","SAO PAULO"],"06PM":["TCHARLLYS LUCAS OLIVEIRA","SAO B. DO CAMPO|SAO PAULO"],"06PT":["SR PRIME CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06PU":["AMARANTO CORRETORA DE SEGUROS DE VIDA EIRELI","SAO PAULO"],"06PX":["CAMPETI CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"06PY":["VIVA VIDA BENEFICIOS, SEGUROS E SAUDE LTDA","SAO PAULO"],"06Q5":["VIDA ESSENCIAL MAUA CORRETORA DE SEGUROS LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SANTOS|AMERICANA"],"06Q7":["ETERNA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06Q8":["SIMONE DE OLIVEIRA ME","SAO PAULO"],"06QF":["FINK CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06QM":["RVL LEAL CONSULTORIA E CORRETORA DE SEGUROS L","SAO PAULO"],"06QZ":["AIRES MUNDIAL CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"06RU":["SOUZA CORRETORA DE SEGUROS","SAO PAULO"],"06S2":["SAUL GUILHERME PLANOS DE SAUDE EIRELI","SAO PAULO|SAO B. DO CAMPO|SOROCABA"],"06S9":["MISEG CONSULTORIA E CORRETAGEM DE SEGUROSEIRE","SAO PAULO"],"06SR":["SRF L SANTORIO CORRETORA SEGUROS EIRELI","MOGI DAS CRUZES|SAO PAULO|JUNDIAI|SAO B. DO CAMPO|SOROCABA"],"06SS":["LUCAS TAJARIOLLI CORRETOR DE SEGUROS","SOROCABA"],"06T4":["SCOPO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"06T6":["ETG CORRETORA E ADMINISTRADORA DE SEGUROS LTD","CAMPINAS"],"06TE":["BLUE SEG CORRETORA DE SEGUROS EIRELI","SAO PAULO|SAO B. DO CAMPO"],"06TG":["VIVIANE CRISTINA CAIVALOS ME","SAO PAULO"],"06TP":["GCA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06TR":["VALORIZE CORRETORA ASSESSORIA CONSULTORIA E A","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"06TV":["SEGURO SOB MEDIDA CORRETORA DE SEGUROS E PLAN","SAO PAULO"],"06TY":["KATHETO CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"06U2":["PEDREGAL CORRETORA DE SEGUROS LTDA","SAO PAULO|CAMPINAS"],"06UA":["INTERSEG ASSESSORIA E CONSULTORIA DE PLA","JUNDIAI"],"06UP":["ALLI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06V1":["AGGREGA C E CORRETGEM SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"06V3":["TOMODATI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06VP":["NEW MAX HEALTH INSURANCE CORRETORA DE SEGUROS","MOGI DAS CRUZES|SAO PAULO"],"06W6":["SPINELLI CONSULTORIA E PARTICIPACOES LTD","SAO PAULO|JUNDIAI"],"06W8":["CLICK CONSULTORIA EM SEGUROS LTDA","RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO"],"06WT":["NASCIMENTO AGUIAR CORRETORA DE SEGUROS EIRELI","SAO PAULO|SAO B. DO CAMPO"],"06X1":["FANSEG CORRETORA SEGUROS LTDA","SAO PAULO"],"06X6":["AMB CORRETORA DE SEGUROS E BENEFICIOS","SAO PAULO"],"06X7":["DIEGO JOSE MENDES VARGAS ME","SAO PAULO"],"06XM":["AUDREY B DA SILVA CORRETORA DE SEGUROS E CIA","SANTOS"],"06XQ":["TRIZOTE GRECO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06XS":["LIKE CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"06XX":["JBI CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"06Y0":["ALL PROTECTION CORRETORA DE SEGUROS LTDA","JUNDIAI"],"06Y6":["RAJ NEGOCIOS SEGUROS LTDA EPP","SAO PAULO|SAO B. DO CAMPO"],"06Y8":["TEGERE CONSULTORIA E SEGUROS LTDA","SAO B. DO CAMPO"],"06YE":["BRUNO JAMES WERDINE DOS SANTOS ME","SAO PAULO"],"06YW":["MFD CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06Z2":["BRITTO E TORRES CORRETORA DE SEGUROS LTDA","SAO PAULO"],"06Z4":["MS CONSULTORIA EIRELI ME","SAO PAULO"],"06Z7":["VIRGINIA MARIA MOUTINHO","SAO PAULO"],"06ZE":["NOEMI LOPES NOGGERINI ME","SAO PAULO"],"06ZH":["HQZ BROKER CORRETORA DE SEGUROS E BENEFICIOS","SAO PAULO"],"06ZK":["DOR PME CORRETORA DE SEGUROS E SERVICOS ON LI","SAO PAULO"],"0701":["DHENIK REPRESENTACOES COMERCIAIS LIMITADA","SAO PAULO"],"070S":["TECBEN CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO|SAO PAULO|TECBEN CORRETORA DE SEGUROS LTDA|SAO B. DO CAMPO"],"070W":["TABATA CORRETORA DE SEGUROS E BENEFICIOS LTDA","SAO PAULO"],"070Z":["NIT SAFE CORRETORA DE SEGUROS EIRELI","RIO DE JANEIRO"],"0710":["HENRIQUE MARTINS DE SANTANA","SAO B. DO CAMPO|SAO PAULO"],"0715":["CASSIO CABRERA INTERMEDIACOES ME","SAO PAULO"],"071B":["G AUGUSTO CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"071D":["INNOVI ADMINISTRADORA E CORRETORA DE SEG","SAO PAULO"],"071Y":["SINNED SAUDE","SAO PAULO"],"0724":["FOCOSEG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0729":["INTEGRITY CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"072Z":["TRIPCOR CORRETORA DE SEGUROS LTDA ME","MOGI DAS CRUZES|SAO PAULO|RIO DE JANEIRO"],"0731":["PORT 1 C S E A BENEFICIOS LTDA","SAO B. DO CAMPO|SAO PAULO|RIO DE JANEIRO"],"0732":["MOVE CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"073F":["VANDERLEI BARBOSA DA SILVA","MOGI DAS CRUZES|SAO PAULO"],"073G":["THREE CORRETORA DE SEGUROS LTDA","JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"073U":["CRV VENDAS CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO"],"0740":["PLANLIFE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0742":["OMAHA CORRETORA DE SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES|SAO B. DO CAMPO|SOROCABA|CAMPINAS"],"074A":["HELFEN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"074D":["S MARAGNO CORRETAGEM DE SEGUROS DE VIDA","SAO PAULO"],"074K":["MORE LIFE CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"074N":["ANDRE RODRIGUES DA SILVA CORRETORA DE SEGUROS","SAO PAULO"],"075C":["SF CORRETAGEM DE SEGUROS LTDA ME","SAO PAULO"],"075F":["TRINUS ASCON LTDA","SAO PAULO"],"076A":["ISAFE C SEGUROS E BENEFICIOS EIRELI","SAO PAULO"],"076J":["VALENDO CORRETORA DE SEGUROS BENEFICIOS LTDA","SAO PAULO"],"076U":["MEDPRIME CORRETORA DE SEGUROS LTDA","SOROCABA"],"0777":["B D DO NASCIMENTO CORRETORA DE SEGUROS","SAO PAULO"],"0779":["JOSE ALUISIO OLIVEIRA DE COUTO","SAO B. DO CAMPO"],"077N":["RODRIGO CAMPOS RIBEIRO","MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|JUNDIAI|SANTOS"],"077U":["HL HUMANA ADMINISTRADORA E CORRETORA DE SEGUR","SAO PAULO"],"078I":["HAPPY DAY CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"078J":["D N FAGUNDES CORRETORA DE SEGUROS LTDA","SAO PAULO"],"078K":["CLAUDIA MATHEUS CARDOSO PLANOS DE SAUDE","SAO B. DO CAMPO"],"078N":["CRISTIANA ASSIS CANDIDO FERREIRA","SAO B. DO CAMPO|SAO PAULO"],"0792":["ACESSO COMPANY SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO|SANTOS|SAO B. DO CAMPO"],"0794":["INVI CORRETORA DE SEGUROS E SERVICOS LTDA","SAO PAULO"],"0797":["JULISA SANTANA CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"0799":["MENDICINO CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"079M":["H D P CORRETORA DE SEGUROS LTDA","SAO PAULO"],"079Z":["WG CONSULTORIA DE BENEFICIARIOS LTDA","JUNDIAI|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SANTOS"],"07AE":["NORTHWEST CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07AL":["BLACK OFFICE CONSULTING CORRETORA DE SEGUROS","SAO PAULO"],"07B2":["ABEL GARCIA DA COSTA","SAO PAULO"],"07B5":["SOLUS VIDA SOLUCOES EM SAUDE E BENEFICIOS EIR","SAO PAULO"],"07BA":["T L GARCIA CORRETORA DE SEGUROS","SAO PAULO"],"07BI":["GALATHAS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07BX":["E DA S GUIMARAES","SAO PAULO"],"07BZ":["ALLMEIDA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07CF":["ACCOS CORRETORA DE SEGUROS EIRELI","SAO B. DO CAMPO"],"07CV":["PAZ SAUDE CORRETORA DE PLANOS DE SAUDE EIRELI","SAO PAULO"],"07D0":["SAUDE E VIDA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|SOROCABA|RIO DE JANEIRO"],"07D1":["OONA PRADO NUNER GLAD","SAO PAULO"],"07D4":["GPSOLUCOES EM SAUDE LTDA","SAO PAULO"],"07D5":["TOFOLO KUSSAKA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07D6":["EMPIRE CORRETORA DE SEGUROS LTDA ME","AMERICANA"],"07DI":["EL SHADDAI ADMINISTRACAO E CORRETAGEM DE SEGU","SAO PAULO"],"07DL":["D BRITOS CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"07DN":["ROSANA MARIA DA CONCEICAO BALBINO DOS SANTOS","MOGI DAS CRUZES|SAO PAULO|SAO B. DO CAMPO"],"07EA":["INDICA SEGUROS CORRETORA LTDA","SAO PAULO|SAO B. DO CAMPO"],"07EG":["CB CONSULTORIA DE SEGUROS EIRELI","SAO PAULO"],"07ES":["INSPIRA CONSULTORIA E CORRETORA SEGUROS LTDA","SAO PAULO"],"07FF":["VIVACOM CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"07FI":["WHARECORP CONSULTORIA E CORRETORA DE SEGUROS","SAO PAULO|SAO B. DO CAMPO"],"07FL":["PLANOS DE SAUDE PREMIUM CONSULTORIA DE PLANOS","SAO PAULO"],"07FX":["VICAZAN CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"07G2":["THE BEST CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07G4":["RENAN BECCHELLI CSAPO","SAO B. DO CAMPO"],"07G5":["BRAZILCALL BUSINESS INTELIGENCE LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO"],"07G9":["GAMBETTA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07GB":["U SEGUROS CORRETORA EIRELI","SAO PAULO"],"07GG":["ALONG CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"07H1":["CLIMOM REPRESENTACOES COMERCIAIS LTDA","JUNDIAI"],"07HB":["BEST LIFE PLATAFORMA LTDA","SAO PAULO"],"07I2":["INFORMACAO SEGURA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07IA":["CLAUDEMIR GOMES DA CONCEICAO","SAO PAULO"],"07IC":["LARI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07IU":["FRANCISCA A S V M CORRETAGEM SEGURO","SAO PAULO"],"07J2":["KEMAY CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07J9":["TROJ CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07JJ":["VALLE RIBEIRO CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"07K0":["EDUARDO OKUBO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07KD":["AZNOBRE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07KL":["FATOR HUM CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"07LF":["ROGERIO FRANCA ME","SAO PAULO"],"07LG":["VERSATIL PENIDO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07LS":["F18 CORRETORA DE SEGUROS SS LTDA","SAO PAULO"],"07MF":["PANESI CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"07MH":["OPIPARI ASSOCIADOS SERVICOS ADMINISTRATIVOS L","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES"],"07N0":["MATOS E MONTEIRO CORRDE SEG DE VIDA LTDA","SAO PAULO"],"07ND":["BRAZILIAN CARE ADMINIST E CORRETOA DE SEGUROS","SAO PAULO"],"07NI":["LOSANCORP A E CORRETORA SEGUROS LTDA","MOGI DAS CRUZES"],"07NQ":["PONTEIO CORRETAGEM DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"07NU":["ESPACO CORRETAGENS LTDA","SAO PAULO"],"07NW":["EPM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07P3":["NEWSEG & NEWSEG ADMINISTRADORA E CORRETORA","SAO PAULO"],"07PN":["COPPINI N PRIME CORRETORA SEGUROS LTDA","SAO B. DO CAMPO"],"07PQ":["GOES E ALCANTARA CORRETORA DE SEGLTDA ME","SOROCABA"],"07PR":["ACAO SEG CORRETORA DE SEGUROS EIRELI","MOGI DAS CRUZES"],"07PS":["HI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07Q5":["CLANOE CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"07Q6":["SR BRASIL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07QJ":["ALMIR GONCALVES DE FREITAS","SAO B. DO CAMPO"],"07RE":["VOZ CORRETORA DE SEGUROS E MARKETING LTDA","SAO PAULO"],"07RM":["GLOBALCORP-CORRETORA DE SEGUROS GERAIS LTDA","SAO PAULO"],"07S3":["LC I BROKER CORRETORA SEGUROS VIDA LTDA","SAO PAULO"],"07S6":["UNICORP CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"07S8":["PROLIFE CORRETORA DE SEGUROS LTDA","SANTOS|SAO PAULO"],"07ST":["FACILITY C SEGUROS E ADMINISTRADORA LTDA","SAO PAULO"],"07SU":["QUALITY REIS CONST E CORRETORA DE SEGUROS","SAO PAULO"],"07TC":["MS PREMIER CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO"],"07TX":["PFJ ASSESSORIA CONSUL E CORRETAGEM DE SEGUROS","RIO DE JANEIRO"],"07TY":["KALYSA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07U6":["PES CONSULTORIA E CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"07U9":["BRASIL BENEFICIOS CONSULTORIA E CORRETORA DE","SAO B. DO CAMPO"],"07UA":["DNK CORRETORA DE SEGUROS LTDA","SANTOS|SAO PAULO"],"07UM":["JRF ENERGY BROKERS CORRETORES DE SEGUROS LTDA","SAO PAULO"],"07VW":["VAZQUEZ RODRIGUEZ CONSULT REPRESENTACOES E CO","SAO PAULO"],"07VX":["TROLEZI CORRETORA E ADMINISTRADORA DE SEGUROS LTDA","SAO PAULO"],"07VY":["HEALTH CONNECTION CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07W3":["PARCERIA SISAN CORRETORA DE SEGUROS DE VIDA L","SAO PAULO|SOROCABA"],"07WF":["VALORIZA SEG CORRETORA DE SEGUROS LTDA","SOROCABA|SAO B. DO CAMPO"],"07WI":["CELIA APARECIDA LIMA","RIO DE JANEIRO"],"07WM":["PONTUALIDADE CORRETORA DE PLANOS DE SAUDE SEG","SAO PAULO"],"07WP":["LH PROTEGE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07WT":["OSMAN CORRETORA DE SEGUROS EIRELI ME","MOGI DAS CRUZES|SAO PAULO"],"07WV":["JLR2 CORRETORA DE SEGUROS ME","CAMPINAS"],"07WW":["QUALITY I A E CORRETORA SEGUROS LTDA","SAO PAULO"],"07WX":["2 ETAPAS CORRETORA DE SEGUROS LTDA EPP","MOGI DAS CRUZES|SANTOS|CAMPINAS|SAO PAULO"],"07X0":["DOZE CONSULTORIA E CORRETORA DE SEGUROS EIREL","SAO PAULO"],"07X5":["CX CORRETORA DE SEGUROSDE VIDA LTDA ME","JUNDIAI|SAO B. DO CAMPO|SAO PAULO"],"07X7":["SCAVONE CORRETORA E ADM SEGUROS LTDA","SAO PAULO"],"07XQ":["APIA CORRETORA DE SEGUROS DE VIDA LTDA","SAO B. DO CAMPO|SAO PAULO"],"07XT":["SAUDE M C EM SEGUROS E BENEFICIOS EIRELI","SAO PAULO|MOGI DAS CRUZES|SAO B. DO CAMPO|SANTOS"],"07Y4":["CENTER VIDA CORRETORA DE SEGUROS LTDA","SAO PAULO|JUNDIAI"],"07YA":["J S RIBEIRO CORRETORA DE SEGUROS ME","SAO PAULO"],"07YB":["CLAQUE CORRETORA DE SEGUROS DE VIDA EIRELI","SAO PAULO"],"07YC":["AGAPE ASSESSORIA E CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"07YE":["ALPHA INSURANCE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07YI":["PMARIN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"07Z4":["THEYMA CORRETORA DE SEGUROS DE VIDA LTDA","SAO PAULO"],"07ZA":["ASEG SAUDE ANSELMO CRUZ SILVA","SANTOS|SAO PAULO"],"07ZI":["ADECORP MAX CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"07ZJ":["EVORA NEWS CORRETORA DE SEGUROS","SAO PAULO|MOGI DAS CRUZES"],"07ZL":["R BANDEIRA CORRETORA E CONSULTORIA DE SEGUROS","SAO PAULO"],"07ZM":["PRIMORIS INTERMEDIACAO DE NEGOCIOS E CORRETOR","JUNDIAI|SAO PAULO|SAO B. DO CAMPO"],"07ZP":["LIFE CLASS CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"07ZW":["MONTE CRISTO E RAMOS CORRETORA DE SEGUROS","SANTOS|SAO PAULO"],"0805":["POTENCIAL JET CORRETORA DE SEGUROS LTDA","CAMPINAS"],"080E":["EXCELENCIA SEGUROS EIRELI ME","SAO B. DO CAMPO|SAO PAULO"],"080S":["TAILOR CORRETORA DE SEGUROS LTDA","SAO PAULO"],"080U":["SEGURO FACIL BRASIL CORRETORA E ASSESSORIA EM","CAMPINAS"],"0818":["HITH ABSOLUT CORRETORA DE SEGUROS E VIDA LTDA","SAO PAULO"],"0819":["APORTSEG CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"081P":["FIRMASEG CORRETORA DE SEGUROS LTDA EPP","MOGI DAS CRUZES"],"082G":["AA CORRETORA DE SEGUROS GERAIS LTDA","AMERICANA"],"082I":["BENS CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"082S":["HSS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"082Z":["CAMINO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"0834":["IN COMPANY CORRETORA DE SEGUROS LTDA ME","JUNDIAI|SAO PAULO|MOGI DAS CRUZES|SOROCABA|CAMPINAS"],"083C":["REZENDE PORTO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"083T":["CARVEJANI CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"083Y":["LGV CONSULTORIA DE VENDAS LTDA","SAO PAULO"],"0849":["LEGASILVA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"084A":["HARPER CORRETORA DE SEGUROS LTDA","SAO PAULO"],"084B":["W1 PARTICIPACOES E CORRETORA DE SEGUROS S.A.","SAO PAULO|AMERICANA"],"084G":["J B L SEGUROS EIRELI","SAO PAULO"],"084I":["","QUALICORP CONSULTORIA E CORRETORA DE SEGUROS|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|JUNDIAI|AMERICANA|SAO JOSE DOS CAMPOS|SOROCABA"],"084M":["PONTO AZUL CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"084S":["NOVA GABERA CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"084Y":["PROSPERITE C S E BENEFICIOS LTDA","SAO B. DO CAMPO|SAO PAULO"],"0855":["NEW OLD CORRETAGEM DE SEGUROS LTDA","SAO PAULO|SANTOS"],"085K":["TORKMAN C E CORRETAGEM SEGUROS LTDA","SAO PAULO"],"0867":["IMPRENSA CORRETORA DE SEGUROS SS LTDA ME","SAO PAULO"],"086E":["ROYAL TEAM CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"086H":["GRUPO INTER CONSULTORIA E GESTAO EM SAUDE SS","SAO PAULO|JUNDIAI"],"086I":["UNILIFE BENEFICIOS CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"086X":["MAZAN CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0871":["J B CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0877":["VISAO FUTURA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"088B":["DOC X CORRETORA DE SEGUROS LTDA","CAMPINAS"],"088G":["CALMON N4 E NOGUEIRA CONSULTORIA E CORRE","SAO PAULO"],"088X":["ESTILO A E CORRETORA SEGUROS LTDA","JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|AMERICANA|SAO JOSE DOS CAMPOS|CAMPINAS"],"0898":["GOIS C E CORRETORA SEGUROS LTDA","SAO PAULO"],"089G":["TJK CORRETORA DE SEGUROS LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|AMERICANA|RIO DE JANEIRO"],"089J":["GPS CORRETAGENS E ADMINISTRACAODE SEGUROS LTD","SAO PAULO"],"089R":["HEBROM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08A1":["REFLA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"08AJ":["SEPAM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08AL":["REPAM S C SEGUROS E BENEFICIOS LTDA","SAO B. DO CAMPO"],"08BC":["BADO CORRETORA DE SEGUROS LTDA ME","SAO PAULO|SAO B. DO CAMPO"],"08BE":["LMA RISK SERVICES CONSULT E CORRETAGEM SEG LT","SAO B. DO CAMPO|SAO PAULO"],"08BN":["DALAVA CORRETORA DE SEGUROS LTDA","JUNDIAI"],"08BS":["CORGIL CORRETORA DE SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES"],"08BV":["TEXAS AFFINITY CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"08C6":["PS PAMSEG CORRETORA DE SAUDE E SEGUROS L","SANTOS"],"08CB":["BEPLUS SAUDE CORRETORA DE SEGUROS LTDA","JUNDIAI|SANTOS|SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|RIO DE JANEIRO|CAMPINAS|SOROCABA"],"08CC":["NOVA VIDA ATITUDE LTDA","SAO PAULO"],"08CF":["TUA PROTECAO GESTAO EMPRESARIAL E CORRETORA D","SAO PAULO"],"08CJ":["IMT CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08CK":["AGNUS LIFE CORRETORA DE SEGUROS LTDA","SAO PAULO|RIO DE JANEIRO|SOROCABA"],"08CT":["S VERDE BENEFICIOS CONS E CORRETORA DE SEGURO","SAO B. DO CAMPO|SAO PAULO"],"08CY":["FFJ CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08D0":["SJ CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"08D6":["A J A CORRETAGEM DE SEGUROS LTDA ME","SAO PAULO"],"08D9":["GEBARA ANDRADE SEGUROS LTDA","JUNDIAI|SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|SOROCABA|CAMPINAS"],"08DE":["AS SURE BRASIL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08DJ":["LIFT CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08DS":["TOTAL HEALTH CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"08E4":["GOLD PLAN CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"08E5":["GUZZICORP ADMINISTRACAO E CORRETAGEM DE SEGUR","SAO PAULO"],"08E7":["COESOS ESSENCIAL CORRETAGEM DE SEGUROS E SERV","SAO PAULO"],"08EF":["BRANDI BRANDI INTERMEDIACAO DE NEGOCIOS E COR","SAO PAULO"],"08EV":["NUNES E GROSSI INTERMEDIADORA DE NEGOCIOS LTD","SAO PAULO"],"08F0":["RL7 SEGUROS LTDA","SAO PAULO"],"08FA":["SEVENTEEN C E CORRETORA SEGUROS LTDA","SAO PAULO"],"08FD":["INTERACTA CORRETORA E ADM DE SEGUROS","SAO PAULO"],"08FG":["AZEVEDO FILHO CORRETORA DE SEGUROS LTDA EPP","SAO PAULO"],"08FL":["EURO CORRETORA E ADMINISTRADORA DE SEGUROS LT","SAO PAULO"],"08FR":["EDBIN S ADMINISTRADORA BENEFICIOS EIRELI","SAO B. DO CAMPO|SAO PAULO"],"08FU":["MABELLA CONSULTORIA E CORRETORA DE SEGUROS LT","SAO PAULO"],"08FZ":["MARCZZ ADMINISTRADORA E CORRETORA DE SEGUROS","MOGI DAS CRUZES|SAO PAULO|SAO B. DO CAMPO"],"08H4":["SSANSERVICE CORRETORA DE SEGUROS EIRELI","SAO PAULO"],"08HE":["PELLEGRINO MACHADO CONSULT BENEF CORRET SEGUR","SAO PAULO"],"08HF":["TIESO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08HI":["ACOREANA CORRETORA E ADMINISTRACAO DE SEGUROS","MOGI DAS CRUZES|SAO PAULO"],"08HK":["G L A CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"08IM":["ALLIATE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08IP":["CAMILO MARTINS CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08IS":["FAUSTINO GOMES ELLO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08IY":["CENTERMED C A E C SEGUROS LTDA","SAO PAULO"],"08J8":["PAX PRIME CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08JM":["JORGE CORREA CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"08JP":["LIFECOM CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08K5":["D FATO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08KJ":["AMARO CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO|RIO DE JANEIRO|CAMPINAS"],"08L2":["SILVA E SALOMAO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"08LH":["PHOENIX I C E A CORRETAGEM SEGUROS","MOGI DAS CRUZES|RIO DE JANEIRO|SAO PAULO"],"08LQ":["RHG CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"08LU":["GLICERIUNS CORRETORA DE SEGUROS LTDA","CAMPINAS|SAO PAULO"],"08LY":["UNISAUDE MASTER CORRETORA DE SEGUROS LTDA","JUNDIAI|SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SOROCABA"],"08MH":["EVERI CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"08MU":["NICHITA A E CORRETAGEM SEGUROS LTDA","SAO PAULO"],"08NL":["MILXX ADMINISTRADORA E CORRETORA DE SEGUROS L","SAO PAULO|MOGI DAS CRUZES"],"08P7":["MOPI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08PA":["DE VIDA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08PE":["H C M SAUDE CIA CORRETORA DE SEGUROS LTDA","SANTOS"],"08PF":["LAROMA PLANOS DE SAUDE E SEGUROS EM GERAL LTD","SAO B. DO CAMPO"],"08PM":["CATALANI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08PN":["CRPA BARROCHELO CORRETORA DE SEGUROS SS LTDA","SAO PAULO"],"08PT":["TOPMAR CORRETORA DE SEGUROS LTDA.","SAO PAULO"],"08PV":["ONECORP CONSULTORIA E CORRET DE SEG LTDA","SAO PAULO"],"08QK":["DEBORAH CRISTINA GUSMAN","SAO PAULO"],"08QS":["AJJI S C CORRETORA SEGUROS EIRELI","SAO PAULO|MOGI DAS CRUZES"],"08RA":["LEMMO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"08RC":["NACCARATO CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"08SM":["BRAND SAUDE CORRETORA DE SEGUROS LTDA","SAO PAULO|SAO B. DO CAMPO"],"08TD":["DONATI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08TM":["RENOVEBENS ADMINISTRADORA E CORRETORA DE SEGU","MOGI DAS CRUZES|SAO PAULO"],"08TY":["PERSISTE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08TZ":["VIDA E FAMILIA CORRETORA DE SEGUROS DE VIDA L","SAO PAULO"],"08U0":["VALOR G C E CORRETAGEM SEGUROS LTDA","SAO PAULO"],"08UF":["DE SANTIS CORRETORA DE SEGUROS DE VIDA LTDA M","CAMPINAS"],"08UL":["MM SEG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08UN":["AIRES MOURA CORRETORA DE SEGUROSLTDA EPP","SAO B. DO CAMPO"],"08UU":["FLAMED INTERMEDIACOES DE NEGOCIOS","SANTOS|SAO PAULO"],"08UV":["INTEGRA VITA GESTAO DE BENEF E CORRET DE SEG","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SANTOS"],"08V8":["DBLSEG CARE CONSULTORIA E CORRETORA DE SEGURO","SAO PAULO"],"08VL":["ANDREIA CRISTIANE DE OLIVEIRA ME","SOROCABA"],"08W4":["VITORAMCORRETORA DE SEGUROS EIRELI","MOGI DAS CRUZES|SAO PAULO"],"08W5":["VACO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"08W9":["STELLA B A C E CORRETAGEM SEGUROS LTDA","SAO PAULO"],"08WD":["COSTA AGUIAR CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"08WE":["UNION CORRETORA DE PLANOS DE SAUDE EIRELI","SAO PAULO"],"08X5":["AMADIU CONSULTORIA E CORRETORA DE SEGUROS LTD","SAO PAULO"],"08X9":["ALMANARAS CONSULTORIA E CORRETAGEM DE SEGUROS","SAO B. DO CAMPO"],"08XD":["LHMB ADMINISTRADORA E CORRETORA DE SEGUROS LT","SAO PAULO"],"08XE":["HERNANDES HERNANDES CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08XI":["GVB REPRESENTACES LTDA","RIO DE JANEIRO|SAO PAULO"],"08XW":["ABR SIQ CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"08XZ":["TRUNFFO ADM E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08Y8":["MMARA CORRETORA DE SEGUROS LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|SANTOS|SOROCABA"],"08YV":["FERRAREZI LIFE CORRETORA DE SEGUROS VIDA LTDA","SAO PAULO"],"08Z0":["ARATAN CORRETORA DE SEGUROS LTDA EPP","SAO B. DO CAMPO"],"08ZL":["A F ATITUDE CONSULTORIA E CORRETORA DE SEGURO","SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"08ZM":["IBACCO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"08ZZ":["JULOP CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"0900":["MAXDALA CONSULTORIA E CORRETORA DE SEGUROS LT","MOGI DAS CRUZES"],"0908":["D M PEREIRA BAPTISTA ZANINI","SAO PAULO|SAO B. DO CAMPO"],"090E":["FRANCISCA CLEMENTINO DE SOUSA","SAO PAULO"],"090F":["EVIDENCE BRASIL CORRETORA DE SEGUROS LTDA ME","SANTOS|SAO PAULO"],"090X":["MARCELO PEREIRA GOIS","SAO PAULO"],"090Y":["MAIS SAUDE CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"0915":["EASTERN C E CORRETAGEM SEGUROS LTDA","SAO PAULO"],"091W":["LEAO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0921":["CONNECT PLUS CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA|CAMPINAS|RIO DE JANEIRO|JUNDIAI"],"0924":["LUSO SEMPRE SEGURO CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"092A":["LILIAN PASCOALCORRETORA DE SEGUROS E PLANOS D","SAO PAULO"],"092R":["PICCAGLI CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"0937":["MACEL C E CONSULTORIA SEGUROS LTDA","SAO PAULO"],"093C":["ALPER CONSULTORIA E CORRETORA DE SEGUROS S A","SAO PAULO|SAO B. DO CAMPO"],"093K":["ZANONI CORRETORA DE SEGUROS DE VIDA SAUDE E P","SAO PAULO"],"093M":["DAVI LOPES CORRETORA DE SEGUROS LTDA","SAO PAULO"],"093V":["BRUNO DEL ANGELO DO CARMO PREST DE SERV DE CO","SAO PAULO"],"0940":["SPERINDE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0942":["GLOBAL CARE CORRETORA E ADMINISTRADORA DE SEG","SANTOS|SAO PAULO"],"094A":["ASS C E P S E PLANOS ODONTOLOGICOS LTDA","SAO B. DO CAMPO|SAO PAULO"],"094D":["NOVA EXITO CORRETORA DE SEGUROS E SAUDE LTDA","SAO PAULO"],"094K":["OFFER CORRETORA DE SEGUROS LTDA","SAO PAULO"],"094V":["FERNANDO CASTRO E ASSOCIADOS CORRETORA DE SEG","SAO B. DO CAMPO|SAO PAULO"],"0952":["SPAGNOL CORRETORA DE SEGUROS LTDA ME","SAO PAULO"],"0959":["JUMALU CORRETORA DE SEGUROS LTDA","SAO PAULO"],"095J":["REIS MACEDO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"096H":["CONSULMED CORRETORA DE SEGUROS LTDA","SAO PAULO"],"096I":["NOMI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"096P":["WEMK ADM E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0972":["JULIFER CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"098W":["FIELCOR ADM CORRETAGEM SEGUROS SC LTDA","SAO PAULO"],"0994":["JAC SECURITY CORRETORA E ASSISTENCIA DE SEGUR","SAO PAULO"],"0999":["MELHOR OPCAO PLANOS DE SAUDE E CONSULTORIA LT","SAO B. DO CAMPO|SAO PAULO|SOROCABA|MOGI DAS CRUZES|CAMPINAS|JUNDIAI"],"099G":["CM MULLER CORRETORA DE SEGUROS LTDA","CAMPINAS|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|JUNDIAI|SOROCABA"],"099N":["MK PLANOS DE SAUDE LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|RIO DE JANEIRO|AMERICANA"],"099W":["ALGES GESTAO E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"09AC":["CARUSO E MACEDO CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO"],"09AV":["DOM ARA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"09B0":["LC CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"09B5":["BGB BRASIL CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0ABU":["POSITANO CORRETORA DE SEGUROS LTDA","SOROCABA"],"0AE5":["AVCS CORRETORA DE SEGUROS LTDA","SANTOS"],"0AE6":["EASY INSURANCE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0AE7":["FLAUZINO CONSULTORIA E CORRETORA SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO|SOROCABA|SAO B. DO CAMPO|CAMPINAS"],"0AEL":["STS CORRETORA DE SEGUROS E PLANOS DE SAUDE LT","SANTOS|RIO DE JANEIRO"],"0AEU":["4L BENEFICIOS LTDA","SAO PAULO"],"0AFA":["TAFE CORRETORA E CONSULTORIA EM SEGUROS LTDA","SAO B. DO CAMPO"],"0AFB":["DIGITAL BRASIL PLANO DE SAUDE LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SAO JOSE DOS CAMPOS|AMERICANA"],"0AFJ":["ENNOVA CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"0AFS":["BRENO R CORREIA","JUNDIAI|SAO PAULO"],"0AFU":["ROHFE CORRETORA ADMINISTRADORA DE SEGUROS LTD","MOGI DAS CRUZES"],"0AFZ":["SER MED SOLUCOES EM SAUDE LTDA","CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SANTOS|AMERICANA"],"1A99":["CONTSEG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"21A9":["EMILLY GAMA DOS SANTOS CORRETORA DE SEGUROS","SAO PAULO"],"224A":["SL91 SAO PAULO CONCEITO EM VENDAS LTDA","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA"],"231A":["PHD CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO"],"236A":["ONE MASTER CORRETORA DE SEGUROS LTDA","SAO B. DO CAMPO|SAO PAULO|SANTOS|MOGI DAS CRUZES"],"239A":["CORRETORA BMOR S & BENEFICIOS LTDA","JUNDIAI|SAO PAULO"],"23AA":["HAPPLAN SP CORRETORA DE SEGUROS E PLANOS","CAMPINAS|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|SOROCABA|JUNDIAI|MOGI DAS CRUZES|SANTOS"],"24A9":["HEALTHINK INTEGRADORA DE SAUDE LTDA","SAO PAULO"],"262A":["FGI CORRETORA DE SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES"],"267A":["S.A BENEFICIOS SAUDE INTEGRADORA LTDA","MOGI DAS CRUZES|SAO PAULO|JUNDIAI"],"26A1":["ALTO TIETE CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|SAO PAULO"],"26A6":["JR E MARTO BENEFICIOS CORRETORA SEGUROS LTDA","SAO PAULO"],"272A":["MAKI SEGUROS LTDA","SAO PAULO"],"27A6":["DIRECT BLACK CORRETORA DE SEGUROS LTDA","SAO PAULO"],"283A":["RPP CONSULTORIA E CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"28A6":["L & R CORRETORA DE PLANOS DE SAUDE LTDA","RIO DE JANEIRO|SAO PAULO|SAO B. DO CAMPO|AMERICANA|CAMPINAS"],"28A7":["ABFT CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES|RIO DE JANEIRO|SAO PAULO|SOROCABA"],"28A9":["PREVIVIDA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"296A":["NEW FLY INSURANCE ADM CORRET SEG PLAN SAUD","SAO PAULO|JUNDIAI"],"29A1":["ITAPETININGA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"2A15":["MATTOS RIBEIRO CORRETORA SEGUROS CONSULT LTDA","SAO PAULO"],"2A17":["LCG CORRETORA DE SEGUROS LTDA","SAO PAULO"],"2A18":["OUROS VIDA AUTO CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"2A2A":["LIFESEG CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"2A31":["MOREIRA BRITO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"2A68":["C PRIME CORRETORA LTDA","CAMPINAS|SAO PAULO|SOROCABA"],"2A6A":["LULIANGE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"2A72":["ALPER CONSULTORIA E CORRETORA DE SEGUROS S.A.","SAO PAULO"],"2A78":["LUTFI & BORELLI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"2AA2":["HINVEST CORRETORA DE SEGUROS LTDA","SAO PAULO|MOGI DAS CRUZES"],"2AA3":["DOZE PASSOS & BENEFICIOS CORRETORA DE SEGUROS","SAO PAULO"],"2AA8":["M HU CORRETORA DE SEGUROS E BENEFICIOS LTDA","SAO PAULO"],"319A":["COSTA E CARMINATI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"31A4":["DURAN CORRETORA DE SEGUROS LTDA","MOGI DAS CRUZES"],"328A":["NOBE SEGUROS LTDA","SAO PAULO"],"32A3":["BRITE CORRETORA DE SEG PRESTACOES SERV LTDA","SAO PAULO"],"34A3":["MARCOS ROBERTO DE OLIVEIRA LEME","SAO B. DO CAMPO|SAO PAULO"],"35A9":["CLAREZA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"36A5":["RM CONSULTORIA E CORRETORA DE SEGUROS LTDA","SAO PAULO"],"374A":["L M F DA SILVA MARQUES","SAO PAULO"],"376A":["PRYOR INSURANCE CORRETORA DE SEGUROS LTDA.","SAO PAULO"],"37A2":["FORTTES CORRETORA DE SEGUROS LTDA","JUNDIAI"],"37AA":["JRX CORRETORA DE SEGUROS SLU LTDA","SAO PAULO"],"389A":["LTS CORRETAGEM DE SEGUROS LTDA","SAO PAULO"],"38A5":["FAMILIA MAIS SAUDE ADM PLANOS DE SAUDE LTDA","SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|CAMPINAS|MOGI DAS CRUZES|RIO DE JANEIRO"],"395A":["THERA CORRETORA DE SEGUROS LTDA","SAO PAULO"],"396A":["MSECURE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"397A":["SABER CUIDAR CORRETORA DE SEGUROS LTDA","SANTOS"],"3A19":["MATRIZ SAUDE E ODONTOLOGIA LTDA","RIO DE JANEIRO|SAO PAULO|SOROCABA|CAMPINAS|SAO B. DO CAMPO"],"3A21":["GRANDGUARD CORRETORA DE SEGUROS LTDA","SAO PAULO"],"3A62":["CORRETORA VIVER PLANOS SAUDE QUALID VIDA LTDA","JUNDIAI|MOGI DAS CRUZES|SAO B. DO CAMPO|SAO PAULO|SOROCABA|RIO DE JANEIRO|CAMPINAS"],"3A81":["GSASEG CONSULTORIA CORRETOR SEG PLAN SAU LTDA","SAO PAULO"],"3A8A":["FEMAVI CORRETORA DE SEGUROS LTDA","SAO PAULO"],"3A95":["FARABENS SOLUCOES EM CREDITO LTDA","MOGI DAS CRUZES"],"3A9A":["MACER CORRETORA DE SEGUROS LTDA","SAO PAULO"],"41A7":["DUE CORRETORA DE SEGUROS LTDA","SAO PAULO"],"42AA":["ZEERIT CORRETORA DE SEGUROS LTDA","SAO PAULO"],"439A":["LUHE BROKER SEGUROS LTDA","SAO PAULO"],"43A2":["ARIANE COSTA BUENO CORRETAGEM DE SEGUROS LTDA","SAO PAULO|SOROCABA"],"44A2":["DANTAS E SANTOS PLANOS DE SAUDE LTDA","MOGI DAS CRUZES|SAO PAULO"],"44A7":["MACHADO F6 CORRETORA DE SEGUROS LTDA","SAO PAULO"],"459A":["EX CONSULTORIA EM PLANOS DE SAUDE LTDA","SAO B. DO CAMPO|SAO PAULO|MOGI DAS CRUZES"],"45A2":["SECURECORP SEGUROS E INVESTIMENTOS LTDA","SAO PAULO"],"46A3":["YESCOR CONSULTORIA LTDA","SAO PAULO"],"46A6":["LUMINUS EXPERIENCE CONSULTORIA E INTERMEDIACA","JUNDIAI|RIO DE JANEIRO|SAO PAULO"],"48A8":["SEGURO FACIL ADMINISTRADORA E CORRETORA DE SE","SAO PAULO"],"495A":["PAULINETTI FERREIRA LTDA","JUNDIAI|SAO PAULO"],"4A29":["JIMENEZ SAUDE CONSORCIO E RE LTDA","SAO B. DO CAMPO|SAO PAULO"],"4A35":["DALCIA MARIA FERNANDES DA SILVA CORRETORA DE SEGUROS","SAO PAULO"],"4A39":["INSIGHT BUSINESS LTDA","SAO PAULO"],"4A46":["GIANCHETTA CORRETORA SEG CORRESPOND BANC LTDA","SAO PAULO"],"4A53":["VIDA SAUDE CORRETORA DE PLANOS LTDA","JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SANTOS|SAO B. DO CAMPO|SAO PAULO|SOROCABA|CAMPINAS"],"4A6A":["PECHIR CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"4A7A":["SEGNOVA CORRETORA E CONSULTORIA EM SEGUROS LT","SAO PAULO|MOGI DAS CRUZES"],"4A81":["FJA SEGUROS E CONSULTORIA LTDA","SAO PAULO|SAO B. DO CAMPO"],"4A82":["PROTECAO FUTURA CORRETORA DE SEGUROS LTDA","RIO DE JANEIRO"],"4A93":["PARTHENON CONSULTORIA BENEFIC CORRET SEG LTDA","SAO PAULO"],"4A99":["SHANKARA VIDA E SAUDE CORRETORA SEGUROS LTDA","SAO PAULO|SOROCABA|CAMPINAS"],"4AA5":["ATMA CORRETORA E ADMINISTRADORA DE SEGUROS","SAO PAULO"],"4AA8":["YSC GESTAO EM VENDAS LTDA","AMERICANA|CAMPINAS|JUNDIAI|MOGI DAS CRUZES|RIO DE JANEIRO|SAO B. DO CAMPO|SAO PAULO|SOROCABA|SAO JOSE DOS CAMPOS"],"4AAA":["PRI.ON ASSESSORIA SAUDE LTDA","SAO B. DO CAMPO|SAO PAULO"],"51A4":["PUCHTA CONSULTORIA E CORRETORA DE SEGUROS LTD","SAO PAULO"],"536A":["JUMBO CORRETORA DE SEGUROS LTDA","SAO PAULO"],"53AA":["CORRETORA REDE SAUDE C. PLANOS DE SAUDE LTDA","JUNDIAI|RIO DE JANEIRO|SAO PAULO"],"5482":["ATHENA INSURANCE SERVICOS LTDA","SAO PAULO"],"5483":["TJ CORRETORA E CONSULTORIA EM PLANO DE SAUDE","SAO PAULO"],"5499":["FLUYRA CONSULTORIA EM BENEFICIOS E CORRETORA","SAO PAULO"],"54A9":["DERLAN DO NASCIMENTO LTDA","CAMPINAS"]};
  const intSeedCache = {};
  // Atribui os códigos do mês aos executivos pela Carteira ATUAL (mesma regra do import normal).
  // Cache por mês enquanto a Carteira for o mesmo objeto.
  function seedRes(mo){
    const raw = INT_CODE_SEED[mo], carteira = window.CARTEIRA_MAP;
    if (!raw || !carteira || !window.attributeCorretorasAgg) return null;
    const hit = intSeedCache[mo];
    if (hit && hit.carteira === carteira) return hit.res;
    const agg = {};
    Object.entries(raw).forEach(([cod, a]) => {
      const ind = a[0] || 0, ss = a[1] || 0, pme = a[2] || 0, adm = a[3] || 0;
      const info = INT_CODE_INFO[cod];
      agg[cod] = { nome: INT_CODE_NAMES[cod] || (info ? info[0] : ''), filiais: new Set(info && info[1] ? info[1].split('|') : []), ind, ss, pme, adm, total: ind + ss + pme };
    });
    const r = window.attributeCorretorasAgg(agg, carteira);
    // Nome em branco (código sem info embutida): usa a razão social da Carteira.
    Object.values(r.byGestor).forEach(v => v.corretoras.forEach(c => {
      if (!c.n){ const e = (carteira.byCodigo[c.c] || [])[0]; c.n = e ? e.razao : c.c; }
      // A lista de cidades embutida é a de Jan–Mai inteiro (não do mês): com mais de uma, só
      // dá pra dizer "Diversas" — a contagem exata por mês não é conhecida.
      const inf = INT_CODE_INFO[c.c];
      if (inf && inf[1] && inf[1].indexOf('|') >= 0) c.filial = 'Diversas';
    }));
    // Integrado por executivo = IND+SS+PME+ADM
    const hist = {};
    Object.entries(r.byGestor).forEach(([g, v]) => { hist[g] = { ind:v.ind, ss:v.ss, pme:v.pme, adm:v.adm, total:v.ind + v.ss + v.pme + v.adm }; });
    const res = { hist, r };
    intSeedCache[mo] = { carteira, res };
    return res;
  }
  function seedHist(mo){ const x = seedRes(mo); return x ? x.hist : null; }  // Meses entregues junto com o código (1º tri digitado dos prints; 2º/3º tri lidos dos arquivos
  // reais). Um import novo do mesmo mês (META_EXEC_BY_MONTH) sempre vale mais que o seed.
  // Formato compacto [nome, IND, SS, PME, ADM, TOTAL] por executivo — expandido logo abaixo.
  // 2026-01..03: digitado dos prints (Izabele = linhas ABC + BX somadas; equipe da Cida/Interior
  // fora). 2026-04..09: lido pelo parser acima dos arquivos reais "2º TRI (2)" e "3º TRI (1)".
  const META_EXEC_SEED = (function(){
    const c = {"2026-01":{"Camila Foiadelli (Plataforma)":[["Wilder Coca Patzi",498,811,147,30,1487],["Patricia Monks",498,811,147,30,1487],["Camila Alves Pertinhez",644,1048,190,38,1920],["Erika de Sousa Silva",436,710,129,26,1301]],"Leonardo Mariano (ABC)":[["Izabele de Oliveira da Silva",727,1183,215,43,2168],["Vivian de Cassia Ambrosio",888,1446,262,53,2650]],"Estevão Cardoso (Cauda Longa)":[["Agatha Sakamoto",239,389,71,14,712],["Lais dos Santos Martins",228,372,67,14,682],["Jonathan Leal",291,473,86,17,867],["Pablo Amora",280,456,83,17,836]],"Marcelo Lima (Digital)":[["Karollainny Rangel de Sousa Lopes",138,225,41,8,413],["Daniela Frederico Martins",150,244,44,9,447],["Daniela Novais dos Santos",138,225,41,9,413],["Guilherme de Lima Musachi",150,244,44,9,447]]},"2026-02":{"Camila Foiadelli (Plataforma)":[["Wilder Coca Patzi",501,817,148,30,1496],["Patricia Monks",501,817,148,29,1495],["Camila Alves Pertinhez",648,1055,191,39,1933],["Erika de Sousa Silva",439,715,130,26,1310]],"Leonardo Mariano (ABC)":[["Izabele de Oliveira da Silva",720,1173,348,43,2284],["Vivian de Cassia Ambrosio",692,1127,158,41,2018]],"Estevão Cardoso (Cauda Longa)":[["Agatha Sakamoto",260,423,77,15,775],["Lais dos Santos Martins",248,405,73,15,741],["Jonathan Leal",316,515,93,19,943],["Pablo Amora",305,497,90,19,911]],"Marcelo Lima (Digital)":[["Karollainny Rangel de Sousa Lopes",136,221,40,8,405],["Daniela Frederico Martins",147,239,43,9,438],["Daniela Novais dos Santos",136,221,40,9,405],["Guilherme de Lima Musachi",147,239,43,9,438]]},"2026-03":{"Camila Foiadelli (Plataforma)":[["Wilder Coca Patzi",499,793,147,29,1468],["Patricia Monks",499,793,147,29,1468],["Camila Alves Pertinhez",645,1024,190,38,1897],["Erika de Sousa Silva",437,694,128,26,1285]],"Leonardo Mariano (ABC)":[["Izabele de Oliveira da Silva",717,1138,211,42,2108],["Vivian de Cassia Ambrosio",689,1094,202,41,2026]],"Estevão Cardoso (Cauda Longa)":[["Agatha Sakamoto",259,411,76,15,761],["Lais dos Santos Martins",247,393,89,15,744],["Jonathan Leal",304,500,73,18,895],["Pablo Amora",315,482,76,19,892]],"Marcelo Lima (Digital)":[["Karollainny Rangel de Sousa Lopes",135,214,40,8,397],["Amanda dos Santos Sobral",146,232,43,9,430],["Daniela Novais dos Santos",135,214,40,9,397],["Guilherme de Lima Musachi",146,232,43,9,430]]},"2026-04":{"Camila Foiadelli (Plataforma)":[["Camila Alves Pertinhez",827.45,1314.18,243.37,48.67,2433.67],["Erika de Sousa Silva",469.63,745.89,138.13,27.63,1381.27],["Wilder Coca Patzi",514.36,816.92,151.28,30.26,1512.82],["Lais dos Santos Martins",424.91,674.85,124.97,24.99,1249.72]],"Leonardo Mariano (ABC)":[["Vivian de Cassia Ambrosio",649.75,1031.95,191.1,38.22,1911.03],["Izabele de Oliveira da Silva",664.86,1055.95,195.55,39.11,1955.47],["Guilherme de Lima Musachi",196.44,311.99,57.78,11.56,577.75]],"Estevão Cardoso (Cauda Longa)":[["Jonathan Leal",326.39,518.38,96,19.2,959.96],["Pablo Amora",290.12,460.78,85.33,17.07,853.3],["Patricia Monks",302.21,479.98,88.89,17.78,888.85],["Agatha Sakamoto",290.12,460.78,85.33,17.07,853.3]],"Marcelo Lima (Digital)":[["Amanda dos Santos Sobral",84.62,134.39,24.89,4.98,248.88],["Daniela Novais dos Santos",247.81,393.58,72.89,14.58,728.86],["Karollanny Rangel de Sousa Lopes",187.37,297.59,55.11,11.02,551.09],["Maxuel",84.62,134.39,24.89,4.98,248.88]]},"2026-05":{"Camila Foiadelli (Plataforma)":[["Camila Alves Pertinhez",834.9,1326.01,245.56,49.11,2455.58],["Erika de Sousa Silva",473.86,752.6,139.37,27.87,1393.7],["Wilder Coca Patzi",518.99,824.28,152.64,30.53,1526.44],["Patricia Monks",428.73,680.92,126.1,25.22,1260.97]],"Leonardo Mariano (ABC)":[["Vivian de Cassia Ambrosio",655.6,1041.24,192.82,38.56,1928.23],["Izabele de Oliveira da Silva",670.84,1065.46,197.31,39.46,1973.07],["Guilherme de Lima Musachi",198.2,314.79,58.3,11.66,582.95]],"Estevão Cardoso (Cauda Longa)":[["Jonathan Leal",329.32,523.04,96.86,19.37,968.6],["Pablo Amora",292.73,464.93,86.1,17.22,860.98],["Lais dos Santos Martins",304.93,484.3,89.69,17.94,896.85],["Agatha Sakamoto",292.73,464.93,86.1,17.22,860.98]],"Marcelo Lima (Digital)":[["Amanda dos Santos Sobral",85.38,135.6,25.11,5.02,251.12],["Daniela Novais dos Santos",250.04,397.13,73.54,14.71,735.42],["Karollanny Rangel de Sousa Lopes",189.06,300.27,55.6,11.12,556.05],["Maxuel",85.38,135.6,25.11,5.02,251.12]]},"2026-06":{"Camila Foiadelli (Plataforma)":[["Camila Alves Pertinhez",909.93,1445.18,267.63,53.53,2676.26],["Erika de Sousa Silva",516.45,820.24,151.9,30.38,1518.96],["Wilder Coca Patzi",565.63,898.35,166.36,33.27,1663.62],["Lais dos Santos Martins",467.26,742.12,137.43,27.49,1374.29]],"Leonardo Mariano (ABC)":[["Vivian de Cassia Ambrosio",697.9,1108.43,205.26,41.05,2052.64],["Izabele de Oliveira da Silva",780.98,1240.38,229.7,45.94,2297.01],["Guilherme de Lima Musachi",182.78,290.3,53.76,10.75,537.6]],"Estevão Cardoso (Cauda Longa)":[["Jonathan Leal",358.92,570.05,105.56,21.11,1055.65],["Pablo Amora",319.04,506.71,93.84,18.77,938.35],["Patricia Monks",332.33,527.82,97.75,19.55,977.45],["Agatha Sakamoto",319.04,506.71,93.84,18.77,938.35]],"Marcelo Lima (Digital)":[["Amanda dos Santos Sobral",93.05,147.79,27.37,5.47,273.69],["Daniela Novais dos Santos",272.51,432.81,80.15,16.03,801.51],["Karollainny Rangel de Sousa Lopes",206.05,327.25,60.6,12.12,606.02],["Maxuel Pimentel Nobrega",93.05,147.79,27.37,5.47,273.69]]},"2026-07":{"Camila Foiadelli (Plataforma)":[["Camila Alves Pertinhez",904.61,1436.73,266.06,53.21,2660.6],["Erika de Sousa Silva",487.1,773.62,143.26,28.65,1432.63],["Wilder Coca Patzi",440.71,699.94,129.62,25.92,1296.19],["Lais dos Santos Martins",487.1,773.62,143.26,28.65,1432.63]],"Leonardo Mariano (ABC)":[["Vivian de Cassia Ambrosio",673.91,1070.33,198.21,39.64,1982.09],["Izabele de Oliveira da Silva",689.58,1095.22,202.82,40.56,2028.18],["Guilherme de Lima Musachi",203.74,323.59,59.92,11.98,599.24]],"Estevão Cardoso (Cauda Longa)":[["Jonathan Leal",325.98,517.74,95.88,19.18,958.78],["Pablo Amora",313.45,497.83,92.19,18.44,921.9],["Patricia Monks",288.37,458,84.81,16.96,848.15],["Agatha Sakamoto",325.98,517.74,95.88,19.18,958.78]],"Marcelo Lima (Digital)":[["Amanda dos Santos Sobral",87.76,139.39,25.81,5.16,258.13],["Daniela Novais dos Santos",238.22,378.35,70.06,14.01,700.64],["Karollanny Rangel de Sousa Lopes",213.14,338.52,62.69,12.54,626.89],["Maxuel Pimentel Nobrega",87.76,139.39,25.81,5.16,258.13]]},"2026-08":{"Camila Foiadelli (Plataforma)":[["Camila Alves Pertinhez",876.84,1392.62,257.89,51.58,2578.93],["Erika de Sousa Silva",472.14,749.87,138.87,27.77,1388.65],["Wilder Coca Patzi",427.18,678.46,125.64,25.13,1256.4],["Lais dos Santos Martins",472.14,749.87,138.87,27.77,1388.65]],"Leonardo Mariano (ABC)":[["Vivian de Cassia Ambrosio",653.22,1037.47,192.12,38.42,1921.24],["Izabele de Oliveira da Silva",668.41,1061.6,196.59,39.32,1965.92],["Guilherme de Lima Musachi",197.49,313.65,58.08,11.62,580.84]],"Estevão Cardoso (Cauda Longa)":[["Jonathan Leal",315.98,501.85,92.93,18.59,929.34],["Pablo Amora",303.82,482.54,89.36,17.87,893.6],["Patricia Monks",279.52,443.94,82.21,16.44,822.11],["Agatha Sakamoto",315.98,501.85,92.93,18.59,929.34]],"Marcelo Lima (Digital)":[["Amanda dos Santos Sobral",85.07,135.11,25.02,5,250.21],["Daniela Novais dos Santos",230.91,366.73,67.91,13.58,679.14],["Karollainny Rangel de Sousa Lopes",206.6,328.13,60.76,12.15,607.65],["Maxuel Pimentel Nobrega",85.07,135.11,25.02,5,250.21]]},"2026-09":{"Camila Foiadelli (Plataforma)":[["Camila Alves Pertinhez",851.57,1352.49,250.46,50.09,2504.62],["Erika de Sousa Silva",458.54,728.27,134.86,26.97,1348.64],["Wilder Coca Patzi",414.87,658.91,122.02,24.4,1220.2],["Lais dos Santos Martins",458.54,728.27,134.86,26.97,1348.64]],"Leonardo Mariano (ABC)":[["Vivian de Cassia Ambrosio",634.4,1007.57,186.59,37.32,1865.88],["Izabele de Oliveira da Silva",649.15,1031.01,190.93,38.19,1909.27],["Guilherme de Lima Musachi",191.79,304.62,56.41,11.28,564.1]],"Estevão Cardoso (Cauda Longa)":[["Jonathan Leal",306.87,487.38,90.26,18.05,902.56],["Pablo Amora",295.07,468.64,86.79,17.36,867.85],["Patricia Monks",271.46,431.15,79.84,15.97,798.42],["Agatha Sakamoto",306.87,487.38,90.26,18.05,902.56]],"Marcelo Lima (Digital)":[["Amanda dos Santos Sobral",82.62,131.22,24.3,4.86,243],["Daniela Novais dos Santos",224.25,356.17,65.96,13.19,659.57],["Karollanny Rangel de Sousa Lopes",200.65,318.67,59.01,11.8,590.14],["Maxuel Pimentel Nobrega",82.62,131.22,24.3,4.86,243]]}};
    const out = {};
    Object.entries(c).forEach(([mo, teams]) => { out[mo] = {}; Object.entries(teams).forEach(([t, l]) => { out[mo][t] = l.map(r => ({nome:r[0], ind:r[1], ss:r[2], pme:r[3], adm:r[4], total:r[5]})); }); });
    return out;
  })();
  const metaMonth = m => META_EXEC_BY_MONTH[m] || META_EXEC_SEED[m] || null;
  const allMonths = () => [...new Set([...Object.keys(META_EXEC_SEED), ...Object.keys(META_EXEC_BY_MONTH)])].sort();
  window.getMetaExecData = () => META_EXEC_BY_MONTH;

  const qOf = m => { const [y, mm] = m.split('-'); return y + '-Q' + Math.ceil(Number(mm) / 3); };
  const qMonths = q => { const [y, qq] = q.split('-Q'); const s = (Number(qq) - 1) * 3 + 1; return [0,1,2].map(i => y + '-' + String(s + i).padStart(2, '0')); };
  const qLabel = q => { const [y, qq] = q.split('-Q'); return qq + 'T' + y.slice(2); };
  const quarters = () => [...new Set(allMonths().map(qOf))].sort();
  const monthName = m => MES_CURTO[Number(m.slice(5)) - 1];

  // Mesma pessoa com o nome escrito diferente entre meses/arquivos ("Agatha Eiko Rodrigues
  // Sakamoto" x "Agatha Sakamoto", "Maxuel" x "Maxuel Pimentel Nobrega", "Karollanny" x
  // "Karollainny"): primeiro nome igual (tolera 2 letras de erro) e último sobrenome igual — ou um
  // dos dois nomes ter só uma palavra.
  function samePerson(a, b){
    const A = norm(a).split(' '), B = norm(b).split(' ');
    if (!A[0] || !B[0] || lev(A[0], B[0]) > 2) return false;
    if (A.length === 1 || B.length === 1) return true;
    return A[A.length - 1] === B[B.length - 1];
  }

  // Integrado de um executivo num mês, vindo do import normal do BI. null = mês nunca importado;
  // false = mês importado mas o nome não apareceu lá (trata como "sem dado", nunca como zero).
  function intFor(mo, nome){
    // Extrato "Corretoras" do mês GANHA do fechamento oficial do Excel: a visão é da carteira
    // (Carteira de hoje), então todos os meses seguem a mesma regra de atribuição, em vez de cada
    // mês herdar o dono que o Excel tinha na época (decidido com Victor, 2026-10-05). Ordem:
    // 1) INT_EXEC_BY_MONTH (campo "Integrado de meses passados"/Firestore), 2) extratos embutidos
    // Jan–Set (INT_CODE_SEED, ligados à Carteira atual), 3) fechamento oficial (MJ_TEAMS_BY_MONTH).
    const hist = INT_EXEC_BY_MONTH[mo] || seedHist(mo);
    if (hist){
      const k = Object.keys(hist).filter(n => samePerson(nome, n)).sort((a, b) => lev(norm(nome), norm(a)) - lev(norm(nome), norm(b)))[0];
      if (!k) return false;
      const h = hist[k];
      // Integrado = IND+SS+PME+ADM, recalculado aqui (extratos subidos antes de 06/10 gravaram sem ADM).
      return { ind:h.ind||0, ss:h.ss||0, pme:h.pme||0, adm:h.adm||0, total:(h.ind||0) + (h.ss||0) + (h.pme||0) + (h.adm||0) };
    }
    const teams = window.getMetaJunhoTeamsStrict ? window.getMetaJunhoTeamsStrict(mo) : null;
    if (!teams) return null;
    const alvo = norm(nome);
    let best = null, bd = 99;
    Object.values(teams).forEach(td => (td.members || []).forEach(m => {
      if (!samePerson(nome, m.nome)) return;
      const d = lev(alvo, norm(m.nome));
      if (d < bd){ bd = d; best = m; }
    }));
    if (!best) return false;
    const c = best.cat || {};
    const g = k => (c[k] && c[k].int) || 0;
    // Realizado = IND + SS + PME + ADM (Total do BI). Em 02/10/2026 a regra era SEM ADM; em
    // 06/10/2026 Victor decidiu INCLUIR o ADM (o RANKING ANUAL corrigido já soma; com ADM os 15
    // executivos × Jan–Set batem 100%, sem ADM só diferem Camila/Erika/Wilder/Patricia). Soma as
    // categorias em vez de usar best.total.int pra a definição não variar entre import oficial e
    // extrato cru. A Meta Total também inclui Adesão (ADM).
    return { ind:g('IND'), ss:g('SS'), pme:g('PME'), adm:g('ADM'), total: g('IND')+g('SS')+g('PME')+g('ADM') };
  }

  // Estrutura ATUAL = equipes do mês mais recente com meta carregada. A visão é da CARTEIRA, não do
  // executivo (Victor, 2026-10-02): todo trimestre mostra cada executivo na equipe em que ele está
  // hoje, mesmo que na época estivesse em outra; quem não está mais na estrutura atual (ex.: foi
  // pro Interior) não entra em nenhum trimestre. Quando entrar a meta de Outubro, "hoje" passa a
  // ser Outubro automaticamente.
  // Equipes/pessoas de HOJE = as do mês OFICIAL mais recente (Excel NDI SP, com os sêniores atuais); só se
  // não houver, cai na estrutura do último mês com meta.
  const structureNow = () => {
    const latest = window.getLatestKnownMonth ? window.getLatestKnownMonth() : null;
    const tm = latest && window.getMetaJunhoTeamsStrict ? window.getMetaJunhoTeamsStrict(latest) : null;
    if (tm && Object.keys(tm).length){
      const out = {};
      Object.entries(tm).forEach(([label, td]) => { out[label] = (td.members || []).map(m => ({ nome:m.nome })); });
      return out;
    }
    const ms = allMonths(); return ms.length ? metaMonth(ms[ms.length - 1]) : null;
  };
  function teamOfNow(nome){
    const md = structureNow();
    if (!md) return null;
    for (const [label, list] of Object.entries(md)){
      if (list.some(p => samePerson(p.nome, nome))) return label;
    }
    return null;
  }

  // qs = lista de trimestres (1 ou mais, ex.: ['2026-Q1','2026-Q2']): os meses de todos entram
  // na mesma tabela, somados (pedido do Victor, 2026-10-06).
  function buildQuarter(qs){
    const months = [...new Set([].concat(qs).flatMap(qMonths))].sort();
    const blank = () => months.map(() => null);
    const teams = {};
    months.forEach((mo, i) => {
      const md = metaMonth(mo);
      if (!md) return;
      Object.values(md).forEach(list => {
        list.forEach(p => {
          const label = teamOfNow(p.nome);
          if (!label) return;
          const t = teams[label] = teams[label] || {};
          let r = Object.values(t).find(x => samePerson(x.nome, p.nome));
          if (!r){ r = t[norm(p.nome)] = { nome:p.nome, slots:blank() }; }
          else if (p.nome.length > r.nome.length) r.nome = p.nome;
          r.slots[i] = { meta:p, int:intFor(mo, p.nome) };
        });
      });
    });
    // Visão da carteira: quem está na estrutura atual conta o Integrado de TODOS os meses do
    // trimestre, mesmo naqueles em que não tinha meta cadastrada (ex.: Amanda/Maxuel não aparecem
    // com meta em Jan/Fev, mas a carteira deles já vendia) — meta fica 0 nesses meses. Achado
    // conferindo contra o RANKING ANUAL (Victor, 2026-10-05).
    const atual = structureNow();
    if (atual) Object.entries(atual).forEach(([label, list]) => list.forEach(p => {
      const t = teams[label] || {};
      let r = Object.values(t).find(x => samePerson(x.nome, p.nome));
      months.forEach((mo, i) => {
        if (r && r.slots[i]) return;
        const it = intFor(mo, p.nome);
        if (!it || typeof it !== 'object') return;
        if (!r) r = t[norm(p.nome)] = { nome:p.nome, slots:blank() };
        r.slots[i] = { meta:{ nome:p.nome, ind:0, ss:0, pme:0, adm:0, total:0 }, int:it, semMeta:true };
      });
      if (Object.keys(t).length) teams[label] = t;
    }));
    return { months, teams };
  }

  // Agrega uma lista de linhas (executivos) — metaTot = meta de todos os meses; intTot/metaBase só
  // dos meses COM integrado (senão um trimestre sem BI importado apareceria como 0%).
  function aggregate(rows, n){
    const out = { metaTot:0, intTot:0, metaBase:0, nInt:0, cat:{ind:{m:0,i:0},ss:{m:0,i:0},pme:{m:0,i:0},adm:{m:0,i:0}},
      slots:Array.from({length:n}, () => ({hasMeta:false, has:false, meta:0, base:0, int:0})) };
    rows.forEach(r => r.slots.forEach((s, i) => {
      if (!s) return;
      const sl = out.slots[i];
      sl.hasMeta = true; sl.meta += s.meta.total; out.metaTot += s.meta.total;
      ['ind','ss','pme','adm'].forEach(k => { out.cat[k].m += s.meta[k]; });
      if (s.int){
        sl.has = true; sl.base += s.meta.total; sl.int += s.int.total;
        out.intTot += s.int.total; out.metaBase += s.meta.total; out.nInt++;
        ['ind','ss','pme','adm'].forEach(k => { out.cat[k].i += s.int[k]; });
      }
    }));
    return out;
  }

  const pcol = p => p >= 1 ? '#16B87A' : (p >= 0.7 ? '#FFB81C' : '#F5364A');

  function monthsHtml(agg, months){
    return `<div class="tri-months${agg.slots.length > 3 ? ' tri-months-many' : ''}">` + agg.slots.map((s, i) => {
      const lab = monthName(months[i]);
      if (!s.hasMeta) return `<div class="tri-month" title="${lab}: sem meta nesta equipe"><div class="tri-month-bar"></div><span>${lab}</span></div>`;
      if (!s.has) return `<div class="tri-month" title="${lab}: meta ${fmt0(s.meta)} — Integrado não importado"><div class="tri-month-bar"></div><span>${lab}</span></div>`;
      if (!s.base) return `<div class="tri-month" title="${lab}: sem meta cadastrada nesse mês — Integrado ${fmt0(s.int)}"><div class="tri-month-bar"></div><span>${lab}</span></div>`;
      const p = s.int / s.base;
      const h = Math.max(8, Math.min(100, p / 1.6 * 100));
      return `<div class="tri-month" title="${lab}: ${fmt0(s.int)} de ${fmt0(s.base)} (${pct1(p)})"><div class="tri-month-bar"><i style="height:${h}%; background:${pcol(p)};"></i></div><span>${lab}</span></div>`;
    }).join('') + '</div>';
  }
  function barHtml(agg){
    if (!agg.metaBase) return '<div class="tri-track"></div>';
    const p = agg.intTot / agg.metaBase;
    return `<div class="tri-track"><div class="tri-fill" style="width:${Math.min(100, p * 100).toFixed(0)}%; background:${pcol(p)};"></div></div>`;
  }
  function catTitle(agg){
    const L = {ind:'IND', ss:'SS', pme:'PME', adm:'ADM'};
    return ['ind','ss','pme','adm'].map(k => `${L[k]}: ${agg.metaBase ? fmt0(agg.cat[k].i) + ' / ' : 'meta '}${fmt0(agg.cat[k].m)}`).join(' · ');
  }

  // ---------- tela ----------
  // qs = trimestres selecionados (um ou mais — clicar em outro trimestre soma, clicar de novo tira)
  const state = { mode:'mes', qs:[] };
  const $ = id => document.getElementById(id);
  // Os campos "Metas por Executivo" e "Integrado de meses passados" carregam direto, sem passar por Processar Arquivos →
  // Confirmar Atualização — que é o que normalmente revela o botão Publicar. Sem isto o Victor não tinha como publicar (06/10/2026).
  function mostrarPublicar(){
    const ps = $('publishStep'); if (!ps) return;
    ps.style.display = 'block';
    const isAdmin = window.__userRole__ === 'admin';
    if ($('publishAdminControls')) $('publishAdminControls').style.display = isAdmin ? 'block' : 'none';
    if ($('publishNonAdminMsg')) $('publishNonAdminMsg').style.display = isAdmin ? 'none' : 'block';
    try { ps.scrollIntoView({block:'nearest'}); } catch(e){}
  }

  function renderBar(){
    const el = $('mjPeriodBtns');
    if (!el) return;
    const qs = quarters();
    const ref = window.getCurrentMonthLabelSlash ? window.getCurrentMonthLabelSlash() : '';
    el.innerHTML = `<button type="button" class="tri-btn${state.mode === 'mes' ? ' active' : ''}" data-mode="mes">Mês${ref ? ' — ' + ref : ''}</button>` +
      (qs.length ? '<span class="tri-btn-sep"></span>' : '') +
      qs.map(q => `<button type="button" class="tri-btn${state.mode === 'tri' && state.qs.includes(q) ? ' active' : ''}" data-q="${q}" title="${state.qs.includes(q) && state.mode === 'tri' ? 'Clique pra tirar este trimestre da soma' : 'Trimestre: ' + qMonths(q).map(monthName).join(' + ') + ' — clique em mais de um pra somar'}">${qLabel(q)}</button>`).join('') +
      (qs.length > 1 ? `<span class="tri-bar-hint">${state.mode === 'tri' && state.qs.length > 1 ? 'Somando ' + state.qs.map(qLabel).join(' + ') : 'Dica: clique em mais de um trimestre pra somar'}</span>` : '');
  }

  function renderTri(){
    const sel = state.qs.filter(q => quarters().includes(q)).sort();
    const multi = sel.length > 1;
    const { months, teams } = buildQuarter(sel);
    const N = months.length;
    const cur = window.getMjCurrentTeam ? window.getMjCurrentTeam() : 'ALL_TEAMS';
    const ordIdx = l => { const i = ORDEM_TIPOS.indexOf(tipoTime(l)); return i < 0 ? 99 : i; };
    let labels = Object.keys(teams).sort((a, b) => ordIdx(a) - ordIdx(b));
    // Equipe selecionada na tela (pode ser de um mês antigo, com outro sênior): casa pelo TIPO do time.
    const scopedKey = cur !== 'ALL_TEAMS' ? labels.find(l => teams[l] && tipoTime(l) && tipoTime(l) === tipoTime(cur)) : null;
    const scoped = !!scopedKey;
    if (scoped) labels = [scopedKey];

    const rowsByTeam = {};
    labels.forEach(l => { rowsByTeam[l] = Object.values(teams[l]).sort((a, b) => aggregate([b], N).metaTot - aggregate([a], N).metaTot); });
    const allRows = labels.flatMap(l => rowsByTeam[l]);
    const tot = aggregate(allRows, N);
    const nMeses = tot.slots.filter(s => s.hasMeta).length;
    const nInt = tot.slots.filter(s => s.has).length;
    const lab = sel.map(qLabel).join(' + ');
    const nomesMeses = months.map(monthName).join(' + ');
    const per = multi ? 'do Período' : 'do Trimestre';

    $('mjTriTitle').textContent = `Meta vs. Integrado por Executivo — ${lab}`;
    $('mjTriSub').textContent = `${scoped ? scopedKey : 'Todas as equipes (sem Interior)'} · ${nomesMeses} somados · passe o mouse numa linha pra ver por categoria`;
    $('mjTriThMeta').textContent = `Meta ${lab}`;
    $('mjTriThInt').textContent = `Integrado ${lab}`;

    const pctAting = tot.metaBase ? tot.intTot / tot.metaBase : null;
    const gap = Math.max(0, tot.metaBase - tot.intTot);
    const kpiHtml = (icon, label, value, sub, cls) => `<div class="kpi"><div class="kpi-icon">${icon}</div><div class="label">${label}</div><div class="value">${value}</div><div class="sub ${cls || ''}">${sub}</div></div>`;
    $('mjTriKpis').innerHTML = [
      kpiHtml('<i class=ic-target></i>', `Meta ${per}`, fmt0(tot.metaTot) + ' vidas', `${lab} · ${nMeses} de ${N} meses com meta`, nMeses < N ? 'warn' : ''),
      kpiHtml('<i class=ic-check></i>', 'Integrado (Realizado)', nInt ? fmt0(tot.intTot) + ' vidas' : '—', nInt ? `Em ${nInt} de ${nMeses} meses` : (multi ? 'Nenhum mês deste período importado' : 'Nenhum mês deste trimestre importado'), nInt === nMeses && nInt ? 'pos' : 'warn'),
      kpiHtml('<i class=ic-chart></i>', '% Atingimento', pctAting == null ? '—' : pct1(pctAting), pctAting == null ? 'Sem Integrado pra comparar' : (nInt < nMeses ? 'Só sobre os meses com Integrado' : (pctAting >= 1 ? 'Acima de 100%' : 'Faltam ' + pct1(1 - pctAting) + ' p/ meta')), pctAting != null && pctAting >= 1 ? 'pos' : 'neg'),
      kpiHtml('<i class=ic-warn></i>', 'Gap p/ Meta', pctAting == null ? '—' : fmt0(gap) + ' vidas', pctAting == null ? 'Sem Integrado pra comparar' : (nInt < nMeses ? 'Só sobre os meses com Integrado' : (multi ? 'No período' : 'No trimestre')), 'neg'),
    ].join('');

    const td = (html, cls) => `<td${cls ? ` class="${cls}"` : ''}>${html}</td>`;
    const numCells = a => td(fmt0(a.metaTot), 'num') + td(a.nInt ? fmt0(a.intTot) : '<span class="tri-dim">—</span>', 'num') + td(a.metaBase ? `<b style="color:${pcol(a.intTot / a.metaBase)};">${pct1(a.intTot / a.metaBase)}</b>` : '<span class="tri-dim">—</span>', 'num');
    let body = '';
    labels.forEach(l => {
      const a = aggregate(rowsByTeam[l], N);
      if (!scoped) body += `<tr class="tri-team-row"><td>${l}</td><td>${barHtml(a)}</td><td>${monthsHtml(a, months)}</td>${numCells(a)}</tr>`;
      rowsByTeam[l].forEach(r => {
        const a2 = aggregate([r], N);
        const presentes = r.slots.map((s, i) => s ? monthName(months[i]) : null).filter(Boolean);
        const parcial = presentes.length < N ? ` <span class="tri-dim" title="Esteve nesta equipe só nestes meses do período">(${presentes.join('·')})</span>` : '';
        body += `<tr title="${catTitle(a2)}">${td(r.nome + parcial)}${td(barHtml(a2))}${td(monthsHtml(a2, months))}${numCells(a2)}</tr>`;
      });
    });
    if (!scoped && labels.length > 1) body += `<tr class="tri-total-row"><td>Total — todas as equipes</td><td>${barHtml(tot)}</td><td>${monthsHtml(tot, months)}</td>${numCells(tot)}</tr>`;
    if (!body) body = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px;">Sem meta carregada pra este período/equipe.</td></tr>';
    $('mjTriBody').innerHTML = body;

    const semInt = tot.slots.map((s, i) => (s.hasMeta && !s.has) ? MES_LONGO[Number(months[i].slice(5)) - 1] : null).filter(Boolean);
    const semCarteira = !window.CARTEIRA_MAP && months.some(m => INT_CODE_SEED[m]);
    $('mjTriNote').innerHTML = (semInt.length ? `Integrado ainda não importado pra: <b>${semInt.join(', ')}</b> — a meta aparece, o Integrado e o % não são inventados. ` + (semCarteira ? 'Os extratos de Jan–Set já vêm embutidos, mas a <b>Carteira não está carregada</b> neste painel — sem ela não dá pra ligar corretora → executivo: suba a "Carteira / Gestores" em Atualizar Dados e confirme. ' : 'Pra completar, importe o Extrato do BI desse mês em Atualizar Dados. ') : '') +
      'Equipe Interior não entra. Visão da carteira: cada executivo aparece na equipe em que está hoje, em todos os trimestres.';
  }

  function apply(){
    const view = document.getElementById('viewMj');
    if (!view) return;
    state.qs = state.qs.filter(q => quarters().includes(q));
    const tri = state.mode === 'tri' && state.qs.length > 0;
    if (state.mode === 'tri' && !tri) state.mode = 'mes';
    const keep = [view.children[0], $('mjPeriodBar'), $('mjTriPanel')];
    [...view.children].forEach(el => { if (keep.indexOf(el) < 0) el.style.display = tri ? 'none' : ''; });
    const stats = $('mjBannerStats');
    if (stats) stats.style.display = tri ? 'none' : '';
    $('mjTriPanel').style.display = tri ? '' : 'none';
    if (tri) renderTri();
  }

  // ---------- meses RECONSTRUÍDOS (Jan–Mai/26) pro seletor "Mês de referência" ----------
  // Sem fechamento oficial do Excel, o mês é montado em memória: estrutura de equipes/cores = a do
  // mês oficial mais recente (visão da carteira), Meta = META_EXEC_SEED, Integrado = extratos do BI
  // embutidos ligados à Carteira atual. Mês com fechamento oficial (Jun–Set) NÃO é mexido (opção A,
  // Victor 2026-10-06). Nada disso vai pro Firestore (ver getPublishableState/MJ_SYNTH).
  let synthCarteira = null;
  const histFor = mo => INT_EXEC_BY_MONTH[mo] || seedHist(mo);
  function pickByPerson(map, nome){
    const keys = Object.keys(map || {}).filter(n => samePerson(nome, n)).sort((a, b) => lev(norm(nome), norm(a)) - lev(norm(nome), norm(b)));
    return keys.length ? map[keys[0]] : null;
  }
  function buildSynthMonth(mo, baseTeams){
    const md = metaMonth(mo), res = seedRes(mo);
    if (!md || !res) return null;
    const metas = Object.values(md).reduce((a, l) => a.concat(l), []);
    const hist = histFor(mo) || {};
    const zeroCat = () => ({ IND:{meta:0,int:0}, SS:{meta:0,int:0}, PME:{meta:0,int:0}, ADM:{meta:0,int:0} });
    const teams = {};
    Object.keys(baseTeams).forEach(label => {
      const members = [];
      const tot = { cat: zeroCat(), meta:0, int:0 };
      (baseTeams[label].members || []).forEach(bm => {
        const p = metas.find(x => samePerson(x.nome, bm.nome));
        const h = pickByPerson(hist, bm.nome);
        if (!p && !h) return;
        const m = p || { ind:0, ss:0, pme:0, adm:0, total:0 };
        const i = h || { ind:0, ss:0, pme:0, adm:0 };
        const cat = {
          IND:{meta:m.ind, int:i.ind}, SS:{meta:m.ss, int:i.ss}, PME:{meta:m.pme, int:i.pme}, ADM:{meta:m.adm, int:i.adm || 0},
        };
        const intT = i.ind + i.ss + i.pme + (i.adm || 0);
        members.push({ nome: bm.nome, cor: bm.cor, cat, total:{ meta:m.total, int:intT } });
        ['IND','SS','PME','ADM'].forEach(k => { tot.cat[k].meta += cat[k].meta; tot.cat[k].int += cat[k].int; });
        tot.meta += m.total; tot.int += intT;
      });
      if (members.length) teams[label] = { members, total: tot };
    });
    if (!Object.keys(teams).length) return null;
    const corretoras = {};
    Object.entries(res.r.byGestor).forEach(([g, v]) => {
      corretoras[g] = v.corretoras.filter(c => c.total > 0).map(c => ({ c:c.c, n:c.n, ind:c.ind, ss:c.ss, pme:c.pme, total:c.total, filial:c.filial }));
    });
    const sc = res.r.semGestorCat || {};
    return { teams, corretoras, naoAtribuido: { ind:sc.ind || 0, ss:sc.ss || 0, pme:sc.pme || 0, adm:sc.adm || 0 } };
  }
  function synthMonths(){
    synthCarteira = window.CARTEIRA_MAP || null;
    if (!window.mjSetSynthMonths || !window.getLatestKnownMonth || !window.getMetaJunhoData) return;
    const out = {};
    const latest = window.getLatestKnownMonth();
    const baseTeams = latest ? window.getMetaJunhoData(latest).teams : null;
    if (synthCarteira && baseTeams){
      Object.keys(INT_CODE_SEED).sort().forEach(mo => {
        if (window.getMetaJunhoTeamsStrict(mo)) return;          // mês com fechamento oficial: fica como está
        let d = null;
        try { d = buildSynthMonth(mo, baseTeams); } catch(e){ console.warn('Mês reconstruído ' + mo + ' falhou:', e); }
        if (d) out[mo] = d;
      });
    }
    window.mjSetSynthMonths(out);
  }
  // Ranking de Vendas do mês reconstruído: linhas por corretora no formato do RANKDATA (m/mc por
  // índice de mês, 0 = Jan/2025), Total COM ADM (igual ao Ranking do fechamento oficial). Escopo =
  // as 4 equipes (Interior/Rio fora). Mês anterior: do extrato do mês de antes; pra Janeiro
  // (Dez/25), do histórico por corretora da Elegibilidade (sem ADM).
  const prevMonthOf = mo => { let y = Number(mo.slice(0, 4)), m = Number(mo.slice(5)) - 1; if (m < 1){ m = 12; y--; } return y + '-' + String(m).padStart(2, '0'); };
  window.rankSynthRows = function(mo){
    const res = seedRes(mo);
    if (!res) return null;
    const hit = intSeedCache[mo];
    if (hit.rank) return hit.rank;
    const idx = (Number(mo.slice(0, 4)) - 2025) * 12 + Number(mo.slice(5)) - 1;
    const raw = INT_CODE_SEED[mo];
    const sum4 = a => a ? (a[0] || 0) + (a[1] || 0) + (a[2] || 0) + (a[3] || 0) : 0;
    const pmo = prevMonthOf(mo), praw = INT_CODE_SEED[pmo] || null, pres = praw ? seedRes(pmo) : null;
    // Sem extrato do mês anterior (Janeiro → Dez/25): o histórico da Elegibilidade só cobre a
    // carteira Cauda Longa, então não serve de base; rows.hasPrev=false desliga a comparação.
    const prevOf = code => praw ? sum4(praw[code]) : 0;
    const rows = [], seen = new Set();
    const add = (c, g, nome) => {
      if (seen.has(c)) return; seen.add(c);
      const a = raw[c];
      const cur = sum4(a), prev = prevOf(c);
      if (cur <= 0 && prev <= 0) return;
      const m = []; m[idx] = cur; m[idx - 1] = prev;
      const mc = { ind:[], pim:[], mid:[], adm:[] };
      mc.ind[idx] = a ? (a[0] || 0) : 0; mc.pim[idx] = a ? (a[1] || 0) : 0; mc.mid[idx] = a ? (a[2] || 0) : 0; mc.adm[idx] = a ? (a[3] || 0) : 0;
      rows.push({ c, n:nome, g, cur, prev, ind:mc.ind[idx], pim:mc.pim[idx], mid:mc.mid[idx], adm:mc.adm[idx], m, mc });
    };
    Object.entries(res.r.byGestor).forEach(([g, v]) => v.corretoras.forEach(c => add(c.c, g, c.n)));
    if (pres) Object.entries(pres.r.byGestor).forEach(([g, v]) => v.corretoras.forEach(c => add(c.c, g, c.n)));
    rows.sort((a, b) => b.cur - a.cur);
    rows.hasPrev = !!praw;
    hit.rank = rows;
    return rows;
  };
  // Chips dos sêniores no cabeçalho (Sêniores ▾): montados a partir dos times do mês, pra seguir quem é o sênior
  // de cada equipe (06/10/2026: Cauda Longa -> Marcelo Lima, Digital -> Maria Aparecida).
  function renderSeniorChips(){
    const grid = document.querySelector('#dhTeamList .dh-team-grid');
    if (!grid || !window.getMetaJunhoData) return;
    const teams = window.getMetaJunhoData().teams || {};
    const labels = Object.keys(teams).sort((a, b) => { const f = l => { const i = ORDEM_TIPOS.indexOf(tipoTime(l)); return i < 0 ? 99 : i; }; return f(a) - f(b); });
    if (!labels.length) return;
    grid.innerHTML = '';
    labels.forEach(l => {
      const nome = l.replace(/\s*\([^)]*\)\s*$/, '');
      const ini = nome.split(/\s+/).map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
      const d = document.createElement('div'); d.className = 'dh-team-member';
      const av = document.createElement('div'); av.className = 'dh-avatar'; av.textContent = ini;
      const sp = document.createElement('span'); sp.textContent = nome;
      d.appendChild(av); d.appendChild(sp);
      d.addEventListener('click', () => { if (window.jumpToMetaJunho) window.jumpToMetaJunho(l, null); });
      grid.appendChild(d);
    });
  }
  window.__mjAfterRender = function(){
    if (synthCarteira !== (window.CARTEIRA_MAP || null)) synthMonths();   // Carteira mudou (ou acabou de carregar)
    renderSeniorChips();
    renderBar(); apply();
  };

  $('mjPeriodBtns').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.q){
      // Primeiro clique entra na visão por trimestre; cliques em outros trimestres SOMAM; clicar
      // num já marcado tira da soma (se sobrar nenhum, volta pra visão mensal).
      if (state.mode !== 'tri'){ state.mode = 'tri'; state.qs = [b.dataset.q]; }
      else if (state.qs.includes(b.dataset.q)){ state.qs = state.qs.filter(q => q !== b.dataset.q); if (!state.qs.length) state.mode = 'mes'; }
      else state.qs = state.qs.concat(b.dataset.q).sort();
    }
    else { state.mode = 'mes'; }
    renderBar(); apply();
  });

  // ---------- upload (Atualizar Dados → Opções avançadas) ----------
  const fileEl = $('fileMetaExec');
  if (fileEl) fileEl.addEventListener('change', async () => {
    const st = $('metaExecStatus');
    const files = [...fileEl.files];
    if (!files.length){ st.innerHTML = ''; return; }
    st.innerHTML = '<span style="color:var(--muted);">Lendo...</span>';
    const msgs = []; let ok = 0;
    for (const f of files){
      try {
        const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), {type:'array'});
        const r = parseMetaExecWorkbook(wb);
        Object.entries(r.months).forEach(([m, t]) => { META_EXEC_BY_MONTH[m] = t; });
        const nomes = Object.keys(r.months).sort().map(m => MES_LONGO[Number(m.slice(5)) - 1]).join(', ');
        const nExec = Object.values(r.months).reduce((s, t) => s + Object.values(t).reduce((x, l) => x + l.length, 0), 0);
        msgs.push(`<div style="color:#1b7a63;"><b>${f.name}</b>: ${nomes} carregado(s) — ${nExec} linhas de executivo (Interior ignorado).</div>`);
        r.avisos.forEach(a => msgs.push(`<div style="color:var(--red);">${a}</div>`));
        ok++;
      } catch(e){
        msgs.push(`<div style="color:var(--red);"><b>${f.name}</b>: ${e.message}</div>`);
      }
    }
    if (ok) msgs.push('<div style="color:var(--muted); margin-top:4px;">Clique em Publicar pra salvar pra todo mundo.</div>');
    st.innerHTML = msgs.join('');
    if (ok) mostrarPublicar();
    synthMonths();
    renderBar(); apply();
  });

  // ---------- upload: Integrado de MESES PASSADOS (extratos "Corretoras") ----------
  // O import normal do extrato cru SEMPRE grava no mês corrente (Integrado, Elegibilidade e
  // Ranking) — subir um extrato de Janeiro por lá sobrescreveria os números vivos. Este caminho
  // só guarda o Integrado por executivo daquele mês em INT_EXEC_BY_MONTH, sem tocar em mais nada.
  // O mês vem do rodapé do próprio extrato ("Date é 01/MM/AAAA"). Atribuição executivo ← corretora
  // usa a Carteira atual (window.CARTEIRA_MAP): conferido contra o arquivo oficial de Maio, bate
  // quase exato; corretoras que mudaram de executivo desde então podem deslocar poucas dezenas.
  function detectRawMonth(wb){
    const sh = wb.Sheets[wb.SheetNames.find(n => n.toUpperCase() === 'EXPORT') || wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sh, {header:1, defval:null, raw:true});
    for (let i = rows.length - 1; i >= 0; i--){
      const c = rows[i] && rows[i][0];
      const m = typeof c === 'string' && /Date\s+é\s+(\d{2})\/(\d{2})\/(\d{4})/i.exec(c);
      if (m) return m[3] + '-' + m[2];
    }
    return null;
  }
  const histEl = $('fileIntHist');
  if (histEl) histEl.addEventListener('change', async () => {
    const st = $('intHistStatus');
    const files = [...histEl.files];
    if (!files.length){ st.innerHTML = ''; return; }
    if (!window.CARTEIRA_MAP){
      st.innerHTML = '<div style="color:var(--red);">A Carteira não está carregada nesta sessão — sem ela não dá pra ligar corretora → executivo. Suba a "Carteira / Gestores" aqui em cima e confirme, ou recarregue o painel, e tente de novo.</div>';
      return;
    }
    const latest = window.getLatestKnownMonth ? window.getLatestKnownMonth() : null;
    const msgs = []; let ok = 0;
    for (const f of files){
      try {
        const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), {type:'array'});
        const mo = detectRawMonth(wb);
        if (!mo) throw new Error('não achei o mês no rodapé ("Date é 01/MM/AAAA") — esse arquivo é um extrato Corretoras do BI?');
        if (latest && mo >= latest) throw new Error(`${MES_LONGO[Number(mo.slice(5)) - 1]}/${mo.slice(0,4)} é o mês atual (ou mais novo) do painel — esse vai pelo campo normal "Extrato do BI", não por aqui.`);
        const r = window.parseCorretorasRawWorkbook(wb);
        const out = {};
        Object.entries(r.byGestor).forEach(([g, v]) => { out[g] = { ind:v.ind, ss:v.ss, pme:v.pme, adm:v.adm, total:v.ind + v.ss + v.pme + v.adm }; });
        INT_EXEC_BY_MONTH[mo] = out;
        const vidas = Object.values(out).reduce((s, v) => s + v.total, 0);
        msgs.push(`<div style="color:#1b7a63;"><b>${MES_LONGO[Number(mo.slice(5)) - 1]}/${mo.slice(0,4)}</b> (${f.name}): ${Object.keys(out).length} executivos, ${fmt0(vidas)} vidas atribuídas, ${fmt0(r.semGestorVidas)} sem gestor.</div>`);
        ok++;
      } catch(e){
        msgs.push(`<div style="color:var(--red);"><b>${f.name}</b>: ${e.message}</div>`);
      }
    }
    if (ok) msgs.push('<div style="color:var(--muted); margin-top:4px;">Não altera o mês atual, Elegibilidade nem Ranking. Clique em Publicar pra salvar pra todo mundo.</div>');
    st.innerHTML = msgs.join('');
    if (ok) mostrarPublicar();
    synthMonths();
    renderBar(); apply();
  });

  synthMonths();
  renderBar();
  apply();
})();

