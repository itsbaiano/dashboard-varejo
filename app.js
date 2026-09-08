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

// ===== extraído de index.html linhas 1520-1541 =====
    (function(){
      // Achado 2026-09-08 testando ao vivo (no V2, mesmo código): no fluxo de login real
      // (onAuthStateChanged pode disparar mais de uma vez pro mesmo usuário — comportamento
      // normal do Firebase), esse bloco corria mais de uma vez, colocando dois listeners de
      // clique no mesmo botão — cada clique alternava o estado duas vezes seguidas (uma
      // desfazendo a outra), então clicar parecia não fazer nada. Essa trava faz o bloco só
      // ter efeito uma vez, não importa quantas vezes seja executado.
      if (window.__dhTeamToggleInit__) return;
      window.__dhTeamToggleInit__ = true;

      var toggle = document.getElementById('dhTeamToggle');
      var list = document.getElementById('dhTeamList');
      toggle.addEventListener('click', function(){
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        list.classList.toggle('open', !open);
      });

      // "Atualizado há Xs" — igual ao original que você mandou: conta a partir do momento
      // que a página abriu (não do publishedAt real), pra ficar idêntico ao que foi pedido.
      var updatedText = document.getElementById('dhUpdatedText');
      var seconds = 0;
      updatedText.textContent = 'Atualizado agora';
      setInterval(function(){
        seconds += 1;
        if (seconds < 60) updatedText.textContent = 'Atualizado há ' + seconds + 's';
        else updatedText.textContent = 'Atualizado há ' + Math.floor(seconds/60) + ' min';
      }, 1000);
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
// Some o botão da Elegibilidade da barra lateral pra quem está em NO_ELEG_EMAILS (evento
// disparado pelo auth <script> lá em cima, no login) — showView('el') já bloqueia por trás
// mesmo se o botão aparecer por algum motivo (defesa dupla). Pedido do Victor, 2026-09-08.
document.addEventListener('authReady', (e) => {
  if (e.detail && e.detail.noEleg) document.getElementById('navBtnEl').style.display = 'none';
});
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
  let currentTeam = "Estevão Cardoso (Cauda Longa)";

  const fmt0 = n => Math.round(n).toLocaleString('pt-BR');
  const pctf = n => (n*100).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
  const pctColor = p => p >= 1 ? 'var(--green)' : (p >= 0.7 ? 'var(--amber)' : 'var(--red)');
  const pctBg = p => p >= 1 ? 'rgba(22,184,122,.14)' : (p >= 0.7 ? 'rgba(255,184,28,.16)' : 'rgba(245,54,74,.12)');
  const catLabels = {IND:'Individual', SS:'Super Simples', PME:'PME', ADM:'Administradora'};
  const catKeys = Object.keys(catLabels);
  const iniciais = nome => nome.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
  let mjCharts = {};
  let mjCorretorasGestor = null;
  let mjSelectedGestor = null;
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
  const mjCatIconByKey = {IND:'ic-user', SS:'ic-users', PME:'ic-building'};
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
    else if (currentTeam.indexOf('Cauda Longa') < 0){ resetBtn.style.display = 'inline-flex'; resetBtn.textContent = '↺ Voltar para Cauda Longa'; }
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
    const kpis = [
      {icon:"<i class=ic-target></i>", label: selectedMember ? "Meta do Gestor" : (isAllTeamsAggregate ? "Meta Total — NDI SP" : "Meta Total do Time"), value: fmt0(total.meta) + " vidas", sub: monthLabelPt(currentMonth), subClass:""},
      {icon:"<i class=ic-check></i>", label:"Integrado (Realizado)", value: fmt0(displayInt) + " vidas", sub: naoAtribuidoTotal > 0 ? `Inclui ${fmt0(naoAtribuidoTotal)} vidas sem gestor/código não localizado` : (displayInt >= total.meta ? "Meta batida" : "Abaixo da meta"), subClass: displayInt >= total.meta ? "pos" : "warn"},
      {icon:"<i class=ic-chart></i>", label:"% Atingimento", value: pctf(pctTotalAdj), sub: pctTotalAdj >= 1 ? "Acima de 100%" : "Faltam " + pctf(1-pctTotalAdj) + " p/ meta", subClass: pctTotalAdj >= 1 ? "pos" : "neg"},
      {icon:"<i class=ic-warn></i>", label:"Gap p/ Meta", value: (gap>0?fmt0(gap):"0") + " vidas", sub:`Categoria crítica: ${catLabels[critKey]} (${pctf(critPct)})`, subClass:"neg"},
    ];
    document.getElementById('mjKpiRow').innerHTML = kpis.map(k => `
      <div class="kpi"><div class="kpi-icon">${k.icon}</div><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="sub ${k.subClass}">${k.sub}</div></div>
    `).join('');

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
        return `<div class="gestor-card" style="cursor:pointer" onclick="window.jumpToMetaJunho('${r.name.replace(/'/g,"\\'")}')" title="Ver detalhe deste time">
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
          return `<div class="mj-team-row" onclick="window.jumpToMetaJunho('${r.name.replace(/'/g,"\\'")}', '${m.nome.replace(/'/g,"\\'")}')" title="Ver detalhe deste gestor">
            <div class="mj-tr-avatar" style="background:${m.cor}">${iniciais(m.nome)}</div>
            <div class="mj-tr-name">${m.nome}</div>
            <div class="mj-tr-bar"><div class="mj-tr-bar-fill" style="width:${Math.min(pm*100,100)}%; background:${pctColor(pm)}"></div></div>
            <div class="mj-tr-pct" style="color:${pctColor(pm)}">${pctf(pm)}</div>
            <div class="mj-tr-vidas">${fmt0(m.total.int)} vidas</div>
          </div>`;
        }).join('');
        return `<div class="mj-team-expand ${isOpen?'open':''}">
          <div class="mj-team-expand-head" style="border-left-color:${cor}" onclick="window.__mjToggleTeamExpand('${r.name.replace(/'/g,"\\'")}')">
            <div class="mj-team-expand-title" style="color:${cor}"><span class="chev">${isOpen?'▾':'▸'}</span>${r.name} — ${pctf(p)}</div>
            <div class="mj-team-expand-sub">${fmt0(r.int)} / ${fmt0(r.meta)} vidas</div>
          </div>
          ${isOpen ? `<div class="mj-team-expand-body">${rowsHtml}</div>` : ''}
        </div>`;
      }).join('');
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
      return `<div class="gestor-card" style="cursor:pointer" onclick="window.showPendenciasModal('${m.nome.replace(/'/g,"\\'")}')" title="Ver pendências PME/PF">
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
  }

  document.getElementById('mjResetTeam').addEventListener('click', () => {
    if (mjSelectedGestor){
      mjSelectedGestor = null;
    } else {
      currentTeam = "Estevão Cardoso (Cauda Longa)";
      if (!MJ_TEAMS[currentTeam]) currentTeam = Object.keys(MJ_TEAMS)[0];
    }
    renderMetaJunho();
  });
  document.getElementById('mjBackToOverview').addEventListener('click', () => showView('overview'));

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
    // Só mês atual + anterior aparecem na lista — o histórico mais antigo continua
    // guardado nos dados (MJ_TEAMS_BY_MONTH), só não polui esse seletor.
    const months = Object.keys(MJ_TEAMS_BY_MONTH).sort().slice(-2);
    sel.innerHTML = months.map(m => {
      const [y, mm] = m.split('-');
      const label = (MJ_MONTH_LABELS_PT[mm] || mm) + ' ' + y;
      return `<option value="${m}" style="color:#0A1A3A; background:#fff;">${label}</option>`;
    }).join('');
    sel.value = currentMonth;
  }
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
  window.updateMetaJunhoData = function(newData){
    // Grava sempre no mês que a planilha realmente representa (detectedMonth),
    // não sempre em "currentMonth" — senão um arquivo de mês passado sobrescreveria
    // silenciosamente o mês atual. Só vira o "estado ao vivo" (currentMonth, benchmark)
    // se for o mês mais recente já conhecido — mas corretoras/não-atribuído são
    // gravados por mês sempre, igual MJ_TEAMS_BY_MONTH, pra não vazar o valor de um mês
    // pro outro (achado por Victor em 2026-09-02: corretoras ainda não seguia essa
    // regra, então trocar o "Mês de Referência" nunca mudava essa tabela).
    const targetMonth = newData.detectedMonth || currentMonth;
    const latest = Object.keys(MJ_TEAMS_BY_MONTH).sort().pop();
    const isLive = !latest || targetMonth >= latest;
    MJ_TEAMS_BY_MONTH[targetMonth] = newData.teams;
    if (newData.naoAtribuido) MJ_NAO_ATRIBUIDO_BY_MONTH[targetMonth] = newData.naoAtribuido;
    if (newData.corretoras) MJ_CORRETORAS_BY_MONTH[targetMonth] = newData.corretoras;
    if (isLive){
      currentMonth = targetMonth;
      MJ_BENCHMARK = newData.benchmark;
    }
    if (targetMonth === currentMonth) MJ_TEAMS = MJ_TEAMS_BY_MONTH[currentMonth];
    if (!MJ_TEAMS[currentTeam]) currentTeam = Object.keys(MJ_TEAMS)[0];
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
    mjSelectedGestor = null;
    if (!MJ_TEAMS[currentTeam]) currentTeam = Object.keys(MJ_TEAMS)[0];
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
  window.getLatestKnownMonth = function(){ return Object.keys(MJ_TEAMS_BY_MONTH).sort().pop(); };
  window.getPendenciasData = function(){ return {pme: PENDENCIAS_PME, pf: PENDENCIAS_PF, assinatura: PENDENCIAS_ASSINATURA}; };
  window.getPublishableState = function(){
    return {
      MJ_TEAMS_BY_MONTH: MJ_TEAMS_BY_MONTH,
      currentMonth: currentMonth,
      PENDENCIAS_PME: PENDENCIAS_PME,
      PENDENCIAS_PF: PENDENCIAS_PF,
      PENDENCIAS_ASSINATURA: PENDENCIAS_ASSINATURA,
      MJ_CORRETORAS_BY_MONTH: MJ_CORRETORAS_BY_MONTH,
      MJ_NAO_ATRIBUIDO_BY_MONTH: MJ_NAO_ATRIBUIDO_BY_MONTH,
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
  function pendenciasDoGestor(dict, gestorNome, idField){
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

    const statusesOf = p => {
      if (Array.isArray(p.status)) return p.status;
      if (p.status && typeof p.status === 'object') return Object.values(p.status).filter(v=>v && v !== '0');
      return p.status ? [p.status] : [];
    };
    const statuses = [...new Set(list.flatMap(statusesOf))].sort();
    pendSelectedStatuses.forEach(s => { if (!statuses.includes(s)) pendSelectedStatuses.delete(s); });
    const chipsWrap = document.getElementById('pendStatusChips');
    chipsWrap.innerHTML = statuses.map(s => `<span class="status-chip${pendSelectedStatuses.has(s)?' active':''}" data-status="${s}">${s}</span>`).join('');
    chipsWrap.querySelectorAll('.status-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const s = chip.dataset.status;
        if (pendSelectedStatuses.has(s)) pendSelectedStatuses.delete(s); else pendSelectedStatuses.add(s);
        renderPendencias();
      });
    });
    document.getElementById('pendStatusClear').style.display = pendSelectedStatuses.size ? '' : 'none';

    // Busca por número — texto livre, casa parcialmente (contém), ignora espaços nas pontas.
    // Proposta (PME) e Orçamento (PF) são campos diferentes, mas o mesmo campo de busca serve
    // pros dois: cada aba já sabe qual número procurar (dataVigencia/dataStatus segue o mesmo padrão).
    const searchRaw = document.getElementById('pendPropostaSearch').value.trim().toLowerCase();

    const pmeFiltered = pme.filter(p => (!activeMonth || pendMonthOf(p.dataVigencia) === activeMonth) && (!activeCorretora || p.corretora === activeCorretora) && (pendActiveTab !== 'pme' || pendSelectedStatuses.size === 0 || statusesOf(p).some(s=>pendSelectedStatuses.has(s))) && (!searchRaw || String(p.proposta||'').toLowerCase().indexOf(searchRaw) >= 0))
      .sort((a,b) => pendSortDir * ((a.beneficiarios||0) - (b.beneficiarios||0)));
    const pfFiltered = pf.filter(p => (!activeMonth || pendMonthOf(p.dataStatus) === activeMonth) && (!activeCorretora || p.corretora === activeCorretora) && (pendActiveTab !== 'pf' || pendSelectedStatuses.size === 0 || statusesOf(p).some(s=>pendSelectedStatuses.has(s))) && (!searchRaw || String(p.orcamento||'').toLowerCase().indexOf(searchRaw) >= 0))
      .sort((a,b) => pendSortDir * ((a.vidas||0) - (b.vidas||0)));
    pendLastPmeFiltered = pmeFiltered;
    pendLastPfFiltered = pfFiltered;
    document.getElementById('pendPdfBtn').disabled = pendActiveTab === 'pme' ? !pmeFiltered.length : !pfFiltered.length;
    document.getElementById('pendPdfBtn').style.opacity = document.getElementById('pendPdfBtn').disabled ? '.5' : '';
    document.getElementById('pendPdfBtn').style.cursor = document.getElementById('pendPdfBtn').disabled ? 'default' : 'pointer';

    document.getElementById('pendCountPme').textContent = pmeFiltered.reduce((s,p)=>s+(p.beneficiarios||0),0);
    document.getElementById('pendCountPf').textContent = pfFiltered.reduce((s,p)=>s+(p.vidas||0),0);
    const beneficiariosTotal = pendActiveTab === 'pme'
      ? pmeFiltered.reduce((s,p)=>s+(p.beneficiarios||0),0)
      : pfFiltered.reduce((s,p)=>s+(p.vidas||0),0);
    document.getElementById('pendBeneficiariosTotal').textContent = `Total de beneficiários (filtro atual): ${beneficiariosTotal}`;
    document.getElementById('pendPmeBody').innerHTML = pmeFiltered.length ? pmeFiltered.map(p => `
      <tr><td>${p.proposta}</td><td class="name">${p.corretora}</td><td>
        ${p.status.planium ? `<span class="tag ${p.status.planium==='pendencia'?'react':'noelig'}">${p.status.planium}</span>` : ''}
        <div style="font-size:10.5px; color:var(--muted); margin-top:4px; line-height:1.6;">${['cadastro','ditec','bitix'].filter(k=>p.status[k] && p.status[k]!=='0').map(k=>`${k.charAt(0).toUpperCase()+k.slice(1)}: <b>${p.status[k]}</b>`).join(' · ')}</div>
      </td><td class="num">${p.beneficiarios}</td><td>${p.dataReceb}</td><td>${p.dataVigencia}</td></tr>
    `).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px;">Nenhuma pendência PME/SS para este filtro.</td></tr>`;
    document.getElementById('pendPfBody').innerHTML = pfFiltered.length ? pfFiltered.map(p => `
      <tr><td>${p.orcamento}</td><td class="name">${p.corretora}</td><td><span class="tag react">${p.status}</span></td><td class="num">${p.vidas}</td><td>${p.dataStatus}</td></tr>
    `).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px;">Nenhuma pendência PF para este filtro.</td></tr>`;
  }

  window.showPendenciasModal = function(gestorNome){
    // Aceita tanto o nome "bonito" (ex.: "Pablo Amora", como vem do Desempenho Comercial)
    // quanto o nome cru da planilha (ex.: "PABLO SERGIO RIBEIRO AMORA", como a aba Conversão
    // usa, vindo do PLANIUM) — quem normaliza/junta as duas variantes é pendenciasDoGestor(),
    // chamada dentro de renderPendencias(), então aqui só guarda o que veio mesmo.
    pendCurrentGestor = gestorNome;
    pendActiveTab = 'pme';
    document.getElementById('pendModalGestor').textContent = gestorNome;
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
    const stsFiltroTxt = pendSelectedStatuses.size ? [...pendSelectedStatuses].join(', ') : 'Todos os status';

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
    th.addEventListener('click', () => {
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

  function renderResumoPme(gestores){
    document.getElementById('resumoCards').innerHTML = gestores.map(g => {
      const s = resumoPmeStats(g);
      return `<div class="resumo-card" style="cursor:pointer" onclick="window.__openResumoDetail('${g.replace(/'/g,"\\'")}','pme')" title="Ver detalhes de ${g}">
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
      return `<tr style="cursor:pointer" onclick="window.__openResumoDetail('${g.replace(/'/g,"\\'")}','pf')" title="Ver detalhes de ${g}"><td class="name">${g}</td>${porStatus.map(v=>`<td class="num">${v||''}</td>`).join('')}<td class="num" style="font-weight:700;">${total}</td></tr>`;
    }).join('');
    document.getElementById('resumoPfTable').innerHTML = thead + '<tbody>' + tbody + '</tbody>';
  }

  function renderResumo(){
    const gestores = resumoGestoresFiltrados();
    if (resumoActiveTab === 'pme') renderResumoPme(gestores); else renderResumoPf(gestores);
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
      return { periodTotal, meta, el, rk, factor };
    }
    const periodTotal = selectedMonths.reduce((s,i)=>s+(d.m[i]||0), 0);
    const rk = computeRankingFromVolume(periodTotal, selectedMonths);
    const prevMonths = getPrevEquivalentMonths(selectedMonths);
    const prevTotal = prevMonths ? prevMonths.reduce((s,i)=>s+(d.m[i]||0), 0) : 0;
    // Régua depende da era do período avaliado: 3TRI26+ usa ×0,80; anteriores ×1,10
    const factor = isNewEra(selectedMonths) ? 0.80 : 1.10;
    const meta = prevMonths ? prevTotal * factor : 0;
    const el = (meta > 0 && periodTotal >= meta) ? 1 : 0;
    return { periodTotal, meta, el, rk, factor };
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
  let RANKDATA = window.__DASH_DATA__.RANKDATA;
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
  window.GESTOR_EQUIPE = GESTOR_EQUIPE;

  const fmt0 = n => Math.round(n).toLocaleString('pt-BR');
  const RANK_ORDER = ["Bronze 1","Bronze 2","Bronze 3","Bronze 4","Bronze 5","Bronze 6","Não Classificado"];
  const EL_GESTORES = [...new Set(DATA.map(d=>d.g))].sort();
  const RANKS_PRESENT = RANK_ORDER.filter(r => DATA.some(d=>d.rk===r));

  const selGestor = document.getElementById('fGestor');
  EL_GESTORES.forEach(g => { const o=document.createElement('option'); o.value=g; o.textContent=g; selGestor.appendChild(o); });
  function syncGestorLocalOptions(){ /* filtro local removido - unificado no filtro principal */ }
  const selRank = document.getElementById('fRank');
  RANKS_PRESENT.forEach(r => { const o=document.createElement('option'); o.value=r; o.textContent=r; selRank.appendChild(o); });

  let sortKey = 'tot', sortDir = -1, page = 1, perPage = 50;
  // Clique num dos 4 cards executivos (Elegíveis/Quase/Em Risco/Não Elegíveis) filtra a aba
  // inteira pra essa fatia — igual clicar numa barra do gráfico "Elegibilidade por Gestor" já
  // fazia. Clicar de novo no mesmo card limpa o filtro (toggle). null = nenhum filtro de KPI ativo.
  let activeKpiFilter = null; // null | 'eleg' | 'quase' | 'risco' | 'distantes'
  function isReactivation(d){ return d.u3 === 0 && d.tot >= 20; }

  function applyFilters(){
    const g = selGestor.value, el = document.getElementById('fEleg').value, rk = selRank.value;
    const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
    // No modo assessorias, a busca filtra assessorias (aplicada em aggregateAssessorias), não corretoras
    const q = (typeof elMode !== 'undefined' && elMode === 'assessorias') ? '' : norm(document.getElementById('fSearch').value);
    const onlyReact = document.getElementById('fReact').checked;
    const periodMonthsFilter = getPeriodMonths();
    return DATA.filter(d => {
      if (g && d.g !== g) return false;
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
    return !!(selGestor.value || document.getElementById('fEleg').value || selRank.value ||
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
  const GESTOR_COLORS = {'Agatha Sakamoto':'#2E52D4','Patricia Monks':'#F26B21','Jonathan Leal':'#101E63','Pablo Amora':'#16B87A','Sem Gestor Atribuído':'#94a3b8'};

  function showChartDrilldown(title, list){
    // Precisa mostrar o overlay ANTES de criar o gráfico: com o container ainda
    // "display:none", o canvas mede largura/altura 0 e o Chart.js nasce invisível.
    document.getElementById('chartDrilldownOverlay').style.display = 'flex';
    const sorted = [...list].sort((a,b)=>b.tot-a.tot);
    const totalVidas = sorted.reduce((s,d)=>s+d.tot,0);
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
      tr.addEventListener('click', () => showDetail(tr.dataset.c));
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
    document.querySelectorAll('#assRankBody tr').forEach(tr=>tr.addEventListener('click',()=>openAssDetail(tr.dataset.k)));
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
    detail.querySelectorAll('tr.clickable').forEach(tr => tr.addEventListener('click', ()=>showDetail(tr.dataset.c, {fromAssessoria: agg.name})));
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
    th.addEventListener('click',()=>{ const k=keys[i]; if(assCurrentSort===k) assCurrentDir*=-1; else {assCurrentSort=k; assCurrentDir=(k==='name'?1:-1);} renderAssRankTable(aggregateAssessorias(applyFilters())); });
  });

  // Conquista Premiada — visão geral da campanha (independe dos filtros da tela;
  // sempre reflete a base inteira, como um placar fixo por gestor).
  // Estado dos filtros do modal Conquista Premiada (independente dos filtros da tela)
  let cqgFilterGestor = '', cqgFilterClass = '', cqgFilterEleg = '', cqgBusca = '', cqgPage = 0;
  const CQG_PP = 15;

  function conquistaRowsAll(){
    return DATA.map(d => { const cq = computeConquistaFull(d); return cq ? Object.assign({d}, cq) : null; }).filter(Boolean);
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
      tr.addEventListener('click', () => { closeConquistaModal(); showDetail(tr.dataset.c); });
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
      el.addEventListener('click', () => {
        cqgFilterEleg = (cqgFilterEleg === k.eleg) ? '' : k.eleg;
        document.getElementById('cqgFEleg').value = cqgFilterEleg;
        cqgPage = 0;
        renderConquistaTable();
      });
    });

    const gestorGrid = document.getElementById('cqgGestorGrid');
    // "Sem Gestor Atribuído" fica de fora dos cards (mas continua nos KPIs gerais acima).
    const gestorNames = [...new Set(DATA.map(d=>d.g))].filter(g => g !== 'Sem Gestor Atribuído').sort();
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
      el.addEventListener('click', (e) => { e.stopPropagation(); closeConquistaModal(); showDetail(el.dataset.c); });
    });
    gestorGrid.querySelectorAll('.cqg-card').forEach(el => {
      el.addEventListener('click', () => {
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
        el.addEventListener('click', () => {
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
      charts.elGestor = new Chart(document.getElementById('chartElGestor'), {
        type:'bar',
        data:{ labels: reactGestorNames.map(shortGestor), datasets:[{ data: reactGestorNames.map(g=>reactByGestor[g].length),
          backgroundColor: reactGestorNames.map(g=>GESTOR_COLORS[g]||'#94a3b8'), borderRadius:7, maxBarThickness:34 }] },
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
          onClick:(evt,els)=>{ if(!els||!els.length) return; selGestor.value = reactGestorNames[els[0].index]; render(); },
          onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
          plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{
            const g = reactGestorNames[c.dataIndex]; const l = reactByGestor[g];
            const potg = l.reduce((s,d)=>s+d.tot,0);
            return [`${l.length} oportunidade(s)`, `${fmt0(potg)} vidas em potencial`, 'Clique para filtrar'];
          }}}},
          scales:{ x:{beginAtZero:true, grid:{color:'#eef1f6'}}, y:{grid:{display:false}, ticks:{font:{size:11, weight:'600'}}} } }
      });

      const sortedReact = [...filtered].sort((a,b)=>b.tot-a.tot);
      document.getElementById('reactTableBody').innerHTML = sortedReact.length ? sortedReact.map(d => `
        <tr class="clickable" data-c="${d.c}">
          <td class="name">${d.n}</td>
          <td>${shortGestor(d.g)}</td>
          <td class="num">${fmt0(d.tot)}</td>
          <td>${monthsSinceLastSale(d)} meses</td>
        </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px;">Nenhuma corretora encontrada com esses filtros.</td></tr>`;
      document.querySelectorAll('#reactTableBody tr[data-c]').forEach(tr => tr.addEventListener('click', () => showDetail(tr.dataset.c)));

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
    const prevLabel = periodMonths
      ? ((PERIOD_DEFS[periodType][periodIdx-1]||{}).label || 'período anterior')
      : '2TRI26';
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
            <div class="sr-stat"><div class="sr-label">Total 17M</div><div class="sr-value" style="color:var(--navy);">${fmt0(r.d.tot)}</div></div>
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
        card.addEventListener('click', () => {
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
      { key:null, bar:'#1D33A8', ico:'<i class=ic-users></i>', icoBg:'rgba(29,51,168,.10)', color:'#101E63',
        label:'Total de Corretoras', value: fmt0(n), pct:'100% do filtro atual',
        delta:'<span class="ek-delta flat">base analisada</span>', note:'', list:null },
    ];
    document.getElementById('execKpiRow').innerHTML = kpiDefs.map((k,i)=>{
      const isActive = k.key && activeKpiFilter === k.key;
      return `<div class="exec-kpi ${k.key?'clickable':''}" data-i="${i}" style="--ek-bar:${k.bar}; --ek-ico-bg:${k.icoBg}; --ek-color:${k.color}; ${isActive?'box-shadow:0 0 0 2.5px '+k.bar+'; transform:translateY(-1px);':''}" ${k.key?`title="${isActive?'Clique para limpar o filtro':'Clique para filtrar o dashboard por essa fatia'}"`:''}>
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
      if (k && k.key) el.addEventListener('click', () => {
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
    charts.elGestor = new Chart(document.getElementById('chartElGestor'), {
      type:'bar',
      data:{ labels: gestorNames.map(shortGestor), datasets:[{ data: gestorPcts,
        backgroundColor: gestorNames.map(g=>GESTOR_COLORS[g]||'#94a3b8'), borderRadius:7, maxBarThickness:34 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        onClick:(evt,els)=>{ if(!els||!els.length) return; selGestor.value = gestorNames[els[0].index]; render(); },
        onHover:(evt,els)=>{ if(evt&&evt.native&&evt.native.target) evt.native.target.style.cursor=(els&&els.length)?'pointer':'default'; },
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>{
          const g = gestorNames[c.dataIndex]; const l = byGestor[g];
          return [`${c.parsed.x.toFixed(1)}% elegíveis`, `${l.filter(r=>r.ctx.el===1).length} de ${l.length} corretoras`, 'Clique para filtrar'];
        }}}},
        scales:{ x:{beginAtZero:true, max:Math.max(10, Math.ceil(Math.max.apply(null, gestorPcts.concat([pctEl]))/5)*5+5), grid:{color:'#eef1f6'}, ticks:{callback:v=>v+'%'}}, y:{grid:{display:false}, ticks:{font:{size:11, weight:'600'}}} } },
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
    document.querySelectorAll('#heatmapTable .hm-cell').forEach(td => td.addEventListener('click', () => {
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
    document.querySelectorAll('#funnelWrap .funnel-bar').forEach(b => b.addEventListener('click', () => {
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
    document.querySelectorAll('#proxList .prox-row').forEach(el => el.addEventListener('click', ()=>showDetail(el.dataset.c)));

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
    document.querySelectorAll('#gainList .gain-row').forEach(el => el.addEventListener('click', ()=>showDetail(el.dataset.c)));

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
    const gestorLabel = selGestor.value || 'todos os gestores';
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
    document.querySelectorAll('#elKpiRow .kpi').forEach((el,i) => { if (kpis[i].action) el.addEventListener('click', kpis[i].action); });

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
    if (selGestor.value) titleParts.push(shortGestor(selGestor.value));
    const searchQTable = document.getElementById('fSearch').value.trim();
    document.getElementById('baseCorretorasTitle').textContent = titleParts.length ? `Corretoras ${titleParts.join(' · ')}` : 'Base de Corretoras';
    document.getElementById('baseCorretorasSub').textContent = searchQTable
      ? `Resultado da busca por "${searchQTable}" · Clique em uma linha para ver a evolução mensal`
      : 'Clique em uma linha para ver a evolução mensal · Clique no cabeçalho para ordenar';

    renderTable(filtered);
  }

  function renderTable(filtered){
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
      tr.addEventListener('click', ()=>{
        document.querySelectorAll('#elTableBody tr').forEach(r=>r.classList.remove('selected'));
        tr.classList.add('selected');
        showDetail(tr.dataset.c);
      });
    });
  }

  function showDetail(codigo, opts){
    opts = opts || {scroll:true};
    const d = DATA.find(x=>x.c===codigo);
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
    const membrosAssessoria = DATA.filter(x => x.ass && String(x.ass).trim().toUpperCase() === nomeUp);
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

    document.getElementById('detailMeta').textContent = `Código ${d.c} · Gestor: ${d.g} · Grade: ${d.gr || '—'} · Ranking: ${curRank}`;
    document.getElementById('dT2Label').textContent = periodLabel;
    document.getElementById('dMetaLabel').textContent = periodLabel;
    document.getElementById('dGapLabel').textContent = periodLabel;
    document.getElementById('dTot').textContent = fmt0(d.tot);
    document.getElementById('dT2').textContent = fmt0(curTotal);
    document.getElementById('dMeta').textContent = fmt0(curMeta);
    document.getElementById('dGap').textContent = (curGap>=0?'+':'')+fmt0(curGap);
    document.getElementById('dPico').textContent = fmt0(d.pico);
    document.getElementById('dU3').textContent = fmt0(d.u3);

    // Análise de elegibilidade da corretora nesse período — pedido do Victor: além dos
    // números crus, deixar claro se está elegível e, se não, quanto falta e o quão perto
    // está. Usa a mesma régua (76%/51%/26%) já usada nos cards "Quase Elegíveis"/"Não
    // Elegíveis" lá em cima (faixaIdx), pra ficar consistente com o resto da tela.
    const elegEl = document.getElementById('detailElegStatus');
    const isElig = calc ? calc.el === 1 : d.el === 1;
    const pctMeta = curMeta > 0 ? (curTotal / curMeta * 100) : null;
    if (isElig){
      elegEl.style.background = 'rgba(22,184,122,.10)';
      elegEl.style.border = '1px solid rgba(22,184,122,.3)';
      elegEl.style.color = '#0f6b4f';
      elegEl.innerHTML = `<i class=ic-check></i> <b>Elegível</b>` + (pctMeta!==null
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
      elegEl.innerHTML = `<i class=ic-alarm></i> <b>Não elegível</b> — faltam <b>${fmt0(faltam)} vidas</b> (está em <b>${pctMeta.toFixed(0)}%</b> da meta) para virar elegível · ${tom}.`;
    } else {
      elegEl.style.background = '#f1f5f9';
      elegEl.style.border = '1px solid var(--line)';
      elegEl.style.color = 'var(--muted)';
      elegEl.innerHTML = `<i class=ic-bulb></i> Sem meta cadastrada pra esse período (sem histórico suficiente) — não dá pra calcular a elegibilidade aqui.`;
    }

    const RANK_THRESHOLDS_EST = [{r:'Bronze 1',min:900},{r:'Bronze 2',min:600},{r:'Bronze 3',min:300},{r:'Bronze 4',min:150},{r:'Bronze 5',min:60},{r:'Bronze 6',min:15}];
    const rgEl = document.getElementById('detailRankGap');
    if (curRank === 'Bronze 1'){
      rgEl.innerHTML = '<i class=ic-award></i> Já está na faixa máxima (Bronze 1).';
    } else {
      const curIdx = RANK_THRESHOLDS_EST.findIndex(x=>x.r === curRank);
      const nextTier = curIdx > 0 ? RANK_THRESHOLDS_EST[curIdx-1] : RANK_THRESHOLDS_EST[RANK_THRESHOLDS_EST.length-1];
      const falta = Math.max(0, nextTier.min - curTotal);
      const pct = nextTier.min ? Math.min(100, curTotal/nextTier.min*100) : 0;
      rgEl.innerHTML = falta > 0
        ? `<i class=ic-chart></i> Faltam <b>${fmt0(falta)} vidas</b> (está em <b>${pct.toFixed(0)}%</b>) para alcançar <b>${nextTier.r}</b> — estimativa com limiares aproximados, sujeita a confirmação`
        : `<i class=ic-trophy></i> Volume já suficiente para <b>${nextTier.r}</b> — classificação deve atualizar no próximo fechamento`;
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
    th.addEventListener('click', ()=>{
      const k = th.dataset.k;
      if (sortKey===k){ sortDir *= -1; } else { sortKey=k; sortDir = (k==='n'||k==='g'||k==='rk'||k==='el') ? 1 : -1; }
      document.querySelectorAll('#baseCorretorasWrap thead th[data-k]').forEach(h=>{ h.classList.remove('sorted'); h.removeAttribute('data-dir'); });
      th.classList.add('sorted');
      th.setAttribute('data-dir', sortDir > 0 ? 'asc' : 'desc');
      page = 1;
      renderTable(applyFilters());
    });
  });

  ['fGestor','fEleg','fRank'].forEach(id=>document.getElementById(id).addEventListener('change', ()=>{ page=1; renderActive(); }));
  document.getElementById('fSearch').addEventListener('input', window.debounce(()=>{ page=1; renderActive(); }, 250));
  document.getElementById('fReact').addEventListener('change', ()=>{ page=1; renderActive(); });
  document.getElementById('btnReset').addEventListener('click', ()=>{
    selGestor.value=''; document.getElementById('fEleg').value=''; selRank.value='';
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
  (function initCustomRangeSelects(){
    const opts = MONTH_LABELS.map((label,i) => `<option value="${i}">${label}</option>`).join('');
    document.getElementById('fCustomFrom').innerHTML = opts;
    document.getElementById('fCustomTo').innerHTML = opts;
    document.getElementById('fCustomFrom').value = String(Math.max(0, MONTH_LABELS.length - 12));
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

  function rankApplyFilters(){
    const eq = document.getElementById('rankEquipe').value;
    const g = document.getElementById('rankGestor').value;
    const seg = document.getElementById('rankSeg').value;
    const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const q = norm(document.getElementById('rankSearch').value);
    return RANKDATA.map(r => {
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

    // Segmento ativo desabilita comparação (só temos mês atual por segmento)
    const segActive = seg !== 't';

    // KPIs
    const deltaTxt = segActive ? '<span class="ek-note" style="color:var(--muted)">comparação só no total</span>'
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
    document.getElementById('rankTableSub').innerHTML = (rankSeeAllOn?`Todas as ${rows.length}`:'Top 20') + ' corretoras · a coluna "vs mês anterior" compara com ' + prevLabel + (segActive?' · <b>segmento filtrado: comparação indisponível</b>':'') + ' · clique numa linha para o histórico';
    document.getElementById('rankSeeAll').textContent = rankSeeAllOn ? 'Mostrar só o Top 20 ▴' : `Ver todas as ${rows.length} ▾`;
    document.querySelectorAll('#rankBody tr').forEach(tr=>tr.addEventListener('click',()=>rankShowDetail(tr.dataset.c)));

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
    const r = RANKDATA.find(x=>x.c===codigo);
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
    const dTxt = v.prev===0 ? 'Novo no mês (não vendeu em '+prevLabel.split('/')[0]+')'
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
      <div class="resumo-card" style="cursor:pointer;" onclick="window.openConversaoDetail('${g.replace(/'/g,"\\'")}')" title="Ver detalhe de ${g}">
        <div class="rc-head"><div class="rc-avatar">${iniciaisConv(g)}</div><div class="rc-name">${g}</div>
          ${r.criticos ? `<span onclick="${go('showPendenciasModal',g)}" style="font-size:9px; font-weight:800; padding:3px 8px; border-radius:20px; background:rgba(245,54,74,.12); color:var(--accent-red); white-space:nowrap; cursor:pointer;" title="Ver pendências de ${g}">${r.criticos} crítico${r.criticos>1?'s':''}</span>` : ''}
        </div>
        <div class="rc-stats" style="row-gap:10px;">
          <div onclick="${go('showPendenciasModal',g)}" style="cursor:pointer;" title="Ver pendências de ${g}"><div class="rc-label">SLA médio</div><div class="rc-value" style="font-size:15px; color:${r.atrasoMedio>0?'var(--accent-red)':'var(--accent-mint)'};">${r.atrasoMedio>0 ? '+'+r.atrasoMedio+'d' : 'No prazo'}</div></div>
          <div onclick="${go('openAssinaturaList',g)}" style="cursor:pointer;" title="Ver lista de assinaturas de ${g}"><div class="rc-label">Aguard. Assinatura</div><div class="rc-value" style="font-size:15px; color:var(--primary-light);">${fmt0c(r.assinTotal)}</div></div>
          <div onclick="${go('showPendenciasModal',g)}" style="cursor:pointer;" title="Ver pendências de ${g}"><div class="rc-label">Em Funil</div><div class="rc-value" style="font-size:15px; color:var(--accent-gold);">${r.ativasCount}</div></div>
          <div onclick="${go('openConversaoDetail',g)}" style="cursor:pointer;" title="Ver detalhe de ${g}"><div class="rc-label">% Conversão</div><div class="rc-value" style="font-size:15px; color:${r.conv!==null && r.conv>=70?'var(--accent-mint)':'var(--navy)'};">${r.conv!==null ? r.conv+'%' : '—'}</div></div>
        </div>
        <div style="display:flex; justify-content:space-between; gap:10px; margin-top:12px; padding-top:10px; border-top:1px solid var(--line);">
          <div onclick="${go('openConversaoDetail',g)}" style="cursor:pointer;" title="Ver detalhe de ${g}"><div class="rc-label">Funil ontem→hoje</div><div style="font-size:12px; color:var(--navy);">${r.funilOntem!==null ? fmt0c(r.funilOntem)+' → '+fmt0c(r.funilHojeReport) : '—'}</div>${cresLabel(r.cresFunil)}</div>
          <div onclick="${go('openAssinaturaList',g)}" style="cursor:pointer; text-align:right;" title="Ver lista de assinaturas de ${g}"><div class="rc-label">Assinatura ontem→hoje</div><div style="font-size:12px; color:var(--navy);">${r.assinOntem!==null ? fmt0c(r.assinOntem)+' → '+fmt0c(r.assinHojeReport) : '—'}</div>${cresLabel(r.cresAssin)}</div>
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
        <td>${r.contratante||'—'}</td><td>${r.corretora||'—'}</td>
        <td>${motivoLabel(r.alvo)}</td>
        <td class="num">${r.beneficiarios||0}</td>
        <td>${r.dataCriacao ? r.dataCriacao.split('-').reverse().join('/') : '—'}</td>
      </tr>`).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">Nenhum registro.</td></tr>';
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
        curMap[codigo] = { c: codigo, n: e.razao, g: e.gestorRaw, t:0, ind:0, pim:0, mid:0, adm:0 };
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
        c, n: base.n || '', g, e: GESTOR_EQUIPE[g] || '—', ass, acod,
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
    selGestor.value = opts.gestor || '';
    document.getElementById('fReact').checked = !!opts.reactivationOnly;
    page = 1;
    render();
  };
  window.getEligibilidadeData = function(){ return DATA; };
  window.applyCorretorasToEligibilidade = function(byGestor){
    // Compara código normalizado dos dois lados (célula numérica do Excel perde zero à
    // esquerda, extrato do BI sempre vem com zero) — sem isso, toda corretora cujo código na
    // Elegibilidade é número puro nunca batia com o extrato, ficando com o mês corrente
    // sempre zerado/desatualizado mesmo com a venda certinha no Desempenho Comercial.
    const allCorretoras = {};
    Object.values(byGestor).forEach(g => {
      (g.corretoras||[]).forEach(c => { allCorretoras[window.normalizeCodigo(c.c)] = c; });
    });
    let atualizadas = 0;
    // Trimestre vigente (o último balde de PERIOD_DEFS.trimestre — sempre o trimestre em
    // andamento, mesmo parcial) — usado abaixo pra recalcular Elegível/Ranking igual
    // computePeriodElegRank já usa pro período corrente. Resolvido uma vez fora do loop.
    const curTri = (typeof PERIOD_DEFS !== 'undefined' && PERIOD_DEFS.trimestre && PERIOD_DEFS.trimestre.length)
      ? PERIOD_DEFS.trimestre[PERIOD_DEFS.trimestre.length - 1] : null;
    DATA.forEach(d => {
      const c = allCorretoras[window.normalizeCodigo(d.c)];
      if (c){
        const lastIdx = d.m.length - 1;
        d.m[lastIdx] = c.total;
        if (d.mc){ d.mc.pf[lastIdx] = c.ind; d.mc.ss[lastIdx] = c.ss; d.mc.pme[lastIdx] = c.pme; }
        d.tot = d.m.reduce((s,v)=>s+v, 0);
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
        }
        atualizadas++;
      }
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
      [...new Set(DATA.map(d=>d.g))].sort().forEach(g=>EL_GESTORES.push(g));
      selGestor.innerHTML = '<option value="">Todos</option>';
      EL_GESTORES.forEach(g => { const o=document.createElement('option'); o.value=g; o.textContent=g; selGestor.appendChild(o); });
      syncGestorLocalOptions();
      RANKS_PRESENT.length = 0;
      RANK_ORDER.filter(r => DATA.some(d=>d.rk===r)).forEach(r=>RANKS_PRESENT.push(r));
    }
    return found;
  };
  window.updateEligibilidadeData = function(newRecords){
    DATA = newRecords;
    refreshMonthDerivedState();
    EL_GESTORES.length = 0;
    [...new Set(DATA.map(d=>d.g))].sort().forEach(g=>EL_GESTORES.push(g));
    selGestor.innerHTML = '<option value="">Todos</option>';
    EL_GESTORES.forEach(g => { const o=document.createElement('option'); o.value=g; o.textContent=g; selGestor.appendChild(o); });
    syncGestorLocalOptions();
    RANKS_PRESENT.length = 0;
    RANK_ORDER.filter(r => DATA.some(d=>d.rk===r)).forEach(r=>RANKS_PRESENT.push(r));
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
    if (!mjData || !mjData.teams || !mjData.teams[CL_LABEL]) return;

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
    document.getElementById('ovKpiRow').innerHTML = kpis.map(k=>`<div class="kpi" style="cursor:pointer" title="Clique para ver o detalhe" onclick="${k.onclick}"><div class="kpi-icon">${k.icon}</div><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="sub ${k.cls}">${k.sub}</div></div>`).join('');

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
        const clickable = `style="cursor:pointer" onclick="window.jumpToMetaJunho('${teamName.replace(/'/g,"\\'")}', '${m.nome.replace(/'/g,"\\'")}')" title="Ver números deste gestor no Desempenho Comercial"`;
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
    'MARCELO LIMA': 'Marcelo Lima (Digital)',
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
    for (let i = 3; i < metaRows.length; i++){
      const row = metaRows[i] || [];
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
        const teamLabel = SENIOR_TEAM_LABELS[seniorRaw] || titlecasePt(seniorRaw);
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
    const cauda = teams['Estevão Cardoso (Cauda Longa)'];
    if (!cauda) throw new Error('Não encontrei o time "Estevão Cardoso (Cauda Longa)" na planilha.');
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
    const idxTot17 = findEligHeaderCol('17 MESES TOTAIS');
    const idxEleg = findEligHeaderCol('ELEGIBILIDADE');
    const idxRank = findEligHeaderCol('RANKING');
    if (idxTot17 < 0 || idxEleg < 0 || idxRank < 0){
      throw new Error('Não consegui identificar as colunas de resumo (17 meses/Elegibilidade/Ranking) na aba ELEGIBILIDADE — o layout da planilha pode ter mudado.');
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
      const codigo = row[0];
      if (codigo === null || codigo === undefined || codigo === '') continue;
      const nome = (row[1] === null || row[1] === undefined || row[1] === '') ? '(Sem nome cadastrado)' : String(row[1]).trim();
      const grade = row[2] != null ? String(row[2]) : '';
      const assessoriaRaw = (row[3] === null || row[3] === undefined || row[3] === '' || String(row[3]).trim() === '0') ? '' : String(row[3]).trim();
      const gestorRaw = row[4];
      let gestorLabel;
      if (gestorRaw && CL_GESTORES_RAW[gestorRaw]) gestorLabel = CL_GESTORES_RAW[gestorRaw];
      else if (enrich[codigo]) gestorLabel = enrich[codigo];
      else gestorLabel = 'Sem Gestor Atribuído';

      const monthly = monthCols.map(c => num(row[c]));
      const mc = {
        pf: monthCols.map(c => num(row[c-3])),
        ss: monthCols.map(c => num(row[c-2])),
        pme: monthCols.map(c => num(row[c-1])),
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
      const oldT = (old.teams[t] && old.teams[t].total) || {meta:0,int:0};
      const newT = newData.teams[t].total;
      const bold = t.indexOf('Cauda Longa') >= 0 ? 'font-weight:700;' : '';
      html += `<tr style="${bold}"><td style="padding:4px;">${t}</td><td style="text-align:right;padding:4px;">${fmtN(oldT.meta)} → ${fmtN(newT.meta)}</td><td style="text-align:right;padding:4px;">${fmtN(oldT.int)} → ${fmtN(newT.int)}</td></tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  function diffEligibilidade(newRecords){
    const old = window.getEligibilidadeData();
    const oldCodes = new Set(old.map(d=>d.c));
    const newCodes = new Set(newRecords.map(d=>d.c));
    const added = newRecords.filter(d => !oldCodes.has(d.c));
    const removed = old.filter(d => !newCodes.has(d.c));
    const oldTotSum = old.reduce((s,d)=>s+d.tot,0);
    const newTotSum = newRecords.reduce((s,d)=>s+d.tot,0);

    let html = '<h3 style="font-size:14px;color:var(--navy);margin:14px 0 8px;"><i class=ic-target></i> Elegibilidade — Resumo das mudanças</h3>';
    html += '<div style="font-size:12.5px;line-height:1.8;">';
    html += `<div>Corretoras: <b>${old.length}</b> → <b>${newRecords.length}</b> (${added.length} novas, ${removed.length} removidas)</div>`;
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
  const CODIGO_GESTOR_OVERRIDE = { '0834': 'FLAVIA AUANA SILVA DE OLIVEIRA' };
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
    for (let i = 2; i < rows.length; i++){
      const row = rows[i] || [];
      const canal = row[iCanal];
      if (!canal) continue;
      const canalTxt = String(canal).trim();
      // Pula a linha de rodapé "Total" e o bloco de texto dos filtros aplicados que o BI
      // sempre deixa embaixo da última corretora — sem essa checagem, os dois viravam
      // "corretoras" fantasmas sem gestor, inflando muito o total de vidas não atribuídas
      // (a linha "Total" sozinha somava as vidas de TODAS as corretoras de novo).
      if (/^total$/i.test(canalTxt) || canalTxt.length > 100) continue;
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
      html += `<div>Elegibilidade — histórico de Julho será gravado em <b>${matchCount}</b> das ${eligData.length} corretoras (Cauda Longa).</div>`;
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
    'KAIQUE ARAUJO DA SILVA':'Kaique Araujo da Silva','FLAVIA AUANA SILVA DE OLIVEIRA':'Flavia Auana Silva de Oliveira'
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
  function parseAssinaturaWorkbook(workbook){
    const sheet = findSheet(workbook, 'stats_export_gndi');
    if (!sheet) throw new Error('Não encontrei a aba "stats_export_gndi..." no arquivo de Aguardando Assinatura.');
    const rows = sheetRows(sheet);
    const header = (rows[0]||[]).map(h => String(h||'').trim());
    const idx = name => header.indexOf(name);
    const iAlvo = idx('alvo'), iGestor = idx('GESTOR'), iCorretora = idx('CORRETORA'),
          iData = idx('datacriacao'), iBenef = idx('beneficiarios'), iContratante = idx('contratante_nome');
    if ([iAlvo,iGestor].some(i=>i<0)) throw new Error('A aba não tem as colunas esperadas ("alvo", "GESTOR") — confirme que já rodou o cruzamento de GESTOR/CORRETORA antes de subir este arquivo.');
    const data = {};
    for (let i = 1; i < rows.length; i++){
      const row = rows[i] || [];
      const gestorRaw = row[iGestor];
      if (!gestorRaw) continue;
      const gestor = String(gestorRaw).trim();
      (data[gestor] = data[gestor] || []).push({
        alvo: String(row[iAlvo]||'').trim(),
        corretora: iCorretora>=0 ? String(row[iCorretora]||'').trim() : '',
        contratante: iContratante>=0 ? String(row[iContratante]||'').trim() : '',
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
    if (pendingMeta) window.updateMetaJunhoData(pendingMeta);
    if (pendingCorretorasRaw) {
      window.updateIntegradoFromRaw(pendingCorretorasRaw.byGestor, pendingCorretorasRaw.semGestorCat);
      if (window.applyCorretorasToEligibilidade){
        const n = window.applyCorretorasToEligibilidade(pendingCorretorasRaw.byGestor);
        console.log(`Elegibilidade: ${n} corretoras atualizadas com dado de Julho.`);
      }
    }
    if (pendingEligBridge && window.applyCorretorasToEligibilidade){
      const n2 = window.applyCorretorasToEligibilidade(pendingEligBridge);
      console.log(`Elegibilidade: ${n2} corretoras atualizadas via planilha manual.`);
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
      window.updateRankingData(rankCurFromRaw, null, window.getCurrentMonth ? window.getCurrentMonth() : null);
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
      RANK_CUR_LABEL: window.getRankLabels ? window.getRankLabels().cur : 'Mês atual',
      RANK_PREV_LABEL: window.getRankLabels ? window.getRankLabels().prev : 'Mês anterior',
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
    status.innerHTML = '<span class="spinner" style="border-color:rgba(16,30,99,.25); border-top-color:var(--navy);"></span> Publicando...';
    try {
      const payload = buildDataPayload();
      const keys = Object.keys(payload);
      // Publica todas as seções em paralelo — mais rápido, e cada uma é independente
      // (um erro numa não corrompe as outras, viram gravações parciais no pior caso).
      await Promise.all(keys.map(k => window.fsWriteSection(k, payload[k])));
      status.innerHTML = '<span style="color:#1b7a63; font-weight:700;">Publicado! Quem já estiver com o painel aberto vê a atualização só no próximo login/recarregamento.</span>';
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

