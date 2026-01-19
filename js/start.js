renderTable();
document.getElementById('add-game-btn').addEventListener('click', showAddRow);
async function renderTable() {
    results = await getGameResults();
    console.log(results);
    const tableBody = document.getElementById('results_table_body');
    if (!tableBody) return;
    let DawidHowManyWin = 0;
    let KasiaHowManyWin = 0;
    tableBody.innerHTML = ''; 

    results.forEach((game, index) => {
        const kasiaWon = game.winner === "Kasia";
        const dawidWon = game.winner === "Dawid";
        DawidHowManyWin += dawidWon ? 1 : 0;
        KasiaHowManyWin += kasiaWon ? 1 : 0;
        const trKasia = document.createElement('tr');
        trKasia.innerHTML = `
            <td rowspan="2" class="no-player-cell">${game.game_number}</td>
            <td>${game.Kasia_wt}</td>
            <td>${game.Kasia_awards}</td>
            <td>${game.Kasia_titles}</td>
            <td>${game.Kasia_board_score}</td>
            <td>${game.Kasia_cards_score}</td>
            <td>${game.Kasia_total_score}</td>
            <td><input type="checkbox" ${kasiaWon ? 'checked' : ''} onclick="return false;"></td>
            <td rowspan="2" class="no-player-cell">
                ${game.img_url ? `<a href="${game.img_url}" target="_blank">🖼️</a>` : '-'}
            </td>
            <td rowspan="2" class="no-player-cell" style="font-weight: normal; font-size: 12px; max-width: 200px;">
                ${game.comment || ''}
            </td>
            <td rowspan="2" class="merged-cell">
                <button class="btn-action btn-edit" onclick="editLesson(${game.id})">Edytuj</button>
                <button class="btn-action btn-delete" onclick="deleteLesson(${game.id})">Usuń</button>
            </td>
        `;

        const trDawid = document.createElement('tr');
        trDawid.innerHTML = `
            <td>${game.Dawid_wt}</td>
            <td>${game.Dawid_awards}</td>
            <td>${game.Dawid_titles}</td>
            <td>${game.Dawid_board_score}</td>
            <td>${game.Dawid_cards_score}</td>
            <td>${game.Dawid_total_score}</td>
            <td><input type="checkbox" ${dawidWon ? 'checked' : ''} onclick="return false;"></td>
        `;

        tableBody.appendChild(trKasia);
        tableBody.appendChild(trDawid);
        document.getElementById('dawid-wins').textContent = DawidHowManyWin;
        document.getElementById('kasia-wins').textContent = KasiaHowManyWin;
    });
}

function showAddRow() {
    const tbody = document.getElementById('results_table_body');
    const number_of_rows = tbody.getElementsByTagName('tr').length / 2;
    if (document.getElementById('new-game-row-kasia')) return;

    const trKasia = document.createElement('tr');
    trKasia.id = 'new-game-row-kasia';
    const trDawid = document.createElement('tr');
    trDawid.id = 'new-game-row-dawid';

    trKasia.innerHTML = `
        <td rowspan="2" class="merged-cell"id="new_game_number">${number_of_rows + 1}</td>
        <td><input type="number" class="edit-input kasia-in" data-field="Kasia_wt" value="20"></td>
        <td><input type="number" class="edit-input kasia-in" data-field="Kasia_awards" value="0"></td>
        <td><input type="number" class="edit-input kasia-in" data-field="Kasia_titles" value="0"></td>
        <td><input type="number" class="edit-input kasia-in" data-field="Kasia_board_score" value="0"></td>
        <td><input type="number" class="edit-input kasia-in" data-field="Kasia_cards_score" value="0"></td>
        <td><span id="new-sum-kasia" class="readonly-input">20</span></td>
        <td><input type="checkbox" id="new-win-kasia" disabled></td>
        <td rowspan="2" class="merged-cell">
            <input type="file" id="new-img-file" accept="image/*" style="width: 150px;">
        </td>
        <td rowspan="2" class="merged-cell"><input type="text" class="edit-input" id="new-comment" placeholder="Komentarz"></td>
        <td rowspan="2" class="merged-cell">
            <button class="btn-action btn-save" onclick="saveNewGame()">Dodaj</button>
            <button class="btn-action btn-cancel" onclick="cancelAddRow()">Anuluj</button>
        </td>
    `;

    trDawid.innerHTML = `
        <td><input type="number" class="edit-input dawid-in" data-field="Dawid_wt" value="20"></td>
        <td><input type="number" class="edit-input dawid-in" data-field="Dawid_awards" value="0"></td>
        <td><input type="number" class="edit-input dawid-in" data-field="Dawid_titles" value="0"></td>
        <td><input type="number" class="edit-input dawid-in" data-field="Dawid_board_score" value="0"></td>
        <td><input type="number" class="edit-input dawid-in" data-field="Dawid_cards_score" value="0"></td>
        <td><span id="new-sum-dawid" class="readonly-input">20</span></td>
        <td><input type="checkbox" id="new-win-dawid" disabled></td>
    `;

    tbody.insertBefore(trDawid, tbody.firstChild);
    tbody.insertBefore(trKasia, tbody.firstChild);

    document.querySelectorAll('.edit-input').forEach(input => {
        input.addEventListener('input', calculateNewGameTotals);
    });
}

function calculateNewGameTotals() {
    const kInputs = document.querySelectorAll('.kasia-in');
    const dInputs = document.querySelectorAll('.dawid-in');

    let kSum = 0;
    kInputs.forEach(i => kSum += parseInt(i.value) || 0);
    
    let dSum = 0;
    dInputs.forEach(i => dSum += parseInt(i.value) || 0);
    document.getElementById('new-sum-kasia').innerText = kSum;
    document.getElementById('new-sum-dawid').innerText = dSum;
    document.getElementById('new-win-kasia').checked = kSum > dSum;
    document.getElementById('new-win-dawid').checked = dSum > kSum;
}

async function saveNewGame() {
    const kSum = parseInt(document.getElementById('new-sum-kasia').innerText);
    const dSum = document.getElementById('new-sum-dawid') ? parseInt(document.getElementById('new-sum-dawid').innerText) : 0;

    let finalWinner = "";
    if (kSum > dSum) {
        finalWinner = "Kasia";
    } else if (dSum > kSum) {
        finalWinner = "Dawid";
    } else {
        const choice = confirm("Mamy remis punktowy! Kliknij OK, jeśli wygrała KASIA. Kliknij ANULUJ, jeśli wygrał DAWID.");
        finalWinner = choice ? "Kasia" : "Dawid";
    }

    const fileInput = document.getElementById('new-img-file');
    let uploadedImageUrl = await addBoardImage(fileInput);
    // let uploadedImageUrl = "";

    const gameData = {
        Kasia_wt: parseInt(document.querySelector('[data-field="Kasia_wt"]').value),
        Kasia_awards: parseInt(document.querySelector('[data-field="Kasia_awards"]').value),
        Kasia_titles: parseInt(document.querySelector('[data-field="Kasia_titles"]').value),
        Kasia_board_score: parseInt(document.querySelector('[data-field="Kasia_board_score"]').value),
        Kasia_cards_score: parseInt(document.querySelector('[data-field="Kasia_cards_score"]').value),
        Kasia_total_score: kSum,
        
        Dawid_wt: parseInt(document.querySelector('[data-field="Dawid_wt"]').value),
        Dawid_awards: parseInt(document.querySelector('[data-field="Dawid_awards"]').value),
        Dawid_titles: parseInt(document.querySelector('[data-field="Dawid_titles"]').value),
        Dawid_board_score: parseInt(document.querySelector('[data-field="Dawid_board_score"]').value),
        Dawid_cards_score: parseInt(document.querySelector('[data-field="Dawid_cards_score"]').value),
        Dawid_total_score: dSum,
        
        game_number: parseInt(document.getElementById('new_game_number').innerText),
        winner: finalWinner,
        img_url: uploadedImageUrl,
        comment: document.getElementById('new-comment').value
    };

    const result = await addGameResult(gameData);
    
    if (result) {
        renderTable(); 
    }
}

function cancelAddRow() {
    const rowKasia = document.getElementById('new-game-row-kasia');
    const rowDawid = document.getElementById('new-game-row-dawid');

    if (rowKasia) rowKasia.remove();
    if (rowDawid) rowDawid.remove();
}