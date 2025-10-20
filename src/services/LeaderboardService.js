import { leaderboardRepo } from '../db/leaderboardRepo.js';

export class LeaderboardService {
    async global(guild_id) {
        return await leaderboardRepo.global(guild_id)
    }
    async league(guild_id, league_id) {
        return await leaderboardRepo.league(guild_id, league_id)
    }
    async series(guild_id, league_id, series_id) {
        return await leaderboardRepo.series(guild_id, league_id, series_id)
    }
    async tournament(guild_id, league_id, series_id, tournament_id) {
        return await leaderboardRepo.tournament(guild_id, league_id, series_id, tournament_id)
    }
}
