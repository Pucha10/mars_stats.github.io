let playersList = [];
let gotGames = [];
const tomSelectInstances = {};
let draftTomSelect = null;
let lastDraftResult = null;

const HOUSES = [
    { key: "baratheon", label: "👑 Baratheon" },
    { key: "lannister", label: "🦁 Lannister" },
    { key: "stark", label: "🐺 Stark" },
    { key: "greyjoy", label: "🦑 Greyjoy" },
    { key: "tyrell", label: "🌹 Tyrell" },
    { key: "martell", label: "☀️ Martell" },
    { key: "arryn", label: "🦅 Arryn" },
    { key: "targaryen", label: "🐉 Targaryen" },
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
        initTomSelects();
    } catch (e) {
        console.error("Błąd pobierania listy graczy:", e);
    }
}

function initTomSelects() {
    HOUSES.forEach((house) => {
        const selectId = `house-${house.key}`;
        const selectElem = document.getElementById(selectId);
        if (!selectElem) return;

        const options = [
            { value: "Nie uczestniczył", text: "-- Nie uczestniczył --" },
            { value: "Wasal", text: "🛡️ Wasal" },
            ...playersList.map((p) => ({ value: p.Name, text: p.Name })),
        ];

        tomSelectInstances[house.key] = new TomSelect(`#${selectId}`, {
            options: options,
            valueField: "value",
            labelField: "text",
            searchField: ["text"],
            create: false,
            placeholder: `-- Wybierz gracza / status --`,
            allowEmptyOption: false,
            items: ["Nie uczestniczył"],
            onChange: () => {
                updateWinnerDropdown();
            },
        });
    });

    tomSelectInstances["winner"] = new TomSelect("#game-winner", {
        options: playersList.map((p) => ({ value: p.Name, text: p.Name })),
        valueField: "value",
        labelField: "text",
        searchField: ["text"],
        create: false,
        placeholder: `-- Wyszukaj lub wybierz zwycięzcę --`,
        allowEmptyOption: true,
    });

    // Inicjalizacja TomSelect dla wyboru graczy do losowania
    const draftElem = document.getElementById("draft-players-select");
    if (draftElem) {
        draftTomSelect = new TomSelect("#draft-players-select", {
            options: playersList.map((p) => ({ value: p.Name, text: p.Name })),
            valueField: "value",
            labelField: "text",
            searchField: ["text"],
            maxItems: 8,
            plugins: ["remove_button"],
            placeholder: "Wybierz graczy (3 - 8 osób)...",
        });
    }
}

function updateWinnerDropdown() {
    const winnerTs = tomSelectInstances["winner"];
    if (!winnerTs) return;

    const currentVal = winnerTs.getValue();

    const activePlayers = [];
    HOUSES.forEach((house) => {
        const ts = tomSelectInstances[house.key];
        if (ts) {
            const val = ts.getValue();
            if (val && val !== "Nie uczestniczył" && val !== "Wasal") {
                if (!activePlayers.includes(val)) {
                    activePlayers.push(val);
                }
            }
        }
    });

    winnerTs.clearOptions();

    activePlayers.forEach((p) => {
        winnerTs.addOption({ value: p, text: `👑 ${p} (przy stole)` });
    });

    playersList.forEach((p) => {
        if (!activePlayers.includes(p.Name)) {
            winnerTs.addOption({ value: p.Name, text: p.Name });
        }
    });

    if (currentVal) {
        winnerTs.setValue(currentVal, true);
    }
}

async function renderGotTable() {
    const container = document.getElementById("got-results-body");
    if (!container) return;

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

        container.innerHTML = "";

        if (gotGames.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding: 25px; background:#fff; border-radius:8px;">Brak zapisanych gier. Kliknij "+ Nowa Gra", aby dodać pierwszą!</div>`;
            return;
        }

        gotGames.forEach((game) => {
            const row = document.createElement("div");
            row.className = "got-game-row";

            const getHouseChip = (val, label) => {
                const isWinner = val && val === game.winner;
                let chipClass = "got-house-chip";
                let content = "";

                if (!val || val === "Nie uczestniczył" || val === "-") {
                    chipClass += " is-empty";
                    content = `<span class="tag-none">-</span>`;
                } else if (val === "Wasal") {
                    content = `<span class="tag-wasal">Wasal</span>`;
                } else {
                    if (isWinner) chipClass += " is-winner";
                    content = `<span class="got-chip-player">${val}${isWinner ? " 🏆" : ""}</span>`;
                }

                return `
                    <div class="${chipClass}">
                        <div class="got-chip-title">${label}</div>
                        ${content}
                    </div>
                `;
            };

            const formatDesktopCell = (val) => {
                if (!val || val === "Nie uczestniczył" || val === "-")
                    return `<span class="tag-none">-</span>`;
                if (val === "Wasal")
                    return `<span class="tag-wasal">Wasal</span>`;
                const isWinner = val === game.winner;
                return `<strong style="${isWinner ? "color:#166534;" : ""}">${val}${isWinner ? " 🏆" : ""}</strong>`;
            };

            row.innerHTML = `
                <div class="got-mobile-header">
                    <span class="got-mobile-game-num">Gra #${game.game_number}</span>
                    <span class="got-mobile-winner">🏆 ${game.winner || "-"}</span>
                </div>

                <div class="got-houses-grid-mobile">
                    ${getHouseChip(game.baratheon, "👑 Baratheon")}
                    ${getHouseChip(game.lannister, "🦁 Lannister")}
                    ${getHouseChip(game.stark, "🐺 Stark")}
                    ${getHouseChip(game.greyjoy, "🦑 Greyjoy")}
                    ${getHouseChip(game.tyrell, "🌹 Tyrell")}
                    ${getHouseChip(game.martell, "☀️ Martell")}
                    ${getHouseChip(game.arryn, "🦅 Arryn")}
                    ${getHouseChip(game.targaryen, "🐉 Targaryen")}
                </div>

                <div class="got-desktop-cell" style="font-weight: bold;">${game.game_number}</div>
                <div class="got-desktop-cell">${formatDesktopCell(game.baratheon)}</div>
                <div class="got-desktop-cell">${formatDesktopCell(game.lannister)}</div>
                <div class="got-desktop-cell">${formatDesktopCell(game.stark)}</div>
                <div class="got-desktop-cell">${formatDesktopCell(game.greyjoy)}</div>
                <div class="got-desktop-cell">${formatDesktopCell(game.tyrell)}</div>
                <div class="got-desktop-cell">${formatDesktopCell(game.martell)}</div>
                <div class="got-desktop-cell">${formatDesktopCell(game.arryn)}</div>
                <div class="got-desktop-cell">${formatDesktopCell(game.targaryen)}</div>
                <div class="got-desktop-cell" style="font-weight: bold; color: #166534;">🏆 ${game.winner || "-"}</div>

                <div class="got-cell-photo">
                    ${game.img_url ? `<a href="${game.img_url}" target="_blank" style="text-decoration:none; font-weight:600; font-size:12px;">🖼️ Zobacz zdjęcie</a>` : '<span class="tag-none">-</span>'}
                </div>

                <div class="got-cell-comment">
                    ${game.comment ? `<div class="got-comment-box" style="text-align: left; font-size: 12px;">💬 ${game.comment}</div>` : '<span class="tag-none">-</span>'}
                </div>

                <div class="got-cell-actions">
                    <button class="btn-action btn-delete" onclick="handleDeleteGotGame(${game.id}, ${game.game_number})">Usuń</button>
                </div>
            `;

            container.appendChild(row);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Wystąpił błąd podczas ładowania danych.</div>`;
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
    const winner = tomSelectInstances["winner"]
        ? tomSelectInstances["winner"].getValue()
        : "";

    if (!winner) {
        alert("Wybierz zwycięzcę partii!");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Zapisywanie...";

    try {
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
            baratheon:
                tomSelectInstances["baratheon"].getValue() ||
                "Nie uczestniczył",
            lannister:
                tomSelectInstances["lannister"].getValue() ||
                "Nie uczestniczył",
            stark: tomSelectInstances["stark"].getValue() || "Nie uczestniczył",
            greyjoy:
                tomSelectInstances["greyjoy"].getValue() || "Nie uczestniczył",
            tyrell:
                tomSelectInstances["tyrell"].getValue() || "Nie uczestniczył",
            martell:
                tomSelectInstances["martell"].getValue() || "Nie uczestniczył",
            arryn: tomSelectInstances["arryn"].getValue() || "Nie uczestniczył",
            targaryen:
                tomSelectInstances["targaryen"].getValue() ||
                "Nie uczestniczył",
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

        HOUSES.forEach((h) => {
            if (tomSelectInstances[h.key]) {
                tomSelectInstances[h.key].setValue("Nie uczestniczył");
            }
        });
        if (tomSelectInstances["winner"]) {
            tomSelectInstances["winner"].clear();
        }
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

// ==========================================
// --- INTELIGENTNY ALGORYTM PRZYDZIAŁU RODÓW ---
// ==========================================

function openDraftModal() {
    document.getElementById("draft-modal").style.display = "flex";
}

function closeDraftModal() {
    document.getElementById("draft-modal").style.display = "none";
}

function closeDraftModalOutside(event) {
    if (event.target.id === "draft-modal") {
        closeDraftModal();
    }
}

function runDraftAlgorithm() {
    if (!draftTomSelect) return;
    const selectedPlayers = draftTomSelect.getValue();

    if (!selectedPlayers || selectedPlayers.length < 3) {
        alert("Wybierz przynajmniej 3 graczy do gry!");
        return;
    }
    if (selectedPlayers.length > 8) {
        alert("Maksymalna liczba graczy w Grze o Tron to 8!");
        return;
    }

    // 1. Zliczamy historię gier per gracz per ród z bazy (gotGames)
    const playCounts = {};
    selectedPlayers.forEach((p) => {
        playCounts[p] = {};
        HOUSES.forEach((h) => (playCounts[p][h.key] = 0));
    });

    gotGames.forEach((game) => {
        HOUSES.forEach((h) => {
            const p = game[h.key];
            if (p && playCounts[p] && playCounts[p][h.key] !== undefined) {
                playCounts[p][h.key]++;
            }
        });
    });

    // 2. Obliczamy koszt z uwzględnieniem cyklu:
    // Jeśli gracz zagrał już każdym rodem po 1 razie, minCount wynosi 1 i znów ma koszt 0 dla wszystkich
    const costs = {};
    selectedPlayers.forEach((p) => {
        const minCount = Math.min(...HOUSES.map((h) => playCounts[p][h.key]));
        costs[p] = {};
        HOUSES.forEach((h) => {
            costs[p][h.key] = playCounts[p][h.key] - minCount;
        });
    });

    // 3. Globalny algorytm z nawrotami (Backtracking) z losowym doborem
    // Minimalizuje max koszt per gracz, a następnie sumę kosztów w grupie
    let bestSolutions = [];
    let bestMaxCost = Infinity;
    let bestSumCost = Infinity;

    const shuffledPlayers = [...selectedPlayers].sort(
        () => Math.random() - 0.5,
    );
    const shuffledHouses = [...HOUSES].sort(() => Math.random() - 0.5);

    function solve(
        playerIdx,
        currentAssignment,
        currentMaxCost,
        currentSumCost,
        usedHouses,
    ) {
        if (
            currentMaxCost > bestMaxCost ||
            (currentMaxCost === bestMaxCost && currentSumCost > bestSumCost)
        ) {
            return;
        }

        if (playerIdx === shuffledPlayers.length) {
            if (
                currentMaxCost < bestMaxCost ||
                (currentMaxCost === bestMaxCost && currentSumCost < bestSumCost)
            ) {
                bestMaxCost = currentMaxCost;
                bestSumCost = currentSumCost;
                bestSolutions = [{ ...currentAssignment }];
            } else if (
                currentMaxCost === bestMaxCost &&
                currentSumCost === bestSumCost
            ) {
                bestSolutions.push({ ...currentAssignment });
            }
            return;
        }

        const player = shuffledPlayers[playerIdx];
        const availableHouses = shuffledHouses.filter(
            (h) => !usedHouses.has(h.key),
        );

        // Sortujemy rody od najmniej granych przez tego gracza + losowy tie-breaker
        availableHouses.sort(
            (a, b) =>
                costs[player][a.key] - costs[player][b.key] ||
                Math.random() - 0.5,
        );

        for (const house of availableHouses) {
            const cost = costs[player][house.key];
            usedHouses.add(house.key);
            currentAssignment[player] = house;

            solve(
                playerIdx + 1,
                currentAssignment,
                Math.max(currentMaxCost, cost),
                currentSumCost + cost,
                usedHouses,
            );

            usedHouses.delete(house.key);
            delete currentAssignment[player];
        }
    }

    solve(0, {}, 0, 0, new Set());

    if (bestSolutions.length === 0) {
        alert("Nie udało się znaleźć dopasowania.");
        return;
    }

    // Wybór losowego z optymalnych rozwiązań
    const chosenAssignment =
        bestSolutions[Math.floor(Math.random() * bestSolutions.length)];
    lastDraftResult = chosenAssignment;

    // Renderowanie wyniku w modalu
    const grid = document.getElementById("draft-result-grid");
    grid.innerHTML = "";

    HOUSES.forEach((h) => {
        // Sprawdzamy, który gracz otrzymał ten ród
        const assignedPlayer = Object.keys(chosenAssignment).find(
            (p) => chosenAssignment[p].key === h.key,
        );

        if (assignedPlayer) {
            const plays = playCounts[assignedPlayer][h.key];
            const isRepeat = costs[assignedPlayer][h.key] > 0;
            const metaText =
                plays === 0 ? "⭐ Pierwszy raz tym rodem" : `(grał ${plays}x)`;

            const item = document.createElement("div");
            item.className = "draft-item";
            item.innerHTML = `
                <div class="draft-item-house">${h.label}</div>
                <div class="draft-item-player">${assignedPlayer}</div>
                <div class="draft-item-meta ${isRepeat ? "repeated" : ""}">${metaText}</div>
            `;
            grid.appendChild(item);
        }
    });

    document.getElementById("draft-result-area").style.display = "block";
}

function applyDraftToForm() {
    if (!lastDraftResult) return;

    // 1. Reset wszystkich rodów do 'Nie uczestniczył'
    HOUSES.forEach((h) => {
        if (tomSelectInstances[h.key]) {
            tomSelectInstances[h.key].setValue("Nie uczestniczył", true);
        }
    });

    // 2. Przypisanie wylosowanych graczy
    Object.keys(lastDraftResult).forEach((player) => {
        const houseKey = lastDraftResult[player].key;
        if (tomSelectInstances[houseKey]) {
            tomSelectInstances[houseKey].setValue(player, true);
        }
    });

    updateWinnerDropdown();
    closeDraftModal();
    toggleNewGameForm(true);

    const form = document.getElementById("new-game-setup");
    if (form) form.scrollIntoView({ behavior: "smooth" });
}
