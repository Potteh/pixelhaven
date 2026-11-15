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
