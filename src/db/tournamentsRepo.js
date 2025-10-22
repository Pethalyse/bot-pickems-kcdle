import pool from "./pool.js";

export const tournamentsRepo = {
    async listFromSeries(league_id, series_id) {
        const { rows } = await pool.query(`
            SELECT * FROM tournaments
            WHERE league_id = $1 
            AND series_id = $2
            ORDER BY name
        `, [league_id, series_id]);
        return rows;
    },

    async get(tournament_id) {
        const { rows } = await pool.query(
            `SELECT * FROM tournaments WHERE id = $1`, [tournament_id]
        );
        return rows[0];
    }
}