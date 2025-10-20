import {leaguesRepo} from "../db/leaguesRepo.js";

export class LeagueService {
    async page({ guildId, followed, page, pageSize, mode, query }) {
        const isSearch = mode === 'search' && query?.trim();
        const all = isSearch
            ? await leaguesRepo.searchByName(query.trim(), 200)
            : await leaguesRepo.listAll()

        const items = all.sort((a, b) => a.name.localeCompare(b.name));
        const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
        const safePage = Math.min(Math.max(0, page), totalPages - 1);
        const slice = items.slice(safePage * pageSize, safePage * pageSize + pageSize);


        return {
            guildId,
            total: items.length,
            totalPages : totalPages,
            page: safePage,
            pageSize,
            items: slice.map(l => ({ ...l, followed: followed.includes(l.id) })),
            query: query ?? '',
        };
    }

    async pageFollowed({guildId, followed, page, pageSize}) {
        const leagues = await leaguesRepo.byIds(followed);
        const items = leagues.sort((a, b) => a.name.localeCompare(b.name));
        const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
        const safePage = Math.min(Math.max(0, page), totalPages - 1);
        const slice = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

        return {
            guildId,
            total: items.length,
            totalPages : totalPages,
            page: safePage,
            pageSize : pageSize,
            items: slice,
        };
    }
}