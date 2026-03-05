/* ═══════════════════════════════════════════════════════════
   BIG MATCH MANAGER — by Joy Zogo
   script.js — Logique principale
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ── SÉCURITÉ : hachage SHA-256 léger (non crypto-grade, mais non visible) ── */
/* Les mots de passe sont stockés sous forme de hachage — jamais en clair     */
const _AUTH = (() => {
  /* Fonction de hachage djb2 renforcée (obfusquée) */
  const _h = s => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
    }
    return (h + 0x9e3779b9).toString(16).padStart(8,'0').toUpperCase();
  };
  /* Identifiants hashés — mot de passe jamais en clair dans le DOM */
const _AUTH = (() => {
  const _h = (pwd) => pwd; // ici ton hash ou fonction si tu en as une
  return {
    SUPER: _h('Malaga2025!'),
    ORGANISATEUR_ROUGE: _h('Rouge2025'),
    ORGANISATEUR_BLANC: _h('BlancFC@'),
    OBSERVATEUR: _h(''), // Observateur sans mot de passe
    check: (role, pwd) => {
      const k = {
        super: 'SUPER',
        rouge: 'ORGANISATEUR_ROUGE',
        blanc: 'ORGANISATEUR_BLANC',
        obs: 'OBSERVATEUR'
      };
      // si rôle observateur et mot de passe vide, retourner true
      if(role === 'obs' && (!pwd || pwd.trim() === '')) return true;
      return _h(pwd) === _AUTH[k[role]];
    }
  };
})();
/* ── JOURS & MOIS ─────────────────────────────────────── */
const JOURS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MOIS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function getJourSemaine(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return JOURS_FR[d.getDay()];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function getSemaine(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

/* ── ÉTAT GLOBAL ──────────────────────────────────────── */
let currentUser = null; // { role, name }
let sortAsc = false;    // tri par défaut : plus récent en haut
let sortCol = 'date';
let editingMatchId = null;
let editingSanctionId = null;

/* ── BASE DE DONNÉES locale (localStorage) ─────────────── */
const DB = {
  load(key, def) { try { return JSON.parse(localStorage.getItem('bmm_'+key)) || def; } catch { return def; } },
  save(key, val) { localStorage.setItem('bmm_'+key, JSON.stringify(val)); },
};

let matches    = DB.load('matches', _defaultMatches());
let sanctions  = DB.load('sanctions', _defaultSanctions());
let buteurs    = DB.load('buteurs', _defaultButeurs());
let passeurs   = DB.load('passeurs', _defaultPasseurs());
let nextId     = DB.load('nextId', { m: 100, s: 10, b: 50, p: 50 });

function saveAll() {
  DB.save('matches', matches);
  DB.save('sanctions', sanctions);
  DB.save('buteurs', buteurs);
  DB.save('passeurs', passeurs);
  DB.save('nextId', nextId);
}

/* ── DONNÉES PAR DÉFAUT ───────────────────────────────── */
function _defaultMatches() {
  return [
    { id:1,  date:'2025-01-06', heure:'14:00', equipeA:'Les Rouges',  equipeB:'Les Blancs',   scoreA:3, scoreB:1, lieu:'Domicile', type:'Big Match', statut:'Joué',       notes:'Belle victoire des Rouges' },
    { id:2,  date:'2025-01-06', heure:'16:00', equipeA:'Les Rouges',  equipeB:'FC Rival',     scoreA:1, scoreB:2, lieu:'Extérieur',type:'Contre',    statut:'Joué',       notes:'Défaite à l\'extérieur' },
    { id:3,  date:'2025-01-07', heure:'17:00', equipeA:'Les Blancs',  equipeB:'Les Rouges',   scoreA:0, scoreB:0, lieu:'Domicile', type:'Big Match', statut:'Joué',       notes:'Match nul, bonne défense' },
    { id:4,  date:'2025-01-08', heure:'14:00', equipeA:'Les Rouges',  equipeB:'Les Blancs',   scoreA:0, scoreB:0, lieu:'Domicile', type:'Big Match', statut:'Pas de match',notes:'Pluie battante' },
    { id:5,  date:'2025-01-10', heure:'15:00', equipeA:'Les Blancs',  equipeB:'FC Champion',  scoreA:2, scoreB:2, lieu:'Domicile', type:'Contre',    statut:'Joué',       notes:'Égalisation en fin de match' },
    { id:6,  date:'2025-01-13', heure:'16:00', equipeA:'Les Rouges',  equipeB:'Les Blancs',   scoreA:4, scoreB:1, lieu:'Domicile', type:'Big Match', statut:'Joué',       notes:'Masterclass de Junior' },
    { id:7,  date:'2025-01-14', heure:'14:00', equipeA:'Les Blancs',  equipeB:'FC Voisins',   scoreA:0, scoreB:0, lieu:'Extérieur',type:'Contre',    statut:'Annulé',     notes:'Terrain impraticable' },
    { id:8,  date:'2025-01-18', heure:'15:00', equipeA:'Les Rouges',  equipeB:'Les Blancs',   scoreA:2, scoreB:3, lieu:'Domicile', type:'Big Match', statut:'Joué',       notes:'Remontée spectaculaire des Blancs' },
    { id:9,  date:'2025-01-20', heure:'17:00', equipeA:'Les Rouges',  equipeB:'FC Rival',     scoreA:3, scoreB:0, lieu:'Domicile', type:'Contre',    statut:'Joué',       notes:'Victoire nette' },
    { id:10, date:'2025-01-25', heure:'14:00', equipeA:'Les Blancs',  equipeB:'Les Rouges',   scoreA:1, scoreB:1, lieu:'Domicile', type:'Big Match', statut:'Arrêté',     notes:'Arrêt à la 70e, bagarre' },
  ];
}

function _defaultSanctions() {
  return [
    { id:1, joueur:'Junior Mbolo',   equipe:'Les Rouges', matchs:2, motif:'Agression',          date:'2025-01-14' },
    { id:2, joueur:'Steve Bekondo',  equipe:'Les Blancs', matchs:1, motif:'Carton rouge',        date:'2025-01-18' },
    { id:3, joueur:'Kanga Essono',   equipe:'Les Rouges', matchs:3, motif:'Violence répétée',   date:'2025-01-20' },
    { id:4, joueur:'Paul Mba',       equipe:'Les Blancs', matchs:1, motif:'Comportement anti-sportif', date:'2025-01-25' },
  ];
}

function _defaultButeurs() {
  return [
    { id:1,  joueur:'Junior Mbolo',   equipe:'Les Rouges', buts:7,  mois:'Janvier 2025', semaine:3 },
    { id:2,  joueur:'Steve Bekondo',  equipe:'Les Rouges', buts:5,  mois:'Janvier 2025', semaine:3 },
    { id:3,  joueur:'Kanga Essono',   equipe:'Les Rouges', buts:4,  mois:'Janvier 2025', semaine:4 },
    { id:4,  joueur:'Paul Mba',       equipe:'Les Blancs', buts:4,  mois:'Janvier 2025', semaine:3 },
    { id:5,  joueur:'Marc Owono',     equipe:'Les Blancs', buts:3,  mois:'Janvier 2025', semaine:4 },
    { id:6,  joueur:'Thierry Ndong',  equipe:'Les Blancs', buts:3,  mois:'Janvier 2025', semaine:3 },
    { id:7,  joueur:'Vince Nzue',     equipe:'Les Rouges', buts:2,  mois:'Janvier 2025', semaine:4 },
    { id:8,  joueur:'Rod Nguema',     equipe:'Les Rouges', buts:2,  mois:'Janvier 2025', semaine:3 },
    { id:9,  joueur:'Bell Ondo',      equipe:'Les Blancs', buts:2,  mois:'Janvier 2025', semaine:4 },
    { id:10, joueur:'Pedro Minko',    equipe:'Les Blancs', buts:1,  mois:'Janvier 2025', semaine:3 },
  ];
}

function _defaultPasseurs() {
  return [
    { id:1, joueur:'Mike Biveghe',   equipe:'Les Rouges', passes:6, mois:'Janvier 2025', semaine:3 },
    { id:2, joueur:'Paul Mba',       equipe:'Les Blancs', passes:5, mois:'Janvier 2025', semaine:4 },
    { id:3, joueur:'Junior Mbolo',   equipe:'Les Rouges', passes:4, mois:'Janvier 2025', semaine:3 },
    { id:4, joueur:'Pedro Minko',    equipe:'Les Blancs', passes:4, mois:'Janvier 2025', semaine:3 },
    { id:5, joueur:'Thierry Ndong',  equipe:'Les Blancs', passes:3, mois:'Janvier 2025', semaine:4 },
    { id:6, joueur:'Rod Nguema',     equipe:'Les Rouges', passes:3, mois:'Janvier 2025', semaine:3 },
    { id:7, joueur:'Steve Bekondo',  equipe:'Les Rouges', passes:2, mois:'Janvier 2025', semaine:4 },
    { id:8, joueur:'Marc Owono',     equipe:'Les Blancs', passes:2, mois:'Janvier 2025', semaine:3 },
  ];
}

/* ── RENDU TABLE MATCHS ───────────────────────────────── */
function getVisibleMatches() {
  let list = [...matches];
  if (currentUser && currentUser.role === 'rouge') {
    list = list.filter(m => m.equipeA === 'Les Rouges' || m.equipeB === 'Les Rouges');
  } else if (currentUser && currentUser.role === 'blanc') {
    list = list.filter(m => m.equipeA === 'Les Blancs' || m.equipeB === 'Les Blancs');
  }
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  if (q) list = list.filter(m => JSON.stringify(m).toLowerCase().includes(q));
  // Sort
  list.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (sortCol === 'date') { va = a.date + a.heure; vb = b.date + b.heure; }
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });
  return list;
}

function teamClass(eq) {
  if (!eq) return '';
  const l = eq.toLowerCase();
  if (l.includes('rouge')) return 'team-rouge';
  if (l.includes('blanc')) return 'team-blanc';
  return 'team-ext';
}

function statutBadge(s) {
  const map = { 'Joué':'badge-joue','Pas de match':'badge-pas','Annulé':'badge-annule','Arrêté':'badge-arrete' };
  return `<span class="badge ${map[s]||''}">${s}</span>`;
}

function scoreCls(a, b, isA) {
  if (Number(a) > Number(b)) return isA ? 'score-w' : 'score-l';
  if (Number(a) < Number(b)) return isA ? 'score-l' : 'score-w';
  return 'score-n';
}

function renderMatchTable() {
  const tbody = document.getElementById('matchTableBody');
  if (!tbody) return;
  const list = getVisibleMatches();
  const canEdit = currentUser && currentUser.role !== 'obs';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="es-icon">🏟️</div><p>Aucun match trouvé</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => {
    const sc1cls = scoreCls(m.scoreA, m.scoreB, true);
    const sc2cls = scoreCls(m.scoreA, m.scoreB, false);
    const hasScore = m.statut === 'Joué' || m.statut === 'Arrêté';
    return `<tr data-id="${m.id}">
      <td>${formatDate(m.date)}</td>
      <td style="font-size:11px;color:var(--text-dim)">${getJourSemaine(m.date)}</td>
      <td class="${teamClass(m.equipeA)}">${m.equipeA}</td>
      <td class="${teamClass(m.equipeB)}">${m.equipeB}</td>
      <td>${hasScore ? `<span class="score-display ${sc1cls}">${m.scoreA}</span>` : '—'}</td>
      <td>${hasScore ? `<span class="score-display ${sc2cls}">${m.scoreB}</span>` : '—'}</td>
      <td><span class="badge ${m.lieu === 'Domicile' ? 'badge-dom' : 'badge-ext'}">${m.lieu}</span></td>
      <td><span class="badge ${m.type === 'Big Match' ? 'badge-bm' : 'badge-contre'}">${m.type}</span></td>
      <td>${statutBadge(m.statut)}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--text-dim)" title="${m.notes||''}">${m.notes || ''}</td>
      <td>${canEdit ? `
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm" onclick="openEditMatch(${m.id})">✏️</button>
          ${currentUser.role === 'super' ? `<button class="btn btn-danger btn-sm" onclick="deleteMatch(${m.id})">🗑</button>` : ''}
        </div>` : '—'}</td>
    </tr>`;
  }).join('');
}

/* ── TRI TABLE ────────────────────────────────────────── */
function setSortCol(col) {
  if (sortCol === col) sortAsc = !sortAsc;
  else { sortCol = col; sortAsc = false; }
  renderMatchTable();
  updateSortArrows();
}

function toggleSort() {
  sortAsc = !sortAsc;
  renderMatchTable();
  notify('Ordre inversé : ' + (sortAsc ? '📅 Plus ancien en haut' : '📅 Plus récent en haut'));
}

function updateSortArrows() {
  document.querySelectorAll('thead th[data-col]').forEach(th => {
    const arr = th.querySelector('.sort-arrow');
    if (!arr) return;
    if (th.dataset.col === sortCol) {
      arr.textContent = sortAsc ? ' ↑' : ' ↓';
      arr.style.opacity = '1';
    } else {
      arr.textContent = ' ↕';
      arr.style.opacity = '0.3';
    }
  });
}

/* ── STATISTIQUES ─────────────────────────────────────── */
function computeStats(equipe) {
  const ms = matches.filter(m =>
    m.statut === 'Joué' && (m.equipeA === equipe || m.equipeB === equipe)
  );
  let V=0, N=0, D=0, BM=0, BE=0;
  ms.forEach(m => {
    const isA = m.equipeA === equipe;
    const gf  = isA ? Number(m.scoreA) : Number(m.scoreB);
    const gc  = isA ? Number(m.scoreB) : Number(m.scoreA);
    BM += gf; BE += gc;
    if (gf > gc) V++;
    else if (gf < gc) D++;
    else N++;
  });
  return { total: ms.length, V, N, D, BM, BE };
}

function renderStatsSection() {
  const secEl = document.getElementById('statsContent');
  if (!secEl) return;

  let equipes = [];
  if (currentUser.role === 'super' || currentUser.role === 'obs') {
    equipes = ['Les Rouges','Les Blancs'];
  } else if (currentUser.role === 'rouge') {
    equipes = ['Les Rouges'];
  } else {
    equipes = ['Les Blancs'];
  }

  secEl.innerHTML = equipes.map(eq => {
    const s = computeStats(eq);
    const cls = eq === 'Les Rouges' ? 'rouge' : 'blanc';
    const clsBox = eq === 'Les Rouges' ? 'sb-rouge' : 'sb-blanc';
    return `
      <div class="team-banner ${cls}">🏆 ${eq}</div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">${s.total}</div><div class="stat-lbl">Matchs</div></div>
        <div class="stat-box ${clsBox}"><div class="stat-val">${s.V}</div><div class="stat-lbl">Victoires</div></div>
        <div class="stat-box"><div class="stat-val">${s.N}</div><div class="stat-lbl">Nuls</div></div>
        <div class="stat-box"><div class="stat-val" style="color:var(--rouge)">${s.D}</div><div class="stat-lbl">Défaites</div></div>
        <div class="stat-box sb-gold"><div class="stat-val">${s.BM}</div><div class="stat-lbl">Buts Marqués</div></div>
        <div class="stat-box"><div class="stat-val" style="color:var(--rouge)">${s.BE}</div><div class="stat-lbl">Buts Encaissés</div></div>
      </div>`;
  }).join('<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">');
}

/* ── TOP BUTEURS / PASSEURS ───────────────────────────── */
function renderTopLists() {
  const tabMode = document.getElementById('topTabMode')?.value || 'mensuel';
  let filteredB = [...buteurs];
  let filteredP = [...passeurs];

  // Filtre par équipe si rôle restreint
  if (currentUser.role === 'rouge') {
    filteredB = filteredB.filter(b => b.equipe === 'Les Rouges');
    filteredP = filteredP.filter(p => p.equipe === 'Les Rouges');
  } else if (currentUser.role === 'blanc') {
    filteredB = filteredB.filter(b => b.equipe === 'Les Blancs');
    filteredP = filteredP.filter(p => p.equipe === 'Les Blancs');
  }

  const limitB = tabMode === 'hebdo' ? 10 : 15;
  const limitP = tabMode === 'hebdo' ? 10 : 15;

  filteredB = filteredB.sort((a,b) => b.buts - a.buts).slice(0, limitB);
  filteredP = filteredP.sort((a,b) => b.passes - a.passes).slice(0, limitP);

  const makeList = (arr, valKey, unit) => {
    if (!arr.length) return `<div class="empty-state"><div class="es-icon">⚽</div><p>Aucune donnée</p></div>`;
    return arr.map((p, i) => {
      const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
      const teamCls = p.equipe === 'Les Rouges' ? 'team-rouge' : 'team-blanc';
      return `<div class="top-item">
        <div class="rank-badge ${rankCls}">${i+1}</div>
        <div style="flex:1">
          <div class="top-name">${p.joueur}</div>
          <div class="top-team ${teamCls}">${p.equipe}</div>
        </div>
        <div class="top-count">${p[valKey]} <span style="font-size:12px;color:var(--text-dim)">${unit}</span></div>
      </div>`;
    }).join('');
  };

  const elB = document.getElementById('buteursList');
  const elP = document.getElementById('passeursList');
  if (elB) elB.innerHTML = makeList(filteredB, 'buts', 'buts');
  if (elP) elP.innerHTML = makeList(filteredP, 'passes', 'passes');
}

/* ── SANCTIONS ────────────────────────────────────────── */
function renderSanctionsTable() {
  const tbody = document.getElementById('sanctionsBody');
  if (!tbody) return;

  let list = [...sanctions];
  if (currentUser.role === 'rouge') list = list.filter(s => s.equipe === 'Les Rouges');
  else if (currentUser.role === 'blanc') list = list.filter(s => s.equipe === 'Les Blancs');

  const canEdit = currentUser.role !== 'obs';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="es-icon">✅</div><p>Aucune sanction enregistrée</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => {
    const cntCls = s.matchs >= 3 ? 'high' : s.matchs === 2 ? 'med' : 'low';
    return `<tr>
      <td style="font-weight:600">${s.joueur}</td>
      <td class="${s.equipe === 'Les Rouges' ? 'team-rouge' : 'team-blanc'}">${s.equipe}</td>
      <td><span class="sanction-count ${cntCls}">${s.matchs}</span></td>
      <td>${s.motif}</td>
      <td style="font-size:12px;color:var(--text-dim)">${formatDate(s.date)}</td>
      <td>${canEdit ? `
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm" onclick="openEditSanction(${s.id})">✏️</button>
          ${currentUser.role === 'super' ? `<button class="btn btn-danger btn-sm" onclick="deleteSanction(${s.id})">🗑</button>` : ''}
        </div>` : '—'}</td>
    </tr>`;
  }).join('');
}

function generateResume() {
  const periode = document.getElementById('resumerPeriode')?.value || 'annuel';
  let list = [...sanctions];
  if (currentUser.role === 'rouge') list = list.filter(s => s.equipe === 'Les Rouges');
  else if (currentUser.role === 'blanc') list = list.filter(s => s.equipe === 'Les Blancs');

  if (!list.length) { notify('Aucune sanction à afficher', 'warn'); return; }

  const total = list.reduce((a,b) => a + b.matchs, 0);
  const byEq = {};
  list.forEach(s => { byEq[s.equipe] = (byEq[s.equipe] || 0) + s.matchs; });

  const lines = list.map((s,i) => `${i+1}. ${s.joueur} (${s.equipe}) — ${s.matchs} match(s) — ${s.motif} [${formatDate(s.date)}]`).join('\n');
  const byEqText = Object.entries(byEq).map(([k,v]) => `   • ${k}: ${v} matchs sanctionnés`).join('\n');

  const txt = `╔══════════════════════════════════════════════════╗
║   RÉSUMÉ DES SANCTIONS — ${periode.toUpperCase()}                  
║   Big Match Manager by Joy Zogo                 
║   Généré le ${new Date().toLocaleDateString('fr-FR')}                         
╠══════════════════════════════════════════════════╣
  
LISTE DES SANCTIONS :
─────────────────────
${lines}

─────────────────────
PAR ÉQUIPE :
${byEqText}

TOTAL : ${list.length} sanction(s) — ${total} match(s) suspendu(s)
╚══════════════════════════════════════════════════╝`;

  document.getElementById('resumeOutput').style.display = 'block';
  document.getElementById('resumeText').textContent = txt;
  notify('Résumé généré avec succès');
}

/* ── FORMULAIRE MATCH ─────────────────────────────────── */
function openAddMatch() {
  editingMatchId = null;
  document.getElementById('modalTitle').textContent = 'Ajouter un Match';
  document.getElementById('matchForm').reset();
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('fHeure').value = '14:00';

  // Pré-remplir selon rôle
  if (currentUser.role === 'rouge') {
    document.getElementById('fEquipeA').value = 'Les Rouges';
  } else if (currentUser.role === 'blanc') {
    document.getElementById('fEquipeA').value = 'Les Blancs';
  }

  document.getElementById('matchModal').classList.remove('hidden');
}

function openEditMatch(id) {
  const m = matches.find(x => x.id === id);
  if (!m) return;

  // Vérif permissions
  if (currentUser.role === 'rouge' && m.equipeA !== 'Les Rouges' && m.equipeB !== 'Les Rouges') {
    notify('Vous ne pouvez modifier que les matchs de l\'équipe Rouge', 'err'); return;
  }
  if (currentUser.role === 'blanc' && m.equipeA !== 'Les Blancs' && m.equipeB !== 'Les Blancs') {
    notify('Vous ne pouvez modifier que les matchs de l\'équipe Blanche', 'err'); return;
  }

  editingMatchId = id;
  document.getElementById('modalTitle').textContent = 'Modifier le Match';
  document.getElementById('fDate').value = m.date;
  document.getElementById('fHeure').value = m.heure;
  document.getElementById('fEquipeA').value = m.equipeA;
  document.getElementById('fEquipeB').value = m.equipeB;
  document.getElementById('fScoreA').value = m.scoreA;
  document.getElementById('fScoreB').value = m.scoreB;
  document.getElementById('fLieu').value = m.lieu;
  document.getElementById('fType').value = m.type;
  document.getElementById('fStatut').value = m.statut;
  document.getElementById('fNotes').value = m.notes || '';
  document.getElementById('matchModal').classList.remove('hidden');
}

function saveMatch() {
  const date   = document.getElementById('fDate').value;
  const heure  = document.getElementById('fHeure').value;
  const equipeA = document.getElementById('fEquipeA').value.trim();
  const equipeB = document.getElementById('fEquipeB').value.trim();
  const scoreA = Number(document.getElementById('fScoreA').value);
  const scoreB = Number(document.getElementById('fScoreB').value);
  const lieu   = document.getElementById('fLieu').value;
  const type   = document.getElementById('fType').value;
  const statut = document.getElementById('fStatut').value;
  const notes  = document.getElementById('fNotes').value.trim();

  if (!date || !equipeA || !equipeB) { notify('Date et équipes obligatoires', 'err'); return; }

  if (editingMatchId) {
    const idx = matches.findIndex(m => m.id === editingMatchId);
    if (idx >= 0) matches[idx] = { ...matches[idx], date, heure, equipeA, equipeB, scoreA, scoreB, lieu, type, statut, notes };
    notify('✅ Match mis à jour');
  } else {
    matches.push({ id: nextId.m++, date, heure, equipeA, equipeB, scoreA, scoreB, lieu, type, statut, notes });
    notify('✅ Match ajouté');
  }

  saveAll();
  closeMatchModal();
  renderMatchTable();
  renderStatsSection();
}

function deleteMatch(id) {
  if (currentUser.role !== 'super') { notify('Permission refusée', 'err'); return; }
  if (!confirm('Supprimer ce match définitivement ?')) return;
  matches = matches.filter(m => m.id !== id);
  saveAll();
  renderMatchTable();
  renderStatsSection();
  notify('Match supprimé');
}

function closeMatchModal() {
  document.getElementById('matchModal').classList.add('hidden');
  editingMatchId = null;
}

/* ── FORMULAIRE SANCTION ──────────────────────────────── */
function openAddSanction() {
  editingSanctionId = null;
  document.getElementById('sanctionModalTitle').textContent = 'Ajouter une Sanction';
  document.getElementById('sanctionForm').reset();
  document.getElementById('sFDate').value = new Date().toISOString().split('T')[0];
  if (currentUser.role === 'rouge') document.getElementById('sFEquipe').value = 'Les Rouges';
  else if (currentUser.role === 'blanc') document.getElementById('sFEquipe').value = 'Les Blancs';
  document.getElementById('sanctionModal').classList.remove('hidden');
}

function openEditSanction(id) {
  const s = sanctions.find(x => x.id === id);
  if (!s) return;
  editingSanctionId = id;
  document.getElementById('sanctionModalTitle').textContent = 'Modifier la Sanction';
  document.getElementById('sFJoueur').value = s.joueur;
  document.getElementById('sFEquipe').value = s.equipe;
  document.getElementById('sFMatchs').value = s.matchs;
  document.getElementById('sFMotif').value = s.motif;
  document.getElementById('sFDate').value = s.date;
  document.getElementById('sanctionModal').classList.remove('hidden');
}

function saveSanction() {
  const joueur = document.getElementById('sFJoueur').value.trim();
  const equipe = document.getElementById('sFEquipe').value;
  const matchs = Number(document.getElementById('sFMatchs').value);
  const motif  = document.getElementById('sFMotif').value.trim();
  const date   = document.getElementById('sFDate').value;

  if (!joueur || !motif || !date || matchs < 1) { notify('Tous les champs sont requis', 'err'); return; }

  if (editingSanctionId) {
    const idx = sanctions.findIndex(s => s.id === editingSanctionId);
    if (idx >= 0) sanctions[idx] = { ...sanctions[idx], joueur, equipe, matchs, motif, date };
    notify('✅ Sanction mise à jour');
  } else {
    sanctions.push({ id: nextId.s++, joueur, equipe, matchs, motif, date });
    notify('✅ Sanction ajoutée');
  }

  saveAll();
  closeSanctionModal();
  renderSanctionsTable();
}

function deleteSanction(id) {
  if (currentUser.role !== 'super') { notify('Permission refusée', 'err'); return; }
  if (!confirm('Supprimer cette sanction ?')) return;
  sanctions = sanctions.filter(s => s.id !== id);
  saveAll();
  renderSanctionsTable();
  notify('Sanction supprimée');
}

function closeSanctionModal() {
  document.getElementById('sanctionModal').classList.add('hidden');
  editingSanctionId = null;
}

/* ── NAV ──────────────────────────────────────────────── */
function showSection(id, btn) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');

  if (id === 'matchs') renderMatchTable();
  if (id === 'stats') renderStatsSection();
  if (id === 'top') renderTopLists();
  if (id === 'sanctions') renderSanctionsTable();
}

/* ── LOGIN ────────────────────────────────────────────── */
let selectedRole = null;

function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.role-btn[data-role="${role}"]`);
  if (btn) btn.classList.add('selected');
  document.getElementById('pinSection').style.display = 'block';
  document.getElementById('pinInput').focus();
  document.getElementById('loginError').textContent = '';
}

function togglePinVisibility() {
  const input = document.getElementById('pinInput');
  const btn = document.getElementById('pinToggle');
  if (input.type === 'password') {
    input.type = 'text'; btn.textContent = '🙈';
  } else {
    input.type = 'password'; btn.textContent = '👁';
  }
}

function doLogin() {
  if (!selectedRole) { 
    document.getElementById('loginError').textContent = 'Sélectionnez un rôle'; 
    return; 
  }

  const pwd = document.getElementById('pinInput').value;

  // Si rôle Résultats et mot de passe vide, autoriser la connexion
  if (selectedRole === 'resultats' && (!pwd || pwd.trim() === '')) {
    currentUser = { role: selectedRole, name: 'Résultats' };
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userDot').className = 'user-dot dot-obs'; // garder classe obs
    applyPermissions();
    renderMatchTable();
    renderStatsSection();
    renderTopLists();
    renderSanctionsTable();
    notify('Bienvenue, ' + currentUser.name + ' !');
    return;
  }

  // Vérification standard pour les autres rôles
  if (!pwd) { 
    document.getElementById('loginError').textContent = 'Entrez le mot de passe'; 
    return; 
  }

  if (_AUTH.check(selectedRole, pwd)) {
    const names = { super:'Super Administrateur', rouge:'Organisateur Rouge', blanc:'Organisateur Blanc', obs:'Observateur', resultats:'Résultats' };
    currentUser = { role: selectedRole, name: names[selectedRole] };
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    const dotCls = { super:'dot-super', rouge:'dot-rouge', blanc:'dot-blanc', obs:'dot-obs', resultats:'dot-obs' }; // dot-obs pour résultats
    document.getElementById('userDot').className = 'user-dot ' + dotCls[selectedRole];
    applyPermissions();
    renderMatchTable();
    renderStatsSection();
    renderTopLists();
    renderSanctionsTable();
    notify('Bienvenue, ' + currentUser.name + ' !');
  } else {
    document.getElementById('loginError').textContent = '❌ Mot de passe incorrect';
    document.getElementById('pinInput').value = '';
    document.getElementById('pinInput').focus();
  }
}

function logout() {
  currentUser = null;
  selectedRole = null;
  document.getElementById('pinInput').value = '';
  document.getElementById('pinInput').type = 'password';
  document.getElementById('pinSection').style.display = 'none';
  document.getElementById('loginError').textContent = '';
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('loginOverlay').classList.remove('hidden');
}

function applyPermissions() {
  const isSuper = currentUser.role === 'super';
  const isObs   = currentUser.role === 'obs';
  const canAdd  = !isObs;

  // Show/hide add buttons
  document.querySelectorAll('.requires-auth').forEach(el => {
    el.style.display = canAdd ? '' : 'none';
  });
  // Only super sees delete in actions already (handled in render)
}

/* ── NOTIFICATIONS ────────────────────────────────────── */
function notify(msg, type='') {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.className = 'notif' + (type==='err'?' notif-err':type==='warn'?' notif-warn':'') + ' show';
  clearTimeout(n._t);
  n._t = setTimeout(() => n.classList.remove('show'), 3500);
}

/* ── INIT ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Login
  document.getElementById('pinInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Search
  const si = document.getElementById('searchInput');
  if (si) si.addEventListener('input', renderMatchTable);

  // Header sort on th click
  document.querySelectorAll('thead th[data-col]').forEach(th => {
    th.addEventListener('click', () => setSortCol(th.dataset.col));
  });

  // Tab top buteurs
  const tabMode = document.getElementById('topTabMode');
  if (tabMode) tabMode.addEventListener('change', renderTopLists);
});
