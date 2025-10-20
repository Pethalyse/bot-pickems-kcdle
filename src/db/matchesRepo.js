import pool from './pool.js';

export const matchesRepo = {
    async upcomingByLeagues(leagueIds, limit = 50) {
        const { rows } = await pool.query(
            `SELECT * FROM v_matches_pickems
             WHERE league_id = ANY($1) AND status IN ('not_started','pending')
             ORDER BY scheduled_at ASC
             LIMIT $2`, [leagueIds, limit]
        );
        return rows;
    },

    async upcomingWindow(leagueIds, startIso, endIso) {
        const { rows } = await pool.query(
            `SELECT * FROM v_matches_pickems
             WHERE league_id = ANY($1)
               AND status IN ('not_started','pending')
               AND scheduled_at >= $2 AND scheduled_at < $3
             ORDER BY scheduled_at`,
            [leagueIds, startIso, endIso]
        );
        return rows;
    },

    async searchUpcoming(leagueIds, q, limit = 25) {
        // recherche par équipe/acronyme/slug + id direct
        const byId = /^\d+$/.test(q) ? Number(q) : null;
        const params = [leagueIds, `%${q}%`, `%${q}%`, `%${q}%`, limit];
        const { rows } = await pool.query(
            `SELECT * FROM v_matches_pickems
       WHERE league_id = ANY($1)
         AND status IN ('not_started','pending')
         AND (
              ${byId ? `id = ${byId} OR` : ``}
              team1_name ILIKE $2 OR team2_name ILIKE $2
           OR team1_acronym ILIKE $3 OR team2_acronym ILIKE $3
           OR league_slug ILIKE $4 OR slug ILIKE $4
         )
       ORDER BY scheduled_at ASC
       LIMIT $5`,
            params
        );
        return rows;
    },

    async byId(matchId) {
        const { rows } = await pool.query(
            `SELECT * FROM v_matches_pickems WHERE id=$1`, [matchId]
        );
        return rows[0] || null;
    }
};
