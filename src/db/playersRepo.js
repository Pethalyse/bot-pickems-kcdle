import pool from './pool.js';

export const playersRepo = {
    async upsert(guildId, userId, displayName) {
        await pool.query(
            `INSERT INTO guild_players (guild_id, user_id, display_name)
       VALUES ($1,$2,$3)
       ON CONFLICT (guild_id, user_id) DO UPDATE
         SET display_name = EXCLUDED.display_name`,
            [guildId, userId, displayName]
        );
    }
};
