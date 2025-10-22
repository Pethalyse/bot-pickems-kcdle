import {matchesRepo} from "../db/matchesRepo.js";
import {predictionsRepo} from "../db/predictionRepo.js";
import {playersRepo} from "../db/playerRepo.js";

export class PredictionService {
    async predict(guildId, user, matchId, teamId) {
        const match = await matchesRepo.byId(matchId);
        if (!match) return { ok: false, reason: 'MATCH_NOT_FOUND' };

        const now = Date.now();
        const scheduledTs = match.scheduled_at ? Date.parse(match.scheduled_at) : null;
        if (match.status !== 'not_started' && match.status !== 'pending') {
            return { ok: false, reason: 'MATCH_ALREADY_STARTED' };
        }
        if (scheduledTs && now >= scheduledTs) {
            return { ok: false, reason: 'AFTER_DEADLINE' };
        }

        const valid = (teamId === parseInt(match.team1_id)) || (teamId === parseInt(match.team2_id));
        if (!valid) return { ok: false, reason: 'INVALID_TEAM' };

        const previous = await predictionsRepo.findUserChoice(guildId, matchId, user.id);

        await playersRepo.upsert(guildId, user.id, user.displayName ?? user.username);
        await predictionsRepo.upsert({ guildId, matchId, userId: user.id, teamId });

        return {
            ok: true,
            match,
            teamId,
            previousChoice: previous,
            changed: previous && previous !== teamId
        };
    }
}