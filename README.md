# Pixel Haven — self-hosted multiplayer social hotel

An original, Habbo-inspired isometric browser game. Includes account registration/login, password hashing, JWT sessions, persistent rooms, avatar colors, real-time movement and room chat, coins, catalog purchases, inventory, room-owner furniture placement, room discovery and a basic admin ban API.

## Ubuntu VPS installation (Docker)

1. Install Docker Engine and the Docker Compose plugin using the official Docker Ubuntu instructions: https://docs.docker.com/engine/install/ubuntu/
2. Upload/extract this directory on the VPS (for example `/opt/pixel-haven`) and enter it.
3. Create a secrets file:

   ```bash
   cp .env.example .env
   # Generate two independent random secrets; copy them into .env:
   openssl rand -hex 24
   openssl rand -hex 48
   nano .env
   chmod 600 .env
   ```

   Use the first generated value for `POSTGRES_PASSWORD` and the second for `JWT_SECRET`. Keep the PostgreSQL password alphanumeric/hex so the DATABASE_URL remains valid.
4. Build and launch:

   ```bash
   docker compose up -d --build
   docker compose ps
   docker compose logs -f app
   curl http://127.0.0.1:3000/health
   ```

5. For a real domain, point its DNS A record at your VPS and reverse proxy HTTPS to `127.0.0.1:3000`. Example Caddyfile:

   ```caddy
   hotel.example.com {
       reverse_proxy 127.0.0.1:3000
   }
   ```

   Caddy handles WebSocket upgrades automatically. Replace `hotel.example.com` with your own domain. Open TCP 80 and 443 in your VPS firewall; keep port 3000 private.

### Testing by IP address

For a temporary non-HTTPS test, set `BIND_IP=0.0.0.0` in `.env`, run `docker compose up -d`, then visit `http://YOUR_VPS_IP:3000`. Firewall-restrict access to trusted IPs; use HTTPS for production.

### Admin setup

After registering your own account, promote it manually from the VPS:

```bash
docker compose exec db psql -U pixelhaven -d pixelhaven -c "UPDATE users SET role='admin' WHERE username='YOUR_USERNAME';"
```

Authenticated admins can POST `/api/mod/ban` with JSON `{ "userId": 123, "reason": "..." }` and their Bearer token. This first release has an API for bans, not a graphical moderation console.

### Operations

```bash
docker compose logs -f app
docker compose restart app
docker compose down              # stop, preserve database volume
docker compose up -d --build    # deploy new code
```

Back up the database regularly:

```bash
docker compose exec -T db pg_dump -U pixelhaven pixelhaven > pixelhaven-backup.sql
```

**Never** run `docker compose down -v` unless you intend to delete persistent data.

### Current limitations / roadmap

- This is an installable multiplayer MVP, **not** a feature-complete Habbo clone. Art is procedurally drawn isometric tiles, emoji furniture, and simple avatars; original sprite sheets, animation, and collision/pathfinding are future improvements.
- Room privacy is enforced at join time, but there are no invitations, friend lists, trading, mini-games, or player reporting yet.
- Chat is rate-limited and persisted; add filtering, reporting, audit tools, and dedicated moderation before opening a public community.
- Coin balances start at 500. There is no real-money billing or currency earning loop.
- Run one application replica only: room presence currently lives in process memory. Multi-instance scaling requires a Socket.IO Redis adapter and shared presence.
- Add automated tests, monitoring, backups, stronger production rate limiting, CSRF considerations for future cookie auth, and a CDN if traffic grows.
