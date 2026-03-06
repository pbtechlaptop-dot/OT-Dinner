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
  en text not null
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
  restaurant text null
);

create table if not exists public.orders (
  id bigserial primary key,
  date text not null,
  dept text not null,
  name text not null,
  food text not null,
  addon text not null default '',
  drink text not null default '',
  price numeric(10,2) not null,
  unique (date, dept, name)
);

insert into public.app_state (id, date, restaurant)
values (1, to_char(now(), 'YYYY-MM-DD'), null)
on conflict (id) do nothing;
```

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
