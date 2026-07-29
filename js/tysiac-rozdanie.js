const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("id");
let currentPlayers = [];
let currentRoundsCount = 0;
let totals = {};
let gamePassword = "";
let bombsUsedInGame = {};

if (!gameId) {
    alert("Nie znaleziono ID gry!");
    window.location.href = "tysiac.html";
}

document.addEventListener("DOMContentLoaded", initDetails);

async function initDetails() {
    const game = await getGameHeader(gameId);
    const rounds = await getGameRounds(gameId);

    if (game) {
        document.getElementById("game-title").innerText =
            `🃏 Tysiąc - Gra #${game.game_number}`;
        currentPlayers = game.players;
        currentRoundsCount = rounds.length;
        gamePassword = game.password_plain;

        bombsUsedInGame = {};
        currentPlayers.forEach((p) => (bombsUsedInGame[p] = false));
        rounds.forEach((r) => {
            currentPlayers.forEach((p) => {
                if (r.scores[p] === "BOMBA") bombsUsedInGame[p] = true;
            });
        });

        renderTable(game.players, rounds);

        if (game.status === "ongoing") {
            let automaticWinner = null;
            let maxScore = 999;

            for (const [player, score] of Object.entries(totals)) {
                if (score >= 1000 && score > maxScore) {
                    maxScore = score;
                    automaticWinner = player;
                }
            }

            if (automaticWinner) {
                await autoFinishGame(automaticWinner);
                return;
            }
        }

        const infoBox = document.getElementById("next-shuffler-info");
        const addBtns = document.querySelectorAll(".btn-add-round");

        if (game.status === "finished") {
            infoBox.innerHTML = `🏆 Grę wygrał: <strong id="next-shuffler-name">${game.winner || "Remis"}</strong>`;
            infoBox.style.backgroundColor = "#d4af37";
            infoBox.style.color = "#000";

            addBtns.forEach((btn) => (btn.style.display = "none"));
        } else {
            const nextShuffler = calculateNextShuffler(game.players, rounds);
            const nextMusik = calculateNextMusik(game.players, rounds);
            infoBox.innerHTML = `Następny rozdaje: <strong id="next-shuffler-name">${nextShuffler}</strong> | Na musiku: <strong id="next-musik-name">${nextMusik}</strong>`;
            infoBox.style.backgroundColor = "";
            infoBox.style.color = "";

            addBtns.forEach((btn) => (btn.style.display = "inline-block"));
        }

        renderStatusButton(game.status);
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

async function updateGameStatus(newStatus) {
    let winnerToSave = null;

    if (newStatus === "finished") {
        if (!confirm("Czy na pewno chcesz zakończyć grę i wyłonić zwycięzcę?"))
            return;

        let maxPoints = -Infinity;
        let winnerName = "Remis";

        for (const [player, points] of Object.entries(totals)) {
            if (points > maxPoints) {
                maxPoints = points;
                winnerName = player;
            } else if (points === maxPoints) {
                winnerName = "Remis";
            }
        }
        winnerToSave = winnerName;
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
