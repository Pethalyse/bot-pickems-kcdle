import pg from "pg";

const { DATABASE_URL } = process.env;
const pool = new pg.Pool({ connectionString: DATABASE_URL });

export function mapEntities(m) {
    const league = m.league ?? { id: m.league_id, name: null, slug: null };
    const serie  = m.serie  ?? { id: m.serie_id, full_name: null, year: null, slug: null, begin_at: null, end_at: null };
    const tour   = m.tournament ?? { id: m.tournament_id, name: null, type: null, country: null, begin_at: null, end_at: null };
    const o1 = m.opponents?.[0]?.opponent ?? {};
    const o2 = m.opponents?.[1]?.opponent ?? {};

    return {
        league: { id: league.id, name: league.name, slug: league.slug, image_url: league.image_url ?? null },
        series: { id: serie.id, league_id: league.id, full_name: serie.full_name ?? null, year: serie.year ?? null, slug: serie.slug ?? null, begin_at: serie.begin_at ?? null, end_at: serie.end_at ?? null },
        tournament: { id: tour.id, league_id: league.id, series_id: serie.id ?? null, name: tour.name ?? null, type: tour.type ?? null, country: tour.country ?? null, begin_at: tour.begin_at ?? null, end_at: tour.end_at ?? null },
        team1: { id: o1.id ?? null, name: o1.name ?? null, acronym: o1.acronym ?? null, slug: o1.slug ?? null, location: o1.location ?? null, image_url: o1.image_url ?? null, dark_image_url: o1.dark_mode_image_url ?? null },
        team2: { id: o2.id ?? null, name: o2.name ?? null, acronym: o2.acronym ?? null, slug: o2.slug ?? null, location: o2.location ?? null, image_url: o2.image_url ?? null, dark_image_url: o2.dark_mode_image_url ?? null },
        match: {
            id: m.id, slug: m.slug ?? null, status: m.status ?? null,
            rescheduled: !!m.rescheduled, draw: !!m.draw, match_type: m.match_type ?? null,
            number_of_games: m.number_of_games ?? null,
            league_id: league.id, series_id: serie.id ?? null, tournament_id: tour.id ?? null,
            scheduled_at: m.scheduled_at ?? null, begin_at: m.begin_at ?? null,
            original_scheduled_at: m.original_scheduled_at ?? null, opens_at: m.opens_at ?? null,
            winner_team_id: m.winner?.id ?? m.winner_id ?? null,
            modified_at: m.modified_at ?? null, raw_json: m
        }
    };
}

export const SQL = {
    league: `INSERT INTO leagues(id,name,slug,image_url) VALUES($1,$2,$3,$4)
           ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, image_url=EXCLUDED.image_url`,
    series: `INSERT INTO series(id,league_id,full_name,year,slug,begin_at,end_at)
           VALUES($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET league_id=EXCLUDED.league_id, full_name=EXCLUDED.full_name, year=EXCLUDED.year, slug=EXCLUDED.slug, begin_at=EXCLUDED.begin_at, end_at=EXCLUDED.end_at`,
    tour:   `INSERT INTO tournaments(id,league_id,series_id,name,type,country,begin_at,end_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET league_id=EXCLUDED.league_id, series_id=EXCLUDED.series_id, name=EXCLUDED.name, type=EXCLUDED.type, country=EXCLUDED.country, begin_at=EXCLUDED.begin_at, end_at=EXCLUDED.end_at`,
    team:   `INSERT INTO teams(id,name,acronym,slug,location,image_url,dark_image_url)
           VALUES($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, acronym=EXCLUDED.acronym, slug=EXCLUDED.slug, location=EXCLUDED.location, image_url=EXCLUDED.image_url, dark_image_url=EXCLUDED.dark_image_url`,
    match:  `INSERT INTO matches(id,slug,status,rescheduled,draw,match_type,number_of_games,league_id,series_id,tournament_id,scheduled_at,begin_at,original_scheduled_at,opens_at,winner_team_id,modified_at,raw_json)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,status=EXCLUDED.status,rescheduled=EXCLUDED.rescheduled,draw=EXCLUDED.draw,match_type=EXCLUDED.match_type,number_of_games=EXCLUDED.number_of_games,league_id=EXCLUDED.league_id,series_id=EXCLUDED.series_id,tournament_id=EXCLUDED.tournament_id,scheduled_at=EXCLUDED.scheduled_at,begin_at=EXCLUDED.begin_at,original_scheduled_at=EXCLUDED.original_scheduled_at,opens_at=EXCLUDED.opens_at,winner_team_id=EXCLUDED.winner_team_id,modified_at=EXCLUDED.modified_at,raw_json=EXCLUDED.raw_json`,
    mteam:  `INSERT INTO match_teams(match_id,team_id,position)
           VALUES($1,$2,$3)
           ON CONFLICT (match_id,position) DO UPDATE SET team_id=EXCLUDED.team_id`
};

export async function upsertMatch(match)
{
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const mapped = mapEntities(match);

        await client.query(SQL.league, [mapped.league.id, mapped.league.name, mapped.league.slug, mapped.league.image_url]);
        if (mapped.series.id) {
            await client.query(SQL.series, [mapped.series.id, mapped.series.league_id, mapped.series.full_name, mapped.series.year, mapped.series.slug, mapped.series.begin_at, mapped.series.end_at]);
        }
        if (mapped.tournament.id) {
            await client.query(SQL.tour, [mapped.tournament.id, mapped.tournament.league_id, mapped.tournament.series_id, mapped.tournament.name, mapped.tournament.type, mapped.tournament.country, mapped.tournament.begin_at, mapped.tournament.end_at]);
        }

        if (mapped.team1.id) await client.query(SQL.team, [mapped.team1.id, mapped.team1.name, mapped.team1.acronym, mapped.team1.slug, mapped.team1.location, mapped.team1.image_url, mapped.team1.dark_image_url]);
        if (mapped.team2.id) await client.query(SQL.team, [mapped.team2.id, mapped.team2.name, mapped.team2.acronym, mapped.team2.slug, mapped.team2.location, mapped.team2.image_url, mapped.team2.dark_image_url]);

        await client.query(SQL.match, [
            mapped.match.id, mapped.match.slug, mapped.match.status, mapped.match.rescheduled, mapped.match.draw,
            mapped.match.match_type, mapped.match.number_of_games, mapped.match.league_id, mapped.match.series_id,
            mapped.match.tournament_id, mapped.match.scheduled_at, mapped.match.begin_at, mapped.match.original_scheduled_at,
            mapped.match.opens_at, mapped.match.winner_team_id, mapped.match.modified_at, mapped.match.raw_json
        ]);

        if (mapped.team1.id) await client.query(SQL.mteam, [mapped.match.id, mapped.team1.id, 1]);
        if (mapped.team2.id) await client.query(SQL.mteam, [mapped.match.id, mapped.team2.id, 2]);

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        process.exitCode = 1;
    } finally {
        client.release();
        // await pool.end();
    }
}

export async function getCursor(key) {
    const { rows } = await pool.query(`SELECT value FROM ingest_state WHERE key=$1`, [key]);
    return rows[0]?.value;
}
export async function setCursor(iso, key) {
    await pool.query(`INSERT INTO ingest_state (key, value) VALUES ($2,$1)
                    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [iso, key]);
}

export async function getCursorNewModified(guildId) {
    const { rows } = await pool.query(`SELECT value FROM ingest_new_modified_state WHERE guild_id=$1`, [guildId]);
    return rows[0]?.value;
}
export async function setCursorNewModified(iso, guildId) {
    await pool.query(`INSERT INTO ingest_new_modified_state (guild_id, value) VALUES ($2,$1)
                    ON CONFLICT (guild_id) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [iso, guildId]);
}

export async function matchIdToBind() {
    return pool.query(`
        SELECT id FROM matches
        WHERE status IN ('not_started','pending','running','postponed','processing')
           OR (winner_team_id IS NULL AND scheduled_at < now() - interval '1 hour')
        ORDER BY scheduled_at DESC NULLS LAST
        LIMIT 200
    `);
}