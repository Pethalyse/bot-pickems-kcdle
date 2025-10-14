import pool from './pool.js';

export const seriesRepo = {
    async searchByLeagueIds(leagueIds, q = '', limit = 25) {
        const { rows } = await pool.query(
            `SELECT s.id, s.full_name, s.year, l.slug AS league_slug
       FROM series s
       JOIN leagues l ON l.id = s.league_id
       WHERE s.league_id = ANY($1)
         AND (
           $2 = '' OR s.full_name ILIKE $3 OR l.slug ILIKE $3 OR CAST(s.year AS TEXT) ILIKE $3
         )
       ORDER BY s.begin_at DESC NULLS LAST
       LIMIT $4`,
            [leagueIds, q, `%${q}%`, limit]
        );
        return rows;
    }
};
