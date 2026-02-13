-- Fix city_id type: was text, needs to be uuid to match cities(id)
ALTER TABLE purchasing_power
  ALTER COLUMN city_id TYPE uuid USING city_id::uuid;

ALTER TABLE purchasing_power
  ADD CONSTRAINT purchasing_power_city_id_fkey
  FOREIGN KEY (city_id) REFERENCES cities(id);
