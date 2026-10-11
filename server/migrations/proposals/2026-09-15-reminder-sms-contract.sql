-- PROPOSED ONLY. Not in the automatic migration directory listing.
-- Apply through the normal backed-up migration process only after separate review.
-- Existing rows remain NULL; no backfill, activation, channel change or data repair.
ALTER TABLE reminder_rules ADD COLUMN eventType TEXT;
ALTER TABLE reminder_rules ADD COLUMN timingType TEXT;
ALTER TABLE reminder_rules ADD COLUMN daysOffset INTEGER;
ALTER TABLE reminder_rules ADD COLUMN templateKey TEXT;
