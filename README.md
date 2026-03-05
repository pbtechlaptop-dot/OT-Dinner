# Overtime Meal Web (No Google Apps Script)

## Run

```bash
npm start
```

Open: `http://127.0.0.1:3000`

## Config

- `PORT` (default: `3000`)
- `CHANGE_PASSWORD` (default: `1234`)

Example:

```bash
set CHANGE_PASSWORD=yourpass
npm start
```

## Data Files

- `data/seed.json`: restaurants, staff, drinks, menu source data
- `data/state.json`: today's selected restaurant + today's orders (auto reset by date)

## Current Features

- Set today's restaurant
- Force-change restaurant with password and clear existing orders
- Submit order (upsert by dept + name)
- Order table + total amount
- Drink summary
- Export CSV

## Notes

- This version is standalone and does not depend on Google Apps Script.
- If you need Google Sheets sync, we can add it as a next step via Sheets API.

## Import Data (Excel/CSV/JSON)

You can import from web page section "匯入資料".

Supported files:
- `.json`: same structure as `data/seed.json`
- `.xlsx/.xls/.csv`: first sheet must include headers:
  - `type, restaurant, category, item, price, dept, name, drink`

Row mapping:
- `type=RESTAURANT`: use `restaurant`
- `type=STAFF`: use `dept`, `name`
- `type=DRINK`: use `drink`
- `type=MENU`: use `restaurant`, `category`, `item`, `price`

Important:
- Import will overwrite seed data and reset today's restaurant/orders.
