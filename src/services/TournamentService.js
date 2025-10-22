import {tournamentsRepo} from "../db/tournamentsRepo.js";

export class TournamentService {
    async pageFromSeries(leagueId, seriesId, page, pageSize) {
        const series = await tournamentsRepo.listFromSeries(leagueId, seriesId);
        const items = series.sort((a, b) => a.name.localeCompare(b.name));

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
        return await tournamentsRepo.get(league_id)
    }
}