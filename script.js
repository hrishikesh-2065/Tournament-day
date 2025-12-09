/* Tournament engine for 3 sports; 11 points to win; tap-to-increment.
   WITH: Match History + Create-Match popup system
*/

const WIN_POINTS = 11;
const STORAGE_KEY = "tournData_v1";

// --------------------- INITIAL FIXED BRACKET ---------------------
const initialData = {
  badminton: {
    M1: {p1:"Nayan", p2:"Atharva", s1:0, s2:0, winner:null},
    M2: {p1:"Shivam", p2:"Riya", s1:0, s2:0, winner:null},
    M3: {p1:"Hrishikesh", p2:"Hitakshi", s1:0, s2:0, winner:null},
    M4: {p1:"Antra", p2:"Swanup", s1:0, s2:0, winner:null},

    SF_A: {p1:null, p2:null, s1:0, s2:0, winner:null}, 
    SF_B: {p1:null, p2:null, s1:0, s2:0, winner:null},

    FINAL: {p1:null, p2:null, s1:0, s2:0, winner:null, runner:null}
  },

  volleyball: {
    M1: {p1:"Shivam, Hrishikesh", p2:"Antra, Atharva", s1:0, s2:0, winner:null},
    M2: {p1:"Swanup, Hitakshi", p2:"Riya, Nayan", s1:0, s2:0, winner:null},
    FINAL:{p1:null, p2:null, s1:0, s2:0, winner:null, runner:null}
  },

  carrom: {
    M1: {p1:"Nayan, Swanup", p2:"Hrishikesh, Hitakshi", s1:0, s2:0, winner:null},
    M2: {p1:"Riya, Antra", p2:"Shivam, Atharva", s1:0, s2:0, winner:null},
    FINAL:{p1:null, p2:null, s1:0, s2:0, winner:null, runner:null}
  }
};

// --------------------- STATE STORAGE ---------------------
let state = loadState();
let matchHistory = JSON.parse(localStorage.getItem("matchHistory_v1") || "[]");

function saveHistory(){
  localStorage.setItem("matchHistory_v1", JSON.stringify(matchHistory));
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    return JSON.parse(JSON.stringify(initialData));
  }
  try { return JSON.parse(raw); }
  catch { return JSON.parse(JSON.stringify(initialData)); }
}

function currentSport(){
  const active = document.querySelector(".tab-btn.active");
  return active ? active.dataset.sport : "badminton";
}

// --------------------- TABS ---------------------
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    renderSport(btn.dataset.sport);
  });
});

// RESET ALL
document.getElementById("resetAll").addEventListener("click", ()=>{
  if(!confirm("Reset everything?")) return;
  state = JSON.parse(JSON.stringify(initialData));
  saveState();
  renderSport(currentSport());
});

// --------------------- RENDER CORE UI ---------------------
function renderSport(sport){
  const app = document.getElementById("app");
  const data = state[sport];

  let html = `<div class="container">`;

  html += `
    <div class="section-title">
      <h2>${sport.toUpperCase()}</h2>
      <div class="controls">
        <button class="reset-btn" onclick="resetSport('${sport}')">Reset ${sport}</button>
        <div class="hint">First to ${WIN_POINTS} wins • Tap +</div>
      </div>
    </div>
  `;

  if(sport === "badminton"){
    html += `<div class="match-grid">`;
    ["M1","M2","M3","M4"].forEach(id=>{
      html += renderMatchCard(sport, id, data[id]);
    });
    html += `</div>`;

    html += `<h3>Semi Finals</h3>
             <div class="match-grid">
                ${renderMatchCard(sport,"SF_A",data.SF_A)}
                ${renderMatchCard(sport,"SF_B",data.SF_B)}
             </div>`;

    html += `<h3>Final</h3>${renderMatchCard(sport,"FINAL",data.FINAL)}`;

  } else {
    html += `<div class="match-grid">
      ${renderMatchCard(sport,"M1",data.M1)}
      ${renderMatchCard(sport,"M2",data.M2)}
    </div>
    <h3>Final</h3>
    ${renderMatchCard(sport,"FINAL",data.FINAL)}`;
  }

  // Final summary
  html += `<div class="final-area" id="summary-${sport}">`;
  const fin = data.FINAL;
  if(fin.p1 && fin.p2){
    html += `
      <div><strong>Final:</strong> ${fin.p1} vs ${fin.p2}</div>
      <div class="result-row">
        ${fin.winner ? `<div class="badge gold">Winner: ${fin.winner}</div>` : ""}
        ${fin.runner ? `<div class="badge silver">Runner: ${fin.runner}</div>` : ""}
      </div>`;
  } else {
    html += `Waiting for finalists...`;
  }
  html += `</div></div>`;

  app.innerHTML = html;
  attachIncrementHandlers(sport);
}


// --------------------- MATCH CARD ---------------------
// --------------------- MATCH CARD ---------------------
function renderMatchCard(sport, id, m){
  // NOTE: We added a new button with class "dec-btn" (decrement button)
  // before the existing "inc-btn" (increment button) for both players.
  return `
  <div class="match-card" id="${sport}_${id}">
    <div class="match-head">
      <h3>${id}${m.winner?" (LOCKED)":""}</h3>
      <button class="reset-btn" onclick="resetMatch('${sport}','${id}')">Reset</button>
    </div>

    <div class="match-players">

      <div class="player-row">
        <div class="player-left"><div class="player-name">${m.p1||"Waiting"}</div></div>
        <div class="score-area">
          <button class="neo-btn minus dec-btn" data-target="${sport}|${id}|1">
            <div class="inner">-</div>
          </button>
          
          <button class="neo-btn inc-btn" data-target="${sport}|${id}|1">
            <div class="inner">+ POINT</div>
            <div class="diamond">+</div>
          </button>
          <div class="score-box" id="${sport}_${id}_s1">${m.s1}</div>
        </div>
      </div>

      <div class="player-row">
        <div class="player-left"><div class="player-name">${m.p2||"Waiting"}</div></div>
        <div class="score-area">
          <button class="neo-btn minus dec-btn" data-target="${sport}|${id}|2">
            <div class="inner">-</div>
          </button>

          <button class="neo-btn inc-btn" data-target="${sport}|${id}|2">
            <div class="inner">+ POINT</div>
            <div class="diamond">+</div>
          </button>
          <div class="score-box" id="${sport}_${id}_s2">${m.s2}</div>
        </div>
      </div>

      <div style="text-align:center;margin-top:8px">
        ${m.winner?`<strong>Winner: ${m.winner}</strong>`:`<em>Winner not decided</em>`}
      </div>
    </div>
  </div>
  `;
}



// --------------------- BUTTON HANDLERS ---------------------
function attachIncrementHandlers(sport){
  // Handler for PLUS (+) buttons
  document.querySelectorAll(".inc-btn").forEach(btn=>{
    btn.onclick = ()=>{
      const [sp,id,idx] = btn.dataset.target.split("|");
      const m = state[sp][id];
      if(!m || m.winner) return;
      addPoint(sp,id,Number(idx));
    };
  });

  // NEW: Handler for MINUS (-) buttons
  document.querySelectorAll(".dec-btn").forEach(btn=>{
    btn.onclick = ()=>{
      const [sp,id,idx] = btn.dataset.target.split("|");
      const m = state[sp][id];
      // Don't allow score change if the match has a winner
      if(!m || m.winner) return;
      subtractPoint(sp,id,Number(idx));
    };
  });
}
// Add this new handler
document.getElementById("viewRanksBtn").onclick = showRanks;
// NEW FUNCTION TO SHOW RANKS SCREEN
function showRanks(){
  const app = document.getElementById("app");
  let html = `
    <h2>Tournament Ranks</h2>
    <button onclick="renderSport(currentSport())" class="reset-btn">← Back</button>
    <div class="rank-grid">
  `;

  const sports = ['badminton', 'volleyball', 'carrom'];
  
  sports.forEach(sport => {
    const finalMatch = state[sport].FINAL;
    // Determine Rank 1 and Rank 2 based on the final match results
    const rank1 = finalMatch.winner || "TBD";
    const rank2 = finalMatch.runner || "TBD";

    html += `
      <div class="rank-card">
        <h3>${sport}</h3>
        <div class="rank-item">
          <span class="rank-badge gold">Rank 1</span><br>
          <strong style="font-size:18px">${rank1}</strong>
        </div>
        <div class="rank-item">
          <span class="rank-badge silver">Rank 2</span><br>
          <strong>${rank2}</strong>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  app.innerHTML = html;
}

// --------------------- SCORING LOGIC ---------------------
function addPoint(sport, matchId, idx){
  const m = state[sport][matchId];
  if(idx===1) m.s1++; else m.s2++;

  document.getElementById(`${sport}_${matchId}_s1`).textContent = m.s1;
  document.getElementById(`${sport}_${matchId}_s2`).textContent = m.s2;

  if(m.s1>=WIN_POINTS || m.s2>=WIN_POINTS){
    const winner = m.s1>m.s2 ? m.p1 : m.p2;
    const runner = winner===m.p1 ? m.p2 : m.p1;

    m.winner = winner;
    if(matchId==="FINAL") m.runner = runner;

    recordHistory(sport, m.p1, m.p2, m.s1, m.s2, winner);

    saveState();
    postMatchProgress(sport, matchId);
    renderSport(sport);
    return;
  }

  saveState();
}
// NEW FUNCTION TO SUBTRACT POINTS
function subtractPoint(sport, matchId, idx){
  const m = state[sport][matchId];

  // Decrease score only if it's greater than 0
  if(idx === 1 && m.s1 > 0) {
    m.s1--;
  } else if(idx === 2 && m.s2 > 0) {
    m.s2--;
  }

  // Update the score display immediately
  document.getElementById(`${sport}_${matchId}_s1`).textContent = m.s1;
  document.getElementById(`${sport}_${matchId}_s2`).textContent = m.s2;

  // Save the new state
  saveState();
}

// --------------------- BRACKET PROGRESSION ---------------------
function postMatchProgress(sport, id){
  const d = state[sport];

  if(sport==="badminton"){
    if(["M1","M2","M3","M4"].includes(id)){
      if(d.M2.winner) d.SF_A.p1 = d.M2.winner;
      if(d.M1.winner) d.SF_A.p2 = d.M1.winner;

      if(d.M4.winner) d.SF_B.p1 = d.M4.winner;
      if(d.M3.winner) d.SF_B.p2 = d.M3.winner;
    }

    if(id==="SF_A" && d.SF_A.winner) d.FINAL.p1 = d.SF_A.winner;
    if(id==="SF_B" && d.SF_B.winner) d.FINAL.p2 = d.SF_B.winner;
  }

  if(sport==="volleyball"){
    if(id==="M1" && d.M1.winner) d.FINAL.p1 = d.M1.winner;
    if(id==="M2" && d.M2.winner) d.FINAL.p2 = d.M2.winner;
  }

  if(sport==="carrom"){
    if(id==="M1" && d.M1.winner) d.FINAL.p1 = d.M1.winner;
    if(id==="M2" && d.M2.winner) d.FINAL.p2 = d.M2.winner;
  }

  saveState();
}

// --------------------- RESET ---------------------
function resetMatch(sport,id){
  const m = state[sport][id];
  m.s1=0; m.s2=0; m.winner=null; m.runner=null;
  saveState();
  renderSport(sport);
}
function resetSport(sport){
  if(!confirm(`Reset ${sport}?`)) return;
  state[sport] = JSON.parse(JSON.stringify(initialData[sport]));
  saveState();
  renderSport(sport);
}

// ======================================================================
//                🔥 NEW FEATURE: MATCH HISTORY + CREATE MATCH
// ======================================================================

// ---------- 1) SAVE HISTORY ----------
function recordHistory(sport, p1, p2, s1, s2, winner){
  matchHistory.unshift({
    sport,
    p1,p2,s1,s2,winner,
    time: new Date().toISOString()
  });
  saveHistory();
}

// ---------- 2) VIEW MATCHES PANEL ----------
document.getElementById("viewMatchesBtn").onclick = showHistory;

// IMPROVED FUNCTION TO SHOW MATCH HISTORY
function showHistory(){
  const app = document.getElementById("app");

  let html = `
  <h2>Completed Matches</h2>
  <button onclick="renderSport(currentSport())" class="reset-btn">← Back</button>
  `;

  // --- NEW SECTION: Tournament Winners Summary ---
  html += `<h3>Tournament Winners So Far</h3><div class="winners-summary">`;
  ['badminton', 'volleyball', 'carrom'].forEach(sport => {
    const winner = state[sport].FINAL.winner;
    if(winner){
      html += `
        <div class="winner-box">
          <strong>${sport.toUpperCase()}</strong><br>
          <span class="badge gold" style="margin-top:8px; display:inline-block">${winner}</span>
        </div>
      `;
    }
  });
  html += `</div>`;
  // -----------------------------------------------


  html += `<h3>Match Log</h3><div class="history-list">`;
  if(matchHistory.length===0){
    html += `<p>No matches played yet.</p>`;
  } else {
    matchHistory.forEach(m=>{
      html += `
        <div class="history-item">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong>${m.sport.toUpperCase()}</strong>
            <small style="opacity:0.6">${new Date(m.time).toLocaleTimeString()}</small>
          </div>
          <div style="font-size:16px; margin-bottom:4px;">
            ${m.p1} <span style="opacity:0.6">vs</span> ${m.p2}
          </div>
          <div>
            Score: <strong>${m.s1} - ${m.s2}</strong> &nbsp;•&nbsp; Winner: <span class="badge gold" style="padding: 2px 8px; font-size:12px">${m.winner}</span>
          </div>
        </div>
      `;
    });
  }
  html += `</div>`;
  app.innerHTML = html;
}

// ---------- 3) CREATE MATCH SYSTEM ----------
document.getElementById("createMatchBtn").onclick = showCreatePopup;

function showCreatePopup(){
  const app = document.getElementById("app");
  
  // We added an onchange event to the select box
  // We added an 'Other' option
  // We added a hidden input field (id="cm_custom_name") underneath
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

      <button class="neo-btn" onclick="startCustomMatch()">Start Match</button>
    </div>
  `;
}

// --- Add this small helper function right below showCreatePopup ---
window.toggleOtherSport = function(selectElem) {
  const customInput = document.getElementById("cm_custom_name");
  if(selectElem.value === "other") {
    customInput.style.display = "block";
    customInput.focus();
  } else {
    customInput.style.display = "none";
  }
};



function renderCustomMatch(sport, p1, p2){
  const app = document.getElementById("app");

  app.innerHTML = `
    <h2>${sport.toUpperCase()} — Custom Match</h2>
    <button onclick="showCreatePopup()" class="reset-btn">← Back</button>

    <div class="match-card">
      <div class="match-head"><h3>Custom</h3></div>

      <div class="player-row">
        <div class="player-left"><div class="player-name">${p1}</div></div>
        <div class="score-area">
          <button class="neo-btn" onclick="customAdd(1)">+ POINT</button>
          <div id="c_s1" class="score-box">0</div>
        </div>
      </div>

      <div class="player-row">
        <div class="player-left"><div class="player-name">${p2}</div></div>
        <div class="score-area">
          <button class="neo-btn" onclick="customAdd(2)">+ POINT</button>
          <div id="c_s2" class="score-box">0</div>
        </div>
      </div>

      <div style="text-align:center;margin-top:10px" id="c_result">Winner not decided</div>
    </div>
  `;

  window.customState = {sport,p1,p2,s1:0,s2:0};
}

function customAdd(idx){
  if(!window.customState) return;
  const cs = window.customState;
  if(cs.winner) return;

  if(idx===1) cs.s1++; else cs.s2++;

  document.getElementById("c_s1").textContent = cs.s1;
  document.getElementById("c_s2").textContent = cs.s2;

  if(cs.s1>=WIN_POINTS || cs.s2>=WIN_POINTS){
    cs.winner = cs.s1>cs.s2 ? cs.p1 : cs.p2;
    document.getElementById("c_result").innerHTML = `<strong>Winner: ${cs.winner}</strong>`;
    recordHistory(cs.sport, cs.p1, cs.p2, cs.s1, cs.s2, cs.winner);
  }
}
document.getElementById("sport").addEventListener("change", function () {
    const value = this.value;
    const customInput = document.getElementById("customSport");

    if (value === "other") {
        customInput.style.display = "block";
    } else {
        customInput.style.display = "none";
        customInput.value = "";
    }
});
