// Rozbudowana funkcja diagnostyczna do obliczania punktów z logowaniem szczegółów
window.calculateUserScores = async function () {
    console.log("=== OBLICZANIE PUNKTÓW ROZPOCZĘTE ===");
    const headers = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    try {
        // 1. Pobieranie danych rzeczywistych
        const resActualGroups = await fetch(
            `${SUPABASE_URL}/rest/v1/actual_groups`,
            { headers },
        );
        const resActualStages = await fetch(
            `${SUPABASE_URL}/rest/v1/actual_stages`,
            { headers },
        );
        const resActualAwards = await fetch(
            `${SUPABASE_URL}/rest/v1/actual_awards?id=eq.1`,
            { headers },
        );

        if (!resActualGroups.ok || !resActualStages.ok || !resActualAwards.ok) {
            throw new Error("Błąd podczas pobierania danych rzeczywistych.");
        }

        const actualGroups = await resActualGroups.json();
        const actualStages = await resActualStages.json();
        const actualAwardsArray = await resActualAwards.json();
        const actualAwards = actualAwardsArray[0] || {
            top_scorer: "",
            mvp: "",
            best_goalkeeper: "",
        };

        const clean = (str) => (str || "").trim().toLowerCase();

        // Przygotowanie zbiorów rzeczywistych awansów
        const getActualTeamsForStage = (stageName) => {
            return new Set(
                actualStages
                    .filter((s) => s.stage === stageName)
                    .map((s) => clean(s.team_name)),
            );
        };

        const actualR32 = getActualTeamsForStage("r32");
        const actualR16 = getActualTeamsForStage("r16");
        const actualQF = getActualTeamsForStage("qf");
        const actualSF = getActualTeamsForStage("sf");
        const actualFinalists = getActualTeamsForStage("finalists");
        const actualThird = [...getActualTeamsForStage("third")][0] || "";
        const actualChampion = [...getActualTeamsForStage("champion")][0] || "";

        // 2. Pobieranie typów wszystkich graczy
        const resUsers = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            headers,
        });
        const resAllGroupPreds = await fetch(
            `${SUPABASE_URL}/rest/v1/group_predictions`,
            { headers },
        );
        const resAllKOPreds = await fetch(
            `${SUPABASE_URL}/rest/v1/knockout_predictions`,
            { headers },
        );
        const resAllPlayerPreds = await fetch(
            `${SUPABASE_URL}/rest/v1/player_predictions`,
            { headers },
        );

        const users = await resUsers.json();
        const allGroupPreds = await resAllGroupPreds.json();
        const allKOPreds = await resAllKOPreds.json();
        const allPlayerPreds = await resAllPlayerPreds.json();

        console.log(
            `Zaimportowano typy dla ${users.length} graczy. Uruchamiam szczegółową weryfikację...`,
        );

        for (let user of users) {
            const uid = user.id;

            // Zmienne do zbierania punktacji cząstkowej
            let ptsGroupPos = 0;
            let ptsGroupBonus = 0;
            let correctBonusGroups = [];
            let ptsGroupQual = 0;
            let correctQualTeams = [];

            let ptsR16 = 0;
            let correctR16Teams = [];
            let ptsQF = 0;
            let correctQFTeams = [];
            let ptsSF = 0;
            let correctSFTeams = [];
            let ptsThird = 0;
            let ptsFinalists = 0;
            let correctFinalistsTeams = [];
            let ptsChampion = 0;

            let ptsAwards = 0;
            let awardsMatches = {
                scorer: false,
                mvp: false,
                goalkeeper: false,
            };

            // Filtrujemy typy
            const userGroupPreds = allGroupPreds.filter(
                (p) => p.user_id === uid,
            );
            const userKOPreds = allKOPreds.filter((p) => p.user_id === uid);
            const userPlayerPred = allPlayerPreds.find(
                (p) => p.user_id === uid,
            ) || { top_scorer: "", mvp: "", best_goalkeeper: "" };

            // --- OBLICZANIE FAZY GRUPOWEJ ---
            const groupCorrectCounters = {};
            const userPredictedR32 = new Set();

            userGroupPreds.forEach((pred) => {
                const letter = pred.group_letter;
                const teamClean = clean(pred.team_name);

                const actual = actualGroups.find(
                    (g) =>
                        g.group_letter === letter &&
                        clean(g.team_name) === teamClean,
                );

                if (actual) {
                    // Dokładne miejsce w grupie
                    if (pred.predicted_rank === actual.actual_rank) {
                        ptsGroupPos += 2;
                        groupCorrectCounters[letter] =
                            (groupCorrectCounters[letter] || 0) + 1;
                    }
                }

                if (
                    pred.predicted_rank === 1 ||
                    pred.predicted_rank === 2 ||
                    pred.is_best_third === true
                ) {
                    userPredictedR32.add(teamClean);
                }
            });

            // Bonus za całą grupę
            Object.keys(groupCorrectCounters).forEach((letter) => {
                if (groupCorrectCounters[letter] === 4) {
                    ptsGroupBonus += 1;
                    correctBonusGroups.push(letter);
                }
            });

            // Trafienie awansu do R32
            userPredictedR32.forEach((predictedTeam) => {
                if (actualR32.has(predictedTeam)) {
                    ptsGroupQual += 1;
                    correctQualTeams.push(predictedTeam);
                }
            });

            // --- OBLICZANIE FAZY PUCHAROWEJ ---
            const userWinnersMap = {};
            userKOPreds.forEach((p) => {
                userWinnersMap[p.match_id] = clean(p.predicted_winner);
            });

            // 1/8 Finału (R16)
            const userPredictedR16 = new Set();
            for (let i = 73; i <= 88; i++) {
                if (userWinnersMap[i]) userPredictedR16.add(userWinnersMap[i]);
            }
            userPredictedR16.forEach((team) => {
                if (actualR16.has(team)) {
                    ptsR16 += 1;
                    correctR16Teams.push(team);
                }
            });

            // Ćwierćfinały (QF)
            const userPredictedQF = new Set();
            for (let i = 89; i <= 96; i++) {
                if (userWinnersMap[i]) userPredictedQF.add(userWinnersMap[i]);
            }
            userPredictedQF.forEach((team) => {
                if (actualQF.has(team)) {
                    ptsQF += 1;
                    correctQFTeams.push(team);
                }
            });

            // Półfinały (SF)
            const userPredictedSF = new Set();
            for (let i = 97; i <= 100; i++) {
                if (userWinnersMap[i]) userPredictedSF.add(userWinnersMap[i]);
            }
            userPredictedSF.forEach((team) => {
                if (actualSF.has(team)) {
                    ptsSF += 2;
                    correctSFTeams.push(team);
                }
            });

            // 3. miejsce
            const userPredictedThird = userWinnersMap[103] || "";
            if (
                userPredictedThird &&
                userPredictedThird === clean(actualThird)
            ) {
                ptsThird = 2;
            }

            // Finał
            const userPredictedFinalists = new Set();
            if (userWinnersMap[101])
                userPredictedFinalists.add(userWinnersMap[101]);
            if (userWinnersMap[102])
                userPredictedFinalists.add(userWinnersMap[102]);
            userPredictedFinalists.forEach((team) => {
                if (actualFinalists.has(team)) {
                    ptsFinalists += 3;
                    correctFinalistsTeams.push(team);
                }
            });

            // Mistrz
            const userPredictedChampion = userWinnersMap[104] || "";
            if (
                userPredictedChampion &&
                userPredictedChampion === clean(actualChampion)
            ) {
                ptsChampion = 5;
            }

            // --- NAGRODY INDYWIDUALNE ---
            if (
                clean(userPlayerPred.top_scorer) &&
                clean(userPlayerPred.top_scorer) ===
                    clean(actualAwards.top_scorer)
            ) {
                ptsAwards += 5;
                awardsMatches.scorer = true;
            }
            if (
                clean(userPlayerPred.mvp) &&
                clean(userPlayerPred.mvp) === clean(actualAwards.mvp)
            ) {
                ptsAwards += 5;
                awardsMatches.mvp = true;
            }
            if (
                clean(userPlayerPred.best_goalkeeper) &&
                clean(userPlayerPred.best_goalkeeper) ===
                    clean(actualAwards.best_goalkeeper)
            ) {
                ptsAwards += 5;
                awardsMatches.goalkeeper = true;
            }

            const totalPoints =
                ptsGroupPos +
                ptsGroupBonus +
                ptsGroupQual +
                ptsR16 +
                ptsQF +
                ptsSF +
                ptsThird +
                ptsFinalists +
                ptsChampion +
                ptsAwards;

            console.log(`--------------------------------------------------`);
            console.log(`👤 GRACZ: ${user.username} (ID: ${user.id})`);
            console.log(`--------------------------------------------------`);
            console.log(`⚽ FAZA GRUPOWA:`);
            console.log(`  - Dokładne pozycje: ${ptsGroupPos} pkt`);
            console.log(
                `  - Bonusy za całe grupy: ${ptsGroupBonus} pkt (Grupy: ${correctBonusGroups.join(", ") || "brak"})`,
            );
            console.log(
                `  - Trafione awanse (R32): ${ptsGroupQual} pkt (Zespoły: ${correctQualTeams.map((t) => t.toUpperCase()).join(", ") || "brak"})`,
            );
            console.log(
                `  Razem Faza Grupowa: ${ptsGroupPos + ptsGroupBonus + ptsGroupQual} pkt`,
            );
            console.log(`\n🏆 DRABINKA PUCHAROWA:`);
            console.log(
                `  - 1/8 Finału (R16): ${ptsR16} pkt (Zespoły: ${correctR16Teams.map((t) => t.toUpperCase()).join(", ") || "brak"})`,
            );
            console.log(
                `  - Ćwierćfinały (QF): ${ptsQF} pkt (Zespoły: ${correctQFTeams.map((t) => t.toUpperCase()).join(", ") || "brak"})`,
            );
            console.log(
                `  - Półfinały (SF): ${ptsSF} pkt (Zespoły: ${correctSFTeams.map((t) => t.toUpperCase()).join(", ") || "brak"})`,
            );
            console.log(
                `  - 3. miejsce: ${ptsThird} pkt ${ptsThird > 0 ? "(Trafione! " + actualThird.toUpperCase() + ")" : "(Nietrafione)"}`,
            );
            console.log(
                `  - Finaliści: ${ptsFinalists} pkt (Zespoły: ${correctFinalistsTeams.map((t) => t.toUpperCase()).join(", ") || "brak"})`,
            );
            console.log(
                `  - Mistrz: ${ptsChampion} pkt ${ptsChampion > 0 ? "(Trafione! " + actualChampion.toUpperCase() + ")" : "(Nietrafione)"}`,
            );
            console.log(
                `  Razem Faza Pucharowa: ${ptsR16 + ptsQF + ptsSF + ptsThird + ptsFinalists + ptsChampion} pkt`,
            );
            console.log(`\n⭐ NAGRODY INDYWIDUALNE:`);
            console.log(
                `  - Król strzelców: ${awardsMatches.scorer ? "5 pkt (Trafiony: " + actualAwards.top_scorer + ")" : "0 pkt"}`,
            );
            console.log(
                `  - MVP turnieju: ${awardsMatches.mvp ? "5 pkt (Trafiony: " + actualAwards.mvp + ")" : "0 pkt"}`,
            );
            console.log(
                `  - Najlepszy bramkarz: ${awardsMatches.goalkeeper ? "5 pkt (Trafiony: " + actualAwards.best_goalkeeper + ")" : "0 pkt"}`,
            );
            console.log(`  Razem Nagrody: ${ptsAwards} pkt`);
            console.log(`\n➡️ SUMA KOŃCOWA: ${totalPoints} punktów`);
            console.log(`--------------------------------------------------\n`);

            const updateResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/users?id=eq.${uid}`,
                {
                    method: "PATCH",
                    headers: {
                        ...headers,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ points: totalPoints }),
                },
            );

            if (!updateResponse.ok) {
                console.error(
                    `Nie udało się zapisać punktów dla gracza ${user.username}`,
                );
            }
        }

        console.log("=== PUNKTACJA ZAKTUALIZOWANA POMYŚLNIE ===");
        if (typeof loadLeaderboard === "function") {
            await loadLeaderboard();
        }
    } catch (err) {
        console.error("Wystąpił błąd krytyczny podczas obliczeń:", err);
    }
};
