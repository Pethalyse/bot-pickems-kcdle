import pool from './pool.js';

export const leaderboardRepo = {
    async global(guild_id){
        const { rows } = await pool.query(`
            SELECT *
            FROM v_pickems_leaderboard
            WHERE guild_id = $1 
                AND scope = 'global'
            ORDER BY success_rate DESC, total_predictions DESC;`,
            [guild_id]);
        return rows;
    },

    async league(guild_id, league_id){
        const { rows } = await pool.query(`
            SELECT *
            FROM v_pickems_leaderboard
            WHERE guild_id = $1
                AND league_id = $2
                AND scope = 'league'
            ORDER BY success_rate DESC, total_predictions DESC`,
            [guild_id, league_id]);
        return rows;
    },

    async series(guild_id, league_id, series_id){
        const { rows } = await pool.query(`
            SELECT *
            FROM v_pickems_leaderboard
            WHERE guild_id = $1 
                AND league_id = $2
                AND series_id = $3 
                AND scope = 'series'
            ORDER BY success_rate DESC, total_predictions DESC;`,
            [guild_id, league_id, series_id]);
        return rows;
    },

    async tournament(guild_id, league_id, series_id, tournament_id){
        const { rows } = await pool.query(`
            SELECT *
            FROM v_pickems_leaderboard
            WHERE guild_id = $1
                AND league_id = $2
                AND series_id = $3
                AND tournament_id = $4
                AND scope = 'tournament'
            ORDER BY success_rate DESC, total_predictions DESC;`,
            [guild_id, league_id, series_id, tournament_id]);
        return rows;
    },
};
