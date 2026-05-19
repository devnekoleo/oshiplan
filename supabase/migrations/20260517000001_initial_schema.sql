-- =============================================
-- OshiPlan 初期スキーマ
-- =============================================

create type artist_category as enum (
  'idol', 'artist', '2.5d', 'anime', 'sports', 'other'
);

create type affiliate_type as enum (
  'hotel', 'transit', 'goods'
);

create table public.users (
  id               uuid        primary key references auth.users(id) on delete cascade,
  email            text        not null,
  display_name     text,
  home_station     text,
  daily_ai_used    int         not null default 0,
  daily_ai_reset_at date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.artists (
  id          uuid             primary key default gen_random_uuid(),
  user_id     uuid             not null references public.users(id) on delete cascade,
  name        text             not null check (char_length(name) between 1 and 50),
  category    artist_category  not null,
  created_at  timestamptz      not null default now()
);

create table public.venues (
  id                 uuid   primary key default gen_random_uuid(),
  slug               text   not null unique,
  name               text   not null,
  prefecture         text   not null,
  address            text,
  lat                float,
  lng                float,
  capacity           int,
  rakuten_area_code  text,
  created_at         timestamptz not null default now()
);

create table public.plans (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references public.users(id) on delete set null,
  artist_id   uuid        references public.artists(id) on delete set null,
  event_name  text        not null check (char_length(event_name) between 1 and 80),
  venue_name  text        not null check (char_length(venue_name) between 1 and 80),
  venue_slug  text        references public.venues(slug) on delete set null,
  event_date  date        not null,
  event_time  time,
  departure   text        not null,
  budget_hint int         check (budget_hint >= 0),
  plan_json   jsonb       not null default '{}',
  share_token text        unique,
  is_archived bool        not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.affiliate_clicks (
  id                uuid           primary key default gen_random_uuid(),
  plan_id           uuid           references public.plans(id) on delete set null,
  affiliate_type    affiliate_type not null,
  affiliate_partner text           not null,
  clicked_at        timestamptz    not null default now()
);

create table public.plan_records (
  id          uuid        primary key default gen_random_uuid(),
  plan_id     uuid        not null references public.plans(id) on delete cascade,
  user_id     uuid        not null references public.users(id) on delete cascade,
  memo        text,
  actual_cost int         check (actual_cost >= 0),
  created_at  timestamptz not null default now()
);

create index idx_artists_user_id      on public.artists(user_id);
create index idx_plans_user_id        on public.plans(user_id);
create index idx_plans_event_date     on public.plans(event_date);
create index idx_plans_share_token    on public.plans(share_token) where share_token is not null;
create index idx_plans_venue_slug     on public.plans(venue_slug);
create index idx_affiliate_plan_id    on public.affiliate_clicks(plan_id);
create index idx_plan_records_plan_id on public.plan_records(plan_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();
