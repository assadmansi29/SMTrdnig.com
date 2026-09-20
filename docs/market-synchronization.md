# Market synchronization

The market server aggregates live candle buckets once. Reaction Zone evaluation runs
on that server against the existing saved zones and the existing five-minute rule
calculator. Browsers render snapshots; they do not confirm entries or manage TP/SL.

`/api/reactions/stream` sends the same sequence and fixed event timestamps to every
connected client. Reconnects receive the current snapshot. `/api/market/time` anchors
the countdown to server UTC using monotonic elapsed time and a measured round trip.
Local timezone is only a display concern. Slow connections reconnect to current state
instead of accumulating obsolete updates.

Deployment uses one market-authority process for all users. Independent replicas or
separate local/Render deployments are not a shared authority; route all users to the
same authority before scaling. Ordinary network latency and disconnected/background
devices cannot be guaranteed physically simultaneous delivery.

Active trades and consumed IDs are checkpointed outside PostgreSQL at
`REACTION_STATE_FILE` (default `.runtime/reaction-trades.json`). On ephemeral hosting,
set this path to a persistent volume to retain checkpoints across redeployments.
Existing browser-only trades are not promoted to trusted server trades. Their old
local-storage data is left intact. New server trades survive browser reload/reconnect.

No database migrations or automatic drawing saves are used. A successful existing
manual drawing save notifies the authority to reread published zones. Unsaved local
edits are not used as a global source of signals.

Verification: `test_reaction_zone_signals.ts`, `test_reaction_trades.ts`,
`test_reaction_authority.ts`, `test_market_authority.ts`, and
`test_reaction_checkpoint.ts` under `scripts/`. The database fingerprint verifier
requires local read-only mode and runs only a read-only transaction.
