-- Adding columns 'Total' and 'Currency' to calculations

ALTER TABLE travel_assistance.calculations ADD COLUMN IF NOT EXISTS total numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE travel_assistance.expenses ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PLN';
