import 'dotenv/config';
import {getCursor, setCursor, upsertMatch} from "./utils_bdd.js";
import psGet from "./client.js";

export async function fetchModifiedSince(perPage = 100, maxPages = 50) {
    const lastSeen = (await getCursor("ps_modified_from")) || new Date(Date.now() - 7*24*3600e3).toISOString();

    let page = 1;
    let total = 0;
    let maxSeenThisRun = lastSeen;

    try{
        while (page <= maxPages) {
            const data = await psGet('/lol/matches', {
                sort: '-modified_at',
                per_page: perPage,
                page
            });

            if (!data.length) break;

            let anyNewerOnPage = false;
            for (const m of data) {
                const mod = m.modified_at;
                if (!mod) continue;
                if (mod > lastSeen) {
                    anyNewerOnPage = true;
                    if (mod > maxSeenThisRun) maxSeenThisRun = mod;
                    await upsertMatch(m);
                    total++;
                }
            }

            const lastModOnPage = data[data.length - 1]?.modified_at || null;
            if (!anyNewerOnPage || !(lastModOnPage && lastModOnPage > lastSeen)) {
                break;
            }

            page++;
        }

        if (maxSeenThisRun > lastSeen) {
            await setCursor(maxSeenThisRun, "ps_modified_from");
        }

        console.log(`[modified] ✅ Ingest OK: upserted ${total} matches, lastSeen : ${lastSeen} -> new : ${maxSeenThisRun}`);
    }
    catch(e){
        console.error('[modified] ❌ Ingest error:', e)
    }
}