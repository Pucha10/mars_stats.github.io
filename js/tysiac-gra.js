const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("id");
let currentPlayers = [];
let gamePassword = "";
let viewerName = localStorage.getItem(`tysiac-profile-${gameId}`); // Kim jest użytkownik na tym telefonie
let activeState = null;
let currentRoundsCount = 0;
let totals = {}; // Suma punktów ze wszystkich poprzednich rund
let pointsChartInstance = null; // Instancja wykresu punktowego
let chosenFinalBid = 100;

// Zmienne globalne do sterowania kolejką, odrzucaniem kart i bombami
let nextShuffler = "";
let nextMusik = "";
let bombsUsedInGame = {};
let selectedDiscards = []; // <--- POPRAWKA: Zmienna zadeklarowana globalnie!

if (!gameId) {
    alert("Nie znaleziono ID gry!");
    window.location.href = "tysiac.html";
}

document.getElementById('back-to-details-link').href = `tysiac_detale.html?id=${gameId}`;

document.addEventListener("DOMContentLoaded", () => {
    initGame();
    setupRealtimeListener();
});

async function initGame() {
    const game = await getGameHeader(gameId);
    if (!game) return;

    currentPlayers = game.players;
    gamePassword = game.password_plain;

    // 1. Zabezpieczenie na 2 graczy
    if (currentPlayers.length !== 2) {
        document.getElementById('table-area-content').innerHTML = `
            <div class="board-status-message">
                <h3 style="color:#d93025;">Brak obsługi</h3>
                <p>Wirtualna rozgrywka na telefonach obsługuje obecnie wyłącznie grę dla 2 graczy!</p>
                <a href="tysiac_detale.html?id=${gameId}" class="btn-primary" style="display:inline-block; text-decoration:none;">Wróć do tabeli</a>
            </div>
        `;
        return;
    }

    // 2. Logowanie profilu
    if (!viewerName) {
        askWhoIsPlaying();
        return;
    }

    document.getElementById('my-profile-label').innerText = `Zalogowany jako: ${viewerName}`;

    // 3. Pobranie rund i zliczenie zużytych bomb oraz sumy punktów (totals)
    const rounds = await getGameRounds(gameId);
    currentRoundsCount = rounds.length;

    bombsUsedInGame = {};
    currentPlayers.forEach((p) => (bombsUsedInGame[p] = false));
    rounds.forEach((r) => {
        currentPlayers.forEach((p) => {
            if (r.scores[p] === "BOMBA") bombsUsedInGame[p] = true;
        });
    });

    calculateTotals(game.players, rounds);

    // Ustalamy kolejnego rozdającego i musika wewnętrznie w JS
    nextShuffler = calculateNextShuffler(game.players, rounds);
    nextMusik = calculateNextMusik(game.players, rounds);

    // 4. Pobranie aktywnego wirtualnego stanu gry z bazy
    activeState = await getActiveGameState(gameId);

    if (!activeState) {
        renderSetupOrWaitingScreen(game);
    } else {
        // Sprawdzamy czy gra została automatycznie zakończona przez przekroczenie 1000 pkt
        if (game.status === "finished") {
            showEndGameScreen(game.winner);
            return;
        }

        // Automatyczny finisz, jeśli ktoś przekroczy 1000 punktów po podliczeniu totals
        if (game.status === "ongoing") {
            let automaticWinner = null;
            let maxScore = 999;

            for (const [player, score] of Object.entries(totals)) {
                if (score >= 1000 && score > maxScore) {
                    maxScore = score;
                    automaticWinner = player;
                }
            }

            if (automaticWinner) {
                await autoFinishGame(automaticWinner);
                return;
            }
        }

        renderGamePlay();
    }
}

async function getGameHeader(id) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_games?id=eq.${id}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const data = await resp.json();
    return data[0];
}

async function getGameRounds(id) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_rounds?game_id=eq.${id}&order=round_number.asc`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return await resp.json();
}

async function getActiveGameState(id) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_active_state?game_id=eq.${id}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const data = await resp.json();
    return data[0];
}

function askWhoIsPlaying() {
    const overlay = document.createElement('div');
    overlay.id = 'profile-select-overlay';
    overlay.className = 'modal';
    let options = currentPlayers.map(p => `<option value="${p}">${p}</option>`).join('');
    overlay.innerHTML = `
        <div class="modal-content" style="text-align: center;">
            <h2 style="color: #1a472a; margin-top: 0;">Kim jesteś?</h2>
            <p>Wybierz swój profil dla tej gry na tym telefonie:</p>
            <select id="profile-select-dropdown" class="setup-input" style="width: 100%; margin-bottom: 15px;">
                ${options}
            </select>
            <button onclick="saveViewerProfile()" class="btn-primary" style="width: 100%;">Dołącz do gry</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function saveViewerProfile() {
    const sel = document.getElementById('profile-select-dropdown').value;
    if (sel) {
        localStorage.setItem(`tysiac-profile-${gameId}`, sel);
        viewerName = sel;
        document.getElementById('profile-select-overlay').remove();
        initGame(); 
    }
}

function calculateNextShuffler(players, rounds) {
    if (rounds.length === 0) return players[0];
    return players[rounds.length % players.length];
}

function calculateNextMusik(players, rounds) {
    if (rounds.length === 0) return players[1 % players.length];
    return players[(rounds.length + 1) % players.length];
}

async function renderSetupOrWaitingScreen(game) {
    const tableArea = document.getElementById('table-area-content');
    const handContainer = document.getElementById('my-hand-container');
    const opponentLabel = document.getElementById('opponent-card-count');

    const dealer = nextShuffler; 
    const isDealer = viewerName === dealer;

    opponentLabel.innerText = "Karty nie zostały jeszcze rozdane";
document.getElementById('my-profile-label').innerHTML = `
    Zalogowany jako: <strong>${viewerName}</strong>
    <a href="#" onclick="logoutProfile()" style="margin-left: 12px; font-size: 11px; color: inherit; text-decoration: none;">
        Zmień profil 👤
    </a>`;
    handContainer.innerHTML = '<span style="color: #aaa;">Czekanie na karty...</span>';

    if (isDealer) {
        tableArea.innerHTML = `
            <div class="board-status-message">
                <h3>Jesteś Rozdającym!</h3>
                <p>Kliknij przycisk poniżej, aby potasować talię i rozdać karty dla Ciebie, rywala oraz dwóch musików.</p>
                <button class="btn-primary" onclick="dealCardsAndStart()" style="width: 100%; height: 50px; font-size: 16px; margin-top: 15px;">
                    🎴 Rozdaj karty
                </button>
            </div>
        `;
    } else {
        tableArea.innerHTML = `
            <div class="board-status-message">
                <h3>Oczekiwanie na rozdanie</h3>
                <p>Gracz <strong>${dealer}</strong> rozdaje teraz karty. Poczekaj chwilę, Twoje karty pojawią się automatycznie na dole ekranu.</p>
            </div>
        `;
    }
}

async function dealCardsAndStart() {
    const VALUES = ['9', 'J', 'Q', 'K', '10', 'A'];
    const SUITS = ['H', 'D', 'C', 'S']; 
    let deck = [];

    SUITS.forEach(s => {
        VALUES.forEach(v => {
            deck.push(`${v}_${s}`);
        });
    });

    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const hand1 = deck.slice(0, 10);       
    const hand2 = deck.slice(10, 20);      
    const musik1 = deck.slice(20, 22);     
    const musik2 = deck.slice(22, 24);     

    const p1 = currentPlayers[0];
    const p2 = currentPlayers[1];

    const initialActiveState = {
        game_id: parseInt(gameId),
        phase: 'bidding',                  
        dealer: nextShuffler,               
        musik_player: nextMusik,                   
        current_bid: 100,
        bid_winner: nextMusik,            
        turn_player: nextShuffler,         
        hands: {
            [p1]: hand1,
            [p2]: hand2
        },
        musiks: [musik1, musik2],
        table_cards: [],
        trump_suit: null,
        tricks_points: {
            [p1]: 0,
            [p2]: 0
        },
        discarded_cards: []
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_active_state`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(initialActiveState)
        });

        if (response.ok) {
            initGame(); 
        } else {
            alert("Błąd rozdawania kart.");
        }
    } catch (err) {
        console.error("Błąd zapisu stanu rozdania:", err);
    }
}

/**
 * LOGIKA OBSŁUGI PLANSZY GRY
 */
function renderGamePlay() {
    const tableArea = document.getElementById('table-area-content');
    const handContainer = document.getElementById('my-hand-container');
    const opponentLabel = document.getElementById('opponent-card-count');

    // Zabezpieczenie przed wiszącymi kartami na koniec rundy
    const tableCards = activeState.phase === 'round_end' ? [] : (activeState.table_cards || []);
    const isTrickComplete = tableCards.length === 2;

    const opponentName = currentPlayers.find(p => p !== viewerName);
    const oppHand = activeState.hands[opponentName] || [];

    // --- POPRAWKA: Przenosimy pobranie Twoich kart na samą górę, by uniknąć błędu przed inicjalizacją! ---
    const myHandRaw = activeState.hands[viewerName] || [];

    // --- AKTUALIZACJA PUNKTACJI W ROZDANIU I GRZE NA ŻYWO (GÓRA I DÓŁ EKRANU) ---
    const oppRoundPoints = activeState.tricks_points ? (activeState.tricks_points[opponentName] || 0) : 0;
    const myRoundPoints = activeState.tricks_points ? (activeState.tricks_points[viewerName] || 0) : 0;
    const oppTotalPoints = totals[opponentName] || 0;
    const myTotalPoints = totals[viewerName] || 0;

    opponentLabel.innerText = `${opponentName}: ${oppHand.length} kart | Wynik: ${oppTotalPoints} pkt (+${oppRoundPoints} w rozdaniu)`;
    document.getElementById('my-profile-label').innerText = `Ty (${viewerName}) | Wynik: ${myTotalPoints} pkt (+${myRoundPoints} w rozdaniu)`;

    const isMyTurn = viewerName === activeState.turn_player;

    const trumpSymbols = { 
        'H': '♥ KIER (+100)', 
        'D': '♦ KARO (+80)', 
        'C': '♣ TREFL (+60)', 
        'S': '♠ PIK (+40)' 
    };
    const currentTrumpDisplay = activeState.trump_suit ? trumpSymbols[activeState.trump_suit] : 'brak';
    const isTrumpRed = activeState.trump_suit === 'H' || activeState.trump_suit === 'D';

    // Jeśli jesteśmy w fazie odrzucania kart, ustawiamy domyślny ostateczny bet na wygraną licytację
    if (activeState.phase === 'discarding' && chosenFinalBid < activeState.current_bid) {
        chosenFinalBid = activeState.current_bid;
    }

    // --- FAZA A: LICYTACJA (Bidding) ---
    if (activeState.phase === 'bidding') {
        if (isMyTurn) {
            const maxAllowedBid = calculateMaxAllowedBid(myHandRaw); // Tutaj myHandRaw jest już w pełni bezpieczne i zadeklarowane!
            const currentBid = activeState.current_bid;

            const bidValues = [
                110, 120, 130, 140,
                150, 160, 170, 180,
                190, 200, 210, 220,
                230, 240, 250, 260,
                270, 280, 290, 300,
                310, 320, 330, 340,
                350, 360, 370, 380
            ];
            let gridButtonsHtml = '';

            bidValues.forEach(val => {
                const isDisabled = val <= currentBid || val > maxAllowedBid;
                gridButtonsHtml += `<button class="bidding-btn" ${isDisabled ? 'disabled' : ''} onclick="submitCustomBid(${val})">${val}</button>`;
            });

            const isBombDisabled = bombsUsedInGame[viewerName] === true;
            gridButtonsHtml += `<button class="bidding-btn btn-bomba" ${isBombDisabled ? 'disabled' : ''} onclick="submitBiddingBomb()">bomba</button>`;
            gridButtonsHtml += `<button class="bidding-btn btn-pas" onclick="submitPass()">pas</button>`;

            tableArea.innerHTML = `
                <div class="board-status-message" style="width: 100%; max-width: 340px; padding: 15px;">
                    <h3 style="margin-bottom: 5px;">Twój ruch! Twój limit: <span style="color:#d4af37">${maxAllowedBid}</span></h3>
                    <p style="font-size:12px; margin:0 0 10px 0;">Aktualna oferta: <strong>${currentBid}</strong> (${activeState.bid_winner})</p>
                    <div class="bidding-grid">${gridButtonsHtml}</div>
                </div>
            `;
        } else {
            tableArea.innerHTML = `
                <div class="board-status-message">
                    <h3>Licytacja - Ruch rywala</h3>
                    <p>Aktualna oferta: <strong>${activeState.current_bid}</strong> (${activeState.bid_winner})</p>
                    <p>Czekaj na decyzję gracza <strong>${activeState.turn_player}</strong>...</p>
                </div>
            `;
        }
    } 
    // --- FAZA B: WYBÓR MUSIKA (Musik Choice) ---
    else if (activeState.phase === 'musik_choice') {
        if (isMyTurn) {
            tableArea.innerHTML = `
                <div class="board-status-message">
                    <h3>Wygrałeś licytację za ${activeState.current_bid}!</h3>
                    <p>Wybierz jeden z dwóch musików leżących na stole:</p>
                    <div class="table-musiks-container">
                        <div class="card-back" onclick="selectMusik(0)"></div>
                        <div class="card-back" onclick="selectMusik(1)"></div>
                    </div>
                </div>
            `;
        } else {
            tableArea.innerHTML = `
                <div class="board-status-message">
                    <h3>Licytacja zakończona!</h3>
                    <p>Wygrał: <strong>${activeState.bid_winner}</strong> za stawkę: <strong>${activeState.current_bid}</strong></p>
                    <p>Trwa wybór musika przez gracza <strong>${activeState.bid_winner}</strong>...</p>
                </div>
            `;
        }
    }
    // --- FAZA C: JAWNE POKAZANIE KART (Musik Reveal) ---
    else if (activeState.phase === 'musik_reveal') {
        const isBidOver120 = activeState.current_bid > 120;
        const revealedCards = activeState.discarded_cards || []; 
        let revealedCardsHtml = revealedCards.map(c => renderCardHTML(c)).join('');

        if (isMyTurn) {
            tableArea.innerHTML = `
                <div class="board-status-message">
                    <h3>Wybrany musik zawierał:</h3>
                    <div style="display: flex; gap: 10px; justify-content: center; margin: 15px 0;">
                        ${revealedCardsHtml}
                    </div>
                    <button class="btn-primary" onclick="addMusikToHand()" style="width: 100%; height: 44px;">
                        Dodaj do ręki
                    </button>
                </div>
            `;
        } else {
            if (isBidOver120) {
                tableArea.innerHTML = `
                    <div class="board-status-message">
                        <h3>Licytacja pow. 120! Musik jest jawny:</h3>
                        <div style="display: flex; gap: 10px; justify-content: center; margin: 15px 0;">
                            ${revealedCardsHtml}
                        </div>
                        <p style="font-size: 12px; color: #666;">Czekaj, aż ${activeState.bid_winner} weźmie karty do ręki...</p>
                    </div>
                `;
            } else {
                tableArea.innerHTML = `
                    <div class="board-status-message">
                        <h3>Wybór musika</h3>
                        <p>Licytacja do 120. Musik jest niejawny.</p>
                        <p style="font-size: 12px; color: #666;">Czekaj, aż ${activeState.bid_winner} doda karty do ręki...</p>
                    </div>
                `;
            }
        }
    }
    // --- FAZA D: ODRZUCANIE KART I OSTATECZNA DEKLARACJA (Discarding) ---
    else if (activeState.phase === 'discarding') {
        if (isMyTurn) {
            const selectedCount = selectedDiscards.length;
            const canDiscard = selectedCount === 2;

            // Obliczamy limit na 12 kartach z podniesionym musikiem!
            const maxAllowedBid = calculateMaxAllowedBid(myHandRaw);
            const wonBid = activeState.current_bid;

            // Generujemy przyciski do ostatecznego podbicia gry
            const bidValues = [
                110, 120, 130, 140,
                150, 160, 170, 180,
                190, 200, 210, 220,
                230, 240, 250, 260,
                270, 280, 290, 300,
                310, 320, 330, 340,
                350, 360, 370, 380
            ];
            let gridButtonsHtml = '';

            bidValues.forEach(val => {
                const isDisabled = val < wonBid || val > maxAllowedBid;
                const isSelected = val === chosenFinalBid; 

                gridButtonsHtml += `
                    <button class="bidding-btn ${isSelected ? 'selected-final-bid' : ''}" 
                            ${isDisabled ? 'disabled' : ''} 
                            onclick="selectFinalBid(${val})">
                        ${val}
                    </button>
                `;
            });

            // Przycisk bomba
            const isBombDisabled = bombsUsedInGame[viewerName] === true;
            gridButtonsHtml += `<button class="bidding-btn btn-bomba" ${isBombDisabled ? 'disabled' : ''} onclick="submitBiddingBomb()">bomba</button>`;
            
            // Puste pole zamiast pasa (by zachować układ 4 kolumn)
            gridButtonsHtml += `<button class="bidding-btn" disabled style="background-color:#f5f5f5; grid-column: span 2;"></button>`;

            tableArea.innerHTML = `
                <div class="board-status-message" style="width: 100%; max-width: 340px; padding: 15px;">
                    <h3>Zadeklaruj grę i odrzuć karty</h3>
                    <p style="font-size:12px; margin:0 0 10px 0;">Zaznaczono kart: <strong style="color: #d93025;">${selectedCount} / 2</strong></p>
                    <p style="font-size:11px; margin:0 0 10px 0; color:#666;">Wybierz ostateczny kontrakt (Twój limit: <strong>${maxAllowedBid}</strong>):</p>
                    
                    <!-- SIATKA OSTATECZNEJ DEKLARACJI -->
                    <div class="bidding-grid">${gridButtonsHtml}</div>

                    <button class="btn-primary" ${!canDiscard ? 'disabled' : ''} onclick="submitDiscards()" style="width: 100%; height: 44px; margin-top: 15px;">
                        Odrzuć i graj za ${chosenFinalBid}
                    </button>
                </div>
            `;
        } else {
            tableArea.innerHTML = `
                <div class="board-status-message">
                    <h3>Faza odrzucania</h3>
                    <p>Gracz <strong>${activeState.bid_winner}</strong> odrzuca teraz 2 niepotrzebne karty.</p>
                    <p style="font-size: 12px; color: #666;">Czekaj na rozpoczęcie właściwej rozgrywki...</p>
                </div>
            `;
        }
    }
    // --- FAZA E: ROZGRYWKA WŁAŚCIWA (Playing tricks) ---
    else if (activeState.phase === 'playing') {
        let tableContentHtml = '';

        if (isTrickComplete) {
            const trickResult = evaluateTrick(tableCards, activeState.trump_suit);
            const isMeWinner = viewerName === trickResult.winner;

            if (isMeWinner) {
                tableContentHtml = `
                    <div class="board-status-message" style="border-color: #1e8e3e;">
                        <h3 style="color: #1e8e3e; margin: 0 0 5px 0;">Wygrałeś lewę (+${trickResult.pts} pkt)!</h3>
                        <button class="btn-primary" onclick="collectTrick()" style="width: 100%; height: 44px; margin-top: 10px;">
                            📥 Zabierz lewę
                        </button>
                    </div>
                `;
            } else {
                tableContentHtml = `
                    <div class="board-status-message" style="border-color: #d93025;">
                        <h3 style="color: #d93025; margin: 0 0 5px 0;">Rywal (${trickResult.winner}) wygrał lewę!</h3>
                        <p style="font-size: 12px; color: #666;">Czekaj, aż rywal zabierze karty ze stołu...</p>
                    </div>
                `;
            }
        } else {
            if (isMyTurn) {
                tableContentHtml = `
                    <div class="board-status-message">
                        <h3>Twój ruch!</h3>
                        <p>Kliknij w kartę na dole, aby rzucić ją na stół.</p>
                    </div>
                `;
            } else {
                tableContentHtml = `
                    <div class="board-status-message">
                        <h3>Ruch rywala</h3>
                        <p>Gracz <strong>${activeState.turn_player}</strong> wybiera teraz kartę...</p>
                    </div>
                `;
            }
        }

        let playedCardsHtml = '';
        tableCards.forEach(tc => {
            playedCardsHtml += `
                <div class="played-card-container">
                    ${renderCardHTML(tc.card)}
                    <span class="player-tag-micro">${tc.player}</span>
                </div>
            `;
        });

        tableArea.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <!-- JAWNA INFORMACJA O KONTRAKCIE DLA OBU GRACZY -->
                <div style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 5px; font-weight: bold;">
                    Kontrakt: <strong style="color: #fff;">${activeState.current_bid}</strong> (gra ${activeState.bid_winner})
                </div>

                <!-- WSKAŹNIK ATUTU (KOZERY) NA ŚRODKU STOŁU -->
                <div style="display: inline-block; font-size: 14px; background: rgba(255,255,255,0.1); padding: 6px 15px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 15px; font-weight: bold;">
                    Atut: <strong style="color: ${isTrumpRed ? '#ff4d4d' : '#fff'}">${currentTrumpDisplay}</strong>
                </div>

                <!-- Rzucone karty -->
                <div class="played-cards-table">
                    ${tableCards.length === 0 ? '<span style="color:rgba(255,255,255,0.4); font-style:italic;">Pusty stół (początek lewy)</span>' : playedCardsHtml}
                </div>
                <!-- Status lewy -->
                ${tableContentHtml}
            </div>
        `;
    }
    // --- FAZA F: PODSUMOWANIE RUNDY (Round End) ---
    else if (activeState.phase === 'round_end') {
        const bidWinner = activeState.bid_winner;
        const bidAmount = activeState.current_bid || 0; 

        let finalScores = {};
        let summaryHtml = '';

        currentPlayers.forEach(p => {
            const rawPoints = activeState.tricks_points[p] || 0;
            let finalPoints = customRound(rawPoints);

            // ZASADA 800 PKT: Sprawdzamy stan punktów PRZED tym rozdaniem
            const previousTotal = totals[p] || 0;
            const isBlockedBy800 = previousTotal >= 800 && p !== bidWinner;

            if (p === bidWinner) {
                // Jeśli ugrał mniej niż deklarował (porównujemy surowe punkty przed zaokrągleniem!)
                if (rawPoints < bidAmount) {
                    finalPoints = -bidAmount;
                } else {
                    finalPoints = bidAmount;
                }
            } else if (isBlockedBy800) {
                // Jeśli obrońca ma >= 800 punktów, nie może zdobyć punktów na cudzym rozdaniu
                if (finalPoints > 0) {
                    finalPoints = 0; 
                }
            }

            finalScores[p] = finalPoints;

            // Tworzymy jasną etykietę informującą o blokadzie 800 pkt
            const blockLabel = isBlockedBy800 && rawPoints > 0 ? ', blokada 800' : '';

            summaryHtml += `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <span><strong>${p}</strong> (ugrane: ${rawPoints}${blockLabel}):</span>
                    <span style="font-weight: bold; color: ${finalPoints >= 0 ? '#1e8e3e' : '#d93025'}">
                        ${finalPoints >= 0 ? '+' : ''}${finalPoints} pkt
                    </span>
                </div>
            `;
        });

        // SPRAWDZAMY CZY ZALOGOWANY GRACZ TO ZWYCIĘZCA LICYTACJI
        const isBidWinner = viewerName === bidWinner;

        tableArea.innerHTML = `
            <div class="board-status-message" style="width: 100%; max-width: 340px;">
                <h3 style="margin-top: 0; color: #1a472a;">Koniec Rozdania #${currentRoundsCount + 1}!</h3>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: left;">
                    ${summaryHtml}
                </div>
                <!-- Przycisk zapisu widzi tylko zwycięzca licytacji, rywal widzi komunikat oczekiwania -->
                ${isBidWinner ? `
                    <button class="btn-primary" onclick="submitRoundEndToDatabase()" style="width: 100%; height: 48px; font-size: 16px;">
                        💾 Zapisz i przejdź dalej
                    </button>
                ` : `
                    <p style="font-size: 13px; color: #666; font-style: italic; text-align: center; margin-top: 15px;">
                        Czekanie na zapis rozdania przez gracza <strong>${bidWinner}</strong>...
                    </p>
                `}
            </div>
        `;
    }

    // Rysowanie kart w Twojej ręce (Dół ekranu)
    const myHandSorted = sortHand(myHandRaw); 

    handContainer.innerHTML = '';
    myHandSorted.forEach(cardCode => {
        let isClickable = false;
        let onClickJs = '';

        if (activeState.phase === 'discarding' && isMyTurn) {
            isClickable = true;
            onClickJs = `toggleDiscardSelection('${cardCode}')`;
        } else if (activeState.phase === 'playing' && isMyTurn && !isTrickComplete) {
            isClickable = true;
            onClickJs = `playCard('${cardCode}')`;
        }

        const isSelected = selectedDiscards.includes(cardCode);
        const cardHTML = renderCardHTML(cardCode, isSelected, onClickJs);
        handContainer.innerHTML += cardHTML;
    });
}

/**
 * KLIKNIĘCIE W KARTĘ DO ODRZUCENIA (Zaznaczanie)
 */
function toggleDiscardSelection(cardCode) {
    const idx = selectedDiscards.indexOf(cardCode);
    if (idx > -1) {
        selectedDiscards.splice(idx, 1); 
    } else {
        if (selectedDiscards.length >= 2) {
            selectedDiscards.shift();
        }
        selectedDiscards.push(cardCode); 
    }
    renderGamePlay(); // <--- POPRAWKA: Bezpieczne wywołanie bez parametrów!
}

/**
 * WYSYŁANIE ODRZUCONYCH KART I ROZPOCZĘCIE ROZGRYWKI (Phase: 'playing')
 */
async function submitDiscards() {
    if (selectedDiscards.length !== 2) return;

    let myHand = activeState.hands[viewerName];
    
    // Walidacja wybranej z siatki ostatecznej deklaracji (wykorzystujemy globalne chosenFinalBid)
    const maxAllowedBid = calculateMaxAllowedBid(myHand); // Liczymy limit na 12 kartach z musikiem!

    if (chosenFinalBid < activeState.current_bid) {
        alert(`Nie możesz zadeklarować mniej niż stawka licytacji (${activeState.current_bid})!`);
        return;
    }
    if (chosenFinalBid > maxAllowedBid) {
        alert(`Niedozwolona deklaracja! Twój limit z meldunków w ręce to ${maxAllowedBid}.`);
        return;
    }

    const newHand = myHand.filter(c => !selectedDiscards.includes(c));

    const updatedState = {
        phase: 'playing',                      
        turn_player: activeState.bid_winner,   
        hands: {
            ...activeState.hands,
            [viewerName]: newHand              
        },
        discarded_cards: selectedDiscards,
        current_bid: chosenFinalBid 
    };

    selectedDiscards = [];
    chosenFinalBid = 100; // Resetujemy do domyślnej wartości dla kolejnej rundy

    await patchActiveState(updatedState);
}

/**
 * WYBÓR MUSIKA PRZEZ ZWYCIĘZCĘ LICYTACJI
 */
async function selectMusik(index) {
    const chosenMusik = activeState.musiks[index];
    const remainingMusik = activeState.musiks[1 - index]; 

    const updatedState = {
        phase: 'musik_reveal',
        discarded_cards: chosenMusik, 
        musiks: [remainingMusik] 
    };

    await patchActiveState(updatedState);
}

/**
 * DODANIE WYBRANEGO MUSIKA DO RĘKI I PRZEJŚCIE DO FAZY ODRZUCANIA
 */
async function addMusikToHand() {
    const revealedCards = activeState.discarded_cards || [];
    const myCurrentHand = activeState.hands[viewerName] || [];

    const newHand = [...myCurrentHand, ...revealedCards];

    const updatedState = {
        phase: 'discarding',
        hands: {
            ...activeState.hands,
            [viewerName]: newHand
        },
        discarded_cards: [] 
    };

    await patchActiveState(updatedState);
}

/**
 * WYSYŁANIE PODBICIA LICYTACJI
 */
async function submitCustomBid(bidValue) {
    const opponentName = currentPlayers.find(p => p !== viewerName);

    const updatedState = {
        current_bid: bidValue,
        bid_winner: viewerName,    
        turn_player: opponentName  
    };

    await patchActiveState(updatedState);
}

/**
 * RZUCENIE BOMBY PODCZAS LICYTACJI
 */
async function submitBiddingBomb() {
    if (!confirm("Czy na pewno chcesz rzucić BOMBĘ? Rozdanie zakończy się bez punktów, a Ty stracisz swoją jedyną bombę w tej grze.")) {
        return;
    }

    const opponentName = currentPlayers.find(p => p !== viewerName);

    const newRound = {
        game_id: parseInt(gameId),
        round_number: currentRoundsCount + 1,
        shuffler: activeState.dealer,
        bid_winner: null,
        bid_amount: null,
        scores: {
            [viewerName]: "BOMBA",
            [opponentName]: 0
        }
    };

    try {
        const responseRound = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_rounds`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newRound)
        });

        if (responseRound.ok) {
            await fetch(`${SUPABASE_URL}/rest/v1/tysiac_active_state?game_id=eq.${gameId}`, {
                method: "DELETE",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            });
            initGame();
        } else {
            alert("Błąd podczas rzucania bomby.");
        }
    } catch (err) {
        console.error("Błąd rzucania bomby:", err);
    }
}

/**
 * PASOWANIE LICYTACJI
 */
async function submitPass() {
    const updatedState = {
        phase: 'musik_choice',
        turn_player: activeState.bid_winner 
    };

    await patchActiveState(updatedState);
}

async function patchActiveState(data) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_active_state?game_id=eq.${gameId}`, {
            method: "PATCH",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            initGame(); 
        }
    } catch (err) {
        console.error("Błąd licytacji:", err);
    }
}

function calculateTotals(players, rounds) {
    totals = {};
    players.forEach(p => totals[p] = 0);

    rounds.forEach(round => {
        players.forEach(p => {
            const val = round.scores[p];
            if (val !== "BOMBA") {
                totals[p] += parseInt(val) || 0;
            }
        });
    });
}

/**
 * SORTOWANIE KART: alfabetycznie kolorami, a wewnątrz starszeństwem Tysiąca (As ma 0, 9 ma 5)
 */
function sortHand(hand) {
    const SUIT_ORDER = { 'H': 0, 'D': 1, 'C': 2, 'S': 3 };
    const VALUE_ORDER = { 'A': 0, '10': 1, 'K': 2, 'Q': 3, 'J': 4, '9': 5 };

    return [...hand].sort((a, b) => {
        const [valA, suitA] = a.split('_');
        const [valB, suitB] = b.split('_');
        
        if (suitA !== suitB) {
            return SUIT_ORDER[suitA] - SUIT_ORDER[suitB];
        }
        return VALUE_ORDER[valA] - VALUE_ORDER[valB];
    });
}

function renderCardHTML(cardCode, isSelected = false, onClickJs = '') {
    const [val, suit] = cardCode.split('_');
    const isRed = suit === 'H' || suit === 'D';
    const suitSymbol = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' }[suit];
    const colorClass = isRed ? 'card-red' : 'card-black';
    const valDisplay = val === '10' ? '10' : val;
    
    const selectedClass = isSelected ? 'selected-for-discard' : '';
    
    return `
        <div class="playing-card ${colorClass} ${selectedClass}" ${onClickJs ? `onclick="${onClickJs}"` : ''} data-card="${cardCode}">
            <div class="card-corner top-left">
                <span>${valDisplay}</span>
                <span>${suitSymbol}</span>
            </div>
            <div class="card-center">${suitSymbol}</div>
            <div class="card-corner bottom-right">
                <span>${valDisplay}</span>
                <span>${suitSymbol}</span>
            </div>
        </div>
    `;
}

function setupRealtimeListener() {
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    supabaseClient
        .channel("tysiac-live-game-channel")
        .on("postgres_changes", { event: "*", schema: "public", table: "tysiac_rounds", filter: `game_id=eq.${gameId}` }, () => initGame())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tysiac_games", filter: `id=eq.${gameId}` }, () => initGame())
        .on("postgres_changes", { event: "*", schema: "public", table: "tysiac_active_state", filter: `game_id=eq.${gameId}` }, () => initGame())
        .subscribe();
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        initGame();
    }
});

// --- NOWE FUNKCJE POMOCNICZE SILNIKA GRY ---

/**
 * Obsługuje rzucenie karty na stół z automatycznym zgłaszaniem meldunku (kozery)
 */
async function playCard(cardCode) {
    if (activeState.phase !== 'playing') return;
    if (viewerName !== activeState.turn_player) return;

    const myHand = activeState.hands[viewerName] || [];
    const tableCards = activeState.table_cards || [];

    // 1. Walidacja Tysiąca (dokładanie do koloru/kozera)
    const isPlayable = isCardPlayable(cardCode, myHand, tableCards, activeState.trump_suit);
    if (!isPlayable) {
        alert("Niedozwolony ruch!");
        return;
    }

    // 2. Usuwamy kartę z ręki gracza
    const newHand = myHand.filter(c => c !== cardCode);

    // 3. Dodajemy kartę na stół
    const newTableCards = [...tableCards, { player: viewerName, card: cardCode }];
    const isTrickComplete = newTableCards.length === 2;
    const opponentName = currentPlayers.find(p => p !== viewerName);

    // --- AUTOMATYCZNE WYKRYWANIE MELDUNKU (MARRIAGE) ---
    let newTrumpSuit = activeState.trump_suit;
    let currentTricksPoints = activeState.tricks_points || {};
    if (!currentTricksPoints[viewerName]) currentTricksPoints[viewerName] = 0;

    // Meldujemy tylko wtedy, gdy wychodzimy jako pierwsi do lewy!
    if (tableCards.length === 0) {
        const [val, suit] = cardCode.split('_');
        
        // Sprawdzamy czy rzucono Króla (K) lub Damę (Q)
        if (val === 'K' || val === 'Q') {
            const partnerVal = val === 'K' ? 'Q' : 'K';
            const partnerCard = `${partnerVal}_${suit}`;

            // Jeśli drugi element pary jest nadal w naszej ręce (nowej ręce bez rzuconej karty)
            if (newHand.includes(partnerCard)) {
                const MELD_VALUES = { 'H': 100, 'D': 80, 'C': 60, 'S': 40 };
                const meldPoints = MELD_VALUES[suit] || 0;
                
                newTrumpSuit = suit; // Nowy kozioł zostaje ustalony!
                currentTricksPoints[viewerName] += meldPoints; // Punkty dopisujemy od razu na żywo!
                
                console.log(`Zgłoszono meldunek w kolorze ${suit}! Dodano +${meldPoints} pkt.`);
            }
        }
    }

    const updatedState = {
        table_cards: newTableCards,
        turn_player: isTrickComplete ? "" : opponentName,
        hands: {
            ...activeState.hands,
            [viewerName]: newHand
        },
        trump_suit: newTrumpSuit,
        tricks_points: currentTricksPoints
    };

    await patchActiveState(updatedState);
}

/**
 * Walidacja dorzucania kart w Tysiącu (z uwzględnieniem obowiązku przebijania!):
 * 1. Absolutny obowiązek dorzucenia do koloru.
 *    - Jeśli masz silniejszą kartę w tym kolorze -> MUSISZ przebić.
 *    - Jeśli nie masz silniejszej, ale masz kolor -> dorzucasz dowolną z tego koloru.
 * 2. Jeśli brak koloru -> obowiązek dorzucenia kozery (atutu).
 * 3. Jeśli brak koloru i brak kozery -> wolny ruch (rzucasz cokolwiek).
 */
function isCardPlayable(cardCode, hand, tableCards, trumpSuit) {
    if (tableCards.length === 0) return true; // Pierwszy gracz rzuca cokolwiek

    const firstCard = tableCards[0].card;
    const firstSuit = firstCard.split('_')[1];
    const firstVal = firstCard.split('_')[0];
    const [myVal, mySuit] = cardCode.split('_');

    const STRENGTH = { 'A': 5, '10': 4, 'K': 3, 'Q': 2, 'J': 1, '9': 0 };

    const mySuitCards = hand.filter(c => c.split('_')[1] === firstSuit);
    
    if (mySuitCards.length > 0) {
        // Obowiązek dorzucenia do koloru! (Jeśli rzucasz inny kolor -> błąd)
        if (mySuit !== firstSuit) return false;

        // Obowiązek PRZEBIJANIA wewnątrz koloru:
        // Sprawdzamy, czy mamy na ręce jakąkolwiek kartę w tym kolorze, która jest silniejsza od leżącej na stole
        const canBeatInSuit = mySuitCards.some(c => STRENGTH[c.split('_')[0]] > STRENGTH[firstVal]);
        
        if (canBeatInSuit) {
            // Jeśli możemy przebić, to rzucana karta MUSI być silniejsza od leżącej na stole
            return STRENGTH[myVal] > STRENGTH[firstVal];
        }
        
        return true; // Brak silniejszej karty w kolorze -> wolny ruch w obrębie tego koloru
    }

    // 2. Brak koloru pierwszej karty -> sprawdzamy obowiązek KOZERA
    if (trumpSuit) {
        const myTrumpCards = hand.filter(c => c.split('_')[1] === trumpSuit);
        
        if (myTrumpCards.length > 0) {
            // Mamy kozera, więc musimy go dorzucić!
            return mySuit === trumpSuit;
        }
    }

    return true; // Brak koloru i kozery -> wolny ruch (rzucamy cokolwiek)
}

/**
 * Oblicza kto wygrał lewę i ile punktów jest warta
 */
function evaluateTrick(tableCards, trumpSuit) {
    const card1 = tableCards[0];
    const card2 = tableCards[1];
    
    const [val1, suit1] = card1.card.split('_');
    const [val2, suit2] = card2.card.split('_');

    const STRENGTH = { 'A': 5, '10': 4, 'K': 3, 'Q': 2, 'J': 1, '9': 0 };
    const VALUES = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0 };

    let winner = card1.player; // Domyślnie wygrywa pierwszy rzucający

    if (trumpSuit) {
        if (suit2 === trumpSuit && suit1 !== trumpSuit) {
            winner = card2.player; // Przebicie kozerem
        } else if (suit1 === trumpSuit && suit2 === trumpSuit) {
            if (STRENGTH[val2] > STRENGTH[val1]) winner = card2.player; // Obaj rzucili kozera - wygrywa silniejszy
        } else if (suit1 !== trumpSuit && suit2 !== trumpSuit) {
            if (suit2 === suit1 && STRENGTH[val2] > STRENGTH[val1]) winner = card2.player; // Normalna walka w kolorze
        }
    } else {
        if (suit2 === suit1 && STRENGTH[val2] > STRENGTH[val1]) {
            winner = card2.player; // Walka bez kozera
        }
    }

    const pts = VALUES[val1] + VALUES[val2];
    return { winner, pts };
}

/**
 * Zwycięzca lewy zabiera karty, dopisuje sobie punkty i zaczyna kolejną turę
 */
async function collectTrick() {
    const tableCards = activeState.table_cards || [];
    if (tableCards.length !== 2) return;

    const trickResult = evaluateTrick(tableCards, activeState.trump_suit);
    const winner = trickResult.winner;

    // Pobieramy aktualne punkty z lew i dodajemy nowe
    let currentTricksPoints = activeState.tricks_points || {};
    if (!currentTricksPoints[winner]) currentTricksPoints[winner] = 0;

    // Sprawdzamy czy to była ostatnia lewa (gracze nie mają już kart w rękach)
    const opponentName = currentPlayers.find(p => p !== winner);
    const myHandCount = (activeState.hands[winner] || []).length;
    const oppHandCount = (activeState.hands[opponentName] || []).length;

    const isRoundOver = myHandCount === 0 && oppHandCount === 0;

    // ZASADA OSTATNIEJ LEWY: Zgarnianie punktów z 4 odrzuconych kart
    let extraPoints = 0;
    if (isRoundOver) {
        const discarded = activeState.discarded_cards || []; // 2 odrzucone karty licytanta
        const unchosenMusik = (activeState.musiks && activeState.musiks[0]) ? activeState.musiks[0] : []; // 2 karty z zamkniętego musika
        const allExtraCards = [...discarded, ...unchosenMusik];
        
        const VALUES = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0 };
        allExtraCards.forEach(c => {
            const val = c.split('_')[0];
            extraPoints += (VALUES[val] || 0);
        });
        
        console.log(`Ostatnia lewa! Dodano +${extraPoints} pkt z musika i odrzutów dla ${winner}`);
    }

    // Dodajemy punkty z lewy oraz punkty ekstra z ostatniego rozdania
    currentTricksPoints[winner] += trickResult.pts + extraPoints;

    const updatedState = {
        table_cards: [],                       // Czyścimy stół
        turn_player: winner,                   // Zwycięzca zaczyna kolejną lewę
        tricks_points: currentTricksPoints,    // Zapisujemy punkty
        phase: isRoundOver ? 'round_end' : 'playing' // Przechodzimy do podsumowania na koniec
    };

    await patchActiveState(updatedState);
}

window.submitRoundEndToDatabase = submitRoundEndToDatabase; // Wystawienie do onclick

/**
 * Zapisuje oficjalnie zakończone rozdanie do tabeli szczegółów i czyści wirtualną planszę
 */
async function submitRoundEndToDatabase() {
    // ZABEZPIECZENIE: Tylko zwycięzca licytacji może wysłać ten formularz do bazy
    if (viewerName !== activeState.bid_winner) {
        alert("Tylko zwycięzca licytacji może zapisać to rozdanie!");
        return;
    }

    const bidWinner = activeState.bid_winner;
    const bidAmount = activeState.current_bid || 0; 
    
    let finalScores = {};
    currentPlayers.forEach(p => {
        const rawPoints = activeState.tricks_points[p] || 0;
        let finalPoints = customRound(rawPoints);

        const previousTotal = totals[p] || 0;
        const isBlockedBy800 = previousTotal >= 800 && p !== bidWinner;

        if (p === bidWinner) {
            if (rawPoints < bidAmount) {
                finalPoints = -bidAmount;
            } else {
                finalPoints = bidAmount;
            }
        } else if (isBlockedBy800) {
            if (finalPoints > 0) {
                finalPoints = 0; // Blokada 800
            }
        }
        finalScores[p] = finalPoints;
    });

    const newRound = {
        game_id: parseInt(gameId),
        round_number: currentRoundsCount + 1,
        shuffler: activeState.dealer,
        bid_winner: bidWinner || null,
        bid_amount: bidWinner ? bidAmount : null,
        scores: finalScores
    };

    try {
        const responseRound = await fetch(`${SUPABASE_URL}/rest/v1/tysiac_rounds`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newRound)
        });

        if (responseRound.ok) {
            // Czyścimy planszę (usuwamy aktywny stan z tysiac_active_state)
            await fetch(`${SUPABASE_URL}/rest/v1/tysiac_active_state?game_id=eq.${gameId}`, {
                method: "DELETE",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            });
            
            initGame(); // Odświeżamy u siebie
        } else {
            alert("Błąd zapisu rundy do bazy.");
        }
    } catch (err) {
        console.error("Błąd zapisu końca rundy:", err);
    }
}

function calculateMaxAllowedBid(hand) {
    let maxBid = 120;
    if (hand.includes('K_H') && hand.includes('Q_H')) maxBid += 100;
    if (hand.includes('K_D') && hand.includes('Q_D')) maxBid += 80;
    if (hand.includes('K_C') && hand.includes('Q_C')) maxBid += 60;
    if (hand.includes('K_S') && hand.includes('Q_S')) maxBid += 40;
    return maxBid;
}

function customRound(val) {
    const absVal = Math.abs(val);
    const remainder = absVal % 10;
    let roundedAbs;

    if (remainder >= 6) {
        roundedAbs = absVal + (10 - remainder);
    } else {
        roundedAbs = absVal - remainder;
    }

    return val >= 0 ? roundedAbs : -roundedAbs;
}

window.selectFinalBid = selectFinalBid; // Wystawienie do kliknięcia na siatce

/**
 * Zapisuje lokalny wybór ostatecznego kontraktu z siatki i odświeża widok
 */
function selectFinalBid(val) {
    chosenFinalBid = val;
    renderGamePlay(); // Re-render, aby podświetlić wybrany przycisk na złoto
}

window.logoutProfile = logoutProfile; // Wystawienie do onclick

/**
 * Czyści zapamiętany profil gracza na tym urządzeniu i przeładowuje grę
 */
function logoutProfile() {
    if (confirm("Czy na pewno chcesz wylogować się z tego profilu i wybrać innego gracza na tym urządzeniu?")) {
        localStorage.removeItem(`tysiac-profile-${gameId}`);
        viewerName = null;
        location.reload(); // Przeładowanie strony zresetuje wszystkie zmienne i pokaże okno wyboru
    }
}