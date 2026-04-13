# StreamDeck Differentiators

## Positioning
StreamDeck wins by feeling like a premium streaming product instead of a utility IPTV wrapper. The product direction is simple: fewer setup headaches, faster channel surfing, better context while browsing, and richer household features than TiviMate, IPTV Smarters Pro, Flix IPTV, and iMPlayer.

| Feature | One-line pitch | Competitive gap | Build phase | Architecture notes |
| --- | --- | --- | --- | --- |
| Multi-connection switching | Save multiple providers and jump between them instantly without re-entering credentials. | TiviMate and IPTV Smarters support multiple playlists/providers, but switching still feels admin-heavy and not first-class on web. Flix IPTV and iMPlayer also do not make rapid provider hopping a core flow. | Phase 1.5 to Phase 2 | Model providers as first-class connection records in local storage and Zustand, with a stable `connectionId`, credential vault entry, last sync time, and per-provider caches for categories, streams, EPG, favorites overlays, and search index slices. |
| Smart EPG overlay | Show NOW and NEXT inline on every channel card so users never leave the grid to know what is airing. | Most competitors bury guide details in a separate guide screen or a focus state that is too shallow. None make inline NOW/NEXT a signature browsing pattern. | Phase 1 | Fetch short EPG per stream, normalize to a lightweight `nowNext` payload, cache by `streamId`, and render directly in channel cards with stale-while-revalidate refresh. |
| Continue Watching across live + VOD | One resume rail for everything the user was watching, whether it was live TV, replay, or on-demand. | Competitors usually treat live and VOD as separate worlds. Resume is weak, inconsistent, or missing for live contexts. | Phase 2 | Persist watch sessions with a shared `PlaybackItem` shape, support VOD resume timestamps plus live recency metadata, and create a unified history service rather than feature-specific stores. |
| Instant channel preview | Hover or focus on a channel card to get a live thumbnail preview without leaving the browsing grid. | This is rare in IPTV apps and essentially absent as a polished web feature. Most require a full navigation into playback. | Phase 2 | Use a lightweight preview player layer with muted autoplay, one active preview at a time, intersection/focus guards, and adaptive HLS start rules to avoid crushing bandwidth. |
| Folder / playlist organization | Let users build custom channel folders like Game Day, Morning News, or Kids Bedtime beyond favorites. | Favorites exist everywhere, but user-defined organizational layers are weak or missing across these apps. | Phase 2 | Create a local taxonomy service for custom folders, saved filters, and pinned collections keyed by provider-aware content IDs. |
| One-click recording | Start recording live TV to local storage or a user-chosen destination with one action. | TiviMate has recording on supported devices, but web-first recording is uncommon and poorly done across competitors. | Phase 2+ | Abstract recording behind a capture service, detect browser capability, support future desktop/native adapters, and keep recording jobs separate from playback state. |
| Search across all providers | Search once and get ranked results across every saved IPTV connection. | Competitors generally search within the current playlist/provider, not across a whole user library. | Phase 2 | Build a merged client-side index across providers with provider labels, fuzzy matching, result ranking, and de-dupe heuristics. |
| Watch party / sync viewing | Share a link and keep multiple viewers synced to the same stream in the same moment. | None of the main IPTV players make synchronized social viewing a real product feature. | Phase 3 | Requires a lightweight session backend for shared room state, clock sync, stream metadata, and drift correction. Keep the playback core transport-agnostic now so synchronization can layer on later. |
| Parental controls with per-profile PINs | Each household profile gets its own maturity gates and PIN instead of one blunt global lock. | Competitors usually offer coarse global locks, not profile-aware household controls. | Phase 2 | Add profile records, content classification tags, profile PIN verification, and restricted navigation guards across live, VOD, and series screens. |
| Stream health indicator | Surface bitrate, buffer health, codec, and playback quality in a subtle power-user HUD. | Power diagnostics are either missing or too hidden in most consumer IPTV players. | Phase 1.5 to Phase 2 | Expose HLS.js telemetry through a player store, compute simplified health states, and render a compact diagnostics overlay that casual users can ignore. |

## Competitive read

### TiviMate
- Best-in-class TV-first navigation and playlist scale
- Strong guide and recording reputation on Android TV
- Still feels like a power-user utility, not a polished household streaming brand
- Opportunity: beat it on multi-provider UX, web access, inline context, and family features

### IPTV Smarters Pro
- Broad provider compatibility and familiarity in the market
- Functional, but cluttered and inconsistent across platforms
- Opportunity: cleaner IA, stronger search, better resume, faster browsing, fewer admin-feeling flows

### Flix IPTV
- Simple and approachable, but thin on advanced experience design
- Opportunity: richer organization, better discovery, higher-end playback and household controls

### iMPlayer
- Advanced customization for enthusiasts
- Can feel busy and configuration-heavy
- Opportunity: keep enthusiast depth under the hood while making the primary experience feel premium and simple

## Architecture implications for Axe
1. Connection management cannot be bolted on later. Use provider-aware IDs and stores from day one.
2. The channel card needs to become the main interaction primitive, because EPG overlay, preview, favorites, folders, and health all hang off it.
3. Playback telemetry should enter a shared player store early, even if the first UI only shows a small status chip.
4. Search, continue watching, and folders should use one canonical normalized content model across live, VOD, and series.
5. Watch party is phase 3, but playback session objects should already have durable IDs and timestamps so later sync work is additive, not a rewrite.

## Recommendation
For the prototype, prioritize the foundation that unlocks multiple differentiators quickly:
- Phase 1 now: smart EPG overlay, provider-aware connection model, shared playback/watch history model
- Next immediately after prototype: multi-connection switching, search across providers, stream health HUD
- Hold until core browsing is excellent: watch party and one-click recording
