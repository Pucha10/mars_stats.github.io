const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("id");
let currentPlayers = [];
let currentRoundsCount = 0;
if (!gameId) {
    alert("Nie znaleziono ID gry!");
    window.location.href = "remik_stats.html";
}

document.addEventListener("DOMContentLoaded", initDetails);

async function initDetails() {
    const game = await getGameHeader(gameId);
    const rounds = await getGameRounds(gameId);

    if (game) {
        currentPlayers = game.players;
        currentRoundsCount = rounds.length;

        document.getElementById("game-title").innerText = `🎴 Gra #${game.id}`;
        renderTable(game.players, rounds);

        const nextShuffler = calculateNextShuffler(game.players, rounds);
        document.getElementById("next-shuffler-name").innerText = nextShuffler;
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
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/remik_rounds`, {
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
        }
    } catch (err) {
        console.error("Błąd:", err);
    }
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

    let totals = {};
    players.forEach((p) => (totals[p] = 0));

    let headHtml = `<tr><th>Rozdanie</th><th>Rozdawał</th>`;
    players.forEach((p) => {
        headHtml += `<th>${p}</th>`;
    });
    headHtml += `<th>Zwycięzca</th></tr>`;
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
        `;
        tbody.appendChild(tr);
    });

    let footHtml = `<tr><td colspan="2">SUMA PUNKTÓW</td>`;
    players.forEach((p) => {
        footHtml += `<td>${totals[p]}</td>`;
    });
    footHtml += `<td>-</td></tr>`;
    tfoot.innerHTML = footHtml;
}
