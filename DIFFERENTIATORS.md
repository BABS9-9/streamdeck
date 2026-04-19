# StreamDeck Differentiators

## Positioning
StreamDeck should win by feeling like a real premium streaming product, not a utility panel wrapped around IPTV credentials. The wedge is simple: faster switching, better browse context, household-friendly controls, and power-user playback insight without making the whole app feel technical.

| Feature | One-line pitch | Competitive gap | Build phase | Architecture notes |
| --- | --- | --- | --- | --- |
| Multi-connection switching | Save multiple providers and jump between them instantly without re-entering credentials. | TiviMate and IPTV Smarters can store multiple sources, but neither makes hot-swap feel like a first-class browse flow. Flix IPTV and iMPlayer still lean on setup-style connection management instead of fast provider switching. | Phase 1 foundation, Phase 2 polish | Model providers as first-class connection records in local storage and Zustand. Every favorite, watch-history item, EPG cache, search entry, and continue-watching record must be keyed by `connectionId` from day one. |
| Smart EPG overlay | Show NOW and NEXT inline on every channel card so users never leave the grid to know what is airing. | TiviMate, IPTV Smarters, Flix IPTV, and iMPlayer all rely more heavily on separate guide views, side panels, or deeper navigation. None makes inline NOW and NEXT the default browse pattern. | Phase 1 | Normalize short EPG into a small `nowNext` payload, cache by provider + stream, and render directly on cards with stale-while-revalidate refresh. |
| Continue Watching across live + VOD | One resume rail for everything the user was watching, whether live TV, replay, or VOD. | TiviMate is stronger on live continuity than the others, but none of TiviMate, IPTV Smarters, Flix IPTV, or iMPlayer delivers a truly unified live plus VOD resume model. | Phase 2 | Use one canonical playback-session model with provider ID, content kind, position, recency, and artwork. Live sessions store recency and channel context, VOD stores position. |
| Instant channel preview | Hover or focus on a channel card to get a live preview without leaving the browsing grid. | This is basically missing as a polished default in TiviMate, IPTV Smarters, Flix IPTV, and iMPlayer. Most competitors force a full navigation jump into playback. | Phase 1 prototype, Phase 2 optimize | Keep one active muted preview player, aggressively reuse the element, rate-limit preview swaps, and fall back to channel art when autoplay or bandwidth rules fail. |
| Folder / playlist organization | Let users build custom folders like Game Day, Morning News, or Kids Bedtime beyond favorites. | TiviMate and iMPlayer expose stronger customization than Flix IPTV or IPTV Smarters, but none gives users a clean, mainstream custom-folder system that feels like streaming-library curation. | Phase 2 | Create local folder entities plus ordered membership tables keyed by provider-aware content IDs. Saved smart filters can later become auto-updating folders. |
| One-click recording | Start recording live TV to local storage or a user-chosen destination with one action. | TiviMate has the clearest reputation here, but a polished web-first recording path is still rare across TiviMate, IPTV Smarters, Flix IPTV, and iMPlayer. | Phase 2+ | Abstract recording behind a capture service so browser, desktop, and native targets can diverge later without touching playback UI. |
| Search across all providers | Search once and get ranked results across every saved IPTV connection. | TiviMate, IPTV Smarters, Flix IPTV, and iMPlayer usually search only inside the active playlist or provider, not across the full saved library. | Phase 2 | Build a merged client-side index with provider labels, fuzzy matching, duplicate suppression, and ranking tuned for live relevance plus recency. |
| Watch party / sync viewing | Share a link and keep multiple viewers synced to the same stream in the same moment. | None of TiviMate, IPTV Smarters, Flix IPTV, or iMPlayer has made synchronized social viewing a real product feature. | Phase 3 | Needs a lightweight session backend for room state, stream metadata, clock sync, and drift correction. Keep playback sessions durable now so sync can layer on later. |
| Parental controls with per-profile PINs | Each household profile gets its own maturity gates and PIN instead of one blunt global lock. | TiviMate, IPTV Smarters, Flix IPTV, and iMPlayer lean toward coarse global locks, not profile-aware household controls. | Phase 2 | Add profile records, provider-aware content labels, PIN verification flows, and route guards for live, movies, and series. |
| Stream health indicator | Surface bitrate, buffer health, codec, and playback quality in a subtle power-user HUD. | TiviMate and iMPlayer have more enthusiast credibility than the others, but across all four apps playback diagnostics are still hidden, thin, or debug-like instead of being a polished user-facing HUD. | Phase 1.5 to Phase 2 | Feed HLS.js telemetry into a shared player store, reduce it to a simple health model, and surface it in a compact overlay that casual users can ignore. |

## Competitive gap snapshot

| Competitor | What they do well | Where StreamDeck should beat them first |
| --- | --- | --- |
| TiviMate | TV-first navigation, guide depth, recording reputation | Multi-provider switching, premium web UX, inline browse context, household profile features |
| IPTV Smarters Pro | Broad compatibility, user familiarity, cross-platform availability | Cleaner information architecture, stronger resume, less clutter, better cross-provider search |
| Flix IPTV | Simplicity, easy first run | Richer discovery, custom folders, preview-based surfing, better playback insight |
| iMPlayer | Enthusiast customization, deep controls | Same power under the hood with a much cleaner default experience and stronger family usability |

## Build order this doc implies
1. **Phase 1 now:** saved-provider login, inline NOW/NEXT, home hero + rails, live browser with preview, playback health HUD
2. **Phase 2 next:** unified search, continue watching across live + VOD, custom folders, parental controls, provider management polish
3. **Phase 3 later:** recording adapters and watch-party sync backend

## Architecture calls for Axe
1. Connection management cannot be bolted on later. Provider-aware IDs are mandatory now.
2. The channel card is the primary interaction primitive because EPG, preview, save, folders, and health all hang off it.
3. Playback telemetry belongs in shared state early, even if only a small HUD consumes it first.
4. Search, continue watching, and folders should all sit on one normalized content model across live, VOD, and series.
5. Anything that could become multi-device later, like profiles, recording jobs, watch parties, should use durable IDs and explicit timestamps now.

## Immediate implementation call
- Ship now: saved-provider login, inline NOW/NEXT guide context, live browser preview, provider-aware history/favorites, stream health HUD
- Ship next: unified cross-provider search, stronger continue watching, folder management, connection rename/remove/retry actions
- Hold for later: browser recording constraints, shared watch-party infrastructure
