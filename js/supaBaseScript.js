/**
 * @typedef {{
 * Dawid_wt: number,
 * Dawid_awards: number,
 * Dawid_titles: number,
 * Dawid_board_score: number,
 * Dawid_cards_score: number,
 * Kasia_wt: number,
 * Kasia_awards: number,
 * Kasia_titles: number,
 * Kasia_board_score: number,
 * Kasia_cards_score: number,
 * Dawid_total_score: number,
 * Kasia_total_score: number,
 * winner_name: string,
 * image_url: string,
 * comment: string,
 * date: string }} GameData
 */

const SUPABASE_URL = "https://hcefiifazgrlxwvevfmc.supabase.co";
const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZWZpaWZhemdybHh3dmV2Zm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODkyMDAsImV4cCI6MjA4NDM2NTIwMH0.A9V8NRjhvy7CjpdsLTT3KliNq_P5cIOCPTr1gIedD6k";

async function getGameResults() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/game_results?order=id.desc`,
            {
                method: "GET",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        if (!response.ok) throw new Error(`Błąd: ${response.statusText}`);

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Błąd pobierania danych:", error);
    }
}

async function addGameResult(gameData) {
    try {
        console.log("Saving game data:", gameData);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/game_results`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
            },
            body: JSON.stringify(gameData),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        const data = await response.json();
        return data[0].id;
    } catch (error) {
        console.error("Error saving data:", error);
    }
}

async function addBoardImage(fileInput) {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const uploadResponse = await fetch(
                `${SUPABASE_URL}/storage/v1/object/board_img/${filePath}`,
                {
                    method: "POST",
                    headers: {
                        apikey: SUPABASE_KEY,
                        Authorization: `Bearer ${SUPABASE_KEY}`,
                        "Content-Type": file.type,
                    },
                    body: file,
                },
            );
            if (uploadResponse.ok) {
                uploadedImageUrl = `${SUPABASE_URL}/storage/v1/object/public/board_img/${filePath}`;
                return uploadedImageUrl;
            } else {
                console.error("Błąd wgrywania zdjęcia");
            }
        } catch (err) {
            console.error("Storage Error:", err);
        }
    }
}

async function deleteGameRecord(gameId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/game_results?id=eq.${gameId}`,
            {
                method: "DELETE",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Błąd usuwania: ${errorBody.message}`);
        }

        return true;
    } catch (error) {
        console.error("Błąd podczas usuwania:", error);
        alert("Nie udało się usunąć rekordu.");
        return false;
    }
}

async function updateGameRecord(id, updatedData) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/game_results?id=eq.${id}`,
        {
            method: "PATCH",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedData),
        },
    );
    return response.ok;
}

async function fetchRemikGames() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/remik_games?order=created_at.desc`,
            {
                method: "GET",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        if (!response.ok) throw new Error("Błąd pobierania list gier");
        const games = await response.json();

        return games;
    } catch (error) {
        console.error("Błąd:", error);
    }
}

async function updateGameStatus(newStatus) {
    const confirmMsg =
        newStatus === "finished"
            ? "Czy na pewno chcesz zakończyć grę i ustalić zwycięzcę?"
            : "Czy chcesz wznowić tę grę?";

    if (!confirm(confirmMsg)) return;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/remik_games?id=eq.${gameId}`,
            {
                method: "PATCH",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: newStatus }),
            },
        );

        if (response.ok) {
            initDetails();
        }
    } catch (err) {
        console.error("Błąd zmiany statusu:", err);
    }
}

async function getGameHeader(id) {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/remik_games?id=eq.${id}`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        },
    );
    const data = await resp.json();
    return data[0];
}

async function getGameRounds(id) {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/remik_rounds?game_id=eq.${id}&order=round_number.asc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        },
    );
    return await resp.json();
}

async function saveCurrentRound(newRound) {
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

async function winnerChange(winnerToSave, newStatus, gameId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/remik_games?id=eq.${gameId}`,
            {
                method: "PATCH",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: newStatus,
                    winner: winnerToSave,
                }),
            },
        );
        return response;
    } catch (err) {
        console.error("Błąd zmiany statusu:", err);
    }
}

async function delateOneRound(roundId, password) {
    const gameId = await getGameIdFromRound(roundId);
    const realPasswordHash = await getGamePassword(gameId);
    const inputHash = await sha256(password);
    if (inputHash != realPasswordHash) {
        alert("Niepoprawne hasło!");
        return;
    }
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/remik_rounds?id=eq.${roundId}`,
            {
                method: "DELETE",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (err) {
        console.error("Błąd sieci:", err);
    }
}

async function addNewRemikGame(newGameData) {
    const passwordPlain = newGameData.passwordHash;
    newGameData.passwordHash = await sha256(passwordPlain);

    let newGameId = null;

    try {
        const responseGame = await fetch(
            `${SUPABASE_URL}/rest/v1/remik_games`,
            {
                method: "POST",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                    Prefer: "return=representation",
                },
                body: JSON.stringify(newGameData),
            },
        );

        if (!responseGame.ok) {
            alert("Błąd podczas tworzenia gry.");
            return;
        }

        const gameDataResponse = await responseGame.json();
        newGameId = gameDataResponse[0].id;

        const plainTextData = {
            game_id: newGameId,
            password_plain: passwordPlain,
        };

        const responsePlainText = await fetch(
            `${SUPABASE_URL}/rest/v1/plain_passwords`,
            {
                method: "POST",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(plainTextData),
            },
        );

        if (!responsePlainText.ok) {
            console.error(
                "Udało się stworzyć grę, ale nie udało się zapisać czystego hasła.",
            );
        }

        window.location.href = `remik_detale.html?id=${newGameId}`;
    } catch (err) {
        console.error("Błąd krytyczny połączenia:", err);
        alert("Wystąpił błąd krytyczny przy tworzeniu gry.");
    }
}

async function deleteRemikGame(id, password) {
    const realPasswordHash = await getGamePassword(id);
    const inputHash = await sha256(password);
    if (inputHash != realPasswordHash) {
        alert("Niepoprawne hasło!");
        return;
    }
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/remik_games?id=eq.${id}`,
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
        } else {
            const err = await response.json();
            console.error("Błąd usuwania:", err);
            alert("Błąd podczas usuwania gry z bazy.");
        }
    } catch (error) {
        console.error("Błąd sieci:", error);
        alert("Błąd połączenia z serwerem.");
    }
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hashHex;
}

async function getGamePassword(id) {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/remik_games?id=eq.${id}&select=passwordHash`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        },
    );
    const data = await resp.json();
    return data[0].passwordHash;
}

async function getGameIdFromRound(id) {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/remik_rounds?id=eq.${id}&select=game_id`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        },
    );
    const data = await resp.json();
    return data[0].game_id;
}

async function getPlayersList() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/Players?select=Name&order=Name.asc`,
            {
                method: "GET",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        if (!response.ok) throw new Error(`Błąd: ${response.statusText}`);

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Błąd pobierania danych:", error);
    }
}

async function addNewPlayer(name) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/Players`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ Name: name }),
        });

        if (response.ok) {
            alert(`Gracz "${name}" został pomyślnie dodany!`);
        } else {
            const err = await response.json();
            alert(
                "Błąd zapisu: " +
                    (err.message || "prawdopodobnie gracz już istnieje"),
            );
        }
    } catch (error) {
        console.error("Błąd zapisu gracza:", error);
    }
}
async function getPlayerStats(playerName) {
    try {
        const responseGames = await fetch(
            `${SUPABASE_URL}/rest/v1/remik_games?players=cs.{"${playerName}"}`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            },
        );
        const games = await responseGames.json();
        return games;
    } catch (err) {
        console.error("Błąd ładowania statystyk:", err);
    }
}

async function loginUser(username, pin) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/users?username=eq.${username}&pin=eq.${pin}`,
            {
                method: "GET",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Błąd serwera: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const user = data[0];
            showAlert('Zalogowano pomyślnie! Przekierowanie...', 'success');
            
            localStorage.setItem('wc_user_id', user.id);
            localStorage.setItem('wc_username', user.username);
            
            setTimeout(() => {
                window.location.href = './world-cup.html';
            }, 1200);
            return user;
        } else {
            showAlert('Błędny login lub PIN. Spróbuj ponownie.', 'error');
            return null;
        }
    } catch (err) {
        console.error("Błąd logowania:", err);
        showAlert('Wystąpił błąd podczas logowania: ' + err.message, 'error');
    }
}
async function registerUser(username, pin) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/users`,
            {
                method: "POST",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                    Prefer: "return=representation", 
                },
                body: JSON.stringify({ username: username, pin: pin }),
            }
        );

        if (!response.ok) {
            const err = await response.json();
            if (err.code === '23505') { 
                showAlert('Ta nazwa użytkownika jest już zajęta.', 'error');
                return null;
            } else {
                throw new Error(err.message || 'Błąd zapisu w bazie');
            }
        }

        const data = await response.json();
        showAlert('Konto zostało utworzone! Możesz się teraz zalogować.', 'success');
        return data[0];
    } catch (err) {
        console.error("Błąd rejestracji:", err);
        showAlert('Wystąpił błąd podczas rejestracji: ' + err.message, 'error');
    }
}

async function loadUserData() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${currentUserId}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const users = await response.json();
      if (users.length > 0) {
        document.getElementById('user-points').textContent = `Punkty: ${users[0].points || 0}`;
      }
    }
  } catch (err) { console.error(err); }
}

async function loadUserPredictions() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/group_predictions?user_id=eq.${currentUserId}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const predictions = await response.json();
      if (predictions.length > 0) {
        const tempGroups = {};
        predictions.forEach(pred => {
          if (!tempGroups[pred.group_letter]) tempGroups[pred.group_letter] = [];
          tempGroups[pred.group_letter].push({ name: pred.team_name, rank: pred.predicted_rank, isBestThird: pred.is_best_third });
        });
        Object.keys(tempGroups).forEach(letter => {
          tempGroups[letter].sort((a, b) => a.rank - b.rank);
          localGroups[letter] = tempGroups[letter].map(t => t.name);
          tempGroups[letter].forEach(t => {
            if (t.isBestThird) selectedThirds.add(t.name);
          });
        });
      }
    }
  } catch (err) { console.error(err); }
}

async function loadKnockoutPredictions() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/knockout_predictions?user_id=eq.${currentUserId}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const preds = await response.json();
      preds.forEach(p => {
        if (!bracketMatches[p.match_id]) bracketMatches[p.match_id] = { home: "", away: "", winner: "" };
        bracketMatches[p.match_id].winner = p.predicted_winner;
      });
    }
  } catch (err) { console.error(err); }
}

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=username,points&order=points.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const players = await response.json();
      tbody.innerHTML = players.map((player, index) => `
        <tr class="hover:bg-slate-800/30 transition">
          <td class="py-3 px-4 text-center font-bold text-slate-400">${index + 1}</td>
          <td class="py-3 px-4 font-semibold text-white">${player.username}</td>
          <td class="py-3 px-4 text-right font-bold text-emerald-400">${player.points || 0} pkt</td>
        </tr>
      `).join('');
    }
  } catch (err) { console.error(err); }
}

async function loadPlayerPredictions() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/player_predictions?user_id=eq.${currentUserId}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        localPlayers.top_scorer = data[0].top_scorer || "";
        localPlayers.mvp = data[0].mvp || "";
        localPlayers.best_goalkeeper = data[0].best_goalkeeper || "";

        document.getElementById('input-scorer').value = localPlayers.top_scorer;
        document.getElementById('input-mvp').value = localPlayers.mvp;
        document.getElementById('input-goalkeeper').value = localPlayers.best_goalkeeper;
      }
    }
  } catch (err) { console.error(err); }
}

async function saveAllPredictions() {
  const btn = document.getElementById('btn-save');
  
  
  if (selectedThirds.size !== 8) {
    alert("Aby zapisać typy, musisz najpierw wybrać dokładnie 8 drużyn z trzecich miejsc w fazie grupowej!");
    return;
  }

  if (!localPlayers.top_scorer || !localPlayers.mvp || !localPlayers.best_goalkeeper) {
    alert("Aby zapisać typy, musisz uzupełnić wszystkie nagrody indywidualne (Król strzelców, MVP, Najlepszy bramkarz)!");
    return;
  }

  let missingMatch = null;
  for (let id = 73; id <= 104; id++) {
    const winner = bracketMatches[id] ? bracketMatches[id].winner : "";
    if (!winner || winner === "???") {
      missingMatch = id;
      break;
    }
  }

  if (missingMatch) {
    alert("Nie możesz zapisać danych. Drabinka pucharowa nie jest kompletna. Wybierz zwycięzców wszystkich meczów (brak wyboru m.in. w Meczu " + missingMatch + ").");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Zapisywanie...";

  try {
    const groupPayload = [];
    Object.keys(localGroups).forEach(letter => {
      localGroups[letter].forEach((team, idx) => {
        const rank = idx + 1;
        const isBestThird = (rank === 3 && selectedThirds.has(team));
        groupPayload.push({
          user_id: parseInt(currentUserId),
          group_letter: letter,
          team_name: team,
          predicted_rank: rank,
          is_best_third: isBestThird
        });
      });
    });

    const delGroups = await fetch(`${SUPABASE_URL}/rest/v1/group_predictions?user_id=eq.${currentUserId}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!delGroups.ok) throw new Error("Nie udało się zresetować poprzednich typów grupowych.");

    const insGroups = await fetch(`${SUPABASE_URL}/rest/v1/group_predictions`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(groupPayload)
    });
    if (!insGroups.ok) throw new Error("Błąd podczas zapisywania fazy grupowej.");

    const playerPayload = {
      user_id: parseInt(currentUserId),
      top_scorer: localPlayers.top_scorer,
      mvp: localPlayers.mvp,
      best_goalkeeper: localPlayers.best_goalkeeper
    };

    const delPlayers = await fetch(`${SUPABASE_URL}/rest/v1/player_predictions?user_id=eq.${currentUserId}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!delPlayers.ok) throw new Error("Nie udało się zresetować poprzednich typów zawodników.");

    const insPlayers = await fetch(`${SUPABASE_URL}/rest/v1/player_predictions`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(playerPayload)
    });
    if (!insPlayers.ok) throw new Error("Błąd podczas zapisywania nagród indywidualnych.");

    const knockoutPayload = [];
    Object.keys(bracketMatches).forEach(matchId => {
      const winner = bracketMatches[matchId].winner;
      if (winner && winner !== "???") {
        knockoutPayload.push({
          user_id: parseInt(currentUserId),
          match_id: parseInt(matchId),
          predicted_winner: winner
        });
      }
    });

    const delKnockout = await fetch(`${SUPABASE_URL}/rest/v1/knockout_predictions?user_id=eq.${currentUserId}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!delKnockout.ok) throw new Error("Nie udało się zresetować poprzedniej drabinki.");

    const insKnockout = await fetch(`${SUPABASE_URL}/rest/v1/knockout_predictions`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(knockoutPayload)
    });
    if (!insKnockout.ok) throw new Error("Błąd podczas zapisywania drabinki pucharowej.");

    saveSnapshotAsLoaded();
    updateSaveButtonState();

    alert("Twoje typy zostały pomyślnie zapisane!");
  } catch (err) {
    console.error(err);
    alert("Wystąpił błąd podczas zapisu: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Zapisz moje typy";
  }
}


