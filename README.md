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

Optional:
- `SUPABASE_STORE_TABLE` (default: `app_kv`)

## Supabase SQL (run once)

```sql
create table if not exists public.app_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_app_kv_updated_at
before update on public.app_kv
for each row execute function public.touch_updated_at();
```

## Web Pages

- Frontend: `/`
- Admin backend UI: `/admin.html`

Admin UI can manage:
- restaurants
- drinks (tc/sc/en)
- departments + staff
- menus (restaurant/category/items)

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
3. Add Environment Variables in Vercel Project Settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CHANGE_PASSWORD`
   - `ADMIN_PASSWORD`
4. Deploy.

Project already includes `vercel.json` and `api/index.js` for Vercel routing.

## Notes

- `.xlsx` export is generated on browser side (button: 匯出 XLSX).
- CSV export includes UTF-8 BOM (no Chinese garbled text in Excel).
