import { matchesRepo } from '../db/matchesRepo.js';

export const matchesService = {
    async listUpcomingForGuild(guildSettings) {
        const leagues = guildSettings?.leagues || [];
        if (!leagues.length) return [];
        return matchesRepo.upcomingByLeagues(leagues);
    },
    async getMatch(matchId) {
        return matchesRepo.byId(matchId);
    }
};
