# StreamDeck

Premium IPTV player web prototype for BABcorp.

## Included in this ship
- `DIFFERENTIATORS.md` with product positioning and architecture notes
- Local mock Xtream Codes provider on `localhost:3579`
- Next.js app scaffold with:
  - login screen
  - saved connection flow
  - home dashboard
  - live TV browser with category filter, inline NOW/NEXT EPG, favorites, and live playback
  - movies, series, and settings shells wired to real mock data

## Run it

### 1. Start mock provider
```bash
npm run mock
```

### 2. Start app
```bash
npm run dev
```

Open `http://localhost:3000`.

### Demo credentials
- Server URL: `http://localhost:3579`
- Username: anything
- Password: anything

## Architecture
- `src/lib/xtream-api.ts` handles Xtream auth, category fetches, stream lists, EPG, and URL construction
- `src/lib/storage.ts` handles local persistence for connections, favorites, and watch history
- Zustand stores hold auth, favorites, and player state
- `mock-provider/server.js` returns realistic fake categories, channels, VOD, series, and EPG data
