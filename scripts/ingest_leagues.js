import {leaguesRepo} from "../src/db/leaguesRepo.js";
import psGet from "./client.js";

export async function syncAllLeagues() {
    let page = 1, total = 0;
    while (true) {
        const data = await psGet('/lol/leagues', { per_page: 100, page });
        if (!data.length) break;
        await leaguesRepo.bulkUpsert(data);
        total += data.length;
        page++;
    }
    console.log(`[leagues] ✅ Ingest OK: synced ${total} leagues`);
}
