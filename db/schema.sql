CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(24) UNIQUE NOT NULL, password_hash TEXT NOT NULL, coins INTEGER NOT NULL DEFAULT 500, role TEXT NOT NULL DEFAULT 'player', avatar JSONB NOT NULL DEFAULT '{"skin":"#e8ad7d","shirt":"#4b86e8","hair":"#493323"}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rooms (id SERIAL PRIMARY KEY, owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL, name VARCHAR(64) NOT NULL, description VARCHAR(240) NOT NULL DEFAULT '', is_public BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS furniture (id SERIAL PRIMARY KEY, room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL, rotation INTEGER NOT NULL DEFAULT 0, CHECK(x BETWEEN 0 AND 9), CHECK(y BETWEEN 0 AND 9));
CREATE TABLE IF NOT EXISTS inventory (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0), PRIMARY KEY(user_id,kind));
CREATE TABLE IF NOT EXISTS bans (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, reason TEXT, expires_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS messages (id BIGSERIAL PRIMARY KEY, room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, body VARCHAR(240) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
INSERT INTO rooms (name, description) SELECT 'Hotel Lobby','Meet other guests and explore Pixel Haven' WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE id=1);

-- Room-O-Matic 2.0: existing rooms receive defaults on upgrade.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS wall_color VARCHAR(16) NOT NULL DEFAULT '#827b8f';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_color VARCHAR(16) NOT NULL DEFAULT '#b3b8c8';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_pattern VARCHAR(16) NOT NULL DEFAULT 'checker';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS layout VARCHAR(16) NOT NULL DEFAULT 'classic';

-- Requests for entry to locked rooms; approvals expire and can be revoked by locking again.
CREATE TABLE IF NOT EXISTS room_entry_requests (
 id BIGSERIAL PRIMARY KEY,
 room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status VARCHAR(16) NOT NULL DEFAULT 'pending',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 decided_at TIMESTAMPTZ,
 UNIQUE(room_id,user_id),
 CHECK(status IN ('pending','approved','denied'))
);
CREATE INDEX IF NOT EXISTS idx_room_entry_requests_owner ON room_entry_requests(room_id,status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Social relationships and private messages (account-level, shared across profiles).
CREATE TABLE IF NOT EXISTS social_friendships (
 user_low INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 user_high INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_low,user_high), CHECK(user_low<user_high)
);
CREATE TABLE IF NOT EXISTS social_blocks (
 blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);
CREATE TABLE IF NOT EXISTS social_messages (
 id BIGSERIAL PRIMARY KEY,
 sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 body VARCHAR(1000) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_messages_pair ON social_messages(sender_id,recipient_id,id DESC);
CREATE TABLE IF NOT EXISTS social_message_reports (
 id BIGSERIAL PRIMARY KEY,
 reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 message_id BIGINT NOT NULL REFERENCES social_messages(id) ON DELETE CASCADE,
 reason VARCHAR(500) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(reporter_id,message_id)
);

-- Social 2.1 read receipts per account and friend conversation.
CREATE TABLE IF NOT EXISTS social_reads (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, last_read_id BIGINT NOT NULL DEFAULT 0, PRIMARY KEY(user_id,friend_id));

-- Account badges: codes are administrator-defined; grants are auditable.
CREATE TABLE IF NOT EXISTS badge_definitions (code VARCHAR(16) PRIMARY KEY, name VARCHAR(80) NOT NULL, image_path TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS user_badges (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, code VARCHAR(16) NOT NULL REFERENCES badge_definitions(code) ON DELETE CASCADE, granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL, granted_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,code));
INSERT INTO badge_definitions(code,name,image_path) VALUES('ADM','Pixel Staff','/badges/ADM.gif') ON CONFLICT(code) DO NOTHING;

-- Player Profiles 2.0: public motto, equipped badge showcase and earned achievements.
ALTER TABLE users ADD COLUMN IF NOT EXISTS motto VARCHAR(120) NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS profile_equipped_badges (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, code VARCHAR(16) NOT NULL, position SMALLINT NOT NULL CHECK(position BETWEEN 1 AND 3), PRIMARY KEY(user_id,code), UNIQUE(user_id,position), FOREIGN KEY(user_id,code) REFERENCES user_badges(user_id,code) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS profile_achievements (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, code VARCHAR(32) NOT NULL, earned_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,code));

-- Furniture Catalog 3.0: inventory-safe limited releases and purchase audit.
CREATE TABLE IF NOT EXISTS catalog_limited_stock (kind VARCHAR(40) PRIMARY KEY, remaining INTEGER NOT NULL CHECK(remaining >= 0), initial_stock INTEGER NOT NULL CHECK(initial_stock >= 0));
INSERT INTO catalog_limited_stock(kind,remaining,initial_stock) VALUES
 ('neon_arcade',250,250),('golden_fountain',100,100),('autumn_throne',175,175)
 ON CONFLICT(kind) DO NOTHING;
CREATE TABLE IF NOT EXISTS catalog_purchases (id BIGSERIAL PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind VARCHAR(40) NOT NULL,price INTEGER NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- Furniture stacking: height is a visual lift; support_id identifies a supporting table.
ALTER TABLE furniture ADD COLUMN IF NOT EXISTS stack_height INTEGER NOT NULL DEFAULT 0;
ALTER TABLE furniture ADD COLUMN IF NOT EXISTS support_id INTEGER REFERENCES furniture(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_furniture_support ON furniture(support_id);
