# Overtime Meal Web (Deploy Ready)

## Local Run

```bash
npm install
npm start
```

Open: `http://127.0.0.1:3000`

## Config

- `PORT` (default: `3000`)
- `CHANGE_PASSWORD` (default: `1234`)
- `ADMIN_PASSWORD` (default: same as `CHANGE_PASSWORD`)

## Storage Modes

### 1) Local mode (default)
No Supabase env set -> use local files:
- `data/seed.json`
- `data/state.json`
- `data/admin-logs.json`

### 2) Supabase mode (for Vercel)
Set both env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase SQL (normalized tables)

```sql
create table if not exists public.restaurants (
  name text primary key
);

create table if not exists public.drinks (
  tc text primary key,
  sc text not null,
  en text not null,
  paused boolean not null default false
);

create table if not exists public.staff (
  id bigserial primary key,
  dept text not null,
  name text not null,
  unique (dept, name)
);

create table if not exists public.menus (
  id bigserial primary key,
  restaurant text not null,
  category text not null,
  name_tc text not null,
  name_sc text not null,
  name_en text not null,
  price numeric(10,2) not null,
  unique (restaurant, category, name_tc)
);

create table if not exists public.app_state (
  id int primary key,
  date text not null,
  restaurant text null,
  cutoff_time text null
);

create table if not exists public.orders (
  id bigserial primary key,
  app_id text not null default 'main',
  date text not null,
  dept text not null,
  name text not null,
  food text not null,
  addon text not null default '',
  drink text not null default '',
  ordered_at timestamptz null,
  price numeric(10,2) not null,
  unique (date, app_id, dept, name)
);

insert into public.app_state (id, date, restaurant)
values (1, to_char(now(), 'YYYY-MM-DD'), null)
on conflict (id) do nothing;
```

If `app_state` already exists, run:

```sql
alter table public.app_state
add column if not exists cutoff_time text null;
```

If `drinks` already exists, also run:

```sql
alter table public.drinks
add column if not exists paused boolean not null default false;
```

If `orders` already exists, also run:

```sql
alter table public.orders
add column if not exists app_id text not null default 'main';

alter table public.orders
add column if not exists ordered_at timestamptz null;

update public.orders
set app_id = 'main'
where app_id is null or app_id = '';

alter table public.orders
drop constraint if exists orders_date_dept_name_key;

alter table public.orders
drop constraint if exists orders_date_app_id_dept_name_key;

alter table public.orders
add constraint orders_date_app_id_dept_name_key unique (date, app_id, dept, name);
```

Important:
- If `app_state.cutoff_time` is missing, changing cutoff time will fall back to `13:00` after refresh.
- If `orders.app_id` is missing, main and Lady Ruby orders cannot be separated safely, and reset actions may affect the wrong page.

## Supabase Security Hardening

This app uses the server-side `SUPABASE_SERVICE_ROLE_KEY`, so you can safely enable RLS on the tables below without breaking the website. The service role bypasses RLS, while direct browser access from `anon` / `authenticated` will be blocked.

```sql
alter table if exists public.restaurants enable row level security;
alter table if exists public.drinks enable row level security;
alter table if exists public.staff enable row level security;
alter table if exists public.menus enable row level security;
alter table if exists public.app_state enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.app_kv enable row level security;
create table if not exists public.admin_users (
  username text primary key,
  password_hash text not null,
  permissions jsonb not null default '[]'::jsonb,
  staff_departments jsonb not null default '[]'::jsonb
);
create table if not exists public.admin_logs (
  id text primary key,
  created_at timestamptz not null default now(),
  username text not null,
  action text not null,
  section text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb
);
alter table if exists public.admin_users
add column if not exists staff_departments jsonb not null default '[]'::jsonb;
alter table if exists public.admin_users enable row level security;
alter table if exists public.admin_logs enable row level security;

revoke all on table public.restaurants from anon, authenticated;
revoke all on table public.drinks from anon, authenticated;
revoke all on table public.staff from anon, authenticated;
revoke all on table public.menus from anon, authenticated;
revoke all on table public.app_state from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.app_kv from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.admin_logs from anon, authenticated;
```

If you later decide to use Supabase directly from the browser, add explicit policies for only the tables and actions you need before exposing them.

## Web Pages

- Frontend: `/`
- Admin UI: `/admin/`

Admin UI can manage:
- import data (Excel/CSV/JSON)
- restaurants
- drinks (tc/sc/en)
- departments + staff
- menus (restaurant/category/items)

Also in admin:
- Traditional/Simplified auto conversion for drink/menu Chinese fields.

## APIs

- `GET /api/bootstrap`
- `GET /api/menu?restaurant=...`
- `POST /api/restaurant`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/export/csv`
- `POST /api/import/seed`

Admin:
- `GET /api/admin/seed?password=...`
- `POST /api/admin/seed` with `{ password, seed }`
- `POST /api/admin/reset-day` with `{ password }`

## Vercel Deployment

1. Push this repo to GitHub.
2. In Vercel, import the repo.
3. Add Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CHANGE_PASSWORD`
   - `ADMIN_PASSWORD`
4. Deploy / Redeploy.

## Notes

- `.xlsx` export is generated on browser side (button: 匯出 XLSX).
- CSV export includes UTF-8 BOM (no Chinese garbled text in Excel).
- Frontend no longer has import section; import is in admin page only.
