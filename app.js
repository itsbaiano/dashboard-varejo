// ===== ASSESSORIAS — nomes unificados (pedido do Victor, 2026-10-13) =====
// A mesma assessoria aparecia em mais de uma linha por diferença de grafia (ex.: "F8 ... BENEFIC LTDA" ×
// "F8 ... BENEFICIOS LTDA"; "VIVA SAUDE ... SEGUROS" × "... LTDA" × "... LTDA ME"; "PADRAO OPIPARI ... DE SEG" ×
// "... SEGUROS LTDA."). Regra combinada com Victor: SÓ juntar as grafias — cada corretora continua na assessoria
// em que já está (nada é reatribuído pela Carteira, os integrados se distribuem igual). Duas grafias se juntam
// quando dividem um código de assessoria (gravado na corretora, ou o da Carteira pra ela) E são o mesmo nome com
// outra grafia (ver mesmaAssessoria). Continuam separadas: NBA/BRH "EIRELI" (outro código — decisão do Victor) e
// nomes diferentes com código trocado na origem (ex.: INNOV × TATIANA, achado no teste de 13/10).
// Nome exibido: o da Carteira atual pra aquele código (a mais usada); sem Carteira, a grafia mais comum.
// Uso: window.assCanon(nome, codigo) → { key, nome } | null (sem assessoria). Nada é gravado — é só exibição.
(function(){
  const limpaCod = c => {
    const s = String(c == null ? '' : c).trim();
    if (!s || s === '0' || /ENCONTRAD/i.test(s)) return '';
    return (window.normalizeCodigo ? String(window.normalizeCodigo(s)) : s).toUpperCase();
  };
  const limpaNome = n => { const s = String(n == null ? '' : n).trim(); return (s === '0' || /^-?\d{6,}$/.test(s)) ? '' : s.toUpperCase(); };
  let cache = null, cacheAt = 0, cacheSig = '';
  // "Mesma assessoria com outra grafia": igual sem LTDA/ME/S.A./pontuação, ou um é o começo do outro (nome cortado,
  // ex.: "...BENEFIC" × "...BENEFICIOS", "...DE SEG" × "...DE SEGUROS"). "EIRELI" nunca casa com "LTDA".
  const base = s => String(s).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/(\s(LTDA|ME|EPP|SA|S A|LIMITADA))+$/g, '').trim();
  const mesmaAssessoria = (a, b) => {
    const x = base(a), y = base(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const [curto, longo] = x.length <= y.length ? [x, y] : [y, x];
    if (curto.length < 12 || !longo.startsWith(curto)) return false;
    return !/EIRELI/.test(longo.slice(curto.length));
  };
  function montar(){
    const elig = window.getEligibilidadeData ? (window.getEligibilidadeData() || []) : [];
    const linhas = [].concat(elig, window.getRankData ? (window.getRankData() || []) : []);
    const cart = window.CARTEIRA_MAP;
    const pai = new Map();
    const raiz = x => { if (!pai.has(x)) pai.set(x, x); let r = x; while (pai.get(r) !== r) r = pai.get(r); while (pai.get(x) !== r){ const n = pai.get(x); pai.set(x, r); x = n; } return r; };
    const une = (a, b) => { const ra = raiz(a), rb = raiz(b); if (ra !== rb) pai.set(ra, rb); };
    // 1) código → grafias ligadas a ele. O código é só PISTA: duas grafias só se juntam se, além de dividirem um
    //    código, forem o mesmo nome (mesmaAssessoria). Achado no teste de 13/10: há corretoras gravadas com o nome
    //    de uma assessoria e o código de outra (INNOV × TATIANA) — juntar só pelo código misturava as duas.
    const nomesDoCod = {};
    const liga = (cod, nome) => { (nomesDoCod[cod] = nomesDoCod[cod] || new Set()).add(nome); };
    const contaNome = {};
    linhas.forEach(d => {
      const nome = limpaNome(d.ass), cod = limpaCod(d.acod);
      if (nome){ raiz('N:' + nome); contaNome[nome] = (contaNome[nome] || 0) + 1; }
      if (nome && cod) liga(cod, nome);
    });
    //    Corretora sem código gravado (ex.: Elegibilidade da Plataforma): o código que a Carteira dá pra ESSA
    //    corretora entra como pista (a regra de nome continua valendo — quem a Carteira trocou de assessoria não junta).
    if (cart && cart.byCodigo){
      elig.forEach(d => {
        const nome = limpaNome(d.ass); if (!nome || limpaCod(d.acod)) return;
        const cod = window.normalizeCodigo ? window.normalizeCodigo(d.c) : d.c;
        (cart.byCodigo[cod] || []).forEach(e => { const k = limpaCod(e.codAss); if (k) liga(k, nome); });
      });
    }
    // 2) dentro de cada código, junta as grafias que são a mesma assessoria
    Object.keys(nomesDoCod).forEach(cod => {
      const ns = [...nomesDoCod[cod]];
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++){
        if (mesmaAssessoria(ns[i], ns[j])) une('N:' + ns[i], 'N:' + ns[j]);
      }
    });
    // 3) nome exibido: o da Carteira atual pra algum código do grupo (se for a mesma assessoria); senão a grafia
    //    mais comum guardada.
    const nomeCart = {};
    if (cart && cart.byCodigo){
      const cont = {};
      Object.values(cart.byCodigo).forEach(lista => (lista || []).forEach(e => {
        const cod = limpaCod(e.codAss), nome = limpaNome(e.assessoria); if (!cod || !nome) return;
        (cont[cod] = cont[cod] || {})[nome] = (cont[cod][nome] || 0) + 1;
      }));
      Object.keys(cont).forEach(cod => { nomeCart[cod] = Object.entries(cont[cod]).sort((a,b)=>b[1]-a[1])[0][0]; });
    }
    const membros = new Map(); // raiz → [grafias]
    Object.keys(contaNome).forEach(n => { const r = raiz('N:' + n); (membros.get(r) || membros.set(r, []).get(r)).push(n); });
    const nomePorRaiz = new Map();
    const escolhe = r => {
      if (nomePorRaiz.has(r)) return nomePorRaiz.get(r);
      const ns = membros.get(r) || [];
      const daCart = {};
      Object.keys(nomesDoCod).forEach(cod => {
        if (!nomeCart[cod] || ![...nomesDoCod[cod]].some(n => ns.includes(n))) return;
        if (ns.some(n => mesmaAssessoria(n, nomeCart[cod]))) daCart[nomeCart[cod]] = (daCart[nomeCart[cod]] || 0) + 1;
      });
      let nome = Object.keys(daCart).sort((a,b)=>daCart[b]-daCart[a])[0];
      if (!nome) nome = ns.slice().sort((a,b)=>contaNome[b]-contaNome[a])[0] || '';
      nomePorRaiz.set(r, nome);
      return nome;
    };
    // corretora só com código (sem nome): vai pro grupo da grafia mais comum daquele código
    const raizDoCod = cod => {
      const ns = [...(nomesDoCod[cod] || [])].sort((a,b)=>contaNome[b]-contaNome[a]);
      return ns.length ? raiz('N:' + ns[0]) : null;
    };
    return { raiz, escolhe, pai, raizDoCod };
  }
  window.assCanon = function(nome, cod){
    const n = limpaNome(nome), c = limpaCod(cod);
    if (!n && !c) return null;
    const elig = window.getEligibilidadeData ? (window.getEligibilidadeData() || []) : [];
    const rank = window.getRankData ? (window.getRankData() || []) : [];
    const sig = elig.length + '|' + rank.length + '|' + (window.CARTEIRA_MAP ? 1 : 0);
    if (!cache || sig !== cacheSig || Date.now() - cacheAt > 2000){ cache = montar(); cacheSig = sig; cacheAt = Date.now(); }
    let r = null;
    if (n) r = cache.pai.has('N:' + n) ? cache.raiz('N:' + n) : null;
    else r = cache.raizDoCod(c);
    if (!r) return { key: n ? 'N:' + n : 'C:' + c, nome: n || ('Assessoria ' + c) };
    return { key: r, nome: cache.escolhe(r) };
  };
})();

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
  // Trava de tela pra quem tem noEleg:true no cadastro do Firestore (window.__noEleg__, ver auth no index.html) — cobre não só
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
  // Cabeçalho enxuto (2026-10-07): o título mostra a tela em que a pessoa está.
  const dhTitle = document.getElementById('dhViewTitle');
  if (dhTitle) dhTitle.textContent = ({overview:'Visão Geral', mj:'Desempenho Comercial', el:'Elegibilidade', compare:'Comparativo', rank:'Ranking de Vendas', conversao:'Conversão'})[view] || 'Painel Comercial';
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
// Some o botão da Elegibilidade da barra lateral pra quem tem noEleg:true no cadastro do Firestore.
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
        const cor = ['#2E52D4','#F26B21','#5B7CFA','#16B87A','#FFB81C'][i % 5];
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
        const cor = ['#2E52D4','#F26B21','#5B7CFA','#16B87A','#FFB81C'][i % 5];
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

  // ===== EXPORTAR DESEMPENHO COMERCIAL EM .XLSX (pedido do Victor, 2026-10-07) =====
  // Gera o mês selecionado no MESMO formato do Excel "NDI SP - POR GESTOR - <MÊS> dd.mm.aaaa" dele, pra
  // baixar todo dia e guardar o retrato do dia. Só as 3 abas principais (decisão dele): "NDI SP - <MÊS>"
  // (por executivo/equipe), "EXPORT" (uma linha por corretora) e "META <MÊS>". Cores, bordas, mesclas,
  // larguras e a escala de cor do % copiadas do arquivo de 06.10.2026. COM FÓRMULAS (pra simulação):
  // - META <MÊS>: a cascata dele — total da diretora → categoria pelo % vertical (PF/SS/PME/ADESÃO) →
  //   equipe pelo % → executivo pelo %. Cada % é derivado das metas do painel; se uma meta do painel não
  //   seguir a cascata (diferença > 0,01), a célula vai com o NÚMERO, pra nunca sair meta diferente.
  // - NDI SP: Meta = PROCV na aba META; Integrado = SOMASE na EXPORT; % e totais = fórmulas. Integrado
  //   TOTAL = IND+SS+PME SEM ADM, igual ao arquivo dele (decisão do Victor); Meta TOTAL inclui ADM.
  // - EXPORT: corretoras do painel naquele mês. Quando a soma das corretoras de um executivo não bate com
  //   o Integrado dele (ex.: ADM por corretora só passou a ser guardado em 07/10), entra uma linha
  //   "AJUSTE" do próprio executivo com a diferença — o total nunca fica diferente do painel.
  // As abas têm os nomes do arquivo real, então um retrato baixado pode ser reimportado pelo campo normal.
  window.exportDesempenhoXlsx = async function(month){
    month = month || currentMonth;
    const teams = MJ_TEAMS_BY_MONTH[month];
    if (!teams || !Object.keys(teams).length) throw new Error('Não há dados do Desempenho Comercial para esse mês.');
    if (!window.loadExcelJS) throw new Error('A biblioteca de planilhas não está disponível.');
    const ExcelJS = await window.loadExcelJS();
    const MESES = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
    const mesNome = MESES[Number(month.split('-')[1]) - 1];
    const abaMain = 'NDI SP - ' + mesNome, abaMeta = 'META ' + mesNome;
    const rawOf = nome => window.getGestorRawName ? window.getGestorRawName(nome) : String(nome).toUpperCase();
    const corrMes = getCorretoras(month);
    const naoAt = getNaoAtribuido(month) || {ind:0, ss:0, pme:0, adm:0};
    const CATS = ['IND','SS','PME','ADM'];
    const FILIAL_TXT = {'Plataforma':'PLATAFORMA','ABC':'ABC','Cauda Longa':'CAUDA LONGA','Digital':'DIGITAL','Interior':'INTERIOR'};
    const teamList = Object.entries(teams).map(([label, td]) => {
      const tipo = ((/\(([^)]*)\)\s*$/.exec(label) || [])[1]) || '';
      return { label, td, filial: FILIAL_TXT[tipo] || tipo.toUpperCase(), senior: label.replace(/\s*\([^)]*\)\s*$/, '').toUpperCase() };
    });

    // ---------- EXPORT (linhas por corretora) ----------
    const expRows = [];
    let ajustes = 0;
    teamList.forEach(t => t.td.members.forEach(m => {
      const raw = rawOf(m.nome);
      const lista = corrMes[m.nome] || [];
      const soma = {ind:0, ss:0, pme:0, adm:0};
      lista.forEach(c => {
        const r = { c: String(c.c || ''), n: c.n || '', gestor: raw, ind: c.ind || 0, ss: c.ss || 0, pme: c.pme || 0, adm: c.adm || 0, filial: c.filial || '' };
        soma.ind += r.ind; soma.ss += r.ss; soma.pme += r.pme; soma.adm += r.adm;
        expRows.push(r);
      });
      const dif = { ind: (m.cat.IND.int || 0) - soma.ind, ss: (m.cat.SS.int || 0) - soma.ss, pme: (m.cat.PME.int || 0) - soma.pme, adm: (m.cat.ADM.int || 0) - soma.adm };
      if (Object.values(dif).some(v => Math.abs(v) > 1e-9)){
        ajustes++;
        expRows.push({ c: '', n: 'AJUSTE — vendas sem detalhe por corretora', gestor: raw, ind: dif.ind, ss: dif.ss, pme: dif.pme, adm: dif.adm, filial: '', ajuste: true });
      }
    }));
    // Sem executivo: corretoras guardadas sob um "gestor" que não é executivo de nenhuma equipe (ex.: o
    // "#N/D" das corretoras fora do database, no Excel dele) saem uma por linha com GESTOR = "SEM
    // EXECUTIVO"; o que faltar pra bater com o não-atribuído do painel vira uma linha agregada.
    const membros = new Set(); teamList.forEach(t => t.td.members.forEach(m => membros.add(m.nome)));
    const somaSem = {ind:0, ss:0, pme:0, adm:0};
    Object.keys(corrMes).filter(g => !membros.has(g)).forEach(g => (corrMes[g] || []).forEach(c => {
      const r = { c: String(c.c == null || c.c === 'null' ? '' : c.c), n: c.n || '', gestor: 'SEM EXECUTIVO', ind: c.ind || 0, ss: c.ss || 0, pme: c.pme || 0, adm: c.adm || 0, filial: c.filial || '' };
      if (!r.c && !(r.ind || r.ss || r.pme || r.adm)) return;
      somaSem.ind += r.ind; somaSem.ss += r.ss; somaSem.pme += r.pme; somaSem.adm += r.adm;
      expRows.push(r);
    }));
    expRows.sort((a, b) => (a.ajuste === b.ajuste) ? a.c.localeCompare(b.c) : (a.ajuste ? 1 : -1));
    const difSem = { ind: (naoAt.ind || 0) - somaSem.ind, ss: (naoAt.ss || 0) - somaSem.ss, pme: (naoAt.pme || 0) - somaSem.pme, adm: (naoAt.adm || 0) - somaSem.adm };
    if (Object.values(difSem).some(v => Math.abs(v) > 1e-9)){
      ajustes++;
      expRows.push({ c: '', n: 'AJUSTE — corretoras sem executivo / fora do database (sem detalhe por corretora)', gestor: 'SEM EXECUTIVO', ind: difSem.ind, ss: difSem.ss, pme: difSem.pme, adm: difSem.adm, filial: '', ajuste: true });
    }
    const sumExp = (gestor, k) => expRows.reduce((s, r) => s + (r.gestor === gestor ? r[k] : 0), 0);

    // ---------- estilos (copiados do arquivo real) ----------
    const NAVY = 'FF1F3A93', FILIAL_FILL = 'FFB97034', PCT_FILL = 'FFE7EBF5', BRANCO = 'FFFFFFFF', PRETO = 'FF000000';
    const solid = argb => ({ type:'pattern', pattern:'solid', fgColor:{ argb } });
    const ln = (style, argb) => argb ? { style, color:{ argb } } : { style };
    const center = { horizontal:'center', vertical:'middle' };
    const F = (r, c) => r.getCell(c);
    const set = (cell, value, result) => { cell.value = (typeof value === 'string' && value[0] === '=') ? { formula: value.slice(1), result } : value; };
    const wb = new ExcelJS.Workbook();
    wb.calcProperties = { fullCalcOnLoad: true };
    // Abas criadas já na ordem do arquivo real (NDI SP, EXPORT, META); preenchidas abaixo.
    const ws = wb.addWorksheet(abaMain, { views:[{ state:'frozen', ySplit:3, zoomScale:70, showGridLines:false }] });
    const wsExp = wb.addWorksheet('EXPORT', { views:[{ zoomScale:80 }] });
    const wsMeta = wb.addWorksheet(abaMeta, { views:[{ showGridLines:false }] });

    // ---------- META <MÊS> ----------
    [55, 21.7, 12, 12, 12, 12, 12, 8, 4, 4, 12, 8].forEach((w, i) => { wsMeta.getColumn(i + 1).width = w; });
    const META_COL = { IND:'C', SS:'D', PME:'E', ADM:'F' };
    const dirMetaCat = {}; CATS.forEach(k => { dirMetaCat[k] = teamList.reduce((s, t) => s + (t.td.total.cat[k].meta || 0), 0); });
    const dirMetaTot = teamList.reduce((s, t) => s + (t.td.total.meta || 0), 0);
    // layout: linha 1 cabeçalho, 2.. blocos (sênior + executivos + linha em branco), diretora no fim
    let r = 3;
    const blocks = teamList.map(t => { const b = { t, row: r, execRows: [] }; r++; t.td.members.forEach(() => { b.execRows.push(r); r++; }); r++; return b; });
    const dirRow = r;
    const vertRow = { IND:2, SS:3, PME:4, ADM:5 };
    const h1 = wsMeta.getRow(1);
    [['A','SP HAP NDI'],['C','IND'],['D','SS'],['E','PME'],['F','ADESÃO'],['G','TOTAL'],['H','%']].forEach(([c, v]) => { F(h1, c).value = v; });
    'ABCDEFGH'.split('').forEach(c => { const x = F(h1, c); x.font = { name:'Calibri', size:11, bold:true, color:{ argb:BRANCO } }; x.fill = solid('FF4F81BD'); x.alignment = { horizontal:'center' }; x.border = { top:ln('thin'), left:ln('thin'), bottom:ln('thin'), right:ln('thin') }; });
    F(h1, 'K').value = 'VERTICAL NDI'; wsMeta.mergeCells('K1:L1');
    F(h1, 'K').font = { name:'Calibri', size:11, bold:true }; F(h1, 'K').fill = solid('FFFFFF00'); F(h1, 'K').alignment = { horizontal:'center' };
    const pctVert = {}; CATS.forEach(k => { pctVert[k] = dirMetaTot ? dirMetaCat[k] / dirMetaTot * 100 : 0; });
    [['IND','PF'],['SS','SS'],['PME','PME'],['ADM','ADESÃO']].forEach(([k, lbl]) => {
      const row = wsMeta.getRow(vertRow[k]); F(row, 'K').value = lbl; F(row, 'L').value = pctVert[k];
      ['K','L'].forEach(c => { F(row, c).border = { top:ln('thin'), left:ln('thin'), bottom:ln('thin'), right:ln('thin') }; F(row, c).font = { name:'Calibri', size:11 }; });
      F(row, 'L').numFmt = '0.##';
    });
    set(F(wsMeta.getRow(6), 'L'), '=SUM(L2:L5)', CATS.reduce((s, k) => s + pctVert[k], 0)); F(wsMeta.getRow(6), 'L').numFmt = '0.##';
    const META_LIGHT = 'FFE6B9B8', META_NAME = 'FFD9D9D9';
    const styleMetaRow = (row, kind) => {
      'ABCDEFGH'.split('').forEach(c => {
        const x = F(row, c);
        x.border = { top:ln('thin'), left:ln('thin'), bottom:ln('thin'), right:ln('thin') };
        const nameCol = c === 'A' || c === 'B';
        x.font = { name:'Calibri', size: nameCol ? 10 : 11, bold: kind !== 'exec' || c === 'G' };
        x.alignment = { horizontal: c === 'A' ? 'left' : 'center', vertical:'middle' };
        if (c >= 'C' && c <= 'G') x.numFmt = '#,##0';
        if (kind === 'dir') x.fill = solid('FFFF0000');
        else if (kind === 'team') { if (c !== 'H') x.fill = solid(META_LIGHT); }
        else if (nameCol) x.fill = solid(META_NAME);
        else if (c !== 'H') x.fill = solid(META_LIGHT);
      });
    };
    const near = (a, b) => Math.abs((a || 0) - (b || 0)) <= 0.01;
    const metaVal = {};  // valor final de cada célula de meta (pra conferir a cascata e alimentar o PROCV)
    // diretora
    const dRow = wsMeta.getRow(dirRow);
    F(dRow, 'A').value = 'FABYANNA BOAVENTURA'; F(dRow, 'B').value = 'DIRETORA REGIONAL SP';
    F(dRow, 'G').value = dirMetaTot; F(dRow, 'H').value = 100;
    CATS.forEach(k => {
      const viaFormula = dirMetaTot * pctVert[k] / 100;
      if (near(viaFormula, dirMetaCat[k])) set(F(dRow, META_COL[k]), `=G${dirRow}*L${vertRow[k]}/100`, viaFormula);
      else F(dRow, META_COL[k]).value = dirMetaCat[k];
      metaVal['dir' + k] = near(viaFormula, dirMetaCat[k]) ? viaFormula : dirMetaCat[k];
    });
    styleMetaRow(dRow, 'dir');
    blocks.forEach(b => {
      const td = b.t.td, row = wsMeta.getRow(b.row);
      const pctTeam = dirMetaTot ? (td.total.meta || 0) / dirMetaTot * 100 : 0;
      F(row, 'A').value = 'GERENTE SENIOR: ' + b.t.senior; F(row, 'B').value = 'GERENTE SENIOR'; F(row, 'H').value = pctTeam;
      const teamVal = {};
      CATS.forEach(k => {
        const viaFormula = pctTeam * metaVal['dir' + k] / 100;
        if (near(viaFormula, td.total.cat[k].meta)) { set(F(row, META_COL[k]), `=H${b.row}*${META_COL[k]}${dirRow}/100`, viaFormula); teamVal[k] = viaFormula; }
        else { F(row, META_COL[k]).value = td.total.cat[k].meta || 0; teamVal[k] = td.total.cat[k].meta || 0; }
      });
      set(F(row, 'G'), `=SUM(C${b.row}:F${b.row})`, CATS.reduce((s, k) => s + teamVal[k], 0));
      F(row, 'H').numFmt = '0.##';
      styleMetaRow(row, 'team');
      const teamTot = CATS.reduce((s, k) => s + teamVal[k], 0);
      td.members.forEach((m, i) => {
        const er = b.execRows[i], erow = wsMeta.getRow(er);
        const pctExec = teamTot ? (m.total.meta || 0) / teamTot * 100 : 0;
        F(erow, 'A').value = rawOf(m.nome); F(erow, 'B').value = 'EXECUTIVO(A)'; F(erow, 'H').value = pctExec; F(erow, 'H').numFmt = '0.##';
        let tot = 0;
        CATS.forEach(k => {
          const viaFormula = teamVal[k] * pctExec / 100;
          let v;
          if (near(viaFormula, m.cat[k].meta)) { set(F(erow, META_COL[k]), `=$${META_COL[k]}$${b.row}*H${er}/100`, viaFormula); v = viaFormula; }
          else { v = m.cat[k].meta || 0; F(erow, META_COL[k]).value = v; }
          metaVal[m.nome + '|' + k] = v; tot += v;
        });
        set(F(erow, 'G'), `=SUM(C${er}:F${er})`, tot);
        metaVal[m.nome + '|TOT'] = tot;
        styleMetaRow(erow, 'exec');
      });
    });

    // ---------- EXPORT ----------
    [60, 14.3, 61, 40.6, 20.7, 30, 31, 31, 15.1, 26.3].forEach((w, i) => { wsExp.getColumn(i + 1).width = w; });
    const e1 = wsExp.getRow(1), e2 = wsExp.getRow(2);
    ['CANAL','CODIGO','CORRETORA','GESTOR','01-INDIVIDUAL','02-PIM (IND/3-29 VIDAS)','03-MIDDLE I(30-99 VIDAS)','07-ADMINISTRADORA','Total','FILIAL'].forEach((v, i) => { e1.getCell(i + 1).value = v; });
    e2.getCell(1).value = 'Código Corretora | Nome Corretora | Filial';
    for (let c = 5; c <= 9; c++) e2.getCell(c).value = 'Vendas Novas';
    const expFill = c => c === 1 ? 'FF002B7F' : (c <= 4 ? 'FF003DA5' : (c <= 8 ? 'FFFF6A00' : 'FF4D4D4D'));
    [e1, e2].forEach(row => { for (let c = 1; c <= 10; c++){ const x = row.getCell(c); x.font = { name:'Calibri', size:11, bold:true, color:{ argb:BRANCO } }; x.fill = solid(expFill(c)); x.alignment = { horizontal: c === 1 ? undefined : 'center', vertical:'middle' }; x.border = { top:ln('thin'), left:ln('thin'), bottom:ln('thin'), right:ln('thin') }; } });
    ['B1:B2','C1:C2','D1:D2','J1:J2'].forEach(m => wsExp.mergeCells(m));
    expRows.forEach((er, i) => {
      const rr = i + 3, row = wsExp.getRow(rr);
      row.getCell(1).value = er.c ? `${er.c} - ${er.n}` : er.n;
      row.getCell(2).value = er.c; row.getCell(3).value = er.n; row.getCell(4).value = er.gestor;
      row.getCell(5).value = er.ind; row.getCell(6).value = er.ss; row.getCell(7).value = er.pme; row.getCell(8).value = er.adm;
      set(row.getCell(9), `=SUM(E${rr}:H${rr})`, er.ind + er.ss + er.pme + er.adm);
      row.getCell(10).value = er.filial;
      for (let c = 1; c <= 10; c++){ const x = row.getCell(c); x.font = { name:'Calibri', size:11, italic: !!er.ajuste }; x.alignment = { horizontal: c === 1 ? undefined : 'center', vertical:'middle' }; if (c === 2 || c === 4 || c === 10) x.border = { top:ln('thin'), left:ln('thin'), bottom:ln('thin'), right:ln('thin') }; }
    });
    wsExp.autoFilter = { from:{ row:1, column:1 }, to:{ row: expRows.length + 2, column:10 } };

    // ---------- NDI SP - <MÊS> ----------
    [21.1, 51.1, 11.9, 14.9].concat(Array(13).fill(11.9)).forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    const META_IDX = { IND:3, SS:4, PME:5, ADM:6 };
    const COLS = { IND:['C','D','E'], SS:['F','G','H'], PME:['I','J','K'], ADM:['L','M','N'] };
    const EXP_COL = { IND:'E', SS:'F', PME:'G', ADM:'H' };
    const CAT_KEY = { IND:'ind', SS:'ss', PME:'pme', ADM:'adm' };
    const ALL = 'ABCDEFGHIJKLMNOPQ'.split('');
    const styleRow = (row, kind) => {
      ALL.forEach(c => {
        const x = F(row, c);
        const isPct = 'EHKN'.indexOf(c) >= 0, isQ = c === 'Q', isMeta = 'CFILO'.indexOf(c) >= 0;
        const b = { top:ln('thin'), left:ln('thin'), bottom:ln('thin'), right:ln('thin') };
        if (c === 'A') b.left = ln('thick', NAVY);
        if (c === 'C') b.left = ln('medium', NAVY);
        if (isPct) b.right = ln('medium', NAVY);
        if (isQ) b.right = ln('thick', NAVY);
        if (kind === 'total' || kind === 'obsTotal') b.bottom = ln('medium', NAVY);
        if (kind === 'dir') { b.bottom = ln('thick', NAVY); }
        x.border = b;
        x.alignment = (c === 'A' && kind === 'dir') ? { vertical:'middle' } : { horizontal:'center', vertical:'middle', wrapText: c === 'A' };
        if (c === 'A' && kind !== 'dir') { x.fill = solid(FILIAL_FILL); x.font = { name:'Calibri', size:11, bold:true, color:{ argb:BRANCO } }; return; }
        if (kind === 'total' || kind === 'dir' || (c === 'B' && (kind === 'obs' || kind === 'obsTotal'))) { x.fill = solid(NAVY); x.font = { name:'Calibri', size:11, bold:true, color:{ argb:BRANCO } }; }
        else if (kind === 'member' && (isPct || isQ)) { x.fill = solid(PCT_FILL); x.font = { name:'Calibri', size:11, bold:true }; }
        else x.font = { name:'Calibri', size:11, bold: isQ };
        if (isPct) x.numFmt = '0%';
        else if (isQ) x.numFmt = '0.0%';
        else if (isMeta || 'DGJMP'.indexOf(c) >= 0) x.numFmt = (kind === 'member') ? (isMeta ? '0' : 'General') : '#,##0';
      });
    };
    // título + cabeçalho
    const t1 = ws.getRow(1); t1.height = 30;
    F(t1, 'A').value = 'HAPVIDA - NDI SP'; ws.mergeCells('A1:Q1');
    F(t1, 'A').font = { name:'Calibri', size:18, bold:true, color:{ argb:'FF003DA5' } }; F(t1, 'A').alignment = center;
    F(t1, 'A').border = { top:ln('thick', NAVY), left:ln('thick', NAVY), right:ln('thick', NAVY) };
    const hdr = ws.getRow(3); hdr.height = 30;
    ['FILIAL','GESTOR','META IND','INTEGRADO IND','% META IND','META SS','INTEGRADO SS','% META SS','META PME','INTEGRADO PME','% META PME','META ADM','INTEGRADO ADM','% META ADM','META TOTAL','INTEGRADO TOTAL','% META'].forEach((v, i) => { hdr.getCell(i + 1).value = v; });
    ALL.forEach(c => { const x = F(hdr, c); x.font = { name:'Calibri', size:11, bold:true, color:{ argb:BRANCO } }; x.fill = solid(NAVY); x.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
      x.border = { top:ln('thin'), left: c === 'A' ? ln('thick', NAVY) : (c === 'C' ? ln('medium', NAVY) : ln('thin')), bottom:ln('thin'), right: c === 'Q' ? ln('thick', NAVY) : ('EHKN'.indexOf(c) >= 0 ? ln('medium', NAVY) : ln('thin')) }; });
    const pct = (a, b) => b ? a / b : 0;
    const writeLine = (rr, vals) => {   // vals: {meta:{IND..}, int:{IND..}} já resolvidos + fórmulas
      const row = ws.getRow(rr);
      CATS.forEach(k => {
        const [cm, ci, cp] = COLS[k];
        set(F(row, cm), vals.fMeta[k], vals.meta[k]);
        set(F(row, ci), vals.fInt[k], vals.int[k]);
        set(F(row, cp), `=IFERROR(${ci}${rr}/${cm}${rr},0)`, pct(vals.int[k], vals.meta[k]));
      });
      const metaTot = CATS.reduce((s, k) => s + vals.meta[k], 0), intTot = vals.int.IND + vals.int.SS + vals.int.PME;
      set(F(row, 'O'), vals.fMetaTot || `=SUM(C${rr},F${rr},I${rr},L${rr})`, metaTot);
      set(F(row, 'P'), vals.fIntTot || `=SUM(D${rr},G${rr},J${rr})`, intTot);
      set(F(row, 'Q'), `=IFERROR(P${rr}/O${rr},0)`, pct(intTot, metaTot));
      return { meta: vals.meta, int: vals.int, metaTot, intTot };
    };
    let rr = 4;
    const teamTotalRows = [], memberRanges = [];
    const dirAcc = { meta:{IND:0,SS:0,PME:0,ADM:0}, int:{IND:0,SS:0,PME:0,ADM:0} };
    teamList.forEach(t => {
      const first = rr;
      const acc = { meta:{IND:0,SS:0,PME:0,ADM:0}, int:{IND:0,SS:0,PME:0,ADM:0} };
      t.td.members.forEach(m => {
        const raw = rawOf(m.nome), row = ws.getRow(rr); row.height = 18;
        F(row, 'B').value = raw;
        const meta = {}, intv = {}, fMeta = {}, fInt = {};
        CATS.forEach(k => {
          meta[k] = metaVal[m.nome + '|' + k] || 0;
          intv[k] = sumExp(raw, CAT_KEY[k]);
          fMeta[k] = `=IFERROR(VLOOKUP($B${rr},'${abaMeta}'!$A:$H,${META_IDX[k]},FALSE),0)`;
          fInt[k] = `=SUMIF(EXPORT!$D:$D,$B${rr},EXPORT!$${EXP_COL[k]}:$${EXP_COL[k]})`;
          acc.meta[k] += meta[k]; acc.int[k] += intv[k];
        });
        writeLine(rr, { meta, int: intv, fMeta, fInt });
        styleRow(row, 'member');
        rr++;
      });
      const last = rr - 1, trow = ws.getRow(rr); trow.height = 18;
      F(trow, 'B').value = 'TOTAL ' + t.senior;
      const fSum = c => `=SUM(${c}${first}:${c}${last})`;
      const fMeta = {}, fInt = {};
      CATS.forEach(k => { fMeta[k] = fSum(COLS[k][0]); fInt[k] = fSum(COLS[k][1]); dirAcc.meta[k] += acc.meta[k]; dirAcc.int[k] += acc.int[k]; });
      writeLine(rr, { meta: acc.meta, int: acc.int, fMeta, fInt, fMetaTot: fSum('O'), fIntTot: fSum('P') });
      styleRow(trow, 'total');
      F(ws.getRow(first), 'A').value = t.filial;
      ws.mergeCells(`A${first}:A${rr}`);
      teamTotalRows.push(rr); memberRanges.push([first, last]);
      rr++;
    });
    // observações (não atribuído)
    const obsRow = rr, obsTot = rr + 1;
    const naoInt = {}; CATS.forEach(k => { naoInt[k] = sumExp('SEM EXECUTIVO', CAT_KEY[k]); });
    const zeros = { IND:0, SS:0, PME:0, ADM:0 };
    F(ws.getRow(obsRow), 'B').value = 'CORRETORAS SEM EXECUTIVO';
    const fObs = {}; CATS.forEach(k => { fObs[k] = `=SUMIF(EXPORT!$D:$D,"SEM EXECUTIVO",EXPORT!$${EXP_COL[k]}:$${EXP_COL[k]})`; });
    writeLine(obsRow, { meta: zeros, int: naoInt, fMeta: { IND:0, SS:0, PME:0, ADM:0 }, fInt: fObs });
    styleRow(ws.getRow(obsRow), 'obs');
    F(ws.getRow(obsTot), 'B').value = 'TOTAL';
    const fObsT = {}, fObsTm = {}; CATS.forEach(k => { fObsT[k] = `=${COLS[k][1]}${obsRow}`; fObsTm[k] = `=${COLS[k][0]}${obsRow}`; });
    writeLine(obsTot, { meta: zeros, int: naoInt, fMeta: fObsTm, fInt: fObsT, fMetaTot: `=O${obsRow}`, fIntTot: `=P${obsRow}` });
    styleRow(ws.getRow(obsTot), 'obsTotal');
    F(ws.getRow(obsRow), 'A').value = 'OBSERVAÇÕES'; ws.mergeCells(`A${obsRow}:A${obsTot}`);
    // total da diretora
    const dRowN = obsTot + 2, drow = ws.getRow(dRowN);
    F(drow, 'A').value = 'TOTAL FABYANNA BOAVENTURA - NDI SP';
    const lst = (c, extra) => `=SUM(${teamTotalRows.map(x => c + x).concat(extra ? [c + obsTot] : []).join(',')})`;
    const fDm = {}, fDi = {}; CATS.forEach(k => { fDm[k] = lst(COLS[k][0], false); fDi[k] = lst(COLS[k][1], true); });
    const dirInt = {}; CATS.forEach(k => { dirInt[k] = dirAcc.int[k] + naoInt[k]; });
    writeLine(dRowN, { meta: dirAcc.meta, int: dirInt, fMeta: fDm, fInt: fDi, fMetaTot: lst('O', false), fIntTot: lst('P', true) });
    styleRow(drow, 'dir');
    // escala de cor do % (por bloco de executivos, igual ao arquivo)
    memberRanges.forEach(([a, b]) => ws.addConditionalFormatting({ ref: `Q${a}:Q${b}`, rules: [{ type:'colorScale', priority:1,
      cfvo: [{ type:'num', value:0.7 }, { type:'num', value:0.8 }, { type:'num', value:1 }], color: [{ argb:'FFF8696B' }, { argb:'FF63BE7B' }, { argb:'FF1E7A34' }] }] }));
    const buf = await wb.xlsx.writeBuffer();
    const hoje = new Date();
    const dataBR = String(hoje.getDate()).padStart(2, '0') + '.' + String(hoje.getMonth() + 1).padStart(2, '0') + '.' + hoje.getFullYear();
    const fileName = `NDI SP - POR GESTOR - ${mesNome} ${dataBR}.xlsx`;
    window.downloadBlobFile(new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    return { fileName, ajustes, corretoras: expRows.length };
  };
  document.getElementById('btnExportDesempenho').addEventListener('click', async () => {
    const btn = document.getElementById('btnExportDesempenho');
    if (btn.disabled) return;
    const original = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Gerando .xlsx…';
    try { await window.exportDesempenhoXlsx(currentMonth); }
    catch (e){ console.error(e); alert('Não consegui gerar o arquivo: ' + (e && e.message ? e.message : e)); }
    finally { btn.disabled = false; btn.innerHTML = original; }
  });
  // Re-renderiza a tela do Desempenho Comercial (usado pelo módulo de trimestre ao voltar pra visão mensal).
  window.mjRerender = function(){ renderMetaJunho(); };
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
        status: { planium: p.st, cadastro: p.ca || '', ditec: p.di || '', bitix: p.bi || '' },
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
  let pendFinAberto = false; // grupo "Finalizadas" do painel de status aberto/fechado (sobrevive aos redesenhos)
  // Vigência e Corretora com VÁRIAS escolhas (pedido do Victor, 2026-10-14: "poder escolher mais de um, tipo só setembro
  // e outubro" / "selecionar duas corretoras em um único PDF"). Antes eram <select> de uma opção só. Vazio = todos.
  // Mesma lógica de sempre entre filtros: mês E corretora E status E busca.
  const pendMesSel = new Set(), pendCorSel = new Set();
  const PEND_MES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const pendMesNome = m => { const p = String(m || '').split('-'); return p.length === 2 ? (PEND_MES_ABREV[Number(p[1]) - 1] || p[1]) + '/' + p[0].slice(2) : String(m || ''); };
  const pendEsc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  // Texto do filtro pra relatórios/etiquetas ("Set/26 + Out/26", "2 corretoras: A, B")
  // Tudo marcado (ex.: botão "Todos") = mesmo que nenhum filtro — o rótulo mostra "Todos os meses" / "Todas".
  const pendTudoMarcado = { mes: false, cor: false };
  function pendFiltroTexto(tipo, completo){
    if (tipo === 'mes') return (pendMesSel.size && !pendTudoMarcado.mes) ? [...pendMesSel].sort().map(pendMesNome).join(' + ') : 'Todos os meses';
    if (!pendCorSel.size || pendTudoMarcado.cor) return 'Todas as corretoras';
    const l = [...pendCorSel].sort();
    return (completo || l.length === 1) ? l.join(', ') : `${l.length} corretoras`;
  }
  function pendMultiFechar(){
    ['pendMesLista','pendCorLista','pendRelMenu'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
    ['pendMesBtn','pendCorBtn','pendPdfBtn'].forEach(id => { const el = document.getElementById(id); if (el) el.setAttribute('aria-expanded','false'); });
  }
  // Desenha a lista de um dos dois filtros (chamada no renderPendencias). `contagem` = {valor: nº de propostas}.
  function pendMultiRender(tipo, valores, contagem){
    const sel = tipo === 'mes' ? pendMesSel : pendCorSel;
    const opts = document.getElementById(tipo === 'mes' ? 'pendMesOpts' : 'pendCorOpts');
    const q = tipo === 'cor' ? String(document.getElementById('pendCorBusca').value || '').trim().toUpperCase() : '';
    const visiveis = valores.filter(v => !q || String(v).toUpperCase().indexOf(q) >= 0);
    opts.innerHTML = visiveis.length ? visiveis.map(v => `<label class="pmulti-item"><input type="checkbox" value="${pendEsc(v)}"${sel.has(v) ? ' checked' : ''}><span>${pendEsc(tipo === 'mes' ? pendMesNome(v) : v)}</span><span class="pmulti-n">${(contagem[v] || 0).toLocaleString('pt-BR')}</span></label>`).join('')
      : `<p class="pmulti-vazio">${q ? 'Nenhuma corretora com esse nome.' : 'Nada nesse recorte.'}</p>`;
    opts.querySelectorAll('input').forEach(i => i.addEventListener('change', () => { i.checked ? sel.add(i.value) : sel.delete(i.value); renderPendencias(); }));
    pendTudoMarcado[tipo] = valores.length > 0 && valores.every(v => sel.has(v));
    const btn = document.getElementById(tipo === 'mes' ? 'pendMesBtn' : 'pendCorBtn');
    btn.classList.toggle('on', sel.size > 0 && !pendTudoMarcado[tipo]);
    document.getElementById(tipo === 'mes' ? 'pendMesResumo' : 'pendCorResumo').textContent =
      tipo === 'mes' ? pendFiltroTexto('mes') : ((sel.size && !pendTudoMarcado.cor) ? pendFiltroTexto('cor') : 'Todas');
  }
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
  // Planium = Bitix (pedido do Victor, 2026-10-09): os dois contam o mesmo andamento, o Bitix mais detalhado
  // (conferido no extrato de 09/10: pendencia = DEVOLVIDA; analise = EM ANALISE / EM DIGITACAO / REANALISE /
  // LIBERADO...; implantada = PROCESSADO; cancelada = CANCELADO). A área continua com o nome "Planium" (é o que
  // a tabela dinâmica usa), mas o filtro mostra o status do Bitix. Os totais Em Análise / Em Pendência do
  // Resumo continuam pelo status do Planium — só o filtro ficou mais fino.
  //  - proposta em aberto sem Bitix = não achada no T6140B → "FORA DO T6140B";
  //  - finalizada (só aparece se marcar) leva o status do Planium junto ("PROCESSADO · implantada"), pra não
  //    se misturar com as 8 em aberto que já estão PROCESSADO no Bitix.
  // Cadastro/Ditec em branco = "SEM STATUS"; "INICIADO ANÁLISE:EC625813" (login do analista colado na origem)
  // vira um status só, "INICIADO ANÁLISE".
  PEND_STATUS_FIELD_LABELS.amanha = 'Implanta amanhã';
  const PEND_AMANHA_VALOR = 'Liberada em todas as áreas';
  // (declarações de função, não const: o Resumo do Dia chama pendImplantaAmanha já na carga da página,
  // antes desta linha rodar — function é "içada" pro topo da IIFE, const não.)
  function pendTxt(v){ const s = String(v == null ? '' : v).trim(); return s === '0' ? '' : s; }
  function pendSemLogin(v){ return pendTxt(v).replace(/:\s*[A-Z0-9]{5,}\s*$/i, ''); }
  // "Implanta amanhã": Cadastro CONCLUIDO + Ditec LIBERADA + Bitix LIBERADO. Regra do sênior conferida nos
  // extratos: das 326 assim em 07/10, 325 estavam implantadas (PROCESSADO) em 09/10.
  function pendImplantaAmanha(p){
    if (!p || p._extra || !p.status || typeof p.status !== 'object' || Array.isArray(p.status)) return false;
    const s = p.status;
    return /^CONCLU[IÍ]DO$/i.test(pendTxt(s.cadastro)) && /^LIBERADA$/i.test(pendTxt(s.ditec)) && /^LIBERADO$/i.test(pendTxt(s.bitix));
  }
  function pendPlaniumView(p){
    const bi = pendTxt(p.status.bitix).toUpperCase();
    // Finalizadas: o Planium manda (no Bitix elas se espalham — cancelada aparecia como CANCELADO, PROCESSADO,
    // EM DIGITACAO... — e viravam 8 opções com 1 ou 2 propostas). Ficam 3, no nome do Bitix.
    if (p._extra){
      const pl = pendTxt(p.status.planium).toLowerCase();
      if (pl === 'implantada') return 'PROCESSADO · implantada';
      if (pl === 'cancelada') return 'CANCELADO · cancelada';
      if (pl === 'devolvida') return 'DEVOLVIDA · encerrada';
      return `${bi || 'SEM STATUS NO BITIX'} · ${pl}`;
    }
    return bi || 'FORA DO T6140B';
  }
  function pendPmeStatuses(p){
    const out = [
      { field:'planium', value: pendPlaniumView(p) },
      { field:'cadastro', value: pendSemLogin(p.status.cadastro) || 'SEM STATUS' },
      { field:'ditec', value: pendSemLogin(p.status.ditec) || 'SEM STATUS' },
    ];
    if (pendImplantaAmanha(p)) out.push({ field:'amanha', value: PEND_AMANHA_VALOR });
    return out;
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
    // Filtro "mais livre" (pedido do Victor, 2026-10-07): propostas que NÃO estão em análise/pendência
    // (devolvida, implantada, cancelada...) vêm da lista completa do Planium (PROPOSTAS) e aparecem como
    // opção no status do Planium — só entram na tabela quando esse status é marcado. Sem filtro, o modal e
    // todos os totais do funil continuam mostrando só o que está em aberto (PENDENCIAS_PME), como sempre.
    const pmeExtras = (() => {
      const props = window.getPropostasData ? window.getPropostasData() : [];
      const toFriendly = g => window.getGestorFriendlyName ? window.getGestorFriendlyName(g) : g;
      const alvo = gestorNome ? toFriendly(gestorNome) : null;
      const jaTem = new Set(pme.map(p => String(p.proposta)));
      return props
        // só gestores conhecidos (nome cru com tradução pra um executivo — igual às pendências)
        .filter(p => p.st && !/pend|analis/i.test(p.st) && p.g && toFriendly(p.g) !== p.g && !jaTem.has(String(p.p)))
        .map(p => ({ proposta: p.p, corretora: p.co, status: { planium: p.st, cadastro: p.ca || '', ditec: p.di || '', bitix: p.bi || '' },
                     dataReceb: p.dr || '', dataVigencia: p.vg, beneficiarios: p.bn, _extra: true, _gestor: toFriendly(p.g) }))
        .filter(p => !alvo || p._gestor === alvo);
    })();
    const pmeComExtras = pme.concat(pmeExtras);
    document.getElementById('pendFilterLabel').textContent = pendActiveTab === 'pme' ? 'Filtrar por Data Vigência' : 'Filtrar por Data Status';
    document.getElementById('pendPropostaLabel').textContent = pendActiveTab === 'pme' ? 'Buscar por Nº da Proposta' : 'Buscar por Nº do Orçamento';
    document.getElementById('pendPropostaSearch').placeholder = pendActiveTab === 'pme' ? 'Ex.: 12345' : 'Ex.: 67890';
    document.getElementById('pendModalGestor').textContent = gestorNome || 'Todas as equipes';

    // "Consultar Funil" (pedido do Victor, 2026-09-29) — o dropdown de Gestor DENTRO do popup
    // troca pendCurrentGestor e re-renderiza, igual mês/corretora já faziam; nulo = todos os
    // gestores juntos. A coluna Gestor da tabela só aparece nesse caso (sozinho ela é óbvia/
    // redundante — sempre a mesma pessoa).
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
    // Vigência / Corretora com várias escolhas (2026-10-14) — tira da escolha o que não existe mais no recorte
    const contMes = {}, contCor = {};
    list.forEach(p => { const m = pendMonthOf(p[dateField]); if (m) contMes[m] = (contMes[m] || 0) + 1; if (p.corretora) contCor[p.corretora] = (contCor[p.corretora] || 0) + 1; });
    const months = Object.keys(contMes).sort();
    const corretoras = Object.keys(contCor).sort();
    [...pendMesSel].forEach(m => { if (!contMes[m]) pendMesSel.delete(m); });
    [...pendCorSel].forEach(c => { if (!contCor[c]) pendCorSel.delete(c); });
    pendMultiRender('mes', months, contMes);
    pendMultiRender('cor', corretoras, contCor);
    const mesOk = d => !pendMesSel.size || pendMesSel.has(pendMonthOf(d));
    const corOk = c => !pendCorSel.size || pendCorSel.has(c);

    // Cada chip carrega o par {campo, valor} — dois status com o mesmo texto mas de campos
    // diferentes (ex.: REANALISE no Ditec e no Bitix) viram chips distintos, nunca fundidos.
    const statusesOf = p => {
      if (Array.isArray(p.status)) return p.status.filter(v=>v && v!=='0').map(v => ({field:null, value:v}));
      if (p.status && typeof p.status === 'object') return pendPmeStatuses(p); // PME: Planium(Bitix)/Cadastro/Ditec/Implanta amanhã
      return (p.status && p.status !== '0') ? [{field:null, value:p.status}] : [];
    };
    const statusKey = o => (o.field ? o.field+'::' : '') + o.value;

    // Quantas vezes cada status aparece no recorte atual — usada pra ordenar por relevância
    // (mais frequente primeiro, dentro de cada esteira) e, no modo "todos os gestores", pra
    // esconder valores que aparecem 1 única vez: amostragem real em 2026-09-29 mostrou que os
    // 3 casos com exatamente 1 ocorrência tinham um ID de registro colado no próprio texto do
    // status (ex. "INICIADO ANÁLISE:EC625813") — glitch de digitação na origem (Ditec/SIGO), não
    // categoria real do funil. Com um gestor específico selecionado a lista já é curta, então
    // não filtra nada ali — só no agregado de ~19 gestores é que esse ruído aparece.
    // As propostas extras (devolvida/implantada/cancelada) só contam pro status do PLANIUM — os status de
    // Cadastro/Ditec/Bitix delas não entram nas opções (senão as implantadas inflavam essas contagens).
    const chipList = pendActiveTab === 'pme' ? pmeComExtras : pf;
    const statusesForChips = p => p._extra ? statusesOf(p).filter(o => o.field === 'planium') : statusesOf(p);
    const statusCounts = {};
    chipList.flatMap(statusesForChips).forEach(o => { const k = statusKey(o); statusCounts[k] = (statusCounts[k]||0) + 1; });

    const seenKeys = new Set();
    const statuses = [];
    chipList.flatMap(statusesForChips).forEach(o => { const k = statusKey(o); if (!seenKeys.has(k)){ seenKeys.add(k); statuses.push(o); } });
    pendSelectedStatuses.forEach(k => { if (!seenKeys.has(k)) pendSelectedStatuses.delete(k); });

    // "Implanta amanhã" nunca some do painel (mesmo com 0 ou 1 proposta) — por isso não passa pelo corte de
    // "aparece 1 vez só" abaixo; ela tem área própria, desenhada à parte.
    const amanhaKey = 'amanha::' + PEND_AMANHA_VALOR;
    const amanhaRows = pendActiveTab === 'pme' ? pme.filter(pendImplantaAmanha) : [];
    const amanhaVidas = amanhaRows.reduce((s,p)=>s+(p.beneficiarios||0),0);
    const isFinalizada = o => o.field === 'planium' && o.value.indexOf(' · ') >= 0; // só existe nas extras
    const FIELD_ORDER = ['planium','cadastro','ditec'];
    const visibleStatuses = statuses
      // (o corte de "aparece 1 vez só" era por causa do login colado no status — no PME isso agora é limpo
      // em pendSemLogin, então lá mostra tudo; continua valendo pro PF)
      .filter(o => o.field !== 'amanha' && (gestorNome || o.field || statusCounts[statusKey(o)] > 1))
      .sort((a,b) => {
        const fa = FIELD_ORDER.indexOf(a.field), fb = FIELD_ORDER.indexOf(b.field);
        if (fa !== fb) return fa - fb;
        // "SEM STATUS"/"FORA DO T6140B" vão pro fim da área
        const sa = /^(SEM STATUS|FORA DO T6140B)$/.test(a.value) ? 1 : 0, sb = /^(SEM STATUS|FORA DO T6140B)$/.test(b.value) ? 1 : 0;
        if (sa !== sb) return sa - sb;
        return statusCounts[statusKey(b)] - statusCounts[statusKey(a)];
      });
    // Painel por área (V1, 2026-10-07; V2 2026-10-09): áreas lado a lado na ordem da esteira, cada uma com uma
    // frase explicando (texto provisório — Victor revisa), caixinha + quantidade de propostas e uma barrinha
    // atrás mostrando o peso de cada status na área. No Planium, as finalizadas (devolvida, implantada,
    // cancelada) ficam num grupo à parte — só entram na tabela quando marcadas. Lógica do filtro: OU, como antes.
    const PEND_AREA_TEXTO = {
      planium: 'Andamento da proposta até a implantação (status do Bitix).',
      cadastro: 'Conferência dos dados e documentos da empresa e dos beneficiários.',
      ditec: 'Análise da área médica/técnica (declarações de saúde).',
    };
    const escHtml = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const areaNome = f => f ? (PEND_STATUS_FIELD_LABELS[f] || f) : '';
    const itemHtml = (o, areaTot) => {
      const k = statusKey(o), n = statusCounts[k] || 0;
      const pct = areaTot ? Math.max(2, Math.round(n / areaTot * 100)) : 0;
      const txt = o.value;
      return `<label class="pst-item${/^(SEM STATUS|FORA DO T6140B)$/.test(o.value) || isFinalizada(o) ? ' rare' : ''}" style="--p:${isFinalizada(o) ? 0 : pct}"><input type="checkbox" data-status="${escHtml(k)}"${pendSelectedStatuses.has(k)?' checked':''}><span>${escHtml(txt)}</span><span class="pst-n">${n.toLocaleString('pt-BR')}</span></label>`;
    };
    const chipsWrap = document.getElementById('pendStatusChips');
    const campos = [...new Set(visibleStatuses.map(o => o.field))];
    if (!visibleStatuses.length){
      chipsWrap.className = 'pst-flow pst-simple';
      chipsWrap.innerHTML = '<p class="pst-hint" style="margin:0">Nenhum status nesse recorte.</p>';
    } else if (campos.length === 1 && campos[0] === null){
      // PF: um status só por orçamento, sem áreas — lista simples.
      const tot = visibleStatuses.reduce((s,o)=>s+(statusCounts[statusKey(o)]||0),0);
      chipsWrap.className = 'pst-flow pst-simple';
      chipsWrap.innerHTML = `<div class="pst-area"><div class="pst-opts">${visibleStatuses.map(o => itemHtml(o, tot)).join('')}</div></div>`;
    } else {
      chipsWrap.className = 'pst-flow';
      const areas = FIELD_ORDER.filter(f => campos.includes(f)).map((f, i) => {
        const dela = visibleStatuses.filter(o => o.field === f);
        const normais = dela.filter(o => !isFinalizada(o)), finais = dela.filter(isFinalizada);
        const tot = normais.reduce((s,o)=>s+(statusCounts[statusKey(o)]||0),0);
        return `<div class="pst-area"><div class="pst-step"><span class="pst-num">${i + 1}</span><h4>${escHtml(areaNome(f))}</h4><span class="pst-step-n">${tot.toLocaleString('pt-BR')}</span></div>
          ${PEND_AREA_TEXTO[f] ? `<p class="pst-desc">${PEND_AREA_TEXTO[f]}</p>` : ''}
          <div class="pst-opts">${normais.map(o => itemHtml(o, tot)).join('')}</div>
          ${finais.length ? `<details class="pst-fin"${pendFinAberto || finais.some(o => pendSelectedStatuses.has(statusKey(o))) ? ' open' : ''}><summary>Finalizadas <span class="pst-fin-sub">· só aparecem se marcar</span></summary><div class="pst-opts">${finais.map(o => itemHtml(o, 0)).join('')}</div></details>` : ''}
          ${normais.length > 1 ? `<button type="button" class="pst-all" data-field="${escHtml(f)}">Marcar todos de ${escHtml(areaNome(f))}</button>` : ''}</div>`;
      });
      if (pendActiveTab === 'pme'){
        areas.push(`<div class="pst-area amanha"><div class="pst-step"><span class="pst-num">${areas.length + 1}</span><h4>Implanta amanhã</h4></div>
          <p class="pst-desc">Liberada em todas as áreas — Cadastro CONCLUIDO, Ditec LIBERADA e Planium LIBERADO. Implanta no dia seguinte.</p>
          <div class="pst-big"><b>${amanhaVidas.toLocaleString('pt-BR')}</b><span>${amanhaVidas === 1 ? 'vida' : 'vidas'} em ${amanhaRows.length} ${amanhaRows.length === 1 ? 'proposta' : 'propostas'}</span></div>
          <label class="pst-switch"><input type="checkbox" data-status="${escHtml(amanhaKey)}"${pendSelectedStatuses.has(amanhaKey)?' checked':''}${amanhaRows.length ? '' : ' disabled'}><span>${amanhaRows.length ? 'Mostrar só essas propostas' : 'Nenhuma neste recorte'}</span></label></div>`);
      }
      chipsWrap.innerHTML = areas.join('');
    }
    chipsWrap.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        const k = cb.dataset.status;
        if (cb.checked) pendSelectedStatuses.add(k); else pendSelectedStatuses.delete(k);
        renderPendencias();
      });
    });
    chipsWrap.querySelectorAll('details.pst-fin').forEach(d => d.addEventListener('toggle', () => { pendFinAberto = d.open; }));
    chipsWrap.querySelectorAll('.pst-all').forEach(btn => {
      btn.addEventListener('click', () => {
        visibleStatuses.filter(o => o.field === btn.dataset.field && !isFinalizada(o)).forEach(o => pendSelectedStatuses.add(statusKey(o)));
        renderPendencias();
      });
    });
    // Etiquetas dos status marcados (só a que acabou de entrar anima) + resumo no botão
    const ativos = document.getElementById('pendStatusAtivos');
    const keysAntes = new Set([...ativos.querySelectorAll('button[data-status]')].map(b => b.dataset.status));
    ativos.innerHTML = [...pendSelectedStatuses].map(k => {
      const sep = k.indexOf('::'), f = sep >= 0 ? k.slice(0, sep) : null, v = sep >= 0 ? k.slice(sep + 2) : k;
      return `<span class="pst-tag${f === 'amanha' ? ' amanha' : ''}${keysAntes.has(k) ? '' : ' new'}">${f ? `<span class="pst-tag-area">${escHtml(areaNome(f))} ·</span> ` : ''}${escHtml(v)}<button type="button" aria-label="Tirar o status ${escHtml(v)}" data-status="${escHtml(k)}">×</button></span>`;
    }).join('');
    ativos.querySelectorAll('button[data-status]').forEach(b => b.addEventListener('click', () => { pendSelectedStatuses.delete(b.dataset.status); renderPendencias(); }));
    const nSel = pendSelectedStatuses.size;
    document.getElementById('pendStatusResumo').textContent = nSel ? (nSel === 1 ? '1 status marcado' : nSel + ' status marcados') : 'Todos os status';
    document.getElementById('pendStatusBtn').classList.toggle('on', nSel > 0);
    document.getElementById('pendStatusHint').textContent = pendActiveTab === 'pme'
      ? 'A proposta passa pelas áreas nessa ordem. Na mesma área, vale qualquer status marcado; marcando em áreas diferentes, a proposta precisa bater em todas. Os números mostram quantas propostas estão em cada situação.'
      : 'Marque o que quer ver; os números mostram quantos orçamentos estão em cada situação.';
    document.getElementById('pendStatusClear').style.display = nSel ? '' : 'none';

    // Busca por número — texto livre, casa parcialmente (contém), ignora espaços nas pontas.
    // Proposta (PME) e Orçamento (PF) são campos diferentes, mas o mesmo campo de busca serve
    // pros dois: cada aba já sabe qual número procurar (dataVigencia/dataStatus segue o mesmo padrão).
    const searchRaw = document.getElementById('pendPropostaSearch').value.trim().toLowerCase();

    // Extras só entram quando o status do Planium delas está marcado; as em aberto seguem a regra de sempre.
    // (busca por nº sem status marcado também acha as extras — ex.: "essa proposta já foi implantada?")
    // Regra do filtro (corrigida em 09/10/2026, Victor achou: marcou Planium LIBERADO + Cadastro CONCLUIDO + Ditec LIBERADA
    // e vinham DEVOLVIDAS — o filtro era "OU" geral, bastava bater numa área). Agora: dentro da MESMA área vale qualquer
    // status marcado (OU); entre áreas DIFERENTES a proposta tem que bater em todas (E).
    const selPorArea = {};
    pendSelectedStatuses.forEach(k => { const sep = k.indexOf('::'), f = sep >= 0 ? k.slice(0, sep) : ''; (selPorArea[f] = selPorArea[f] || new Set()).add(k); });
    const bateFiltro = p => {
      const keys = statusesOf(p).map(statusKey);
      return Object.values(selPorArea).every(set => keys.some(k => set.has(k)));
    };
    const pmeStatusOk = p => p._extra
      ? (pendActiveTab === 'pme' && ((!!selPorArea.planium && bateFiltro(p)) || (!!searchRaw && pendSelectedStatuses.size === 0)))
      : (pendActiveTab !== 'pme' || pendSelectedStatuses.size === 0 || bateFiltro(p));
    const pmeFiltered = pmeComExtras.filter(p => mesOk(p.dataVigencia) && corOk(p.corretora) && pmeStatusOk(p) && (!searchRaw || String(p.proposta||'').toLowerCase().indexOf(searchRaw) >= 0))
      .sort((a,b) => pendSortDir * ((a.beneficiarios||0) - (b.beneficiarios||0)));
    const pfFiltered = pf.filter(p => mesOk(p.dataStatus) && corOk(p.corretora) && (pendActiveTab !== 'pf' || pendSelectedStatuses.size === 0 || bateFiltro(p)) && (!searchRaw || String(p.orcamento||'').toLowerCase().indexOf(searchRaw) >= 0))
      .sort((a,b) => pendSortDir * ((a.vidas||0) - (b.vidas||0)));
    pendLastPmeFiltered = pmeFiltered;
    pendLastPfFiltered = pfFiltered;
    // "Baixar relatório" (2026-10-14): o que está filtrado na tela, em PDF (direto) ou Excel — agora também com
    // "Todos os gestores" (o relatório ganha a coluna Gestor). Desligado só quando o filtro não traz nada.
    const nTela = pendActiveTab === 'pme' ? pmeFiltered.length : pfFiltered.length;
    const relBtn = document.getElementById('pendPdfBtn');
    relBtn.disabled = !nTela;
    relBtn.style.opacity = relBtn.disabled ? '.5' : '';
    relBtn.style.cursor = relBtn.disabled ? 'default' : 'pointer';
    relBtn.title = nTela ? `Relatório com ${nTela} ${pendActiveTab === 'pme' ? 'propostas' : 'orçamentos'} do filtro atual (PDF ou Excel)` : 'Nada no filtro atual';
    // "Baixar funil (Excel)": funil INTEIRO de todos os gestores, sem os filtros da tela (PME ou PF, conforme a aba)
    const xlsxBtn = document.getElementById('pendXlsxBtn');
    const nFunil = pendActiveTab === 'pme' ? Object.values(PENDENCIAS_PME || {}).reduce((s, a) => s + (a || []).length, 0) : Object.values(PENDENCIAS_PF || {}).reduce((s, a) => s + (a || []).length, 0);
    xlsxBtn.disabled = !nFunil;
    xlsxBtn.title = pendActiveTab === 'pme' ? 'Funil PME inteiro (todos os gestores, sem os filtros da tela) com as abas DINÂMICA, ESTEIRA DITEC, RESULTADO FINAL, PLANIUM e T6140B'
      : 'Funil PF inteiro (todos os gestores, sem os filtros da tela) com a aba DINÂMICA por gestor e status';

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
    if (pendMesSel.size) pendFilterParts.push(pendFiltroTexto('mes'));
    if (pendCorSel.size) pendFilterParts.push(pendFiltroTexto('cor'));
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
      <tr><td>${p.proposta}</td><td class="num">${p.beneficiarios}</td><td class="name">${p.corretora}</td>${showGestorCol?`<td>${p._gestor||''}</td>`:''}<td>
        <span class="tag ${p.status.planium==='pendencia'?'react':'noelig'}" title="Planium: ${p.status.planium||'—'}">${pendPlaniumView(p)}</span>${pendImplantaAmanha(p) ? '<span class="pend-amanha">Implanta amanhã</span>' : ''}
        <div style="font-size:10.5px; color:var(--muted); margin-top:4px; line-height:1.6;">${['cadastro','ditec'].filter(k=>pendTxt(p.status[k])).map(k=>`${k.charAt(0).toUpperCase()+k.slice(1)}: <b>${pendSemLogin(p.status[k])}</b>`).join(' · ')}</div>
      </td><td>${p.dataReceb}</td><td>${p.dataVigencia}</td></tr>
    `).join('') : pendEmptyRow(showGestorCol?7:6, 'pendência PME/SS');
    document.getElementById('pendPfBody').innerHTML = pfFiltered.length ? pfFiltered.map(p => `
      <tr><td>${p.orcamento}</td><td class="num">${p.vidas}</td><td class="name">${p.corretora}</td>${showGestorCol?`<td>${p._gestor||''}</td>`:''}<td><span class="tag react">${p.status}</span></td><td>${p.dataStatus}</td></tr>
    `).join('') : pendEmptyRow(showGestorCol?6:5, 'pendência PF');
    document.querySelectorAll('#pendPmeBody .pend-empty-clear, #pendPfBody .pend-empty-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        pendMesSel.clear(); pendCorSel.clear();
        document.getElementById('pendPropostaSearch').value = '';
        pendSelectedStatuses.clear();
        renderPendencias();
      });
    });
  }

  // Painel de status: abre/fecha animado (classe .open; .just-opened só na abertura, pra as áreas entrarem
  // uma vez — os cliques nas caixinhas redesenham o conteúdo e não devem reanimar nada).
  function pendStatusPanelSet(abrir){
    const wrap = document.getElementById('pendStatusPanel'), btn = document.getElementById('pendStatusBtn');
    wrap.classList.toggle('open', abrir);
    btn.setAttribute('aria-expanded', String(abrir));
    if (abrir){ wrap.classList.add('just-opened'); clearTimeout(pendStatusPanelSet._t); pendStatusPanelSet._t = setTimeout(() => wrap.classList.remove('just-opened'), 500); }
  }
  document.getElementById('pendStatusBtn').addEventListener('click', () => pendStatusPanelSet(!document.getElementById('pendStatusPanel').classList.contains('open')));

  window.showPendenciasModal = function(gestorNome, opts){
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
    pendMesSel.clear(); pendCorSel.clear(); pendMultiFechar(); document.getElementById('pendCorBusca').value = '';
    document.getElementById('pendPropostaSearch').value = '';
    pendSelectedStatuses.clear();
    // opts.amanha: veio do cartão "Implanta amanhã" do Resumo do Dia — já abre filtrado nisso.
    if (opts && opts.amanha) pendSelectedStatuses.add('amanha::' + PEND_AMANHA_VALOR);
    pendStatusPanelSet(false);
    renderPendencias();
    document.getElementById('pendModalOverlay').style.display = 'flex';
  };
  document.getElementById('btnClosePend').addEventListener('click', () => { document.getElementById('pendModalOverlay').style.display = 'none'; });
  document.getElementById('pendModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'pendModalOverlay') document.getElementById('pendModalOverlay').style.display = 'none'; });
  window.__kb(document.getElementById('pendStatusClear')).addEventListener('click', () => { pendSelectedStatuses.clear(); renderPendencias(); });
  // Vigência / Corretora com várias escolhas (2026-10-14): abre/fecha as listas, busca, "marcar todos"/"limpar".
  [['pendMesBtn','pendMesLista'], ['pendCorBtn','pendCorLista']].forEach(([b, l]) => {
    document.getElementById(b).addEventListener('click', (e) => {
      e.stopPropagation();
      const lista = document.getElementById(l), abrir = lista.hidden;
      pendMultiFechar();
      lista.hidden = !abrir; document.getElementById(b).setAttribute('aria-expanded', String(abrir));
      if (abrir && l === 'pendCorLista') document.getElementById('pendCorBusca').focus();
    });
    document.getElementById(l).addEventListener('click', (e) => e.stopPropagation());
  });
  document.getElementById('pendCorBusca').addEventListener('input', () => renderPendencias());
  document.getElementById('pendMesTodos').addEventListener('click', () => { document.querySelectorAll('#pendMesOpts input').forEach(i => pendMesSel.add(i.value)); renderPendencias(); });
  document.getElementById('pendCorTodos').addEventListener('click', () => { document.querySelectorAll('#pendCorOpts input').forEach(i => pendCorSel.add(i.value)); renderPendencias(); });
  document.getElementById('pendMesLimpa').addEventListener('click', () => { pendMesSel.clear(); renderPendencias(); });
  document.getElementById('pendCorLimpa').addEventListener('click', () => { pendCorSel.clear(); renderPendencias(); });
  document.getElementById('pendModal').addEventListener('click', () => pendMultiFechar());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') pendMultiFechar(); });
  document.getElementById('pendPropostaSearch').addEventListener('input', renderPendencias);
  // Troca o gestor SEM fechar o popup — pedido do Victor, 2026-09-29 ("Consultar Funil"),
  // portado do V2: dropdown vazio = todos os gestores juntos, mesma variável que já controlava
  // tudo o resto.
  document.getElementById('pendGestorFilter').addEventListener('change', (e) => {
    pendCurrentGestor = e.target.value || null;
    document.getElementById('pendModalGestor').textContent = pendCurrentGestor || 'Todas as equipes';
    pendMesSel.clear(); pendCorSel.clear(); pendMultiFechar(); document.getElementById('pendCorBusca').value = '';
    pendSelectedStatuses.clear();
    renderPendencias();
  });
  // Botão "Consultar Funil" do Resumo do Dia — abre o mesmo popup de Pendências, só que sem
  // gestor pré-selecionado (todo mundo junto), com o filtro de gestor já disponível lá dentro.
  document.getElementById('btnConsultarFunil').addEventListener('click', () => {
    document.getElementById('resumoModalOverlay').style.display = 'none';
    window.showPendenciasModal(null);
  });

  // ===== "Baixar relatório" (2026-10-14, pedido do Victor) =====
  // Relatório do que está FILTRADO na tela (gestor, vigências, corretoras, status, busca), em PDF ou Excel — o menu do
  // botão escolhe. Antes era uma página HTML que a pessoa tinha que salvar como PDF pelo Ctrl+P; agora o PDF é gerado
  // direto (jsPDF + autoTable, carregados do cdnjs só no clique — o login não fica mais lento). Com mais de uma corretora,
  // o relatório sai separado por corretora (cabeçalho + subtotal de cada uma) e o total geral no fim. Funciona também em
  // "Todos os gestores" (aí o relatório ganha a coluna Gestor). O funil inteiro vai pelo "Baixar funil (Excel)".
  let pendJsPdfPromise = null;
  function pendLoadJsPdf(){
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) return Promise.resolve(window.jspdf.jsPDF);
    if (!pendJsPdfPromise){
      const carrega = src => new Promise((res, rej) => {
        const s = document.createElement('script'); s.src = src;
        s.onload = res; s.onerror = () => rej(new Error('Falha ao baixar a biblioteca de PDF'));
        document.head.appendChild(s);
      });
      pendJsPdfPromise = carrega('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        .then(() => carrega('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'))
        .then(() => { if (!(window.jspdf && window.jspdf.jsPDF)) throw new Error('jsPDF não carregou'); return window.jspdf.jsPDF; })
        .catch(e => { pendJsPdfPromise = null; throw e; });
    }
    return pendJsPdfPromise;
  }
  const pendDataBR = iso => iso ? String(iso).slice(0,10).split('-').reverse().join('/') : '—';
  // Monta o conteúdo do relatório a partir do que está na tela (mesma lista da tabela)
  function pendRelatorioDados(){
    const isPme = pendActiveTab === 'pme';
    const rows = (isPme ? pendLastPmeFiltered : pendLastPfFiltered).slice();
    const gestor = pendCurrentGestor ? (window.getGestorFriendlyName ? window.getGestorFriendlyName(pendCurrentGestor) : pendCurrentGestor) : 'Todas as equipes';
    const comGestor = !pendCurrentGestor;
    const vidasDe = p => isPme ? (p.beneficiarios || 0) : (p.vidas || 0);
    const dataDe = p => isPme ? (p.dataVigencia || '') : (p.dataStatus || '');
    rows.sort((a,b) => String(a.corretora||'').localeCompare(String(b.corretora||'')) || dataDe(b).localeCompare(dataDe(a)));
    const grupos = [], idx = {};
    rows.forEach(p => { const c = p.corretora || '(sem corretora)'; if (!(c in idx)){ idx[c] = grupos.length; grupos.push({ nome: c, rows: [] }); } grupos[idx[c]].rows.push(p); });
    const cols = isPme
      ? ['Proposta', ...(comGestor ? ['Gestor'] : []), 'Corretora', 'Recebido', 'Vigência', 'Planium', 'Cadastro', 'Ditec', 'Vidas']
      : ['Orçamento', ...(comGestor ? ['Gestor'] : []), 'Corretora', 'Data status', 'Status', 'Vidas'];
    const linha = p => isPme
      ? [String(p.proposta), ...(comGestor ? [p._gestor || ''] : []), p.corretora || '', pendDataBR(p.dataReceb), pendDataBR(p.dataVigencia),
         pendPlaniumView(p) + (pendImplantaAmanha(p) ? ' · implanta amanhã' : ''), pendSemLogin(p.status.cadastro) || '—', pendSemLogin(p.status.ditec) || '—', vidasDe(p)]
      : [String(p.orcamento), ...(comGestor ? [p._gestor || ''] : []), p.corretora || '', pendDataBR(p.dataStatus), p.status || '', vidasDe(p)];
    const busca = document.getElementById('pendPropostaSearch').value.trim();
    const filtros = [
      `${isPme ? 'Vigência' : 'Data status'}: ${pendFiltroTexto('mes')}`,
      `Corretora: ${pendFiltroTexto('cor', true)}`,
      `Status: ${pendSelectedStatuses.size ? [...pendSelectedStatuses].map(pendStatusKeyToLabel).join(', ') : 'Todos os status'}`,
    ].concat(busca ? [`Busca: "${busca}"`] : []);
    const total = rows.reduce((s,p) => s + vidasDe(p), 0);
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '.');
    const nomeBase = `Pendencias ${isPme ? 'PME' : 'PF'} - ${gestor} - ${hoje}`.replace(/[\\/:*?"<>|]+/g, ' ').trim();
    const qtd = n => `${n.toLocaleString('pt-BR')} ${isPme ? (n === 1 ? 'proposta' : 'propostas') : (n === 1 ? 'orçamento' : 'orçamentos')}`;
    return { qtd, isPme, rows, gestor, comGestor, grupos, separar: grupos.length > 1, cols, linha, vidasDe, filtros, total, nomeBase };
  }
  const pendCorStatus = st => {
    const s = String(st || '').toLowerCase();
    if (/implant|conclu|liberad|assinado|processado/.test(s)) return [22,184,122];
    if (/pend/.test(s)) return [242,107,33];
    if (/cancel|recusad|devolv/.test(s)) return [245,54,74];
    return null;
  };

  async function pendRelatorioPdf(){
    const d = pendRelatorioDados(); if (!d.rows.length) return;
    const jsPDF = await pendLoadJsPdf();
    const doc = new jsPDF({ orientation: d.isPme ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 32;
    const NAVY = [16,30,99], AZUL = [29,51,168], CINZA = [86,96,143], FUNDO = [238,242,253];
    const fmtN = n => Math.round(n || 0).toLocaleString('pt-BR');
    // Cabeçalho
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...NAVY);
    doc.text(`Relatório de Pendências ${d.isPme ? 'PME/SS' : 'PF'}`, M, M + 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...CINZA);
    doc.text(d.gestor, M, M + 26);
    doc.setFontSize(8.5);
    doc.text(['Hapvida NotreDame Intermédica · NDI SP', 'Emitido em ' + new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })], W - M, M + 8, { align: 'right' });
    const filtrosTxt = doc.splitTextToSize(d.filtros.join('   ·   '), W - 2 * M);
    doc.text(filtrosTxt, M, M + 42);
    let y = M + 42 + filtrosTxt.length * 10 + 4;
    doc.setDrawColor(...AZUL); doc.setLineWidth(2); doc.line(M, y, W - M, y);
    y += 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...NAVY);
    doc.text(`${d.qtd(d.rows.length)}   ·   ${fmtN(d.total)} vidas${d.separar ? `   ·   ${d.grupos.length} corretoras` : ''}`, M, y);
    y += 8;
    // Corpo — separado por corretora quando há mais de uma
    const nCol = d.cols.length, iVidas = nCol - 1;
    const iStatus = d.cols.indexOf(d.isPme ? 'Planium' : 'Status');
    const body = [];
    if (d.separar){
      d.grupos.forEach(g => {
        const v = g.rows.reduce((s,p) => s + d.vidasDe(p), 0);
        body.push([{ content: `${g.nome}  —  ${d.qtd(g.rows.length)} · ${fmtN(v)} vidas`, colSpan: nCol, styles: { fillColor: FUNDO, textColor: AZUL, fontStyle: 'bold', fontSize: 8 } }]);
        g.rows.forEach(p => body.push(d.linha(p)));
      });
    } else {
      d.rows.forEach(p => body.push(d.linha(p)));
    }
    const colStyles = {}; colStyles[iVidas] = { halign: 'right', fontStyle: 'bold', cellWidth: 38 };
    doc.autoTable({
      startY: y + 6, head: [d.cols], body,
      foot: [[{ content: `Total — ${d.rows.length} registro(s)`, colSpan: nCol - 1 }, { content: fmtN(d.total), styles: { halign: 'right' } }]],
      theme: 'grid', showFoot: 'lastPage', margin: { left: M, right: M, bottom: 36 },
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 3, overflow: 'linebreak', lineColor: [227,233,248], lineWidth: 0.5, textColor: [19,28,79] },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: FUNDO, textColor: NAVY, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248,250,255] },
      columnStyles: colStyles,
      didParseCell: data => {
        if (data.section === 'body' && data.column.index === iStatus && typeof data.cell.raw === 'string'){
          const c = pendCorStatus(data.cell.raw); if (c){ data.cell.styles.textColor = c; data.cell.styles.fontStyle = 'bold'; }
        }
      },
      didDrawPage: () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...CINZA);
        doc.text(`Fonte: funil ${d.isPme ? 'PME (Planium + T6140B)' : 'PF (T221ORCAM)'} · gerado pelo Painel Comercial`, M, H - 18);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, W - M, H - 18, { align: 'right' });
      },
    });
    doc.save(`${d.nomeBase}.pdf`);
    if (window.fsRegistrarAcesso) window.fsRegistrarAcesso('baixou', `${d.nomeBase}.pdf`); // registro de acessos (item 4)
  }

  async function pendRelatorioXlsx(){
    const d = pendRelatorioDados(); if (!d.rows.length) return;
    const ExcelJS = await pendLoadExcelJS();
    const wb = new ExcelJS.Workbook(); wb.creator = 'Painel Comercial — Cauda Longa NDI SP';
    const ws = wb.addWorksheet('RELATÓRIO', { views: [{ state: 'frozen', ySplit: 5 }] });
    const NAVY = 'FF101E63', AZUL = 'FF1D33A8', FUNDO = 'FFEEF2FD', CINZA = 'FFE3E9F8';
    const borda = { top:{style:'thin',color:{argb:CINZA}}, bottom:{style:'thin',color:{argb:CINZA}}, left:{style:'thin',color:{argb:CINZA}}, right:{style:'thin',color:{argb:CINZA}} };
    const nCol = d.cols.length;
    ws.mergeCells(1, 1, 1, nCol); ws.getCell(1,1).value = `Relatório de Pendências ${d.isPme ? 'PME/SS' : 'PF'} — ${d.gestor}`;
    ws.getCell(1,1).font = { bold: true, size: 13, color: { argb: NAVY } };
    ws.mergeCells(2, 1, 2, nCol); ws.getCell(2,1).value = d.filtros.join('   ·   ');
    ws.getCell(2,1).font = { italic: true, size: 9, color: { argb: 'FF56608F' } };
    ws.mergeCells(3, 1, 3, nCol); ws.getCell(3,1).value = `${d.qtd(d.rows.length)} · ${d.total.toLocaleString('pt-BR')} vidas · emitido em ${new Date().toLocaleString('pt-BR')}`;
    ws.getCell(3,1).font = { size: 9, color: { argb: 'FF56608F' } };
    const cab = ws.getRow(5); d.cols.forEach((h, i) => { const c = cab.getCell(i + 1); c.value = h; c.font = { bold:true, color:{argb:'FFFFFFFF'}, size:10 }; c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:NAVY} }; c.alignment = { horizontal:'center', vertical:'middle', wrapText:true }; c.border = borda; });
    cab.height = 26;
    const largura = { 'Proposta':12, 'Orçamento':14, 'Gestor':30, 'Corretora':42, 'Recebido':12, 'Vigência':12, 'Data status':13, 'Planium':26, 'Status':26, 'Cadastro':20, 'Ditec':16, 'Vidas':9 };
    d.cols.forEach((h, i) => { ws.getColumn(i + 1).width = largura[h] || 14; });
    const ehData = d.cols.map(h => /Recebido|Vigência|Data status/.test(h));
    const paraXl = (v, i) => {
      if (ehData[i]){ const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v)); return m ? new Date(Date.UTC(+m[3], +m[2]-1, +m[1])) : ''; }
      if (i === 0 && /^\d+$/.test(String(v))) return Number(v);
      return v;
    };
    let r = 6;
    const escreve = p => {
      const row = ws.getRow(r++);
      d.linha(p).forEach((v, i) => { const c = row.getCell(i + 1); c.value = paraXl(v, i); c.border = borda; if (ehData[i]) { c.numFmt = 'dd/mm/yyyy'; c.alignment = { horizontal:'center' }; } });
      row.getCell(nCol).font = { bold: true };
    };
    const faixa = (txt, v, cor) => {
      const row = ws.getRow(r++);
      ws.mergeCells(row.number, 1, row.number, nCol - 1);
      row.getCell(1).value = txt; row.getCell(nCol).value = v;
      for (let i = 1; i <= nCol; i++){ const c = row.getCell(i); c.font = { bold: true, color: { argb: cor === NAVY ? 'FFFFFFFF' : AZUL } }; c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: cor } }; c.border = borda; }
    };
    if (d.separar){
      d.grupos.forEach(g => {
        const v = g.rows.reduce((s,p) => s + d.vidasDe(p), 0);
        faixa(`${g.nome} — ${d.qtd(g.rows.length)}`, v, FUNDO);
        g.rows.forEach(escreve);
      });
    } else {
      d.rows.forEach(escreve);
    }
    faixa(`TOTAL — ${d.rows.length} registro(s)`, d.total, NAVY);
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `${d.nomeBase}.xlsx`;
    document.body.appendChild(a); a.click();
    if (window.fsRegistrarAcesso) window.fsRegistrarAcesso('baixou', a.download); // registro de acessos (item 4)
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // Botão "Baixar relatório" abre o menu PDF / Excel
  document.getElementById('pendPdfBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const m = document.getElementById('pendRelMenu'), abrir = m.hidden;
    pendMultiFechar();
    m.hidden = !abrir; e.currentTarget.setAttribute('aria-expanded', String(abrir));
    if (abrir){ const op = m.querySelector('.prel-op'); if (op) op.focus(); }
  });
  document.getElementById('pendRelMenu').addEventListener('click', (e) => e.stopPropagation());
  document.querySelectorAll('#pendRelMenu .prel-op').forEach(op => op.addEventListener('click', async () => {
    pendMultiFechar();
    const btn = document.getElementById('pendPdfBtn'), orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Gerando...';
    try { if (op.dataset.fmt === 'pdf') await pendRelatorioPdf(); else await pendRelatorioXlsx(); }
    catch(err){ alert('Não consegui gerar o relatório: ' + err.message); }
    finally { btn.innerHTML = orig; btn.disabled = false; }
  }));

  // ===== "Baixar .xlsx" do funil PME (pedido do Victor, 2026-10-09) =====
  // Decisões: (1) exporta EXATAMENTE o que está na tela (gestor/mês/corretora/status/busca — pendLastPmeFiltered);
  // (2) liberado pra todos os perfis (ele já manda a planilha manual no grupo geral); (3) duas abas:
  //  - RESULTADO FINAL: mesmas colunas da aba de mesmo nome do "RELATORIO PME AUTOMATIZADO" (menos OPERADORA, que o
  //    painel não guarda) + IMPLANTA AMANHÃ + EMPRESA;
  //  - DINÂMICA e ESTEIRA DITEC: tabelas dinâmicas de verdade (2ª versão, 09/10 — a 1ª era com fórmulas e o duplo
  //    clique não abria os detalhes), montadas igual à planilha original — ver pendAddPivots;
  //  - PLANIUM e T6140B: os campos que o painel guarda de cada extrato (base inteira).
  let pendExcelJsPromise = null;
  function pendLoadExcelJS(){
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (!pendExcelJsPromise){
      pendExcelJsPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
        s.onload = () => window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS não carregou'));
        s.onerror = () => { pendExcelJsPromise = null; reject(new Error('Falha ao baixar a biblioteca de planilhas')); };
        document.head.appendChild(s);
      });
    }
    return pendExcelJsPromise;
  }
  // Tabelas dinâmicas REAIS no .xlsx (o ExcelJS 4.4.0 do cdnjs não cria): abre o arquivo gerado (zip), acrescenta
  // um "cache" que aponta pra aba de origem + uma definição de tabela dinâmica por aba, com refreshOnLoad — o Excel
  // monta as tabelas ao abrir (ou ao clicar em "Habilitar Edição", se o arquivo abrir no Modo de Exibição Protegido).
  // Duplo clique num valor abre os detalhes, como numa dinâmica feita à mão. Testado no Excel em 09/10/2026.
  //   opt = { sourceSheet, headers:[...], rows:[[...]] (datas como 'aaaa-mm-dd'),
  //           pivots:[{ sheetIndex (nº do arquivo sheetN.xml), name, row, col, pages:[...], data, dataName, rowCaption }] }
  let pendJsZipPromise = null;
  function pendLoadJsZip(){
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!pendJsZipPromise){
      pendJsZipPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('JSZip não carregou'));
        s.onerror = () => { pendJsZipPromise = null; reject(new Error('Falha ao baixar a biblioteca de compactação')); };
        document.head.appendChild(s);
      });
    }
    return pendJsZipPromise;
  }
  async function pendAddPivots(buf, opt){
    const JSZip = await pendLoadJsZip();
    const esc = v => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const colL = n => { let s=''; while (n > 0){ const m = (n-1) % 26; s = String.fromCharCode(65+m) + s; n = Math.floor((n-1)/26); } return s; };
    const zip = await JSZip.loadAsync(buf);
    const H = opt.headers, R = opt.rows, nCols = H.length;
    const usados = new Set();
    opt.pivots.forEach(p => { usados.add(p.row); usados.add(p.col); (p.pages||[]).forEach(f => usados.add(f)); });
    const itens = {};
    const cacheFields = H.map((h, i) => {
      const vals = R.map(r => r[i]);
      if (usados.has(h)){
        const temVazio = vals.some(v => v === '' || v == null);
        itens[h] = [...new Set(vals.filter(v => v !== '' && v != null).map(String))].sort().concat(temVazio ? [null] : []);
        return `<cacheField name="${esc(h)}" numFmtId="0"><sharedItems${temVazio ? ' containsBlank="1"' : ''} count="${itens[h].length}">${itens[h].map(v => v === null ? '<m/>' : `<s v="${esc(v)}"/>`).join('')}</sharedItems></cacheField>`;
      }
      const nums = vals.filter(v => typeof v === 'number');
      if (nums.length && nums.length === vals.length){
        let mn = Infinity, mx = -Infinity; nums.forEach(v => { if (v < mn) mn = v; if (v > mx) mx = v; });
        return `<cacheField name="${esc(h)}" numFmtId="0"><sharedItems containsSemiMixedTypes="0" containsString="0" containsNumber="1" containsInteger="1" minValue="${mn}" maxValue="${mx}"/></cacheField>`;
      }
      return `<cacheField name="${esc(h)}" numFmtId="0"><sharedItems/></cacheField>`;
    });
    const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    zip.file('xl/pivotCache/pivotCacheDefinition1.xml', `${XML}<pivotCacheDefinition ${NS} xmlns:r="${REL}" saveData="0" refreshOnLoad="1" createdVersion="6" refreshedVersion="6" minRefreshableVersion="3" recordCount="0"><cacheSource type="worksheet"><worksheetSource ref="A1:${colL(nCols)}${R.length + 1}" sheet="${esc(opt.sourceSheet)}"/></cacheSource><cacheFields count="${nCols}">${cacheFields.join('')}</cacheFields></pivotCacheDefinition>`);
    let ct = await zip.file('[Content_Types].xml').async('string');
    let wbx = await zip.file('xl/workbook.xml').async('string');
    let wbr = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    ct = ct.replace('</Types>', '<Override PartName="/xl/pivotCache/pivotCacheDefinition1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml"/></Types>');
    wbr = wbr.replace('</Relationships>', `<Relationship Id="rIdPivotCache1" Type="${REL}/pivotCacheDefinition" Target="pivotCache/pivotCacheDefinition1.xml"/></Relationships>`);
    if (!/<workbook[^>]*xmlns:r=/.test(wbx)) wbx = wbx.replace('<workbook ', `<workbook xmlns:r="${REL}" `);
    wbx = wbx.replace('</workbook>', '<pivotCaches><pivotCache cacheId="1" r:id="rIdPivotCache1"/></pivotCaches></workbook>');
    for (let k = 0; k < opt.pivots.length; k++){
      const p = opt.pivots[k], n = k + 1, pages = p.pages || [];
      const idx = h => H.indexOf(h);
      const fields = H.map(h => {
        const its = itens[h];
        const itemsXml = its ? `<items count="${its.length + 1}">${its.map((_, i) => `<item x="${i}"/>`).join('')}<item t="default"/></items>` : '';
        if (h === p.row) return `<pivotField axis="axisRow" showAll="0">${itemsXml}</pivotField>`;
        if (h === p.col) return `<pivotField axis="axisCol" showAll="0">${itemsXml}</pivotField>`;
        if (pages.includes(h)) return `<pivotField axis="axisPage" showAll="0">${itemsXml}</pivotField>`;
        if (h === p.data) return '<pivotField dataField="1" showAll="0"/>';
        return its ? `<pivotField showAll="0">${itemsXml}</pivotField>` : '<pivotField showAll="0"/>';
      });
      const r0 = pages.length ? pages.length + 2 : 1;
      zip.file(`xl/pivotTables/pivotTable${n}.xml`, `${XML}<pivotTableDefinition ${NS} name="${esc(p.name)}" cacheId="1" applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1" dataCaption="Valores" updatedVersion="6" minRefreshableVersion="3" useAutoFormatting="1" itemPrintTitles="1" createdVersion="6" indent="0" outline="1" outlineData="1" multipleFieldFilters="0" rowHeaderCaption="${esc(p.rowCaption || p.row)}"><location ref="A${r0}:B${r0 + 2}" firstHeaderRow="1" firstDataRow="2" firstDataCol="1"${pages.length ? ` rowPageCount="${pages.length}" colPageCount="1"` : ''}/><pivotFields count="${nCols}">${fields.join('')}</pivotFields><rowFields count="1"><field x="${idx(p.row)}"/></rowFields><colFields count="1"><field x="${idx(p.col)}"/></colFields>${pages.length ? `<pageFields count="${pages.length}">${pages.map(h => `<pageField fld="${idx(h)}" hier="-1"/>`).join('')}</pageFields>` : ''}<dataFields count="1"><dataField name="${esc(p.dataName)}" fld="${idx(p.data)}" baseField="0" baseItem="0" numFmtId="3"/></dataFields><pivotTableStyleInfo name="PivotStyleMedium2" showRowHeaders="1" showColHeaders="1" showRowStripes="0" showColStripes="0" showLastColumn="1"/></pivotTableDefinition>`);
      zip.file(`xl/pivotTables/_rels/pivotTable${n}.xml.rels`, `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/pivotCacheDefinition" Target="../pivotCache/pivotCacheDefinition1.xml"/></Relationships>`);
      ct = ct.replace('</Types>', `<Override PartName="/xl/pivotTables/pivotTable${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml"/></Types>`);
      const relPath = `xl/worksheets/_rels/sheet${p.sheetIndex}.xml.rels`;
      const rel = `<Relationship Id="rIdPivot${n}" Type="${REL}/pivotTable" Target="../pivotTables/pivotTable${n}.xml"/>`;
      zip.file(relPath, zip.file(relPath)
        ? (await zip.file(relPath).async('string')).replace('</Relationships>', rel + '</Relationships>')
        : `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rel}</Relationships>`);
    }
    zip.file('[Content_Types].xml', ct);
    zip.file('xl/workbook.xml', wbx);
    zip.file('xl/_rels/workbook.xml.rels', wbr);
    return zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression:'DEFLATE' });
  }

  // Extrato completo do T6140B: o desta aba (import recente) ou o publicado no Firestore (seção T6140B_EXTRATO, fora
  // do login — só é buscado aqui, no clique). Sem nenhum → null (a aba T6140B sai resumida).
  // Tira do extrato T6140B as colunas com dado pessoal do cliente — CPF/CNPJ (NU_CGC_CPF) e nome/razão social
  // (NM_PESSOA_RAZAO_SOCIAL) — antes de guardar no Firestore e de montar a aba do Excel (item 5 da revisão de segurança,
  // decisão do Victor 26/10/2026). Nenhum cálculo do funil usa essas colunas (parseT6140bRawWorkbook lê só controle,
  // recebimento e status); nome e CNPJ da empresa continuam vindo do Planium. Pega também o extrato antigo já publicado.
  const T6_COL_PESSOAL = /^(NU_CGC_CPF|NM_PESSOA_RAZAO_SOCIAL)$/i;
  function t6140bSemDadosPessoais(texto){
    const wbT = XLSX.read(texto, { type:'string', raw:true });
    const linhas = XLSX.utils.sheet_to_json(wbT.Sheets[wbT.SheetNames[0]], { header:1, raw:true, defval:'' });
    const iCab = linhas.findIndex(l => (l || []).some(v => String(v).trim().toUpperCase() === 'NU_CONTROLE'));
    if (iCab < 0) return texto;
    const manter = linhas[iCab].map(h => !T6_COL_PESSOAL.test(String(h)));
    if (manter.every(Boolean)) return texto;
    const limpas = linhas.map(l => (l || []).filter((_, i) => manter[i] !== false));
    return XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(limpas), { FS:';' });
  }
  window.t6140bSemDadosPessoais = t6140bSemDadosPessoais;

  async function pendObterT6140bExtrato(){
    if (window.__T6140B_EXTRATO && window.__T6140B_EXTRATO.texto) return window.__T6140B_EXTRATO;
    if (!window.fsReadSection) return null;
    try {
      const v = await window.fsReadSection('T6140B_EXTRATO');
      if (v && v.texto){ v.texto = t6140bSemDadosPessoais(v.texto); window.__T6140B_EXTRATO = v; return v; }
    } catch(e){ console.warn('T6140B completo indisponível:', e && e.message); }
    return null;
  }

  // "Baixar funil (Excel)" da aba PME (2026-10-14, Victor: "baixar o funil inteiro por excel padrão"): TODAS as propostas
  // em aberto de TODOS os gestores, sem os filtros da tela (o que está filtrado vai pelo "Baixar relatório").
  async function pendBaixarXlsx(){
    const rows = pendenciasDoGestor(PENDENCIAS_PME, null, 'proposta');
    if (!rows.length) return;
    const btn = document.getElementById('pendXlsxBtn');
    const txtOrig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Gerando...';
    try {
      const ExcelJS = await pendLoadExcelJS();
      // Empresa e nome cru do gestor vêm da lista completa do Planium (mesma proposta). Coluna VENDEDOR saiu em
      // 26/10/2026 (vinha o CPF do vendedor — item 5 de segurança); as tabelas dinâmicas acham as colunas pelo nome.
      const porNum = {};
      (window.getPropostasData ? window.getPropostasData() : []).forEach(p => { porNum[String(p.p)] = p; });
      const dataXl = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return m ? new Date(Date.UTC(+m[1], +m[2]-1, +m[3])) : null; };
      const gestorDe = p => { const x = porNum[String(p.proposta)]; return (x && x.g) ? String(x.g).toUpperCase() : String(p._gestor || pendCurrentGestor || '').toUpperCase(); };
      rows.sort((a,b) => gestorDe(a).localeCompare(gestorDe(b)) || (b.beneficiarios||0) - (a.beneficiarios||0));

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Painel Comercial — Cauda Longa NDI SP';
      const NAVY = 'FF101E63', VERDE = 'FF16B87A', CINZA = 'FFE3E9F8';
      const borda = { top:{style:'thin',color:{argb:CINZA}}, bottom:{style:'thin',color:{argb:CINZA}}, left:{style:'thin',color:{argb:CINZA}}, right:{style:'thin',color:{argb:CINZA}} };
      const estiloCab = cell => { cell.font = { bold:true, color:{argb:'FFFFFFFF'}, size:10 }; cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:NAVY} }; cell.alignment = { vertical:'middle', horizontal:'center', wrapText:true }; cell.border = borda; };

      // As duas tabelas dinâmicas vêm primeiro — viram os arquivos sheet1/sheet2 do .xlsx, onde pendAddPivots as liga.
      const wd = wb.addWorksheet('DINÂMICA');
      const we = wb.addWorksheet('ESTEIRA DITEC');

      // ---- aba RESULTADO FINAL ----
      const ws = wb.addWorksheet('RESULTADO FINAL', { views:[{ state:'frozen', ySplit:1 }] });
      const COLS = [
        ['PROPOSTA',12], ['GESTOR',34], ['BENEFICIARIOS',14], ['DATA RECEBIMENTO',15], ['DATA VIGÊNCIA',14], ['CADASTRO',20],
        ['DITEC',16], ['BITIX',24], ['PLANIUM',13], ['CORRETORA',42], ['EMPRESA',42], ['IMPLANTA AMANHÃ',14],
      ];
      ws.columns = COLS.map(([h,w]) => ({ header:h, width:w }));
      ws.getRow(1).height = 30;
      ws.getRow(1).eachCell(estiloCab);
      rows.forEach(p => {
        const x = porNum[String(p.proposta)] || {};
        const num = /^\d+$/.test(String(p.proposta)) ? Number(p.proposta) : p.proposta;
        const r = ws.addRow([
          num, gestorDe(p), p.beneficiarios || 0, dataXl(p.dataReceb), dataXl(p.dataVigencia),
          pendSemLogin(p.status.cadastro) || '', pendSemLogin(p.status.ditec) || '', pendTxt(p.status.bitix) || '',
          pendTxt(p.status.planium) || '', p.corretora || '', x.em || '', pendImplantaAmanha(p) ? 'SIM' : '',
        ]);
        r.getCell(4).numFmt = 'dd/mm/yyyy'; r.getCell(5).numFmt = 'dd/mm/yyyy';
        [1,3,4,5,9,12].forEach(c => { r.getCell(c).alignment = { horizontal:'center' }; });
        if (pendImplantaAmanha(p)) r.getCell(12).font = { bold:true, color:{ argb:VERDE } };
        r.eachCell({ includeEmpty:true }, c => { c.border = borda; });
      });
      ws.autoFilter = { from:{ row:1, column:1 }, to:{ row:1, column:COLS.length } };
      const nBase = rows.length + 1; // última linha de dados

      // ---- DINÂMICA / ESTEIRA DITEC: tabelas dinâmicas DE VERDADE (pedido do Victor, 09/10: com fórmulas o duplo
      // clique não abria os detalhes). Mesma montagem da planilha original: DINÂMICA = GESTOR × PLANIUM, soma de
      // BENEFICIARIOS (+ filtros IMPLANTA AMANHÃ e BITIX); ESTEIRA DITEC = GESTOR × DITEC com filtros DATA VIGÊNCIA,
      // CADASTRO e BITIX. As duas leem a aba RESULTADO FINAL e o Excel as monta ao abrir (pendAddPivots).
      const nota = (sh, col) => {
        sh.getCell(1, col).value = `Funil PME inteiro: todos os gestores, todas as vigências e corretoras, em análise/pendência (${rows.length} propostas).`;
        sh.getCell(2, col).value = 'Gerado em ' + new Date().toLocaleString('pt-BR') + '. Se a tabela aparecer vazia, clique em "Habilitar Edição".';
        [1,2].forEach(r => { sh.getCell(r, col).font = { italic:true, size:9, color:{ argb:'FF56608F' } }; });
      };
      wd.getColumn(1).width = 36; we.getColumn(1).width = 36;
      nota(wd, 10); nota(we, 12);

      // ---- abas PLANIUM e T6140B: os campos que o painel guarda de cada extrato (o extrato cru não fica guardado —
      // decisão do Victor 09/10, pra não deixar login/download mais lentos). Base inteira guardada, não só o filtro.
      const props = (window.getPropostasData ? window.getPropostasData() : []).slice()
        .sort((a,b) => String(a.g||'').localeCompare(String(b.g||'')) || String(a.p).localeCompare(String(b.p)));
      const numOuTxt = v => /^\d+$/.test(String(v)) ? Number(v) : (v || '');
      const montaAba = (nome, cols, linhas, datas) => {
        const sh = wb.addWorksheet(nome, { views:[{ state:'frozen', ySplit:1 }] });
        sh.columns = cols.map(([h,w]) => ({ header:h, width:w }));
        sh.getRow(1).height = 28; sh.getRow(1).eachCell(estiloCab);
        linhas.forEach(l => { const r = sh.addRow(l); datas.forEach(c => { r.getCell(c).numFmt = 'dd/mm/yyyy'; }); });
        sh.autoFilter = { from:{ row:1, column:1 }, to:{ row:1, column:cols.length } };
        return sh;
      };
      montaAba('PLANIUM', [['oper_propnum',13], ['contratante_nome',42], ['contratante_cnpj',20], ['data_notificada',14], ['date_vigencia',13],
        ['beneficiarios',12], ['status',12], ['corretora_nome',42], ['GESTOR',34], ['DATA RECEBIMENTO',15], ['DITEC',16], ['CADASTRO',20]],
        props.map(p => [numOuTxt(p.p), p.em || '', p.cn || '', dataXl(p.dn), dataXl(p.vg), p.bn || 0, p.st || '', p.co || '',
                         String(p.g || '').toUpperCase(), dataXl(p.dr), p.di || '', p.ca || '']), [4,5,10]);
      // T6140B: o extrato INTEIRO quando o painel tem (importado nesta aba, ou publicado — lido do Firestore só agora);
      // senão, os campos resumidos de antes.
      const extratoT6 = await pendObterT6140bExtrato();
      let notaT6;
      if (extratoT6){
        const shT = XLSX.read(extratoT6.texto, { type:'string', raw:true });
        const linhasT = XLSX.utils.sheet_to_json(shT.Sheets[shT.SheetNames[0]], { header:1, raw:true, defval:'' })
          .filter(l => l.some(v => String(v).trim() !== ''));
        const cabT = (linhasT.shift() || []).map(h => String(h).trim());
        const ehData = cabT.map(h => /^DT_/i.test(h));
        const manterTexto = cabT.map(h => /CGC|CPF/i.test(h)); // (CPF/CNPJ já saem em t6140bSemDadosPessoais; fica por garantia)
        const conv = (v, i) => {
          const s = String(v == null ? '' : v).trim();
          if (!s) return '';
          if (ehData[i]){ const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); if (m) return new Date(Date.UTC(+m[3], +m[2]-1, +m[1])); }
          if (!manterTexto[i] && /^\d{1,12}$/.test(s)) return Number(s);
          return s;
        };
        montaAba('T6140B', cabT.map(h => [h, Math.max(12, Math.min(40, h.length + 4))]),
          linhasT.map(l => cabT.map((_, i) => conv(l[i], i))), ehData.map((d, i) => d ? i + 1 : 0).filter(Boolean));
        notaT6 = `Aba T6140B: extrato completo "${extratoT6.nome}" (importado em ${extratoT6.importadoEm}), ${linhasT.length} linhas.`;
      } else {
        montaAba('T6140B', [['NU_CONTROLE',13], ['DT_RECEBIMENTO',15], ['STATUS_AREA_MÉDICA',20], ['STATUS_CADASTRO',22], ['STATUS_PROPOSTA_BITIX',26]],
          props.filter(p => p.dr || p.di || p.ca || p.bi).map(p => [numOuTxt(p.p), dataXl(p.dr), p.di || '', p.ca || '', p.bi || '']), [2]);
        notaT6 = 'Aba T6140B: resumida (o extrato completo ainda não foi publicado no painel).';
      }
      [wd, we].forEach(sh => { const c = sh === wd ? 10 : 12; sh.getCell(3, c).value = notaT6; sh.getCell(3, c).font = { italic:true, size:9, color:{ argb:'FF56608F' } }; });

      wb.views = [{ activeTab: 0 }];
      wb.worksheets.forEach(s => { s.properties.tabColor = { argb: /DINÂMICA|ESTEIRA/.test(s.name) ? VERDE : NAVY }; });

      const buf = await wb.xlsx.writeBuffer();
      const cabRF = COLS.map(c => c[0]);
      const linhasRF = [];
      ws.eachRow((r, i) => { if (i > 1) linhasRF.push(cabRF.map((_, c) => { const v = r.getCell(c + 1).value; return v instanceof Date ? v.toISOString().slice(0,10) : (v == null ? '' : v); })); });
      const blob = await pendAddPivots(buf, { sourceSheet:'RESULTADO FINAL', headers:cabRF, rows:linhasRF, pivots:[
        { sheetIndex:1, name:'Tabela dinâmica1', row:'GESTOR', col:'PLANIUM', pages:['IMPLANTA AMANHÃ','BITIX'], data:'BENEFICIARIOS', dataName:'Soma de BENEFICIARIOS' },
        { sheetIndex:2, name:'Tabela dinâmica3', row:'GESTOR', col:'DITEC', pages:['DATA VIGÊNCIA','CADASTRO','BITIX'], data:'BENEFICIARIOS', dataName:'Vidas', rowCaption:'EXECUTIVO' },
      ]});
      const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g,'.');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Funil PME - completo - ${hoje}.xlsx`;
      document.body.appendChild(a); a.click();
      if (window.fsRegistrarAcesso) window.fsRegistrarAcesso('baixou', a.download); // registro de acessos (item 4)
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch(err){
      alert('Não consegui gerar a planilha: ' + err.message);
    } finally {
      btn.innerHTML = txtOrig; btn.disabled = false;
    }
  }

  // "Baixar funil (Excel)" da aba PF (2026-10-14): todos os orçamentos de todos os gestores, sem os filtros da tela.
  // Abas: DINÂMICA (tabela dinâmica de verdade GESTOR × STATUS, soma de VIDAS, duplo clique abre o detalhe) e
  // RESULTADO (um orçamento por linha), mesma técnica do PME (pendAddPivots).
  async function pendBaixarFunilPf(){
    const rows = pendenciasDoGestor(PENDENCIAS_PF, null, 'orcamento');
    if (!rows.length) return;
    const btn = document.getElementById('pendXlsxBtn');
    const txtOrig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Gerando...';
    try {
      const ExcelJS = await pendLoadExcelJS();
      const dataXl = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return m ? new Date(Date.UTC(+m[1], +m[2]-1, +m[3])) : null; };
      const gestorRaw = p => (window.getGestorRawName ? window.getGestorRawName(p._gestor) : String(p._gestor || '')).toUpperCase();
      rows.sort((a,b) => gestorRaw(a).localeCompare(gestorRaw(b)) || String(a.corretora||'').localeCompare(String(b.corretora||'')));
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Painel Comercial — Cauda Longa NDI SP';
      const NAVY = 'FF101E63', VERDE = 'FF16B87A', CINZA = 'FFE3E9F8';
      const borda = { top:{style:'thin',color:{argb:CINZA}}, bottom:{style:'thin',color:{argb:CINZA}}, left:{style:'thin',color:{argb:CINZA}}, right:{style:'thin',color:{argb:CINZA}} };
      const estiloCab = cell => { cell.font = { bold:true, color:{argb:'FFFFFFFF'}, size:10 }; cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:NAVY} }; cell.alignment = { vertical:'middle', horizontal:'center', wrapText:true }; cell.border = borda; };
      const wd = wb.addWorksheet('DINÂMICA'); // sheet1 — a tabela dinâmica é ligada aqui
      const ws = wb.addWorksheet('RESULTADO', { views:[{ state:'frozen', ySplit:1 }] });
      const COLS = [['ORÇAMENTO',16], ['GESTOR',36], ['CORRETORA',44], ['STATUS',28], ['VIDAS',9], ['DATA STATUS',14]];
      ws.columns = COLS.map(([h,w]) => ({ header:h, width:w }));
      ws.getRow(1).height = 28; ws.getRow(1).eachCell(estiloCab);
      rows.forEach(p => {
        const num = /^\d+$/.test(String(p.orcamento)) ? Number(p.orcamento) : p.orcamento;
        const r = ws.addRow([num, gestorRaw(p), p.corretora || '', p.status || '', p.vidas || 0, dataXl(p.dataStatus)]);
        r.getCell(6).numFmt = 'dd/mm/yyyy';
        [1,5,6].forEach(c => { r.getCell(c).alignment = { horizontal:'center' }; });
      });
      ws.autoFilter = { from:{ row:1, column:1 }, to:{ row:1, column:COLS.length } };
      wd.getColumn(1).width = 36;
      wd.getCell(1, 12).value = `Funil PF inteiro: todos os gestores, todos os status e corretoras (${rows.length} orçamentos).`;
      wd.getCell(2, 12).value = 'Gerado em ' + new Date().toLocaleString('pt-BR') + '. Se a tabela aparecer vazia, clique em "Habilitar Edição".';
      [1,2].forEach(r => { wd.getCell(r, 12).font = { italic:true, size:9, color:{ argb:'FF56608F' } }; });
      wb.views = [{ activeTab: 0 }];
      wb.worksheets.forEach(s => { s.properties.tabColor = { argb: s.name === 'DINÂMICA' ? VERDE : NAVY }; });
      const buf = await wb.xlsx.writeBuffer();
      const cab = COLS.map(c => c[0]);
      const linhas = rows.map(p => [p.orcamento, gestorRaw(p), p.corretora || '', p.status || '', p.vidas || 0, p.dataStatus || '']);
      const blob = await pendAddPivots(buf, { sourceSheet:'RESULTADO', headers:cab, rows:linhas, pivots:[
        { sheetIndex:1, name:'Tabela dinâmica1', row:'GESTOR', col:'STATUS', pages:['CORRETORA'], data:'VIDAS', dataName:'Soma de VIDAS' },
      ]});
      const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g,'.');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Funil PF - completo - ${hoje}.xlsx`;
      document.body.appendChild(a); a.click();
      if (window.fsRegistrarAcesso) window.fsRegistrarAcesso('baixou', a.download); // registro de acessos (item 4)
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch(err){
      alert('Não consegui gerar a planilha: ' + err.message);
    } finally {
      btn.innerHTML = txtOrig; btn.disabled = false;
    }
  }
  document.getElementById('pendXlsxBtn').addEventListener('click', () => { pendMultiFechar(); if (pendActiveTab === 'pf') pendBaixarFunilPf(); else pendBaixarXlsx(); });

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
    pendMesSel.clear(); pendCorSel.clear(); pendMultiFechar(); document.getElementById('pendCorBusca').value = '';
    document.getElementById('pendPropostaSearch').value = '';
    pendSelectedStatuses.clear();
    renderPendencias();
  });
  document.getElementById('pendTabPf').addEventListener('click', () => {
    pendActiveTab = 'pf';
    document.getElementById('pendTabPf').classList.add('active'); document.getElementById('pendTabPme').classList.remove('active');
    document.getElementById('pendPfSection').style.display = ''; document.getElementById('pendPmeSection').style.display = 'none';
    pendMesSel.clear(); pendCorSel.clear(); pendMultiFechar(); document.getElementById('pendCorBusca').value = '';
    document.getElementById('pendPropostaSearch').value = '';
    pendSelectedStatuses.clear();
    renderPendencias();
  });

  /* ---- Resumo do Dia ---- */
  // Todos os gestores que aparecem nas Pendências PME/PF (não só Cauda Longa) — deriva direto
  // dos dados em vez de lista fixa, então acompanha sozinho se algum gestor entrar/sair.
  // Montada NA HORA (2026-10-13): antes era uma constante calculada só quando a página abria — depois de importar o
  // funil, quem não estava nos dados da abertura (ex.: Agatha Amaral, Bianca, Fabio, Carlos Eduardo, VENDA INTERNA)
  // ficava fora de todo o Resumo do Dia (cartões, "Total pra Atuar" e "Implanta amanhã"; achado no V2 em 13/10).
  const resumoGestores = () => [...new Set([...Object.keys(PENDENCIAS_PME || {}), ...Object.keys(PENDENCIAS_PF || {})])].sort();
  // Mapa gestor → equipe, mesmo critério já usado em outras partes do painel (Conquista
  // Premiada). Fica duplicado aqui (em vez de compartilhado) porque vive num <script> isolado —
  // mesmo padrão já usado antes nesta base de código pra esse tipo de mapa pequeno e estável.
  const RESUMO_GESTOR_EQUIPE = {
    'Agatha Sakamoto':'CAUDA LONGA', 'Patricia Monks':'CAUDA LONGA', 'Jonathan Leal':'CAUDA LONGA', 'Pablo Amora':'CAUDA LONGA',
    'Erika de Sousa Silva':'PLATAFORMA SP', 'Camila Alves Pertinhez':'PLATAFORMA SP', 'Lais dos Santos Martins':'PLATAFORMA SP', 'Wilder Coca Patzi':'PLATAFORMA SP', 'Agatha Amaral Ribeiro':'PLATAFORMA SP',
    'Karollainny Rangel de Sousa Lopes':'DIGITAL', 'Daniela Novais dos Santos':'DIGITAL', 'Amanda dos Santos Sobral':'DIGITAL', 'Maxuel Pimentel Nobrega':'DIGITAL',
    'Vivian de Cassia Ambrosio':'PLATAFORMA ABC/ALTO TIETÊ/BX', 'Guilherme de Lima Musachi':'PLATAFORMA ABC/ALTO TIETÊ/BX', 'Izabele de Oliveira da Silva':'PLATAFORMA ABC/ALTO TIETÊ/BX',
    'Kaique Araujo da Silva':'INTERIOR SP', 'Daniela Frederico Martins (Campinas)':'INTERIOR SP', 'Daniela Frederico Martins (AM)':'INTERIOR SP', 'Flavia Auana Silva de Oliveira':'INTERIOR SP',
  };
  const resumoEquipeOf = g => RESUMO_GESTOR_EQUIPE[g] || 'Outras equipes';
  const resumoEquipes = () => [...new Set(resumoGestores().map(resumoEquipeOf))].sort();
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
    const todos = resumoGestores();
    return equipeSel ? todos.filter(g => resumoEquipeOf(g) === equipeSel) : todos;
  }

  // Soma beneficiários por status.planium ('analise'/'pendencia') — mesma lógica binária
  // já usada na tabela de Pendências PME, só agregada por gestor em vez de listada linha a linha.
  function resumoPmeStats(gestorNome){
    const rows = PENDENCIAS_PME[gestorNome] || [];
    let analise = 0, pendencia = 0, amanha = 0, amanhaProps = 0;
    rows.forEach(p => {
      const v = p.beneficiarios || 0;
      if (p.status && p.status.planium === 'analise') analise += v;
      else if (p.status && p.status.planium === 'pendencia') pendencia += v;
      if (pendImplantaAmanha(p)){ amanha += v; amanhaProps++; }
    });
    return { funil: analise + pendencia, analise, pendencia, amanha, amanhaProps };
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
          <div class="rc-stat"><div class="rc-label">Implanta amanhã</div><div class="rc-value" style="color:${s.amanha ? 'var(--green)' : 'var(--muted)'};">${s.amanha}</div></div>
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
    // Cartão "Implanta amanhã" — soma dos gestores do filtro de Equipe/Gestor atual
    let vidas = 0, props = 0;
    gestores.forEach(g => { const s = resumoPmeStats(g); vidas += s.amanha; props += s.amanhaProps; });
    document.getElementById('rsAmanhaVidas').textContent = fmt0(vidas);
    document.getElementById('rsAmanhaSub').textContent = props
      ? `${props} ${props === 1 ? 'proposta liberada' : 'propostas liberadas'} em todas as áreas (PME) · clique pra ver`
      : 'Nenhuma proposta liberada em todas as áreas (PME)';
  }
  document.getElementById('btnImplantaAmanha').addEventListener('click', () => {
    const gestores = resumoGestoresFiltrados();
    document.getElementById('resumoModalOverlay').style.display = 'none';
    window.showPendenciasModal(gestores.length === 1 ? gestores[0] : null, { amanha: true });
  });

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
    const todos = resumoGestores();
    const opcoes = equipeSel ? todos.filter(g => resumoEquipeOf(g) === equipeSel) : todos;
    gestorSelEl.innerHTML = '<option value="">Todos os gestores</option>' + opcoes.map(g=>`<option value="${g}">${g}</option>`).join('');
    gestorSelEl.value = opcoes.includes(prevGestor) ? prevGestor : '';
  }

  window.showResumoModal = function(){
    const equipeSelEl = document.getElementById('resumoEquipeSel');
    // Refeita a cada abertura (equipes podem mudar depois de um import) — mantém a equipe escolhida se ainda existir.
    const equipeAntes = equipeSelEl.value;
    const equipesAgora = resumoEquipes();
    equipeSelEl.innerHTML = '<option value="">Todas as equipes</option>' + equipesAgora.map(eq=>`<option value="${eq}">${eq}</option>`).join('');
    equipeSelEl.value = equipesAgora.includes(equipeAntes) ? equipeAntes : '';
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
  // Baldes de Ano/Semestre/Trimestre por CALENDÁRIO, para qualquer ano (índice 0 = Jan/25). Até
  // 2026-10-07 eram fixos em 2025/2026: em Jan/27 o "Ano 2026" engolia Jan/27, o "2º Semestre/26"
  // ficava com 7 meses e surgia um "5º Trimestre/26". O último balde pode ser parcial (ano/semestre/
  // trimestre em andamento), como sempre foi.
  function buildCalendarBuckets(size, labelOf){
    const out = [];
    for (let start = 0; start < totalMonths; start += size){
      const len = Math.min(size, totalMonths - start);
      out.push({ label: labelOf(start), months: Array.from({length: len}, (_, i) => start + i) });
    }
    return out;
  }
  const bucketYY = start => String(2025 + Math.floor(start / 12)).slice(2);
  function buildYearBuckets(){
    return buildCalendarBuckets(12, start => String(2025 + start / 12));
  }
  function buildSemestreBuckets(){
    return buildCalendarBuckets(6, start => `${(start % 12) / 6 + 1}º Semestre/${bucketYY(start)}`);
  }
  function buildTrimestreBuckets(){
    return buildCalendarBuckets(3, start => `${(start % 12) / 3 + 1}º Trimestre/${bucketYY(start)}`);
  }
  const PERIOD_DEFS = {
    ano: buildYearBuckets(),
    semestre: buildSemestreBuckets(),
    trimestre: buildTrimestreBuckets(),
    mensal: MONTH_LABELS.map((label,i) => ({label, months:[i]})),
  };
  // Trimestre vigente (último balde de PERIOD_DEFS.trimestre, mesmo parcial — é o que
  // applyCorretorasToEligibilidade usa pra d.el/d.rk/d.meta3tri) e o trimestre anterior a ele.
  // Substituem os rótulos fixos "3TRI26"/"2TRI26" do modo "Todos os meses", que travaram no
  // 3º trimestre quando Outubro abriu o 4TRI26 (achado 2026-10-06). Sempre lidos na hora
  // (PERIOD_DEFS.trimestre é refeito quando um mês novo abre).
  const curTriDef = () => { const t = PERIOD_DEFS.trimestre; return t[t.length - 1] || null; };
  const prevTriDef = () => { const t = PERIOD_DEFS.trimestre; return t[t.length - 2] || null; };
  const triShort = def => def ? def.label.replace(/^(\d)º Trimestre\/(\d\d)$/, '$1TRI$2') : '';
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
  // Sem o campo do vendedor (vd): no Planium ele vem quase sempre como número de 10–11 dígitos (CPF do vendedor) e
  // só ia pro "Baixar .xlsx" — tirado na revisão de segurança (item 5, Victor, 26/10/2026). Limpa também o que já
  // estava publicado: o próximo "Publicar" grava a lista sem ele.
  let PROPOSTAS = Array.isArray(window.__DASH_DATA__.PROPOSTAS)
    ? window.__DASH_DATA__.PROPOSTAS.map(p => { if (p && 'vd' in p){ const c = Object.assign({}, p); delete c.vd; return c; } return p; })
    : window.__DASH_DATA__.PROPOSTAS;
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
  // ── Retrato do dia (v2, 14/10/2026 — pedido do Victor: "com o que eu já importo diariamente, já é possível guardar
  // os dados", sem a planilha Crescimento Geral). Um retrato por DIA (data local), por gestor (nome cru da Carteira),
  // com as 3 colunas que a Crescimento compara ontem × hoje — mesmas regras dela, conferidas número a número com a
  // planilha de 24/09/2026:
  //  - f (Funil): vidas em análise + pendência (status da Planium) com VIGÊNCIA no mês do retrato ou no anterior — é a
  //    Planilha1 do "Relatório PME automatizado" (24/09: 3.650 = extratos crus Ago+Set, exato);
  //  - a (Assinatura): vidas do extrato de notificadas (aguardando assinatura), gestor pelo CNPJ da corretora na Carteira;
  //  - r (Ranking): vendas novas do mês no extrato "Corretoras" do BI, IND+SS+PME+ADM ("Total" do BI) — só muda quando o
  //    extrato vem nessa importação; senão repete o do retrato anterior (ver rk).
  // Importar de novo no mesmo dia só refaz o retrato de hoje (sempre com o estado atual do painel). "Ontem" = o último
  // retrato de um dia ANTERIOR (segunda compara com sexta). Vai pro Firestore no Publicar (seção DAILY_SNAPSHOTS).
  // Retratos do formato antigo (sem v:2, outra regra de funil) são descartados — nunca se misturam com os novos.
  const RETRATO_V = 2;
  const dataLocalISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  Object.keys(DAILY_SNAPSHOTS).forEach(k => { if (!DAILY_SNAPSHOTS[k] || DAILY_SNAPSHOTS[k].v !== RETRATO_V) delete DAILY_SNAPSHOTS[k]; });
  // Retrato de 13/10/2026 (ponto de partida da Conversao): ficava embutido aqui; desde 22/10/2026 so existe no Firestore,
  // dentro de DAILY_SNAPSHOTS (publicado em 14/10). Item 3 de seguranca: nenhum numero da empresa no app.js publico.
  function retratoMesesFunil(dataISO){
    const [y, m] = dataISO.split('-').map(Number);
    const ant = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`;
    return [ant, `${y}-${String(m).padStart(2,'0')}`];
  }
  function computeGestorSnapshotNow(dataISO, rankByRaw){
    const assinaturaData = (window.getPendenciasData ? window.getPendenciasData().assinatura : {}) || {};
    const meses = new Set(retratoMesesFunil(dataISO));
    const g = {};
    const slot = nome => (g[nome] = g[nome] || { f:0, a:0, r:0 });
    (PROPOSTAS||[]).forEach(p => {
      if (!p.g || !/pend|analis/i.test(String(p.st||'')) || !meses.has(String(p.vg||'').slice(0,7))) return;
      slot(p.g).f += (p.bn||0);
    });
    Object.keys(assinaturaData).forEach(nome => { slot(nome).a += (assinaturaData[nome]||[]).reduce((s,r)=>s+(r.beneficiarios||0),0); });
    // Ranking: o desta importação, ou o do último retrato (o extrato do BI nem sempre vem junto)
    let rk = rankByRaw, rkData = dataISO;
    if (!rk){
      const ant = Object.keys(DAILY_SNAPSHOTS).filter(d => d <= dataISO).sort().pop();
      if (ant){ rk = {}; rkData = DAILY_SNAPSHOTS[ant].rk || ant; Object.keys(DAILY_SNAPSHOTS[ant].g).forEach(n => { if (DAILY_SNAPSHOTS[ant].g[n].r) rk[n] = DAILY_SNAPSHOTS[ant].g[n].r; }); }
    }
    Object.keys(rk||{}).forEach(nome => { slot(nome).r = Math.round(rk[nome]); });
    return { v: RETRATO_V, em: new Date().toISOString(), meses: [...meses], rk: rk ? rkData : null, g };
  }
  function saveDailySnapshot(rankByRaw){
    const hoje = dataLocalISO(new Date());
    DAILY_SNAPSHOTS[hoje] = computeGestorSnapshotNow(hoje, rankByRaw || null);
    // Mantém só os últimos 60 dias — suficiente pra qualquer comparação de período, sem o
    // data.json crescer sem limite.
    const datas = Object.keys(DAILY_SNAPSHOTS).sort();
    while (datas.length > 60){ delete DAILY_SNAPSHOTS[datas.shift()]; }
  }
  // { hoje: {data, ...retrato}, ontem: {data, ...retrato} | null } — "hoje" = o retrato mais recente (pode ser de ontem,
  // se ainda não importaram nada hoje); "ontem" = o último retrato de um dia anterior a ele.
  function getRetratosOntemHoje(){
    const datas = Object.keys(DAILY_SNAPSHOTS).sort();
    if (!datas.length) return null;
    const dh = datas[datas.length-1], doo = datas.length > 1 ? datas[datas.length-2] : null;
    return { hoje: Object.assign({ data: dh }, DAILY_SNAPSHOTS[dh]), ontem: doo ? Object.assign({ data: doo }, DAILY_SNAPSHOTS[doo]) : null };
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
  // "Zero vendas nos últimos 3 meses" lido direto de d.m (atualizado a cada extrato). Até 2026-10-07
  // usava d.u3, calculado só no upload da planilha de Elegibilidade — corretora que voltou a vender
  // depois disso continuava na lista de reativação.
  const vendasUltimos3 = d => { const m = d.m || []; return (m[m.length-1]||0) + (m[m.length-2]||0) + (m[m.length-3]||0); };
  window.vendasUltimos3 = vendasUltimos3;
  // d.u3 também aparece na tabela/detalhe e na ordenação — mantido igual a vendasUltimos3 (aqui na
  // carga, e de novo em applyCorretorasToEligibilidade/updateEligibilidadeData).
  (DATA || []).forEach(d => { d.u3 = vendasUltimos3(d); });
  // Oportunidade de reativação — UMA regra só, seguindo o período do filtro (Victor, 2026-10-13: "quando eu filtro por
  // tri ou mês, os dados não se adaptam"; antes banner/caixinha usavam sempre os 3 últimos meses e o cartão/Top 15
  // outra regra, sem o corte). Corte de 20 vidas mantido (decisão do Victor).
  //  - "Todos os meses": ≥ 20 vidas no histórico e zero nos 3 últimos meses (como sempre).
  //  - Com período: ≥ 20 vidas ANTES do período e zero DENTRO dele. Potencial = o que vendeu antes do período;
  //    tempo parado = meses entre a última venda e o fim do período.
  function reactCtx(d, periodMonths){
    const m = d.m || [];
    if (!periodMonths || !periodMonths.length){
      return { ok: vendasUltimos3(d) === 0 && d.tot >= 20, pot: d.tot || 0, parado: monthsSinceLastSale(d) };
    }
    const ini = Math.min.apply(null, periodMonths), fim = Math.max.apply(null, periodMonths);
    let antes = 0, ult = -1;
    for (let i = 0; i < ini; i++){ const v = m[i] || 0; antes += v; if (v > 0) ult = i; }
    const noPeriodo = periodMonths.reduce((s, i) => s + (m[i] || 0), 0);
    return { ok: antes >= 20 && noPeriodo === 0, pot: antes, parado: ult >= 0 ? fim - ult : fim + 1 };
  }
  function isReactivation(d){ return reactCtx(d, getPeriodMonths()).ok; }
  const reactPot = d => reactCtx(d, getPeriodMonths()).pot;
  const reactParado = d => reactCtx(d, getPeriodMonths()).parado;

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
    // Trimestre anterior ao vigente, recalculado (era fixo em [15,16,17] = 2TRI26).
    const prevTri = prevTriDef();
    return prevTri ? computePeriodElegRank(d, prevTri.months) : null;
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
    // Agrupa pela assessoria UNIFICADA (window.assCanon, 2026-10-13): grafias diferentes da mesma assessoria
    // viram uma linha só; cada corretora continua na assessoria gravada nela.
    const nomeGrupo = {};
    filtered.forEach(d => {
      const can = window.assCanon ? window.assCanon(d.ass, d.acod) : (d.ass ? { key: d.ass, nome: d.ass } : null);
      const key = can ? can.key : '__SEM__';
      if (can) nomeGrupo[key] = can.nome;
      (groups[key] = groups[key] || []).push({ d, ctx: assCtx(d, periodMonths) });
    });
    let aggs = Object.entries(groups).map(([key, rows]) => {
      const n = rows.length;
      const eleg = rows.filter(r=>r.ctx.el===1).length;
      const vidas = rows.reduce((s,r)=>s+r.ctx.periodTotal,0);
      const meta = rows.reduce((s,r)=>s+(r.ctx.meta||0),0);
      // código da assessoria: o mais comum entre as corretoras do grupo
      const contCod = {};
      if (key !== '__SEM__') rows.forEach(r => { const c = String(r.d.acod||'').trim(); if (c && c !== '0') contCod[c] = (contCod[c]||0) + 1; });
      const acod = Object.keys(contCod).sort((a,b)=>contCod[b]-contCod[a])[0] || '';
      return { key, acod, name: key==='__SEM__'?'Sem assessoria vinculada':(nomeGrupo[key] || key), rows, n, eleg,
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

      // Potencial e tempo parado seguem o período do filtro (reactCtx, 2026-10-13)
      const n = filtered.length;
      const totalVidas = filtered.reduce((s,d)=>s+reactPot(d),0);
      const media = n ? totalVidas / n : 0;
      const maisPotencial = n ? filtered.reduce((a,b)=> reactPot(a) > reactPot(b) ? a : b) : null;
      const mediaInativa = n ? filtered.reduce((s,d)=>s+reactParado(d),0) / n : 0;
      const periodoReact = getPeriodMonths();

      const kpiDefs = [
        { bar:'#F26B21', ico:'<i class=ic-target></i>', icoBg:'rgba(242,107,33,.12)', color:'#F26B21',
          label:'Corretoras em Oportunidade', value: fmt0(n), pct: periodoReact ? 'vendiam antes, zero no período' : 'histórico relevante, zero produção recente',
          list: filtered, title:'Oportunidades de reativação' },
        { bar:'#1D33A8', ico:'<i class=ic-trend></i>', icoBg:'rgba(29,51,168,.10)', color:'#101E63',
          label:'Vidas Históricas em Potencial', value: fmt0(totalVidas), pct: n?('média de '+fmt0(media)+' por corretora'+(periodoReact?' (antes do período)':'')):'0' },
        { bar:'#16B87A', ico:'<i class=ic-award></i>', icoBg:'rgba(22,184,122,.12)', color:'#16B87A',
          label:'Maior Potencial Único', value: maisPotencial?fmt0(reactPot(maisPotencial)):'—', pct: maisPotencial?maisPotencial.n:'—',
          list: maisPotencial ? [maisPotencial] : null, title: maisPotencial ? maisPotencial.n : '' },
        { bar:'#FFB81C', ico:'<i class=ic-alarm></i>', icoBg:'rgba(255,184,28,.16)', color:'#a5690f',
          label:'Tempo Médio Inativo', value: mediaInativa.toFixed(1)+' meses', pct: periodoReact ? 'da última venda até o fim do período' : 'desde a última venda' },
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
            const potg = l.reduce((s,d)=>s+reactPot(d),0);
            return [`${l.length} oportunidade(s)`, `${fmt0(potg)} vidas em potencial`, 'Clique para filtrar'];
          }}}},
          scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{autoSkip:false, font:{size:11, weight:'600'}}} } }
      });

      const sortedReact = [...filtered].sort((a,b)=>reactPot(b)-reactPot(a));
      document.getElementById('reactTableBody').innerHTML = sortedReact.length ? sortedReact.map(d => `
        <tr class="clickable" data-c="${d.c}">
          <td class="name">${d.n}</td>
          <td>${shortGestor(d.g)}</td>
          <td class="num">${fmt0(reactPot(d))}</td>
          <td>${reactParado(d)} meses</td>
        </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px;">Nenhuma corretora encontrada com esses filtros.</td></tr>`;
      document.querySelectorAll('#reactTableBody tr[data-c]').forEach(tr => window.__kb(tr).addEventListener('click', () => showDetail(tr.dataset.c)));

      window.__execInsights = n ? [{ico:'<i class=ic-target></i>', text: periodoReact
        ? `<b>${fmt0(n)} corretoras</b> que vendiam antes (≥ 20 vidas) ficaram zeradas no período — <b>${fmt0(totalVidas)} vidas</b> de histórico em potencial de reativação.`
        : `<b>${fmt0(n)} corretoras</b> com histórico relevante estão sem vender há pelo menos 3 meses — <b>${fmt0(totalVidas)} vidas</b> em potencial de reativação.`}] : [];
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
    const cycleLabel = periodMonths ? ((PERIOD_DEFS[periodType][periodIdx]||{}).label || 'período') : ('Ciclo vigente (' + triShort(curTriDef()) + ')');
    // Rótulo da base de comparação do chip "vs ...": o delta compara com os N meses imediatamente
    // anteriores (N = nº de meses do período, getPrevEquivalentMonths). Com trimestre COMPLETO é o
    // trimestre anterior; com trimestre parcial (ex.: só Outubro) é só o(s) mês(es) antes — rotular
    // como "3º Trimestre" era enganoso (corrigido 2026-10-06).
    const prevLabel = (() => {
      if (!periodMonths) return triShort(prevTriDef());
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
      const curTriKpi = curTriDef();
      periodLabelKpi = isLatestMonthMode
        ? (triShort(curTriKpi) + ((curTriKpi && curTriKpi.months.length < 3) ? ' (parcial)' : '') + ' vs Meta')
        : '2TRI26 vs Meta'; // mês antigo: coluna oficial da planilha de Elegibilidade (ciclo 2TRI26)
    }
    const eligCount = periodMonthsKpi ? filtered.filter(d=>computePeriodElegRank(d, periodMonthsKpi).el===1).length : filtered.filter(d=>d.el===1).length;
    const eligPct = filtered.length ? (eligCount/filtered.length*100) : 0;
    const reactList = filtered.filter(isReactivation);

    // kpis unificado construido mais abaixo, apos semProducao/inativas90/periodLabel estarem prontos

    const filtersActive = isAnyFilterActive();
    document.getElementById('reactBanner').style.display = filtersActive ? 'none' : '';
    if (!filtersActive) {
      // Texto do aviso calculado (era fixo: "17 meses" e "Abr–Jun/26"). Segue o período do filtro (2026-10-13).
      const reactDescEl = document.getElementById('reactDesc');
      const pmBanner = getPeriodMonths();
      const rotMes = i => MONTH_LABELS[i] || '';
      const faixa = (a, b) => { const x = rotMes(a), y = rotMes(b); return a === b ? x : (x.split('/')[1] === y.split('/')[1] ? (x.split('/')[0] + '–' + y) : (x + '–' + y)); };
      if (pmBanner){
        const iniB = Math.min.apply(null, pmBanner), fimB = Math.max.apply(null, pmBanner);
        if (reactDescEl) reactDescEl.textContent = `Corretoras que vendiam antes do período (≥ 20 vidas até ${rotMes(iniB - 1) || 'o início'}) e ficaram com zero vendas em ${faixa(iniB, fimB)}. Ponto de partida ideal para ações comerciais e visitas presenciais.`;
      } else {
        const nMesesReact = MONTH_LABELS.length - eligDataStartIdx;
        if (reactDescEl) reactDescEl.textContent = `Corretoras com histórico relevante de produção (≥ 20 vidas em ${nMesesReact} meses) e zero vendas nos últimos 3 meses (${faixa(Math.max(0, MONTH_LABELS.length - 3), MONTH_LABELS.length - 1)}). Ponto de partida ideal para ações comerciais e visitas presenciais.`;
      }
      document.getElementById('reactCount').textContent = reactList.length;
      document.getElementById('reactPotential').textContent = fmt0(reactList.reduce((s,d)=>s+reactPot(d),0));
      document.getElementById('reactPeak').textContent = reactList.length ? fmt0(Math.max(...reactList.map(reactPot))) : '0';
    }

    // ===== Situação de Atividade da Carteira (distinto do flag "Elegível" da campanha) =====
    const periodMonths = getPeriodMonths(); // null = "Todos os meses"
    const periodType = document.getElementById('fPeriodType').value;
    const periodLabel = periodType === 'all' ? 'todos os meses' : (PERIOD_DEFS[periodType][Number(document.getElementById('fPeriodValue').value)] || {}).label || '';
    const showAbsoluteCharts = !periodMonths;
    // Mesma regra do banner/caixinha (reactCtx, já segue o período) — antes aqui era outra, sem o corte de 20 vidas.
    const reactListEffective = reactList;
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
      {icon:"<i class=ic-target></i>", label:'Oportunidades de Reativação', value: reactListEffective.length.toLocaleString('pt-BR'), sub: fmt0(reactListEffective.reduce((s,d)=>s+reactPot(d),0))+' vidas em potencial', cls:'warn'},
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
              const g = c.label; const vidas = fmt0((byGestor[g]||[]).reduce((s,d)=>s+reactPot(d),0));
              return [`${c.raw} corretora(s)`, `${vidas} vidas em potencial`, 'Clique para ver a lista'];
            }}}}, scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}, ticks:{stepSize:1}}, y:{grid:{display:false}} } }
        });

        document.getElementById('reactChartTitle').textContent = 'Tempo desde a Última Venda';
        document.getElementById('reactSub').textContent = 'Quanto mais recente a queda, mais fácil a reativação — clique numa barra para ver as corretoras';
        const byDormancy = {}; DORMANCY_ORDER.forEach(b=>byDormancy[b]=[]);
        filtered.forEach(d => { byDormancy[dormancyBucket(reactParado(d))].push(d); }); // até o fim do período (2026-10-13)
        destroyChart('react');
        const reactCanvas = document.getElementById('chartReact');
        const reactEmpty = document.getElementById('reactEmptyState');
        reactCanvas.style.visibility = 'visible';
        reactEmpty.style.display = 'none';
        charts.react = new Chart(reactCanvas, {
          type:'bar',
          data:{ labels: DORMANCY_ORDER, datasets:[{ label:'Corretoras', data: DORMANCY_ORDER.map(b=>byDormancy[b].length), backgroundColor: ['#FFB81C','#F26B21','#F5364A','#9a3412'], borderRadius:5 }] },
          options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, onClick:(evt, els)=>{ if(!els || !els.length) return; const idx = els[0].index; setTimeout(()=>{ const b = DORMANCY_ORDER[idx]; showChartDrilldown('Parado há '+b, byDormancy[b]); }, 0); }, onHover:(evt,els)=>{ if(evt && evt.native && evt.native.target) evt.native.target.style.cursor = (els && els.length) ? 'pointer' : 'default'; }, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{
              const b = c.label; const vidas = fmt0((byDormancy[b]||[]).reduce((s,d)=>s+reactPot(d),0));
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

        const topReact = [...reactListEffective].sort((a,b)=>reactPot(b)-reactPot(a)).slice(0,15);
        document.getElementById('reactChartTitle').textContent = topReact.length ? `Top ${topReact.length} Oportunidades de Reativação` : 'Oportunidades de Reativação';
        document.getElementById('reactSub').textContent = showAbsoluteCharts ? 'Maior potencial histórico, zero produção nos últimos 3 meses' : `Vendia antes (≥ 20 vidas), zerou em ${periodLabel} — ordenado pelo histórico antes do período`;
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
            data:{ labels: topReact.map(d=>d.n.length>28?d.n.slice(0,28)+'…':d.n), datasets:[{ data: topReact.map(reactPot), backgroundColor:'#F26B21', borderRadius:5 }] },
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
    const membrosAssessoria = scopedData().filter(x => { if (!x.ass && !x.acod) return false; const can = window.assCanon ? window.assCanon(x.ass, x.acod) : { nome: String(x.ass||'') }; return can && String(can.nome).trim().toUpperCase() === nomeUp; });
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
  window.getRetratosOntemHoje = getRetratosOntemHoje;
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

    // Ontem → hoje: pelos retratos diários do próprio painel (14/10/2026). A planilha Crescimento Geral só é usada se
    // ainda não existir nenhum retrato (nunca mistura as duas fontes).
    const ret = window.getRetratosOntemHoje ? window.getRetratosOntemHoje() : null;
    const convReport = ret ? {} : ((window.getConvOntemHoje ? window.getConvOntemHoje() : {}) || {});
    const retDoGestor = g => {
      if (!ret || !ret.ontem) return null;
      const o = ret.ontem.g[g] || {f:0,a:0,r:0}, h = ret.hoje.g[g] || {f:0,a:0,r:0};
      return { funilOntem:o.f, funilHoje:h.f, assinaturaOntem:o.a, assinaturaHoje:h.a, rankingOntem:o.r, rankingHoje:h.r };
    };
    const dBR = iso => iso ? iso.slice(8,10)+'/'+iso.slice(5,7) : '';
    const infoEl = document.getElementById('convRetratoInfo');
    if (infoEl){
      if (ret && ret.ontem){
        const mesesTxt = (ret.hoje.meses||[]).map(m => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+m.slice(5,7)-1]+'/'+m.slice(2,4)).join(' e ');
        infoEl.innerHTML = `<b>Ontem → hoje:</b> ${dBR(ret.ontem.data)} → ${dBR(ret.hoje.data)} · Funil = análise + pendência com vigência ${mesesTxt} (regra da Crescimento Geral) · Assinatura = extrato de notificadas · Ranking = vendas do mês com ADM`
          + (ret.hoje.rk && ret.hoje.rk < ret.hoje.data ? ` <span style="color:var(--accent-red);">(ranking sem extrato do BI novo desde ${dBR(ret.hoje.rk)})</span>` : '');
      } else if (ret){
        infoEl.innerHTML = `<b>Ontem → hoje:</b> primeiro retrato guardado em ${dBR(ret.hoje.data)} — a comparação aparece a partir da próxima importação, num outro dia.`;
      } else infoEl.innerHTML = '';
    }
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
      const cg = ret ? retDoGestor(g) : (convReport[g] || null);
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
      if (pct===null) return '<span style="color:var(--muted); font-size:11px;">' + (ret && !ret.ontem ? 'a partir da próxima importação' : 'sem base de ontem') + '</span>';
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
    // Retratos diários do painel (14/10/2026) — os dois lados vêm do retrato; sem retrato nenhum, cai na Crescimento Geral.
    // (Antes o "hoje" do ranking comparava r.g — nome curto, ex.: "Pablo Amora" — com o nome cru, e dava 0 pra quem tem
    // nome abreviado.)
    const ret = window.getRetratosOntemHoje ? window.getRetratosOntemHoje() : null;
    let cgData = null;
    if (ret && ret.ontem){
      const o = ret.ontem.g[gestor] || {f:0,a:0,r:0}, h = ret.hoje.g[gestor] || {f:0,a:0,r:0};
      cgData = { funilOntem:o.f, funilHoje:h.f, assinaturaOntem:o.a, assinaturaHoje:h.a, rankingOntem:o.r, rankingHoje:h.r };
    } else if (ret){
      const h = ret.hoje.g[gestor] || {f:0,a:0,r:0};
      cgData = { funilOntem:null, funilHoje:h.f, assinaturaOntem:null, assinaturaHoje:h.a, rankingOntem:null, rankingHoje:h.r };
    } else {
      cgData = (window.getConvOntemHoje ? window.getConvOntemHoje() : {})[gestor] || null;
    }

    document.getElementById('convDetailAvatar').textContent = gestor.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
    document.getElementById('convDetailName').textContent = gestor;
    document.getElementById('convDetailEquipe').textContent = GESTOR_EQUIPE[gestor] ? 'Equipe ' + GESTOR_EQUIPE[gestor] : 'Sem equipe cadastrada';

    const linhas = [
      {label:'Aguardando Assinatura', ontem: cgData ? cgData.assinaturaOntem : null, hoje: cgData ? cgData.assinaturaHoje : assinHoje},
      {label:'Funil (análise + pendência, vigência mês atual + anterior)', ontem: cgData ? cgData.funilOntem : null, hoje: cgData ? cgData.funilHoje : funilHoje},
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
      d.u3 = vendasUltimos3(d);
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
  //
  // REFEITO 2026-10-06 (Victor: "vem totalmente desformatado, e faltando os nomes das colunas"):
  // o layout agora copia a aba ELEGIBILIDADE da planilha oficial ("ELEGIBILIDADE CARTEIRA CAUDA
  // LONGA - 17 MESES 05.10.2026") — cores, mesclas, 2 linhas congeladas, filtro, larguras e as
  // cores condicionais de Elegível/Ranking. O SheetJS gratuito não grava formatação, então o
  // arquivo é gerado pelo ExcelJS (carregado do cdnjs só na hora do clique); se ele não carregar,
  // cai num .xlsx sem cores mas com o MESMO layout. Regras do layout:
  // - 5 colunas de cadastro; cada mês = PF/SS/PME/TOTAL com o nome do mês mesclado em cima;
  // - 2025 (ano fechado; só quem tem histórico) termina com os blocos 1T25..4T25, 1 SEMESTRE,
  //   2 SEMESTRE e TOTAL 25 (também PF/SS/PME/TOTAL), como na planilha;
  // - de 2026 em diante, depois de cada trimestre fechado uma coluna "nTRIaa TOTAL"; o trimestre
  //   vigente leva "nTRI TOTAL" (sem ano, igual à planilha) + META/GAP. Assim o importador (que usa
  //   os 2 últimos "nTRIaa TOTAL" como t1/t2) relê o arquivo com a régua do trimestre vigente;
  // - "N MESES TOTAIS" = soma de TODOS os meses (a fórmula da planilha pula Ago/26 e Set/26 —
  //   Victor decidiu somar tudo); Meta/Gap/Elegibilidade/Ranking = trimestre vigente recalculado
  //   (computePeriodElegRank), o mesmo número que a tela mostra;
  // - outras equipes começam em Jan/26 (sem 2025), como os arquivos oficiais delas (decisão do Victor).
  const MONTH_NUM_TO_NAME = {1:'JANEIRO',2:'FEVEREIRO',3:'MARÇO',4:'ABRIL',5:'MAIO',6:'JUNHO',7:'JULHO',8:'AGOSTO',9:'SETEMBRO',10:'OUTUBRO',11:'NOVEMBRO',12:'DEZEMBRO'};
  function globalIdxToMonthHeader(idx){
    const year = 2025 + Math.floor(idx/12), monthNum = (idx % 12) + 1;
    return `${MONTH_NUM_TO_NAME[monthNum]} ${String(year).slice(2)}`;
  }
  function buildEligExportLayout(team){
    const rows = DATA.filter(d => ELIG_GESTOR_TEAM[d.g] === team);
    if (!rows.length) return null;
    const lastIdx = rows[0].m.length - 1;
    const tem2025 = rows.some(d => d.m.slice(0, 12).some(v => v));
    const start = (tem2025 || lastIdx < 12) ? 0 : 12;
    const seq = (a, b) => Array.from({length: b - a + 1}, (_, k) => a + k);
    const yy = i => String(2025 + Math.floor(i / 12)).slice(2);
    const triNum = i => Math.floor((i % 12) / 3) + 1;
    const vigStart = lastIdx - (lastIdx % 3);
    const vigIdx = seq(vigStart, lastIdx);
    const vigLabel = `${triNum(lastIdx)}TRI${yy(lastIdx)}`;
    const sumIdx = (arr, idxs) => idxs.reduce((s, i) => s + ((arr && arr[i]) || 0), 0);
    const calcCache = new Map();
    const cx = d => {
      if (!calcCache.has(d)){
        const c = (typeof computePeriodElegRank === 'function') ? computePeriodElegRank(d, vigIdx) : null;
        calcCache.set(d, c ? { total: c.periodTotal, meta: c.meta, el: c.el, rk: c.rk }
                           : { total: sumIdx(d.m, vigIdx), meta: d.meta3tri || 0, el: d.el, rk: d.rk });
      }
      return calcCache.get(d);
    };
    // kind: info | mes | resumo (blocos de 2025) | tri (trimestre fechado) | vig (vigente/meta/gap/total) | eleg | rank
    const cols = [];
    const cat4 = (h1, idxs, kind) => {
      const g = cols.length;
      cols.push({h1, h2:'PF', kind, g, w:4.875, val: d => sumIdx(d.mc && d.mc.pf, idxs)});
      cols.push({h1, h2:'SS', kind, g, w:5.125, val: d => sumIdx(d.mc && d.mc.ss, idxs)});
      cols.push({h1, h2:'PME', kind, g, w:6.625, val: d => sumIdx(d.mc && d.mc.pme, idxs)});
      cols.push({h1, h2:'TOTAL', kind, g, w:9.625, val: d => sumIdx(d.m, idxs)});
    };
    const single = (h1, kind, w, val, extra) => cols.push(Object.assign({h1, h2:null, kind, w, val}, extra || {}));
    single('CÓDIGO', 'info', 12, d => String(d.c), {numFmt:'@'});
    single('NOME CORRETOR', 'info', 60, d => d.n);
    single('GRADE DE COMISSÃO', 'info', 22, d => team === 'CAUDA LONGA' ? (d.gr || '') : '');
    single('ASSESSORIA', 'info', 45, d => { const can = window.assCanon ? window.assCanon(d.ass, d.acod) : null; return can ? can.nome : (d.ass || ''); }); // nome unificado (2026-10-13)
    single('GERENTE', 'info', 28, d => d.g);
    for (let i = start; i <= lastIdx; i++){
      cat4(globalIdxToMonthHeader(i), [i], 'mes');
      if (i === 11 && lastIdx > 11){
        [0, 1, 2, 3].forEach(q => cat4(`${q + 1}T25`, seq(q * 3, q * 3 + 2), 'resumo'));
        cat4('1 SEMESTRE', seq(0, 5), 'resumo');
        cat4('2 SEMESTRE', seq(6, 11), 'resumo');
        cat4('TOTAL 25', seq(0, 11), 'resumo');
      }
      if (i >= 12 && (i % 3) === 2 && i < vigStart) single(`${triNum(i)}TRI${yy(i)} TOTAL`, 'tri', 18, d => sumIdx(d.m, [i - 2, i - 1, i]));
    }
    single(`${triNum(lastIdx)}TRI TOTAL`, 'vig', 18, d => cx(d).total);
    single(`META ${vigLabel}`, 'vig', 22, d => cx(d).meta, {numFmt:'0'});
    single(`GAP ${vigLabel}`, 'vig', 20, d => cx(d).total - cx(d).meta, {numFmt:'0'});
    const nMeses = lastIdx - start + 1;
    single(`${nMeses} MESES TOTAIS`, 'vig', 22, d => sumIdx(d.m, seq(start, lastIdx)));
    single('ELEGIBILIDADE', 'eleg', 23.625, d => cx(d).el === 1 ? 'Elegível' : 'Não elegível');
    single('RANKING', 'rank', 19.125, d => cx(d).rk || 'Não Classificado');
    // Mesclas: mês/bloco = 4 colunas na linha 1; coluna única = linhas 1 e 2.
    const merges = [];
    cols.forEach((c, i) => {
      if (c.h2 === null) merges.push([1, i + 1, 2, i + 1]);
      else if (c.h2 === 'PF') merges.push([1, i + 1, 1, i + 4]);
    });
    const hoje = new Date();
    const dataBR = String(hoje.getDate()).padStart(2, '0') + '.' + String(hoje.getMonth() + 1).padStart(2, '0') + '.' + hoje.getFullYear();
    // "/" (ex.: "PLATAFORMA ABC/ALTO TIETÊ/BX") não pode em nome de arquivo no Windows.
    const fileName = `ELEGIBILIDADE CARTEIRA ${team.replace(/[\\/:*?"<>|]+/g, '-')} - ${nMeses} MESES ${dataBR}.xlsx`;
    return { team, rows, cols, merges, fileName };
  }
  let excelJsPromise = null;
  function loadExcelJS(){
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (!excelJsPromise){
      excelJsPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
        s.onload = () => window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS não carregou'));
        s.onerror = () => { excelJsPromise = null; reject(new Error('Falha ao baixar o ExcelJS')); };
        document.head.appendChild(s);
      });
    }
    return excelJsPromise;
  }
  function downloadBlob(blob, fileName){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    // Registro de acessos (item 4): cobre Elegibilidade e Desempenho Comercial, que baixam por aqui.
    if (window.fsRegistrarAcesso) window.fsRegistrarAcesso('baixou', fileName);
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  // Usados também pelo export do Desempenho Comercial (outra IIFE).
  window.loadExcelJS = loadExcelJS;
  window.downloadBlobFile = downloadBlob;
  async function buildEligXlsxStyled(L){
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('ELEGIBILIDADE', { views: [{ state:'frozen', ySplit:2, zoomScale:77 }] });
    // Cores lidas da planilha oficial (aba ELEGIBILIDADE).
    const C = { azul:'FF003DA5', marinho:'FF002B7F', laranja:'FFFF6A00', grafite:'FF4D4D4D', cinza:'FFA6A6A6', verde:'FF4EA72E', branco:'FFFFFFFF', preto:'FF000000' };
    const solid = argb => ({ type:'pattern', pattern:'solid', fgColor:{ argb } });
    const thin = { style:'thin' };
    const box = { top:thin, left:thin, bottom:thin, right:thin };
    const center = { horizontal:'center', vertical:'middle' };
    const headFill = { info:C.azul, mes:C.marinho, resumo:C.laranja, tri:C.grafite, vig:C.grafite, eleg:C.azul, rank:C.azul };
    // Estilo de dado por coluna (fonte/alinhamento/formato) — Elegibilidade/Ranking são por célula.
    L.cols.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      col.width = c.w;
      col.font = { name:'Aptos Narrow', size: c.kind === 'info' ? 11 : 12 };
      col.alignment = center;
      if (c.numFmt) col.numFmt = c.numFmt;
    });
    const r1 = ws.getRow(1), r2 = ws.getRow(2);
    r1.height = 15.75; r2.height = 15.75;
    L.cols.forEach((c, i) => {
      const font = c.kind === 'info'
        ? { name:'Calibri', size:11, bold:true, color:{ argb:C.branco } }
        : { name:'Aptos Narrow', size: c.kind === 'rank' ? 14 : 12, bold:true, color:{ argb:C.branco } };
      const a = r1.getCell(i + 1);
      a.value = c.h1; a.font = font; a.fill = solid(headFill[c.kind]); a.alignment = center; a.border = box; a.numFmt = 'General';
      const b = r2.getCell(i + 1);
      if (c.h2 === null){
        b.value = c.h1; b.font = font; b.fill = solid(headFill[c.kind]);
      } else {
        b.value = c.h2; b.font = { name:'Aptos Narrow', size:12, bold:true, color:{ argb:C.preto } }; b.fill = solid(C.cinza);
      }
      b.alignment = center; b.border = box; b.numFmt = 'General';
    });
    L.rows.forEach(d => ws.addRow(L.cols.map(c => c.val(d))));
    const elegCol = L.cols.findIndex(c => c.kind === 'eleg') + 1;
    const rankCol = L.cols.findIndex(c => c.kind === 'rank') + 1;
    const lastRow = L.rows.length + 2;
    for (let r = 3; r <= lastRow; r++){
      const e = ws.getRow(r).getCell(elegCol);
      e.font = { name:'Aptos Narrow', size:11, bold:true, color:{ argb:C.branco } }; e.fill = solid(C.verde); e.border = box;
      const k = ws.getRow(r).getCell(rankCol);
      k.font = { name:'Aptos Narrow', size:14, bold:true }; k.border = box;
    }
    L.merges.forEach(m => ws.mergeCells(m[0], m[1], m[2], m[3]));
    const letter = n => ws.getColumn(n).letter;
    const dxf = (bg, fg) => ({ fill:{ type:'pattern', pattern:'solid', bgColor:{ argb:bg } }, font:{ color:{ argb:fg } } });
    ws.addConditionalFormatting({ ref: `${letter(elegCol)}3:${letter(elegCol)}${lastRow}`, rules: [
      { type:'containsText', operator:'containsText', text:'Não elegível', priority:1, style: dxf('FFFFC7CE', 'FF9C0006') },
      { type:'containsText', operator:'containsText', text:'Elegível', priority:2, style: dxf('FFC6EFCE', 'FF006100') },
    ]});
    const RANK_CF = [['Safira','FFCE93D8','FF4A148C'], ['Diamante','FF90CAF9','FF0D47A1'], ['Ouro','FFFFD54F','FF5D4037'], ['Prata','FFE0E0E0','FF424242'],
      ['Bronze 1','FFF57C00','FFFFFFFF'], ['Bronze 2','FFFB8C00','FFFFFFFF'], ['Bronze 3','FFFFA726','FFFFFFFF'], ['Bronze 4','FFFFB74D','FF4E342E'],
      ['Bronze 5','FFFFCC80','FF5D4037'], ['Bronze 6','FFFFE0B2','FF6D4C41'], ['Não Classificado','FFBDBDBD','FFFFFFFF']];
    ws.addConditionalFormatting({ ref: `${letter(rankCol)}3:${letter(rankCol)}${lastRow}`,
      rules: RANK_CF.map(([txt, bg, fg], i) => ({ type:'cellIs', operator:'equal', formulae:[`"${txt}"`], priority: 3 + i, style: dxf(bg, fg) })) });
    ws.autoFilter = { from:{ row:1, column:1 }, to:{ row:lastRow, column:L.cols.length } };
    const buf = await wb.xlsx.writeBuffer();
    return new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  // Plano B (ExcelJS não carregou): mesmo layout e mesclas, sem cores.
  function buildEligXlsxPlain(L){
    const aoa = [L.cols.map(c => c.h1), L.cols.map(c => c.h2 === null ? c.h1 : c.h2)];
    L.rows.forEach(d => aoa.push(L.cols.map(c => c.val(d))));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = L.merges.map(m => ({ s:{ r:m[0] - 1, c:m[1] - 1 }, e:{ r:m[2] - 1, c:m[3] - 1 } }));
    ws['!cols'] = L.cols.map(c => ({ wch: c.w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ELEGIBILIDADE');
    return new Blob([XLSX.write(wb, { bookType:'xlsx', type:'array' })], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  // Trava por equipe (pedido do Victor, 2026-10-07): quem tem a Elegibilidade restrita à própria equipe
  // (window.__eligTeamScope__, setado no login) só exporta essa equipe — antes o seletor oferecia as 4 e
  // dava pra baixar a carteira de outra equipe. O seletor mostra só a equipe da pessoa (sem equipe que
  // bata com uma opção, o botão some) e o próprio export recusa qualquer outra.
  function applyEligExportScope(){
    const scope = window.__eligTeamScope__;
    if (!scope) return;
    const sel = document.getElementById('elExportTeam'), btn = document.getElementById('btnExportElig');
    if (!sel) return;
    [...sel.options].forEach(o => { if (o.value !== scope) o.remove(); });
    if (!sel.options.length){ sel.style.display = 'none'; if (btn) btn.style.display = 'none'; }
    else sel.value = scope;
  }
  applyEligExportScope();
  window.exportEligibilidadeXlsx = async function(team){
    if (window.__eligTeamScope__ && team !== window.__eligTeamScope__) throw new Error('Seu acesso permite exportar só a sua equipe.');
    const L = buildEligExportLayout(team);
    if (!L){ alert('Nenhuma corretora encontrada pra essa equipe.'); return; }
    let blob;
    try { blob = await buildEligXlsxStyled(L); }
    catch (e){
      console.warn('[export Elegibilidade] sem formatação (ExcelJS indisponível):', e);
      blob = buildEligXlsxPlain(L);
    }
    downloadBlob(blob, L.fileName);
  };
  document.getElementById('btnExportElig').addEventListener('click', async () => {
    const btn = document.getElementById('btnExportElig');
    if (btn.disabled) return;
    const original = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Gerando .xlsx…';
    applyEligExportScope();
    try { await window.exportEligibilidadeXlsx(document.getElementById('elExportTeam').value); }
    catch (e){ console.error(e); alert('Não consegui gerar o arquivo: ' + (e && e.message ? e.message : e)); }
    finally { btn.disabled = false; btn.innerHTML = original; }
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
      d.u3 = vendasUltimos3(d);
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
    const reactList = elig.filter(d => (window.vendasUltimos3 ? window.vendasUltimos3(d) : d.u3) === 0 && d.tot>=20);
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
      // Períodos de CALENDÁRIO a partir do mês mais recente (índice 0 = Jan/25), com as opções do
      // seletor refeitas aqui. Antes eram texto fixo no index.html ("17 Meses", "3TRI26", "Jul/26")
      // e "Último Trimestre" somava os 3 últimos meses (em Outubro: Ago+Set+Out). Pedido do
      // Victor (2026-10-06): trimestre = calendário (3º tri = Jul+Ago+Set), semestre idem.
      const tm = window.MONTH_LABELS.length;
      const lastIdx = tm - 1;
      const lastY = 2025 + Math.floor(lastIdx / 12), lastM = lastIdx % 12; // lastM 0-11
      const yy = String(lastY).slice(2);
      const seq = (a, b) => Array.from({length: b - a + 1}, (_, k) => a + k);
      const mesAbbr = i => String(window.MONTH_LABELS[i]).split('/')[0];
      const span = r => r.length === 1 ? mesAbbr(r[0]) : (mesAbbr(r[0]) + '–' + mesAbbr(r[r.length - 1]));
      const triR = seq(lastIdx - (lastM % 3), lastIdx);
      const semR = seq(lastIdx - (lastM % 6), lastIdx);
      const periodRanges = { tot: null, sem: semR, tri: triR, mes: [lastIdx] }; // tot = soma de todos os meses de d.m
      const periodLabels = {
        tot: `Todos os meses (${tm})`,
        sem: `Semestre atual (${lastM < 6 ? 1 : 2}º Sem/${yy} · ${span(semR)})`,
        tri: `Trimestre atual (${Math.floor(lastM / 3) + 1}TRI${yy} · ${span(triR)})`,
        mes: `Mês Atual (${window.MONTH_LABELS[lastIdx]})`,
      };
      const anos = [];
      for (let y = 2025; y <= lastY; y++){
        const a = (y - 2025) * 12;
        periodRanges['ano' + y] = seq(a, Math.min(a + 11, lastIdx));
        periodLabels['ano' + y] = 'Ano ' + y;
        anos.push('ano' + y);
      }
      const ovPeriodSel = document.getElementById('ovTopPeriod');
      const ovOrder = ['tot', ...anos, 'sem', 'tri', 'mes'];
      const ovSig = ovOrder.map(k => k + '=' + periodLabels[k]).join('|');
      if (ovPeriodSel.dataset.sig !== ovSig){
        const prevOpt = ovPeriodSel.value;
        ovPeriodSel.innerHTML = ovOrder.map(k => `<option value="${k}">${periodLabels[k]}</option>`).join('');
        ovPeriodSel.value = ovOrder.includes(prevOpt) ? prevOpt : 'tri';
        ovPeriodSel.dataset.sig = ovSig;
      }
      const periodOpt = ovPeriodSel.value;
      const range = periodRanges[periodOpt];
      // "Todos os meses" soma d.m direto (não d.tot, que já ficou defasado em algumas corretoras —
      // ver applyCorretorasToEligibilidade) pra barra bater com o detalhe por categoria.
      const sumFor = d => range ? range.reduce((s,i)=>s+(d.m[i]||0),0) : (d.m || []).reduce((s,v)=>s+(v||0),0);
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
    // Sem período = todos os meses da corretora (era fixo em 18 meses, Jan/25–Jun/26).
    const idxs = range || Array.from({length:(d.m || []).length},(_,i)=>i);
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
    const nomeGrupo = {};
    data.forEach(r => {
      if (!r.ass) return; // sem assessoria vinculada não faz sentido como entidade pra comparar
      // Assessoria unificada (window.assCanon, 2026-10-13) — grafias da mesma assessoria numa entrada só.
      const can = window.assCanon ? window.assCanon(r.ass, r.acod) : { key: r.ass, nome: r.ass };
      nomeGrupo[can.key] = can.nome;
      (groups[can.key] = groups[can.key] || []).push(r);
    });
    return Object.entries(groups).map(([key, rows]) => {
      const name = nomeGrupo[key];
      const contCod = {};
      rows.forEach(r => { if (r.acod) contCod[r.acod] = (contCod[r.acod]||0) + 1; });
      const acod = Object.keys(contCod).sort((a,b)=>contCod[b]-contCod[a])[0] || '';
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
  // Ano de um mês que só chegou pelo NOME ("JANEIRO"): a ocorrência mais recente desse mês que não
  // passe de `ahead` meses à frente de hoje. Até 2026-10-07 o ano vinha do último mês conhecido —
  // em Jan/27 (último conhecido = Dez/26) o Excel "NDI SP - JANEIRO" virava Janeiro/2026 e era
  // gravado por cima dele como "correção de mês passado". Ex. (hoje = Jan/27, ahead 1): JANEIRO →
  // 2027, JUNHO → 2026 (reimportar mês passado continua indo pro ano certo). `today` só pra teste.
  window.inferYearForMonth = function(monthNum, ahead, today){
    const now = today || new Date();
    const nowIdx = now.getFullYear() * 12 + now.getMonth();
    // Começa no ano seguinte (ex.: metas do 1º TRI/27 subidas em Dez/26) e volta até cair na janela.
    let year = now.getFullYear() + 1;
    while (year * 12 + (Number(monthNum) - 1) > nowIdx + (ahead || 0)) year -= 1;
    return year;
  };
  function detectMetaMonth(workbook, fallbackYearMonth){
    const info = findMetaSheetInfo(workbook);
    if (!info || !fallbackYearMonth) return fallbackYearMonth;
    const monthWord = info.name.toUpperCase().replace(info.prefix.toUpperCase(), '').trim();
    const monthNum = META_MONTH_NAME_TO_NUM[monthWord];
    if (!monthNum) return fallbackYearMonth;
    const year = window.inferYearForMonth(monthNum, 1);
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
        if (!agg[key]) agg[key] = {nome: nomeCorretora, ind:0, ss:0, pme:0, adm:0, total:0, filiais:new Set(), gestor:friendly, codigo:String(codigo)};
        agg[key].ind += num(row[4]); agg[key].ss += num(row[5]); agg[key].pme += num(row[6]); agg[key].adm += num(row[7]);
        agg[key].total += num(row[4]) + num(row[5]) + num(row[6]);
        if (filial) agg[key].filiais.add(filial);
      }
      Object.values(agg).forEach(c => {
        const filialLabel = c.filiais.size > 1 ? `Diversas (${c.filiais.size} filiais)` : ([...c.filiais][0] || '');
        const entry = {c: c.codigo, n: c.nome ? String(c.nome).trim() : '', ind: c.ind, ss: c.ss, pme: c.pme, adm: c.adm, total: c.total, filial: filialLabel};
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

  let pendingMeta = null, pendingElig = null, pendingCarteira = null, pendingPendPme = null, pendingPendPf = null, pendingCorretorasRaw = null, pendingEligBridge = null, pendingPropostas = null, pendingAssinatura = null, pendingT6140bRaw = null;
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

  function cnpjDigits(v){
    if (v === null || v === undefined || v === '') return '';
    return String(v).replace(/\D/g,'').padStart(14,'0');
  }
  window.cnpjDigits = cnpjDigits;

  function parseCarteiraWorkbook(workbook){
    const sheet = findSheet(workbook, 'COMERCIAL');
    if (!sheet) throw new Error('Não encontrei a aba "COMERCIAL" no arquivo da Carteira.');
    const rows = sheetRows(sheet);
    // Coluna do CNPJ localizada pelo texto do cabeçalho (não por índice fixo) — achado
    // 2026-09-23 conferindo um arquivo real: a posição das colunas desliza dependendo de como
    // o arquivo foi baixado (uma cópia tinha uma coluna A em branco na frente de tudo, outra
    // não). Usado só pro Funil PME (byCnpj) — não mexe em nada do motor código→gestor
    // (byCodigo/map), que já é validado com índice fixo e não deve ser tocado.
    const headerRow = (rows[0]||[]).map(h => String(h||'').trim().toUpperCase());
    const iCnpj = headerRow.indexOf('CNPJ');
    const map = {}; const byCodigo = {}; const byCnpj = {};
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
      if (iCnpj >= 0 && entry.gestorRaw){
        const cnpjNorm = cnpjDigits(row[iCnpj]);
        // Primeira ocorrência vence em caso de CNPJ duplicado — mesmo critério "não
        // sobrescreve" usado em outros mapas deste arquivo, evita um conflito raro decidir
        // silenciosamente pra qualquer lado.
        if (cnpjNorm && cnpjNorm !== '00000000000000' && !byCnpj[cnpjNorm]) byCnpj[cnpjNorm] = entry.gestorRaw;
      }
      count++;
    }
    if (count === 0) throw new Error('Nenhuma linha válida encontrada na aba COMERCIAL.');
    return { map, byCodigo, byCnpj, totalRows: count };
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
      // adm por corretora (2026-10-07): usado pelo export do Desempenho Comercial (coluna 07-ADMINISTRADORA).
      byGestor[friendly].corretoras.push({c: codigo, n: c.nome, ind:c.ind, ss:c.ss, pme:c.pme, adm:c.adm, total:c.total, filial: filialLabel});
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
    // "dd/mm/aaaa" (T6140B do SIGO em CSV, 2026-10-07) → "aaaa-mm-dd", o mesmo formato do resto do painel.
    const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(v).trim());
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
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
        bn: num(row[iBn]), co: String(co).trim(), // sem vendedor (CPF) — item 5 de segurança, 26/10/2026
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

  // ===================== FUNIL PME — automação a partir dos 3 extratos brutos =====================
  // Substitui o processo manual do "PME AUTOMATIZADO.xlsx" (2 extratos da Planium colados +
  // dedup manual + T6140B colado + fórmulas de PROCV pra distribuir por gestor) — Victor sobe os
  // 3 arquivos originais direto, sem montar planilha nenhuma. Ver conversa 2026-09-23: a aba
  // RESULTADO FINAL daquele arquivo é PROCV(PLANIUM) + PROCV(T6140B), e a coluna GESTOR da
  // PLANIUM vem de PROCV por CNPJ da corretora contra a mesma Carteira que já é usada aqui
  // (parseCarteiraWorkbook/byCnpj) — não precisa de nenhum arquivo novo além do que já existia.
  const stripAccentsUpper = s => String(s||'').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

  // Extrato bruto da Planium ("stats_export_gndi_XXXX.csv/.xlsx") — um por mês (Victor baixa
  // mês atual + anterior). Aceita .csv direto (SheetJS já reconhece), sem precisar abrir no Excel.
  function parsePmePlaniumRawWorkbook(workbook){
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = sheetRows(sheet);
    const headerRowIdx = rows.findIndex(r => (r||[]).some(c => String(c||'').trim().toLowerCase() === 'propostaid'));
    if (headerRowIdx < 0) return null; // não é um extrato da Planium — deixa o chamador tentar outro tipo
    const header = rows[headerRowIdx].map(h => String(h||'').trim());
    const idx = name => header.indexOf(name);
    const iId = idx('propostaID'), iProp = idx('oper_propnum'), iCorrCnpj = idx('corretora_cnpj'),
          iContrNome = idx('contratante_nome'), iContrCnpj = idx('contratante_cnpj'), iVg = idx('date_vigencia'),
          iSt = idx('status'), iBn = idx('beneficiarios'), iVd = idx('vendedor_nome'), iCo = idx('corretora_nome'),
          iDn = idx('data_notificada');
    if ([iId,iProp,iCorrCnpj,iContrNome,iVg,iSt,iBn,iCo].some(i=>i<0)){
      throw new Error('O extrato da Planium não tem todas as colunas esperadas (propostaID, oper_propnum, corretora_cnpj, contratante_nome, date_vigencia, status, beneficiarios, corretora_nome).');
    }
    const records = [];
    for (let i = headerRowIdx+1; i < rows.length; i++){
      const row = rows[i] || [];
      const id = row[iId], p = row[iProp], co = row[iCo];
      if (!id || !p || !co) continue;
      records.push({
        id: String(id), p: String(p), corrCnpj: cnpjDigits(row[iCorrCnpj]),
        cn: fmtCnpjDisplay(row[iContrCnpj]), em: String(row[iContrNome]||''),
        vg: excelDateToStr(row[iVg]), st: String(row[iSt]||'').trim(), bn: num(row[iBn]),
        co: String(co).trim(), // sem vendedor (CPF) — item 5 de segurança, 26/10/2026
        // data de notificação (aaaa-mm-dd) — regra de quanto tempo guardar as finalizadas (buildPmeFromRawFiles)
        dn: iDn >= 0 ? excelDateToStr(row[iDn]) : '',
      });
    }
    if (!records.length) throw new Error('Nenhuma proposta reconhecida no extrato da Planium.');
    return records;
  }
  function fmtCnpjDisplay(v){
    const digits = cnpjDigits(v);
    return digits.length===14 ? `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12,14)}` : String(v||'');
  }

  // Extrato bruto do SIGO, tela T6140B ("CONFERENCIA_ORCAMENTO....csv/.xlsx") — cruza com a
  // Planium por NU_CONTROLE = oper_propnum. Comparação de cabeçalho sem acento (stripAccentsUpper)
  // porque esse export já veio com acentuação quebrada (encoding) em pelo menos um caso real.
  function parseT6140bRawWorkbook(workbook){
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = sheetRows(sheet);
    const headerRowIdx = rows.findIndex(r => (r||[]).some(c => stripAccentsUpper(c) === 'NU_CONTROLE'));
    if (headerRowIdx < 0) return null; // não é um extrato do T6140B — deixa o chamador tentar outro tipo
    const header = rows[headerRowIdx].map(h => stripAccentsUpper(h));
    const idx = name => header.indexOf(name);
    const iControle = idx('NU_CONTROLE'), iRecebimento = idx('DT_RECEBIMENTO'), iCadastro = idx('STATUS_CADASTRO'), iBitix = idx('STATUS_PROPOSTA_BITIX');
    // "STATUS_AREA_MÉDICA" — aceita também o cabeçalho com o acento quebrado ("STATUS_AREA_M?DICA").
    const iAreaMedica = header.findIndex(h => /^STATUS_AREA_M.{0,2}DICA$/.test(h));
    const byControle = {};
    for (let i = headerRowIdx+1; i < rows.length; i++){
      const row = rows[i] || [];
      const controle = row[iControle];
      if (!controle) continue;
      // Mesmo nº de controle repetido: vale a PRIMEIRA linha, igual ao PROCV do Excel (2026-10-07).
      if (byControle[String(controle).trim()]) continue;
      byControle[String(controle).trim()] = {
        dtReceb: iRecebimento>=0 ? excelDateToStr(row[iRecebimento]) : '',
        ditec: iAreaMedica>=0 ? String(row[iAreaMedica]||'').trim() : '',
        cadastro: iCadastro>=0 ? String(row[iCadastro]||'').trim() : '',
        bitix: iBitix>=0 ? String(row[iBitix]||'').trim() : '',
      };
    }
    if (Object.keys(byControle).length === 0) throw new Error('Nenhuma linha reconhecida no extrato do T6140B.');
    return byControle;
  }

  // Junta os extratos da Planium (dedup por propostaID mantendo a PRIMEIRA ocorrência — mesmo
  // efeito do "Remover Duplicadas" do Excel que Victor já fazia na mão, sem olhar data) + T6140B
  // (DATA RECEBIMENTO/DITEC/CADASTRO/BITIX) + Carteira (GESTOR, por CNPJ) pra reproduzir a aba
  // RESULTADO FINAL sem montar a planilha. `planiumRecordsList` é um array de arrays (um por
  // arquivo da Planium subido, na ordem em que foram lidos).
  function buildPmeFromRawFiles(planiumRecordsList, t6140bByControle, carteira){
    const seen = new Set();
    const merged = [];
    let totalBruto = 0;
    planiumRecordsList.forEach(list => {
      totalBruto += list.length;
      list.forEach(rec => { if (!seen.has(rec.id)){ seen.add(rec.id); merged.push(rec); } });
    });
    const byCnpj = (carteira && carteira.byCnpj) || {};
    const propostas = [];
    const pendData = {};
    const naoMapeados = {};
    // O que guardar (decisão do Victor, 2026-10-07): o extrato pode ser de qualquer período (até o ano todo),
    // mas o painel guarda as propostas EM ABERTO (análise, pendência, devolvida) de qualquer data e as
    // FINALIZADAS (implantada, cancelada...) só com notificação nos últimos 3 meses — tudo isso é baixado
    // por todo mundo no login, e o ano inteiro (~100 mil propostas) deixaria o painel pesado.
    const corte = (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0,10); })();
    const emAberto = st => /pend|analis|devolv/i.test(String(st||''));
    let finalizadasAntigas = 0;
    merged.forEach(rec => {
      const t6 = (t6140bByControle && t6140bByControle[String(rec.p).trim()]) || null;
      const gestorRaw = byCnpj[rec.corrCnpj] || '';
      const dr = t6 ? t6.dtReceb : '', di = t6 ? t6.ditec : '', ca = t6 ? t6.cadastro : '', bi = t6 ? t6.bitix : '';
      if (!emAberto(rec.st) && rec.dn && rec.dn < corte){ finalizadasAntigas++; return; }
      propostas.push({ p: rec.p, cn: rec.cn, em: rec.em, vg: rec.vg, st: rec.st, bn: rec.bn, co: rec.co, g: gestorRaw, dr, di, ca, bi, dn: rec.dn });
      if (!/pend|analis/i.test(rec.st)) return;
      const friendly = FULL_19_GESTOR_RAW_MAP[stripAccentsUpper(gestorRaw)] || ABREV_GESTOR_MAP[stripAccentsUpper(gestorRaw)];
      if (!friendly){
        const label = gestorRaw || '(CNPJ da corretora não encontrado na Carteira)';
        naoMapeados[label] = (naoMapeados[label]||0)+1;
        return;
      }
      (pendData[friendly] = pendData[friendly] || []).push({
        proposta: rec.p, corretora: rec.co,
        status: { planium: rec.st, cadastro: ca, ditec: di, bitix: bi },
        dataReceb: dr, dataVigencia: rec.vg, beneficiarios: rec.bn,
      });
    });
    return {
      propostas,
      pendData: { data: pendData, naoMapeados },
      totalArquivos: planiumRecordsList.length, totalBruto, totalMerged: merged.length,
      duplicatasRemovidas: totalBruto - merged.length,
      finalizadasAntigas, corte,
    };
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
  // Caminho inverso (nome bonito → nome cru da planilha), usado pelo export do Desempenho Comercial
  // pra escrever "PABLO SERGIO RIBEIRO AMORA" como no arquivo real. Sem mapeamento: maiúsculas
  // (os nomes bonitos dos outros executivos são o nome cru em "título", então volta igual).
  const RAW_BY_FRIENDLY = {};
  Object.entries(FULL_19_GESTOR_RAW_MAP).forEach(([raw, friendly]) => { if (!RAW_BY_FRIENDLY[friendly]) RAW_BY_FRIENDLY[friendly] = raw; });
  window.getGestorRawName = function(friendly){
    return RAW_BY_FRIENDLY[friendly] || String(friendly || '').trim().toUpperCase();
  };

  // Funil PF. Dois formatos (pedido do Victor, 2026-10-13):
  //  - ANTIGO: planilha montada à mão, aba "2026_ORCAMENTOS" já com a coluna GESTOR (PROCV feito no Excel);
  //  - CRU: o extrato do sistema "2026_ORCAMENTOS_T221ORCAM.CSV" (";", acentos do Windows), SEM GESTOR. O painel faz o
  //    PROCV sozinho: código = texto antes do 1º "-" em CONCESSIONÁRIA ("02LW-D P WHITE..." → "02LW") → Carteira →
  //    GESTOR, com o mesmo motor do extrato do BI (resolveGestorFromCarteira: 06GV→Vivian, 0834→Flavia). Entra quem
  //    está na lista de gestores do painel (inclui Interior, como no formato antigo); Rio/desligados/VENDA INTERNA ficam
  //    fora. Código fora da Carteira fica de fora e é listado no resumo (ex.: 435A ANOUK
  //    CAPITAL, 1.919 orçamentos em 13/10 — Victor: "pode deixar de fora por enquanto").
  function parsePfPendenciasWorkbook(workbook, carteira){
    const sheet = findSheet(workbook, '2026_ORCAMENTOS') || findSheet(workbook, 'ORCAMENTOS') || workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('Não encontrei a aba de orçamentos no arquivo PF.');
    const rows = sheetRows(sheet);
    const header = (rows[0]||[]).map(h => String(h||'').trim().toUpperCase());
    const idx = name => header.indexOf(name);
    const iConc = idx('CONCESSIONÁRIA'), iGestor = idx('GESTOR'), iStatus = idx('STATUS ORÇAMENTO'),
          iOrcamento = idx('Nº ORÇAMENTO'), iDataStatus = idx('DATA STATUS'), iVidas = idx('QTDE VIDAS'), iControle = idx('Nº CONTROLE');
    if ([iConc,iStatus,iOrcamento].some(i=>i<0)) throw new Error('O arquivo PF não tem as colunas esperadas (CONCESSIONÁRIA, Nº ORÇAMENTO, STATUS ORÇAMENTO).');
    const cru = iGestor < 0;
    if (cru && !(carteira && carteira.byCodigo && Object.keys(carteira.byCodigo).length)){
      throw new Error('Funil PF: o extrato T221ORCAM não traz o gestor — o painel precisa da Carteira pra achar (código da corretora → GESTOR). Selecione também a Carteira (BANCO DE DADOS - COMERCIAL) nesta importação.');
    }
    // Nº ORÇAMENTO no CSV vem como ="4708493" (truque do sistema pro Excel não virar número)
    const limpaNum = v => String(v == null ? '' : v).trim().replace(/^=?"?/, '').replace(/"$/, '').replace(/\.0$/, '');

    const data = {};
    const info = { cru, linhas: 0, foraEscopo: 0, semCarteira: {}, naoMapeados: {} };
    for (let i = 1; i < rows.length; i++){
      const row = rows[i] || [];
      const status = row[iStatus];
      if (!status || !String(status).trim()) continue;
      info.linhas++;
      const concStr = String(row[iConc]||'');
      const sep = concStr.indexOf('-');
      const codigo = sep >= 0 ? concStr.slice(0, sep).trim() : '';
      const nomeLimpo = sep >= 0 ? concStr.slice(sep + 1).trim() : concStr.trim();
      let friendly;
      if (!cru){
        const gestorRaw = row[iGestor];
        if (!gestorRaw) continue;
        friendly = FULL_19_GESTOR_RAW_MAP[String(gestorRaw).trim().toUpperCase()];
        if (!friendly) continue;
      } else {
        const r = codigo ? resolveGestorFromCarteira({ c: codigo, n: nomeLimpo }, carteira, 'CAUDA LONGA') : null;
        if (!r || !r.gestorRaw){
          // Mesma separação do extrato do BI (attributeCorretorasAgg): código existe mas todos os gestores dele são de
          // fora do escopo (ex.: 03BL Kaique/Flavia, Interior; 01JI VENDA INTERNA) → fora do escopo; existe com mais de
          // um gestor possível → ambíguo; não existe → fora da Carteira.
          const k = (codigo || '?') + ' - ' + nomeLimpo;
          const cands = codigo ? (carteira.byCodigo[normalizeCodigo(codigo)] || []) : [];
          // "Fora" = nenhum candidato está na lista do painel (Interior ESTÁ na lista — entra, como no formato antigo)
          const foraOuVazio = c => { const g = String(c.gestorRaw || '').trim().toUpperCase(); return !g || g === '0' || !(FULL_19_GESTOR_RAW_MAP[g] || ABREV_GESTOR_MAP[g]); };
          if (cands.length && cands.every(foraOuVazio)) info.foraEscopo++;
          else if (cands.length){ info.ambiguos = info.ambiguos || {}; info.ambiguos[k] = (info.ambiguos[k]||0) + 1; }
          else info.semCarteira[k] = (info.semCarteira[k]||0) + 1;
          continue;
        }
        // Mesma regra do formato antigo: entra quem está na lista do painel (inclui Interior); Rio/desligados/VENDA
        // INTERNA não estão na lista → "fora do escopo"; outros (Bianca, Fabio, Carlos Eduardo...) → listados à parte.
        const up = r.gestorRaw.trim().toUpperCase();
        friendly = FULL_19_GESTOR_RAW_MAP[up] || ABREV_GESTOR_MAP[up];
        if (!friendly){
          if (isOutOfScopeGestor(up)) info.foraEscopo++;
          else info.naoMapeados[up] = (info.naoMapeados[up]||0) + 1;
          continue;
        }
      }
      // Orçamento cancelado antes de ganhar número (Nº ORÇAMENTO vazio — 1.001 linhas em 13/10): identifica pelo
      // Nº CONTROLE, senão a tela de Pendências juntava todos numa linha só (ela agrupa pelo nº do orçamento).
      let orc = limpaNum(row[iOrcamento]);
      if (!orc){ const ctl = iControle >= 0 ? limpaNum(row[iControle]) : ''; orc = 'sem nº' + (ctl ? ' · controle ' + ctl : ' · linha ' + (i + 1)); }
      (data[friendly] = data[friendly] || []).push({
        orcamento: orc, corretora: nomeLimpo,
        status: String(status).trim(), dataStatus: excelDateToStr(row[iDataStatus]), vidas: num(row[iVidas]),
      });
    }
    if (Object.keys(data).length === 0) throw new Error('Nenhuma pendência PF reconhecida no arquivo.');
    return { data, info };
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
  // Aguardando assinatura (notificadas). Desde 14/10/2026 aceita o EXTRATO CRU do jeito que baixa
  // ("stats_export_gndi_NNNN.csv", sem GESTOR): o gestor sai do CNPJ da corretora na Carteira (byCnpj, primeiro
  // CNPJ vale — mesmo PROCV do funil PME; conferido com o relatório do Victor de 13/10: 460 de 461 linhas iguais, a
  // outra é um CNPJ que entrou na Carteira depois). O relatório antigo, já com a coluna GESTOR, continua valendo: se o
  // CNPJ não estiver na Carteira, usa o GESTOR da planilha. Linha sem CNPJ e sem operadora (lixo no fim da planilha
  // montada à mão) é ignorada. ATENÇÃO: CSV aberto e salvo no Excel estraga o CNPJ ("2,68E+13") — aí nada casa.
  function parseAssinaturaWorkbook(workbook, carteira){
    const sheet = findSheet(workbook, 'stats_export_gndi') || workbook.Sheets[workbook.SheetNames[0]];
    const rows = sheetRows(sheet);
    const header = (rows[0]||[]).map(h => String(h||'').trim());
    const idx = name => header.indexOf(name);
    const iAlvo = idx('alvo'), iGestor = idx('GESTOR'), iCorretora = idx('CORRETORA'), iCorrCnpj = idx('corretora_cnpj'),
          iData = idx('datacriacao'), iBenef = idx('beneficiarios'), iContratante = idx('contratante_nome'),
          iCnpj = idx('contratante_cnpj'), iCpf = idx('contratante_cpf'), iOper = idx('cnpjoperadora');
    if (iAlvo < 0 || (iGestor < 0 && iCorrCnpj < 0)) throw new Error('Não reconheci o extrato de notificadas — esperado o "stats_export_gndi" da Planium com as colunas "alvo" e "corretora_cnpj".');
    const byCnpj = (carteira && carteira.byCnpj) || {};
    if (iGestor < 0 && !Object.keys(byCnpj).length) throw new Error('Pra ler o extrato de notificadas o painel precisa da Carteira com CNPJ — selecione também a Carteira (BANCO DE DADOS - COMERCIAL) nesta importação.');
    const data = {}, semGestor = {};
    let lidas = 0, cnpjEstragado = 0;
    for (let i = 1; i < rows.length; i++){
      const row = rows[i] || [];
      const corrCnpjRaw = iCorrCnpj>=0 ? row[iCorrCnpj] : '';
      if (!corrCnpjRaw && !(iOper>=0 && row[iOper])) continue;
      lidas++;
      if (/e\+/i.test(String(corrCnpjRaw))) cnpjEstragado++;
      const cnpj = cnpjDigits(typeof corrCnpjRaw === 'number' ? corrCnpjRaw.toFixed(0) : corrCnpjRaw);
      const gestor = String(byCnpj[cnpj] || (iGestor>=0 ? row[iGestor] || '' : '')).trim();
      if (!gestor || /^#N/i.test(gestor)){ semGestor[cnpj || '(sem CNPJ)'] = (semGestor[cnpj || '(sem CNPJ)']||0) + (iBenef>=0 ? num(row[iBenef]) : 1); continue; }
      const docRaw = (iCnpj>=0 && row[iCnpj]) ? row[iCnpj] : (iCpf>=0 ? row[iCpf] : null);
      (data[gestor] = data[gestor] || []).push({
        alvo: String(row[iAlvo]||'').trim(),
        corretora: iCorretora>=0 && row[iCorretora] ? String(row[iCorretora]).trim() : (cnpj ? 'CNPJ ' + formatCnpjCpf(cnpj) : ''),
        contratante: iContratante>=0 ? String(row[iContratante]||'').trim() : '',
        doc: formatCnpjCpf(typeof docRaw === 'number' ? docRaw.toFixed(0) : docRaw),
        dataCriacao: iData>=0 ? assinaturaDateToStr(row[iData]) : '',
        beneficiarios: iBenef>=0 ? num(row[iBenef]) : 1,
      });
    }
    if (cnpjEstragado > lidas / 2) throw new Error('O CNPJ das corretoras veio estragado ("2,68E+13") — o arquivo foi aberto e salvo no Excel. Baixe o extrato de novo e suba sem abrir.');
    if (Object.keys(data).length === 0) throw new Error('Nenhum registro de "aguardando assinatura" achou gestor (confira se a Carteira é a mais recente).');
    return { data, semGestor, lidas };
  }
  function diffAssinatura(parsed){
    const totalReg = Object.values(parsed.data).reduce((s,arr)=>s+arr.length,0);
    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-clip></i> Aguardando Assinatura — Resumo</h3>';
    const totalVidas = Object.values(parsed.data).reduce((s,arr)=>s+arr.reduce((a,r)=>a+(r.beneficiarios||0),0),0);
    html += `<div style="font-size:12.5px;line-height:1.8;"><div><b>${totalReg}</b> contratos (<b>${totalVidas.toLocaleString('pt-BR')}</b> vidas) aguardando assinatura, em <b>${Object.keys(parsed.data).length}</b> gestores.</div>`;
    const sg = Object.entries(parsed.semGestor || {}).sort((a,b)=>b[1]-a[1]);
    if (sg.length) html += `<div style="color:var(--amber);"><i class=ic-warn></i> ${sg.reduce((s,[,v])=>s+v,0)} vidas de ${sg.length} CNPJ(s) de corretora fora da Carteira ficaram de fora: ${sg.slice(0,6).map(([k,v])=>`${k === '(sem CNPJ)' ? k : formatCnpjCpf(k)} (${v})`).join(' · ')}${sg.length>6?' · …':''}</div>`;
    html += '</div>';
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
    html += `<div style="font-size:12.5px;line-height:1.8;"><div><b>${totalPend}</b> pendências carregadas, em <b>${Object.keys(parsed.data).length}</b> gestores.</div>`;
    const inf = parsed.info;
    if (inf && inf.cru){
      // Extrato cru T221ORCAM: mostra o que ficou de fora do PROCV com a Carteira
      const lista = o => Object.entries(o).sort((a,b)=>b[1]-a[1]);
      const sc = lista(inf.semCarteira), nm = lista(inf.naoMapeados);
      const nSc = sc.reduce((s,[,n])=>s+n,0), nNm = nm.reduce((s,[,n])=>s+n,0);
      html += `<div style="color:var(--muted);">Extrato T221ORCAM: ${inf.linhas} orçamentos lidos; gestor achado pelo código da corretora na Carteira. Fora do escopo (Rio, desligados, VENDA INTERNA): ${inf.foraEscopo}.</div>`;
      if (nSc) html += `<div style="color:var(--amber);"><i class=ic-warn></i> <b>${nSc}</b> orçamento(s) de ${sc.length} código(s) que não estão na Carteira — ficaram de fora: ${sc.slice(0,6).map(([k,n])=>`${k} (${n})`).join(' · ')}${sc.length>6?' · …':''}</div>`;
      const am = lista(inf.ambiguos || {}), nAm = am.reduce((s,[,n])=>s+n,0);
      if (nAm) html += `<div style="color:var(--amber);"><i class=ic-warn></i> <b>${nAm}</b> orçamento(s) de código com mais de um gestor na Carteira — ficaram de fora: ${am.map(([k,n])=>`${k} (${n})`).join(' · ')}</div>`;
      if (nNm) html += `<div style="color:var(--muted);">Gestores fora da lista do painel (${nNm} orçamentos): ${nm.map(([k,n])=>`${k} (${n})`).join(' · ')}</div>`;
    }
    html += '</div>';
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
  // Extratos crus do Funil PME em CSV (Planium "stats_export_gndi_*.csv" e T6140B "CONFERENCIA_ORCAMENTO*.csv"):
  // lidos como TEXTO e com os valores crus (raw). Sem isso (2026-10-07): o T6140B vem com acentuação do
  // Windows (o cabeçalho "STATUS_AREA_MÉDICA" quebrava e o DITEC saía todo em branco) e a leitura padrão
  // virava "05/10/2026" em 10 de maio (data americana). .xlsx continua pelo caminho de sempre.
  function readPmeFileAsWorkbook(file){
    if (!/\.csv$/i.test(file.name || '')) return readFileAsWorkbook(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const bytes = new Uint8Array(e.target.result);
          let text;
          try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
          catch(_){ text = new TextDecoder('windows-1252').decode(bytes); }
          if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
          const wb = XLSX.read(text, { type:'string', raw:true });
          wb.__textoCru = text; // o T6140B guarda o arquivo inteiro pra aba T6140B do "Baixar .xlsx" (09/10/2026)
          resolve(wb);
        } catch(err){ reject(err); }
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
      reader.readAsArrayBuffer(file);
    });
  }


  // Botões "remover" + estado visual dos campos de arquivo
  const IMPORT_FILE_IDS = ['fileMetaJunho','fileElegibilidade','fileCarteira','filePendPme','filePendPf','fileAssinatura','fileRankPrev'];
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
    pendingMeta = null; pendingElig = null; pendingCarteira = null; pendingPendPme = null; pendingPendPf = null; pendingCorretorasRaw = null; pendingEligBridge = null; pendingPropostas = null; pendingAssinatura = null; pendingT6140bRaw = null;
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
    const pendPmeFiles = Array.from(document.getElementById('filePendPme').files);
    const pendPfFile = document.getElementById('filePendPf').files[0];
    const assinaturaFile = document.getElementById('fileAssinatura').files[0];
    const rankPrevFile = document.getElementById('fileRankPrev').files[0];
    if (!metaFile && !eligFile && !carteiraFile && !pendPmeFiles.length && !pendPfFile && !assinaturaFile && !rankPrevFile){
      statusEl.innerHTML = '<p style="color:var(--red);font-size:12.5px;">Selecione ao menos um arquivo.</p>';
      return;
    }
    const originalBtnText = btn.textContent;
    btn.disabled = true;
    btn.style.opacity = '.65';
    btn.style.cursor = 'default';
    btn.innerHTML = '<span class="spinner"></span> Processando...';
    summaryEl.style.display = 'none';
    pendingMeta = null; pendingElig = null; pendingCarteira = null; pendingPendPme = null; pendingPendPf = null; pendingCorretorasRaw = null; pendingEligBridge = null; pendingPropostas = null; pendingAssinatura = null; pendingT6140bRaw = null;
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
      if (pendPmeFiles.length){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Lendo Funil PME...</p>';
        // Auto-detecção igual ao bloco principal: cada arquivo solto no campo é classificado
        // pelo conteúdo. Aceita tanto o jeito antigo (1 arquivo, PME AUTOMATIZADO.xlsx pronto,
        // abas Planilha1 + PLANIUM) quanto o novo (extratos brutos soltos — 1-2 da Planium +
        // opcional o T6140B), sem precisar de campo separado pra cada um.
        let combinedWb = null;
        const planiumRawList = [];
        let t6140bByControle = null;
        const pendNaoReconhecidos = [];
        for (const file of pendPmeFiles){
          const wb = await readPmeFileAsWorkbook(file);
          if (!combinedWb && findSheet(wb, 'Planilha1') && findSheet(wb, 'PLANIUM')){
            combinedWb = wb;
            continue;
          }
          const planiumRecords = parsePmePlaniumRawWorkbook(wb);
          if (planiumRecords){ planiumRawList.push(planiumRecords); continue; }
          const t6 = parseT6140bRawWorkbook(wb);
          if (t6){
            t6140bByControle = t6;
            // Extrato inteiro (18 colunas) pra aba T6140B da planilha do funil — pedido do Victor, 09/10/2026.
            // Sem CPF/CNPJ e nome do cliente (window.t6140bSemDadosPessoais — item 5 de segurança, 26/10/2026).
            pendingT6140bRaw = { nome: file.name, texto: window.t6140bSemDadosPessoais(wb.__textoCru || XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { FS:';' })) };
            continue;
          }
          pendNaoReconhecidos.push(file.name);
        }
        if (combinedWb){
          pendingPendPme = parsePmePendenciasWorkbook(combinedWb);
          summaryHtml += diffPendPme(pendingPendPme);
          // Mesmo arquivo tem a aba "PLANIUM" (histórico completo de propostas) — atualiza junto
          // a lista usada no Ranking de Vendas, sem precisar de um upload separado.
          try {
            pendingPropostas = parsePlaniumWorkbook(combinedWb);
            summaryHtml += diffPropostas(pendingPropostas);
          } catch(e){
            summaryHtml += `<div style="font-size:12px; margin-top:6px; color:var(--muted);">Propostas do Ranking não atualizadas: ${e.message}</div>`;
          }
        } else if (planiumRawList.length){
          const carteiraForPme = pendingCarteira || window.CARTEIRA_MAP || null;
          if (!carteiraForPme){
            summaryHtml += `<div style="color:var(--red);font-size:12.5px;"><i class=ic-warn></i> Funil PME: sem Carteira carregada ainda (nem nesta importação, nem de uma anterior) — não dá pra descobrir o gestor de cada corretora. Suba a Carteira pelo menos uma vez antes.</div>`;
          } else if (!carteiraForPme.byCnpj || !Object.keys(carteiraForPme.byCnpj).length){
            // A Carteira guardada no painel pode ser de antes de o painel guardar o CNPJ — aí NENHUMA proposta
            // acha gestor e as pendências seriam trocadas por uma lista vazia (aconteceu no V2 em 09/10/2026).
            summaryHtml += `<div style="color:var(--red);font-size:12.5px;"><i class=ic-warn></i> <b>Funil PME não importado:</b> a Carteira guardada no painel é antiga e não tem o CNPJ das corretoras (é pelo CNPJ que o painel acha o gestor de cada proposta). Selecione também a Carteira (BANCO DE DADOS - COMERCIAL) no campo "Carteira / Gestores" desta mesma importação e clique em Processar de novo.</div>`;
          } else {
            const result = buildPmeFromRawFiles(planiumRawList, t6140bByControle, carteiraForPme);
            if (!Object.keys(result.pendData.data).length){
              // Nunca troca as pendências atuais por uma lista vazia.
              summaryHtml += `<div style="color:var(--red);font-size:12.5px;"><i class=ic-warn></i> <b>Funil PME não importado:</b> nenhuma proposta em aberto achou um executivo conhecido (${result.totalMerged} propostas lidas). Confira se a Carteira é a mais recente e se os arquivos são os extratos do Planium e do T6140B. As pendências atuais do painel foram mantidas.</div>`;
            } else {
            pendingPendPme = result.pendData;
            pendingPropostas = result.propostas;
            summaryHtml += diffPendPme(pendingPendPme);
            summaryHtml += diffPropostas(pendingPropostas);
            const corteBR = result.corte.split('-').reverse().join('/');
            summaryHtml += `<div style="font-size:12.5px; margin-top:6px; color:var(--blue);">Funil PME — ${result.totalArquivos} extrato(s) da Planium, ${result.totalBruto} linhas, ${result.duplicatasRemovidas} duplicada(s) removida(s) → <b>${result.totalMerged}</b> propostas.${result.finalizadasAntigas ? ` ${result.finalizadasAntigas} finalizada(s) com notificação antes de ${corteBR} não foram guardadas (o painel guarda as em aberto de qualquer data e as finalizadas dos últimos 3 meses).` : ''}${t6140bByControle ? ` T6140B: ${Object.keys(t6140bByControle).length} propostas.` : ' <b>T6140B não incluído</b> — DATA RECEBIMENTO/DITEC/CADASTRO/BITIX ficam em branco.'}</div>`;
            }
          }
        }
        if (pendNaoReconhecidos.length){
          summaryHtml += `<div style="color:var(--red);font-size:12.5px;"><i class=ic-warn></i> Funil PME: não reconheci ${pendNaoReconhecidos.join(', ')} — confira se é um extrato da Planium, do T6140B, ou a planilha PME AUTOMATIZADO já pronta.</div>`;
        }
      }
      if (pendPfFile){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Lendo Pendências PF...</p>';
        // CSV cru (T221ORCAM) ou planilha antiga — readPmeFileAsWorkbook já trata CSV com acento do Windows
        const wb = await readPmeFileAsWorkbook(pendPfFile);
        pendingPendPf = parsePfPendenciasWorkbook(wb, pendingCarteira || window.CARTEIRA_MAP || null);
        summaryHtml += diffPendPf(pendingPendPf);
      }
      if (assinaturaFile){
        statusEl.innerHTML = '<p style="font-size:12.5px;color:var(--muted);">Lendo Aguardando Assinatura...</p>';
        // CSV cru da Planium (vírgula) ou o relatório antigo em .xlsx — readPmeFileAsWorkbook lê os dois
        const wb = await readPmeFileAsWorkbook(assinaturaFile);
        pendingAssinatura = parseAssinaturaWorkbook(wb, pendingCarteira || window.CARTEIRA_MAP || null);
        summaryHtml += diffAssinatura(pendingAssinatura);
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
    // Retrato do dia pra aba Conversão (ontem → hoje). Ranking = vendas do mês por gestor com ADM ("Total" do BI), só
    // quando o extrato Corretoras veio nesta importação — senão o retrato repete o ranking do anterior.
    if ((pendingPropostas || pendingAssinatura || pendingCorretorasRaw) && window.saveDailySnapshot){
      let rankByRaw = null;
      if (pendingCorretorasRaw){
        rankByRaw = {};
        Object.keys(pendingCorretorasRaw.byGestor).forEach(f => {
          const raw = window.getGestorRawName ? window.getGestorRawName(f) : f;
          const b = pendingCorretorasRaw.byGestor[f];
          rankByRaw[raw] = (rankByRaw[raw]||0) + (b.total||0) + (b.adm||0);
        });
      }
      window.saveDailySnapshot(rankByRaw);
    }
    // T6140B inteiro: só quando o funil PME foi de fato importado junto. Fica na memória desta aba e é gravado no
    // Firestore (seção T6140B_EXTRATO) no próximo "Publicar" — fora da lista do login, só é lido no "Baixar .xlsx".
    if (pendingPendPme && pendingT6140bRaw){
      window.__T6140B_EXTRATO = Object.assign({ importadoEm: new Date().toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'}) }, pendingT6140bRaw);
      window.__T6140B_EXTRATO_PENDENTE = true;
    }
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
      // T6140B inteiro (pedido do Victor, 09/10/2026; V1 em 13/10) — só quando um T6140B novo foi importado nesta aba; seção
      // à parte, não lida no login. Falha aqui vira aviso: a aba T6140B da planilha só sai resumida, nada mais quebra.
      if (window.__T6140B_EXTRATO_PENDENTE && window.__T6140B_EXTRATO){
        try { await window.fsWriteSection('T6140B_EXTRATO', window.__T6140B_EXTRATO); window.__T6140B_EXTRATO_PENDENTE = false; }
        catch(e){ avisoMeta += ' <span style="color:var(--red); font-weight:600;">Atenção: o extrato completo do T6140B NÃO foi salvo (' + e.message + ') — a aba T6140B do "Baixar .xlsx" vai sair resumida pra quem baixar de outro computador.</span>'; }
      }
      status.innerHTML = '<span style="color:#1b7a63; font-weight:700;">Publicado! Quem já estiver com o painel aberto vê a atualização só no próximo login/recarregamento.</span>' + avisoMeta;
      // Registro de acessos (item 4, 26/10/2026): quem publicou e o quê.
      if (window.fsRegistrarAcesso) window.fsRegistrarAcesso('publicou', keys.length + ' seções' + (window.__T6140B_EXTRATO && !window.__T6140B_EXTRATO_PENDENTE ? ' + extrato T6140B' : ''));
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
    if (window.fsRegistrarAcesso) window.fsRegistrarAcesso('baixou', 'data.json (cópia local de todos os dados)'); // item 4
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
    // Sem ano no título da TRI GERAL: mesma regra do Excel NDI SP (window.inferYearForMonth), pelo 1º
    // mês do arquivo, aceitando até 2 meses à frente — o "1º TRI" de 2027 subido em Nov ou Dez/26 vira
    // 2027 (antes usava o ano do computador e gravava as metas por cima de Jan–Mar/2026); em Out/26 um
    // "1º TRI" sem ano continua sendo o de 2026.
    if (!year){
      const nums = wb.SheetNames.map(n => Number(MES_PT[norm(n)])).filter(Boolean);
      year = (nums.length && window.inferYearForMonth)
        ? String(window.inferYearForMonth(Math.min.apply(null, nums), 2))
        : String(new Date().getFullYear());
    }
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
  // (INT_CODE_SEED_EMB: dados agora so no Firestore, secao SEEDS_HIST - ver ETAPA 2 abaixo)
  // (INT_CODE_NAMES_EMB: dados agora so no Firestore, secao SEEDS_HIST - ver ETAPA 2 abaixo)
  // {código: [nome da corretora no BI, cidade(s) separadas por |]} — só Jan–Mai e só códigos cujo
  // dono na Carteira (14) é um dos 15 executivos; alimenta a lista de corretoras dos meses
  // reconstruídos (mês com fechamento oficial usa o nome do próprio fechamento).
  // (INT_CODE_INFO_EMB: dados agora so no Firestore, secao SEEDS_HIST - ver ETAPA 2 abaixo)
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
  // (META_EXEC_C_EMB: dados agora so no Firestore, secao SEEDS_HIST - ver ETAPA 2 abaixo)
  // ===== Dados históricos fora do código público — ETAPA 2 (22/10/2026, item 3 de segurança) =====
  // INT_CODE_SEED / INT_CODE_NAMES / INT_CODE_INFO / metas por executivo compactas (META_EXEC_C), jan–set/26, ficam só
  // no Firestore (seção SEEDS_HIST, lida no login e protegida pelas regras: só quem está na allowlist). Copiados pra lá
  // em 22/10/2026 17:22 pela cópia automática da etapa 1 (admin no celular) e conferidos idênticos à cópia que ficava aqui. Cópia de segurança
  // local: DASHBOARD CAUDA LONGA/BACKUPS/2026-10-22_seeds-etapa1-publicada/app.js. Se a seção faltar, a visão por trimestre e os
  // meses Jan–Mai reconstruídos ficam sem jan–set e a barra "Período" avisa — nada mais quebra.
  const SEEDS_HIST_FS = window.__DASH_DATA__.SEEDS_HIST || null;
  const SEEDS_HIST_OK = !!(SEEDS_HIST_FS && SEEDS_HIST_FS.INT_CODE_SEED && SEEDS_HIST_FS.META_EXEC_C);
  const SEEDS_HIST = SEEDS_HIST_OK ? SEEDS_HIST_FS : { INT_CODE_SEED:{}, INT_CODE_NAMES:{}, INT_CODE_INFO:{}, META_EXEC_C:{} };
  const INT_CODE_SEED = SEEDS_HIST.INT_CODE_SEED, INT_CODE_NAMES = SEEDS_HIST.INT_CODE_NAMES || {}, INT_CODE_INFO = SEEDS_HIST.INT_CODE_INFO || {};
  window.getSeedsHistOrigem = () => (SEEDS_HIST_OK ? 'firestore' : 'ausente');
  if (!SEEDS_HIST_OK){
    console.warn('SEEDS_HIST ausente no Firestore — histórico jan–set/26 indisponível.');
    const barra = document.getElementById('mjPeriodBar');
    if (barra){
      const aviso = document.createElement('div');
      aviso.style.cssText = 'font-size:11.5px; color:var(--accent-red); font-weight:600; margin-left:auto;';
      aviso.textContent = 'Histórico jan–set/26 não carregou (seção SEEDS_HIST do Firestore). Fale com o administrador.';
      barra.appendChild(aviso);
    }
  }
  const META_EXEC_SEED = (function(){
    const c = SEEDS_HIST.META_EXEC_C;
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
    // Só mexe nos painéis da visão mensal quando o trimestre está LIGADO (esconde) ou acabou de ser DESLIGADO
    // (restaura e pede um re-render, que reaplica o que a tela mensal esconde por conta própria — ex.: o painel de
    // Corretoras no agregado "Todos os Times"). Antes isto forçava display='' em tudo a cada render e reabria
    // painéis que o render tinha escondido (06/10/2026: tabela de Corretoras vazia em Todos os Times).
    if (tri){
      [...view.children].forEach(el => { if (keep.indexOf(el) < 0) el.style.display = 'none'; });
      const stats = $('mjBannerStats'); if (stats) stats.style.display = 'none';
      triHidden = true;
    } else if (triHidden){
      triHidden = false;
      [...view.children].forEach(el => { if (keep.indexOf(el) < 0) el.style.display = ''; });
      const stats = $('mjBannerStats'); if (stats) stats.style.display = '';
      if (window.mjRerender) window.mjRerender();
    }
    $('mjTriPanel').style.display = tri ? '' : 'none';
    if (tri) renderTri();
  }
  let triHidden = false;

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
  renderSeniorChips();   // chips do cabeçalho já na 1ª carga (antes só apareciam depois de algum clique/render)
  renderBar();
  apply();
})();


/* =========================================================
   REGISTRO DE ACESSOS — tela (item 4 da revisão de segurança, 26/10/2026; demonstrativo aprovado pelo Victor:
   manter animações, interatividade, responsividade e cores). Abre pelo botão de ações, item "Registro de acessos",
   que só aparece pra quem tem verAcessos:true no cadastro (hoje só o Victor). Lê os eventos gravados por
   window.fsRegistrarAcesso (index.html) e o cadastro (pra mostrar quem nunca entrou). As Regras do Firestore
   garantem no servidor que mais ninguém lê. Ao abrir, apaga o que passou de 1 ano (window.fsLimparAcessosAntigos).
   ========================================================= */
(function(){
  const btnAbrir = document.getElementById('btnOpenAcessos');
  if (!btnAbrir || !window.__verAcessos__ || !window.fsLerAcessos) return;
  btnAbrir.hidden = false;

  const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC_MAP[c]);
  const DIA = 864e5;
  const ACOES = { entrou:'Entrou no painel', publicou:'Publicou dados', baixou:'Baixou arquivo', sessao_venceu:'Sessão venceu' };
  const nomeDe = (email, cad) => {
    if (cad && cad.nome) return String(cad.nome).trim().split(/\s+/)[0];
    const base = String(email || '').split('@')[0].replace(/^t_/, '').split('.')[0];
    return /^[a-z]{2,}$/i.test(base) ? base.charAt(0).toUpperCase() + base.slice(1).toLowerCase() : String(email || '').split('@')[0];
  };
  const hhmm = d => d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  const inicioDoDia = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const rotuloDia = d => {
    const hoje = inicioDoDia(new Date()), dd = inicioDoDia(d), n = Math.round((hoje - dd) / DIA);
    const data = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
    return n === 0 ? 'Hoje · ' + data : n === 1 ? 'Ontem · ' + data : d.toLocaleDateString('pt-BR', { weekday:'long' }) + ' · ' + data;
  };

  // Monta o modal uma vez.
  const ov = document.createElement('div');
  ov.className = 'acs-overlay'; ov.hidden = true;
  ov.innerHTML = `
    <section class="acs-modal" role="dialog" aria-modal="true" aria-labelledby="acsTitulo">
      <div class="acs-head">
        <div><h2 id="acsTitulo">Registro de acessos</h2><div class="acs-sub">Visível só para você</div></div>
        <button class="acs-x" type="button" id="acsFechar" aria-label="Fechar">✕</button>
      </div>
      <div class="acs-bar">
        <div class="acs-seg" role="group" aria-label="Período">
          <button type="button" data-p="hoje" aria-pressed="false">Hoje</button>
          <button type="button" data-p="7" aria-pressed="true">7 dias</button>
          <button type="button" data-p="30" aria-pressed="false">30 dias</button>
          <button type="button" data-p="365" aria-pressed="false">1 ano</button>
        </div>
        <select id="acsPessoa" aria-label="Pessoa"><option value="">Todas as pessoas</option></select>
        <select id="acsAcao" aria-label="Ação"><option value="">Todas as ações</option>${Object.keys(ACOES).map(k => `<option value="${k}">${ACOES[k]}</option>`).join('')}</select>
        <button class="acs-btn" type="button" id="acsExcel">Baixar registro (Excel)</button>
      </div>
      <div class="acs-body" id="acsCorpo"><div class="acs-vazio">Carregando o registro...</div></div>
    </section>`;
  document.body.appendChild(ov);

  const st = { periodo:'7', pessoa:'', acao:'', eventos:[], cadastro:[], carregadoDesde:null, ultimosFiltrados:[], cadPor:{} };
  const corpo = ov.querySelector('#acsCorpo');
  const selPessoa = ov.querySelector('#acsPessoa'), selAcao = ov.querySelector('#acsAcao');

  function desdeMs(){
    if (st.periodo === 'hoje') return inicioDoDia(new Date()).getTime();
    return inicioDoDia(new Date(Date.now() - (Number(st.periodo) - 1) * DIA)).getTime();
  }

  async function carregar(forcar){
    const desde = desdeMs();
    // Já tem eventos de um período maior carregado? Só filtra; senão busca de novo.
    if (forcar || st.carregadoDesde == null || desde < st.carregadoDesde){
      corpo.innerHTML = '<div class="acs-vazio">Carregando o registro...</div>';
      try {
        const [ev, cad] = await Promise.all([window.fsLerAcessos(desde), window.fsListarCadastro()]);
        st.eventos = ev; st.cadastro = cad; st.carregadoDesde = desde;
      } catch(e){
        corpo.innerHTML = `<div class="acs-vazio">Não consegui ler o registro (${esc(e && e.message)}). Confira se o seu cadastro tem verAcessos = true e se as Regras novas foram publicadas.</div>`;
        return;
      }
    }
    preencherPessoas();
    render();
  }

  function preencherPessoas(){
    const cadPor = {}; st.cadastro.forEach(c => { cadPor[c.email] = c; });
    const emails = new Set(st.cadastro.map(c => c.email));
    st.eventos.forEach(e => emails.add(e.email));
    const ops = [...emails].sort((a,b) => nomeDe(a, cadPor[a]).localeCompare(nomeDe(b, cadPor[b])));
    selPessoa.innerHTML = '<option value="">Todas as pessoas</option>' + ops.map(e => `<option value="${esc(e)}"${e === st.pessoa ? ' selected' : ''}>${esc(nomeDe(e, cadPor[e]))} · ${esc(e.split('@')[0])}</option>`).join('');
  }

  function contaAte(el, alvo){
    if (!el) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){ el.textContent = alvo.toLocaleString('pt-BR'); return; }
    const t0 = performance.now(), dur = 600;
    const passo = t => { const p = Math.min(1, (t - t0) / dur), v = Math.round(alvo * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString('pt-BR'); if (p < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
    // Garantia: com a aba em segundo plano o navegador pausa a animação — o número final aparece de qualquer jeito.
    setTimeout(() => { el.textContent = alvo.toLocaleString('pt-BR'); }, dur + 150);
  }

  function render(){
    const desde = desdeMs();
    const cadPor = {}; st.cadastro.forEach(c => { cadPor[c.email] = c; });
    const noPeriodo = st.eventos.filter(e => e.quando && e.quando.getTime() >= desde);
    const filtrados = noPeriodo.filter(e => (!st.pessoa || e.email === st.pessoa) && (!st.acao || e.acao === st.acao));
    const daPessoa = noPeriodo.filter(e => !st.pessoa || e.email === st.pessoa);

    // Resumo
    const entraram = new Set(noPeriodo.filter(e => e.acao === 'entrou').map(e => e.email));
    const nCad = st.cadastro.length;
    const semEntrar = st.cadastro.filter(c => !entraram.has(c.email)).length;
    const nEntradas = daPessoa.filter(e => e.acao === 'entrou').length;
    const pubs = daPessoa.filter(e => e.acao === 'publicou');
    const quemPub = [...new Set(pubs.map(e => nomeDe(e.email, cadPor[e.email])))];
    const nBaixou = daPessoa.filter(e => e.acao === 'baixou').length;
    const diasPeriodo = st.periodo === 'hoje' ? 1 : Number(st.periodo);

    // Por pessoa (todo o cadastro + quem aparece no registro sem cadastro)
    const emails = new Set(st.cadastro.map(c => c.email)); st.eventos.forEach(e => emails.add(e.email));
    const ultimoGeral = {};
    st.eventos.forEach(e => { if (e.acao === 'entrou' && e.quando && (!ultimoGeral[e.email] || e.quando > ultimoGeral[e.email])) ultimoGeral[e.email] = e.quando; });
    const linhas = [...emails].map(email => {
      const evs = noPeriodo.filter(e => e.email === email);
      const aps = {}; evs.forEach(e => { aps[e.aparelho] = (aps[e.aparelho] || 0) + 1; });
      const ap = Object.entries(aps).sort((a,b) => b[1] - a[1])[0];
      return { email, cad: cadPor[email], ultimo: ultimoGeral[email] || null, entradas: evs.filter(e => e.acao === 'entrou').length,
               baixou: evs.filter(e => e.acao === 'baixou').length, aparelho: ap ? ap[0] : '—' };
    }).sort((a,b) => (b.ultimo ? b.ultimo.getTime() : -1) - (a.ultimo ? a.ultimo.getTime() : -1));

    const pill = d => {
      if (!d) return '<span class="acs-pill acs-bad">Sem entrada no período carregado</span>';
      const n = Math.round((inicioDoDia(new Date()) - inicioDoDia(d)) / DIA);
      if (n === 0) return `<span class="acs-pill acs-ok">Hoje, ${hhmm(d)}</span>`;
      if (n === 1) return `<span class="acs-pill acs-ok">Ontem, ${hhmm(d)}</span>`;
      return `<span class="acs-pill ${n <= 7 ? 'acs-warn' : 'acs-bad'}">Há ${n} dias</span>`;
    };
    const papel = c => !c ? 'sem cadastro' : (c.role === 'admin' ? 'admin' : 'executivo') + (c.eligTeam ? ' · ' + c.eligTeam : '');

    // Linha do tempo agrupada por dia (até 300 eventos na tela; o Excel leva todos)
    let feed = '', diaAtual = '';
    filtrados.slice(0, 300).forEach((e, i) => {
      const r = rotuloDia(e.quando);
      if (r !== diaAtual){ feed += `<div class="acs-day">${esc(r)}</div>`; diaAtual = r; }
      const nome = esc(nomeDe(e.email, cadPor[e.email]));
      const txt = e.acao === 'entrou' ? `<b>${nome}</b> entrou no painel`
        : e.acao === 'publicou' ? `<b>${nome}</b> publicou dados${e.detalhe ? ' · ' + esc(e.detalhe) : ''}`
        : e.acao === 'baixou' ? `<b>${nome}</b> baixou ${esc(e.detalhe || 'um arquivo')}`
        : e.acao === 'sessao_venceu' ? `<b>${nome}</b> saiu: sessão de ${esc(e.detalhe || '7 dias')} venceu`
        : `<b>${nome}</b> ${esc(e.acao)}`;
      const cls = /^[a-z_]+$/.test(e.acao) ? e.acao : 'outro';
      feed += `<div class="acs-ev" style="animation-delay:${Math.min(i, 12) * 25}ms"><span class="t">${hhmm(e.quando)}</span><span class="acs-dot acs-d-${cls}" aria-hidden="true"></span><span class="txt">${txt}</span><span class="acs-dev">${esc(e.aparelho || '')}</span></div>`;
    });
    if (!feed) feed = '<div class="acs-vazio">Nenhum evento nesse período com esses filtros.</div>';
    if (filtrados.length > 300) feed += `<div class="acs-vazio">Mostrando os 300 mais recentes de ${filtrados.length.toLocaleString('pt-BR')}. O Excel leva todos.</div>`;

    corpo.innerHTML = `
      <div class="acs-kpis">
        <div class="acs-kpi"><div class="l">Pessoas que entraram</div><div class="v"><span id="acsK1">0</span> <small>de ${nCad}</small></div><div class="d">${semEntrar ? semEntrar + ' cadastrado(s) sem entrar' : 'todo o cadastro entrou'}</div></div>
        <div class="acs-kpi"><div class="l">Entradas</div><div class="v" id="acsK2">0</div><div class="d">média de ${(nEntradas / diasPeriodo).toLocaleString('pt-BR', { maximumFractionDigits:1 })} por dia</div></div>
        <div class="acs-kpi"><div class="l">Publicações</div><div class="v" id="acsK3">0</div><div class="d">${pubs.length ? 'por ' + esc(quemPub.join(', ')) : 'nenhuma no período'}</div></div>
        <div class="acs-kpi"><div class="l">Arquivos baixados</div><div class="v" id="acsK4">0</div><div class="d">funil, relatórios e cópias</div></div>
      </div>
      <div class="acs-cols">
        <div>
          <h3 class="acs-h3">Por pessoa <span>clique numa linha pra filtrar</span></h3>
          <div class="acs-tbl"><table>
            <thead><tr><th>Pessoa</th><th>Último acesso</th><th class="n">Entradas</th><th class="n">Baixou</th><th>Aparelho</th></tr></thead>
            <tbody>${linhas.map(l => `<tr tabindex="0" data-email="${esc(l.email)}"${l.email === st.pessoa ? ' class="sel"' : ''}>
              <td class="acs-who">${esc(nomeDe(l.email, l.cad))} <small>${esc(l.email.split('@')[0])} · ${esc(papel(l.cad))}</small></td>
              <td>${pill(l.ultimo)}</td><td class="n">${l.entradas}</td><td class="n">${l.baixou}</td><td class="acs-dev">${esc(l.aparelho)}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div>
          <h3 class="acs-h3">Linha do tempo <span>mais recente primeiro</span></h3>
          <div class="acs-feed">${feed}</div>
        </div>
      </div>
      <div class="acs-rodape">
        <div><b>O que é registrado:</b> quem entrou, quando, navegador e sistema do aparelho; quem publicou; quem baixou qual arquivo.</div>
        <div><b>O que não é:</b> endereço IP e localização. Tentativas de quem não tem cadastro aparecem só no Firebase, em Authentication → Users.</div>
        <div>Cada pessoa só consegue criar o próprio registro; ninguém edita nem apaga pelo painel. Guardado por ${window.__ACESSOS_DIAS_GUARDA__ || 365} dias.</div>
      </div>`;
    contaAte(corpo.querySelector('#acsK1'), entraram.size);
    contaAte(corpo.querySelector('#acsK2'), nEntradas);
    contaAte(corpo.querySelector('#acsK3'), pubs.length);
    contaAte(corpo.querySelector('#acsK4'), nBaixou);
    st.ultimosFiltrados = filtrados; st.cadPor = cadPor;
  }

  function abrir(){
    ov.hidden = false;
    document.body.style.overflow = 'hidden';
    ov.querySelector('#acsFechar').focus();
    carregar(true);
    if (window.fsLimparAcessosAntigos) window.fsLimparAcessosAntigos().catch(e => console.warn('Limpeza do registro:', e && e.message));
  }
  function fechar(){ ov.hidden = true; document.body.style.overflow = ''; }

  btnAbrir.addEventListener('click', abrir);
  ov.querySelector('#acsFechar').addEventListener('click', fechar);
  ov.addEventListener('click', e => { if (e.target === ov) fechar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.hidden) fechar(); });
  ov.querySelectorAll('.acs-seg button').forEach(b => b.addEventListener('click', () => {
    st.periodo = b.dataset.p;
    ov.querySelectorAll('.acs-seg button').forEach(o => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
    carregar(false);
  }));
  selPessoa.addEventListener('change', () => { st.pessoa = selPessoa.value; render(); });
  selAcao.addEventListener('change', () => { st.acao = selAcao.value; render(); });
  corpo.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-email]'); if (!tr) return;
    st.pessoa = st.pessoa === tr.dataset.email ? '' : tr.dataset.email;
    selPessoa.value = st.pessoa; render();
  });
  corpo.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-email]')){ e.preventDefault(); e.target.click(); }
  });
  ov.querySelector('#acsExcel').addEventListener('click', () => {
    const linhas = st.ultimosFiltrados.map(e => ({
      'Data': e.quando ? e.quando.toLocaleDateString('pt-BR') : '', 'Hora': e.quando ? e.quando.toLocaleTimeString('pt-BR') : '',
      'Pessoa': nomeDe(e.email, st.cadPor[e.email]), 'E-mail': e.email, 'Ação': ACOES[e.acao] || e.acao,
      'Detalhe': e.detalhe || '', 'Aparelho': e.aparelho || '' }));
    const ws = XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ 'Data':'', 'Hora':'', 'Pessoa':'', 'E-mail':'', 'Ação':'', 'Detalhe':'', 'Aparelho':'' }]);
    ws['!cols'] = [{wch:11},{wch:9},{wch:14},{wch:34},{wch:18},{wch:48},{wch:20}];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Acessos');
    const nome = 'Registro de acessos - ' + new Date().toLocaleDateString('pt-BR').replace(/\//g, '.') + '.xlsx';
    XLSX.writeFile(wb, nome);
    if (window.fsRegistrarAcesso) window.fsRegistrarAcesso('baixou', nome);
  });
})();
