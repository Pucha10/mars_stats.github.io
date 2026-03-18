renderRemikGames();
async function renderRemikGames() {
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
                <button class="btn-view" onclick="viewGameDetails(${game.id})">Szczegóły</button>
                <button class="btn-action btn-delete" style="margin-left: 5px;" onclick="handleDeleteGame(${game.id})">Usuń</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewGameDetails(id) {
    window.location.href = `remik_detale.html?id=${id}`;
}

function toggleNewGameForm(show) {
    const form = document.getElementById("new-game-setup");
    const list = document.getElementById("player-inputs-list");

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

    const div = document.createElement("div");
    div.className = "player-input-row";
    div.innerHTML = `
        <input type="text" class="setup-input player-name-val" placeholder="Imię gracza ${currentInputs + 1}">
        ${currentInputs > 1 ? '<button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; cursor:pointer;">❌</button>' : ""}
    `;
    list.appendChild(div);
}

async function startNewGame() {
    const nameInputs = document.querySelectorAll(".player-name-val");
    const playersArray = [];

    nameInputs.forEach((input) => {
        const val = input.value.trim();
        if (val) playersArray.push(val);
    });

    if (playersArray.length < 2) {
        alert("Wpisz przynajmniej 2 graczy!");
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
    };
    addNewRemikGame(newGameData);
}

async function handleDeleteGame(id) {
    if (
        !confirm(
            `Czy na pewno chcesz usunąć Grę ? Wszystkie zapisane rozdania tej gry zostaną bezpowrotnie skasowane.`,
        )
    ) {
        return;
    }
    await deleteRemikGame(id);
    renderRemikGames();
}
