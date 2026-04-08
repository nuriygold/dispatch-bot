# Expo App

Screens:
- Pair (manual URL entry or QR payload)
- Campaign list/detail
- Plan selection
- Task submit

Networking:
- REST to orchestrator base URL after pairing.
- WS connect to `<base>/ws` for live progress and periodic campaign snapshots.

Running:
1) `npm install`
2) `npm run start`
3) Pair with `http://HOST:3000` or scan a QR JSON payload such as `{"baseUrl":"http://HOST:3000","wsUrl":"ws://HOST:3000/ws"}`.

Remaining TODO:
- Polish the live progress UI for long-running campaigns.
- Add a dedicated memory search screen.
- Add production-grade auth before exposing outside a trusted network.
