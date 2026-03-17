renderRemikGames();
async function renderRemikGames() {
    const tbody = document.getElementById("remik-tbody");
    const games = await fetchRemikGames();
    console.log(games);

    tbody.innerHTML = "";

    games.forEach((game) => {
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
                <button class="btn-view" onclick="viewGameDetails(${game.id})">Szczegóły / Rozdania</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewGameDetails(id) {
    window.location.href = `remik_detale.html?id=${id}`;
}
