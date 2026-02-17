const maps = ["MARS", "HELLAS", "ELYSIUM", "AMAZONIS", "VASTITAS", "UTOPIA", "CIMERIA"];
const corporations = ["PRISTAR", "LAKEFRONT RESORTS", "TERRALABS RESEARCH", "UTOPIA INVEST", "SEPTEM TRIBS", "CELESTIC", "APHRODITE", "KUIPER COOPERATIVE", "REPUBLIKA THARSIS", "HELION", "FACTORUM", "PHOBLOG", "UNITED NATIONS MARS INITIATIVE", "ROBINSON INDUSTRIES", "ASTRODRILL", "PHARMACY UNION", "MANUTECH", "RECYCLON", "SPLICE GENOMIKA TAKTYCZNA", "VIRON", "MOARNING STAR INC", "ARIDOR", "ARKLIGHT", "POLYPHEMOS", "TYCHO MAGNETICS", "POSEIDON", "STORMCRAFT INCORPORATED", "WSPÓLNOTA ARKADYJSKA", "INVENTRIX", "MINING GUILD", "PHILARES", "VALLEY TRUST", "CREDICOR", "MONS INSURANCE", "SATURN SYSTEMS", "ECOLINE", "TERACTOR", "INTERPLANETARY CINEMATICS", "POINT LUNA", "CHEUNG SHING MARS", "THORGATE", "VITOR"];
initStatsPage();
async function initStatsPage() {
    games = await getGameResults();
    const corporationsStats = getCorporationStats(games, corporations);
    const mapsStats = getMapsStats(games, maps);
     const CorpostatsArray = Object.keys(corporationsStats).map(name => {
        const item = corporationsStats[name];
        const winRate = item.Games > 0 ? ((item.Wins / item.Games) * 100).toFixed(1) : 0;
        return { name, ...item, winRate: parseFloat(winRate) };
    });
    CorpostatsArray.sort((a, b) => b.winRate - a.winRate || b.Games - a.Games);

    renderCorpoStatsTable(CorpostatsArray);
    renderMapsStatsTable(mapsStats);
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

function getMapsStats(games, mapsList) {
    const stats = {};
        if (mapsList && Array.isArray(mapsList)) {
        mapsList.forEach(map => {
            stats[map] = 0;
        });
    }

    games.forEach(game => {
        const mapName = game.map;
        if (mapName) {
            if (!stats[mapName]) {
                stats[mapName] = 0;
            }
            stats[mapName] += 1;
        }
    });

    return stats;
    
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

function renderMapsStatsTable(data) {
    const tbody = document.getElementById('maps-stats-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const totalGames = Object.values(data).reduce((acc, count) => acc + count, 0);

    const sortedMaps = Object.entries(data).sort((a, b) => b[1] - a[1]);

    sortedMaps.forEach(([mapName, count]) => {
        const percentage = totalGames > 0 ? ((count / totalGames) * 100).toFixed(1) : 0;

        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td style="text-align: left; font-weight: bold; padding-left: 20px;">${mapName}</td>
            <td>${count}</td>
            <td style="color: #666;">${percentage}%</td>
        `;

        tbody.appendChild(tr);
    });
}
