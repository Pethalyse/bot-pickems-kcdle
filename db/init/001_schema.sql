CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Référentiels
CREATE TABLE IF NOT EXISTS leagues (
                                       id         BIGINT PRIMARY KEY,
                                       name       TEXT NOT NULL,
                                       slug       TEXT NOT NULL,
                                       image_url  TEXT
);

CREATE TABLE IF NOT EXISTS series (
                                      id         BIGINT PRIMARY KEY,
                                      league_id  BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    full_name  TEXT,
    year       INTEGER,
    slug       TEXT,
    begin_at   TIMESTAMPTZ,
    end_at     TIMESTAMPTZ
    );

CREATE TABLE IF NOT EXISTS tournaments (
                                           id         BIGINT PRIMARY KEY,
                                           league_id  BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    series_id  BIGINT     REFERENCES series(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       TEXT,
    country    TEXT,
    begin_at   TIMESTAMPTZ,
    end_at     TIMESTAMPTZ
    );

CREATE TABLE IF NOT EXISTS teams (
                                     id              BIGINT PRIMARY KEY,
                                     name            TEXT NOT NULL,
                                     acronym         TEXT,
                                     slug            TEXT NOT NULL,
                                     location        TEXT,
                                     image_url       TEXT,
                                     dark_image_url  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_teams_slug ON teams(slug);

-- Matchs + participants
CREATE TABLE IF NOT EXISTS matches (
                                       id                     BIGINT PRIMARY KEY,
                                       slug                   TEXT,
                                       status                 TEXT,
                                       rescheduled            BOOLEAN,
                                       draw                   BOOLEAN,
                                       match_type             TEXT,
                                       number_of_games        INTEGER,

                                       league_id              BIGINT NOT NULL REFERENCES leagues(id)     ON DELETE CASCADE,
    series_id              BIGINT     REFERENCES series(id)           ON DELETE CASCADE,
    tournament_id          BIGINT     REFERENCES tournaments(id)      ON DELETE CASCADE,

    scheduled_at           TIMESTAMPTZ,
    begin_at               TIMESTAMPTZ,
    original_scheduled_at  TIMESTAMPTZ,
    opens_at               TIMESTAMPTZ,

    winner_team_id         BIGINT     REFERENCES teams(id)            ON DELETE SET NULL,

    modified_at            TIMESTAMPTZ,
    raw_json               JSONB
    );
CREATE INDEX IF NOT EXISTS idx_matches_sched  ON matches(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id, scheduled_at);

CREATE TABLE IF NOT EXISTS match_teams (
                                           match_id  BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id   BIGINT NOT NULL REFERENCES teams(id)   ON DELETE RESTRICT,
    position  SMALLINT NOT NULL CHECK (position IN (1,2)),
    PRIMARY KEY (match_id, position)
    );
CREATE UNIQUE INDEX IF NOT EXISTS ux_match_teams_unique_team ON match_teams(match_id, team_id);

-- Vue pratique
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
    m.winner_team_id, m.modified_at
FROM matches m
         JOIN leagues      l  ON l.id  = m.league_id
         LEFT JOIN series  s  ON s.id  = m.series_id
         LEFT JOIN tournaments t ON t.id = m.tournament_id
         JOIN match_teams mt1 ON mt1.match_id = m.id AND mt1.position = 1
         JOIN teams       t1  ON t1.id = mt1.team_id
         JOIN match_teams mt2 ON mt2.match_id = m.id AND mt2.position = 2
         JOIN teams       t2  ON t2.id = mt2.team_id;
