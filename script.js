/* ═══════════════════════════════════════════════════════════════
   BIG MATCH MANAGER v2.1 — by Joy Zogo
   app.js — Logique principale (GitHub Pages / LocalStorage)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══ SÉCURITÉ : vérification mot de passe par hachage ══ */
const _AUTH = (() => {
  const h = s => {
    let v = 5381;
    for (let i = 0; i < s.length; i++) v = (((v << 5) + v) ^ s.charCodeAt(i)) >>> 0;
    return (v + 0xdeadbeef).toString(16).padStart(8,'0');
  };
  const C = { super: h('Malaga2025!'), rouge: h('Rouges@2025'), blanc: h('BlancFC@') };
  return { check: (role, pwd) => C[role] && C[role] === h(pwd), h };
})();

/* ══ JOURS / MOIS FR ══ */
const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MOIS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fmtDate = d => { if(!d) return ''; const dt=new Date(d+'T12:00:00'); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`; };
const getJour = d => { if(!d) return ''; return JOURS[new Date(d+'T12:00:00').getDay()]; };
const getMois = d => { if(!d) return ''; const dt=new Date(d+'T12:00:00'); return `${MOIS[dt.getMonth()]} ${dt.getFullYear()}`; };
const getWeek = d => { const dt=new Date(d+'T12:00:00'),jan=new Date(dt.getFullYear(),0,1); return Math.ceil(((dt-jan)/86400000+jan.getDay()+1)/7); };

/* ══ ÉTAT GLOBAL ══ */
let CU      = null;  // currentUser { role, name }
let DB      = {};    // base de données chargée
let activeSection = 'accueil';
let editingMatch  = null;
let editingSanction = null;

/* ══ PERSISTANCE ══ */
const STORAGE_KEY = 'bmm_v21';
const loadDB = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
};
const saveDB = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); };

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('yr').textContent = new Date().getFullYear();

  // Charge data.json ou localStorage
  const stored = loadDB();
  if (stored) {
    DB = stored;
  } else {
    try {
      const r = await fetch('data.json');
      DB = await r.json();
    } catch(e) {
      DB = getDefaultDB();
    }
    saveDB();
  }

  // Événements login
  document.getElementById('pinInput').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  document.getElementById('matchModal').addEventListener('click', e => { if(e.target===document.getElementById('matchModal')) closeMatchModal(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') { closeMatchModal(); closeSanctionModal(); } });

  // Autocomplete
  setupAutocomplete();
  setupScoreListeners();
});

/* ══ DATABASE DEFAULT ══ */
function getDefaultDB() {
  return {
    version: '2.1', currentYear: String(new Date().getFullYear()),
    years: [String(new Date().getFullYear())],
    teams: {
      rouge: { id:'rouge', name:'Les Rouges', color:'#ef4444' },
      blanc: { id:'blanc', name:'Les Blancs',  color:'#3b82f6' }
    },
    eventTypes: ['Big Match','Contre','Classico','Match de gala'],
    players: [], matches: [], sanctions: [], loginHistory: [],
    nextIds: { match:1, player:1, sanction:1 }
  };
}

/* ═══════════════════════════════════════════════════════════════
   AUTHENTIFICATION
   ═══════════════════════════════════════════════════════════════ */
let selRole = null;

function selectRole(role) {
  selRole = role;
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector(`[data-role="${role}"]`);
  if (card) card.classList.add('active');

  const pwdSec = document.getElementById('pwdSection');
  const loginErr = document.getElementById('loginError');
  loginErr.textContent = '';

  if (role === 'obs') {
    // Connexion directe sans mot de passe
    doConnectObs();
    return;
  }

  pwdSec.classList.add('show');
  setTimeout(() => document.getElementById('pinInput').focus(), 100);
}

function doConnectObs() {
  CU = { role: 'obs', name: 'Observateur' };
  finishLogin();
}

function doLogin() {
  if (!selRole || selRole === 'obs') return;
  const pwd = document.getElementById('pinInput').value;
  if (!pwd) { document.getElementById('loginError').textContent = 'Entrez le mot de passe'; return; }

  if (_AUTH.check(selRole, pwd)) {
    const names = { super:'Super Administrateur', rouge:'Organisateur Rouges', blanc:'Organisateur Blancs' };
    CU = { role: selRole, name: names[selRole] };
    _logHistory('Connexion', CU.name);
    finishLogin();
  } else {
    document.getElementById('loginError').textContent = '❌ Mot de passe incorrect';
    document.getElementById('pinInput').value = '';
    document.getElementById('pinInput').focus();
  }
}

function finishLogin() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('userNameDisplay').textContent = CU.name;
  const dots = { super:'dot-super', rouge:'dot-rouge', blanc:'dot-blanc', obs:'dot-obs' };
  document.getElementById('userDot').className = 'user-dot ' + (dots[CU.role]||'dot-obs');
  applyPermissions();
  showSection('accueil');
  notify(`Bienvenue, ${CU.name} !`);
}

function togglePwd() {
  const i = document.getElementById('pinInput');
  const b = document.getElementById('pwdToggle');
  i.type = i.type === 'password' ? 'text' : 'password';
  b.textContent = i.type === 'password' ? '👁' : '🙈';
}

function logout() {
  CU = null; selRole = null;
  document.getElementById('pinInput').value = '';
  document.getElementById('pinInput').type = 'password';
  document.getElementById('pwdSection').classList.remove('show');
  document.getElementById('loginError').textContent = '';
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
  document.getElementById('loginPage').classList.remove('hidden');
}

function applyPermissions() {
  const canEdit = CU && CU.role !== 'obs';
  const isSuper = CU && CU.role === 'super';
  document.querySelectorAll('.requires-auth').forEach(el => { el.style.display = canEdit ? '' : 'none'; });
  document.querySelectorAll('.requires-super').forEach(el => { el.style.display = isSuper ? '' : 'none'; });
}

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════ */
function showSection(id) {
  activeSection = id;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  const tab = document.querySelector(`[data-sec="${id}"]`);
  if (tab) tab.classList.add('active');

  const renderers = {
    accueil:    renderAccueil,
    matchs:     renderMatchList,
    saisie:     renderSaisieForm,
    stats:      renderStats,
    classements:renderClassements,
    sanctions:  renderSanctions,
    historique: renderHistorique,
  };
  if (renderers[id]) renderers[id]();
}

/* ═══════════════════════════════════════════════════════════════
   PAGE ACCUEIL
   ═══════════════════════════════════════════════════════════════ */
function renderAccueil() {
  renderQuickStats();
  renderLastMatch();
  renderMiniTopLists();
}

function renderQuickStats() {
  const year = DB.currentYear;
  const ms = DB.matches.filter(m => m.year === year && m.statut === 'Joué');
  const totalButs = ms.reduce((a,m) => a + Number(m.scoreA||0) + Number(m.scoreB||0), 0);
  const rougeWins = ms.filter(m => {
    const isA = m.equipeA === 'rouge';
    return isA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
  }).filter(m => m.equipeA === 'rouge' || m.equipeB === 'rouge').length;
  const blancWins = ms.filter(m => {
    const isA = m.equipeA === 'blanc';
    return isA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
  }).filter(m => m.equipeA === 'blanc' || m.equipeB === 'blanc').length;

  // Joueur le plus MVP
  const mvpCount = {};
  ms.forEach(m => { if(m.mvp) mvpCount[m.mvp] = (mvpCount[m.mvp]||0)+1; });
  const topMvp = Object.entries(mvpCount).sort((a,b)=>b[1]-a[1])[0];

  set('qs-matchs', ms.length);
  set('qs-buts', totalButs);
  set('qs-rouge', rougeWins);
  set('qs-blanc', blancWins);
  set('qs-sanctions', DB.sanctions?.length || 0);
  if (topMvp) {
    set('qs-mvp-name', topMvp[0]);
    set('qs-mvp-count', topMvp[1] + ' fois 🏆');
  }
}

function renderLastMatch() {
  const el = document.getElementById('lastMatchSection');
  if (!el) return;
  const ms = DB.matches.filter(m => m.statut==='Joué').sort((a,b) => b.date.localeCompare(a.date));
  const last = ms[0];
  if (!last) { el.innerHTML = '<div class="empty"><div class="ei">🏟️</div><p>Aucun match encore joué</p></div>'; return; }
  const tA = DB.teams[last.equipeA]?.name || last.equipeA;
  const tB = DB.teams[last.equipeB]?.name || last.equipeB;
  const resultCls = last.scoreA > last.scoreB ? 'won' : last.scoreA < last.scoreB ? 'lost' : 'draw';
  el.innerHTML = `
    <div class="last-match-hero">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-ghost)">⚡ Dernier Match</div>
          <div style="font-size:13px;color:var(--text-dim);margin-top:4px">${getJour(last.date)} ${fmtDate(last.date)} · ${last.heure||''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${eventBadge(last.type)}
          <span class="badge ${last.lieu==='Domicile'?'badge-dom':'badge-ext'}">${last.lieu||'—'}</span>
        </div>
      </div>
      <div class="lm-teams">
        <div class="lm-team">
          <div class="lm-team-name ${last.equipeA==='rouge'?'team-rouge':last.equipeA==='blanc'?'team-blanc':'team-ext'}">${tA}</div>
        </div>
        <div class="lm-score">${last.scoreA} — ${last.scoreB}</div>
        <div class="lm-team">
          <div class="lm-team-name ${last.equipeB==='rouge'?'team-rouge':last.equipeB==='blanc'?'team-blanc':'team-ext'}">${tB}</div>
        </div>
      </div>
      ${last.mvp ? `<div style="text-align:center;margin-top:12px">🏆 <strong style="color:var(--gold)">${last.mvp}</strong> <span style="color:var(--text-ghost);font-size:12px">— Homme du Match</span></div>` : ''}
      ${last.notes ? `<div style="text-align:center;margin-top:8px;font-size:12px;color:var(--text-ghost);font-style:italic">${last.notes}</div>` : ''}
    </div>`;
}

function renderMiniTopLists() {
  const year = DB.currentYear;
  const ms = DB.matches.filter(m => m.year===year && m.statut==='Joué');
  const buts={}, passes={};
  ms.forEach(m => {
    (m.goals||[]).forEach(g => {
      if (g.buteur && g.buteur !== 'Buteur inconnu') buts[g.buteur]=(buts[g.buteur]||0)+1;
      if (g.passeur && g.passeur !== 'NC' && g.passeur !== 'Buteur inconnu') passes[g.passeur]=(passes[g.passeur]||0)+1;
    });
  });
  const mkTop5 = (obj, unit) => {
    const arr = Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (!arr.length) return '<div class="empty"><div class="ei">⚽</div><p>Aucune donnée</p></div>';
    return arr.map(([name,val],i) => `
      <div class="rank-item">
        <div class="rank-pos ${['pos-1','pos-2','pos-3','pos-n','pos-n'][i]}">${i+1}</div>
        <div style="flex:1"><div class="rank-name">${name}</div><div class="rank-team">${getPlayerTeamName(name)}</div></div>
        <div class="rank-val">${val} <span style="font-size:12px;color:var(--text-ghost)">${unit}</span></div>
      </div>`).join('');
  };
  set('miniTopButs',  mkTop5(buts,  '⚽'));
  set('miniTopPasses', mkTop5(passes, '🎯'));

  // Mini MVP
  const mvpC = {};
  ms.forEach(m => { if(m.mvp) mvpC[m.mvp]=(mvpC[m.mvp]||0)+1; });
  const mvpArr = Object.entries(mvpC).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const mvpEl = document.getElementById('miniMVP');
  if (mvpEl) {
    if (!mvpArr.length) { mvpEl.innerHTML = '<div class="empty"><div class="ei">🏆</div><p>Aucun MVP encore</p></div>'; return; }
    mvpEl.innerHTML = mvpArr.map(([name,cnt],i) => `
      <div class="rank-item">
        <div class="rank-pos ${['pos-1','pos-2','pos-3'][i]}">${['🥇','🥈','🥉'][i]}</div>
        <div style="flex:1"><div class="rank-name">${name}</div><div class="rank-team">${getPlayerTeamName(name)}</div></div>
        <div class="rank-val or">${cnt}x</div>
      </div>`).join('');
  }
}

function getPlayerTeamName(name) {
  const p = DB.players.find(pl => pl.name === name);
  if (!p) return '—';
  return DB.teams[p.team]?.name || p.team;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE MATCHS
   ═══════════════════════════════════════════════════════════════ */
let matchSort = { col:'date', asc: false };
let matchFilter = '';

function renderMatchList() {
  const year = DB.currentYear;
  let list = [...DB.matches].filter(m => m.year===year);
  if (matchFilter) list = list.filter(m => JSON.stringify(m).toLowerCase().includes(matchFilter.toLowerCase()));
  list.sort((a,b) => {
    let va = a[matchSort.col]||'', vb = b[matchSort.col]||'';
    if (matchSort.col==='date') { va=a.date+(a.heure||''); vb=b.date+(b.heure||''); }
    return matchSort.asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const canEdit = CU && CU.role !== 'obs';
  const el = document.getElementById('matchListWrap');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="ei">🏟️</div><p>Aucun match cette année</p></div>';
    return;
  }

  el.innerHTML = list.map(m => {
    const tA = DB.teams[m.equipeA]?.name || m.equipeA;
    const tB = DB.teams[m.equipeB]?.name || m.equipeB;
    const tACls = m.equipeA==='rouge'?'team-rouge':m.equipeA==='blanc'?'team-blanc':'team-ext';
    const tBCls = m.equipeB==='rouge'?'team-rouge':m.equipeB==='blanc'?'team-blanc':'team-ext';
    const isRougeA = m.equipeA==='rouge';
    const resultCls = m.scoreA===m.scoreB?'draw':(isRougeA?m.scoreA>m.scoreB:m.scoreB>m.scoreA)?'won':'lost';
    const goals = (m.goals||[]);
    const scorersA = goals.filter(g=>g.team===m.equipeA||g.team==='rouge'&&m.equipeA==='rouge').map(g=>`${g.buteur}${g.passeur&&g.passeur!=='NC'?` (${g.passeur})`:''}`)
    .join(', ');
    const scorersB = goals.filter(g=>g.team===m.equipeB||g.team==='blanc'&&m.equipeB==='blanc').map(g=>`${g.buteur}${g.passeur&&g.passeur!=='NC'?` (${g.passeur})`:''}`)
    .join(', ');
    return `
    <div class="match-card ${resultCls}">
      <div class="match-meta">
        <span class="match-date">📅 ${getJour(m.date)} ${fmtDate(m.date)} ${m.heure?'à '+m.heure:''}</span>
        ${eventBadge(m.type)}
        <span class="badge ${m.lieu==='Domicile'?'badge-dom':'badge-ext'}">${m.lieu||'—'}</span>
        ${m.statut==='Annulé'?'<span class="badge badge-annule">Annulé</span>':''}
      </div>
      <div class="match-teams">
        <div class="team-name ${tACls}" style="text-align:right">${tA}</div>
        <div class="score-display">${m.statut==='Joué'?`${m.scoreA} — ${m.scoreB}`:'—'}</div>
        <div class="team-name ${tBCls}">${tB}</div>
      </div>
      ${m.mvp ? `<div style="margin-top:10px;font-size:12px;color:var(--gold)">🏆 Homme du match : <strong>${m.mvp}</strong></div>` : ''}
      ${scorersA||scorersB?`<div style="margin-top:8px;font-size:11px;color:var(--text-ghost)">
        ${scorersA?`<span style="color:var(--rouge)">🔴 ${scorersA}</span>  `:''}
        ${scorersB?`<span style="color:var(--blanc)">🔵 ${scorersB}</span>`:''}
      </div>`:''}
      ${canEdit?`<div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-secondary btn-xs" onclick="openEditMatch(${m.id})">✏️ Éditer</button>
        ${CU.role==='super'?`<button class="btn btn-danger btn-xs" onclick="deleteMatch(${m.id})">🗑 Supprimer</button>`:''}
      </div>`:''}
    </div>`;
  }).join('');
}

function setMatchSort(col) {
  if (matchSort.col === col) matchSort.asc = !matchSort.asc;
  else { matchSort.col = col; matchSort.asc = false; }
  renderMatchList();
}

function toggleMatchOrder() {
  matchSort.asc = !matchSort.asc;
  renderMatchList();
  notify('Ordre ' + (matchSort.asc ? 'croissant' : 'décroissant'));
}

/* ═══════════════════════════════════════════════════════════════
   SAISIE MATCH
   ═══════════════════════════════════════════════════════════════ */
function renderSaisieForm() {
  document.getElementById('saisieDate').value = new Date().toISOString().split('T')[0];
  updateSaisieYear();
  updateScorerFields();
}

function setupScoreListeners() {
  ['saisieScoreA','saisieScoreB'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateScorerFields);
  });
}

function updateScorerFields() {
  const scoreA = Number(document.getElementById('saisieScoreA')?.value || 0);
  const scoreB = Number(document.getElementById('saisieScoreB')?.value || 0);
  const wrapA  = document.getElementById('scorersA');
  const wrapB  = document.getElementById('scorersB');
  if (!wrapA || !wrapB) return;

  const equipeA = document.getElementById('saisieEquipeA')?.value || 'rouge';
  const equipeB = document.getElementById('saisieEquipeB')?.value || 'blanc';
  const teamNameA = DB.teams[equipeA]?.name || equipeA;
  const teamNameB = DB.teams[equipeB]?.name || equipeB;

  wrapA.innerHTML = `<div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--rouge);margin-bottom:10px;text-transform:uppercase">⚽ Buteurs ${teamNameA} (${scoreA})</div>` + buildScorerRows(scoreA, equipeA, 'A');
  wrapB.innerHTML = `<div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--blanc);margin-bottom:10px;text-transform:uppercase">⚽ Buteurs ${teamNameB} (${scoreB})</div>` + buildScorerRows(scoreB, equipeB, 'B');

  // Réattacher autocomplete sur les nouveaux champs
  document.querySelectorAll('.autocomplete-wrap').forEach(wrap => {
    setupAutocompleteField(wrap);
  });
}

function buildScorerRows(n, team, side) {
  if (n <= 0) return '<div style="color:var(--text-ghost);font-size:12px">Entrez un score pour saisir les buteurs</div>';
  let html = '<div class="scorers-section">';
  for (let i = 0; i < n; i++) {
    const teamPlayers = DB.players.filter(p => p.team === team).map(p => `<option value="${p.name}">`).join('');
    const allPlayers  = DB.players.map(p => `<option value="${p.name}">`).join('');
    html += `
      <div class="scorer-row">
        <span class="scorer-num">${i+1}</span>
        <div class="form-group autocomplete-wrap" style="flex:1">
          <input type="text" class="form-input" id="but_${side}_${i}" placeholder="Buteur" autocomplete="off" data-team="${team}" list="players_${side}_${i}">
          <datalist id="players_${side}_${i}">${teamPlayers}</datalist>
        </div>
        <div class="form-group autocomplete-wrap" style="flex:1">
          <input type="text" class="form-input" id="pas_${side}_${i}" placeholder="Passeur (NC si inconnu)" autocomplete="off" list="allplayers_${side}_${i}">
          <datalist id="allplayers_${side}_${i}">${allPlayers}<option value="NC"></datalist>
        </div>
        <div style="width:20px;text-align:center;color:var(--text-ghost);font-size:11px">⚽</div>
      </div>`;
  }
  return html + '</div>';
}

function updateSaisieYear() {
  const sel = document.getElementById('saisieAnnee');
  if (!sel) return;
  sel.innerHTML = DB.years.map(y => `<option value="${y}" ${y===DB.currentYear?'selected':''}>${y}</option>`).join('');
}

function calcMVP(goals, scoreA, scoreB, equipeA) {
  const pts = {};
  const rougeWon = equipeA==='rouge' ? scoreA>scoreB : scoreB>scoreA;
  const blancWon = equipeA==='blanc' ? scoreA>scoreB : scoreB>scoreA;

  goals.forEach(g => {
    if (g.buteur && g.buteur!=='Buteur inconnu') pts[g.buteur] = (pts[g.buteur]||0) + 3;
    if (g.passeur && g.passeur!=='NC') pts[g.passeur] = (pts[g.passeur]||0) + 2;
  });

  // Bonus victoire
  const winTeam = scoreA>scoreB ? equipeA : scoreB>scoreA ? (equipeA==='rouge'?'blanc':'rouge') : null;
  if (winTeam) {
    const winners = DB.players.filter(p=>p.team===winTeam).map(p=>p.name);
    winners.forEach(name => { if(pts[name]) pts[name]+=1; });
  }

  const sorted = Object.entries(pts).sort((a,b)=>b[1]-a[1]);
  return sorted[0] ? { name: sorted[0][0], points: sorted[0][1] } : null;
}

function saveMatch() {
  if (!CU || CU.role==='obs') { notify('Accès refusé','err'); return; }

  const date    = document.getElementById('saisieDate')?.value;
  const heure   = document.getElementById('saisieHeure')?.value || '';
  const type    = document.getElementById('saisieType')?.value || 'Big Match';
  const lieu    = document.getElementById('saisieLieu')?.value || 'Domicile';
  const annee   = document.getElementById('saisieAnnee')?.value || DB.currentYear;
  const statut  = document.getElementById('saisieStatut')?.value || 'Joué';
  const equipeA = document.getElementById('saisieEquipeA')?.value || 'rouge';
  const equipeB = document.getElementById('saisieEquipeB')?.value || 'blanc';
  let   scoreA  = parseInt(document.getElementById('saisieScoreA')?.value) || 0;
  let   scoreB  = parseInt(document.getElementById('saisieScoreB')?.value) || 0;
  const notes   = document.getElementById('saisieNotes')?.value || '';

  if (!date) { notify('La date est requise','err'); return; }
  if (equipeA === equipeB) { notify('Les deux équipes doivent être différentes','err'); return; }

  // Rôle restrictif
  if (CU.role==='rouge' && equipeA!=='rouge' && equipeB!=='rouge') { notify('Vous ne gérez que l\'équipe Rouge','err'); return; }
  if (CU.role==='blanc' && equipeA!=='blanc' && equipeB!=='blanc') { notify('Vous ne gérez que l\'équipe Blanc','err'); return; }

  // Collecte les buts
  const goals = [];
  if (statut === 'Joué') {
    for (let i=0; i<scoreA; i++) {
      const but = document.getElementById(`but_A_${i}`)?.value?.trim() || 'Buteur inconnu';
      const pas = document.getElementById(`pas_A_${i}`)?.value?.trim() || 'NC';
      goals.push({ buteur: but||'Buteur inconnu', passeur: pas||'NC', team: equipeA });
      if (but && but!=='Buteur inconnu') addPlayerIfNew(but, equipeA);
    }
    for (let i=0; i<scoreB; i++) {
      const but = document.getElementById(`but_B_${i}`)?.value?.trim() || 'Buteur inconnu';
      const pas = document.getElementById(`pas_B_${i}`)?.value?.trim() || 'NC';
      goals.push({ buteur: but||'Buteur inconnu', passeur: pas||'NC', team: equipeB });
      if (but && but!=='Buteur inconnu') addPlayerIfNew(but, equipeB);
    }
  }

  // Calcul MVP auto
  const mvpSuggested = calcMVP(goals, scoreA, scoreB, equipeA);
  const mvpCustom = document.getElementById('saisieMVP')?.value?.trim();
  const mvp = mvpCustom || mvpSuggested?.name || '';

  if (!DB.nextIds) DB.nextIds = { match: DB.matches.length+1, player: DB.players.length+1, sanction: DB.sanctions.length+1 };

  const newMatch = {
    id: editingMatch ?? (DB.nextIds.match++),
    year: annee, date, heure, type, lieu, statut,
    equipeA, equipeB, scoreA, scoreB,
    goals, mvp, mvpPoints: mvpSuggested?.points||0, notes
  };

  if (editingMatch !== null) {
    const idx = DB.matches.findIndex(m => m.id === editingMatch);
    if (idx >= 0) DB.matches[idx] = newMatch;
    else DB.matches.push(newMatch);
    notify('✅ Match mis à jour');
  } else {
    DB.matches.push(newMatch);
    notify('✅ Match enregistré !');
  }

  _logHistory('Match sauvegardé', CU.name, `${DB.teams[equipeA]?.name} ${scoreA}-${scoreB} ${DB.teams[equipeB]?.name}`);
  saveDB();
  editingMatch = null;

  // Reset form
  document.getElementById('saisieScoreA').value = '0';
  document.getElementById('saisieScoreB').value = '0';
  document.getElementById('saisieDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('saisieNotes').value = '';
  if (document.getElementById('saisieMVP')) document.getElementById('saisieMVP').value='';
  updateScorerFields();
  showSection('matchs');
}

function addPlayerIfNew(name, team) {
  if (!name || name==='NC' || name==='Buteur inconnu') return;
  const exists = DB.players.find(p => p.name.toLowerCase()===name.toLowerCase());
  if (!exists) {
    if (!DB.nextIds) DB.nextIds = { match:1, player:1, sanction:1 };
    DB.players.push({ id: DB.nextIds.player++, name, team, aliases:[] });
  }
}

function openEditMatch(id) {
  const m = DB.matches.find(x => x.id===id);
  if (!m) return;
  editingMatch = id;
  document.getElementById('saisieDate').value = m.date;
  if (document.getElementById('saisieHeure')) document.getElementById('saisieHeure').value = m.heure||'';
  document.getElementById('saisieType').value = m.type;
  document.getElementById('saisieLieu').value = m.lieu||'Domicile';
  document.getElementById('saisieStatut').value = m.statut||'Joué';
  document.getElementById('saisieEquipeA').value = m.equipeA;
  document.getElementById('saisieEquipeB').value = m.equipeB;
  document.getElementById('saisieScoreA').value = m.scoreA;
  document.getElementById('saisieScoreB').value = m.scoreB;
  document.getElementById('saisieNotes').value = m.notes||'';
  if (document.getElementById('saisieMVP')) document.getElementById('saisieMVP').value = m.mvp||'';
  updateScorerFields();
  setTimeout(() => {
    (m.goals||[]).forEach((g,i) => {
      const side = i < m.scoreA ? 'A' : 'B';
      const idx  = i < m.scoreA ? i : i-m.scoreA;
      const bEl = document.getElementById(`but_${side}_${idx}`);
      const pEl = document.getElementById(`pas_${side}_${idx}`);
      if (bEl) bEl.value = g.buteur||'';
      if (pEl) pEl.value = g.passeur||'NC';
    });
  }, 200);
  showSection('saisie');
}

function deleteMatch(id) {
  if (CU?.role !== 'super') { notify('Permission refusée','err'); return; }
  if (!confirm('Supprimer ce match définitivement ?')) return;
  DB.matches = DB.matches.filter(m => m.id !== id);
  saveDB();
  renderMatchList();
  notify('Match supprimé');
}

/* ═══════════════════════════════════════════════════════════════
   STATISTIQUES
   ═══════════════════════════════════════════════════════════════ */
function renderStats() {
  renderTeamStats();
  renderContre();
}

function renderTeamStats() {
  const year = DB.currentYear;
  const ms = DB.matches.filter(m => m.year===year && m.statut==='Joué');

  ['rouge','blanc'].forEach(team => {
    const teamMs = ms.filter(m => m.equipeA===team||m.equipeB===team);
    let V=0,N=0,D=0,BM=0,BE=0;
    teamMs.forEach(m => {
      const isA = m.equipeA===team;
      const gf  = isA ? Number(m.scoreA) : Number(m.scoreB);
      const gc  = isA ? Number(m.scoreB) : Number(m.scoreA);
      BM+=gf; BE+=gc;
      if(gf>gc) V++; else if(gf<gc) D++; else N++;
    });
    const el = document.getElementById(`stats_${team}`);
    if (!el) return;
    const tName = DB.teams[team]?.name||team;
    const cls   = team==='rouge'?'rouge':'blanc';
    el.innerHTML = `
      <div class="card" style="border-color:var(--${team==='rouge'?'rouge':'blanc'});border-width:1px">
        <div class="card-title" style="color:var(--${team==='rouge'?'rouge':'blanc'})">${team==='rouge'?'🔴':'🔵'} ${tName}</div>
        <div class="grid-5" style="gap:10px">
          <div class="stat-box ${cls}"><div class="stat-val">${teamMs.length}</div><div class="stat-lbl">Matchs</div></div>
          <div class="stat-box ${cls}"><div class="stat-val">${V}</div><div class="stat-lbl">Victoires</div></div>
          <div class="stat-box"><div class="stat-val">${N}</div><div class="stat-lbl" style="color:var(--gold)">Nuls</div></div>
          <div class="stat-box"><div class="stat-val" style="color:var(--rouge)">${D}</div><div class="stat-lbl">Défaites</div></div>
          <div class="stat-box gold"><div class="stat-val">${BM}</div><div class="stat-lbl">Buts</div></div>
        </div>
      </div>`;
  });
}

function renderContre() {
  const year = DB.currentYear;
  const ms = DB.matches.filter(m => m.year===year && m.type==='Contre' && m.statut==='Joué');
  const el = document.getElementById('contreStats');
  if (!el) return;

  const opponents = {};
  ms.forEach(m => {
    const isRougeA = m.equipeA==='rouge'||m.equipeA==='blanc';
    const opp = isRougeA ? (m.equipeB==='rouge'||m.equipeB==='blanc' ? null : m.equipeB) : m.equipeA;
    if (!opp) return;
    const won = m.equipeA==='rouge'||m.equipeA==='blanc' ? m.scoreA>m.scoreB : m.scoreB>m.scoreA;
    const draw = m.scoreA===m.scoreB;
    if (!opponents[opp]) opponents[opp] = { p:0, v:0, n:0, d:0 };
    opponents[opp].p++;
    if(draw) opponents[opp].n++;
    else if(won) opponents[opp].v++;
    else opponents[opp].d++;
  });

  el.innerHTML = `
    <div class="grid-4" style="margin-bottom:20px">
      <div class="stat-box"><div class="stat-val">${ms.length}</div><div class="stat-lbl">Contres Joués</div></div>
      <div class="stat-box gold"><div class="stat-val">${ms.filter(m=>{const isA=m.equipeA==='rouge'||m.equipeA==='blanc';return isA?m.scoreA>m.scoreB:m.scoreB>m.scoreA}).length}</div><div class="stat-lbl">Gagnés</div></div>
      <div class="stat-box"><div class="stat-val" style="color:var(--gold)">${ms.filter(m=>m.scoreA===m.scoreB).length}</div><div class="stat-lbl">Nuls</div></div>
      <div class="stat-box"><div class="stat-val" style="color:var(--rouge)">${ms.filter(m=>{const isA=m.equipeA==='rouge'||m.equipeA==='blanc';return isA?m.scoreA<m.scoreB:m.scoreB<m.scoreA}).length}</div><div class="stat-lbl">Perdus</div></div>
    </div>
    ${Object.keys(opponents).length ? `<div class="table-wrap"><table><thead><tr><th>Adversaire</th><th>J</th><th>V</th><th>N</th><th>D</th></tr></thead>
    <tbody>${Object.entries(opponents).map(([opp,s])=>`<tr><td class="team-ext">${opp}</td><td>${s.p}</td><td style="color:var(--green-bright)">${s.v}</td><td style="color:var(--gold)">${s.n}</td><td style="color:var(--rouge)">${s.d}</td></tr>`).join('')}</tbody>
    </table></div>` : '<div class="empty"><div class="ei">🏟️</div><p>Aucun contre encore joué</p></div>'}`;
}

/* ═══════════════════════════════════════════════════════════════
   CLASSEMENTS
   ═══════════════════════════════════════════════════════════════ */
let classTab = 'annuel';

function renderClassements() {
  renderTopButs();
  renderTopPasses();
  renderTopMVP();
}

function filterByPeriode(ms, periode) {
  const now = new Date();
  return ms.filter(m => {
    const d = new Date(m.date+'T12:00:00');
    if (periode==='semaine') {
      const diff = (now-d)/(1000*86400);
      return diff <= 7;
    }
    if (periode==='mois') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    if (periode==='trimestre') {
      const q = Math.floor(d.getMonth()/3);
      const qn = Math.floor(now.getMonth()/3);
      return q===qn && d.getFullYear()===now.getFullYear();
    }
    return m.year===DB.currentYear; // annuel
  });
}

function renderTopButs() {
  const el = document.getElementById('topButsList');
  if (!el) return;
  const periode = document.getElementById('tabButs')?.value || 'annuel';
  const ms = filterByPeriode(DB.matches.filter(m=>m.statut==='Joué'), periode);
  const buts = {};
  ms.forEach(m => (m.goals||[]).forEach(g => {
    if(g.buteur && g.buteur!=='Buteur inconnu') buts[g.buteur]=(buts[g.buteur]||0)+1;
  }));
  const arr = Object.entries(buts).sort((a,b)=>b[1]-a[1]).slice(0,15);
  if (!arr.length) { el.innerHTML='<div class="empty"><div class="ei">⚽</div><p>Aucun but enregistré</p></div>'; return; }
  el.innerHTML = '<div class="rank-list">' + arr.map(([name,cnt],i) => `
    <div class="rank-item">
      <div class="rank-pos ${i<3?'pos-'+(i+1):'pos-n'}">${i+1}</div>
      <div style="flex:1"><div class="rank-name">${name}</div><div class="rank-team">${getPlayerTeamName(name)}</div></div>
      <div class="rank-val">⚽ ${cnt}</div>
    </div>`).join('') + '</div>';
}

function renderTopPasses() {
  const el = document.getElementById('topPassesList');
  if (!el) return;
  const periode = document.getElementById('tabPasses')?.value || 'annuel';
  const ms = filterByPeriode(DB.matches.filter(m=>m.statut==='Joué'), periode);
  const passes = {};
  ms.forEach(m => (m.goals||[]).forEach(g => {
    if(g.passeur && g.passeur!=='NC' && g.passeur!=='Buteur inconnu') passes[g.passeur]=(passes[g.passeur]||0)+1;
  }));
  const arr = Object.entries(passes).sort((a,b)=>b[1]-a[1]).slice(0,15);
  if (!arr.length) { el.innerHTML='<div class="empty"><div class="ei">🎯</div><p>Aucune passe enregistrée</p></div>'; return; }
  el.innerHTML = '<div class="rank-list">' + arr.map(([name,cnt],i) => `
    <div class="rank-item">
      <div class="rank-pos ${i<3?'pos-'+(i+1):'pos-n'}">${i+1}</div>
      <div style="flex:1"><div class="rank-name">${name}</div><div class="rank-team">${getPlayerTeamName(name)}</div></div>
      <div class="rank-val" style="color:var(--green-neon)">🎯 ${cnt}</div>
    </div>`).join('') + '</div>';
}

function renderTopMVP() {
  const el = document.getElementById('topMVPList');
  if (!el) return;
  const ms = DB.matches.filter(m=>m.year===DB.currentYear&&m.statut==='Joué');
  const mvpC = {};
  ms.forEach(m => { if(m.mvp) mvpC[m.mvp]=(mvpC[m.mvp]||0)+1; });
  const arr = Object.entries(mvpC).sort((a,b)=>b[1]-a[1]).slice(0,10);
  if (!arr.length) { el.innerHTML='<div class="empty"><div class="ei">🏆</div><p>Aucun MVP encore</p></div>'; return; }
  el.innerHTML = '<div class="rank-list">' + arr.map(([name,cnt],i) => `
    <div class="rank-item">
      <div class="rank-pos ${i<3?'pos-'+(i+1):'pos-n'}">${['🥇','🥈','🥉',i+1][Math.min(i,3)]}</div>
      <div style="flex:1"><div class="rank-name">${name}</div><div class="rank-team">${getPlayerTeamName(name)}</div></div>
      <div class="rank-val or">🏆 ${cnt}</div>
    </div>`).join('') + '</div>';
}

/* ═══════════════════════════════════════════════════════════════
   SANCTIONS
   ═══════════════════════════════════════════════════════════════ */
function renderSanctions() {
  const el = document.getElementById('sanctionsList');
  if (!el) return;
  let list = [...(DB.sanctions||[])];
  const canEdit = CU && CU.role !== 'obs';

  if (!list.length) { el.innerHTML='<div class="empty"><div class="ei">✅</div><p>Aucune sanction</p></div>'; return; }

  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Joueur</th><th>Équipe</th><th>Matchs</th><th>Motif</th><th>Date</th>${canEdit?'<th>Actions</th>':''}</tr></thead>
    <tbody>${list.map(s=>`<tr>
      <td style="font-weight:600">${s.joueur}</td>
      <td class="${s.equipe==='rouge'?'team-rouge':'team-blanc'}">${DB.teams[s.equipe]?.name||s.equipe}</td>
      <td style="font-family:var(--font-display);font-size:20px;color:${s.matchs>=3?'var(--rouge)':s.matchs===2?'var(--gold)':'var(--green-bright)'}">${s.matchs}</td>
      <td>${s.motif}</td>
      <td style="font-size:11px;color:var(--text-ghost);font-family:var(--font-mono)">${fmtDate(s.date)}</td>
      ${canEdit?`<td><div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-xs" onclick="editSanctionOpen(${s.id})">✏️</button>
        ${CU.role==='super'?`<button class="btn btn-danger btn-xs" onclick="deleteSanction(${s.id})">🗑</button>`:''}
      </div></td>`:''}
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function openAddSanction() {
  editingSanction = null;
  document.getElementById('sFJoueur').value='';
  document.getElementById('sFEquipe').value='rouge';
  document.getElementById('sFMatchs').value='1';
  document.getElementById('sFMotif').value='';
  document.getElementById('sFDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('sanctionModal').classList.remove('hidden');
}

function editSanctionOpen(id) {
  const s = DB.sanctions.find(x=>x.id===id);
  if (!s) return;
  editingSanction=id;
  document.getElementById('sFJoueur').value=s.joueur;
  document.getElementById('sFEquipe').value=s.equipe;
  document.getElementById('sFMatchs').value=s.matchs;
  document.getElementById('sFMotif').value=s.motif;
  document.getElementById('sFDate').value=s.date;
  document.getElementById('sanctionModal').classList.remove('hidden');
}

function saveSanction() {
  const joueur=document.getElementById('sFJoueur').value.trim();
  const equipe=document.getElementById('sFEquipe').value;
  const matchs=Number(document.getElementById('sFMatchs').value);
  const motif=document.getElementById('sFMotif').value.trim();
  const date=document.getElementById('sFDate').value;
  if(!joueur||!motif||!date||matchs<1){notify('Tous les champs sont requis','err');return;}
  if(!DB.nextIds) DB.nextIds={match:DB.matches.length+1,player:DB.players.length+1,sanction:DB.sanctions.length+1};
  if(editingSanction!==null){
    const idx=DB.sanctions.findIndex(s=>s.id===editingSanction);
    if(idx>=0) DB.sanctions[idx]={...DB.sanctions[idx],joueur,equipe,matchs,motif,date};
    notify('✅ Sanction mise à jour');
  } else {
    if(!DB.sanctions)DB.sanctions=[];
    DB.sanctions.push({id:DB.nextIds.sanction++,joueur,equipe,matchs,motif,date});
    notify('✅ Sanction ajoutée');
  }
  saveDB();
  closeSanctionModal();
  renderSanctions();
}

function deleteSanction(id){
  if(CU?.role!=='super'){notify('Permission refusée','err');return;}
  if(!confirm('Supprimer cette sanction ?'))return;
  DB.sanctions=DB.sanctions.filter(s=>s.id!==id);
  saveDB();renderSanctions();notify('Sanction supprimée');
}
function closeSanctionModal(){document.getElementById('sanctionModal').classList.add('hidden');}

/* ═══════════════════════════════════════════════════════════════
   HISTORIQUE
   ═══════════════════════════════════════════════════════════════ */
function renderHistorique() {
  if(CU?.role!=='super'){
    document.getElementById('sec-historique').innerHTML=`<div class="empty"><div class="ei">🔒</div><p>Accès réservé au Super Administrateur</p></div>`;
    return;
  }
  const el=document.getElementById('histoContent');
  if(!el)return;
  const list=[...(DB.loginHistory||[])].reverse().slice(0,100);
  if(!list.length){el.innerHTML='<div class="empty"><div class="ei">📜</div><p>Aucune activité</p></div>';return;}
  el.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>Date/Heure</th><th>Utilisateur</th><th>Action</th><th>Détails</th></tr></thead>
    <tbody>${list.map(h=>`<tr>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-ghost)">${h.ts}</td>
      <td style="font-weight:600;color:var(--gold)">${h.user}</td>
      <td>${h.action}</td>
      <td style="font-size:12px;color:var(--text-ghost)">${h.details||''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function _logHistory(action, user, details='') {
  if(!DB.loginHistory) DB.loginHistory=[];
  DB.loginHistory.push({ ts:new Date().toLocaleString('fr-FR'), user:user||'Système', action, details });
  if(DB.loginHistory.length>500) DB.loginHistory=DB.loginHistory.slice(-500);
  saveDB();
}

/* ═══════════════════════════════════════════════════════════════
   GESTION ANNÉES
   ═══════════════════════════════════════════════════════════════ */
function createNewYear() {
  if(CU?.role!=='super'){notify('Réservé au Super Admin','err');return;}
  const year=prompt('Entrez la nouvelle année (ex: 2026) :');
  if(!year||isNaN(year)){notify('Année invalide','err');return;}
  if(DB.years.includes(year)){notify('Cette année existe déjà','warn');return;}
  DB.years.push(year);
  DB.years.sort((a,b)=>b-a);
  DB.currentYear=year;
  saveDB();
  updateYearSelector();
  notify(`✅ Année ${year} créée !`);
}

function updateYearSelector() {
  const sel=document.getElementById('yearSel');
  if(!sel)return;
  sel.innerHTML=DB.years.map(y=>`<option value="${y}" ${y===DB.currentYear?'selected':''}>${y}</option>`).join('');
}

function changeYear(y) {
  DB.currentYear=y;
  saveDB();
  if(activeSection==='accueil') renderAccueil();
  else if(activeSection==='matchs') renderMatchList();
  else if(activeSection==='stats') renderStats();
  else if(activeSection==='classements') renderClassements();
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════════════════════ */
function exportCSV() {
  const year=DB.currentYear;
  const ms=DB.matches.filter(m=>m.year===year);
  const headers=['Date','Jour','Type','Equipe A','Equipe B','Score A','Score B','Lieu','MVP','Statut','Notes'];
  const rows=ms.map(m=>[
    m.date, getJour(m.date), m.type,
    DB.teams[m.equipeA]?.name||m.equipeA,
    DB.teams[m.equipeB]?.name||m.equipeB,
    m.scoreA, m.scoreB, m.lieu, m.mvp||'', m.statut, m.notes||''
  ]);
  const csv=[headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile(`bmm_matchs_${year}.csv`, 'text/csv', csv);
  notify('Export CSV téléchargé');
}

function exportJSON() {
  const data=JSON.stringify(DB, null, 2);
  downloadFile(`bmm_export_${DB.currentYear}.json`, 'application/json', data);
  notify('Export JSON téléchargé');
}

function downloadFile(name, type, content) {
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type}));
  a.download=name;
  a.click();
}

/* ═══════════════════════════════════════════════════════════════
   UTILITAIRES UI
   ═══════════════════════════════════════════════════════════════ */
function set(id, html) { const el=document.getElementById(id); if(el) el.innerHTML=html; }

function eventBadge(type) {
  const map = {
    'Big Match':'badge-bigmatch','Contre':'badge-contre',
    'Classico':'badge-classico','Match de gala':'badge-gala'
  };
  return `<span class="badge ${map[type]||''}">${type||'—'}</span>`;
}

function notify(msg, type='') {
  const n=document.getElementById('notif');
  if(!n)return;
  const icons={err:'❌','warn':'⚠️','':''};
  n.innerHTML=(icons[type]?`<span>${icons[type]}</span>`:'')+'<span>'+msg+'</span>';
  n.className='notif'+(type?' '+type:'')+' show';
  clearTimeout(n._t);
  n._t=setTimeout(()=>n.classList.remove('show'),3500);
}

function setupAutocomplete() {
  // Sera appelé à nouveau sur les champs dynamiques
  document.querySelectorAll('.autocomplete-wrap').forEach(wrap => setupAutocompleteField(wrap));
}

function setupAutocompleteField(wrap) {
  // Natif avec <datalist>, donc rien à faire de spécial
  // Mais on gère le "créer nouveau joueur" si le nom n'existe pas encore
}

/* ═══════════════════════════════════════════════════════════════
   GESTION JOUEURS (depuis l'admin)
   ═══════════════════════════════════════════════════════════════ */
function openPlayersModal() {
  const el=document.getElementById('playersList');
  if(!el)return;
  el.innerHTML=DB.players.map(p=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:var(--r);border:1px solid var(--border);margin-bottom:6px">
      <span class="user-dot ${p.team==='rouge'?'dot-rouge':'dot-blanc'}"></span>
      <span style="flex:1;font-weight:600">${p.name}</span>
      <span style="font-size:11px;color:var(--text-ghost)">${DB.teams[p.team]?.name||p.team}</span>
      ${CU?.role==='super'?`<button class="btn btn-danger btn-xs" onclick="deletePlayer(${p.id})">🗑</button>`:''}
    </div>`).join('') || '<div class="empty"><div class="ei">👤</div><p>Aucun joueur</p></div>';
  document.getElementById('playersModal').classList.remove('hidden');
}

function addPlayer() {
  const name=document.getElementById('newPlayerName')?.value?.trim();
  const team=document.getElementById('newPlayerTeam')?.value||'rouge';
  if(!name){notify('Nom requis','err');return;}
  if(DB.players.find(p=>p.name.toLowerCase()===name.toLowerCase())){notify('Ce joueur existe déjà','warn');return;}
  if(!DB.nextIds)DB.nextIds={match:DB.matches.length+1,player:DB.players.length+1,sanction:DB.sanctions.length+1};
  DB.players.push({id:DB.nextIds.player++,name,team,aliases:[]});
  saveDB();
  document.getElementById('newPlayerName').value='';
  openPlayersModal();
  notify('Joueur ajouté');
}

function deletePlayer(id){
  if(CU?.role!=='super')return;
  DB.players=DB.players.filter(p=>p.id!==id);
  saveDB();
  openPlayersModal();
  notify('Joueur supprimé');
}

function closeMatchModal(){document.getElementById('matchModal')?.classList.add('hidden');}
function closePlayersModal(){document.getElementById('playersModal')?.classList.add('hidden');}

/* On expose pour le HTML inline */
window.selectRole=selectRole;window.doLogin=doLogin;window.togglePwd=togglePwd;window.logout=logout;
window.showSection=showSection;window.openEditMatch=openEditMatch;window.deleteMatch=deleteMatch;
window.saveMatch=saveMatch;window.updateScorerFields=updateScorerFields;
window.renderTopButs=renderTopButs;window.renderTopPasses=renderTopPasses;window.renderTopMVP=renderTopMVP;
window.openAddSanction=openAddSanction;window.editSanctionOpen=editSanctionOpen;
window.saveSanction=saveSanction;window.deleteSanction=deleteSanction;window.closeSanctionModal=closeSanctionModal;
window.createNewYear=createNewYear;window.changeYear=changeYear;window.updateYearSelector=updateYearSelector;
window.exportCSV=exportCSV;window.exportJSON=exportJSON;
window.openPlayersModal=openPlayersModal;window.addPlayer=addPlayer;window.deletePlayer=deletePlayer;
window.closePlayersModal=closePlayersModal;window.closeMatchModal=closeMatchModal;
window.setMatchSort=setMatchSort;window.toggleMatchOrder=toggleMatchOrder;
window.filterByPeriode=filterByPeriode;
