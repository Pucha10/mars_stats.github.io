const urlParams = new URLSearchParams(window.location.search);
const playerName = urlParams.get("name");

if (!playerName) {
    alert("Nie wybrano gracza!");
    window.location.href = "remik.html";
}

document.addEventListener("DOMContentLoaded", initPlayerStats);

async function initPlayerStats() {
    document.getElementById("player-name-title").innerText =
        `👤 Profil: ${playerName}`;
    const games = await getPlayerStats(playerName);
    if (games.length === 0) {
        document.getElementById("stats-grid").innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; background: white; color: #333; padding: 40px; border-radius: 12px;">
                    <h3>Brak danych</h3>
                    <p>Ten gracz nie rozegrał jeszcze żadnej gry w Remika.</p>
                </div>`;
        return;
    }
    const gameIds = games.map((g) => g.id);
    const responseRounds = await fetch(
        `${SUPABASE_URL}/rest/v1/remik_rounds?game_id=in.(${gameIds.join(",")})`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        },
    );
    const rounds = await responseRounds.json();
    calculateStats(games, rounds);
}

function calculateStats(games, rounds) {
    const gamesPlayed = games.length;
    const gamesWon = games.filter((g) => g.winner === playerName).length;
    const gamesWinRate =
        gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : "0.0";

    let roundsPlayed = 0;
    let roundsWon = 0;
    let pointsEarned = 0;
    let pointsLost = 0;

    rounds.forEach((round) => {
        if (round.cards[playerName] !== undefined) {
            roundsPlayed++;
            const cardsValue = round.cards[playerName];

            if (cardsValue === 0) {
                roundsWon++;
                let roundSum = 0;
                for (let otherPlayer in round.cards) {
                    if (otherPlayer !== playerName) {
                        roundSum += round.cards[otherPlayer] || 0;
                    }
                }
                pointsEarned += roundSum;
            } else {
                pointsLost += cardsValue;
            }
        }
    });

    const roundsWinRate =
        roundsPlayed > 0
            ? ((roundsWon / roundsPlayed) * 100).toFixed(1)
            : "0.0";
    const netPoints = pointsEarned - pointsLost;

    document.getElementById("games-played").innerText = gamesPlayed;
    document.getElementById("games-won").innerText = gamesWon;
    document.getElementById("games-winrate").innerText = `${gamesWinRate}%`;

    document.getElementById("rounds-played").innerText = roundsPlayed;
    document.getElementById("rounds-won").innerText = roundsWon;
    document.getElementById("rounds-winrate").innerText = `${roundsWinRate}%`;

    document.getElementById("points-earned").innerText = `+${pointsEarned}`;
    document.getElementById("points-lost").innerText = `-${pointsLost}`;

    const netPointsElem = document.getElementById("points-net");
    const netPointsBg = document.getElementById("net-points-bg");

    if (netPoints > 0) {
        netPointsElem.innerText = `+${netPoints}`;
        netPointsBg.style.backgroundColor = "#e6f4ea";
        netPointsElem.style.color = "#1e8e3e";
    } else if (netPoints < 0) {
        netPointsElem.innerText = `${netPoints}`;
        netPointsBg.style.backgroundColor = "#fce8e6";
        netPointsElem.style.color = "#d93025";
    } else {
        netPointsElem.innerText = `${netPoints}`;
    }
}
