let players = [];
let results = [];

document.addEventListener("DOMContentLoaded", () => {
    renderTysiacGames();
});

async function renderTysiacGames() {
    const tbody = document.getElementById("tysiac-tbody");
    if (!tbody) return;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/tysiac_games?order=game_number.desc`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            },
        );
        results = await response.json();

        tbody.innerHTML = "";

        results.forEach((game) => {
            const tr = document.createElement("tr");

            const playersHtml = game.players
                .map((p) => `<span class="player-tag">${p}</span>`)
                .join("");

            tr.innerHTML = `
                <td>${game.game_number}</td>
                <td style="text-align: left; padding-left: 20px;">${playersHtml}</td>
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
    } catch (err) {
        console.error("Błąd pobierania gier Tysiąca:", err);
    }
}

function viewGameDetails(id) {
    window.location.href = `tysiac_detale.html?id=${id}`;
}

async function toggleNewGameForm(show) {
    const form = document.getElementById("new-game-setup");
    const list = document.getElementById("player-inputs-list");
    const passwordInput = document.getElementById("new-game-password");

    if (show) {
        try {
            const fetchedPlayers = await getPlayersList();
            players = [...fetchedPlayers].sort((a, b) =>
                a.Name.localeCompare(b.Name, "pl"),
            );
        } catch (error) {
            console.error("Błąd pobierania listy graczy:", error);
            players = [];
        }

        form.style.display = "block";
        list.innerHTML = "";
        if (passwordInput) passwordInput.value = "";

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

    if (currentInputs >= 4) {
        alert("W Tysiąca można grać maksymalnie w 4 osoby!");
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
            <option value="">-- Wybierz gracza ${currentInputs + 1} --</option>
            ${optionsHtml}
        </select>
        ${currentInputs > 1 ? `<button type="button" onclick="removePlayerField(this)" style="background:none; border:none; cursor:pointer; font-size:16px;">❌</button>` : ""}
    `;

    list.appendChild(div);

    new TomSelect(`#${uniqueSelectId}`, {
        create: false,
        sortField: { field: "text", direction: "asc" },
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

    const gamePassword = document
        .getElementById("new-game-password")
        .value.trim();
    const nextGameNumber =
        results.length > 0
            ? Math.max(...results.map((g) => g.game_number)) + 1
            : 1;

    const newGameData = {
        game_number: nextGameNumber,
        players: playersArray,
        status: "ongoing",
        winner: null,
        password_plain: gamePassword || null, // Proste, jawne hasło w bazie
        created_at: new Date().toISOString(),
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_games`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
            },
            body: JSON.stringify(newGameData),
        });

        if (response.ok) {
            const data = await response.json();
            const newId = data[0].id;
            window.location.href = `tysiac_detale.html?id=${newId}`;
        } else {
            alert("Błąd podczas tworzenia gry.");
        }
    } catch (err) {
        console.error("Błąd:", err);
    }
}

async function handleDeleteGame(id, gameNumber) {
    const game = results.find((g) => g.id === id);
    if (!game) return;
    const correctPassword = game.password_plain;
    if (correctPassword) {
        const userPass = prompt("Podaj hasło gry, aby ją usunąć:");
        if (userPass === null) return;
        if (userPass !== correctPassword) {
            alert("Niepoprawne hasło!");
            return;
        }
    }

    if (
        !confirm(
            `Czy na pewno chcesz usunąć Grę nr ${gameNumber}? Wszystkie rozdania zostaną skasowane.`,
        )
    ) {
        return;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/tysiac_games?id=eq.${id}`,
            {
                method: "DELETE",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        if (response.ok) {
            alert(`Gra nr ${gameNumber} została usunięta.`);
            renderTysiacGames();
        } else {
            alert("Błąd podczas usuwania gry.");
        }
    } catch (error) {
        console.error("Błąd sieci:", error);
    }
}

function showPlayerStats(playerName) {
    window.location.href = `statystyki_gracza_tysiac.html?name=${playerName}`;
}
