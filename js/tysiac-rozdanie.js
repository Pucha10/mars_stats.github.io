const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("id");
let currentPlayers = [];
let currentRoundsCount = 0;
let totals = {};
let gamePassword = "";
let bombsUsedInGame = {};
let pointsChartInstance = null; 

if (!gameId) {
    alert("Nie znaleziono ID gry!");
    window.location.href = "tysiac.html";
}

document.addEventListener("DOMContentLoaded", () => {
    initDetails();
    setupRealtimeListener();
});

async function initDetails() {
    const game = await getGameHeader(gameId);
    const rounds = await getGameRounds(gameId);

    if (game) {
        document.getElementById("game-title").innerText =
            `🃏 Tysiąc - Gra #${game.game_number}`;
        currentPlayers = game.players;
        currentRoundsCount = rounds.length;

        renderTable(game.players, rounds);
        renderSummaryTable(game.players, rounds);

        const infoBox = document.getElementById("next-shuffler-info");
        const addBtns = document.querySelectorAll(".btn-add-round");
        
        // POBIERAMY PRZYCISK INTERAKTYWNEJ GRY
        const playGameBtn = document.getElementById("play-game-btn");

        if (game.status === "finished") {
            infoBox.innerHTML = `🏆 Grę wygrał: <strong id="next-shuffler-name">${game.winner || "Remis"}</strong>`;
            infoBox.style.backgroundColor = "#d4af37";
            infoBox.style.color = "#000";

            // Ukrywamy oba przyciski dodawania rozdania
            addBtns.forEach((btn) => (btn.style.display = "none"));
            
            // UKRYWAMY PRZYCISK INTERAKTYWNEJ GRY
            if (playGameBtn) playGameBtn.style.display = "none";
        } else {
            const nextShuffler = calculateNextShuffler(game.players, rounds);
            const nextMusik = calculateNextMusik(game.players, rounds);
            infoBox.innerHTML = `Następny rozdaje: <strong id="next-shuffler-name">${nextShuffler}</strong> | Na musiku: <strong id="next-musik-name">${nextMusik}</strong>`;
            infoBox.style.backgroundColor = "";
            infoBox.style.color = "";

            addBtns.forEach((btn) => (btn.style.display = "inline-block"));
            
            if (playGameBtn) playGameBtn.style.display = "inline-block";
        }

        renderStatusButton(game.status);
        renderPointsChart(game.players, rounds);
    }
}

async function getGameHeader(id) {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/tysiac_games?id=eq.${id}`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        },
    );
    const data = await resp.json();
    return data[0];
}

async function getGameRounds(id) {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/tysiac_rounds?game_id=eq.${id}&order=round_number.asc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        },
    );
    return await resp.json();
}

function calculateNextShuffler(players, rounds) {
    if (rounds.length === 0) return players[0];
    return players[rounds.length % players.length];
}

function calculateNextMusik(players, rounds) {
    if (rounds.length === 0) return players[1 % players.length];
    return players[(rounds.length + 1) % players.length];
}

function showAddRoundForm() {
    const anyAddBtn = document.querySelector(".btn-add-round");
    if (anyAddBtn && anyAddBtn.style.display === "none") return;

    if (document.getElementById("new-round-form")) return;

    const tbody = document.getElementById("details-tbody");
    const tr = document.createElement("tr");
    tr.id = "new-round-form";
    tr.className = "new-round-row";

    const nextShuffler =
        document.getElementById("next-shuffler-name").innerText;

    const nextMusik = document.getElementById("next-musik-name").innerText;

    let bidWinnerOptions = "";
    currentPlayers.forEach((p) => {
        const isMusik = p === nextMusik;
        bidWinnerOptions += `<option value="${p}" ${isMusik ? "selected" : ""}>${p}</option>`;
    });

    let playerInputs = "";
    currentPlayers.forEach((p) => {
        const isBombUsed = bombsUsedInGame[p] === true;
        playerInputs += `
            <td style="text-align: center;">
                <input type="number" class="input-score round-input" data-player="${p}" placeholder="Pkt" step="5" style="width: 60px;">
                <div style="margin-top: 5px; font-size: 10px;">
                    <label>
                        <input type="checkbox" class="bomb-checkbox" data-player="${p}" ${isBombUsed ? "disabled" : ""} onchange="handleBombChange(this)"> 💣
                    </label>
                </div>
            </td>`;
    });

    tr.innerHTML = `
        <td>${currentRoundsCount + 1}</td>
        <td><strong>${nextShuffler}</strong></td>
        <td>
            <select id="new-bid-winner" class="setup-input">
                ${bidWinnerOptions}
            </select>
            <input type="number" id="new-bid-amount" class="input-score" placeholder="Ile" step="10" min="100" value="100" style="width: 60px;">
        </td>
        ${playerInputs}
        <td>
            <div class="action-buttons-inline">
                <button class="btn-action btn-save btn-add-round-form" onclick="saveNewRound(this)">Zapisz</button>
                <button class="btn-action btn-delete btn-add-round-form" onclick="initDetails()">X</button>
            </div>
        </td>
    `;

    tbody.appendChild(tr);
    tr.scrollIntoView({ behavior: "smooth" });
}

function handleBombChange(checkbox) {
    const inputs = document.querySelectorAll(".round-input");
    const allBombCheckboxes = document.querySelectorAll(".bomb-checkbox");
    const bidWinner = document.getElementById("new-bid-winner");
    const bidAmount = document.getElementById("new-bid-amount");

    if (checkbox.checked) {
        if (bidWinner) bidWinner.disabled = true;
        if (bidAmount) bidAmount.disabled = true;

        allBombCheckboxes.forEach((cb) => {
            if (cb !== checkbox) cb.disabled = true;
        });

        inputs.forEach((input) => {
            input.value = 0;
            input.disabled = true;
        });
    } else {
        if (bidWinner) bidWinner.disabled = false;
        if (bidAmount) bidAmount.disabled = false;

        allBombCheckboxes.forEach((cb) => {
            const player = cb.dataset.player;
            if (!bombsUsedInGame[player]) cb.disabled = false;
        });

        inputs.forEach((input) => {
            input.disabled = false;
            input.value = "";
        });
    }
}

async function saveNewRound(btn) {
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Zapis...";
    }

    const inputs = document.querySelectorAll(".round-input");
    const shuffler = document.getElementById("next-shuffler-name").innerText;
    const bidWinner = document.getElementById("new-bid-winner").value;
    const bidAmount =
        parseInt(document.getElementById("new-bid-amount").value) || 0;

    let scoresData = {};
    let activeBombPlayer = null;

    document.querySelectorAll(".bomb-checkbox").forEach((cb) => {
        if (cb.checked) activeBombPlayer = cb.dataset.player;
    });

    if (activeBombPlayer) {
        currentPlayers.forEach((p) => {
            scoresData[p] = p === activeBombPlayer ? "BOMBA" : 0;
        });
    } else {
        if (bidWinner && bidAmount < 100) {
            alert("Podaj poprawną kwotę licytacji (minimum 100)!");
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Zapisz";
            }
            return;
        }

        inputs.forEach((input) => {
            const player = input.dataset.player;

            const rawVal = parseInt(input.value) || 0;

            let val = customRound(rawVal);

            if (player === bidWinner) {
                if (rawVal < bidAmount) {
                    val = -bidAmount;
                } else {
                    val = bidAmount;
                }
            }
            scoresData[player] = val;
        });
    }

    const newRound = {
        game_id: parseInt(gameId),
        round_number: currentRoundsCount + 1,
        shuffler: shuffler,
        bid_winner: bidWinner || null,
        bid_amount: bidWinner ? bidAmount : null,
        scores: scoresData,
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_rounds`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newRound),
        });

        if (response.ok) {
            initDetails();
        } else {
            alert("Błąd podczas zapisywania rozdania.");
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Zapisz";
            }
        }
    } catch (err) {
        console.error("Błąd:", err);
    }
}

function renderTable(players, rounds) {
    const thead = document.getElementById("details-thead");
    const tbody = document.getElementById("details-tbody");
    const tfoot = document.getElementById("details-tfoot");

    totals = {};
    players.forEach((p) => (totals[p] = 0));

    let headHtml = `<tr><th>Rozdanie</th><th>Rozdawał</th><th>Grający</th>`;
    players.forEach((p) => {
        headHtml += `<th>${p}</th>`;
    });
    headHtml += `<th>Akcja</th></tr>`;
    thead.innerHTML = headHtml;

    tbody.innerHTML = "";
    rounds.forEach((round) => {
        const tr = document.createElement("tr");

        let pointsCells = "";
        players.forEach((p) => {
            const val = round.scores[p];
            let displayVal = "";
            let cellClass = "";

            if (val === "BOMBA") {
                displayVal = "💣 BOMBA";
                cellClass = "loser-cell";
            } else {
                const numVal = parseInt(val) || 0;
                displayVal = numVal >= 0 ? `+${numVal}` : `${numVal}`;
                cellClass = numVal >= 0 ? "winner-cell" : "loser-cell";
                totals[p] += numVal;
            }

            pointsCells += `<td class="${cellClass}">${displayVal}</td>`;
        });

        const bidDisplay = round.bid_winner
            ? `${round.bid_winner} (${round.bid_amount})`
            : "-";

        tr.innerHTML = `
            <td>${round.round_number}</td>
            <td><span class="shuffler-tag">${round.shuffler}</span></td>
            <td>${bidDisplay}</td>
            ${pointsCells}
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-delete btn-small" onclick="handleDeleteRound(${round.id})">Usuń</button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });

    let footHtml = `<tr><td colspan="3">SUMA PUNKTÓW</td>`;
    players.forEach((p) => {
        footHtml += `<td>${totals[p]}</td>`;
    });
    footHtml += `<td>-</td></tr>`;
    tfoot.innerHTML = footHtml;
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

function renderSummaryTable(players, rounds) {
    const tbody = document.getElementById("summary-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let statsMap = players.map((p) => {
        let pts = 0;
        let wins = 0;
        rounds.forEach((r) => {
            let rWin = "";
            
            players.forEach((pl) => {
                const c = r.scores[pl];
                if (c === "BOMBA") return;
                
                const numVal = parseInt(c) || 0;
                pts += numVal;
                
                if (pl === r.bid_winner && numVal >= 0) {
                    rWin = pl;
                }
            });
            
            if (p === rWin) {
                wins++;
            }
        });
        
        return { name: p, points: totals[p] || 0, wins: wins };
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
        } else {
            lastPlace = index + 1;
        }

        let placeDisplay;
        if (lastPlace === 1) placeDisplay = "🥇";
        else if (lastPlace === 2) placeDisplay = "🥈";
        else if (lastPlace === 3) placeDisplay = "🥉";
        else placeDisplay = lastPlace;

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
    const rounds = await getGameRounds(gameId);

    if (newStatus === "finished") {
        if (!confirm("Czy na pewno chcesz zakończyć grę i wyłonić zwycięzcę?"))
            return;

        const stats = currentPlayers.map((player) => {
            let pts = 0;
            let wins = 0;

            rounds.forEach((round) => {
                const val = round.scores[player];
                let numVal = 0;
                
                if (val !== "BOMBA") {
                    numVal = parseInt(val) || 0;
                }
                
                pts += numVal;

                if (player === round.bid_winner && numVal >= 0) {
                    wins += 1;
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
        if (!confirm("Czy chcesz wznowić grę? Zwycięzca zostanie usunięty."))
            return;
        winnerToSave = null;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/tysiac_games?id=eq.${gameId}`,
            {
                method: "PATCH",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: newStatus,
                    winner: winnerToSave,
                }),
            },
        );

        if (response.ok) {
            initDetails();
        }
    } catch (err) {
        console.error("Błąd zmiany statusu:", err);
    }
}

async function handleDeleteRound(roundId) {
    const addBtn = document.getElementById("add-round-btn");
    if (addBtn.style.display === "none") {
        alert(
            "Nie można usuwać rozdań w zakończonej grze! Wznów grę, aby edytować.",
        );
        return;
    }

    if (gamePassword) {
        const pass = prompt("Podaj hasło gry:");
        if (pass === null) return;
        if (pass !== gamePassword) {
            alert("Niepoprawne hasło!");
            return;
        }
    }

    if (
        !confirm(
            "Czy na pewno chcesz usunąć to rozdanie? Punkty zostaną przeliczone.",
        )
    )
        return;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/tysiac_rounds?id=eq.${roundId}`,
            {
                method: "DELETE",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            },
        );

        if (response.ok) {
            initDetails();
        }
    } catch (err) {
        console.error("Błąd sieci:", err);
    }
}

function customRound(val) {
    const absVal = Math.abs(val);
    const remainder = absVal % 10;
    let roundedAbs;

    if (remainder >= 6) {
        roundedAbs = absVal + (10 - remainder);
    } else {
        roundedAbs = absVal - remainder;
    }

    return val >= 0 ? roundedAbs : -roundedAbs;
}

async function autoFinishGame(winnerName) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/tysiac_games?id=eq.${gameId}`,
            {
                method: "PATCH",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: "finished",
                    winner: winnerName,
                }),
            },
        );

        if (response.ok) {
            alert(
                `🎉 Gra zakończona automatycznie! Gracz ${winnerName} zdobył ${totals[winnerName]} punktów i wygrał całą rozgrywkę! 🏆`,
            );
            initDetails();
        }
    } catch (err) {
        console.error("Błąd automatycznego kończenia gry:", err);
    }
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


function renderPointsChart(players, rounds) {
    const pointsContainer = document.getElementById("points-chart-container");

    if (rounds.length === 0) {
        pointsContainer.style.display = "none";
        return;
    }

    pointsContainer.style.display = "block";

    let cumulativePts = {};
    let chartHistoryPoints = {};

    const labels = ["R0"];

    players.forEach((p) => {
        cumulativePts[p] = 0;
        chartHistoryPoints[p] = [0]; 
    });

    rounds.forEach((round) => {
        labels.push(`R${round.round_number}`);

        players.forEach((p) => {
            const val = round.scores[p];
            let numVal = 0;

            if (val === "BOMBA") {
                numVal = 0; 
            } else {
                numVal = parseInt(val) || 0;
            }

            cumulativePts[p] += numVal;
            chartHistoryPoints[p].push(cumulativePts[p]);
        });
    });

    const dynamicWrapperPoints = document.getElementById("dynamic-points-wrapper");
    const minPixelsPerRound = 45;

    const calculatedWidth = (rounds.length + 1) * minPixelsPerRound;

    if (calculatedWidth > window.innerWidth) {
        dynamicWrapperPoints.style.width = `${calculatedWidth}px`;
    } else {
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

    const drawLimitLinePlugin = {
        id: 'limitLine',
        beforeDraw: (chart) => {
            const { ctx, chartArea: { left, right }, scales: { y } } = chart;
            const yValue = y.getPixelForValue(1000); 

            if (yValue >= chart.chartArea.top && yValue <= chart.chartArea.bottom) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(left, yValue);
                ctx.lineTo(right, yValue);
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#d93025'; 
                ctx.setLineDash([6, 6]);   
                ctx.stroke();

                ctx.fillStyle = '#d93025';
                ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
                ctx.fillText('🏆 1000 pkt', left + 10, yValue - 8);
                ctx.restore();
            }
        }
    };

    const ctxPoints = document.getElementById("pointsChart").getContext("2d");
    if (pointsChartInstance) pointsChartInstance.destroy();

    pointsChartInstance = new Chart(ctxPoints, {
        type: "line",
        data: { labels: labels, datasets: datasetsPoints },
        plugins: [drawLimitLinePlugin], 
        options: {
            responsive: true,
            maintainAspectRatio: false,
            clip: false,
            layout: { padding: { top: 30, bottom: 30, left: 15, right: 25 } },
            scales: {
                y: {
                    suggestedMax: 1000, 
                    title: {
                        display: true,
                        text: "Punkty",
                        color: "#666",
                        font: { weight: "bold" },
                    },
                    grid: {
                        color: (context) =>
                            context.tick.value === 0 ? "#333" : "#e0e0e0",
                        lineWidth: (context) =>
                            context.tick.value === 0 ? 2 : 1,
                    },
                },
                x: { 
                    offset: true,
                    ticks: {
                        color: '#ccc'
                    }
                },
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
        .channel("game-realtime-channel")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "tysiac_rounds",
                filter: `game_id=eq.${gameId}`,
            },
            (payload) => {
                initDetails();
            },
        )
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "tysiac_games",
                filter: `id=eq.${gameId}`,
            },
            (payload) => {
                initDetails();
            },
        )
        .subscribe((status) => {
        });
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        initDetails();
    }
});

function goToLiveGame() {
    window.location.href = `tysiac_gra.html?id=${gameId}`;
}