const urlParams = new URLSearchParams(window.location.search);
const playerName = urlParams.get("name");

if (!playerName) {
    alert("Nie wybrano gracza!");
    window.location.href = "tysiac.html";
}

document.addEventListener("DOMContentLoaded", initPlayerStats);

async function initPlayerStats() {
    document.getElementById("player-name-title").innerText =
        `👤 Profil: ${playerName}`;

    try {
        const responseGames = await fetch(
            `${SUPABASE_URL}/rest/v1/tysiac_games?players=cs.{"${playerName}"}`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            },
        );
        const games = await responseGames.json();

        if (games.length === 0) {
            document.getElementById("stats-grid").innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; background: white; color: #333; padding: 40px; border-radius: 12px;">
                    <h3>Brak danych</h3>
                    <p>Ten gracz nie rozegrał jeszcze żadnej gry w Tysiąca.</p>
                </div>`;
            return;
        }

        const gameIds = games.map((g) => g.id);

        const responseRounds = await fetch(
            `${SUPABASE_URL}/rest/v1/tysiac_rounds?game_id=in.(${gameIds.join(",")})`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            },
        );
        const rounds = await responseRounds.json();

        calculateStats(games, rounds);
    } catch (err) {
        console.error("Błąd ładowania statystyk:", err);
    }
}

function calculateStats(games, rounds) {
    const gamesPlayed = games.length;
    const gamesWon = games.filter((g) => g.winner === playerName).length;
    const gamesLost = gamesPlayed - gamesWon;
    const gamesWinRate =
        gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : "0.0";

    let roundsPlayed = 0;
    let bombsUsed = 0;
    let pointsEarned = 0;
    let pointsLost = 0;

    let bidsTotal = 0;
    let bidsSuccess = 0;
    let bidsFail = 0;

    rounds.forEach((round) => {
        const scoreVal = round.scores[playerName];

        if (scoreVal !== undefined) {
            roundsPlayed++;

            if (scoreVal === "BOMBA") {
                bombsUsed++;
            } else {
                const numScore = parseInt(scoreVal) || 0;

                if (numScore >= 0) {
                    pointsEarned += numScore;
                } else {
                    pointsLost += Math.abs(numScore);
                }

                if (round.bid_winner === playerName) {
                    bidsTotal++;
                    if (numScore >= 0) {
                        bidsSuccess++;
                    } else {
                        bidsFail++;
                    }
                }
            }
        }
    });

    const bidsWinRate =
        bidsTotal > 0 ? ((bidsSuccess / bidsTotal) * 100).toFixed(1) : "0.0";
    const netPoints = pointsEarned - pointsLost;
    const avgPointsPerGame =
        gamesPlayed > 0 ? (netPoints / gamesPlayed).toFixed(1) : "0.0";

    document.getElementById("games-played").innerText = gamesPlayed;
    document.getElementById("games-won").innerText = gamesWon;
    document.getElementById("games-lost").innerText = gamesLost;
    document.getElementById("games-winrate").innerText = `${gamesWinRate}%`;

    document.getElementById("bids-total").innerText = bidsTotal;
    document.getElementById("bids-success").innerText = bidsSuccess;
    document.getElementById("bids-fail").innerText = bidsFail;
    document.getElementById("bids-winrate").innerText = `${bidsWinRate}%`;

    document.getElementById("rounds-played").innerText = roundsPlayed;
    document.getElementById("bombs-used").innerText = bombsUsed;
    document.getElementById("avg-points-game").innerText = avgPointsPerGame;

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
