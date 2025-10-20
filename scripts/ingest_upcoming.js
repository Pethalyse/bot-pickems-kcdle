import 'dotenv/config';
import {upsertMatch} from "./utils_bdd.js";
import psGet from "./client.js";

export async function fetchUpcoming() {
    let page = 1;
    let total = 0;

    try{
        while (true) {
            const data = await psGet('/lol/matches/upcoming', {
                'per_page': 100,
                'page': page
            });

            if (!data.length) break;

            for (const m of data) await upsertMatch(m);
            total += data.length;
            page++;
        }
        console.log(`[upcoming] ✅ Ingest OK: upserted ${total} matches`);
    }
    catch(e){
        console.error('[upcoming] ❌ Ingest error:', e)
    }
}
