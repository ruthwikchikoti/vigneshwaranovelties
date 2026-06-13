-- Idempotency key for inquiries.
--
-- The offline inquiry queue (PWA) replays failed submissions via Background
-- Sync. Over flaky networks the same inquiry can be POSTed more than once, so
-- the client now sends a stable per-submission `idempotency_key`. A UNIQUE
-- constraint makes a duplicate insert fail with SQLSTATE 23505, which the
-- /api/inquiry route catches and treats as an already-processed success — no
-- duplicate row, email, or push.
--
-- Nullable: direct/legacy submissions without a key are still allowed (NULLs
-- are exempt from UNIQUE), only keyed duplicates are blocked.

alter table public.inquiries
  add column if not exists idempotency_key uuid;

create unique index if not exists inquiries_idempotency_key
  on public.inquiries (idempotency_key)
  where idempotency_key is not null;
