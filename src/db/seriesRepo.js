import pool from "./pool.js";

export const seriesRepo = {
    async listFromLeague(league_id) {
        const { rows } = await pool.query(`
            SELECT * FROM series 
            WHERE league_id = $1 
            ORDER BY full_name
        `, [league_id]);
        return rows;
    },

    async get(series_id) {
        const { rows } = await pool.query(
            `SELECT * FROM series WHERE id = $1`, [series_id]
        );
        return rows[0];
    }
}