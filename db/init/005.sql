DROP VIEW IF EXISTS v_lb_global;
DROP VIEW IF EXISTS v_lb_series;
DROP VIEW IF EXISTS v_lb_league_year;

CREATE OR REPLACE VIEW v_pickems_leaderboard AS
WITH rp AS (
    SELECT
        pr.guild_id,
        pr.user_id,
        gp.display_name,
        vmp.league_id,
        vmp.league_name,
        vmp.series_id,
        vmp.series_full_name,
        vmp.tournament_id,
        vmp.tournament_name,
        (vmp.winner_team_id = pr.choice_team_id) AS result
    FROM predictions         pr
        JOIN v_matches_pickems   vmp ON vmp.id = pr.match_id
        JOIN guild_players       gp  ON gp.user_id = pr.user_id AND gp.guild_id = pr.guild_id
    WHERE vmp.status = 'finished'
)
SELECT
    guild_id,
    user_id,
    league_id,
    series_id,
    tournament_id,

    COUNT(*)                                        AS total_predictions,
    COUNT(*) FILTER (WHERE result)                  AS correct_predictions,
    ROUND((COUNT(*) FILTER (WHERE result))::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS success_rate,

    CASE
        WHEN GROUPING(league_id)=1     THEN 'global'
        WHEN GROUPING(series_id)=1     THEN 'league'
        WHEN GROUPING(tournament_id)=1 THEN 'series'
        ELSE                                 'tournament'
        END                                             AS scope
FROM rp
GROUP BY GROUPING SETS (
    (guild_id, user_id),
    (guild_id, user_id, league_id),
    (guild_id, user_id, league_id, series_id),
    (guild_id, user_id, league_id, series_id, tournament_id)
);
