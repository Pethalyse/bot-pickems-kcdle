export class CustomId {
    static make(ns, action, params) {
        const payload = params ? `${Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join(',')}` : '';
        return `${ns}:${action}:${payload}`;
    }

    static match(customId, ns) { return typeof customId === 'string' && customId.startsWith(`${ns}:`); }

    static parse(customId) {
        const tab = customId.split(":")
        const length = tab.length;
        const [, action, rawParams] = [tab[0], tab.slice(1, length-1).join(":"), tab[length-1]];
        const params = {};
        if (rawParams) {
            for (const kv of rawParams.split(',')) {
                const [k, v] = kv.split('=');
                if (k) params[k] = decodeURIComponent(v ?? '');
            }
        }
        if(!params["update"]) params["update"] = true;
        return { action, params };
    }
}