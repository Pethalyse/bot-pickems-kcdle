CREATE TABLE IF NOT EXISTS ingest_state (
                                            key TEXT PRIMARY KEY,
                                            value TEXT NOT NULL,
                                            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ingest_state (key, value)
VALUES ('ps_modified_from', to_char((now() - interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
ON CONFLICT (key) DO NOTHING;
