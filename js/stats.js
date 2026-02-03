const maps = ["MARS", "HELLAS", "ELYSIUM", "AMAZONIS", "VASTITAS", "UTOPIA", "CIMERIA"];
const corporations = ["CELESTIC", "APHRODITE", "KUIPER COOPERATIVE", "REPUBLIKA THARSIS", "HELION", "FACTORUM", "PHOBLOG", "UNITED NATIONS MARS INITIATIVE", "ROBINSON INDUSTRIES", "ASTRODRILL", "PHARMACY UNION", "MANUTECH", "RECYCLON", "SPLICE GENOMIKA TAKTYCZNA", "VIRON", "MOARNING STAR INC", "ARIDOR", "ARKLIGHT", "POLYPHEMOS", "TYCHO MAGNETICS", "POSEIDON", "STORMCRAFT INCORPORATED", "WSPÓLNOTA ARKADYJSKA", "INVENTRIX", "MINING GUILD", "PHILARES", "VALLEY TRUST", "CREDICOR", "MONS INSURANCE", "SATURN SYSTEMS", "ECOLINE", "TERACTOR", "INTERPLANETARY CINEMATICS", "POINT LUNA", "CHEUNG SHING MARS", "THORGATE", "VITOR"];
initStatsPage();
async function initStatsPage() {
    games = await getGameResults();
    const stats = getCorporationStats(games, corporations);
     const statsArray = Object.keys(stats).map(name => {
        const item = stats[name];
        const winRate = item.Games > 0 ? ((item.Wins / item.Games) * 100).toFixed(1) : 0;
        return { name, ...item, winRate: parseFloat(winRate) };
    });
    statsArray.sort((a, b) => b.winRate - a.winRate || b.Games - a.Games);

    renderStatsTable(statsArray);
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
        const kasiaWon = game.winner === 'Kasia';

        updateStat(game.Dawid_corporation, dawidWon);
        updateStat(game.Kasia_corporation, kasiaWon);
    });

    return stats;
}

function renderStatsTable(data) {
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
