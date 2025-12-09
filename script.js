/* Tournament engine for 3 sports; 11 points to win; tap-to-increment.
   WITH: Match History + Create-Match popup system
   Cleaned, modularized and fixed (Carrom winner = 20 points)
*/

// --------------------- CONFIG ---------------------
const WIN_POINTS = 11;
const CARROM_WIN_POINTS = 20;
const STORAGE_KEY = "tournData_v1";
const HISTORY_KEY = "matchHistory_v1";

// --------------------- INITIAL FIXED BRACKET ---------------------
const initialData = {
  badminton: {
    M1: { p1: "Nayan", p2: "Atharva", s1: 0, s2: 0, winner: null },
    M2: { p1: "Shivam", p2: "Riya", s1: 0, s2: 0, winner: null },
    M3: { p1: "Hrishikesh", p2: "Hitakshi", s1: 0, s2: 0, winner: null },
    M4: { p1: "Antra", p2: "Swanup", s1: 0, s2: 0, winner: null },

    SF_A: { p1: null, p2: null, s1: 0, s2: 0, winner: null },
    SF_B: { p1: null, p2: null, s1: 0, s2: 0, winner: null },

    FINAL: { p1: null, p2: null, s1: 0, s2: 0, winner: null, runner: null }
  },

  volleyball: {
    M1: { p1: "Shivam, Hrishikesh", p2: "Antra, Atharva", s1: 0, s2: 0, winner: null },
    M2: { p1: "Swanup, Hitakshi", p2: "Riya, Nayan", s1: 0, s2: 0, winner: null },
    FINAL: { p1: null, p2: null, s1: 0, s2: 0, winner: null, runner: null }
  },

  carrom: {
    M1: { p1: "Nayan, Swanup", p2: "Hrishikesh, Hitakshi", s1: 0, s2: 0, winner: null },
    M2: { p1: "Riya, Antra", p2: "Shivam, Atharva", s1: 0, s2: 0, winner: null },
    FINAL: { p1: null, p2: null, s1: 0, s2: 0, winner: null, runner: null }
  }
};

// --------------------- STATE ---------------------
let state = loadState();
let matchHistory = loadHistory();

// --------------------- STORAGE HELPERS ---------------------
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    return deepClone(initialData);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return deepClone(initialData);
  }
}
function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(matchHistory));
}
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// --------------------- UTIL ---------------------
function currentSport() {
  const active = document.querySelector(".tab-btn.active");
  return active ? active.dataset.sport : "badminton";
}
function pointsToWinFor(sport) {
  return sport === "carrom" ? CARROM_WIN_POINTS : WIN_POINTS;
}

// --------------------- INITIAL UI HOOKUP ---------------------
function init() {
  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderSport(btn.dataset.sport);
    });
  });

  // Global controls (if they exist)
  safeAddListener("resetAll", "click", () => {
    if (!confirm("Reset everything?")) return;
    state = deepClone(initialData);
    matchHistory = [];
    saveState();
    saveHistory();
    renderSport(currentSport());
  });

  safeAddListener("viewMatchesBtn", "click", showHistory);
  safeAddListener("viewRanksBtn", "click", showRanks);
  safeAddListener("createMatchBtn", "click", showCreatePopup);

  // Render default sport
  renderSport(currentSport());
}
function safeAddListener(id, evt, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evt, handler);
}

// --------------------- RENDERING ---------------------
function renderSport(sport) {
  const app = document.getElementById("app");
  if (!app) return;

  const data = state[sport];
  let html = `<div class="container">`;

  // Title & controls
  html += `
    <div class="section-title">
      <h2>${escapeHtml(sport.toUpperCase())}</h2>
      <div class="controls">
        <button class="reset-btn" onclick="resetSport('${sport}')">Reset ${escapeHtml(sport)}</button>
        <div class="hint">First to ${pointsToWinFor(sport)} wins • Tap +</div>
      </div>
    </div>
  `;

  // Matches
  if (sport === "badminton") {
    html += `<div class="match-grid">`;
    ["M1", "M2", "M3", "M4"].forEach(id => {
      html += renderMatchCard(sport, id, data[id]);
    });
    html += `</div>`;

    html += `<h3>Semi Finals</h3>
             <div class="match-grid">
                ${renderMatchCard(sport, "SF_A", data.SF_A)}
                ${renderMatchCard(sport, "SF_B", data.SF_B)}
             </div>`;

    html += `<h3>Final</h3>${renderMatchCard(sport, "FINAL", data.FINAL)}`;
  } else {
    html += `<div class="match-grid">
      ${renderMatchCard(sport, "M1", data.M1)}
      ${renderMatchCard(sport, "M2", data.M2)}
    </div>
    <h3>Final</h3>
    ${renderMatchCard(sport, "FINAL", data.FINAL)}`;
  }

  // Final summary
  html += `<div class="final-area" id="summary-${sport}">`;
  const fin = data.FINAL;
  if (fin.p1 && fin.p2) {
    html += `
      <div><strong>Final:</strong> ${escapeHtml(fin.p1)} vs ${escapeHtml(fin.p2)}</div>
      <div class="result-row">
        ${fin.winner ? `<div class="badge gold">Winner: ${escapeHtml(fin.winner)}</div>` : ""}
        ${fin.runner ? `<div class="badge silver">Runner: ${escapeHtml(fin.runner)}</div>` : ""}
      </div>`;
  } else {
    html += `Waiting for finalists...`;
  }
  html += `</div></div>`;

  app.innerHTML = html;

  // Attach event delegation for increment/decrement
  attachScoreDelegation(sport);
}

// Escape small HTML to avoid broken markup if names contain special chars
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/[&<>"'`=\/]/g, function (s) {
    return ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;"
    })[s];
  });
}

function renderMatchCard(sport, id, m) {
  const locked = m && m.winner ? " (LOCKED)" : "";
  const p1 = m && m.p1 ? escapeHtml(m.p1) : "Waiting";
  const p2 = m && m.p2 ? escapeHtml(m.p2) : "Waiting";
  const s1 = m ? Number(m.s1) : 0;
  const s2 = m ? Number(m.s2) : 0;

  return `
  <div class="match-card" id="${sport}_${id}">
    <div class="match-head">
      <h3>${escapeHtml(id)}${locked}</h3>
      <button class="reset-btn" onclick="resetMatch('${sport}','${id}')">Reset</button>
    </div>

    <div class="match-players">

      <div class="player-row">
        <div class="player-left"><div class="player-name">${p1}</div></div>
        <div class="score-area">
          <button class="neo-btn minus dec-btn" data-target="${sport}|${id}|1">
            <div class="inner">-</div>
          </button>
          
          <button class="neo-btn inc-btn" data-target="${sport}|${id}|1">
            <div class="inner">+ POINT</div>
            <div class="diamond">+</div>
          </button>
          <div class="score-box" id="${sport}_${id}_s1">${s1}</div>
        </div>
      </div>

      <div class="player-row">
        <div class="player-left"><div class="player-name">${p2}</div></div>
        <div class="score-area">
          <button class="neo-btn minus dec-btn" data-target="${sport}|${id}|2">
            <div class="inner">-</div>
          </button>

          <button class="neo-btn inc-btn" data-target="${sport}|${id}|2">
            <div class="inner">+ POINT</div>
            <div class="diamond">+</div>
          </button>
          <div class="score-box" id="${sport}_${id}_s2">${s2}</div>
        </div>
      </div>

      <div style="text-align:center;margin-top:8px">
        ${m && m.winner ? `<strong>Winner: ${escapeHtml(m.winner)}</strong>` : `<em>Winner not decided</em>`}
      </div>
    </div>
  </div>
  `;
}

// --------------------- EVENT DELEGATION (scores) ---------------------
function attachScoreDelegation(sport) {
  const container = document.getElementById("app");
  if (!container) return;

  // Remove previous listeners by cloning (simple approach)
  // but to keep things simple we attach one handler and rely on checking dataset.
  container.onclick = function (ev) {
    const target = ev.target.closest && ev.target.closest("[data-target]");
    if (!target) return;

    const data = target.dataset.target;
    if (!data) return;
    const [sp, id, idxStr] = data.split("|");
    const idx = Number(idxStr);

    // Ensure we only handle events for the currently-rendered sport
    if (sp !== sport) return;

    const m = state[sp][id];
    if (!m) return;

    // If match is locked (winner exists), ignore +/- clicks
    if (m.winner) return;

    if (target.classList.contains("inc-btn") || target.closest && target.closest(".inc-btn")) {
      addPoint(sp, id, idx);
    } else if (target.classList.contains("dec-btn") || target.closest && target.closest(".dec-btn")) {
      subtractPoint(sp, id, idx);
    }
  };
}

// --------------------- SCORING LOGIC ---------------------
function addPoint(sport, matchId, idx) {
  const m = state[sport][matchId];
  if (!m) return;

  if (idx === 1) m.s1 = Number(m.s1) + 1;
  else m.s2 = Number(m.s2) + 1;

  // Update UI live
  updateScoreUI(sport, matchId, m.s1, m.s2);

  const pointsToWin = pointsToWinFor(sport);

  // If either player has reached required points -> resolve winner
  if (m.s1 >= pointsToWin || m.s2 >= pointsToWin) {
    // Decide winner by higher score
    let winner, runner;
    if (m.s1 > m.s2) {
      winner = m.p1;
      runner = m.p2;
    } else if (m.s2 > m.s1) {
      winner = m.p2;
      runner = m.p1;
    } else {
      // tie (rare) — don't decide winner until someone leads by 1 (simple policy)
      saveState();
      return;
    }

    m.winner = winner;
    if (matchId === "FINAL") m.runner = runner;

    recordHistory(sport, m.p1, m.p2, m.s1, m.s2, winner);

    // Apply bracket progression (before render, so next places are visible)
    postMatchProgress(sport, matchId);

    saveState();
    // Re-render current sport so lock UI shows up
    renderSport(sport);
    return;
  }

  saveState();
}

function subtractPoint(sport, matchId, idx) {
  const m = state[sport][matchId];
  if (!m) return;

  if (idx === 1 && m.s1 > 0) m.s1 = Number(m.s1) - 1;
  else if (idx === 2 && m.s2 > 0) m.s2 = Number(m.s2) - 1;

  const pointsToWin = pointsToWinFor(sport);

  // If after subtraction, no-one has enough points -> clear winner & runner
  if (m.s1 < pointsToWin && m.s2 < pointsToWin) {
    m.winner = null;
    m.runner = null;
  }

  updateScoreUI(sport, matchId, m.s1, m.s2);
  saveState();
}

function updateScoreUI(sport, matchId, s1, s2) {
  const el1 = document.getElementById(`${sport}_${matchId}_s1`);
  const el2 = document.getElementById(`${sport}_${matchId}_s2`);
  if (el1) el1.textContent = s1;
  if (el2) el2.textContent = s2;
}

// --------------------- BRACKET PROGRESSION ---------------------
function postMatchProgress(sport, id) {
  const d = state[sport];

  if (sport === "badminton") {
    if (["M1", "M2", "M3", "M4"].includes(id)) {
      if (d.M2.winner) d.SF_A.p1 = d.M2.winner;
      if (d.M1.winner) d.SF_A.p2 = d.M1.winner;

      if (d.M4.winner) d.SF_B.p1 = d.M4.winner;
      if (d.M3.winner) d.SF_B.p2 = d.M3.winner;
    }

    if (id === "SF_A" && d.SF_A.winner) d.FINAL.p1 = d.SF_A.winner;
    if (id === "SF_B" && d.SF_B.winner) d.FINAL.p2 = d.SF_B.winner;
  }

  if (sport === "volleyball") {
    if (id === "M1" && d.M1.winner) d.FINAL.p1 = d.M1.winner;
    if (id === "M2" && d.M2.winner) d.FINAL.p2 = d.M2.winner;
  }

  if (sport === "carrom") {
    if (id === "M1" && d.M1.winner) d.FINAL.p1 = d.M1.winner;
    if (id === "M2" && d.M2.winner) d.FINAL.p2 = d.M2.winner;
  }

  saveState();
}

// --------------------- RESET HELPERS ---------------------
function resetMatch(sport, id) {
  const m = state[sport][id];
  if (!m) return;
  m.s1 = 0;
  m.s2 = 0;
  m.winner = null;
  m.runner = null;
  saveState();
  renderSport(sport);
}
function resetSport(sport) {
  if (!confirm(`Reset ${sport}?`)) return;
  state[sport] = deepClone(initialData[sport]);
  saveState();
  renderSport(sport);
}

// Expose reset functions globally because UI uses inline onclick
window.resetMatch = resetMatch;
window.resetSport = resetSport;

// --------------------- HISTORY / MATCH LOG ---------------------
function recordHistory(sport, p1, p2, s1, s2, winner) {
  matchHistory.unshift({
    sport,
    p1, p2, s1, s2, winner,
    time: new Date().toISOString()
  });
  // keep history reasonable in size (optional): limit to 200 entries
  if (matchHistory.length > 200) matchHistory.length = 200;
  saveHistory();
}

function showHistory() {
  const app = document.getElementById("app");
  if (!app) return;

  let html = `
    <h2>Completed Matches</h2>
    <button onclick="renderSport(currentSport())" class="reset-btn">← Back</button>
  `;

  // Tournament Winners Summary
  html += `<h3>Tournament Winners So Far</h3><div class="winners-summary">`;
  ['badminton', 'volleyball', 'carrom'].forEach(sport => {
    const winner = state[sport].FINAL.winner;
    if (winner) {
      html += `
        <div class="winner-box">
          <strong>${escapeHtml(sport.toUpperCase())}</strong><br>
          <span class="badge gold" style="margin-top:8px; display:inline-block">${escapeHtml(winner)}</span>
        </div>
      `;
    }
  });
  html += `</div>`;

  html += `<h3>Match Log</h3><div class="history-list">`;
  if (matchHistory.length === 0) {
    html += `<p>No matches played yet.</p>`;
  } else {
    matchHistory.forEach(m => {
      html += `
        <div class="history-item">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong>${escapeHtml(m.sport.toUpperCase())}</strong>
            <small style="opacity:0.6">${new Date(m.time).toLocaleString()}</small>
          </div>
          <div style="font-size:16px; margin-bottom:4px;">
            ${escapeHtml(m.p1)} <span style="opacity:0.6">vs</span> ${escapeHtml(m.p2)}
          </div>
          <div>
            Score: <strong>${escapeHtml(m.s1)} - ${escapeHtml(m.s2)}</strong> &nbsp;•&nbsp; Winner: <span class="badge gold" style="padding: 2px 8px; font-size:12px">${escapeHtml(m.winner)}</span>
          </div>
        </div>
      `;
    });
  }
  html += `</div>`;
  app.innerHTML = html;
}

// --------------------- RANKS ---------------------
function showRanks() {
  const app = document.getElementById("app");
  if (!app) return;

  let html = `
    <h2>Tournament Ranks</h2>
    <button onclick="renderSport(currentSport())" class="reset-btn">← Back</button>
    <div class="rank-grid">
  `;

  const sports = ['badminton', 'volleyball', 'carrom'];
  sports.forEach(sport => {
    const finalMatch = state[sport].FINAL;
    const rank1 = finalMatch.winner || "TBD";
    const rank2 = finalMatch.runner || "TBD";

    html += `
      <div class="rank-card">
        <h3>${escapeHtml(sport)}</h3>
        <div class="rank-item">
          <span class="rank-badge gold">Rank 1</span><br>
          <strong style="font-size:18px">${escapeHtml(rank1)}</strong>
        </div>
        <div class="rank-item">
          <span class="rank-badge silver">Rank 2</span><br>
          <strong>${escapeHtml(rank2)}</strong>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  app.innerHTML = html;
}

// --------------------- CREATE CUSTOM MATCH ---------------------
function showCreatePopup() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <h2>Create Custom Match</h2>
    <button onclick="renderSport(currentSport())" class="reset-btn">← Back</button>

    <div class="form">
      <label>Sport:</label>
      <select id="cm_sport" onchange="toggleOtherSport(this)">
        <option value="badminton">Badminton</option>
        <option value="volleyball">Volleyball</option>
        <option value="carrom">Carrom</option>
        <option value="other">Other Sport...</option>
      </select>

      <input id="cm_custom_name" placeholder="Enter Sport Name (e.g. Chess)" style="display:none; margin-top:8px; border-color: var(--accent);">

      <label>Team / Player 1</label>
      <input id="cm_p1" placeholder="Team 1 name">

      <label>Team / Player 2</label>
      <input id="cm_p2" placeholder="Team 2 name">

      <button class="neo-btn" id="cm_start_btn">Start Match</button>
    </div>
  `;

  // attach start button
  const startBtn = document.getElementById("cm_start_btn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const sportSelect = document.getElementById("cm_sport");
      const customNameEl = document.getElementById("cm_custom_name");
      const s = sportSelect ? sportSelect.value : "badminton";
      const sportName = s === "other" && customNameEl && customNameEl.value.trim() ? customNameEl.value.trim() : s;
      const p1 = document.getElementById("cm_p1").value.trim() || "Player 1";
      const p2 = document.getElementById("cm_p2").value.trim() || "Player 2";
      startCustomMatch(sportName, p1, p2);
    });
  }
}

// Toggle helper exposed globally for inline onchange used in markup
window.toggleOtherSport = function (selectElem) {
  const customInput = document.getElementById("cm_custom_name");
  if (!customInput) return;
  if (selectElem.value === "other") {
    customInput.style.display = "block";
    customInput.focus();
  } else {
    customInput.style.display = "none";
    customInput.value = "";
  }
};

// Start a custom match view (does not persist to state unless user saves explicitly)
function startCustomMatch(sport, p1, p2) {
  renderCustomMatch(sport, p1, p2);
}

// Render a live custom match UI (uses window.customState)
function renderCustomMatch(sport, p1, p2) {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <h2>${escapeHtml(String(sport).toUpperCase())} — Custom Match</h2>
    <button onclick="showCreatePopup()" class="reset-btn">← Back</button>

    <div class="match-card">
      <div class="match-head"><h3>Custom</h3></div>

      <div class="player-row">
        <div class="player-left"><div class="player-name">${escapeHtml(p1)}</div></div>
        <div class="score-area">
          <button class="neo-btn" id="c_inc1">+ POINT</button>
          <div id="c_s1" class="score-box">0</div>
        </div>
      </div>

      <div class="player-row">
        <div class="player-left"><div class="player-name">${escapeHtml(p2)}</div></div>
        <div class="score-area">
          <button class="neo-btn" id="c_inc2">+ POINT</button>
          <div id="c_s2" class="score-box">0</div>
        </div>
      </div>

      <div style="text-align:center;margin-top:10px" id="c_result">Winner not decided</div>
    </div>
  `;

  window.customState = { sport, p1, p2, s1: 0, s2: 0, winner: null };

  // attach events
  const b1 = document.getElementById("c_inc1");
  const b2 = document.getElementById("c_inc2");
  if (b1) b1.addEventListener("click", () => customAdd(1));
  if (b2) b2.addEventListener("click", () => customAdd(2));
}

function customAdd(idx) {
  if (!window.customState) return;
  const cs = window.customState;
  if (cs.winner) return;

  if (idx === 1) cs.s1++;
  else cs.s2++;

  const el1 = document.getElementById("c_s1");
  const el2 = document.getElementById("c_s2");
  if (el1) el1.textContent = cs.s1;
  if (el2) el2.textContent = cs.s2;

  const winPts = pointsToWinFor(cs.sport === "carrom" ? "carrom" : cs.sport);
  // for custom sport name 'carrom' case, we treat as carrom; otherwise use default WIN_POINTS
  if (cs.s1 >= winPts || cs.s2 >= winPts) {
    if (cs.s1 === cs.s2) {
      // tie — wait for break
      return;
    }
    cs.winner = cs.s1 > cs.s2 ? cs.p1 : cs.p2;
    const res = document.getElementById("c_result");
    if (res) res.innerHTML = `<strong>Winner: ${escapeHtml(cs.winner)}</strong>`;
    // save to history (sport name may be custom)
    recordHistory(cs.sport, cs.p1, cs.p2, cs.s1, cs.s2, cs.winner);
  }
}

// --------------------- STARTUP ---------------------
init();

// --------------------- EXPORTS FOR DEBUG (optional) ---------------------
// These are convenient if you open console for debugging.
window._tournamentState = state;
window._matchHistory = matchHistory;
window._saveState = saveState;
window._saveHistory = saveHistory;
