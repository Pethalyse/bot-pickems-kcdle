import pool from './pool.js';

export const leaderboardRepo = {
    async global(guildId, limit = 15) {
        const { rows } = await pool.query(
            `SELECT lb.user_id, lb.points, gp.display_name
             FROM v_lb_global lb
                      LEFT JOIN guild_players gp ON gp.guild_id = lb.guild_id AND gp.user_id = lb.user_id
             WHERE lb.guild_id = $1
             ORDER BY lb.points DESC, lb.last_update ASC
             LIMIT $2`, [guildId, limit]
        );
        return rows;
    },

    async bySeries(guildId, seriesId, limit = 15) {
        const { rows } = await pool.query(
            `SELECT lb.user_id, lb.points, gp.display_name
             FROM v_lb_series lb
                      LEFT JOIN guild_players gp ON gp.guild_id = lb.guild_id AND gp.user_id = lb.user_id
             WHERE lb.guild_id = $1 AND lb.series_id = $2
             ORDER BY lb.points DESC, lb.last_update ASC
             LIMIT $3`, [guildId, seriesId, limit]
        );
        return rows;
    },

    async byLeagueYear(guildId, leagueId, year, limit = 15) {
        const { rows } = await pool.query(
            `SELECT lb.user_id, lb.points, gp.display_name
             FROM v_lb_league_year lb
                      LEFT JOIN guild_players gp ON gp.guild_id = lb.guild_id AND gp.user_id = lb.user_id
             WHERE lb.guild_id = $1 AND lb.league_id = $2 AND lb.year = $3
             ORDER BY lb.points DESC, lb.last_update ASC
             LIMIT $4`, [guildId, leagueId, year, limit]
        );
        return rows;
    }
};
