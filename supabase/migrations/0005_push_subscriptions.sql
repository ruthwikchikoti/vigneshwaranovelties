create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  key_p256dh text not null,
  key_auth text not null,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Only authenticated admins can manage their own subscriptions
create policy "admin manage own push_subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
