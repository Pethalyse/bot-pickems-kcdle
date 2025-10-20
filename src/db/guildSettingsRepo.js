import pool from './pool.js';

export async function getGuildSettings(guildId) {
    const { rows } = await pool.query(
        `SELECT guild_id, timezone, leagues, vote_channel_id FROM guild_settings WHERE guild_id=$1`, [guildId]
    );
    return rows[0] || null;
}

export async function upsertGuildSettings({ guildId, timezone, leagues }) {
    const { rows } = await pool.query(
        `INSERT INTO guild_settings (guild_id, timezone, leagues)
     VALUES ($1, COALESCE($2,'Europe/Paris'), COALESCE($3,'{}'::BIGINT[]))
     ON CONFLICT (guild_id) DO UPDATE
       SET timezone = COALESCE(EXCLUDED.timezone, guild_settings.timezone),
           leagues  = COALESCE(EXCLUDED.leagues,  guild_settings.leagues)
     RETURNING guild_id, timezone, leagues`,
        [guildId, timezone ?? null, leagues ?? null]
    );
    return rows[0];
}

export async function setGuildLeagues(guildId, leagueIds = []) {
    const { rows } = await pool.query(
        `UPDATE guild_settings SET leagues=$2 WHERE guild_id=$1
     RETURNING guild_id, timezone, leagues`,
        [guildId, leagueIds]
    );
    return rows[0];
}

export async function setGuildTimezone(guildId, tz) {
    const { rows } = await pool.query(
        `UPDATE guild_settings SET timezone=$2 WHERE guild_id=$1
     RETURNING guild_id, timezone, leagues`,
        [guildId, tz]
    );
    return rows[0];
}

export async function ensureGuildSettings(guildId, defaults) {
    const cur = await getGuildSettings(guildId);
    if (cur) return cur;
    return upsertGuildSettings({ guildId, ...defaults });
}

export async function setGuildVoteChannel(guildId, channelId) {
    const { rows } = await pool.query(
        `UPDATE guild_settings SET vote_channel_id=$2 WHERE guild_id=$1
     RETURNING guild_id, vote_channel_id, timezone, leagues`,
        [guildId, channelId]
    );
    return rows[0];
}

export async function getAllGuildSettingsWithChannel() {
    const { rows } = await pool.query(
        `SELECT guild_id, vote_channel_id, timezone, leagues
     FROM guild_settings
     WHERE vote_channel_id IS NOT NULL`
    );
    return rows;
}

export async function setGuildVoteTime(guildId, hour, minute = 0) {
    const { rows } = await pool.query(
        `UPDATE guild_settings
       SET vote_hour = $2, vote_minute = $3
     WHERE guild_id = $1
     RETURNING guild_id, vote_channel_id, timezone, leagues, vote_hour, vote_minute`,
        [guildId, hour, minute]
    );
    return rows[0];
}
