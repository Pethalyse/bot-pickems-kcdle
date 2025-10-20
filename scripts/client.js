import fetch from 'node-fetch';

const BASE = 'https://api.pandascore.co';

export default async function psGet(path, params = {}) {
    const token = process.env.PANDASCORE_TOKEN;
    const u = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        u.searchParams.set(k, String(v));
    }
    const res = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`PandaScore ${res.status} ${res.statusText} — ${u}\n${text}`);
    }
    return res.json();
}

