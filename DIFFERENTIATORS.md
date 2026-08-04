# StreamDeck Differentiators

## Positioning

StreamDeck is not trying to be another IPTV admin panel with a prettier skin. It should feel like a premium streaming product first and a utility second: fast to connect, calm under provider instability, and polished enough that users stop feeling like they are borrowing backend tooling.

## Core Differentiators

### 1. Premium-first browsing
- The first-run experience should feel closer to Netflix or Roku than to a reseller dashboard.
- Home, Live, Movies, and Series should emphasize artwork, hierarchy, mood, and fast scanning.
- The user should never need to understand Xtream terminology after the initial connection step.

### 2. Honest provider trust
- IPTV sources fail in messy ways: auth drift, expired accounts, maxed lines, bad guide data, partial catalogs, and broken streams.
- StreamDeck should surface that truth clearly without making the interface feel alarming or technical.
- A provider can be connected but still unhealthy for playback; the product should say so plainly.

### 3. Fast rescue without losing context
- When a source degrades, the app should preserve the user’s intent: keep the same category, title, channel, or resume context whenever possible.
- Recovery should be attached to the current surface, not hidden in Settings.
- Fallback should feel like a continuation, not a reset.

### 4. Multi-provider continuity
- Many IPTV users keep backup providers. Most current players treat those providers as separate silos.
- StreamDeck should make switching feel intentional and low-friction, with saved credentials, status checks, and direct handoff into browse or playback.
- The strongest provider should be easy to spot before the user blames the app.

### 5. Playback with useful feedback
- Buffering, manifest issues, and degraded stream health should be visible in human language.
- Users should get enough signal to decide whether to retry, switch providers, or wait, without reading raw codec or server jargon.
- The player should remember progress cleanly for on-demand content and keep live playback simple.

### 6. Real-world caching
- IPTV providers are inconsistent. Cached home data, search catalogs, watch history, and favorites should keep the app useful during brief outages.
- Cached state should be honest about freshness.
- “Still useful while reconnecting” is a competitive feature.

### 7. One shell across web and TV
- The web prototype should already think like a future Android TV / Fire TV app.
- Navigation, focus order, rows, cards, player controls, and information density should translate cleanly to a remote-first experience later.
- Web is the proving ground, not a throwaway demo.

### 8. Surface fallback equivalence
- Ranking the healthiest fallback provider is not enough; the product also needs to say whether that fallback is truly the same experience, a close substitute, or a reset-level downgrade.
- Login, Home, and Live should tell the truth about how much continuity really survives the fallback before the user taps into it.
- Rescue should feel premium when it is genuinely equivalent, and honest when it is only approximate.

### 9. Surface launch readiness
- Premium streaming products make the next move feel obvious. IPTV players usually leave the user guessing whether a screen is merely loaded, actually safe to launch from, or already sliding into recovery.
- Login, Home, and Live should each publish what makes the next action safe right now, what signal is still blocking confidence, and what the fastest honest recovery move is.
- The shell should never make the user translate provider health into launch confidence on their own.

### 10. Surface continuity window
- Users should not have to guess how long StreamDeck can keep their exact setup, browse, or channel intent intact once the provider starts wobbling.
- Login, Home, and Live should publish the exact continuity window they are preserving, when the shell is only borrowing time from cache or fallback, and what forces a reset.
- Premium rescue means preserving intent for as long as the product can honestly hold it, then naming the downgrade before trust breaks.

### 11. Surface downgrade ladder
- A premium IPTV shell should not hide the sequence of compromises it is already making on the user's behalf.
- Login, Home, and Live should publish the exact downgrade ladder from exact continuity, to approximate rescue, to honest restart so users know what they still keep before they tap again.
- The app should make each rung feel intentional instead of letting degraded states blur together into vague "something is wrong" copy.

### 12. Surface provider-choice truth
- Backup providers are only helpful if StreamDeck tells the truth about when it may choose for the user versus when it must ask.
- Login, Home, and Live should publish when one provider clearly preserves the same outcome, what proof makes that silent handoff honest, and what ambiguity forces an explicit choice.
- Premium fallback should feel smart when equivalence is real and respectful when the decision would materially change the user's launch story.

### 13. Surface recovery route
- When a provider stops being trustworthy, the product should make the next safe move obvious without kicking the user into a generic error state.
- Login, Home, and Live should each publish the fastest recovery route, the context that still survives that handoff, and which healthier provider now owns the next launch.
- Premium recovery feels guided, not improvised.

### 14. Surface freshness truth
- Cached rescue is only premium if the user can tell what is still fresh, what is safely borrowed from the last known-good state, and what is no longer honest to launch from.
- Login, Home, and Live should each publish the freshness budget behind their current trust claims so stale auth, stale hero rails, and stale live previews never masquerade as real-time proof.
- StreamDeck should feel calm under cache, but never vague about freshness.

### 15. Demoable provider rehearsal
- Most IPTV prototypes only prove the happy path. StreamDeck should also prove what happens when auth drifts, guide data disappears, lines max out, or the account expires.
- The mock Xtream adapter should let Login, Home, and Live hot-swap those scenarios in place so the product can be demoed honestly without a live customer outage.
- A surface that can rehearse degraded truth on demand is easier to ship, easier to QA, and more trustworthy in front of real buyers.

### 16. Surface proof debt
- Premium IPTV shells should admit when part of the current confidence is borrowed from cache, saved-provider memory, or preview continuity instead of fresh provider proof.
- Login, Home, and Live should each publish what uncertainty is still being carried, what confidence is being borrowed to keep the surface useful, and what event repays that debt.
- StreamDeck should feel calm under borrowed confidence, but never vague about what still needs to be re-proven.

### 17. Surface confidence floor
- Premium polish should not survive below the minimum proof needed to make the next move honest.
- Login, Home, and Live should each publish the minimum proof still holding, the downgrade mode that takes over when confidence slips, and the hard-stop trigger that ends premium posture entirely.
- StreamDeck should feel cinematic while confidence is real, and visibly downgrade before style outruns truth.

### 18. Surface claim ceiling
- Premium copy should stop exactly where current proof stops.
- Login, Home, and Live should each publish the strongest promise they can still make, the overclaim they must suppress, and the proof that earns premium language back.
- StreamDeck should sound ambitious only when the surface has actually re-earned that ambition.

### 19. Surface rescue receipt
- Recovery should leave a visible receipt instead of silently changing the product story under the user.
- Login, Home, and Live should each publish what context survived, what changed under the hood, and what the user should reconfirm before treating rescue as seamless.
- StreamDeck should make fallback feel guided and premium when the receipt is clear, and explicitly non-seamless when it is not.

### 20. Surface launch ownership
- Premium fallback should make it obvious which provider or rescue path currently owns the next tap.
- Login, Home, and Live should each publish who owns the next launch, what proof keeps that owner honest, and what event transfers control to another provider or recovery route.
- StreamDeck should never make the user guess whether Connect, a hero CTA, or Play is still owned by the current provider, borrowed from cache, or already handed to rescue.

### 21. Surface proof provenance
- Premium trust should say where the current launch confidence actually comes from before the user mistakes a polished shell for live provider certainty.
- Login, Home, and Live should each publish the proof source currently backing the next move, why that source is still honest enough to act on, and what change forces a louder disclosure.
- StreamDeck should make live proof feel strongest, cached proof feel clearly borrowed, and rescue-led proof feel explicit instead of silently bundled into the surface mood.

### 22. Surface action gate
- Premium actions should visibly downgrade before the loudest button asks the user to walk into weak proof.
- Login, Home, and Live should each publish what keeps Connect, the hero CTA, or Play premium right now, what safer fallback action should take over when proof drops, and what re-unlocks the premium path.
- StreamDeck should make the brightest action feel earned instead of letting surface polish outrun the current launch truth.

### 23. Surface fallback cost
- Premium fallback should say what convenience or certainty the user already gave up instead of letting glossy rescue copy hide the trade.
- Login, Home, and Live should each publish what visible loss the current downgrade introduced, what value still survives, and what additional loss means the shell must stop selling the fallback as premium.
- StreamDeck should make degraded rescue feel honest about cost before the user mistakes preserved continuity for a fully intact experience.

### 24. Surface identity anchor
- Premium rescue should keep naming the same provider, title, channel, or launch owner that gives the current screen its meaning instead of letting fallback blur the user's mental model.
- Login, Home, and Live should each publish what identity must stay visible, why that anchor still makes the current recovery path meaningful, and what break triggers a louder reset.
- StreamDeck should feel calm under fallback only while the surface can still say what the user is looking at and who currently owns the next move.

### 25. Surface intent lock
- Premium recovery should protect the user intent they already expressed instead of forcing them to mentally restart every time trust or fallback posture changes.
- Login, Home, and Live should each publish what intent is being protected, what drift is still acceptable while the screen stays truthful, and what break actually ends the current path.
- StreamDeck should feel steady under degraded conditions because the product keeps the same mission alive until there is a real reason to reset it.

### 26. Surface explanation boundary
- Premium shells should know exactly what truth must be stated plainly and what confidence can stay ambient instead of letting degraded states hide behind cinematic polish.
- Login, Home, and Live should each publish what must be said explicitly, what can remain implied by the product shell, and what trigger forces blunt disclosure before trust drifts into theater.
- StreamDeck should feel polished because it speaks clearly at the right moment, not because it leaves the user to decode degraded truth alone.

### 27. Surface recovery witness
- Premium recovery should leave visible proof on-screen that the same mission survived, instead of asking the user to trust fallback based on mood alone.
- Login, Home, and Live should each publish what evidence must remain attached to the current surface, what context that evidence carries forward, and what missing proof means rescue has become a disguised restart.
- StreamDeck should feel trustworthy during degraded moments because recovery leaves a witness behind, not because the shell stays cinematic.

### 28. Surface autonomy boundary
- Premium recovery should make it obvious what StreamDeck can keep maintaining automatically and what choice still belongs to the user instead of letting fallback feel like hidden automation.
- Login, Home, and Live should each publish what the shell may preserve or re-rank in place, what provider or launch decision the user still owns, and what trigger forces an explicit handoff before the product starts lying.
- StreamDeck should feel smart because automation stays inside honest boundaries, not because rescue silently rewrites the user's launch story.

### 29. Surface interruption budget
- Premium surfaces should say how much waiting, buffering, or stale proof they can absorb before the same screen stops feeling trustworthy and turns into polite delay theater.
- Login, Home, and Live should each publish what delay is still acceptable, what continuity layer keeps the surface intact during that delay, and what trigger forces recovery to take over before the shell keeps pretending nothing important changed.
- StreamDeck should feel calm under brief interruptions because the product knows its tolerance budget and names the moment that budget runs out.

### 30. Surface retry honesty
- Premium surfaces should say when retrying the same move is still genuinely preserving the user's path and when it has degraded into spinner theater.
- Login, Home, and Live should each publish what retry window is still honest, what context that retry is allowed to preserve, and what trigger means recovery or provider-switch guidance must replace retry.
- StreamDeck should feel calm under transient failure because retry remains a named contract, not a vague hope button.

### 31. Surface provider-switch truth
- Premium fallback should say exactly when the current provider has lost the right to keep owning the surface instead of burying the handoff behind "smart" rescue language.
- Login, Home, and Live should each publish what proof forces a provider switch, what user context the switch must preserve, and what evidence lets the current provider keep control.
- StreamDeck should feel smart because provider switching is visibly earned, not because silent rescue hides the ownership change.

### 32. Surface provider-return truth
- Premium fallback should say exactly when the original provider has honestly recovered enough to take the surface back instead of trapping the user on rescue longer than necessary.
- Login, Home, and Live should each publish what proof earns a return, what user context must survive that return, and what instability means rescue should stay primary.
- StreamDeck should feel deliberate because provider returns are visibly re-earned, not because the shell quietly snaps back to the old source.

### 33. Surface provider-stability truth
- Premium fallback should say when the current provider has been stable long enough to keep owning the next move instead of reacting to every wobble like a permanent recovery event.
- Login, Home, and Live should each publish the stability threshold that keeps the current provider primary, the volatility they can tolerate, and what instability means rescue must remain in control.
- StreamDeck should feel calm because stability is measured and named, not because the product hides ownership churn behind polish.

## Phase 1 Product Bar

For the Phase 1 prototype to feel differentiated, Login, Home, and Live must already prove the following:

- Login supports real Xtream credentials, multiple saved providers, and instant re-entry.
- Home feels like a streaming destination, not a form-driven tool.
- Live TV browsing is fast, category-based, and playable in-browser.
- Provider health is visible enough to build trust, but never overwhelms the main experience.
- The mock provider is realistic enough to demo auth, categories, channels, guide data, and playback without depending on a live customer account.
- Login, Home, and Live publish whether fallback keeps an exact experience, an approximate one, or a reset-level restart.
- Login, Home, and Live also publish whether the next launch is safe now, what currently blocks it, and what recovery move should take over first.
- Login, Home, and Live also publish how long exact continuity is still being preserved before the shell must downgrade the experience or force a reset.
- Login, Home, and Live also publish the downgrade ladder that names what continuity is still exact, what has already slipped to approximate rescue, and what condition forces a full restart.
- Login, Home, and Live also publish when StreamDeck may auto-pick a healthier provider, what makes that choice equivalent, and when the user must pick the provider explicitly.
- Login, Home, and Live also publish the fastest safe recovery route, what context survives that move, and when the healthiest saved provider takes over launch ownership.
- Login, Home, and Live also publish what freshness window is still live, what fallback window is still safe, and what trigger forces the surface to stop claiming current proof.
- Login, Home, and Live also publish what proof debt is still outstanding, what confidence is being borrowed to keep the surface usable, and what event repays that debt.
- Login, Home, and Live also publish the strongest promise they can still make, the overclaim they must suppress, and the proof that lifts the claim ceiling back up.
- Login, Home, and Live also publish the confidence floor that still makes the next move honest, the downgrade that takes over below it, and the hard-stop trigger that ends premium posture.
- Login, Home, and Live also publish a rescue receipt that says what context survived, what changed under the hood, and what the user should reconfirm before trusting fallback as seamless.
- Login, Home, and Live also publish which provider or rescue path currently owns the next launch, what proof keeps that owner honest, and what trigger transfers launch control.
- Login, Home, and Live also publish what proof source is backing the next move right now, why that source is still honest enough to use, and what source change must be disclosed before the shell keeps sounding premium.
- Login, Home, and Live also publish when their primary action is still premium, what downgraded action should take over first, and what proof re-unlocks the premium CTA.
- Login, Home, and Live also publish what premium convenience or certainty the current fallback already cost, what honest value is still preserved, and what further loss ends the premium rescue story.
- Login, Home, and Live also publish what identity must stay visible through fallback, what meaning that anchor preserves, and what break forces a more explicit reset.
- Login, Home, and Live also publish what user intent they are still protecting, what safe drift is allowed while that intent stays intact, and what specific break ends the current path.
- Login, Home, and Live also publish what degraded truth must now be said explicitly, what premium confidence can stay implied, and what trigger forces the shell to stop hiding behind ambient polish.
- Login, Home, and Live also publish what visible recovery witness must remain on-screen, what context that witness proves survived, and what missing proof means fallback has turned into a disguised restart.
- Login, Home, and Live also publish what trust, browse, or surf work StreamDeck may keep maintaining automatically, what provider or launch choice still belongs to the user, and what trigger forces an explicit handoff.
- Login, Home, and Live also publish how much interruption they can absorb before premium posture becomes delay theater, what continuity layer is carrying the surface during that delay, and what trigger forces recovery to take over.
- Login, Home, and Live also publish when retrying is still honest, what exact context retry preserves, and what event forces the shell to stop nudging retry and lead with recovery instead.
- Login, Home, and Live also publish when the current provider has honestly lost surface ownership, what context a switch must preserve, and what proof lets the current provider stay in control.
- Login, Home, and Live also publish when a rescue provider should hand control back to the original source, what context that return must preserve, and what instability means rescue stays primary.
- Login, Home, and Live also publish the stability threshold that keeps the current provider in charge, the volatility the shell can safely absorb, and what instability means rescue must remain the owner.
- Login, Home, and Live can be re-run against healthy, degraded, saturated, unstable, and expired mock-provider modes without leaving the product shell.

## Immediate Implementation Focus

### Login
- Clean credential capture with a strong mock-provider path for demos.
- Visible saved providers with health and reconnect affordances.
- No dead-end state after a failed auth check.
- Connect should clearly distinguish between "auth succeeded" and "this provider is ready to own the next Home launch."
- Saved-provider shortcuts should state how long they can preserve a same-provider handoff before the user needs a trust-led retry or a provider switch.
- Saved-provider shortcuts should also show the downgrade ladder from exact same-provider handoff, to approximate cached handoff, to restart-level reconnect.
- Saved-provider shortcuts should also tell the user when StreamDeck may quietly pick the healthiest provider versus when setup intent changed enough that the provider choice belongs to the user.
- Saved-provider shortcuts should also tell the user the fastest honest recovery route once the current provider should stop owning the next Home launch.
- Saved-provider shortcuts should also tell the user when auth truth is fresh, when only saved provider identity is still safe to show, and when recovery must outrank reconnect.
- Saved-provider shortcuts should also tell the user what trust debt is still unsettled, what confidence is being borrowed from saved-provider memory, and what proof repays that debt before Connect feels premium again.
- Saved-provider shortcuts should also tell the user the strongest promise Login can still make, what overclaim Connect must suppress, and what proof raises premium setup language back up.
- Saved-provider shortcuts should also tell the user the minimum trust proof still holding, the downgrade mode below that floor, and the hard-stop trigger that makes premium login posture dishonest.
- Saved-provider shortcuts should also leave a rescue receipt that says what setup context survived, what fallback logic changed under the hood, and what the user should reconfirm before Connect is treated like a seamless continuation.
- Saved-provider shortcuts should also tell the user which provider currently owns the next Home launch, what proof keeps that ownership honest, and what trigger transfers Connect ownership to rescue.
- Saved-provider shortcuts should also tell the user whether Connect is currently backed by fresh auth proof, saved-provider memory, or rescue logic, and what source switch forces louder disclosure before Login keeps sounding effortless.
- Saved-provider shortcuts should also tell the user when Connect is still the premium move, what safer recovery action should take over first, and what proof puts the premium CTA back on top.
- Saved-provider shortcuts should also tell the user what premium convenience Login already lost, what setup value still survives, and what further loss means the shell must stop presenting recovery as a polished shortcut.
- Saved-provider shortcuts should also tell the user what provider identity or next-launch owner must stay visible for Login to keep making sense, and what break means recovery has to reset more explicitly.
- Saved-provider shortcuts should also tell the user what setup intent is still protected, what trust or recovery drift can happen without breaking that intent, and what event truly forces a fresh login story.
- Saved-provider shortcuts should also tell the user what provider risk Login must now say plainly, what setup calm can stay implied by the shell, and what trigger forces blunt recovery copy before Connect stays premium.
- Saved-provider shortcuts should also leave a visible recovery witness that proves which provider survived, why it is still safe, and what missing proof would force Login to stop selling fallback as trustworthy.
- Saved-provider shortcuts should also tell the user what trust or recovery work Login can maintain automatically, what provider choice or credential change still belongs to them, and what event forces an explicit handoff back to the user.
- Saved-provider shortcuts should also tell the user how much validation delay Login can absorb while still feeling like the same setup move, what continuity layer keeps the shortcut trustworthy during that delay, and what trigger forces recovery to replace retry.
- Saved-provider shortcuts should also tell the user when retrying the same provider is still honest, what setup context that retry preserves, and what trigger means Login has to stop selling retry before it turns into delay theater.
- Saved-provider shortcuts should also tell the user when the current provider has honestly lost the next Home launch, what setup context a provider switch must preserve, and what proof keeps the current provider in control.
- Saved-provider shortcuts should also tell the user when the original provider has honestly re-earned the next Home launch, what setup context must survive returning from rescue, and what instability keeps rescue primary.
- Saved-provider shortcuts should also tell the user what provider stability threshold keeps the current owner safe, what validation jitter Login can tolerate, and what instability means rescue should stay in charge.

### Home
- Strong hero, useful summary counts, quick launch rows, and continue-watching context.
- Cache-aware loading so the screen stays believable even when the provider slows down.
- Provider status visible, but secondary to content discovery.
- The hero and quick rails should tell the user whether the featured launch is safe now or recovery-owned.
- Hero and quick rails should also say how long the current browse context is still exact before cached continuity or rescue turns into an honest downgrade.
- Hero and quick rails should also show the downgrade ladder from exact featured browse, to approximate fallback rows, to a fresh browse restart.
- Hero and quick rails should also tell the user when a healthier provider can be chosen silently because discovery stays equivalent, and when the shell must surface the trade-off.
- Hero and quick rails should also show the fastest safe recovery route when browse can stay alive but the current provider should stop owning launch.
- Hero and quick rails should also tell the user when the featured story is still live, when cached Home remains safe, and when freshness dropped far enough that recovery must lead the surface.
- Hero and quick rails should also tell the user what browse proof debt is still outstanding, what confidence is being borrowed from cache or rescue posture, and what proof repays that debt before the hero overclaims certainty.
- Hero and quick rails should also tell the user the strongest browse promise Home can still make, what overclaim the hero must suppress, and what proof raises premium browse language back up.
- Hero and quick rails should also tell the user the minimum browse proof still holding, the downgrade mode below that floor, and the hard-stop trigger that ends cinematic confidence.
- Hero and quick rails should also leave a rescue receipt that says what browse context survived, what launch ownership changed under the hood, and what the user should reconfirm before the hero still feels seamless.
- Hero and quick rails should also tell the user which provider or fallback path currently owns the next browse launch, what proof keeps that owner honest, and what event transfers ownership elsewhere.
- Hero and quick rails should also tell the user whether the next launch is backed by live provider data, safe cached browse truth, or rescue-owned proof, and what source switch must be disclosed before the hero keeps sounding current.
- Hero and quick rails should also tell the user when featured launch is still the premium move, what safer fallback action should replace it first, and what proof re-unlocks premium browse CTA language.
- Hero and quick rails should also tell the user what cinematic browse confidence Home already lost, what value still survives, and what further loss means the hero must stop acting like a premium shortcut.
- Hero and quick rails should also tell the user what provider, title, or fallback owner still anchors the browse story, and what break means Home has to stop pretending the same launch story still exists.
- Hero and quick rails should also tell the user what browse intent is still locked, what freshness or recovery drift can happen without losing that discovery story, and what break really forces a reset.
- Hero and quick rails should also tell the user what degraded browse truth Home must now say out loud, what premium confidence can remain ambient, and what trigger forces the hero to stop implying everything is still fully live.
- Hero and quick rails should also leave a visible recovery witness that proves which browse path survived, what launch owner still makes it safe, and what missing proof means the cinematic story has become confidence theater.
- Hero and quick rails should also tell the user what browse maintenance Home can keep automatic, what launch or provider decision still belongs to them, and what trigger forces the hero to hand choice back explicitly.
- Hero and quick rails should also tell the user how much refresh delay Home can absorb while still feeling like the same browse story, what continuity layer keeps that story intact during the delay, and what trigger forces recovery to outrank waiting.
- Hero and quick rails should also tell the user when retrying the current featured refresh is still honest, what discovery context that retry preserves, and what trigger means Home has to stop asking for patience and lead with recovery instead.
- Hero and quick rails should also tell the user when the current provider has honestly lost featured-browse ownership, what discovery context a provider switch must preserve, and what proof keeps the current provider controlling the hero.
- Hero and quick rails should also tell the user when the original provider has honestly re-earned featured-browse ownership, what discovery context must survive the return from rescue, and what instability means fallback should keep the hero.
- Hero and quick rails should also tell the user what browse-stability threshold keeps the current provider primary, what hero or rail volatility Home can tolerate, and what instability means rescue should stay in charge.

### Live
- Category rail, search, fast preview, guide snippets, favorites, and one-click playback.
- Selection state should stay stable while guide data fills in.
- Channel surfing should feel immediate.
- When the selected channel falls back to another provider, Live should state whether the rescue is exact-channel, same-category, or a fresh restart.
- Play should never look equally trustworthy across healthy preview, guide drift, and line-pressure scenarios; the selected card needs explicit launch-readiness truth.
- The selected card should also state how long exact-channel continuity is still being preserved before Live has to collapse down to same-category rescue or a fresh channel pick.
- The selected card should also tell the user when the original provider has honestly re-earned exact-channel ownership, what surf context must survive that return from rescue, and what instability means fallback should keep Play ownership.
- The selected card should also tell the user what surf-stability threshold keeps the current provider primary, what preview or guide volatility Live can tolerate, and what instability means rescue must stay in control.
- The selected card should also show the downgrade ladder from exact-channel surf, to same-category rescue, to a fresh channel restart.
- The selected card should also say when StreamDeck can auto-pick the healthier source because the watch target is still the same, and when rescue is ambiguous enough that the user must choose.
- The selected card should also show the fastest safe recovery route when exact-channel launch is no longer honest but same-category surf can still survive.
- The selected card should also tell the user when guide and preview proof are current, when surf context is only safely borrowed, and when stale launch confidence must give way to recovery-first copy.
- The selected card should also tell the user what surf proof debt is still outstanding, what confidence is being borrowed from preview or same-category continuity, and what proof repays that debt before Play sounds fully safe.
- The selected card should also tell the user the strongest surf promise Live can still make, what overclaim Play must suppress, and what proof raises premium playback language back up.
- The selected card should also tell the user the minimum surf proof still holding, the downgrade mode below that floor, and the hard-stop trigger that ends premium play confidence.
- The selected card should also leave a rescue receipt that says what surf context survived, what playback ownership changed under the hood, and what the user should reconfirm before preview or Play is treated as seamless.
- The selected card should also tell the user which provider or rescue path currently owns the next Play tap, what proof keeps that owner honest, and what event transfers playback ownership away from the current card.
- The selected card should also tell the user whether Play is currently backed by live preview plus guide proof, borrowed same-category continuity, or explicit rescue logic, and what source shift must be disclosed before Live keeps sounding safe.
- The selected card should also tell the user when Play is still the premium move, what rescue-first action should replace it when proof drops, and what evidence re-opens premium playback confidence.
- The selected card should also tell the user what exact-match or direct-launch confidence Live already lost, what surf value still survives, and what further loss means fallback can no longer pass as seamless.
- The selected card should also tell the user what channel, category, or launch owner still anchors the surf story, and what break means Live must stop presenting recovery as the same watch target.
- The selected card should also tell the user what surf or channel intent is still locked, what guide or rescue drift can happen without losing that target, and what break truly ends the current path.
- The selected card should also tell the user what launch or guide risk Live must now state explicitly, what surf momentum can stay ambient, and what trigger forces plain recovery language before preview seduction outruns launch truth.
- The selected card should also leave a visible recovery witness that proves what survived the degraded moment, who now owns the next launch, and what missing proof means rescue has become a disguised channel restart.
- The selected card should also tell the user when retrying preview, guide, or launch authority is still honest, what surf context that retry preserves, and what trigger means Live has to stop nudging retry and hand launch ownership to recovery.
- The selected card should also tell the user what surf continuity Live can keep automatic, what playback or provider switch still belongs to them, and what trigger forces the card to hand launch choice back explicitly.
- The selected card should also tell the user how much preview or guide delay Live can absorb while still feeling like the same surf path, what continuity layer keeps the card believable during that delay, and what trigger forces recovery to replace waiting.

- The selected card should also tell the user when the current provider has honestly lost surf ownership, what selected-card context a provider switch must preserve, and what proof keeps the current provider owning Play.

## Non-Goals For This Pass

- Full EPG management UX
- M3U import
- Recording / DVR
- Deep series resume logic
- Heavy settings complexity

Those matter later. Phase 1 wins by making connection, browsing, and playback feel dramatically better than the usual IPTV experience.
