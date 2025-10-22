import {seriesRepo} from "../db/seriesRepo.js";

export class SeriesService {
    async pageFromLeague(leagueId, page, pageSize) {
        const series = await seriesRepo.listFromLeague(leagueId);
        const items = series.sort((a, b) => a.full_name.localeCompare(b.full_name));

        const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
        const safePage = Math.min(Math.max(0, page), totalPages - 1);
        const slice = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

        return {
            total: items.length,
            totalPages : totalPages,
            page: safePage,
            pageSize : pageSize,
            items: slice,
        };
    }

    async get(league_id){
        return await seriesRepo.get(league_id)
    }
}