import { leaderboardRepo } from '../db/leaderboardRepo.js';
export const leaderboardService = {
    global: (guildId, limit) => leaderboardRepo.global(guildId, limit),
    series: (guildId, seriesId, limit) => leaderboardRepo.bySeries(guildId, seriesId, limit),
    leagueYear: (guildId, leagueId, year, limit) => leaderboardRepo.byLeagueYear(guildId, leagueId, year, limit),
};
