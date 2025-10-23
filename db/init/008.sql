DELETE FROM ingest_state WHERE key = 'ps_incoming_modified';

CREATE TABLE IF NOT EXISTS ingest_new_modified_state (
                                            guild_id TEXT PRIMARY KEY REFERENCES guild_settings(guild_id) ON DELETE CASCADE,
                                            value TEXT NOT NULL,
                                            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ingest_new_modified_state (guild_id, value)
SELECT guild_id, to_char((now() - interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
FROM guild_settings
ON CONFLICT (guild_id) DO NOTHING;
