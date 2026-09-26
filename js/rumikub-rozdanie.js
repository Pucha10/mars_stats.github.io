const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("id");
let currentPlayers = [];
let trendChartInstance = null;
let pointsChartInstance = null;
let currentRoundsCount = 0;
let totals = {};

if (!gameId) {
    alert("Nie znaleziono ID gry!");
    window.location.href = "rummikub.html";
}

document.addEventListener("DOMContentLoaded", () => {
    initDetails();
    setupRealtimeListener();
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        initDetails();
    }
});

async function initDetails() {
    const game = await getRummikubGameHeader(gameId);
    const rounds = await getRummikubGameRounds(gameId);

    if (game) {
        document.getElementById("game-title").innerText =
            `🀄 Gra #${game.game_number}`;
        currentPlayers = game.players;
        currentRoundsCount = rounds.length;

        renderTable(game.players, rounds);
        renderSummaryTable(game.players, rounds);

        const infoBox = document.getElementById("next-shuffler-info");
        const addBtns = document.querySelectorAll(".btn-add-round");

        if (game.status === "finished") {
            infoBox.innerHTML = `🏆 Grę wygrał: <strong id="next-shuffler-name">${game.winner || "Remis"}</strong>`;
            infoBox.style.backgroundColor = "#d4af37";
            infoBox.style.color = "#000";

            addBtns.forEach((btn) => (btn.style.display = "none"));
        } else {
            const nextStarter = calculateNextStarter(game.players, rounds);
            infoBox.innerHTML = `Rozpoczyna rundę: <strong id="next-shuffler-name">${nextStarter}</strong>`;
            infoBox.style.backgroundColor = "";
            infoBox.style.color = "";

            addBtns.forEach((btn) => (btn.style.display = "inline-block"));
        }

        renderStatusButton(game.status);
        renderTrendChart(game.players, rounds);
    }
}

function showAddRoundForm() {
    const anyAddBtn = document.querySelector(".btn-add-round");
    if (anyAddBtn && anyAddBtn.style.display === "none") return;
    if (document.getElementById("new-round-form")) return;

    const tbody = document.getElementById("details-tbody");
    const tr = document.createElement("tr");
    tr.id = "new-round-form";
    tr.className = "new-round-row";

    const nextStarter = document.getElementById("next-shuffler-name").innerText;

    let playerInputs = "";
    currentPlayers.forEach((p) => {
        playerInputs += `
            <td>
                <input type="number" class="input-score round-input" 
                       data-player="${p}" placeholder="Płytki: ${p}" min="0" value="">
            </td>`;
    });

    tr.innerHTML = `
        <td>${currentRoundsCount + 1}</td>
        <td><strong>${nextStarter}</strong></td>
        ${playerInputs}
        <td class="save-round-cell">
            <button class="btn-action btn-save btn-add-round-form" onclick="saveNewRound(this)">Zapisz</button>
        </td>
        <td class="cancel-round-cell">
            <button class="btn-action btn-delete btn-add-round-form" onclick="initDetails()">X</button>
        </td>
    `;

    tbody.appendChild(tr);
    tr.scrollIntoView({ behavior: "smooth" });
}

async function saveNewRound(btn) {
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Zapis...";
    }
    const inputs = document.querySelectorAll(".round-input");
    const starter = document.getElementById("next-shuffler-name").innerText;

    let cardsData = {};
    let zeroCount = 0;
    inputs.forEach((input) => {
        const val = parseInt(input.value) || 0;
        cardsData[input.dataset.player] = val;
        if (val === 0) zeroCount++;
    });

    const reEnableButton = () => {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Zapisz";
        }
    };

    if (zeroCount === 0) {
        alert("Zwycięzca rundy musi mieć wpisane 0 (pozostałe płytki)!");
        reEnableButton();
        return;
    }
    if (zeroCount > 1) {
        alert("Nie może być więcej niż jeden zwycięzca rundy!");
        reEnableButton();
        return;
    }

    const newRound = {
        game_id: parseInt(gameId),
        round_number: currentRoundsCount + 1,
        shuffler: starter,
        cards: cardsData,
    };

    await saveCurrentRummikubRound(newRound);
}

function calculateNextStarter(players, rounds) {
    if (rounds.length === 0) return players[0];
    const lastStarter = rounds[rounds.length - 1].shuffler;
    const lastIdx = players.indexOf(lastStarter);
    return players[(lastIdx + 1) % players.length];
}

function renderStatusButton(status) {
    const container = document.getElementById("status-button-container");
    container.innerHTML = "";

    const btn = document.createElement("button");
    btn.className = "btn-status-toggle";

    if (status === "ongoing") {
        btn.innerText = "🏁 Zakończ grę";
        btn.classList.add("btn-finish");
        btn.onclick = () => updateGameStatus("finished");
    } else {
        btn.innerText = "🔄 Wznów grę";
        btn.classList.add("btn-resume");
        btn.onclick = () => updateGameStatus("ongoing");
    }

    container.appendChild(btn);
}

function renderTable(players, rounds) {
    const thead = document.getElementById("details-thead");
    const tbody = document.getElementById("details-tbody");
    const tfoot = document.getElementById("details-tfoot");

    totals = {};
    players.forEach((p) => (totals[p] = 0));

    let headHtml = `<tr><th>Runda</th><th>Zaczynał</th>`;
    players.forEach((p) => {
        headHtml += `<th>${p}</th>`;
    });
    headHtml += `<th>Zwycięzca</th><th>Akcja</th></tr>`;
    thead.innerHTML = headHtml;

    tbody.innerHTML = "";
    rounds.forEach((round) => {
        const tr = document.createElement("tr");

        let sumOfOtherCards = 0;
        let roundWinner = "";

        players.forEach((p) => {
            const tilesValue = round.cards[p] || 0;
            if (tilesValue === 0) {
                roundWinner = p;
            } else {
                sumOfOtherCards += tilesValue;
            }
        });

        let pointsCells = "";
        players.forEach((p) => {
            const tilesValue = round.cards[p] || 0;
            let displayPoints = 0;

            if (p === roundWinner) {
                displayPoints = sumOfOtherCards;
                pointsCells += `<td class="winner-cell">+${displayPoints}</td>`;
            } else {
                displayPoints = -tilesValue;
                pointsCells += `<td class="loser-cell">${displayPoints}</td>`;
            }

            totals[p] += displayPoints;
        });

        tr.innerHTML = `
            <td>${round.round_number}</td>
            <td><span class="shuffler-tag">${round.shuffler}</span></td>
            ${pointsCells}
            <td class="winner-cell">${roundWinner}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-delete" onclick="handleDeleteRound(${round.id})">Usuń</button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });

    let footHtml = `<tr><td colspan="2">SUMA PUNKTÓW</td>`;
    players.forEach((p) => {
        footHtml += `<td>${totals[p]}</td>`;
    });
    footHtml += `<td>-</td></tr>`;
    tfoot.innerHTML = footHtml;
}

function renderSummaryTable(players, rounds) {
    const tbody = document.getElementById("summary-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let statsMap = players.map((p) => {
        let pts = 0;
        let wins = 0;
        rounds.forEach((r) => {
            let rSum = 0;
            let rWin = "";
            players.forEach((pl) => {
                const c = r.cards[pl] || 0;
                if (c === 0) rWin = pl;
                else rSum += c;
            });
            if (p === rWin) {
                pts += rSum;
                wins++;
            } else {
                pts -= r.cards[p] || 0;
            }
        });
        return { name: p, points: pts, wins: wins };
    });

    statsMap.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.wins - a.wins;
    });

    const totalRounds = rounds.length;
    let lastPlace = 1;

    statsMap.forEach((player, index) => {
        const winPercent =
            totalRounds > 0
                ? ((player.wins / totalRounds) * 100).toFixed(1)
                : 0;

        if (
            index > 0 &&
            player.points === statsMap[index - 1].points &&
            player.wins === statsMap[index - 1].wins
        ) {
            // remis
        } else {
            lastPlace = index + 1;
        }

        let placeDisplay =
            lastPlace === 1
                ? "🥇"
                : lastPlace === 2
                  ? "🥈"
                  : lastPlace === 3
                    ? "🥉"
                    : lastPlace;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-size: 18px;">${placeDisplay}</td>
            <td style="font-weight: bold; text-align: center;">${player.name}</td>
            <td style="font-weight: bold; color: ${player.points >= 0 ? "#1e8e3e" : "#d93025"};">
                ${player.points} pkt
            </td>
            <td style="font-size: 18px; color: #1e8e3e; font-weight: bold;">${player.wins}</td>
            <td style="color: #666;">${winPercent}%</td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateGameStatus(newStatus) {
    let winnerToSave = null;
    const rounds = await getRummikubGameRounds(gameId);

    if (newStatus === "finished") {
        if (!confirm("Czy na pewno chcesz zakończyć grę i wyłonić zwycięzcę?"))
            return;

        const stats = currentPlayers.map((player) => {
            let pts = 0;
            let wins = 0;
            rounds.forEach((round) => {
                let roundSum = 0;
                let roundWinner = "";
                currentPlayers.forEach((p) => {
                    const c = round.cards[p] || 0;
                    if (c === 0) roundWinner = p;
                    else roundSum += c;
                });
                if (player === roundWinner) {
                    pts += roundSum;
                    wins += 1;
                } else {
                    pts -= round.cards[player] || 0;
                }
            });
            return { name: player, pts: pts, wins: wins };
        });

        stats.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return b.wins - a.wins;
        });

        if (
            stats.length > 1 &&
            stats[0].pts === stats[1].pts &&
            stats[0].wins === stats[1].wins
        ) {
            winnerToSave = "Remis";
        } else {
            winnerToSave = stats[0].name;
        }
    } else {
        if (
            !confirm("Czy chcesz wznowić grę? Zwycięzca zostanie wyczyszczony.")
        )
            return;
        winnerToSave = null;
    }

    await rummikubWinnerChange(winnerToSave, newStatus, gameId);
    initDetails();
}

async function handleDeleteRound(roundId) {
    const addBtn = document.getElementById("add-round-btn");
    if (addBtn.style.display === "none") {
        alert(
            "Nie można usuwać rund w zakończonej grze! Wznów grę, aby edytować.",
        );
        return;
    }
    const pass = prompt("Podaj hasło gry:");
    if (pass == null) return;
    await delateOneRummikubRound(roundId, pass);
    initDetails();
}

function createPlayerNode(letter, bgColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.arc(12, 12, 11, 0, 2 * Math.PI);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter.toUpperCase(), 12, 13);

    return canvas;
}

function renderTrendChart(players, rounds) {
    const trendContainer = document.getElementById("trend-chart-container");
    const pointsContainer = document.getElementById("points-chart-container");

    if (rounds.length === 0) {
        trendContainer.style.display = "none";
        pointsContainer.style.display = "none";
        return;
    }

    trendContainer.style.display = "block";
    pointsContainer.style.display = "block";

    let cumulativePts = {};
    let cumulativeWins = {};
    let chartHistoryRank = {};
    let chartHistoryPoints = {};

    const labels = ["R0"];

    players.forEach((p) => {
        cumulativePts[p] = 0;
        cumulativeWins[p] = 0;
        chartHistoryRank[p] = [1];
        chartHistoryPoints[p] = [0];
    });

    rounds.forEach((round) => {
        labels.push(`R${round.round_number}`);

        let roundSum = 0;
        let roundWinner = "";

        players.forEach((p) => {
            const c = round.cards[p] || 0;
            if (c === 0) roundWinner = p;
            else roundSum += c;
        });

        players.forEach((p) => {
            if (p === roundWinner) {
                cumulativePts[p] += roundSum;
                cumulativeWins[p]++;
            } else {
                cumulativePts[p] -= round.cards[p] || 0;
            }
            chartHistoryPoints[p].push(cumulativePts[p]);
        });

        let currentStandings = players
            .map((p) => ({
                name: p,
                pts: cumulativePts[p],
                wins: cumulativeWins[p],
            }))
            .sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                return b.wins - a.wins;
            });

        let currentRank = 1;
        currentStandings.forEach((st, index) => {
            if (
                index > 0 &&
                st.pts === currentStandings[index - 1].pts &&
                st.wins === currentStandings[index - 1].wins
            ) {
            } else {
                currentRank = index + 1;
            }
            chartHistoryRank[st.name].push(currentRank);
        });
    });

    const dynamicWrapperRank = document.getElementById(
        "dynamic-canvas-wrapper",
    );
    const dynamicWrapperPoints = document.getElementById(
        "dynamic-points-wrapper",
    );
    const calculatedWidth = (rounds.length + 1) * 45;

    if (calculatedWidth > window.innerWidth) {
        dynamicWrapperRank.style.width = `${calculatedWidth}px`;
        dynamicWrapperPoints.style.width = `${calculatedWidth}px`;
    } else {
        dynamicWrapperRank.style.width = "100%";
        dynamicWrapperPoints.style.width = "100%";
    }

    const colors = [
        "#e6194b",
        "#3cb44b",
        "#4363d8",
        "#f58231",
        "#911eb4",
        "#46f0f0",
    ];

    const datasetsRank = players.map((p, index) => {
        const color = colors[index % colors.length];
        return {
            label: p,
            data: chartHistoryRank[p],
            borderColor: color,
            backgroundColor: color,
            borderWidth: 3,
            pointStyle: createPlayerNode(p.charAt(0), color),
            pointRadius: 10,
            pointHoverRadius: 12,
            fill: false,
            tension: 0.2,
        };
    });

    const datasetsPoints = players.map((p, index) => {
        const color = colors[index % colors.length];
        return {
            label: p,
            data: chartHistoryPoints[p],
            borderColor: color,
            backgroundColor: color,
            borderWidth: 3,
            pointStyle: createPlayerNode(p.charAt(0), color),
            pointRadius: 10,
            pointHoverRadius: 12,
            fill: false,
            tension: 0.2,
        };
    });

    const ctxRank = document.getElementById("trendChart").getContext("2d");
    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(ctxRank, {
        type: "line",
        data: { labels: labels, datasets: datasetsRank },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            clip: false,
            layout: { padding: { top: 20, bottom: 20, left: 15, right: 25 } },
            scales: {
                y: {
                    reverse: true,
                    min: 1,
                    max: players.length,
                    ticks: { stepSize: 1 },
                    title: {
                        display: true,
                        text: "Miejsce",
                        color: "#666",
                        font: { weight: "bold" },
                    },
                },
                x: { offset: true },
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { usePointStyle: true, padding: 20 },
                },
            },
        },
    });

    const ctxPoints = document.getElementById("pointsChart").getContext("2d");
    if (pointsChartInstance) pointsChartInstance.destroy();

    pointsChartInstance = new Chart(ctxPoints, {
        type: "line",
        data: { labels: labels, datasets: datasetsPoints },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            clip: false,
            layout: { padding: { top: 30, bottom: 30, left: 15, right: 25 } },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Punkty",
                        color: "#666",
                        font: { weight: "bold" },
                    },
                    grid: {
                        color: (ctx) =>
                            ctx.tick.value === 0 ? "#333" : "#e0e0e0",
                        lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1),
                    },
                },
                x: { offset: true },
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { usePointStyle: true, padding: 20 },
                },
            },
        },
    });
}

function setupRealtimeListener() {
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    supabaseClient
        .channel("rummikub-realtime-channel")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "rummikub_rounds",
                filter: `game_id=eq.${gameId}`,
            },
            () => initDetails(),
        )
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "rummikub_games",
                filter: `id=eq.${gameId}`,
            },
            () => initDetails(),
        )
        .subscribe();
}
