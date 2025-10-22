CREATE OR REPLACE VIEW v_matches_pickems AS
SELECT
    m.id, m.slug, m.status, m.rescheduled, m.draw, m.match_type, m.number_of_games,
    m.scheduled_at, m.begin_at, m.original_scheduled_at, m.opens_at,
    m.league_id, l.name AS league_name, l.slug AS league_slug,
    m.series_id, s.full_name AS series_full_name, s.year AS series_year,
    m.tournament_id, t.name AS tournament_name,
    mt1.team_id AS team1_id, t1.name AS team1_name, t1.acronym AS team1_acronym, t1.slug AS team1_slug,
    t1.image_url AS team1_image_url, t1.dark_image_url AS team1_dark_image_url,
    mt2.team_id AS team2_id, t2.name AS team2_name, t2.acronym AS team2_acronym, t2.slug AS team2_slug,
    t2.image_url AS team2_image_url, t2.dark_image_url AS team2_dark_image_url,
    m.winner_team_id, m.modified_at, l.image_url AS league_image
FROM matches m
         JOIN leagues      l  ON l.id  = m.league_id
         LEFT JOIN series  s  ON s.id  = m.series_id
         LEFT JOIN tournaments t ON t.id = m.tournament_id
         JOIN match_teams mt1 ON mt1.match_id = m.id AND mt1.position = 1
         JOIN teams       t1  ON t1.id = mt1.team_id
         JOIN match_teams mt2 ON mt2.match_id = m.id AND mt2.position = 2
         JOIN teams       t2  ON t2.id = mt2.team_id;