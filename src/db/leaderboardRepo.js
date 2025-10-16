import pool from './pool.js';

function mapRows(rows) {
    return rows.map(r => ({
        user_id: r.user_id,
        display_name: r.display_name,
        points: Number(r.points),
        total: Number(r.total),
    }));
}

export const leaderboardRepo = {
    async global(guildId, limit = 10, offset = 0) {
        const { rows } = await pool.query(
            `WITH agg AS (
                SELECT p.user_id,
                       COUNT(*) FILTER (WHERE m.status='finished' AND m.winner_team_id IS NOT NULL)    AS total,
                       COUNT(*) FILTER (WHERE m.status='finished' AND m.winner_team_id IS NOT NULL
                           AND p.choice_team_id = m.winner_team_id)                     AS points
                FROM predictions p
                         JOIN matches m ON m.id = p.match_id
                WHERE p.guild_id = $1
                GROUP BY p.user_id
            ), cnt AS (SELECT COUNT(*) AS n FROM agg)
             SELECT a.user_id, a.points, a.total, gp.display_name, c.n AS total_rows
             FROM agg a
                      LEFT JOIN guild_players gp ON gp.guild_id=$1 AND gp.user_id=a.user_id
                      CROSS JOIN cnt c
             ORDER BY a.points DESC, a.total DESC
             LIMIT $2 OFFSET $3`,
            [guildId, limit, offset]
        );
        const totalRows = rows[0]?.total_rows ? Number(rows[0].total_rows) : 0;
        return { rows: mapRows(rows), totalRows };
    },

    async league(guildId, leagueId, { year = null, limit = 10, offset = 0 } = {}) {
        const params = [guildId, leagueId, limit, offset];
        const yearFilter = year ? `AND s.year = $5` : '';
        if (year) params.splice(2, 0, year); // insert year as $3
        const { rows } = await pool.query(
            `WITH agg AS (
         SELECT p.user_id,
                COUNT(*) FILTER (WHERE m.status='finished' AND m.winner_team_id IS NOT NULL)    AS total,
                COUNT(*) FILTER (WHERE m.status='finished' AND m.winner_team_id IS NOT NULL
                                   AND p.choice_team_id = m.winner_team_id)                     AS points
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         LEFT JOIN series s ON s.id = m.series_id
         WHERE p.guild_id = $1
           AND m.league_id = $2
           ${yearFilter}
         GROUP BY p.user_id
       ), cnt AS (SELECT COUNT(*) AS n FROM agg)
       SELECT a.user_id, a.points, a.total, gp.display_name, c.n AS total_rows
       FROM agg a
       LEFT JOIN guild_players gp ON gp.guild_id=$1 AND gp.user_id=a.user_id
       CROSS JOIN cnt c
       ORDER BY a.points DESC, a.total DESC
       LIMIT ${year ? '$4' : '$3'} OFFSET ${year ? '$5' : '$4'}`,
            params
        );
        const totalRows = rows[0]?.total_rows ? Number(rows[0].total_rows) : 0;
        return { rows: mapRows(rows), totalRows };
    }
};
