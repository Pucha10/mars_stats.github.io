renderRemikGames();
let players = [];
async function renderRemikGames() {
    players = await getPlayersList();
    const tbody = document.getElementById("remik-tbody");
    results = await fetchRemikGames();
    tbody.innerHTML = "";

    results.forEach((game) => {
        const tr = document.createElement("tr");

        const playersHtml = game.players
            .map((p) => `<span class="player-tag">${p}</span>`)
            .join("");

        tr.innerHTML = `
            <td>${game.game_number}</td>
            <td>${playersHtml}</td>
            <td style="font-weight: bold;">${game.winner || "---"}</td>
            <td class="status-${game.status}">${game.status === "finished" ? "Zakończona" : "W toku"}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-view" onclick="viewGameDetails(${game.id})">Szczegóły</button>
                    <button class="btn-action btn-delete" onclick="handleDeleteGame(${game.id}, ${game.game_number})">Usuń</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewGameDetails(id) {
    window.location.href = `remik_detale.html?id=${id}`;
}

async function toggleNewGameForm(show) {
    const form = document.getElementById("new-game-setup");
    const list = document.getElementById("player-inputs-list");
    const passwordInput = document.getElementById("new-game-password");
    if (show) {
        form.style.display = "block";
        list.innerHTML = "";
        addPlayerInputField();
        addPlayerInputField();
        form.scrollIntoView({ behavior: "smooth" });
    } else {
        form.style.display = "none";
    }
}

function addPlayerInputField() {
    const list = document.getElementById("player-inputs-list");
    const currentInputs =
        list.getElementsByClassName("player-input-row").length;

    if (currentInputs >= 10) {
        alert("Maksymalnie 10 graczy!");
        return;
    }

    const optionsHtml = players
        .map((p) => `<option value="${p.Name}">${p.Name}</option>`)
        .join("");

    const div = document.createElement("div");
    div.className = "player-input-row";

    const uniqueSelectId = `select-player-${Date.now()}-${currentInputs}`;

    div.innerHTML = `
        <select id="${uniqueSelectId}" class="setup-input player-name-val">
            <option value="">-- Wpisz gracza ${currentInputs + 1} --</option>
            ${optionsHtml}
        </select>
        ${currentInputs > 1 ? `<button type="button" onclick="removePlayerField(this)" style="background:none; border:none; cursor:pointer; font-size:16px;">❌</button>` : ""}
    `;

    list.appendChild(div);

    new TomSelect(`#${uniqueSelectId}`, {
        create: false,
        sortField: {
            field: "text",
            direction: "asc",
        },
        placeholder: `-- Wybierz gracza ${currentInputs + 1} --`,
        allowEmptyOption: true,
    });
}

function removePlayerField(button) {
    const row = button.parentElement;
    const select = row.querySelector("select");
    if (select && select.tomselect) {
        select.tomselect.destroy();
    }
    row.remove();
}

async function startNewGame() {
    const nameInputs = document.querySelectorAll("select.player-name-val");
    const playersArray = [];

    nameInputs.forEach((input) => {
        const val = input.value.trim();
        if (val) playersArray.push(val);
    });

    if (playersArray.length < 2) {
        alert("Wpisz przynajmniej 2 graczy!");
        return;
    }

    const gamePassword = document.getElementById("new-game-password").value;

    if (!gamePassword) {
        alert("Musisz podać hasło do gry!");
        return;
    }

    const results = await fetchRemikGames();
    const nextGameNumber =
        results.length > 0
            ? Math.max(...results.map((g) => g.game_number)) + 1
            : 1;

    const newGameData = {
        game_number: nextGameNumber,
        players: playersArray,
        status: "ongoing",
        winner: null,
        created_at: new Date().toISOString(),
        passwordHash: gamePassword,
    };
    addNewRemikGame(newGameData);
}

async function handleDeleteGame(id) {
    const pass = prompt("Podaj hasło gry:");
    if (pass == null) return;
    await deleteRemikGame(id, pass);
    renderRemikGames();
}

function openPlayersModal() {
    document.getElementById("players-modal").style.display = "flex";
    loadPlayersIntoModal();
}

function closePlayersModal() {
    document.getElementById("players-modal").style.display = "none";
}

async function loadPlayersIntoModal() {
    players = await getPlayersList();
    const tbody = document.getElementById("modal-players-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    players.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                <td style="text-align: left; padding-left: 20px; font-weight: bold; color: #1a472a;">${p.Name}</td>
                <td>
                    <button class="btn-action btn-view" onclick="showPlayerStats('${p.Name}')">📊 Statystyki</button>
                </td>
            `;
        tbody.appendChild(tr);
    });
}

function showPlayerStats(playerName) {
    window.location.href = `statystyki_gracza.html?name=${playerName}`;
}
