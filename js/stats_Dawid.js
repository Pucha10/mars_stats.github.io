const corporations = ["PRISTAR", "LAKEFRONT RESORTS", "TERRALABS RESEARCH", "UTOPIA INVEST", "SEPTEM TRIBUS", "CELESTIC", "APHRODITE", "KUIPER COOPERATIVE", "REPUBLIKA THARSIS", "HELION", "FACTORUM", "PHOBLOG", "UNITED NATIONS MARS INITIATIVE", "ROBINSON INDUSTRIES", "ASTRODRILL", "PHARMACY UNION", "MANUTECH", "RECYCLON", "SPLICE GENOMIKA TAKTYCZNA", "VIRON", "MOARNING STAR INC", "ARIDOR", "ARKLIGHT", "POLYPHEMOS", "TYCHO MAGNETICS", "POSEIDON", "STORMCRAFT INCORPORATED", "WSPÓLNOTA ARKADYJSKA", "INVENTRIX", "MINING GUILD", "PHILARES", "VALLEY TRUST", "CREDICOR", "MONS INSURANCE", "SATURN SYSTEMS", "ECOLINE", "TERACTOR", "INTERPLANETARY CINEMATICS", "POINT LUNA", "CHEUNG SHING MARS", "THORGATE", "VITOR"];
initStatsPage();
async function initStatsPage() {
    games = await getGameResults();
    const corporationsStats = getCorporationStats(games, corporations);
     const CorpostatsArray = Object.keys(corporationsStats).map(name => {
        const item = corporationsStats[name];
        const winRate = item.Games > 0 ? ((item.Wins / item.Games) * 100).toFixed(1) : 0;
        return { name, ...item, winRate: parseFloat(winRate) };
    });
    CorpostatsArray.sort((a, b) => b.winRate - a.winRate || b.Games - a.Games);

    renderCorpoStatsTable(CorpostatsArray);
    getPointsStats(games);

}
function getCorporationStats(games, corporationsList) {
    const stats = {};
    if (corporationsList && Array.isArray(corporationsList)) {
        corporationsList.forEach(corp => {
            stats[corp] = { Games: 0, Wins: 0, Loses: 0 };
        });
    }

    games.forEach(game => {
        const updateStat = (corpName, didWin) => {
            if (!corpName) return;

            if (!stats[corpName]) {
                stats[corpName] = { Games: 0, Wins: 0, Loses: 0 };
            }

            stats[corpName].Games += 1;
            
            if (didWin) {
                stats[corpName].Wins += 1;
            } else {
                stats[corpName].Loses += 1;
            }
        };

        const dawidWon = game.winner === 'Dawid';

        updateStat(game.Dawid_corporation, dawidWon);
    });

    return stats;
}

function getPointsStats(games) {
    let savedGames = 0;
    const stats = {
        gamesCount: 0,
        wins: 0,
        loses: 0,
        totalPoints: 0,
        totalWt: 0,
        totalAwards: 0,
        totalTitles: 0,
        totalBoard: 0,
        totalCards: 0
    };

    games.forEach(game => {
        stats.gamesCount++;

        if (game.winner === 'Dawid') {
            stats.wins++;
        } else {
            stats.loses++;
        }
        if (game.comment == "Gra wczytana tylko do wyniku, nie mamy konkretnych statystyk") return;
        savedGames++;
        stats.totalPoints += (game.Dawid_total_score || 0);
        stats.totalWt += (game.Dawid_wt || 0);
        stats.totalAwards += (game.Dawid_awards || 0);
        stats.totalTitles += (game.Dawid_titles || 0);
        stats.totalBoard += (game.Dawid_board_score || 0);
        stats.totalCards += (game.Dawid_cards_score || 0);
    });

    const winRate = stats.gamesCount > 0 
        ? ((stats.wins / stats.gamesCount) * 100).toFixed(1) 
        : 0;
    
    const avgPoints = savedGames > 0 
        ? (stats.totalPoints / savedGames).toFixed(1) 
        : 0;

    renderSpecificStats(stats, winRate, avgPoints);
}

function renderSpecificStats(stats, winRate, avgPoints) {
    const tbody = document.getElementById('specyfic-stats-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${stats.gamesCount}</td>
        <td style="color: #1e8e3e; font-weight: bold;">${stats.wins}</td>
        <td style="color: #d93025;">${stats.loses}</td>
        <td style="font-weight: bold;">${winRate}%</td>
        <td style="background-color: #f0f7ff;">${stats.totalPoints}</td>
        <td style="background-color: #f0f7ff; font-weight: bold;">${avgPoints}</td>
        <td>${stats.totalWt}</td>
        <td>${stats.totalAwards}</td>
        <td>${stats.totalTitles}</td>
        <td>${stats.totalBoard}</td>
        <td>${stats.totalCards}</td>
    `;

    tbody.appendChild(tr);
}

function renderCorpoStatsTable(data) {
    const tbody = document.getElementById('stats-body');
    tbody.innerHTML = '';

    data.forEach(corp => {

        const tr = document.createElement('tr');
        
        let colorClass = '';
        if (corp.winRate >= 60) colorClass = 'style="color: #1e8e3e; font-weight: bold;"';
        if (corp.winRate <= 40) colorClass = 'style="color: #d93025;"';

        tr.innerHTML = `
            <td style="text-align: left; font-weight: bold; padding-left: 20px;">${corp.name}</td>
            <td>${corp.Games}</td>
            <td>${corp.Wins}</td>
            <td>${corp.Loses}</td>
            <td ${colorClass}>${corp.winRate}%</td>
        `;
        tbody.appendChild(tr);
    });
}
