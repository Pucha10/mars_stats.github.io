let allGotGames = [];

const HOUSES_META = [
    { key: "baratheon", name: "Baratheon", icon: "👑" },
    { key: "lannister", name: "Lannister", icon: "🦁" },
    { key: "stark", name: "Stark", icon: "🐺" },
    { key: "greyjoy", name: "Greyjoy", icon: "🦑" },
    { key: "tyrell", name: "Tyrell", icon: "🌹" },
    { key: "martell", name: "Martell", icon: "☀️" },
    { key: "arryn", name: "Arryn", icon: "🦅" },
    { key: "targaryen", name: "Targaryen", icon: "🐉" },
];

document.addEventListener("DOMContentLoaded", () => {
    initGotStats();
});

async function initGotStats() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/got_games?order=game_number.desc`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            },
        );

        if (!response.ok) throw new Error("Błąd pobierania danych gier.");
        allGotGames = await response.json();

        renderHousesStats(allGotGames);
        renderPlayersStats(allGotGames);
    } catch (err) {
        console.error("Błąd ładowania statystyk:", err);
    }
}

// 1. STATYSTYKI RODÓW
function renderHousesStats(games) {
    const container = document.getElementById("houses-stats-body");
    if (!container) return;

    const houseStats = {};
    HOUSES_META.forEach((h) => {
        houseStats[h.key] = {
            name: h.name,
            icon: h.icon,
            games: 0,
            wins: 0,
            losses: 0,
        };
    });

    games.forEach((game) => {
        HOUSES_META.forEach((h) => {
            const playerVal = game[h.key];

            if (
                playerVal &&
                playerVal !== "Nie uczestniczył" &&
                playerVal !== "Wasal" &&
                playerVal !== "-"
            ) {
                houseStats[h.key].games += 1;

                if (playerVal === game.winner) {
                    houseStats[h.key].wins += 1;
                } else {
                    houseStats[h.key].losses += 1;
                }
            }
        });
    });

    const housesArray = Object.values(houseStats).map((h) => {
        const winRate = h.games > 0 ? (h.wins / h.games) * 100 : 0;
        return { ...h, winRate: parseFloat(winRate.toFixed(1)) };
    });

    housesArray.sort((a, b) => b.winRate - a.winRate || b.games - a.games);

    container.innerHTML = "";

    housesArray.forEach((h) => {
        const row = document.createElement("div");
        row.className = "houses-grid-row";

        let winRateHtml = `<span class="winrate-mid">${h.winRate}%</span>`;
        if (h.games > 0) {
            if (h.winRate >= 50) {
                winRateHtml = `<span class="winrate-high">${h.winRate}%</span>`;
            } else if (h.winRate <= 25) {
                winRateHtml = `<span class="winrate-low">${h.winRate}%</span>`;
            }
        }

        row.innerHTML = `
            <div class="col-name">${h.icon} ${h.name}</div>
            <div><span class="badge-games">${h.games}</span></div>
            <div style="color: #166534; font-weight: bold;">${h.wins}</div>
            <div style="color: #991b1b; font-weight: bold;">${h.losses}</div>
            <div>${winRateHtml}</div>
        `;
        container.appendChild(row);
    });
}

// 2. STATYSTYKI GRACZY
function renderPlayersStats(games) {
    const container = document.getElementById("players-stats-body");
    if (!container) return;

    const playerStatsMap = {};

    games.forEach((game) => {
        HOUSES_META.forEach((h) => {
            const player = game[h.key];

            if (
                player &&
                player !== "Nie uczestniczył" &&
                player !== "Wasal" &&
                player !== "-"
            ) {
                if (!playerStatsMap[player]) {
                    playerStatsMap[player] = {
                        name: player,
                        games: 0,
                        wins: 0,
                        losses: 0,
                    };
                }

                playerStatsMap[player].games += 1;

                if (player === game.winner) {
                    playerStatsMap[player].wins += 1;
                } else {
                    playerStatsMap[player].losses += 1;
                }
            }
        });
    });

    const playersArray = Object.values(playerStatsMap).map((p) => {
        const winRate = p.games > 0 ? (p.wins / p.games) * 100 : 0;
        return { ...p, winRate: parseFloat(winRate.toFixed(1)) };
    });

    playersArray.sort(
        (a, b) => b.winRate - a.winRate || b.wins - a.wins || b.games - a.games,
    );

    container.innerHTML = "";

    if (playersArray.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color:#64748b;">Brak danych graczy.</div>`;
        return;
    }

    playersArray.forEach((p) => {
        const row = document.createElement("div");
        row.className = "players-grid-row";

        let winRateHtml = `<span class="winrate-mid">${p.winRate}%</span>`;
        if (p.games > 0) {
            if (p.winRate >= 50) {
                winRateHtml = `<span class="winrate-high">${p.winRate}%</span>`;
            } else if (p.winRate <= 25) {
                winRateHtml = `<span class="winrate-low">${p.winRate}%</span>`;
            }
        }

        row.innerHTML = `
            <div class="col-name">👤 ${p.name}</div>
            <div><span class="badge-games">${p.games}</span></div>
            <div style="color: #166534; font-weight: bold;">${p.wins}</div>
            <div style="color: #991b1b; font-weight: bold;">${p.losses}</div>
            <div>${winRateHtml}</div>
            <div>
                <button class="btn-details" onclick="openPlayerDetails('${p.name}')">
                    📊 Szczegóły
                </button>
            </div>
        `;
        container.appendChild(row);
    });
}

// 3. SZCZEGÓŁY GRACZA W OKNIE MODAL
function openPlayerDetails(playerName) {
    const modal = document.getElementById("player-modal");
    const title = document.getElementById("modal-player-title");
    const body = document.getElementById("modal-player-body");

    title.innerHTML = `👤 Statystyki gracza: <strong>${playerName}</strong>`;

    // Zliczanie statystyk dla każdego rodu gracza
    let totalGames = 0;
    let totalWins = 0;
    let totalLosses = 0;

    const houseDetails = HOUSES_META.map((h) => {
        let games = 0;
        let wins = 0;
        let losses = 0;

        allGotGames.forEach((game) => {
            if (game[h.key] === playerName) {
                games += 1;
                if (game.winner === playerName) {
                    wins += 1;
                } else {
                    losses += 1;
                }
            }
        });

        totalGames += games;
        totalWins += wins;
        totalLosses += losses;

        const winRate = games > 0 ? (wins / games) * 100 : 0;
        return {
            name: h.name,
            icon: h.icon,
            games: games,
            wins: wins,
            losses: losses,
            winRate: parseFloat(winRate.toFixed(1)),
        };
    });

    const totalWinRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : 0;

    // Sortujemy rody: najpierw te, którymi gracz grał najczęściej
    houseDetails.sort((a, b) => b.games - a.games || b.winRate - a.winRate);

    // Renderowanie podsumowania + tabeli rodów w modalu
    let rowsHtml = "";
    houseDetails.forEach((h) => {
        let winRateDisplay = `<span style="color:#94a3b8;">-</span>`;
        if (h.games > 0) {
            if (h.winRate >= 50) {
                winRateDisplay = `<span class="winrate-high">${h.winRate}%</span>`;
            } else if (h.winRate <= 25) {
                winRateDisplay = `<span class="winrate-low">${h.winRate}%</span>`;
            } else {
                winRateDisplay = `<span class="winrate-mid">${h.winRate}%</span>`;
            }
        }

        rowsHtml += `
            <div class="houses-grid-row" style="${h.games === 0 ? 'opacity: 0.4;' : ''}">
                <div class="col-name">${h.icon} ${h.name}</div>
                <div><span class="badge-games">${h.games}</span></div>
                <div style="color: #166534; font-weight: bold;">${h.wins}</div>
                <div style="color: #991b1b; font-weight: bold;">${h.losses}</div>
                <div>${winRateDisplay}</div>
            </div>
        `;
    });

    body.innerHTML = `
        <!-- 4 KAFELKI PODSUMOWANIA -->
        <div class="player-summary-cards">
            <div class="p-card">
                <div class="p-card-val">${totalGames}</div>
                <div class="p-card-lbl">Gier</div>
            </div>
            <div class="p-card">
                <div class="p-card-val" style="color: #166534;">${totalWins}</div>
                <div class="p-card-lbl">Wygrane</div>
            </div>
            <div class="p-card">
                <div class="p-card-val" style="color: #991b1b;">${totalLosses}</div>
                <div class="p-card-lbl">Porażki</div>
            </div>
            <div class="p-card">
                <div class="p-card-val" style="color: #0284c7;">${totalWinRate}%</div>
                <div class="p-card-lbl">Win Ratio</div>
            </div>
        </div>

        <h4 style="margin: 0 0 10px 0; color: #334155; font-size: 14px;">🛡️ Bilans wg kontrolowanego Rodu:</h4>

        <!-- TABELA RODÓW TEGO GRACZA -->
        <div class="houses-grid-header">
            <div style="text-align: left; padding-left: 8px;">Ród</div>
            <div>Gry</div>
            <div style="color: #4ade80;">Wygr.</div>
            <div style="color: #f87171;">Por.</div>
            <div>Win %</div>
        </div>
        <div>
            ${rowsHtml}
        </div>
    `;

    modal.style.display = "flex";
}

function closePlayerModal() {
    const modal = document.getElementById("player-modal");
    if (modal) modal.style.display = "none";
}

function closePlayerModalOutside(event) {
    if (event.target.id === "player-modal") {
        closePlayerModal();
    }
}