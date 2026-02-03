renderTable();
document.getElementById('add-game-btn').addEventListener('click', showAddRow);
async function renderTable() {
    results = await getGameResults();
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
        trKasia.id = `game-row-${game.id}`; 
        trKasia.innerHTML = `
            <td rowspan="2" class="no-player-cell" data-label="GRA NR">${game.game_number}</td>
            <td data-label="Korporacja (K)">${game.Kasia_corporation || ''}</td>
            <td data-label="WT (K)">${game.Kasia_wt}</td>
            <td data-label="Nagrody (K)">${game.Kasia_awards}</td>
            <td data-label="Tytuły (K)">${game.Kasia_titles}</td>
            <td data-label="Plansza (K)">${game.Kasia_board_score}</td>
            <td data-label="Karty (K)">${game.Kasia_cards_score}</td>
            <td data-label="SUMA (K)">${game.Kasia_total_score}</td>
            <td data-label="Wygrana (K)"><input type="checkbox" ${kasiaWon ? 'checked' : ''} onclick="return false;"></td>
            <td rowspan="2" class="no-player-cell" data-label="Zdj">
                ${game.img_url ? `<a href="${game.img_url}" target="_blank">🖼️ Zobacz zdjęcie</a>` : '-'}
            </td>
            <td rowspan="2" class="no-player-cell" data-label="Komentarz">
                ${game.comment || '-'}
            </td>
            <td rowspan="2" class="merged-cell" data-label="Akcje">
                <button class="btn-action btn-edit" onclick="handleEditGame(${game.id})">Edytuj</button>
                <button class="btn-action btn-delete" onclick="handleDeleteGame(${game.id})">Usuń</button>
            </td>
        `;

        const trDawid = document.createElement('tr');
        trDawid.innerHTML = `
            <td data-label="Korporacja (D)">${game.Dawid_corporation || ''}</td>
            <td data-label="WT (D)">${game.Dawid_wt}</td>
            <td data-label="Nagrody (D)">${game.Dawid_awards}</td>
            <td data-label="Tytuły (D)">${game.Dawid_titles}</td>
            <td data-label="Plansza (D)">${game.Dawid_board_score}</td>
            <td data-label="Karty (D)">${game.Dawid_cards_score}</td>
            <td data-label="SUMA (D)">${game.Dawid_total_score}</td>
            <td data-label="Wygrana (D)"><input type="checkbox" ${dawidWon ? 'checked' : ''} onclick="return false;"></td>
        `;

        tableBody.appendChild(trKasia);
        tableBody.appendChild(trDawid);
    });

    document.getElementById('dawid-wins').textContent = DawidHowManyWin;
    document.getElementById('kasia-wins').textContent = KasiaHowManyWin;
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
        <td><input type="text" class="edit-input kasia-in" data-field="Kasia_corporation"></td>
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
        <td><input type="text" class="edit-input dawid-in" data-field="Dawid_corporation"></td>
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

    const gameData = {
        Kasia_corporation: document.querySelector('.kasia-in[data-field="Kasia_corporation"]').value,
        Kasia_wt: parseInt(document.querySelector('[data-field="Kasia_wt"]').value) || 0,
        Kasia_awards: parseInt(document.querySelector('[data-field="Kasia_awards"]').value) || 0,
        Kasia_titles: parseInt(document.querySelector('[data-field="Kasia_titles"]').value) || 0,
        Kasia_board_score: parseInt(document.querySelector('[data-field="Kasia_board_score"]').value) || 0,
        Kasia_cards_score: parseInt(document.querySelector('[data-field="Kasia_cards_score"]').value) || 0,
        Kasia_total_score: kSum,
        
        Dawid_corporation: document.querySelector('.dawid-in[data-field="Dawid_corporation"]').value,
        Dawid_wt: parseInt(document.querySelector('[data-field="Dawid_wt"]').value) || 0,
        Dawid_awards: parseInt(document.querySelector('[data-field="Dawid_awards"]').value) || 0,
        Dawid_titles: parseInt(document.querySelector('[data-field="Dawid_titles"]').value) || 0,
        Dawid_board_score: parseInt(document.querySelector('[data-field="Dawid_board_score"]').value) || 0,
        Dawid_cards_score: parseInt(document.querySelector('[data-field="Dawid_cards_score"]').value) || 0,
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

async function handleDeleteGame(id) {
    if (confirm(`Czy na pewno chcesz usunąć grę nr ${id}? Tej operacji nie można cofnąć.`)) {
        const success = await deleteGameRecord(id);
        
        if (success) {
            renderTable(); 
        }
    }
}


async function handleEditGame(id) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/game_results?id=eq.${id}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const data = await response.json();
    const game = data[0];

    const kasiaRow = document.getElementById(`game-row-${id}`);
    
    if (!kasiaRow) {
        console.error("Nie znaleziono wiersza w tabeli dla ID:", id);
        return;
    }
    const dawidRow = kasiaRow.nextElementSibling;

    kasiaRow.innerHTML = `
        <td rowspan="2" class="merged-cell" data-label="GRA NR">${game.game_number}</td>
        <td data-label="Korporacja (K)"><input type="text" class="edit-input kasia-edit" data-field="Kasia_corporation" value="${game.Kasia_corporation || ''}"></td>
        <td data-label="WT (K)"><input type="number" class="edit-input kasia-edit" data-field="Kasia_wt" value="${game.Kasia_wt}"></td>
        <td data-label="Nagrody (K)"><input type="number" class="edit-input kasia-edit" data-field="Kasia_awards" value="${game.Kasia_awards}"></td>
        <td data-label="Tytuły (K)"><input type="number" class="edit-input kasia-edit" data-field="Kasia_titles" value="${game.Kasia_titles}"></td>
        <td data-label="Plansza (K)"><input type="number" class="edit-input kasia-edit" data-field="Kasia_board_score" value="${game.Kasia_board_score}"></td>
        <td data-label="Karty (K)"><input type="number" class="edit-input kasia-edit" data-field="Kasia_cards_score" value="${game.Kasia_cards_score}"></td>
        <td data-label="SUMA (K)"><span id="edit-sum-kasia" class="readonly-input">${game.Kasia_total_score}</span></td>
        <td data-label="Wygrana (K)"><input type="checkbox" id="edit-win-kasia" ${game.winner === 'Kasia' ? 'checked' : ''} disabled></td>
        <td rowspan="2" class="merged-cell" data-label="Zdj">
            <input type="file" id="edit-img-file" style="width: 120px;">
            <input type="hidden" id="old-img-url" value="${game.img_url || ''}">
        </td>
        <td rowspan="2" class="merged-cell" data-label="Komentarz">
            <textarea id="edit-comment" class="edit-input" style="height: 60px;">${game.comment || ''}</textarea>
        </td>
        <td rowspan="2" class="merged-cell" data-label="Akcje">
            <button class="btn-action btn-save" onclick="saveEdit(${game.id})">Zapisz</button>
            <button class="btn-action btn-cancel" onclick="renderTable()">Anuluj</button>
        </td>
    `;
    
    dawidRow.innerHTML = `
        <td><input type="text" class="edit-input dawid-edit" data-field="Dawid_corporation" value="${game.Dawid_corporation || ''}"></td>
        <td><input type="number" class="edit-input dawid-edit" data-field="Dawid_wt" value="${game.Dawid_wt}"></td>
        <td><input type="number" class="edit-input dawid-edit" data-field="Dawid_awards" value="${game.Dawid_awards}"></td>
        <td><input type="number" class="edit-input dawid-edit" data-field="Dawid_titles" value="${game.Dawid_titles}"></td>
        <td><input type="number" class="edit-input dawid-edit" data-field="Dawid_board_score" value="${game.Dawid_board_score}"></td>
        <td><input type="number" class="edit-input dawid-edit" data-field="Dawid_cards_score" value="${game.Dawid_cards_score}"></td>
        <td><span id="edit-sum-dawid" class="readonly-input">${game.Dawid_total_score}</span></td>
        <td><input type="checkbox" id="edit-win-dawid" ${game.winner === 'Dawid' ? 'checked' : ''} disabled></td>
    `;

    const allEditInputs = [...kasiaRow.querySelectorAll('.edit-input'), ...dawidRow.querySelectorAll('.edit-input')];
    allEditInputs.forEach(input => {
        input.addEventListener('input', calculateEditTotals);
    });
}

function calculateEditTotals() {
    let kSum = 0;
    document.querySelectorAll('.kasia-edit').forEach(i => kSum += parseInt(i.value) || 0);
    let dSum = 0;
    document.querySelectorAll('.dawid-edit').forEach(i => dSum += parseInt(i.value) || 0);

    document.getElementById('edit-sum-kasia').innerText = kSum;
    document.getElementById('edit-sum-dawid').innerText = dSum;
    document.getElementById('edit-win-kasia').checked = kSum > dSum;
    document.getElementById('edit-win-dawid').checked = dSum > kSum;
}

async function saveEdit(id) {
    const kSum = parseInt(document.getElementById('edit-sum-kasia').innerText);
    const dSum = parseInt(document.getElementById('edit-sum-dawid').innerText);

    let finalWinner = "";
    if (kSum > dSum) finalWinner = "Kasia";
    else if (dSum > kSum) finalWinner = "Dawid";
    else finalWinner = confirm("Remis! OK = Kasia, Anuluj = Dawid") ? "Kasia" : "Dawid";

    let imgUrl = document.getElementById('old-img-url').value;
    const fileInput = document.getElementById('edit-img-file');
    let uploadedImageUrl = await addBoardImage(fileInput);


    const updatedData = {
        "Kasia_wt": parseInt(document.querySelector('.kasia-edit[data-field="Kasia_wt"]').value) || 0,
        "Kasia_awards": parseInt(document.querySelector('.kasia-edit[data-field="Kasia_awards"]').value) || 0,
        "Kasia_titles": parseInt(document.querySelector('.kasia-edit[data-field="Kasia_titles"]').value) || 0,
        "Kasia_board_score": parseInt(document.querySelector('.kasia-edit[data-field="Kasia_board_score"]').value) || 0,
        "Kasia_cards_score": parseInt(document.querySelector('.kasia-edit[data-field="Kasia_cards_score"]').value) || 0,
        "Kasia_total_score": kSum,

        "Dawid_wt": parseInt(document.querySelector('.dawid-edit[data-field="Dawid_wt"]').value) || 0,
        "Dawid_awards": parseInt(document.querySelector('.dawid-edit[data-field="Dawid_awards"]').value) || 0,
        "Dawid_titles": parseInt(document.querySelector('.dawid-edit[data-field="Dawid_titles"]').value) || 0,
        "Dawid_board_score": parseInt(document.querySelector('.dawid-edit[data-field="Dawid_board_score"]').value) || 0,
        "Dawid_cards_score": parseInt(document.querySelector('.dawid-edit[data-field="Dawid_cards_score"]').value) || 0,
        "Dawid_total_score": dSum,

        "winner": finalWinner,
        "comment": document.getElementById('edit-comment').value,
        "img_url": uploadedImageUrl
    };
    const result = await updateGameRecord(id, updatedData);

    if (result) {
        renderTable(); 
    }
    
}