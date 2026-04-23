# Play With Viewers Twitch Worker

This worker delivers Twitch chat integration for the shared Play With Viewers queue.

## Architecture

- Convex remains the source of truth for queue state, selection state, cooldowns, linked identities, and delivery results.
- Discord and Twitch are platform identities on the same `viewerQueues`, `viewerQueueEntries`, `viewerQueueRounds`, and `viewerQueueNotifications` pipeline.
- The worker only calls generated public Convex refs:
  - `api.queries.creatorTools.playingWithViewers.twitch.getEnabledQueuesForWorker`
  - `api.queries.creatorTools.playingWithViewers.twitch.getQueueSnapshotForWorker`
  - `api.queries.creatorTools.playingWithViewers.twitch.getPendingNotificationsForWorker`
  - `api.actions.creatorTools.playingWithViewers.twitch.enqueueViewerFromWorker`
  - `api.actions.creatorTools.playingWithViewers.twitch.leaveViewerFromWorker`
  - `api.actions.creatorTools.playingWithViewers.twitch.recordNotificationResultFromWorker`
  - `api.actions.creatorTools.playingWithViewers.twitch.deferNotificationFromWorker`
- The worker never calls `internal.*` refs and does not use Convex admin auth.

## Convex Deploy

1. Set Convex env:
   - `TWITCH_CONVEX_ADMIN_KEY`
2. Deploy backend code:
   - `bun run --cwd packages/backend deploy`
3. Regenerate bindings locally if needed:
   - `bun run --cwd packages/backend codegen`
4. Run the one-off linked-account backfill before starting the worker:
   - `bunx convex run users:backfillConnectedAccountsFromClerk '{}'`

If you want to limit the first pass:

```bash
bunx convex run users:backfillConnectedAccountsFromClerk '{"limit": 100}'
```

## Web Deploy

- Deploy `apps/web` to Vercel normally.
- Do not add Twitch worker secrets to the Vercel runtime.
- Release gate:

```bash
bun run --cwd apps/web build
```

## Worker Env

Required `apps/twitch` env vars:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_BOT_ACCESS_TOKEN`
- `TWITCH_BOT_REFRESH_TOKEN`
- `TWITCH_BOT_USER_ID`
- `TWITCH_BOT_USER_LOGIN`
- `TWITCH_EVENTSUB_ENABLED`
- `TWITCH_CONVEX_URL`
- `TWITCH_CONVEX_ADMIN_KEY`
- `TWITCH_TOKEN_STORE_PATH`

Recommended Twitch scopes for the bot token:

- `user:read:chat`
- `user:write:chat`
- `user:bot`
- `user:manage:whispers`

## VPS Deploy

Start command:

```bash
bun run --cwd apps/twitch start
```

Suggested systemd unit:

```ini
[Unit]
Description=Cleo Twitch Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/cleo-cod-stats
EnvironmentFile=/srv/cleo-cod-stats/apps/twitch/.env
ExecStart=/usr/local/bin/bun run --cwd apps/twitch start
Restart=always
RestartSec=5
User=cleo
Group=cleo

[Install]
WantedBy=multi-user.target
```

## Token Persistence

- `TWITCH_TOKEN_STORE_PATH` must point to a persistent writable file.
- Keep the file outside ephemeral deploy directories.
- Recommended permissions:
  - owner-read/write only
  - service account owned

Example:

```bash
mkdir -p /var/lib/cleo
touch /var/lib/cleo/twitch-bot-tokens.json
chmod 600 /var/lib/cleo/twitch-bot-tokens.json
chown cleo:cleo /var/lib/cleo/twitch-bot-tokens.json
```

## Runtime Behavior

- Subscription sync loop: every 60 seconds
- Pending notification drain loop: every 5 seconds
- Twitch invite delivery:
  - whisper first
  - chat fallback on whisper failure or unavailability
  - pending deferral with persisted backoff on rate-limit or transient errors

## Validation Commands

Run after deploy preparation:

```bash
bun run --cwd packages/backend codegen
bun run --cwd packages/backend test
bun run --cwd apps/twitch typecheck
bun run --cwd apps/web test
bun run --cwd apps/web build
bun run lint
bun run typecheck
bun run coverage
```
