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
            }
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
        const fileExt = file.name.split('.').pop();
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
                        "Content-Type": file.type
                    },
                    body: file
                }
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