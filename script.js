/* Tournament engine for 3 sports; 11 points to win; tap-to-increment.
    WITH: Match History + Create-Match popup system
    Cleaned, modularized and fixed (Carrom winner = 20 points)
    
    MODIFIED:
    1. Added input for custom WIN_POINTS in 'Create Custom Match' popup.
    2. Fixed custom match logic to use the custom points.
    3. Modified showRanks to include custom match winners from history.
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
    // Check if the sport name is explicitly "carrom" (case-insensitive)
    const normalizedSport = String(sport).toLowerCase().trim();
    if (normalizedSport.includes("carrom")) return CARROM_WIN_POINTS;
    return WIN_POINTS;
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
        if (!confirm("Reset everything? This will clear all tournament data and match history!")) return;
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

    // Check if we are viewing a custom match state
    if (window.customState && window.customState.sport === sport) {
         renderCustomMatch(window.customState.sport, window.customState.players.map(p => p.name));
         return;
    }
    
    // Only render structured tournament if the sport exists in state
    if (!state[sport]) {
        app.innerHTML = `<div class="container"><h2>Error: ${escapeHtml(sport.toUpperCase())} not found in fixed bracket.</h2><p>Please use the Badminton, Volleyball, or Carrom tabs, or create a Custom Match.</p></div>`;
        return;
    }


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

    // Use event delegation on 'app' to handle clicks for the main bracket
    container.onclick = function (ev) {
        // Only proceed if the event target has a data-target attribute or is a child of one
        const target = ev.target.closest && ev.target.closest("[data-target]");
        if (!target) return;

        const data = target.dataset.target;
        if (!data) return;
        const [sp, id, idxStr] = data.split("|");
        const idx = Number(idxStr);

        // Ensure we only handle events for the currently-rendered sport in the main view
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

        // Only set winner/runner if the match is decided by score
        if (m.s1 !== m.s2) {
            m.winner = winner;
            if (matchId === "FINAL") m.runner = runner;
            
            // Record history only for decisive scores
            recordHistory(sport, m.p1, m.p2, m.s1, m.s2, winner);
            
            // Apply bracket progression (before render, so next places are visible)
            postMatchProgress(sport, matchId);
        }
    }

    saveState();
    // Re-render current sport so lock UI shows up
    renderSport(sport);
}

function subtractPoint(sport, matchId, idx) {
    const m = state[sport][matchId];
    if (!m) return;

    if (idx === 1 && m.s1 > 0) m.s1 = Number(m.s1) - 1;
    else if (idx === 2 && m.s2 > 0) m.s2 = Number(m.s2) - 1;

    const pointsToWin = pointsToWinFor(sport);

    // If after subtraction, no-one has enough points -> clear winner & runner
    if (m.winner && (m.s1 < pointsToWin && m.s2 < pointsToWin)) {
        m.winner = null;
        m.runner = null;
        // Re-run progression to clear subsequent matches' players
        postMatchProgress(sport, matchId);
    }
    
    // Also clear winner if scores become tied at or above win threshold (shouldn't happen with the tie-check in addPoint)
    if (m.winner && m.s1 === m.s2 && m.s1 >= pointsToWin) {
        m.winner = null;
        m.runner = null;
        postMatchProgress(sport, matchId);
    }

    updateScoreUI(sport, matchId, m.s1, m.s2);
    saveState();
    renderSport(sport); // Rerender to show winner cleared/lock removed
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
    
    // Helper to reset a match's player slot
    function clearMatchSlot(match, playerIndex) {
        if (!match) return;
        if (playerIndex === 1) {
            match.p1 = null;
        } else if (playerIndex === 2) {
            match.p2 = null;
        }
        match.s1 = 0;
        match.s2 = 0;
        match.winner = null;
        match.runner = null;
    }
    
    // Helper to propagate winner/clear player to the next match
    function updateMatch(match, playerIndex, winnerName) {
        if (!match) return;
        if (winnerName) {
            if (playerIndex === 1) match.p1 = winnerName;
            if (playerIndex === 2) match.p2 = winnerName;
        } else {
            // Clear the slot if there's no winner (i.e. match was reset)
            if (playerIndex === 1) match.p1 = null;
            if (playerIndex === 2) match.p2 = null;
            
            // If clearing a player in the next match, that match must be reset
            clearMatchSlot(match, playerIndex);
            
            // If the cleared match was a semi or final, we must also clear the subsequent one
            if (sport === "badminton" && id.startsWith("SF_")) {
                clearMatchSlot(d.FINAL, id === "SF_A" ? 1 : 2);
            } else if (id.startsWith("M")) {
                clearMatchSlot(d.FINAL, id === "M1" ? 1 : 2);
            }
        }
    }


    if (sport === "badminton") {
        if (id === "M1") { updateMatch(d.SF_A, 2, d.M1.winner); }
        if (id === "M2") { updateMatch(d.SF_A, 1, d.M2.winner); }
        if (id === "M3") { updateMatch(d.SF_B, 2, d.M3.winner); }
        if (id === "M4") { updateMatch(d.SF_B, 1, d.M4.winner); }

        if (id === "SF_A") { updateMatch(d.FINAL, 1, d.SF_A.winner); }
        if (id === "SF_B") { updateMatch(d.FINAL, 2, d.SF_B.winner); }
    }

    if (sport === "volleyball" || sport === "carrom") {
        if (id === "M1") { updateMatch(d.FINAL, 1, d.M1.winner); }
        if (id === "M2") { updateMatch(d.FINAL, 2, d.M2.winner); }
    }

    saveState();
}

// --------------------- RESET HELPERS ---------------------
function resetMatch(sport, id) {
    const m = state[sport][id];
    if (!m) return;
    
    // Clear history entry for this match if it exists
    matchHistory = matchHistory.filter(h => 
        !(h.sport === sport && 
          (h.p1 === m.p1 && h.p2 === m.p2 || h.p1 === m.p2 && h.p2 === m.p1) &&
          h.winner === m.winner)
    );
    saveHistory();
    
    m.s1 = 0;
    m.s2 = 0;
    m.winner = null;
    m.runner = null;
    
    // Re-run progression to clear subsequent matches' players
    postMatchProgress(sport, id);
    
    saveState();
    renderSport(sport);
}
function resetSport(sport) {
    if (!confirm(`Reset ${sport} tournament? This cannot be undone.`)) return;
    state[sport] = deepClone(initialData[sport]);
    saveState();
    renderSport(sport);
}

// Expose reset functions globally because UI uses inline onclick
window.resetMatch = resetMatch;
window.resetSport = resetSport;

// --------------------- HISTORY / MATCH LOG ---------------------
function recordHistory(sport, p1, p2, s1, s2, winner) {
    // Record both p1/p2 and scores s1/s2, which may be team names and final scores.
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
        <div class="container">
        <h2>Completed Matches</h2>
        <button onclick="renderSport(currentSport())" class="reset-btn">← Back to Tournament</button>
    `;

    // Tournament Winners Summary
    html += `<h3>Tournament Winners So Far</h3><div class="winners-summary">`;
    let winnerFound = false;
    
    // 1. Fixed Tournaments
    const fixedSports = ['badminton', 'volleyball', 'carrom'];
    fixedSports.forEach(sport => {
        const finalMatch = state[sport].FINAL;
        const winner = finalMatch ? finalMatch.winner : null; 
        if (winner) {
            winnerFound = true;
            html += `
                <div class="winner-box">
                    <strong>${escapeHtml(sport.toUpperCase())}</strong><br>
                    <span class="badge gold" style="margin-top:8px; display:inline-block">${escapeHtml(winner)}</span>
                </div>
            `;
        }
    });

    // 2. Custom Matches - Find the unique winners for each custom sport name
    const customWinners = {};
    matchHistory.forEach(m => {
        if (!fixedSports.includes(m.sport) && m.winner) {
            // Only take the first winner recorded for this sport (assumes the final match of that sport)
            if (!customWinners[m.sport]) {
                customWinners[m.sport] = m.winner;
            }
        }
    });

    Object.entries(customWinners).forEach(([sport, winner]) => {
        winnerFound = true;
        html += `
            <div class="winner-box">
                <strong>${escapeHtml(sport.toUpperCase())} (Custom)</strong><br>
                <span class="badge gold" style="margin-top:8px; display:inline-block">${escapeHtml(winner)}</span>
            </div>
        `;
    });


    if (!winnerFound) {
         html += `<p style="opacity:0.7">No tournament winners decided yet.</p>`;
    }
    html += `</div>`;

    html += `<h3>Match Log (${matchHistory.length} recorded)</h3><div class="history-list">`;
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
    html += `</div></div>`;
    app.innerHTML = html;
}
window.showHistory = showHistory; // Expose globally

// --------------------- RANKS (FIXED) ---------------------
function showRanks() {
    const app = document.getElementById("app");
    if (!app) return;

    let html = `
        <div class="container">
        <h2>Tournament Ranks</h2>
        <button onclick="renderSport(currentSport())" class="reset-btn">← Back to Tournament</button>
        <div class="rank-grid">
    `;

    const sports = ['badminton', 'volleyball', 'carrom'];
    sports.forEach(sport => {
        const finalMatch = state[sport].FINAL;
        const rank1 = finalMatch && finalMatch.winner ? finalMatch.winner : "TBD"; 
        const rank2 = finalMatch && finalMatch.runner ? finalMatch.runner : "TBD";

        html += `
            <div class="rank-card">
                <h3>${escapeHtml(sport.toUpperCase())}</h3>
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
    
    // --- Custom Match Ranks (Winner only, taken from history) ---
    
    const fixedSports = ['badminton', 'volleyball', 'carrom'];
    const customWinners = {};

    // Use matchHistory to find the final winner for each unique custom sport
    matchHistory.forEach(m => {
        if (!fixedSports.includes(m.sport) && m.winner) {
            // Only display the first winner recorded for this sport
            if (!customWinners[m.sport]) {
                customWinners[m.sport] = { winner: m.winner };
            }
        }
    });

    Object.entries(customWinners).forEach(([sport, data]) => {
        html += `
            <div class="rank-card custom-rank-card">
                <h3>${escapeHtml(sport.toUpperCase())} (Custom)</h3>
                <div class="rank-item">
                    <span class="rank-badge gold">Winner</span><br>
                    <strong style="font-size:18px">${escapeHtml(data.winner)}</strong>
                </div>
                <div class="rank-item">
                    <span class="rank-badge silver">Runner</span><br>
                    <strong>N/A</strong>
                </div>
            </div>
        `;
    });


    html += `</div></div>`;
    app.innerHTML = html;
}
window.showRanks = showRanks; // Expose globally

// --------------------- CREATE CUSTOM MATCH ---------------------

/**
 * Creates and appends a new input field for a player/team name.
 * @param {number} playerNum - The player number (1, 2, 3, etc.).
 * @param {string} initialValue - Default value for the input.
 */
function addPlayerInput(playerNum, initialValue = "") {
    const container = document.getElementById("player-inputs-container");
    if (!container) return;
    
    // Create label
    const label = document.createElement("label");
    label.textContent = `Team / Player ${playerNum}`;
    label.setAttribute("for", `cm_p${playerNum}`);

    // Create input
    const input = document.createElement("input");
    input.id = `cm_p${playerNum}`;
    input.classList.add('player-input'); // Add a class for easy selection later
    input.type = 'text'; // Ensure type is text
    input.placeholder = `Player / Team ${playerNum} name`;
    input.value = initialValue;
    input.required = playerNum <= 2; // Require at least 2 players

    container.appendChild(label);
    container.appendChild(input);
}

// --------------------- CREATE CUSTOM MATCH POPUP (REVISED for Bracket) ---------------------

// Global temporary state for custom bracket structure
let customBracketState = null; 

/**
 * Creates and appends a new input field for a player/team name.
 * We enforce exactly 8 players for a bracket structure.
 */
function addPlayerInput(playerNum, initialValue = "") {
    const container = document.getElementById("player-inputs-container");
    if (!container) return;
    
    // Create wrapper div for better spacing
    const wrapper = document.createElement("div");
    wrapper.classList.add("player-input-wrapper");
    
    // Create label
    const label = document.createElement("label");
    label.textContent = `Team / Player ${playerNum}`;
    label.setAttribute("for", `cm_p${playerNum}`);

    // Create input
    const input = document.createElement("input");
    input.id = `cm_p${playerNum}`;
    input.classList.add('player-input'); 
    input.type = 'text'; 
    input.placeholder = `Player / Team ${playerNum} name`;
    input.value = initialValue;
    input.required = true; 

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
}


function showCreatePopup() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        <div class="container">
        <h2>Create Custom Tournament (8 Players)</h2>
        <button onclick="renderSport(currentSport())" class="reset-btn">← Back to Tournament</button>

        <div class="form">
            <label>Sport:</label>
            <select id="cm_sport" onchange="toggleOtherSport(this)">
                <option value="badminton">Badminton (11 pts)</option>
                <option value="volleyball">Volleyball (11 pts)</option>
                <option value="carrom">Carrom (20 pts)</option>
                <option value="other">Other Sport...</option>
            </select>
            
            <div id="custom_options" style="margin-top:8px; display:none;">
                <label for="cm_custom_name">Sport Name:</label>
                <input id="cm_custom_name" type="text" placeholder="e.g., Tennis">
                
                <label for="cm_win_points">Winning Points (Number):</label>
                <input id="cm_win_points" type="number" value="11" min="1" placeholder="e.g., 21">
            </div>


            <div id="player-inputs-container" style="margin-top: 15px; display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                </div>
            
            <p style="margin-top: 15px; font-weight: bold; color: #ffeb3b;">NOTE: This bracket structure requires exactly 8 players/teams.</p>

            <hr style="opacity:0.2; margin: 25px 0 15px 0;"/>

            <button class="neo-btn" id="cm_start_btn">Start 8-Player Bracket</button>
        </div>
        </div>
    `;
    
    // Clear and Initialize with 8 Player Inputs for the Bracket
    const container = document.getElementById("player-inputs-container");
    if (container) container.innerHTML = '';
    
    // Create 8 input fields
    for (let i = 1; i <= 8; i++) {
        addPlayerInput(i, `Team ${i}`);
    }

    // Attach "Other Sport" toggle helper
    window.toggleOtherSport = function (selectElem) {
        const customOptions = document.getElementById("custom_options");
        if (!customOptions) return;
        if (selectElem.value === "other") {
            customOptions.style.display = "block";
        } else {
            customOptions.style.display = "none";
        }
    };


    // Attach start button
    const startBtn = document.getElementById("cm_start_btn");
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            const sportSelect = document.getElementById("cm_sport");
            const customNameEl = document.getElementById("cm_custom_name");
            const customPointsEl = document.getElementById("cm_win_points");
            
            // 1. Get Sport Name & Win Points
            let sportKey = sportSelect ? sportSelect.value : "badminton";
            let sportDisplayName = sportKey;
            let winPoints = pointsToWinFor(sportKey); // Default
            
            if (sportKey === "other") {
                sportDisplayName = customNameEl && customNameEl.value.trim() ? customNameEl.value.trim() : "Custom Match";
                winPoints = customPointsEl ? parseInt(customPointsEl.value, 10) : WIN_POINTS;
                if (isNaN(winPoints) || winPoints < 1) {
                    winPoints = WIN_POINTS;
                }
                // Use a unique key for the custom sport in the global customBracketState
                sportKey = sportDisplayName.toUpperCase().replace(/\s/g, '_') + `_CUSTOM_${new Date().getTime()}`;
            }

            
            // 2. Get All Player Names
            const playerInputs = document.querySelectorAll("#player-inputs-container .player-input");
            const playerNames = Array.from(playerInputs)
                .map(input => input.value.trim())
                .filter(name => name); 
            
            // Must have exactly 8 players for this bracket
            if (playerNames.length !== 8) {
                alert(`This tournament bracket requires exactly 8 players/teams. You entered ${playerNames.length}.`);
                return;
            }

            startCustomBracket(sportKey, sportDisplayName, playerNames, winPoints);
        });
    }
}
window.showCreatePopup = showCreatePopup; 


// --------------------- CUSTOM BRACKET LOGIC ---------------------

const customBracketTemplate = {
    // Round 1
    M1: { p1: null, p2: null, s1: 0, s2: 0, winner: null },
    M2: { p1: null, p2: null, s1: 0, s2: 0, winner: null },
    M3: { p1: null, p2: null, s1: 0, s2: 0, winner: null },
    M4: { p1: null, p2: null, s1: 0, s2: 0, winner: null },
    
    // Semi Finals
    SF_A: { p1: null, p2: null, s1: 0, s2: 0, winner: null },
    SF_B: { p1: null, p2: null, s1: 0, s2: 0, winner: null },

    // Final
    FINAL: { p1: null, p2: null, s1: 0, s2: 0, winner: null, runner: null }
};


function startCustomBracket(sportKey, sportDisplayName, playerNames, winPoints) {
    // 1. Initialize the bracket state
    customBracketState = deepClone(customBracketTemplate);
    customBracketState.sport = sportKey;
    customBracketState.displayName = sportDisplayName;
    customBracketState.winPoints = winPoints;

    // 2. Seed the players into the first round matches (M1, M2, M3, M4)
    customBracketState.M1.p1 = playerNames[0];
    customBracketState.M1.p2 = playerNames[1];
    customBracketState.M2.p1 = playerNames[2];
    customBracketState.M2.p2 = playerNames[3];
    customBracketState.M3.p1 = playerNames[4];
    customBracketState.M3.p2 = playerNames[5];
    customBracketState.M4.p1 = playerNames[6];
    customBracketState.M4.p2 = playerNames[7];
    
    // 3. Render the new bracket
    renderCustomBracket(sportKey);
}

// Global hook to determine if we are in a custom bracket (used by currentSport() logic)
window.isCustomBracketActive = function(sportKey) {
    return customBracketState && customBracketState.sport === sportKey;
}

// Function to get the required points for the custom bracket
function pointsToWinForCustom(sportKey) {
    if (customBracketState && customBracketState.sport === sportKey) {
        return customBracketState.winPoints;
    }
    // Fallback to default if somehow called incorrectly
    return WIN_POINTS;
}

// OVERRIDE: Modify point calculation to handle custom bracket sport key
function pointsToWinFor(sport) {
    // Check if the sport name is explicitly "carrom" (case-insensitive)
    const normalizedSport = String(sport).toLowerCase().trim();
    if (normalizedSport.includes("carrom")) return CARROM_WIN_POINTS;
    
    // Check if the sport is the active custom bracket key
    if (customBracketState && customBracketState.sport === sport) {
        return customBracketState.winPoints;
    }
    
    return WIN_POINTS;
}


function renderCustomBracket(sportKey) {
    if (!customBracketState || customBracketState.sport !== sportKey) {
         // Fallback if state is missing or wrong key used
         renderSport(currentSport());
         return;
    }

    const app = document.getElementById("app");
    if (!app) return;
    
    const data = customBracketState;
    const sportDisplayName = data.displayName;

    let html = `<div class="container">`;

    // Title & controls
    html += `
        <div class="section-title">
            <h2>${escapeHtml(sportDisplayName.toUpperCase())} — BRACKET</h2>
            <div class="controls">
                <button class="reset-btn" onclick="resetCustomBracket('${sportKey}')">Reset Bracket</button>
                <div class="hint">First to ${data.winPoints} wins • Tap +</div>
            </div>
        </div>
    `;

    // Matches
    html += `<h3>Round 1</h3>
             <div class="match-grid">`;
    ["M1", "M2", "M3", "M4"].forEach(id => {
        html += renderMatchCard(sportKey, id, data[id]);
    });
    html += `</div>`;

    html += `<h3>Semi Finals</h3>
               <div class="match-grid">
                 ${renderMatchCard(sportKey, "SF_A", data.SF_A)}
                 ${renderMatchCard(sportKey, "SF_B", data.SF_B)}
               </div>`;

    html += `<h3>Final</h3>${renderMatchCard(sportKey, "FINAL", data.FINAL)}`;

    // Final summary
    html += `<div class="final-area" id="summary-${sportKey}">`;
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
    attachScoreDelegation(sportKey, true);
}


// Function to apply bracket progression specifically for the custom state
function postMatchProgressCustom(id) {
    const d = customBracketState;
    if (!d) return;
    
    // Helper to reset a match's player slot
    function clearMatchSlot(match, playerIndex) {
        if (!match) return;
        if (playerIndex === 1) {
            match.p1 = null;
        } else if (playerIndex === 2) {
            match.p2 = null;
        }
        match.s1 = 0;
        match.s2 = 0;
        match.winner = null;
        match.runner = null;
    }
    
    // Helper to propagate winner/clear player to the next match
    function updateMatch(match, playerIndex, winnerName) {
        if (!match) return;
        if (winnerName) {
            if (playerIndex === 1) match.p1 = winnerName;
            if (playerIndex === 2) match.p2 = winnerName;
        } else {
            // Clear the slot if there's no winner (i.e. match was reset)
            if (playerIndex === 1) match.p1 = null;
            if (playerIndex === 2) match.p2 = null;
            
            // If clearing a player in the next match, that match must be reset
            clearMatchSlot(match, playerIndex);
            
            // If the cleared match was a semi or final, we must also clear the subsequent one
            if (id.startsWith("SF_")) {
                clearMatchSlot(d.FINAL, id === "SF_A" ? 1 : 2);
            }
        }
    }


    // Round 1 progression to Semi-Finals
    if (id === "M1") { updateMatch(d.SF_A, 1, d.M1.winner); }
    if (id === "M2") { updateMatch(d.SF_A, 2, d.M2.winner); }
    if (id === "M3") { updateMatch(d.SF_B, 1, d.M3.winner); }
    if (id === "M4") { updateMatch(d.SF_B, 2, d.M4.winner); }

    // Semi-Finals progression to Final
    if (id === "SF_A") { updateMatch(d.FINAL, 1, d.SF_A.winner); }
    if (id === "SF_B") { updateMatch(d.FINAL, 2, d.SF_B.winner); }
}


// OVERRIDE: Modify the global scoring logic to check for the custom bracket
function addPoint(sport, matchId, idx) {
    let m;
    let progressionFunc;

    if (customBracketState && customBracketState.sport === sport) {
        m = customBracketState[matchId];
        progressionFunc = postMatchProgressCustom;
    } else if (state[sport] && state[sport][matchId]) {
        m = state[sport][matchId];
        progressionFunc = postMatchProgress;
    } else {
        return;
    }
    
    if (!m || m.winner) return;

    if (idx === 1) m.s1 = Number(m.s1) + 1;
    else m.s2 = Number(m.s2) + 1;

    // Update UI live (still needed for the score box update)
    updateScoreUI(sport, matchId, m.s1, m.s2);

    const pointsToWin = pointsToWinFor(sport);

    // If either player has reached required points -> resolve winner
    if (m.s1 >= pointsToWin || m.s2 >= pointsToWin) {
        let winner, runner;
        if (m.s1 > m.s2) {
            winner = m.p1;
            runner = m.p2;
        } else if (m.s2 > m.s1) {
            winner = m.p2;
            runner = m.p1;
        } else {
            // Tie
            if (customBracketState && customBracketState.sport === sport) {
                // No saving needed for custom state as it's volatile
            } else {
                saveState();
            }
            return;
        }

        if (m.s1 !== m.s2) {
            m.winner = winner;
            if (matchId === "FINAL") m.runner = runner;
            
            // Only record history if it's a fixed bracket or the custom final
            if (!customBracketState || matchId === "FINAL") {
                 recordHistory(sport, m.p1, m.p2, m.s1, m.s2, winner);
            }
            
            // Apply bracket progression
            progressionFunc(matchId);
        }
    }

    if (!(customBracketState && customBracketState.sport === sport)) {
        saveState();
    }
    
    // Re-render
    if (customBracketState && customBracketState.sport === sport) {
         renderCustomBracket(sport);
    } else {
         renderSport(sport);
    }
}


// OVERRIDE: Modify the global score subtraction logic to check for the custom bracket
function subtractPoint(sport, matchId, idx) {
    let m;
    let progressionFunc;

    if (customBracketState && customBracketState.sport === sport) {
        m = customBracketState[matchId];
        progressionFunc = postMatchProgressCustom;
    } else if (state[sport] && state[sport][matchId]) {
        m = state[sport][matchId];
        progressionFunc = postMatchProgress;
    } else {
        return;
    }
    
    if (!m) return;

    if (idx === 1 && m.s1 > 0) m.s1 = Number(m.s1) - 1;
    else if (idx === 2 && m.s2 > 0) m.s2 = Number(m.s2) - 1;

    const pointsToWin = pointsToWinFor(sport);

    // If after subtraction, no-one has enough points -> clear winner & runner
    if (m.winner && (m.s1 < pointsToWin && m.s2 < pointsToWin)) {
        m.winner = null;
        m.runner = null;
        // Re-run progression to clear subsequent matches' players
        progressionFunc(matchId);
    }
    
    if (m.winner && m.s1 === m.s2 && m.s1 >= pointsToWin) {
        m.winner = null;
        m.runner = null;
        progressionFunc(matchId);
    }

    updateScoreUI(sport, matchId, m.s1, m.s2);
    
    if (!(customBracketState && customBracketState.sport === sport)) {
        saveState();
    }
    
    // Re-render
    if (customBracketState && customBracketState.sport === sport) {
         renderCustomBracket(sport);
    } else {
         renderSport(sport);
    }
}


// Reset custom bracket (clear the global state and go back to setup)
function resetCustomBracket(sportKey) {
    if (!confirm(`Reset this custom bracket (${customBracketState.displayName})? This will clear all scores and progress.`)) return;
    customBracketState = null;
    showCreatePopup(); // Go back to the setup screen
}

// Attach event delegation helper modification for custom bracket
function attachScoreDelegation(sport, isCustom = false) {
    const container = document.getElementById("app");
    if (!container) return;

    container.onclick = function (ev) {
        const target = ev.target.closest && ev.target.closest("[data-target]");
        if (!target) return;

        const data = target.dataset.target;
        if (!data) return;
        const [sp, id, idxStr] = data.split("|");
        const idx = Number(idxStr);

        // Ensure we only handle events for the currently-rendered sport/bracket
        if (sp !== sport) return;

        // Determine which state to check against
        let match;
        if (isCustom) {
            match = customBracketState ? customBracketState[id] : null;
        } else {
            match = state[sp] ? state[sp][id] : null;
        }

        if (!match) return;
        if (match.winner) return;

        if (target.classList.contains("inc-btn") || target.closest && target.closest(".inc-btn")) {
            addPoint(sp, id, idx);
        } else if (target.classList.contains("dec-btn") || target.closest && target.closest(".dec-btn")) {
            subtractPoint(sp, id, idx);
        }
    };
}


// OVERRIDE: Modify the main renderSport function to check for an active custom bracket
function renderSport(sport) {
    const app = document.getElementById("app");
    if (!app) return;

    // --- CHECK FOR ACTIVE CUSTOM BRACKET ---
    if (window.isCustomBracketActive(sport)) {
         renderCustomBracket(sport);
         return;
    }
    // ----------------------------------------
    
    // Only render structured tournament if the sport exists in state
    if (!state[sport]) {
        // This is necessary if the user clicks a standard tab while a custom bracket is active
        // but the custom sport key is different from the tab name.
        if(customBracketState) {
            renderCustomBracket(customBracketState.sport);
            return;
        }
        
        app.innerHTML = `<div class="container"><h2>Error: ${escapeHtml(sport.toUpperCase())} not found in fixed bracket.</h2><p>Please use the Badminton, Volleyball, or Carrom tabs, or create a Custom Tournament.</p></div>`;
        return;
    }

    // [The rest of the original renderSport function for fixed brackets remains here...]
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

    // Matches (Badminton logic)
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
        // (Volleyball/Carrom logic)
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
    attachScoreDelegation(sport, false);
}
window.showCreatePopup = showCreatePopup; // Expose globally

// Toggle helper exposed globally for inline onchange used in markup
window.toggleOtherSport = function (selectElem) {
    const customOptions = document.getElementById("custom_options");
    if (!customOptions) return;
    if (selectElem.value === "other") {
        customOptions.style.display = "block";
        document.getElementById("cm_custom_name").focus();
    } else {
        customOptions.style.display = "none";
        document.getElementById("cm_custom_name").value = "";
    }
};

// Start a custom match view (uses window.customState to manage transient data)
function startCustomMatch(sport, playerNames, winPoints) {
    // playerNames is now an array: ["P1", "P2", "P3", ...]
    renderCustomMatch(sport, playerNames, winPoints);
}

// Render a live custom match UI (uses window.customState)
function renderCustomMatch(sport, playerNames, winPoints = WIN_POINTS) {
    const app = document.getElementById("app");
    if (!app) return;
    
    // Determine the actual win points for built-in sports
    let actualWinPoints;
    if (sport.toLowerCase().includes("badminton") || sport.toLowerCase().includes("volleyball")) {
        actualWinPoints = WIN_POINTS;
    } else if (sport.toLowerCase().includes("carrom")) {
        actualWinPoints = CARROM_WIN_POINTS;
    } else {
        // Use the passed winPoints for custom sports
        actualWinPoints = winPoints; 
    }


    // Initialize custom state with all players and scores if needed.
    // If the state already exists, keep it unless the players/sport changed.
    if (!window.customState || window.customState.sport !== sport || JSON.stringify(window.customState.players.map(p => p.name)) !== JSON.stringify(playerNames)) {
        window.customState = { 
            sport, 
            players: playerNames.map(name => ({ name: name, score: 0 })),
            winner: null,
            winPoints: actualWinPoints
        };
    } else {
        // Ensure win points are updated if coming from a custom setup
        window.customState.winPoints = actualWinPoints;
    }

    const cs = window.customState;

    let playerRows = "";
    cs.players.forEach((player, index) => {
        // Use index + 1 as the identifier for the button/score element
        const playerIndex = index + 1; 

        playerRows += `
            <div class="player-row">
                <div class="player-left"><div class="player-name">${escapeHtml(player.name)}</div></div>
                <div class="score-area">
                    <button class="neo-btn dec-btn" id="c_dec${playerIndex}" data-player-index="${playerIndex}" data-action="decrement">
                        <div class="inner">-</div>
                    </button>
                    <button class="neo-btn inc-btn" id="c_inc${playerIndex}" data-player-index="${playerIndex}" data-action="increment">
                        <div class="inner">+ POINT</div>
                        <div class="diamond">+</div>
                    </button>
                    <div id="c_s${playerIndex}" class="score-box">${player.score}</div>
                </div>
            </div>
        `;
    });
    
    // Check if winner is already decided from previous scoring attempt
    const winnerDisplay = cs.winner 
        ? `<strong style="color:var(--gold)">Winner: ${escapeHtml(cs.winner)}</strong>` 
        : `<em>Winner not decided (First to ${cs.winPoints} wins)</em>`;

    app.innerHTML = `
        <div class="container">
        <h2>${escapeHtml(String(sport).toUpperCase())} — Custom Match</h2>
        <button onclick="showCreatePopup()" class="reset-btn">← Back to Custom Setup</button>

        <div class="match-card" id="customMatchCard">
            <div class="match-head"><h3>Custom Game</h3></div>

            ${playerRows}

            <div style="text-align:center;margin-top:15px; font-size:1.1em" id="c_result">${winnerDisplay}</div>
        </div>
        </div>
    `;

    // Attach events using delegation on 'app' to simplify N-player setup
    const customMatchCard = document.getElementById('customMatchCard');
    if (customMatchCard) {
        customMatchCard.onclick = function (ev) {
            const target = ev.target.closest && ev.target.closest("[data-player-index]");
            if (!target) return;
            
            // Do not process score changes if a winner is decided
            if (window.customState && window.customState.winner) return;

            const playerIndex = Number(target.dataset.playerIndex);
            const action = target.dataset.action;

            if (playerIndex > 0) {
                if (action === "increment") {
                     customAdd(playerIndex);
                } else if (action === "decrement") {
                     customSubtract(playerIndex);
                }
            }
        };
    }
}


/**
 * Adds a point to a player in the custom match state.
 * @param {number} playerIndex - The 1-based index of the player to score.
 */
function customAdd(playerIndex) {
    if (!window.customState) return;
    const cs = window.customState;
    
    // Get 0-based index for the array
    const arrayIndex = playerIndex - 1;
    
    // Check for valid player index
    if (arrayIndex < 0 || arrayIndex >= cs.players.length) return;

    // 1. Increment score
    cs.players[arrayIndex].score++;

    // 2. Update UI
    updateCustomMatchUI(cs, playerIndex);

    // 3. Check for Winner
    checkCustomMatchWinner(cs);
}


/**
 * Subtracts a point from a player in the custom match state.
 * @param {number} playerIndex - The 1-based index of the player to score.
 */
function customSubtract(playerIndex) {
    if (!window.customState) return;
    const cs = window.customState;
    
    // Get 0-based index for the array
    const arrayIndex = playerIndex - 1;
    
    // Check for valid player index and non-zero score
    if (arrayIndex < 0 || arrayIndex >= cs.players.length || cs.players[arrayIndex].score <= 0) return;

    // 1. Decrement score
    cs.players[arrayIndex].score--;

    // 2. Update UI
    updateCustomMatchUI(cs, playerIndex);

    // 3. Re-check for Winner (may revert winner status)
    checkCustomMatchWinner(cs);
}

/**
 * Updates the score display for a specific player and the result text.
 * @param {object} cs - The custom match state.
 * @param {number} playerIndex - The 1-based index of the player to update.
 */
function updateCustomMatchUI(cs, playerIndex) {
    const arrayIndex = playerIndex - 1;
    const el = document.getElementById(`c_s${playerIndex}`);
    if (el) el.textContent = cs.players[arrayIndex].score;
    
    // Update result text
    const res = document.getElementById("c_result");
    if (res) {
        if (cs.winner) {
            res.innerHTML = `<strong style="color:var(--gold)">Winner: ${escapeHtml(cs.winner)}</strong>`;
        } else {
            res.innerHTML = `<em>Winner not decided (First to ${cs.winPoints} wins)</em>`;
        }
    }
}

/**
 * Checks for a winner in the custom match and updates state/history.
 * @param {object} cs - The custom match state.
 */
function checkCustomMatchWinner(cs) {
    const winPts = cs.winPoints;
    let maxScore = -1;
    let maxScorers = [];
    let prevWinner = cs.winner;
    cs.winner = null; // Clear winner before re-check

    // Find max score and all players with that score
    cs.players.forEach(p => {
        if (p.score > maxScore) {
            maxScore = p.score;
            maxScorers = [p.name];
        } else if (p.score === maxScore) {
            maxScorers.push(p.name);
        }
    });

    // Only declare a winner if maxScore meets requirement AND it is a unique winner
    if (maxScore >= winPts && maxScorers.length === 1) {
        cs.winner = maxScorers[0];
        
        // If a new winner is found (or winner was re-established after undo)
        if (cs.winner !== prevWinner) {
            const allNames = cs.players.map(p => p.name);
            const p1Name = cs.winner;
            const p2Names = allNames.filter(name => name !== p1Name).join(", ");
            const winnerScore = cs.players.find(p => p.name === cs.winner).score;
            
            // Get the max score of the non-winners for the 'losing score' (s2)
            let losingScore = 0;
            cs.players.filter(p => p.name !== cs.winner).forEach(p => {
                if (p.score > losingScore) losingScore = p.score;
            });

            // Record history (p1=winner, p2=everyone else, s1=winner score, s2=best losing score)
            recordHistory(cs.sport, p1Name, p2Names, winnerScore, losingScore, cs.winner);
        }

    } 
    
    // Update result UI after winner check
    updateCustomMatchUI(cs, 0); // Use 0 to only update result text
}


// --------------------- STARTUP ---------------------
init();

// --------------------- EXPORTS FOR DEBUG (optional) ---------------------
// These are convenient if you open console for debugging.
window._tournamentState = state;
window._matchHistory = matchHistory;
window._saveState = saveState;
window._saveHistory = saveHistory;