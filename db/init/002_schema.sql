CREATE TABLE IF NOT EXISTS guild_settings (
                                              guild_id    TEXT PRIMARY KEY,
                                              timezone    TEXT DEFAULT 'Europe/Paris',
                                              leagues     BIGINT[] NOT NULL
);

CREATE TABLE IF NOT EXISTS guild_players (
                                             guild_id   TEXT NOT NULL,
                                             user_id    TEXT NOT NULL,
                                             display_name TEXT,
                                             PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS predictions (
                                           guild_id        TEXT    NOT NULL,
                                           match_id        BIGINT  NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
                                           user_id         TEXT    NOT NULL,
                                           choice_team_id  BIGINT  NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
                                           created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                                           PRIMARY KEY (guild_id, match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pred_by_match  ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_pred_by_guild  ON predictions(guild_id, match_id);
CREATE INDEX IF NOT EXISTS idx_pred_by_user   ON predictions(guild_id, user_id);

-- Global par serveur
CREATE OR REPLACE VIEW v_lb_global AS
SELECT
    p.guild_id,
    p.user_id,
    COUNT(*)::int AS points,
    MAX(m.modified_at) AS last_update
FROM predictions p
         JOIN matches m
              ON m.id = p.match_id
WHERE m.status = 'finished'
  AND m.winner_team_id IS NOT NULL
  AND p.choice_team_id = m.winner_team_id
GROUP BY p.guild_id, p.user_id;

-- Par série (ex: lec-summer-2025 ou worlds-2025)
CREATE OR REPLACE VIEW v_lb_series AS
SELECT
    p.guild_id,
    m.series_id,
    p.user_id,
    COUNT(*)::int AS points,
    MAX(m.modified_at) AS last_update
FROM predictions p
         JOIN matches m ON m.id = p.match_id
WHERE m.status = 'finished'
  AND m.winner_team_id IS NOT NULL
  AND p.choice_team_id = m.winner_team_id
GROUP BY p.guild_id, m.series_id, p.user_id;

-- Par ligue + année (ex: LEC + 2025 regroupe Spring/Summer)
CREATE OR REPLACE VIEW v_lb_league_year AS
SELECT
    p.guild_id,
    m.league_id,
    s.year,
    p.user_id,
    COUNT(*)::int AS points,
    MAX(m.modified_at) AS last_update
FROM predictions p
         JOIN matches m ON m.id = p.match_id
         LEFT JOIN series s ON s.id = m.series_id
WHERE m.status = 'finished'
  AND m.winner_team_id IS NOT NULL
  AND p.choice_team_id = m.winner_team_id
GROUP BY p.guild_id, m.league_id, s.year, p.user_id;
