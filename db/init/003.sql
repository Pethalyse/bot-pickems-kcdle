ALTER TABLE guild_settings
    ADD COLUMN IF NOT EXISTS vote_channel_id TEXT;
