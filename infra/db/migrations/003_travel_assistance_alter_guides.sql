-- Adding columns 'Level' and 'Category' to calculations

ALTER TABLE travel_assistance.guides ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'beginner';
ALTER TABLE travel_assistance.guides ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'monuments';