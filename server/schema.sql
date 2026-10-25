-- Future Postgres / Supabase schema for Last Chance Rescue (the current server stores the same data in data/state.json).
-- Identity = phone number only (digits). No ID uploads.
create table members (phone text primary key, joined_at timestamptz default now());
create table listings (id text primary key, seller_phone text not null references members(phone), type text not null, area text, location_private text,
  name text, owed numeric(12,2) not null, price numeric(12,2) not null, sale_date date, auction_date date, contents text, photos jsonb, proof text, proof_type text,
  early_until timestamptz, removed boolean default false, created_at timestamptz default now());
create table deals (listing_id text primary key references listings(id), buyer_phone text not null, buyer_name text, state jsonb not null, -- held/bp/sp/billpaid/insp/bd/sd/done/meet/bos/signatures
  updated_at timestamptz default now());
create table fake_reports (id bigserial primary key, listing_id text references listings(id), seller_phone text, reported_at timestamptz default now(), open boolean default true);
create table strikes (phone text primary key, count int not null default 0);
create table bans (phone text primary key, reason text, banned_at timestamptz default now());
create table refunds (id bigserial primary key, listing_id text, buyer_phone text, amount numeric(12,2), why text, at timestamptz default now());
create table power_play (phone text primary key, credits int not null default 0);
-- Row-level security (Supabase): public can read listings where not removed and seller not banned; only the buyer/seller of a deal can read its row; admin role for reports/bans.
