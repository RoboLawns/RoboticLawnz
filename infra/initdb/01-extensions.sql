-- Runs once on first boot of the postgis image.
-- The base image already enables postgis, but pgcrypto (for gen_random_uuid)
-- needs an explicit CREATE.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
