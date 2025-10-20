import 'dotenv/config';
import {matchIdToBind, upsertMatch} from "./utils_bdd.js";
import psGet from "./client.js";

export async function sweepPending() {
    const rows = await matchIdToBind()
    if (!rows.length) return;

    try{
        for (const r of rows) {
            const m = await psGet(`/lol/matches/${r.id}`);
            await upsertMatch(m);
        }
        console.log(`[sweep] ✅ Ingest OK: reconciled ${rows.length} matches`);
    }
    catch(e){
        console.error('[sweep] ❌ Ingest error:', e)
    }
}

