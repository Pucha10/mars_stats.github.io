const groupsConfig = {
  "groups": {
    "A": ["Mexico", "South Africa", "South Korea", "Czechia"],
    "B": ["Canada", "Switzerland", "Qatar", "Bosnia and Herzegovina"],
    "C": ["Brazil", "Morocco", "Scotland", "Haiti"],
    "D": ["United States", "Paraguay", "Australia", "Türkiye"],
    "E": ["Germany", "Ecuador", "Ivory Coast", "Curaçao"],
    "F": ["Netherlands", "Sweden", "Japan", "Tunisia"],
    "G": ["Belgium", "Egypt", "Iran", "New Zealand"],
    "H": ["Spain", "Uruguay", "Saudi Arabia", "Cape Verde"],
    "I": ["France", "Senegal", "Norway", "Iraq"],
    "J": ["Argentina", "Austria", "Algeria", "Jordan"],
    "K": ["Portugal", "Colombia", "Uzbekistan", "DR Congo"],
    "L": ["England", "Croatia", "Ghana", "Panama"]
  }
};

// --- Dane techniczne Aneksu C (pule dopuszczalnych rywali dla zwycięzców grup) ---
const annexCPools = {
  "1A": ["C", "E", "F", "H", "I"],
  "1B": ["E", "F", "G", "I", "J"],
  "1D": ["B", "E", "F", "I", "J"],
  "1E": ["A", "B", "C", "D", "F"],
  "1G": ["A", "E", "H", "I", "J"],
  "1I": ["C", "D", "F", "G", "H"],
  "1K": ["D", "E", "I", "J", "L"],
  "1L": ["E", "H", "I", "J", "K"]
};

// Główne kombinacje z oficjalnego Aneksu C (Wikipedia/FIFA) dla szybkiego dopasowania
const annexCOverrides = {
  "EFGHIJKL": { "1A": "E", "1B": "J", "1D": "I", "1E": "F", "1G": "H", "1I": "G", "1K": "L", "1L": "K" },
  "DFGHIJKL": { "1A": "H", "1B": "G", "1D": "I", "1E": "D", "1G": "J", "1I": "F", "1K": "L", "1L": "K" },
  "DEGHIJKL": { "1A": "E", "1B": "J", "1D": "I", "1E": "D", "1G": "H", "1I": "G", "1K": "L", "1L": "K" },
  "DEFHIJKL": { "1A": "E", "1B": "J", "1D": "I", "1E": "D", "1G": "H", "1I": "F", "1K": "L", "1L": "K" },
  "DEFGIJKL": { "1A": "E", "1B": "G", "1D": "I", "1E": "D", "1G": "J", "1I": "F", "1K": "L", "1L": "K" }
};

// Stan lokalny aplikacji
let currentUserId = null;
let currentUsername = "";
let currentTab = "groups"; // "groups", "bracket", "leaderboard"
let activeBracketRound = "r32"; // "r32", "r16", "qf", "sf", "final"

let localGroups = JSON.parse(JSON.stringify(groupsConfig.groups));
let selectedThirds = new Set();

// Struktura meczów drabinki pucharowej
let bracketMatches = {}; // match_id -> { home: text, away: text, winner: text }

document.addEventListener("DOMContentLoaded", async () => {
  currentUserId = localStorage.getItem('wc_user_id');
  currentUsername = localStorage.getItem('wc_username');

  if (!currentUserId) {
    window.location.href = './world-cup-login.html';
    return;
  }

  document.getElementById('user-display').textContent = currentUsername;

  setupTabs();
  setupLogout();
  await loadUserData();
  await loadUserPredictions();
  await loadKnockoutPredictions();
  await loadLeaderboard();
  
  renderGroups();
  updateThirdsCounter();
  checkAndBuildBracket();

  document.getElementById('btn-save').addEventListener('click', saveAllPredictions);
});

// Obsługa zakładek (Tabs)
function setupTabs() {
  const tabGroupsBtn = document.getElementById('tab-groups-btn');
  const tabBracketBtn = document.getElementById('tab-bracket-btn');
  const tabLeaderboardBtn = document.getElementById('tab-leaderboard-btn');

  const secGroups = document.getElementById('section-groups');
  const secBracket = document.getElementById('section-bracket');
  const secLeaderboard = document.getElementById('section-leaderboard');

  const btnSave = document.getElementById('btn-save');

  tabGroupsBtn.addEventListener('click', () => {
    currentTab = "groups";
    tabGroupsBtn.className = "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center bg-slate-700 text-white transition";
    [tabBracketBtn, tabLeaderboardBtn].forEach(b => b.className = "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center text-slate-400 hover:text-white transition");
    secGroups.classList.remove('hidden');
    [secBracket, secLeaderboard].forEach(s => s.classList.add('hidden'));
    btnSave.classList.remove('hidden');
  });

  tabBracketBtn.addEventListener('click', () => {
    currentTab = "bracket";
    tabBracketBtn.className = "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center bg-slate-700 text-white transition";
    [tabGroupsBtn, tabLeaderboardBtn].forEach(b => b.className = "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center text-slate-400 hover:text-white transition");
    secBracket.classList.remove('hidden');
    [secGroups, secLeaderboard].forEach(s => s.classList.add('hidden'));
    btnSave.classList.remove('hidden');
    checkAndBuildBracket();
  });

  tabLeaderboardBtn.addEventListener('click', () => {
    currentTab = "leaderboard";
    tabLeaderboardBtn.className = "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center bg-slate-700 text-white transition";
    [tabGroupsBtn, tabBracketBtn].forEach(b => b.className = "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center text-slate-400 hover:text-white transition");
    secLeaderboard.classList.remove('hidden');
    [secGroups, secBracket].forEach(s => s.classList.add('hidden'));
    btnSave.classList.add('hidden'); 
  });
}

function setupLogout() {
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('wc_user_id');
    localStorage.removeItem('wc_username');
    window.location.href = './world-cup-login.html';
  });
}

async function loadUserData() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${currentUserId}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const users = await response.json();
      if (users.length > 0) {
        document.getElementById('user-points').textContent = `Punkty: ${users[0].points || 0}`;
      }
    }
  } catch (err) { console.error(err); }
}

async function loadUserPredictions() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/group_predictions?user_id=eq.${currentUserId}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const predictions = await response.json();
      if (predictions.length > 0) {
        const tempGroups = {};
        predictions.forEach(pred => {
          if (!tempGroups[pred.group_letter]) tempGroups[pred.group_letter] = [];
          tempGroups[pred.group_letter].push({ name: pred.team_name, rank: pred.predicted_rank, isBestThird: pred.is_best_third });
        });
        Object.keys(tempGroups).forEach(letter => {
          tempGroups[letter].sort((a, b) => a.rank - b.rank);
          localGroups[letter] = tempGroups[letter].map(t => t.name);
          tempGroups[letter].forEach(t => {
            if (t.isBestThird) selectedThirds.add(t.name);
          });
        });
      }
    }
  } catch (err) { console.error(err); }
}

async function loadKnockoutPredictions() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/knockout_predictions?user_id=eq.${currentUserId}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const preds = await response.json();
      preds.forEach(p => {
        if (!bracketMatches[p.match_id]) bracketMatches[p.match_id] = { home: "", away: "", winner: "" };
        bracketMatches[p.match_id].winner = p.predicted_winner;
      });
    }
  } catch (err) { console.error(err); }
}

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=username,points&order=points.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const players = await response.json();
      tbody.innerHTML = players.map((player, index) => `
        <tr class="hover:bg-slate-800/30 transition">
          <td class="py-3 px-4 text-center font-bold text-slate-400">${index + 1}</td>
          <td class="py-3 px-4 font-semibold text-white">${player.username}</td>
          <td class="py-3 px-4 text-right font-bold text-emerald-400">${player.points || 0} pkt</td>
        </tr>
      `).join('');
    }
  } catch (err) { console.error(err); }
}

// Renderowanie grup (Widok Faza Grupowa)
function renderGroups() {
  const container = document.getElementById('groups-container');
  container.innerHTML = Object.keys(localGroups).map(letter => {
    const teams = localGroups[letter];
    return `
      <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div class="bg-slate-900/50 px-4 py-3 border-b border-slate-700">
          <h3 class="font-bold text-white">Grupa ${letter}</h3>
        </div>
        <div class="p-3 space-y-2">
          ${teams.map((team, idx) => {
            const pos = idx + 1;
            const isThird = pos === 3;
            const isChecked = selectedThirds.has(team);
            return `
              <div class="flex items-center justify-between bg-slate-750 p-2.5 rounded-lg border border-slate-700/60 gap-2">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold 
                    ${pos === 1 ? 'bg-emerald-900 text-emerald-300' : ''} 
                    ${pos === 2 ? 'bg-blue-900 text-blue-300' : ''} 
                    ${pos === 3 ? 'bg-amber-950 text-amber-300' : ''} 
                    ${pos === 4 ? 'bg-slate-900 text-slate-400' : ''}">
                    ${pos}
                  </span>
                  <span class="text-xs sm:text-sm font-semibold text-white truncate max-w-[120px]">${team}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  ${isThird ? `
                    <label class="flex items-center gap-1 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded cursor-pointer select-none">
                      <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleThirdPlace('${team}', this.checked)" class="w-3 h-3 text-amber-500 rounded bg-slate-800 border-slate-600">
                      <span class="text-[9px] font-bold text-amber-400 uppercase">Awans</span>
                    </label>
                  ` : ''}
                  <button onclick="moveTeam('${letter}', ${idx}, 'up')" ${idx === 0 ? 'disabled' : ''} class="w-6 h-6 bg-slate-700 rounded text-xs disabled:opacity-20">▲</button>
                  <button onclick="moveTeam('${letter}', ${idx}, 'down')" ${idx === 3 ? 'disabled' : ''} class="w-6 h-6 bg-slate-700 rounded text-xs disabled:opacity-20">▼</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

window.moveTeam = function(letter, index, direction) {
  const group = localGroups[letter];
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= 4) return;

  const oldThird = group[2];
  const temp = group[index];
  group[index] = group[target];
  group[target] = temp;

  const newThird = group[2];
  if (selectedThirds.has(oldThird) && oldThird !== newThird) {
    selectedThirds.delete(oldThird);
  }

  renderGroups();
  updateThirdsCounter();
  checkAndBuildBracket();
};

window.toggleThirdPlace = function(team, isChecked) {
  if (isChecked) {
    if (selectedThirds.size >= 8) {
      alert("Możesz wybrać maksymalnie 8 drużyn z trzecich miejsc!");
      renderGroups();
      return;
    }
    selectedThirds.add(team);
  } else {
    selectedThirds.delete(team);
  }
  updateThirdsCounter();
  checkAndBuildBracket();
};

function updateThirdsCounter() {
  const counter = document.getElementById('thirds-counter');
  counter.textContent = `${selectedThirds.size} / 8`;
  counter.className = selectedThirds.size === 8 ? "text-sm font-bold text-emerald-400" : "text-sm font-bold text-amber-400";
}

// --- LOGIKA DRABINKI PUCHAROWEJ (ANEKS C & POZOSTAŁE RUNDY) ---

// Algorytm dopasowania Aneksu C (Backtracking w przypadku braku gotowego wzorca)
function solveAnnexC(selectedGroups) {
  const sortedKey = [...selectedGroups].sort().join('');
  if (annexCOverrides[sortedKey]) return annexCOverrides[sortedKey];

  // Backtracking solver
  const slots = Object.keys(annexCPools);
  const result = {};
  const used = new Set();

  function backtrack(index) {
    if (index === slots.length) return true;
    const slot = slots[index];
    const allowed = annexCPools[slot];

    for (let group of selectedGroups) {
      if (!used.has(group) && allowed.includes(group)) {
        used.add(group);
        result[slot] = group;
        if (backtrack(index + 1)) return true;
        used.delete(group);
        delete result[slot];
      }
    }
    return false;
  }

  if (backtrack(0)) return result;
  return null; // Zabezpieczenie
}

// Inicjalizacja i sprawdzenie drabinki
function checkAndBuildBracket() {
  const lockMsg = document.getElementById('bracket-lock-msg');
  const bracketContent = document.getElementById('bracket-content');

  if (selectedThirds.size !== 8) {
    lockMsg.classList.remove('hidden');
    bracketContent.classList.add('hidden');
    return;
  }

  lockMsg.classList.add('hidden');
  bracketContent.classList.remove('hidden');

  buildRoundOf32();
  propagateBracket();
  renderBracket();
}

// Budowanie par 1/16 finału na podstawie regulaminu FIFA
function buildRoundOf32() {
  // Wyznaczenie grup, z których awansują trzecie miejsca
  const thirdPlaceGroups = [];
  Object.keys(localGroups).forEach(letter => {
    const thirdTeam = localGroups[letter][2];
    if (selectedThirds.has(thirdTeam)) {
      thirdPlaceGroups.push(letter);
    }
  });

  const matching = solveAnnexC(thirdPlaceGroups);

  const getTeam = (letter, rank) => localGroups[letter][rank - 1];
  const getThirdTeamOfGroup = (letter) => localGroups[letter][2];

  // Definiowanie 16 par 1/16 finału według oficjalnego rozkładu FIFA (Mecze 73-88)
  const r32Matches = {
    73: { home: getTeam("A", 2), away: getTeam("B", 2) },
    74: { home: getTeam("E", 1), away: getThirdTeamOfGroup(matching["1E"]) },
    75: { home: getTeam("F", 1), away: getTeam("C", 2) },
    76: { home: getTeam("C", 1), away: getTeam("F", 2) },
    77: { home: getTeam("I", 1), away: getThirdTeamOfGroup(matching["1I"]) },
    78: { home: getTeam("E", 2), away: getTeam("I", 2) },
    79: { home: getTeam("A", 1), away: getThirdTeamOfGroup(matching["1A"]) },
    80: { home: getTeam("L", 1), away: getThirdTeamOfGroup(matching["1L"]) },
    81: { home: getTeam("D", 1), away: getThirdTeamOfGroup(matching["1D"]) },
    82: { home: getTeam("G", 1), away: getThirdTeamOfGroup(matching["1G"]) },
    83: { home: getTeam("K", 2), away: getTeam("L", 2) },
    84: { home: getTeam("H", 1), away: getTeam("J", 2) },
    85: { home: getTeam("B", 1), away: getThirdTeamOfGroup(matching["1B"]) },
    86: { home: getTeam("J", 1), away: getTeam("H", 2) },
    87: { home: getTeam("K", 1), away: getThirdTeamOfGroup(matching["1K"]) },
    88: { home: getTeam("D", 2), away: getTeam("G", 2) }
  };

  // Łączymy wyliczone pary z typami zapisanymi przez użytkownika w pamięci
  Object.keys(r32Matches).forEach(id => {
    const matchId = parseInt(id);
    if (!bracketMatches[matchId]) {
      bracketMatches[matchId] = { home: "", away: "", winner: "" };
    }
    bracketMatches[matchId].home = r32Matches[matchId].home;
    bracketMatches[matchId].away = r32Matches[matchId].away;
  });
}

// Automatyczne przesyłanie wygranych drużyn w górę drabinki (Mecze 89-104)
function propagateBracket() {
  const getWinner = (id) => (bracketMatches[id] && bracketMatches[id].winner) ? bracketMatches[id].winner : "";
  const getLoser = (id) => {
    const m = bracketMatches[id];
    if (!m || !m.winner) return "";
    return m.winner === m.home ? m.away : m.home;
  };

  const setMatch = (id, homeTeam, awayTeam) => {
    if (!bracketMatches[id]) bracketMatches[id] = { home: "", away: "", winner: "" };
    
    // Jeśli zmieniły się drużyny grające, a dotychczasowy zwycięzca nie gra w tym meczu, resetujemy zwycięzcę
    if (bracketMatches[id].home !== homeTeam || bracketMatches[id].away !== awayTeam) {
      bracketMatches[id].home = homeTeam;
      bracketMatches[id].away = awayTeam;
      if (bracketMatches[id].winner !== homeTeam && bracketMatches[id].winner !== awayTeam) {
        bracketMatches[id].winner = "";
      }
    }
  };

  // 1/8 Finału (Mecze 89 - 96)
  setMatch(89, getWinner(74), getWinner(77));
  setMatch(90, getWinner(73), getWinner(75));
  setMatch(91, getWinner(76), getWinner(78));
  setMatch(92, getWinner(79), getWinner(80));
  setMatch(93, getWinner(83), getWinner(84));
  setMatch(94, getWinner(81), getWinner(82));
  setMatch(95, getWinner(86), getWinner(88));
  setMatch(96, getWinner(85), getWinner(87));

  // Ćwierćfinały (Mecze 97 - 100)
  setMatch(97, getWinner(89), getWinner(90));
  setMatch(98, getWinner(93), getWinner(94));
  setMatch(99, getWinner(91), getWinner(92));
  setMatch(100, getWinner(95), getWinner(96));

  // Półfinały (Mecze 101 - 102)
  setMatch(101, getWinner(97), getWinner(98));
  setMatch(102, getWinner(99), getWinner(100));

  // Finał oraz Mecz o 3. miejsce (Mecze 103 - 104)
  setMatch(103, getLoser(101), getLoser(102)); // o 3. miejsce
  setMatch(104, getWinner(101), getWinner(102)); // Finał
}

// Przełączanie widoku rund drabinki
window.switchBracketRound = function(roundKey) {
  activeBracketRound = roundKey;
  
  // Zmiana styli przycisków rund
  ["r32", "r16", "qf", "sf", "final"].forEach(r => {
    const btn = document.getElementById(`btn-${r}`);
    if (r === roundKey) {
      btn.className = "flex-none sm:flex-1 px-4 py-2 text-xs font-bold rounded bg-slate-700 text-white";
    } else {
      btn.className = "flex-none sm:flex-1 px-4 py-2 text-xs font-bold rounded text-slate-400 hover:text-white";
    }
  });

  renderBracket();
};

// Mapowanie rund na numery meczów
const roundMatchMap = {
  "r32": [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  "r16": [89, 90, 93, 94, 91, 92, 95, 96],
  "qf": [97, 98, 99, 100],
  "sf": [101, 102],
  "final": [103, 104]
};

const roundNames = {
  "r32": "1/16 Finału",
  "r16": "1/8 Finału",
  "qf": "Ćwierćfinał",
  "sf": "Półfinał",
  "final": "Finały"
};

// Generowanie HTML dla meczów wybranej rundy drabinki
function renderBracket() {
  const container = document.getElementById('bracket-matches-container');
  const matchIds = roundMatchMap[activeBracketRound];

  container.innerHTML = matchIds.map(id => {
    const match = bracketMatches[id] || { home: "", away: "", winner: "" };
    const homeName = match.home || "???";
    const awayName = match.away || "???";
    const winner = match.winner;

    const isHomeClickable = match.home !== "";
    const isAwayClickable = match.away !== "";

    const is3rdPlacePlayoff = id === 103;
    const isFinal = id === 104;

    let matchLabel = `Mecz ${id}`;
    if (is3rdPlacePlayoff) matchLabel = "Mecz o 3. miejsce 🥉";
    if (isFinal) matchLabel = "WIELKI FINAŁ 🏆";

    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between shadow">
        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">${matchLabel}</div>
        
        <div class="space-y-2">
          <!-- Gospodarz -->
          <button 
            onclick="predictBracketWinner(${id}, '${homeName}')"
            ${!isHomeClickable ? 'disabled' : ''}
            class="w-full text-left p-3 rounded-lg border flex justify-between items-center transition
              ${winner === homeName ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold' : 'bg-slate-750 border-slate-700/60 text-slate-300'}
              ${!isHomeClickable ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-500'}"
          >
            <span class="text-xs sm:text-sm truncate">${homeName}</span>
            ${winner === homeName ? '<span class="text-xs text-emerald-400">✔ Awans</span>' : ''}
          </button>

          <!-- Gość -->
          <button 
            onclick="predictBracketWinner(${id}, '${awayName}')"
            ${!isAwayClickable ? 'disabled' : ''}
            class="w-full text-left p-3 rounded-lg border flex justify-between items-center transition
              ${winner === awayName ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold' : 'bg-slate-750 border-slate-700/60 text-slate-300'}
              ${!isAwayClickable ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-500'}"
          >
            <span class="text-xs sm:text-sm truncate">${awayName}</span>
            ${winner === awayName ? '<span class="text-xs text-emerald-400">✔ Awans</span>' : ''}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Zaznaczenie zwycięzcy i natychmiastowa aktualizacja całej drabinki
window.predictBracketWinner = function(matchId, winnerTeam) {
  if (winnerTeam === "???") return;

  bracketMatches[matchId].winner = winnerTeam;
  
  // Propagacja i odświeżenie widoku
  propagateBracket();
  renderBracket();
};

// --- OBSŁUGA ZAPISU DO SUPABASE ---

async function saveAllPredictions() {
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = "Zapisywanie...";

  try {
    // 1. ZAPIS FAZY GRUPOWEJ
    const groupPayload = [];
    Object.keys(localGroups).forEach(letter => {
      localGroups[letter].forEach((team, idx) => {
        const rank = idx + 1;
        const isBestThird = (rank === 3 && selectedThirds.has(team));
        groupPayload.push({
          user_id: parseInt(currentUserId),
          group_letter: letter,
          team_name: team,
          predicted_rank: rank,
          is_best_third: isBestThird
        });
      });
    });

    const delGroups = await fetch(`${SUPABASE_URL}/rest/v1/group_predictions?user_id=eq.${currentUserId}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!delGroups.ok) throw new Error("Nie udało się zresetować poprzednich typów grupowych.");

    const insGroups = await fetch(`${SUPABASE_URL}/rest/v1/group_predictions`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(groupPayload)
    });
    if (!insGroups.ok) throw new Error("Błąd podczas zapisywania fazy grupowej.");

    // 2. ZAPIS DRABINKI PUCHAROWEJ (tylko gdy jest odblokowana i uzupełniona)
    if (selectedThirds.size === 8) {
      const knockoutPayload = [];
      Object.keys(bracketMatches).forEach(matchId => {
        const winner = bracketMatches[matchId].winner;
        if (winner && winner !== "???") {
          knockoutPayload.push({
            user_id: parseInt(currentUserId),
            match_id: parseInt(matchId),
            predicted_winner: winner
          });
        }
      });

      if (knockoutPayload.length > 0) {
        const delKnockout = await fetch(`${SUPABASE_URL}/rest/v1/knockout_predictions?user_id=eq.${currentUserId}`, {
          method: "DELETE",
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        if (!delKnockout.ok) throw new Error("Nie udało się zresetować poprzedniej drabinki.");

        const insKnockout = await fetch(`${SUPABASE_URL}/rest/v1/knockout_predictions`, {
          method: "POST",
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(knockoutPayload)
        });
        if (!insKnockout.ok) throw new Error("Błąd podczas zapisywania drabinki pucharowej.");
      }
    }

    alert("Wszystkie Twoje typy (grupy oraz drabinka) zostały pomyślnie zapisane!");
  } catch (err) {
    console.error(err);
    alert("Wystąpił błąd podczas zapisu: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Zapisz moje typy";
  }
}