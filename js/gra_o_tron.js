let playersList = [];
let gotGames = [];

const HOUSES = [
    "baratheon",
    "lannister",
    "stark",
    "greyjoy",
    "tyrell",
    "martell",
    "arryn",
    "targaryen",
];

document.addEventListener("DOMContentLoaded", async () => {
    await loadInitialData();
    renderGotTable();
});

async function loadInitialData() {
    try {
        const fetchedPlayers = await getPlayersList();
        playersList = [...fetchedPlayers].sort((a, b) =>
            a.Name.localeCompare(b.Name, "pl"),
        );
        populateHouseDropdowns();
    } catch (e) {
        console.error("Błąd pobierania listy graczy:", e);
    }
}

function populateHouseDropdowns() {
    HOUSES.forEach((house) => {
        const select = document.getElementById(`house-${house}`);
        if (!select) return;

        let options = `
            <option value="Nie uczestniczył">-- Nie uczestniczył --</option>
            <option value="Wasal">🛡️ Wasal</option>
            <optgroup label="Gracze">
        `;

        playersList.forEach((player) => {
            options += `<option value="${player.Name}">${player.Name}</option>`;
        });

        options += `</optgroup>`;
        select.innerHTML = options;
    });
}

function updateWinnerDropdown() {
    const winnerSelect = document.getElementById("game-winner");
    const currentVal = winnerSelect.value;

    const chosenPlayers = new Set();
    HOUSES.forEach((house) => {
        const val = document.getElementById(`house-${house}`).value;
        if (val && val !== "Nie uczestniczył" && val !== "Wasal") {
            chosenPlayers.add(val);
        }
    });

    let options = `<option value="">-- Wybierz zwycięzcę --</option>`;
    
    // Dodajemy graczy wybranych w rodach
    if (chosenPlayers.size > 0) {
        options += `<optgroup label="Gracze przy stole">`;
        chosenPlayers.forEach((p) => {
            options += `<option value="${p}" ${p === currentVal ? "selected" : ""}>${p}</option>`;
        });
        options += `</optgroup>`;
    }

    // Dodajemy pozostałych na wszelki wypadek
    options += `<optgroup label="Wszyscy gracze">`;
    playersList.forEach((p) => {
        if (!chosenPlayers.has(p.Name)) {
            options += `<option value="${p.Name}" ${p.Name === currentVal ? "selected" : ""}>${p.Name}</option>`;
        }
    });
    options += `</optgroup>`;

    winnerSelect.innerHTML = options;
}

async function renderGotTable() {
    const tbody = document.getElementById("got-results-body");
    if (!tbody) return;

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

        if (!response.ok) throw new Error("Błąd pobierania partii Gry o Tron");
        gotGames = await response.json();

        tbody.innerHTML = "";

        if (gotGames.length === 0) {
            tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 20px;">Brak zapisanych gier. Kliknij "+ Nowa Gra", aby dodać pierwszą!</td></tr>`;
            return;
        }

        gotGames.forEach((game) => {
            const tr = document.createElement("tr");

            const formatPlayerCell = (val) => {
                if (!val || val === "Nie uczestniczył" || val === "-") {
                    return `<span class="tag-none">-</span>`;
                }
                if (val === "Wasal") {
                    return `<span class="tag-wasal">Wasal</span>`;
                }
                return `<strong>${val}</strong>`;
            };

            tr.innerHTML = `
                <td style="font-weight: bold; text-align: center;">${game.game_number}</td>
                <td>${formatPlayerCell(game.baratheon)}</td>
                <td>${formatPlayerCell(game.lannister)}</td>
                <td>${formatPlayerCell(game.stark)}</td>
                <td>${formatPlayerCell(game.greyjoy)}</td>
                <td>${formatPlayerCell(game.tyrell)}</td>
                <td>${formatPlayerCell(game.martell)}</td>
                <td>${formatPlayerCell(game.arryn)}</td>
                <td>${formatPlayerCell(game.targaryen)}</td>
                <td class="tag-winner">${game.winner || "-"}</td>
                <td>
                    ${game.img_url ? `<a href="${game.img_url}" target="_blank">🖼️ Zdjęcie</a>` : "-"}
                </td>
                <td style="max-width: 250px; text-align: left; font-size: 13px;">${game.comment || "-"}</td>
                <td>
                    <button class="btn-action btn-delete" onclick="handleDeleteGotGame(${game.id}, ${game.game_number})">Usuń</button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="12" style="color:red; text-align:center;">Wystąpił błąd podczas ładowania danych.</td></tr>`;
    }
}

function toggleNewGameForm(forceState) {
    const form = document.getElementById("new-game-setup");
    if (!form) return;

    if (forceState !== undefined) {
        form.style.display = forceState ? "block" : "none";
    } else {
        form.style.display = form.style.display === "block" ? "none" : "block";
    }

    if (form.style.display === "block") {
        form.scrollIntoView({ behavior: "smooth" });
    }
}

async function saveGotGame() {
    const btn = document.getElementById("btn-save-got");
    const winner = document.getElementById("game-winner").value;

    if (!winner) {
        alert("Wybierz zwycięzcę partii!");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Zapisywanie...";

    try {
        // Upload zdjęcia (używa Twojej funkcji z supaBaseScript.js)
        const fileInput = document.getElementById("game-image");
        let uploadedImageUrl = null;
        if (fileInput && fileInput.files.length > 0) {
            uploadedImageUrl = await addBoardImage(fileInput);
        }

        const nextGameNumber =
            gotGames.length > 0
                ? Math.max(...gotGames.map((g) => g.game_number)) + 1
                : 1;

        const payload = {
            game_number: nextGameNumber,
            baratheon: document.getElementById("house-baratheon").value,
            lannister: document.getElementById("house-lannister").value,
            stark: document.getElementById("house-stark").value,
            greyjoy: document.getElementById("house-greyjoy").value,
            tyrell: document.getElementById("house-tyrell").value,
            martell: document.getElementById("house-martell").value,
            arryn: document.getElementById("house-arryn").value,
            targaryen: document.getElementById("house-targaryen").value,
            winner: winner,
            img_url: uploadedImageUrl,
            comment: document.getElementById("game-comment").value.trim(),
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/got_games`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Błąd podczas zapisu do bazy.");

        // Reset formularza
        HOUSES.forEach((h) => (document.getElementById(`house-${h}`).value = "Nie uczestniczył"));
        document.getElementById("game-winner").value = "";
        document.getElementById("game-comment").value = "";
        if (fileInput) fileInput.value = "";

        toggleNewGameForm(false);
        renderGotTable();
    } catch (err) {
        console.error(err);
        alert("Wystąpił błąd przy zapisie: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Zapisz grę";
    }
}

async function handleDeleteGotGame(id, gameNumber) {
    if (!confirm(`Czy na pewno chcesz usunąć Grę o Tron nr ${gameNumber}?`)) {
        return;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/got_games?id=eq.${id}`,
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
            renderGotTable();
        } else {
            alert("Nie udało się usunąć gry.");
        }
    } catch (error) {
        console.error("Błąd usuwania:", error);
    }
}