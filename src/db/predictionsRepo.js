import pool from './pool.js';

export const predictionsRepo = {
    async upsert({ guildId, matchId, userId, teamId }) {
        await pool.query(
            `INSERT INTO predictions (guild_id, match_id, user_id, choice_team_id)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (guild_id, match_id, user_id) DO UPDATE
         SET choice_team_id = EXCLUDED.choice_team_id,
             created_at = now()`,
            [guildId, matchId, userId, teamId]
        );
    },

    async findUserChoice(guildId, matchId, userId) {
        const { rows } = await pool.query(
            `SELECT choice_team_id FROM predictions
       WHERE guild_id=$1 AND match_id=$2 AND user_id=$3`,
            [guildId, matchId, userId]
        );
        return rows[0]?.choice_team_id ?? null;
    }
};
