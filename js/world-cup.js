const groupsConfig = {
    groups: {
        A: ["Meksyk", "RPA", "Korea Południowa", "Czechy"],
        B: ["Kanada", "Szwajcaria", "Katar", "Bośnia i Hercegowina"],
        C: ["Brazylia", "Maroko", "Szkocja", "Haiti"],
        D: ["USA", "Paragwaj", "Australia", "Turcja"],
        E: ["Niemcy", "Ekwador", "WKS", "Curaçao"],
        F: ["Holandia", "Szwecja", "Japonia", "Tunezja"],
        G: ["Belgia", "Egipt", "Iran", "Nowa Zelandia"],
        H: [
            "Hiszpania",
            "Urugwaj",
            "Arabia Saudyjska",
            "Republika Zielonego Przylądka",
        ],
        I: ["Francja", "Senegal", "Norwegia", "Irak"],
        J: ["Argentyna", "Austria", "Algieria", "Jordania"],
        K: ["Portugalia", "Kolumbia", "Uzbekistan", "DR Kongo"],
        L: ["Anglia", "Chorwacja", "Ghana", "Panama"],
    },
};

const annexCPools = {
    "1A": ["C", "E", "F", "H", "I"],
    "1B": ["E", "F", "G", "I", "J"],
    "1D": ["B", "E", "F", "I", "J"],
    "1E": ["A", "B", "C", "D", "F"],
    "1G": ["A", "E", "H", "I", "J"],
    "1I": ["C", "D", "F", "G", "H"],
    "1K": ["D", "E", "I", "J", "L"],
    "1L": ["E", "H", "I", "J", "K"],
};

const annexCOverrides = {
    EFGHIJKL: {
        "1A": "E",
        "1B": "J",
        "1D": "I",
        "1E": "F",
        "1G": "H",
        "1I": "G",
        "1K": "L",
        "1L": "K",
    },
    DFGHIJKL: {
        "1A": "H",
        "1B": "G",
        "1D": "I",
        "1E": "D",
        "1G": "J",
        "1I": "F",
        "1K": "L",
        "1L": "K",
    },
    DEGHIJKL: {
        "1A": "E",
        "1B": "J",
        "1D": "I",
        "1E": "D",
        "1G": "H",
        "1I": "G",
        "1K": "L",
        "1L": "K",
    },
    DEFHIJKL: {
        "1A": "E",
        "1B": "J",
        "1D": "I",
        "1E": "D",
        "1G": "H",
        "1I": "F",
        "1K": "L",
        "1L": "K",
    },
    DEFGIJKL: {
        "1A": "E",
        "1B": "G",
        "1D": "I",
        "1E": "D",
        "1G": "J",
        "1I": "F",
        "1K": "L",
        "1L": "K",
    },
};

let currentUserId = null;
let currentUsername = "";
let currentTab = "groups";
let activeBracketRound = "r32";

let localGroups = JSON.parse(JSON.stringify(groupsConfig.groups));
let selectedThirds = new Set();
let bracketMatches = {};
let localPlayers = { top_scorer: "", mvp: "", best_goalkeeper: "" };

let loadedGroups = null;
let loadedThirds = new Set();
let loadedBracketWinners = {};
let loadedPlayers = { top_scorer: "", mvp: "", best_goalkeeper: "" };

let previewUserId = null;
let previewUsername = "";
let myBackupState = null;

for (let i = 73; i <= 104; i++) {
    bracketMatches[i] = { home: "", away: "", winner: "" };
    loadedBracketWinners[i] = "";
}

document.addEventListener("DOMContentLoaded", async () => {
    currentUserId = localStorage.getItem("wc_user_id");
    currentUsername = localStorage.getItem("wc_username");

    if (!currentUserId) {
        window.location.href = "./world-cup-login.html";
        return;
    }

    document.getElementById("user-display").textContent = currentUsername;

    setupTabs();
    setupLogout();
    setupPlayerInputListeners();
    await loadUserData();
    await loadUserPredictions();
    await loadKnockoutPredictions();
    await loadPlayerPredictions();
    await loadLeaderboard();

    saveSnapshotAsLoaded();

    renderGroups();
    updateThirdsCounter();
    checkAndBuildBracket();
    updateSaveButtonState();

    // document
    //     .getElementById("btn-save")
    //     .addEventListener("click", saveAllPredictions);
});

function saveSnapshotAsLoaded() {
    loadedGroups = JSON.parse(JSON.stringify(localGroups));
    loadedThirds = new Set(selectedThirds);
    for (let i = 73; i <= 104; i++) {
        loadedBracketWinners[i] =
            bracketMatches[i] && bracketMatches[i].winner
                ? bracketMatches[i].winner
                : "";
    }
    loadedPlayers = { ...localPlayers };
}

function checkIfChanged() {
    if (!loadedGroups) return false;

    if (JSON.stringify(localGroups) !== JSON.stringify(loadedGroups))
        return true;

    if (selectedThirds.size !== loadedThirds.size) return true;
    for (let item of selectedThirds) {
        if (!loadedThirds.has(item)) return true;
    }

    for (let i = 73; i <= 104; i++) {
        const currentWin =
            bracketMatches[i] && bracketMatches[i].winner
                ? bracketMatches[i].winner
                : "";
        const loadedWin = loadedBracketWinners[i] || "";
        if (currentWin !== loadedWin) return true;
    }

    if (
        localPlayers.top_scorer !== loadedPlayers.top_scorer ||
        localPlayers.mvp !== loadedPlayers.mvp ||
        localPlayers.best_goalkeeper !== loadedPlayers.best_goalkeeper
    ) {
        return true;
    }

    return false;
}

function setupPlayerInputListeners() {
    const scorerInput = document.getElementById("input-scorer");
    const mvpInput = document.getElementById("input-mvp");
    const goalkeeperInput = document.getElementById("input-goalkeeper");

    scorerInput.addEventListener("input", (e) => {
        localPlayers.top_scorer = e.target.value.trim();
        updateSaveButtonState();
    });

    mvpInput.addEventListener("input", (e) => {
        localPlayers.mvp = e.target.value.trim();
        updateSaveButtonState();
    });

    goalkeeperInput.addEventListener("input", (e) => {
        localPlayers.best_goalkeeper = e.target.value.trim();
        updateSaveButtonState();
    });
}

function updateSaveButtonState() {
    const btnSave = document.getElementById("btn-save");
    if (btnSave) {
        btnSave.remove();
        return;
    }
    const hasChanged = checkIfChanged();

    if (hasChanged) {
        btn.disabled = false;
        btn.className =
            "w-full max-w-md bg-emerald-600 hover:bg-emerald-550 text-white font-bold py-3.5 px-6 rounded-xl text-sm tracking-wide transition shadow-lg active:scale-95 cursor-pointer opacity-100";
    } else {
        btn.disabled = true;
        btn.className =
            "w-full max-w-md bg-slate-700 text-slate-500 font-bold py-3.5 px-6 rounded-xl text-sm tracking-wide transition shadow-lg cursor-not-allowed opacity-50";
    }
}

function resetKnockoutPredictions() {
    for (let id = 73; id <= 104; id++) {
        if (bracketMatches[id]) {
            bracketMatches[id].winner = "";
        }
    }
}

function setupTabs() {
    const tabGroupsBtn = document.getElementById("tab-groups-btn");
    const tabBracketBtn = document.getElementById("tab-bracket-btn");
    const tabLeaderboardBtn = document.getElementById("tab-leaderboard-btn");

    const secGroups = document.getElementById("section-groups");
    const secBracket = document.getElementById("section-bracket");
    const secLeaderboard = document.getElementById("section-leaderboard");

    const btnSave = document.getElementById("btn-save");

    tabGroupsBtn.addEventListener("click", () => {
        currentTab = "groups";
        tabGroupsBtn.className =
            "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center bg-slate-700 text-white transition";
        [tabBracketBtn, tabLeaderboardBtn].forEach(
            (b) =>
                (b.className =
                    "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center text-slate-400 hover:text-white transition"),
        );
        secGroups.classList.remove("hidden");
        [secBracket, secLeaderboard].forEach((s) => s.classList.add("hidden"));
        btnSave.classList.remove("hidden");
    });

    tabBracketBtn.addEventListener("click", () => {
        currentTab = "bracket";
        tabBracketBtn.className =
            "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center bg-slate-700 text-white transition";
        [tabGroupsBtn, tabLeaderboardBtn].forEach(
            (b) =>
                (b.className =
                    "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center text-slate-400 hover:text-white transition"),
        );
        secBracket.classList.remove("hidden");
        [secGroups, secLeaderboard].forEach((s) => s.classList.add("hidden"));
        btnSave.classList.remove("hidden");
        checkAndBuildBracket();
    });

    tabLeaderboardBtn.addEventListener("click", () => {
        currentTab = "leaderboard";
        tabLeaderboardBtn.className =
            "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center bg-slate-700 text-white transition";
        [tabGroupsBtn, tabBracketBtn].forEach(
            (b) =>
                (b.className =
                    "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center text-slate-400 hover:text-white transition"),
        );
        secLeaderboard.classList.remove("hidden");
        [secGroups, secBracket].forEach((s) => s.classList.add("hidden"));
        btnSave.classList.add("hidden");
    });
}

function setupLogout() {
    document.getElementById("btn-logout").addEventListener("click", () => {
        localStorage.removeItem("wc_user_id");
        localStorage.removeItem("wc_username");
        window.location.href = "./world-cup-login.html";
    });
}

function renderGroups() {
    const container = document.getElementById("groups-container");
    if (!container) return;

    const scorerInput = document.getElementById("input-scorer");
    const mvpInput = document.getElementById("input-mvp");
    const goalkeeperInput = document.getElementById("input-goalkeeper");

    [scorerInput, mvpInput, goalkeeperInput].forEach((input) => {
        if (input) {
            input.readOnly = true;
            input.className =
                "w-full bg-slate-800 text-slate-400 border border-slate-700 rounded-lg px-3 py-2.5 text-sm cursor-not-allowed select-none";
        }
    });

    container.innerHTML = Object.keys(localGroups)
        .map((letter) => {
            const teams = localGroups[letter];
            return `
      <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div class="bg-slate-900/50 px-4 py-3 border-b border-slate-700">
          <h3 class="font-bold text-white">Grupa ${letter}</h3>
        </div>
        <div class="p-3 space-y-2">
          ${teams
              .map((team, idx) => {
                  const pos = idx + 1;
                  const isThird = pos === 3;
                  const isChecked = selectedThirds.has(team);
                  return `
              <div class="flex items-center justify-between bg-slate-750 p-2.5 rounded-lg border border-slate-700/60 gap-2">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold 
                    ${pos === 1 ? "bg-emerald-900 text-emerald-300" : ""} 
                    ${pos === 2 ? "bg-blue-900 text-blue-300" : ""} 
                    ${pos === 3 ? "bg-amber-950 text-amber-300" : ""} 
                    ${pos === 4 ? "bg-slate-900 text-slate-400" : ""}">
                    ${pos}
                  </span>
                  <span class="text-xs sm:text-sm font-semibold text-white truncate max-w-[120px]">${team}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  ${
                      isThird
                          ? `
                    <label class="flex items-center gap-1 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded cursor-not-allowed select-none opacity-60">
                      <input type="checkbox" ${isChecked ? "checked" : ""} disabled class="w-3 h-3 text-amber-500 rounded bg-slate-800 border-slate-600 cursor-not-allowed">
                      <span class="text-[9px] font-bold text-amber-400 uppercase">Awans</span>
                    </label>
                  `
                          : ""
                  }
                </div>
              </div>
            `;
              })
              .join("")}
        </div>
      </div>
    `;
        })
        .join("");
}

window.moveTeam = function (letter, index, direction) {
    const group = localGroups[letter];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= 4) return;

    const oldThird = group[2];
    const temp = group[index];
    group[index] = group[target];
    group[target] = temp;

    const newThird = group[2];
    if (selectedThirds.has(oldThird) && oldThird !== newThird) {
        selectedThirds.delete(oldThird);
    }

    resetKnockoutPredictions();

    renderGroups();
    updateThirdsCounter();
    checkAndBuildBracket();
    updateSaveButtonState();
};

window.toggleThirdPlace = function (team, isChecked) {
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

    resetKnockoutPredictions();

    updateThirdsCounter();
    checkAndBuildBracket();
    updateSaveButtonState();
};

function updateThirdsCounter() {
    const counter = document.getElementById("thirds-counter");
    counter.textContent = `${selectedThirds.size} / 8`;
    counter.className =
        selectedThirds.size === 8
            ? "text-sm font-bold text-emerald-400"
            : "text-sm font-bold text-amber-400";
}

function solveAnnexC(selectedGroups) {
    const sortedKey = [...selectedGroups].sort().join("");

    if (window.annexCMapping && window.annexCMapping[sortedKey]) {
        return window.annexCMapping[sortedKey];
    }

    if (annexCOverrides[sortedKey]) return annexCOverrides[sortedKey];

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
    return null;
}

function checkAndBuildBracket() {
    const lockMsg = document.getElementById("bracket-lock-msg");
    const bracketContent = document.getElementById("bracket-content");

    if (selectedThirds.size !== 8) {
        lockMsg.classList.remove("hidden");
        bracketContent.classList.add("hidden");
        return;
    }

    lockMsg.classList.add("hidden");
    bracketContent.classList.remove("hidden");

    buildRoundOf32();
    propagateBracket();
    renderBracket();
}

function buildRoundOf32() {
    const thirdPlaceGroups = [];
    Object.keys(localGroups).forEach((letter) => {
        const thirdTeam = localGroups[letter][2];
        if (selectedThirds.has(thirdTeam)) {
            thirdPlaceGroups.push(letter);
        }
    });

    const matching = solveAnnexC(thirdPlaceGroups);
    if (!matching) return;

    const getTeam = (letter, rank) => localGroups[letter][rank - 1];
    const getThirdTeamOfGroup = (source) => {
        if (!source) return "???";
        const letter = source.replace("3", "").trim();
        return localGroups[letter] ? localGroups[letter][2] : "???";
    };

    const r32Matches = {
        73: { home: getTeam("A", 2), away: getTeam("B", 2) },
        74: {
            home: getTeam("E", 1),
            away: getThirdTeamOfGroup(matching["1E"]),
        },
        75: { home: getTeam("F", 1), away: getTeam("C", 2) },
        76: { home: getTeam("C", 1), away: getTeam("F", 2) },
        77: {
            home: getTeam("I", 1),
            away: getThirdTeamOfGroup(matching["1I"]),
        },
        78: { home: getTeam("E", 2), away: getTeam("I", 2) },
        79: {
            home: getTeam("A", 1),
            away: getThirdTeamOfGroup(matching["1A"]),
        },
        80: {
            home: getTeam("L", 1),
            away: getThirdTeamOfGroup(matching["1L"]),
        },
        81: {
            home: getTeam("D", 1),
            away: getThirdTeamOfGroup(matching["1D"]),
        },
        82: {
            home: getTeam("G", 1),
            away: getThirdTeamOfGroup(matching["1G"]),
        },
        83: { home: getTeam("K", 2), away: getTeam("L", 2) },
        84: { home: getTeam("H", 1), away: getTeam("J", 2) },
        85: {
            home: getTeam("B", 1),
            away: getThirdTeamOfGroup(matching["1B"]),
        },
        86: { home: getTeam("J", 1), away: getTeam("H", 2) },
        87: {
            home: getTeam("K", 1),
            away: getThirdTeamOfGroup(matching["1K"]),
        },
        88: { home: getTeam("D", 2), away: getTeam("G", 2) },
    };

    Object.keys(r32Matches).forEach((id) => {
        const matchId = parseInt(id);
        if (!bracketMatches[matchId]) {
            bracketMatches[matchId] = { home: "", away: "", winner: "" };
        }
        bracketMatches[matchId].home = r32Matches[matchId].home;
        bracketMatches[matchId].away = r32Matches[matchId].away;
    });
}

function propagateBracket() {
    const getWinner = (id) =>
        bracketMatches[id] && bracketMatches[id].winner
            ? bracketMatches[id].winner
            : "";
    const getLoser = (id) => {
        const m = bracketMatches[id];
        if (!m || !m.winner) return "";
        return m.winner === m.home ? m.away : m.home;
    };

    const setMatch = (id, homeTeam, awayTeam) => {
        if (!bracketMatches[id])
            bracketMatches[id] = { home: "", away: "", winner: "" };

        if (
            bracketMatches[id].home !== homeTeam ||
            bracketMatches[id].away !== awayTeam
        ) {
            bracketMatches[id].home = homeTeam;
            bracketMatches[id].away = awayTeam;
            if (
                bracketMatches[id].winner !== homeTeam &&
                bracketMatches[id].winner !== awayTeam
            ) {
                bracketMatches[id].winner = "";
            }
        }
    };

    setMatch(89, getWinner(74), getWinner(77));
    setMatch(90, getWinner(73), getWinner(75));
    setMatch(91, getWinner(76), getWinner(78));
    setMatch(92, getWinner(79), getWinner(80));
    setMatch(93, getWinner(83), getWinner(84));
    setMatch(94, getWinner(81), getWinner(82));
    setMatch(95, getWinner(86), getWinner(88));
    setMatch(96, getWinner(85), getWinner(87));

    setMatch(97, getWinner(89), getWinner(90));
    setMatch(98, getWinner(93), getWinner(94));
    setMatch(99, getWinner(91), getWinner(92));
    setMatch(100, getWinner(95), getWinner(96));

    setMatch(101, getWinner(97), getWinner(98));
    setMatch(102, getWinner(99), getWinner(100));

    setMatch(103, getLoser(101), getLoser(102));
    setMatch(104, getWinner(101), getWinner(102));
}

window.switchBracketRound = function (roundKey) {
    activeBracketRound = roundKey;

    ["r32", "r16", "qf", "sf", "final"].forEach((r) => {
        const btn = document.getElementById(`btn-${r}`);
        if (r === roundKey) {
            btn.className =
                "flex-none sm:flex-1 px-4 py-2 text-xs font-bold rounded bg-slate-700 text-white";
        } else {
            btn.className =
                "flex-none sm:flex-1 px-4 py-2 text-xs font-bold rounded text-slate-400 hover:text-white";
        }
    });

    renderBracket();
};

const roundMatchMap = {
    r32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
    r16: [89, 90, 93, 94, 91, 92, 95, 96],
    qf: [97, 98, 99, 100],
    sf: [101, 102],
    final: [103, 104],
};

function renderBracket() {
    const container = document.getElementById("bracket-matches-container");
    const matchIds = roundMatchMap[activeBracketRound];
    if (!container) return;

    container.innerHTML = matchIds
        .map((id) => {
            const match = bracketMatches[id] || {
                home: "",
                away: "",
                winner: "",
            };
            const homeName = match.home || "???";
            const awayName = match.away || "???";
            const winner = match.winner;

            const is3rdPlacePlayoff = id === 103;
            const isFinal = id === 104;

            let matchLabel = `Mecz ${id}`;
            if (is3rdPlacePlayoff) matchLabel = "Mecz o 3. miejsce 🥉";
            if (isFinal) matchLabel = "WIELKI FINAŁ 🏆";

            return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between shadow">
        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">${matchLabel}</div>
        
        <div class="space-y-2">
          <button 
            disabled
            class="w-full text-left p-3 rounded-lg border flex justify-between items-center transition cursor-not-allowed
              ${winner === homeName ? "bg-emerald-950/60 border-emerald-500 text-white font-bold" : "bg-slate-750 border-slate-700/60 text-slate-400 opacity-60"}"
          >
            <span class="text-xs sm:text-sm truncate">${homeName}</span>
            ${winner === homeName ? '<span class="text-xs text-emerald-400">✔ Zwycięzca</span>' : ""}
          </button>

          <button 
            disabled
            class="w-full text-left p-3 rounded-lg border flex justify-between items-center transition cursor-not-allowed
              ${winner === awayName ? "bg-emerald-950/60 border-emerald-500 text-white font-bold" : "bg-slate-750 border-slate-700/60 text-slate-400 opacity-60"}"
          >
            <span class="text-xs sm:text-sm truncate">${awayName}</span>
            ${winner === awayName ? '<span class="text-xs text-emerald-400">✔ Zwycięzca</span>' : ""}
          </button>
        </div>
      </div>
    `;
        })
        .join("");
}

async function loadUserStandingsAndBracket(userId) {
    const headers = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    const results = {
        groups: {},
        thirds: new Set(),
        koMatches: {},
        players: { top_scorer: "", mvp: "", best_goalkeeper: "" },
    };

    for (let i = 73; i <= 104; i++) {
        results.koMatches[i] = { home: "", away: "", winner: "" };
    }

    try {
        const resGroups = await fetch(
            `${SUPABASE_URL}/rest/v1/group_predictions?user_id=eq.${userId}`,
            { headers },
        );
        if (resGroups.ok) {
            const preds = await resGroups.json();
            const tempGroups = {};
            preds.forEach((p) => {
                if (!tempGroups[p.group_letter])
                    tempGroups[p.group_letter] = [];
                tempGroups[p.group_letter].push({
                    name: p.team_name,
                    rank: p.predicted_rank,
                    isBestThird: p.is_best_third,
                });
            });
            Object.keys(tempGroups).forEach((letter) => {
                tempGroups[letter].sort((a, b) => a.rank - b.rank);
                results.groups[letter] = tempGroups[letter].map((t) => t.name);
                tempGroups[letter].forEach((t) => {
                    if (t.isBestThird) results.thirds.add(t.name);
                });
            });
        }

        const resKO = await fetch(
            `${SUPABASE_URL}/rest/v1/knockout_predictions?user_id=eq.${userId}`,
            { headers },
        );
        if (resKO.ok) {
            const preds = await resKO.json();
            preds.forEach((p) => {
                if (!results.koMatches[p.match_id])
                    results.koMatches[p.match_id] = {
                        home: "",
                        away: "",
                        winner: "",
                    };
                results.koMatches[p.match_id].winner = p.predicted_winner;
            });
        }

        const resPlayers = await fetch(
            `${SUPABASE_URL}/rest/v1/player_predictions?user_id=eq.${userId}`,
            { headers },
        );
        if (resPlayers.ok) {
            const data = await resPlayers.json();
            if (data.length > 0) {
                results.players.top_scorer = data[0].top_scorer || "";
                results.players.mvp = data[0].mvp || "";
                results.players.best_goalkeeper = data[0].best_goalkeeper || "";
            }
        }
    } catch (err) {
        console.error("Błąd pobierania danych podglądu:", err);
    }

    return results;
}

window.previewUserPredictions = async function (userId, username) {
    const targetData = await loadUserStandingsAndBracket(userId);

    localGroups =
        Object.keys(targetData.groups).length > 0
            ? targetData.groups
            : JSON.parse(JSON.stringify(groupsConfig.groups));
    selectedThirds = targetData.thirds;
    bracketMatches = targetData.koMatches;
    localPlayers = targetData.players;

    const scorerInput = document.getElementById("input-scorer");
    const mvpInput = document.getElementById("input-mvp");
    const goalkeeperInput = document.getElementById("input-goalkeeper");

    if (scorerInput) scorerInput.value = localPlayers.top_scorer;
    if (mvpInput) mvpInput.value = localPlayers.mvp;
    if (goalkeeperInput) goalkeeperInput.value = localPlayers.best_goalkeeper;

    const userDisplay = document.getElementById("user-display");
    if (userDisplay) {
        userDisplay.textContent = `${username} (Podgląd)`;
    }

    document.getElementById("tab-groups-btn").click();
    renderGroups();
    updateThirdsCounter();
    checkAndBuildBracket();
};

window.predictBracketWinner = function (matchId, winnerTeam) {
    if (winnerTeam === "???") return;

    bracketMatches[matchId].winner = winnerTeam;

    propagateBracket();
    renderBracket();
    updateSaveButtonState();
};

let globalActualData = null;

window.showPlayerScoreDetails = async function (
    userId,
    username,
    name,
    surname,
) {
    const modal = document.getElementById("details-modal");
    const modalName = document.getElementById("modal-player-name");
    const modalContent = document.getElementById("modal-content");
    const modalTotal = document.getElementById("modal-total-score");

    if (!modal || !modalContent) return;

    const displayName =
        name && surname ? `${username} (${name} ${surname})` : username;
    modalName.textContent = displayName;
    modalContent.innerHTML =
        '<div class="text-center py-8 text-slate-400">Trwa pobieranie i kalkulacja punktów...</div>';
    modalTotal.textContent = "--- pkt";
    modal.classList.remove("hidden");

    try {
        const headers = {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
        };

        if (!globalActualData) {
            const resGroups = await fetch(
                `${SUPABASE_URL}/rest/v1/actual_groups`,
                { headers },
            );
            const resStages = await fetch(
                `${SUPABASE_URL}/rest/v1/actual_stages`,
                { headers },
            );
            const resAwards = await fetch(
                `${SUPABASE_URL}/rest/v1/actual_awards?id=eq.1`,
                { headers },
            );

            if (resGroups.ok && resStages.ok && resAwards.ok) {
                const groups = await resGroups.json();
                const stages = await resStages.json();
                const awardsArray = await resAwards.json();
                globalActualData = {
                    groups,
                    stages,
                    awards: awardsArray[0] || {
                        top_scorer: "",
                        mvp: "",
                        best_goalkeeper: "",
                    },
                };
            } else {
                throw new Error(
                    "Błąd podczas pobierania oficjalnych wyników rzeczywistych.",
                );
            }
        }

        const userData = await loadUserStandingsAndBracket(userId);
        const breakdown = computeDetailedScoreForModal(
            userData,
            globalActualData,
        );

        const clean = (str) => (str || "").trim().toLowerCase();

        // Funkcja pomocnicza do formatowania nazw drużyn z wielkiej litery
        const capitalize = (str) => {
            if (!str) return "";
            return str
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
        };

        // Formatowanie listy drużyn (Zieleń / Czerwień / Biel gdy brak wyników)
        const formatList = (predictedSet, actualSet) => {
            if (!predictedSet || predictedSet.size === 0) {
                return '<span class="text-slate-500 italic">brak typów</span>';
            }

            const items = [];
            predictedSet.forEach((team) => {
                const teamClean = team.trim().toLowerCase();
                const displayName = capitalize(team);

                if (actualSet.size === 0) {
                    // Etap nie został jeszcze rozegrany - neutralny szary
                    items.push(
                        `<span class="text-slate-300 font-medium">${displayName}</span>`,
                    );
                } else if (actualSet.has(teamClean)) {
                    // Trafiony - zielony z ptaszkiem
                    items.push(
                        `<span class="text-emerald-400 font-bold">${displayName} ✔</span>`,
                    );
                } else {
                    // Nietrafiony - czerwony z przekreśleniem
                    items.push(
                        `<span class="text-rose-500 line-through opacity-70">${displayName} ✗</span>`,
                    );
                }
            });
            return items.join(", ");
        };

        // Formatowanie pojedynczych rozstrzygnięć (3. miejsce, Mistrz)
        const formatSingleTeam = (predicted, actualVal, isCorrect, points) => {
            const predName = capitalize(predicted);
            if (!predicted)
                return '<span class="text-slate-500 italic">brak typu</span>';
            if (!actualVal)
                return `<span class="text-slate-300 font-medium">${predName}</span>`;

            if (isCorrect) {
                return `<span class="text-emerald-400 font-bold">${predName} ✔ (+${points} pkt)</span>`;
            } else {
                return `<span class="text-rose-500 line-through opacity-70">${predName} ✗</span> <span class="text-[10px] text-slate-400">(Rzeczywiste: ${capitalize(actualVal)})</span>`;
            }
        };

        // Formatowanie nagród indywidualnych
        const formatAward = (predicted, actualVal, isCorrect) => {
            const predName = predicted ? predicted.trim() : "";
            if (!predName)
                return '<span class="text-slate-500 italic">brak typu</span>';
            if (!actualVal)
                return `<span class="text-slate-300 font-medium">${predName}</span>`;

            if (isCorrect) {
                return `<span class="text-emerald-400 font-bold">${predName} ✔ (+5 pkt)</span>`;
            } else {
                return `<span class="text-rose-500 line-through opacity-70">${predName} ✗</span> <span class="text-[10px] text-slate-400">(Rzeczywiste: ${actualVal})</span>`;
            }
        };

        modalTotal.textContent = `${breakdown.totalPoints} pkt`;
        modalContent.innerHTML = `
      <!-- FAZA GRUPOWA -->
      <div class="bg-slate-750 p-4 rounded-xl border border-slate-700/60 space-y-3">
        <h4 class="font-bold text-white text-xs flex items-center justify-between border-b border-slate-700 pb-1.5">
          <span>⚽ FAZA GRUPOWA</span>
          <span class="text-emerald-400 font-extrabold text-sm">${breakdown.ptsGroupPos + breakdown.ptsGroupBonus + breakdown.ptsGroupQual} pkt</span>
        </h4>
        <div class="space-y-2 text-[11px] text-slate-400 leading-relaxed">
          <div class="flex justify-between">
            <span>Dokładne pozycje (2 pkt za każdą):</span>
            <span class="text-slate-200 font-semibold">${breakdown.ptsGroupPos} pkt</span>
          </div>
          <div class="flex justify-between items-start gap-4">
            <span>Bonus za bezbłędne grupy (1 pkt):</span>
            <span class="text-slate-200 font-semibold text-right">${breakdown.ptsGroupBonus} pkt ${breakdown.correctBonusGroups.length > 0 ? "(Grupy: " + breakdown.correctBonusGroups.join(", ") + ")" : ""}</span>
          </div>
          <div class="pt-1.5 border-t border-slate-700/50">
            <span class="block font-semibold text-slate-300 mb-1">Wytypowane awanse do 1/16 (R32) - (+${breakdown.ptsGroupQual} pkt):</span>
            <div class="text-[10px] leading-relaxed">${formatList(breakdown.userPredictedR32, breakdown.actualR32)}</div>
          </div>
        </div>
      </div>

      <!-- FAZA PUCHAROWA -->
      <div class="bg-slate-750 p-4 rounded-xl border border-slate-700/60 space-y-3">
        <h4 class="font-bold text-white text-xs flex items-center justify-between border-b border-slate-700 pb-1.5">
          <span>🏆 DRABINKA PUCHAROWA</span>
          <span class="text-emerald-400 font-extrabold text-sm">${breakdown.ptsR16 + breakdown.ptsQF + breakdown.ptsSF + breakdown.ptsThird + breakdown.ptsFinalists + breakdown.ptsChampion} pkt</span>
        </h4>
        <div class="space-y-3 text-[11px] text-slate-400 leading-relaxed">
          <div>
            <span class="block font-semibold text-slate-300 mb-1">1/8 Finału (R16) - (+${breakdown.ptsR16} pkt):</span>
            <div class="text-[10px] leading-relaxed">${formatList(breakdown.userPredictedR16, breakdown.actualR16)}</div>
          </div>
          <div>
            <span class="block font-semibold text-slate-300 mb-1">Ćwierćfinały (QF) - (+${breakdown.ptsQF} pkt):</span>
            <div class="text-[10px] leading-relaxed">${formatList(breakdown.userPredictedQF, breakdown.actualQF)}</div>
          </div>
          <div>
            <span class="block font-semibold text-slate-300 mb-1">Półfinały (SF - 2 pkt za każdy) - (+${breakdown.ptsSF} pkt):</span>
            <div class="text-[10px] leading-relaxed">${formatList(breakdown.userPredictedSF, breakdown.actualSF)}</div>
          </div>
          <div class="flex justify-between items-center pt-1.5 border-t border-slate-700/40">
            <span class="font-semibold text-slate-300">Zdobywca 3. miejsca (2 pkt):</span>
            <span>${formatSingleTeam(breakdown.userPredictedThird, breakdown.actualThird, breakdown.ptsThird > 0, 2)}</span>
          </div>
          <div class="pt-1.5 border-t border-slate-700/40">
            <span class="block font-semibold text-slate-300 mb-1">Finaliści (3 pkt za każdego) - (+${breakdown.ptsFinalists} pkt):</span>
            <div class="text-[10px] leading-relaxed">${formatList(breakdown.userPredictedFinalists, breakdown.actualFinalists)}</div>
          </div>
          <div class="flex justify-between items-center pt-1.5 border-t border-slate-700/40">
            <span class="font-semibold text-slate-300">Mistrz Świata (5 pkt):</span>
            <span>${formatSingleTeam(breakdown.userPredictedChampion, breakdown.actualChampion, breakdown.ptsChampion > 0, 5)}</span>
          </div>
        </div>
      </div>

      <!-- NAGRODY INDYWIDUALNE -->
      <div class="bg-slate-750 p-4 rounded-xl border border-slate-700/60 space-y-3">
        <h4 class="font-bold text-white text-xs flex items-center justify-between border-b border-slate-700 pb-1.5">
          <span>⭐ NAGRODY INDYWIDUALNE</span>
          <span class="text-emerald-400 font-extrabold text-sm">${breakdown.ptsAwards} pkt</span>
        </h4>
        <div class="space-y-2 text-[11px] text-slate-400">
          <div class="flex justify-between">
            <span>Król strzelców:</span>
            <span>${formatAward(breakdown.userPlayers.top_scorer, breakdown.actualAwards.top_scorer, breakdown.awardsMatches.scorer)}</span>
          </div>
          <div class="flex justify-between">
            <span>MVP turnieju:</span>
            <span>${formatAward(breakdown.userPlayers.mvp, breakdown.actualAwards.mvp, breakdown.awardsMatches.mvp)}</span>
          </div>
          <div class="flex justify-between">
            <span>Najlepszy bramkarz:</span>
            <span>${formatAward(breakdown.userPlayers.best_goalkeeper, breakdown.actualAwards.best_goalkeeper, breakdown.awardsMatches.goalkeeper)}</span>
          </div>
        </div>
      </div>
    `;
    } catch (err) {
        console.error(err);
        modalContent.innerHTML =
            '<div class="text-center py-8 text-rose-400">Błąd podczas generowania karty wyników. Upewnij się, że ten gracz wytypował cały turniej.</div>';
    }
};

// Pomocnicza funkcja licząca punkty dla konkretnego gracza w locie (Poprawiona)
function computeDetailedScoreForModal(userPreds, actual) {
    const clean = (str) => (str || "").trim().toLowerCase();

    const actualAwards =
        actual && actual.awards
            ? actual.awards
            : { top_scorer: "", mvp: "", best_goalkeeper: "" };

    const getActualTeamsForStage = (stageName) => {
        if (!actual || !actual.stages) return new Set();
        return new Set(
            actual.stages
                .filter((s) => s.stage === stageName)
                .map((s) => clean(s.team_name)),
        );
    };

    const actualR32 = getActualTeamsForStage("r32");
    const actualR16 = getActualTeamsForStage("r16");
    const actualQF = getActualTeamsForStage("qf");
    const actualSF = getActualTeamsForStage("sf");
    const actualFinalists = getActualTeamsForStage("finalists");
    const actualThird = [...getActualTeamsForStage("third")][0] || "";
    const actualChampion = [...getActualTeamsForStage("champion")][0] || "";

    let ptsGroupPos = 0;
    let ptsGroupBonus = 0;
    let correctBonusGroups = [];
    let ptsGroupQual = 0;

    let ptsR16 = 0;
    let ptsQF = 0;
    let ptsSF = 0;
    let ptsThird = 0;
    let ptsFinalists = 0;
    let ptsChampion = 0;

    let ptsAwards = 0;
    const awardsMatches = { scorer: false, mvp: false, goalkeeper: false };

    // 1. Grupy
    const groupCorrectCounters = {};
    const userPredictedR32 = new Set();

    if (userPreds && userPreds.groups) {
        Object.keys(userPreds.groups).forEach((letter) => {
            const teams = userPreds.groups[letter];
            teams.forEach((teamName, idx) => {
                const predictedRank = idx + 1;
                const teamClean = clean(teamName);

                const actualGroupsList =
                    actual && actual.groups ? actual.groups : [];
                const actualGroupItem = actualGroupsList.find(
                    (g) =>
                        g.group_letter === letter &&
                        clean(g.team_name) === teamClean,
                );
                if (actualGroupItem) {
                    if (predictedRank === actualGroupItem.actual_rank) {
                        ptsGroupPos += 2;
                        groupCorrectCounters[letter] =
                            (groupCorrectCounters[letter] || 0) + 1;
                    }
                }

                const isBestThird =
                    userPreds.thirds && userPreds.thirds.has(teamName);
                if (predictedRank === 1 || predictedRank === 2 || isBestThird) {
                    userPredictedR32.add(teamClean);
                }
            });
        });

        Object.keys(groupCorrectCounters).forEach((letter) => {
            if (groupCorrectCounters[letter] === 4) {
                ptsGroupBonus += 1;
                correctBonusGroups.push(letter);
            }
        });

        userPredictedR32.forEach((predictedTeam) => {
            if (actualR32.has(predictedTeam)) {
                ptsGroupQual += 1;
            }
        });
    }

    // 2. Drabinka
    const userWinnersMap = {};
    if (userPreds && userPreds.koMatches) {
        Object.keys(userPreds.koMatches).forEach((matchId) => {
            userWinnersMap[matchId] = clean(
                userPreds.koMatches[matchId].winner,
            );
        });
    }

    const userPredictedR16 = new Set();
    for (let i = 73; i <= 88; i++) {
        const team = userWinnersMap[i];
        if (team) {
            userPredictedR16.add(team);
            if (actualR16.has(team)) ptsR16 += 1;
        }
    }

    const userPredictedQF = new Set();
    for (let i = 89; i <= 96; i++) {
        const team = userWinnersMap[i];
        if (team) {
            userPredictedQF.add(team);
            if (actualQF.has(team)) ptsQF += 1;
        }
    }

    const userPredictedSF = new Set();
    for (let i = 97; i <= 100; i++) {
        const team = userWinnersMap[i];
        if (team) {
            userPredictedSF.add(team);
            if (actualSF.has(team)) ptsSF += 2;
        }
    }

    const userPredictedThird = userWinnersMap[103] || "";
    if (userPredictedThird && userPredictedThird === clean(actualThird)) {
        ptsThird = 2;
    }

    const userPredictedFinalists = new Set();
    if (userWinnersMap[101]) userPredictedFinalists.add(userWinnersMap[101]);
    if (userWinnersMap[102]) userPredictedFinalists.add(userWinnersMap[102]);
    userPredictedFinalists.forEach((team) => {
        if (actualFinalists.has(team)) {
            ptsFinalists += 3;
        }
    });

    const userPredictedChampion = userWinnersMap[104] || "";
    if (
        userPredictedChampion &&
        userPredictedChampion === clean(actualChampion)
    ) {
        ptsChampion = 5;
    }

    // 3. Nagrody
    if (userPreds && userPreds.players) {
        if (
            clean(userPreds.players.top_scorer) &&
            clean(userPreds.players.top_scorer) ===
                clean(actualAwards.top_scorer)
        ) {
            ptsAwards += 5;
            awardsMatches.scorer = true;
        }
        if (
            clean(userPreds.players.mvp) &&
            clean(userPreds.players.mvp) === clean(actualAwards.mvp)
        ) {
            ptsAwards += 5;
            awardsMatches.mvp = true;
        }
        if (
            clean(userPreds.players.best_goalkeeper) &&
            clean(userPreds.players.best_goalkeeper) ===
                clean(actualAwards.best_goalkeeper)
        ) {
            ptsAwards += 5;
            awardsMatches.goalkeeper = true;
        }
    }

    const totalPoints =
        ptsGroupPos +
        ptsGroupBonus +
        ptsGroupQual +
        ptsR16 +
        ptsQF +
        ptsSF +
        ptsThird +
        ptsFinalists +
        ptsChampion +
        ptsAwards;

    return {
        ptsGroupPos,
        ptsGroupBonus,
        correctBonusGroups,
        ptsGroupQual,
        userPredictedR32,
        actualR32,
        ptsR16,
        userPredictedR16,
        actualR16,
        ptsQF,
        userPredictedQF,
        actualQF,
        ptsSF,
        userPredictedSF,
        actualSF,
        ptsThird,
        userPredictedThird,
        actualThird,
        ptsFinalists,
        userPredictedFinalists,
        actualFinalists,
        ptsChampion,
        userPredictedChampion,
        actualChampion,
        ptsAwards,
        awardsMatches,
        totalPoints,
        actualAwards,
        userPlayers: userPreds.players,
    };
}

window.closeDetailsModal = function () {
    const modal = document.getElementById("details-modal");
    if (modal) modal.classList.add("hidden");
};

function setupTabs() {
    const tabGroupsBtn = document.getElementById("tab-groups-btn");
    const tabBracketBtn = document.getElementById("tab-bracket-btn");
    const tabLeaderboardBtn = document.getElementById("tab-leaderboard-btn");
    const tabStatsBtn = document.getElementById("tab-stats-btn"); // Nowy przycisk

    const secGroups = document.getElementById("section-groups");
    const secBracket = document.getElementById("section-bracket");
    const secLeaderboard = document.getElementById("section-leaderboard");
    const secStats = document.getElementById("section-stats"); // Nowa sekcja

    const btnSave = document.getElementById("btn-save");

    const switchActiveTab = (activeBtn) => {
        [tabGroupsBtn, tabBracketBtn, tabLeaderboardBtn, tabStatsBtn].forEach(
            (btn) => {
                if (btn) {
                    if (btn === activeBtn) {
                        btn.className =
                            "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center bg-slate-700 text-white transition";
                    } else {
                        btn.className =
                            "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-center text-slate-400 hover:text-white transition";
                    }
                }
            },
        );
    };

    if (tabGroupsBtn) {
        tabGroupsBtn.addEventListener("click", () => {
            currentTab = "groups";
            switchActiveTab(tabGroupsBtn);
            if (secGroups) secGroups.classList.remove("hidden");
            if (secBracket) secBracket.classList.add("hidden");
            if (secLeaderboard) secLeaderboard.classList.add("hidden");
            if (secStats) secStats.classList.add("hidden");
            if (btnSave) btnSave.classList.remove("hidden");
        });
    }

    if (tabBracketBtn) {
        tabBracketBtn.addEventListener("click", () => {
            currentTab = "bracket";
            switchActiveTab(tabBracketBtn);
            if (secBracket) secBracket.classList.remove("hidden");
            if (secGroups) secGroups.classList.add("hidden");
            if (secLeaderboard) secLeaderboard.classList.add("hidden");
            if (secStats) secStats.classList.add("hidden");
            if (btnSave) btnSave.classList.remove("hidden");
            checkAndBuildBracket();
        });
    }

    if (tabLeaderboardBtn) {
        tabLeaderboardBtn.addEventListener("click", () => {
            currentTab = "leaderboard";
            switchActiveTab(tabLeaderboardBtn);
            if (secLeaderboard) secLeaderboard.classList.remove("hidden");
            if (secGroups) secGroups.classList.add("hidden");
            if (secBracket) secBracket.classList.add("hidden");
            if (secStats) secStats.classList.add("hidden");
            if (btnSave) btnSave.classList.add("hidden");
        });
    }

    if (tabStatsBtn) {
        tabStatsBtn.addEventListener("click", () => {
            currentTab = "stats";
            switchActiveTab(tabStatsBtn);
            if (secStats) secStats.classList.remove("hidden");
            if (secGroups) secGroups.classList.add("hidden");
            if (secBracket) secBracket.classList.add("hidden");
            if (secLeaderboard) secLeaderboard.classList.add("hidden");
            if (btnSave) btnSave.classList.add("hidden");

            loadAndRenderStats();
        });
    }
}
