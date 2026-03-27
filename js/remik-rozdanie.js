const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("id");
let currentPlayers = [];
let currentRoundsCount = 0;
let totals = {};
if (!gameId) {
    alert("Nie znaleziono ID gry!");
    window.location.href = "remik_stats.html";
}

document.addEventListener("DOMContentLoaded", initDetails);

async function initDetails() {
    const game = await getGameHeader(gameId);
    const rounds = await getGameRounds(gameId);
    if (game) {
        document.getElementById("game-title").innerText =
            `🎴 Gra #${game.game_number}`;
        currentPlayers = game.players;
        currentRoundsCount = rounds.length;
        renderTable(game.players, rounds);
        renderSummaryTable(game.players, rounds);
        const infoBox = document.getElementById("next-shuffler-info");
        const addBtn = document.getElementById("add-round-btn");

        if (game.status === "finished") {
            infoBox.innerHTML = `🏆 Grę wygrał: <strong id="next-shuffler-name">${game.winner || "Remis"}</strong>`;
            infoBox.style.backgroundColor = "#d4af37";
            infoBox.style.color = "#000";

            addBtn.style.display = "none";
        } else {
            const nextShuffler = calculateNextShuffler(game.players, rounds);
            infoBox.innerHTML = `Następny rozdaje: <strong id="next-shuffler-name">${nextShuffler}</strong>`;
            infoBox.style.backgroundColor = "";
            infoBox.style.color = "";

            addBtn.style.display = "inline-block";
        }

        renderStatusButton(game.status);
    }
}

function showAddRoundForm() {
    if (document.getElementById("new-round-form")) return;

    const tbody = document.getElementById("details-tbody");
    const tr = document.createElement("tr");
    tr.id = "new-round-form";
    tr.className = "new-round-row";

    const nextShuffler =
        document.getElementById("next-shuffler-name").innerText;

    let playerInputs = "";
    currentPlayers.forEach((p) => {
        playerInputs += `
            <td>
                <input type="number" class="input-score round-input" 
                       data-player="${p}" placeholder="Karty" min="0" value="0">
            </td>`;
    });

    tr.innerHTML = `
        <td>${currentRoundsCount + 1}</td>
        <td><strong>${nextShuffler}</strong></td>
        ${playerInputs}
        <td>
            <button class="btn-action btn-save btn-small" onclick="saveNewRound()">Zapisz</button>
            <button class="btn-action btn-cancel btn-small" onclick="initDetails()">X</button>
        </td>
    `;

    tbody.appendChild(tr);
    tr.scrollIntoView({ behavior: "smooth" });
}

async function saveNewRound() {
    const inputs = document.querySelectorAll(".round-input");
    const shuffler = document.getElementById("next-shuffler-name").innerText;

    let cardsData = {};
    let zeroCount = 0;
    inputs.forEach((input) => {
        const val = parseInt(input.value) || 0;
        cardsData[input.dataset.player] = val;
        if (val === 0) zeroCount++;
    });

    if (zeroCount === 0) {
        alert("Ktoś musi mieć 0 kart (zwycięzca rozdania)!");
        return;
    }
    if (zeroCount > 1) {
        if (
            !confirm(
                "Więcej niż jedna osoba ma 0 kart. Czy to na pewno poprawne?",
            )
        )
            return;
    }
    const newRound = {
        game_id: parseInt(gameId),
        round_number: currentRoundsCount + 1,
        shuffler: shuffler,
        cards: cardsData,
    };
    saveCurrentRound(newRound);
}

function calculateNextShuffler(players, rounds) {
    if (rounds.length === 0) return players[0];

    const lastShuffler = rounds[rounds.length - 1].shuffler;

    const lastIdx = players.indexOf(lastShuffler);

    const nextIdx = (lastIdx + 1) % players.length;

    return players[nextIdx];
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

    let headHtml = `<tr><th>Rozdanie</th><th>Rozdawał</th>`;
    players.forEach((p) => {
        headHtml += `<th>${p}</th>`;
    });
    headHtml += `<th>Zwycięzca</th><th>Akcja</th></tr>`;
    thead.innerHTML = headHtml;

    tbody.innerHTML = "";
    rounds.forEach((round) => {
        const tr = document.createElement("tr");

        let roundScores = {};
        let sumOfOtherCards = 0;
        let roundWinner = "";

        players.forEach((p) => {
            const cardsValue = round.cards[p] || 0;
            if (cardsValue === 0) {
                roundWinner = p;
            } else {
                sumOfOtherCards += cardsValue;
            }
        });

        let pointsCells = "";
        players.forEach((p) => {
            const cardsValue = round.cards[p] || 0;
            let displayPoints = 0;

            if (p === roundWinner) {
                displayPoints = sumOfOtherCards;
                pointsCells += `<td class="winner-cell">+${displayPoints}</td>`;
            } else {
                displayPoints = -cardsValue;
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
                <button class="btn-action btn-delete btn-small" onclick="handleDeleteRound(${round.id})">Usuń</button>
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
    let winCount = {};
    players.forEach((p) => (winCount[p] = 0));

    rounds.forEach((round) => {
        for (let player in round.cards) {
            if (round.cards[player] === 0) {
                winCount[player]++;
                break;
            }
        }
    });

    const totalRounds = rounds.length;

    players.forEach((p) => {
        const wins = winCount[p];
        const winPercent =
            totalRounds > 0 ? ((wins / totalRounds) * 100).toFixed(1) : 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: bold; text-align: center; padding-left: 20px;">${p}</td>
            <td style="font-size: 18px; color: #1e8e3e; font-weight: bold;">${wins}</td>
            <td style="color: #666;">${winPercent}%</td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateGameStatus(newStatus) {
    let winnerToSave = null;

    if (newStatus === "finished") {
        if (!confirm("Czy na pewno chcesz zakończyć grę i wyłonić zwycięzcę?"))
            return;

        let maxPoints = -Infinity;
        let winnerName = "Remis";
        console.log(totals);
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
    winnerChange(winnerToSave, newStatus, gameId);
    initDetails();
}

async function handleDeleteRound(roundId) {
    const addBtn = document.getElementById("add-round-btn");
    if (addBtn.style.display === "none") {
        alert(
            "Nie można usuwać rozdań w zakończonej grze! Wznów grę, aby edytować.",
        );
        return;
    }

    if (
        !confirm(
            "Czy na pewno chcesz usunąć to rozdanie? Wyniki zostaną przeliczone.",
        )
    )
        return;
    delateOneRound(roundId);
    initDetails();
}
