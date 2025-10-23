INSERT INTO ingest_state (key, value)
VALUES ('ps_incoming_modified', to_char((now() - interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
ON CONFLICT (key) DO NOTHING;