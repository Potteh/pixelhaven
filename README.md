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

### Owner, staff moderation, reports, and furniture trading

After registering your own account, assign **owner** on the VPS (replace YOUR_USERNAME):

```bash
docker compose exec db psql -U pixelhaven -d pixelhaven -c "UPDATE users SET role='owner' WHERE lower(username)=lower('YOUR_USERNAME');"
```

Alternatively, set `PIXELHAVEN_OWNER_USERNAME=YOUR_USERNAME` in the **application container environment** before starting the app. The owner can appoint or demote admins and moderators in the **🛡️ Staff** panel. Do not give untrusted accounts owner access.

- **Owner:** assign staff roles, warn, ban/unban, adjust credits, review reports and staff actions.
- **Admin:** warn, ban/unban, adjust credits, review reports.
- **Moderator:** warn players and review, pick up, resolve, or dismiss reports.
- **Players:** file reports and propose item-for-item trades. Incoming trades must be accepted by the other player.
- **Coin tokens:** buy nickels (5), quarters (25), or gold bars (1000) in the Coin Exchange shop. Trade them like furniture, or redeem them from inventory for their face value. They are in-game coins only, not real-world money.

The game window has shortcuts for Rooms, Shop, Bag, Looks, Trade, Report, and Staff. Staff tools appear only for eligible roles. Moderation and trades are handled by authenticated server endpoints, with inventory transfers in a database transaction.

**Important:** Keep a database backup before deploying, especially before enabling trading. Run only one application replica. Verify permission boundaries, concurrent trades, and account recovery in staging before opening the system to the public.

### Multiple game profiles and live trades

- **👥 Profiles:** Create up to five named in-game identities under one login and switch between them. Profiles have their own avatar appearance. Coins, furniture inventory, bans, and staff permissions belong to the underlying account.
- **MOD- nameplate:** Moderators display a bold gold `MOD-` prefix before their selected profile name in rooms. The prefix is assigned by the server-side staff role, not by the player's chosen name.
- **🔄 Live Trade:** Invite a player in the same room, add furniture and/or currency tokens to both offers, then each participant locks their offer and separately confirms. Once both confirm, the server validates inventory and transfers items atomically.
- The previous asynchronous trade offers remain available from **🤝 Trade**. Players can redeem currency tokens from their inventory.

Trade invitations are cancelled if a player disconnects or changes rooms. The live trade state is in memory; restarting the app cancels unfinished live trades. Test with two separate accounts before enabling trades publicly.

### Advanced furniture interactions

Room owners can use **Edit Furniture** to select placed furniture, **Rotate 90°**, **Move** (then click an empty tile), or **Pick Up** (return to inventory). The server validates ownership and destination occupancy, persists the changes, and broadcasts them to all players in the room.

The Novelty catalog includes original illustrated **Vending Machine** (210 coins), **Teleporter** (350 coins), and **Door** (125 coins). Click a vending machine within three tiles to hold a random soda, juice, or water. Place two teleporters in the same room, then click one to teleport to the other. Click a door to play its temporary opening glow, or click the existing smoke machine to trigger a six-second smoke effect. Doors are decorative interactive furniture, not a security boundary; teleporters currently link only within the same room.

Furniture interactions are server-validated. Smoke and door effects are temporary and not stored in the database. Moving occupied seating furniture clears its seated avatar state.

### Interactive food dispensers

- **Ice Cream Machine:** Click a placed machine while standing within three tiles to receive vanilla, strawberry, or chocolate ice cream at random.
- **Fridge:** Buy a refrigerator from the Novelty catalog (180 coins). Click a placed fridge within three tiles to receive a carrot, blackcurrant, or ice cream cone (equal category odds); ice cream flavor is randomized.
- Players visibly hold the specific item, and other players see it via Socket.IO. Use **Drop Food** to clear it. Food is a temporary room interaction and does not enter inventory; changing rooms or disconnecting clears it. Dispensing has a 1.5-second cooldown.

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
- Room locking is enforced at join time, but there are no invitations, friend lists, trading, mini-games, or player reporting yet.
- Chat is rate-limited and persisted; add filtering, reporting, audit tools, and dedicated moderation before opening a public community.
- Coin balances start at 500. There is no real-money billing or currency earning loop.
- Run one application replica only: room presence currently lives in process memory. Multi-instance scaling requires a Socket.IO Redis adapter and shared presence.
- Add automated tests, monitoring, backups, stronger production rate limiting, CSRF considerations for future cookie auth, and a CDN if traffic grows.

### Room-O-Matic 2.0 and owner moderation

Create a room with customizable wall and floor colors, flooring patterns (checker, solid, wood, tiles), and room styles (classic, lounge, studio). The isometric play grid remains 10 × 10; styles alter decoration and flooring rather than the room's physical dimensions. Room owners can use **🎨 Room Settings** above the room canvas to change the room name, description, appearance, and open/locked status. Updates persist in PostgreSQL and broadcast to connected guests.

Room owners see **Kick** next to other guests in the room's player list. Kicking removes all selected socket's presence immediately and prevents that account from rejoining the same room for 10 minutes (in-memory cooldown, reset on server restart). Guests receive an explanation and return to the hotel lobby. Room ownership is verified on the server; players cannot kick the room owner. Changing an open room to locked removes guests who are not the owner.


### Locked-room entry requests
Guests can discover locked rooms in the hotel navigator and click **Request Entry**. Owners review pending requests from **Your Rooms → Entry Requests**, approving or denying each guest. Approvals are stored in PostgreSQL and allow that guest to join the locked room; a guest receives a live decision notification. Kicking a guest revokes their approval and temporarily blocks re-entry. Changing an open room to locked clears prior approvals and removes existing non-owner guests. Cosmetic edits to already locked rooms do not revoke approvals.

### Staff chat logs
Moderators, admins, and owners can open **Staff → Chat Logs** to review saved room messages, filter by room ID, user ID, or message text, and page through older messages. Each entry shows username, room, timestamp, and message. The API requires authenticated staff permissions, caps results at 100 per request, and uses parameterized SQL. This covers persisted room chat, not private direct messages. Chat history is retained in the existing messages table; configure retention and staff access policies as appropriate.
