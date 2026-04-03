-- ProTraderSim local dev database init
-- Extensions needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions to protrader user
GRANT ALL ON SCHEMA public TO protrader;

-- Allow protrader to create tables
ALTER DEFAULT PRIVILEGES FOR ROLE protrader IN SCHEMA public GRANT ALL ON TABLES TO protrader;
ALTER DEFAULT PRIVILEGES FOR ROLE protrader IN SCHEMA public GRANT ALL ON SEQUENCES TO protrader;
