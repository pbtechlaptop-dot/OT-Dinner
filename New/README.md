# New Meal Order Prototype

This folder is an isolated new version. It does not modify the existing `public`, `server.js`, or `data` files.

## Run

1. Start the existing app on port 3000.
2. In another terminal:

```bash
node New/server.js
```

Open:

- Front page: `http://127.0.0.1:3100/`
- New admin: `http://127.0.0.1:3100/admin`

The new app proxies existing `/api/...` requests to `http://127.0.0.1:3000` and stores only the new price limit in `New/settings.json`.
