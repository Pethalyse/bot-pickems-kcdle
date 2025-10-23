import {matchesRepo} from "../db/matchesRepo.js";

export class MatchesService {
    /** @param {{leagues:string[], start:Date, end:Date, limit:number}} p */
    async findUpcoming(p) {
        const list = await matchesRepo.upcomingWindow(
            p.leagues,
            p.start,
            p.end,
        );

        return (list ?? [])
            .map(m => ({ ...m, match_date: new Date(m.match_date ?? m.date ?? m.start ?? Date.now()) }))
            .sort((a, b) => a.match_date - b.match_date);
    }

    async upcomingByLeagues(leagues){
        return await matchesRepo.upcomingByLeagues(leagues);
    }
}