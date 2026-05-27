ALTER TABLE travel_buddies.attachments
    ADD COLUMN IF NOT EXISTS original_filename text;
