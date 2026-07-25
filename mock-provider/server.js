const http = require('http');
const { URL } = require('url');

const PORT = 3579;
const host = `http://localhost:${PORT}`;
const scenarioLabels = {
  healthy: 'Healthy mock mode',
  degradedSearch: 'Degraded search rehearsal',
  degradedLive: 'Degraded live rehearsal',
  degradedEpg: 'Degraded guide rehearsal',
  lineSaturated: 'Line saturation rehearsal',
  expiredAccount: 'Expired account rehearsal',
  authUnstable: 'Auth unstable rehearsal',
};
const logo = (seed, label = '') => `https://dummyimage.com/320x180/111827/a78bfa.png&text=${encodeURIComponent(label || seed)}`;
const poster = (seed, label = '') => `https://dummyimage.com/420x630/111827/e5e7eb.png&text=${encodeURIComponent(label || seed)}`;
const hero = (seed, label = '') => `https://dummyimage.com/1280x720/0f172a/f8fafc.png&text=${encodeURIComponent(label || seed)}`;
const streams = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
  'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
];

const pickStream = (index) => streams[index % streams.length];
const base64 = (value) => Buffer.from(value).toString('base64');

const liveCategories = [
  ['1', 'Sports'],
  ['2', 'News'],
  ['3', 'Entertainment'],
  ['4', 'Movies'],
  ['5', 'Kids'],
  ['6', 'Music'],
  ['7', 'Documentary'],
  ['8', 'Local'],
  ['9', 'Lifestyle'],
  ['10', 'International'],
].map(([category_id, category_name], index) => ({ category_id, category_name, parent_id: 0, sort: index + 1 }));

const channelNames = {
  Sports: ['TSN Prime', 'Arena One', 'GoalLine 24', 'Fight Night+', 'CourtVision', 'North Ice', 'Action Sports', 'FastTrack'],
  News: ['World Report', 'NewsNow', 'Capital Desk', '24 North', 'Global Wire', 'Metro Live'],
  Entertainment: ['Binge Central', 'Laugh Loop', 'Prime Stories', 'Reality Max', 'Drama One', 'Spotlight TV'],
  Movies: ['Cinema Hits', 'Retro Reels', 'Action Vault', 'Family Screen', 'Night Movies', 'Premiere 8'],
  Kids: ['Tiny Tunes', 'Adventure Jr', 'Cartoon Galaxy', 'Storybook TV', 'Kids Club'],
  Music: ['Pulse FM TV', 'Top 40 Live', 'Acoustic Room', 'Indie Mix', 'Classic Gold'],
  Documentary: ['Wild Planet', 'Deep History', 'Science Scope', 'True North Docs', 'Explorer HD'],
  Local: ['Toronto One', 'Ontario Live', 'City Pulse', 'Local Weather', 'Morning Ontario'],
  Lifestyle: ['Home Craft', 'Travel Loop', 'Food District', 'Wellness Now', 'Style Studio'],
  International: ['Euro Live', 'Latino Plus', 'Asia World', 'Global Culture', 'World Sport Intl'],
};

const scheduleByCategory = {
  Sports: ['Warmup Live', 'Matchday Central', 'Final Whistle', 'Northside Replay'],
  News: ['Morning Headlines', 'Capital Desk', 'World Report', 'Late Wire'],
  Entertainment: ['Prime Stories', 'Laugh Loop', 'Reality Max', 'Spotlight Tonight'],
  Movies: ['Cinema Showcase', 'Premiere Window', 'Night Features', 'After Hours'],
  Kids: ['Cartoon Time', 'Kids Clubhouse', 'Adventure Lab', 'Storybook Hour'],
  Music: ['Top 40 Live', 'Acoustic Room', 'Pulse Sessions', 'Midnight Mix'],
  Documentary: ['Science Scope', 'Deep History', 'True North Docs', 'Explorer HD'],
  Local: ['City Update', 'Morning Ontario', 'Toronto Tonight', 'Weekend Local'],
  Lifestyle: ['Food District', 'Wellness Now', 'Home Craft', 'Travel Loop'],
  International: ['Global Briefing', 'Euro Live', 'Asia World', 'World Culture'],
};

const liveStreams = liveCategories.flatMap((cat, categoryIndex) =>
  (channelNames[cat.category_name] || []).map((name, index) => ({
    num: categoryIndex * 10 + index + 1,
    name,
    stream_type: 'live',
    stream_id: 1001 + categoryIndex * 20 + index,
    stream_icon: logo(`${cat.category_name}-${index}`, name),
    epg_channel_id: `${cat.category_name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    added: '1712980800',
    category_id: cat.category_id,
    custom_sid: '',
    is_adult: '0',
    tv_archive: 0,
    tv_archive_duration: '0',
    direct_source: pickStream(index + categoryIndex),
    channel_group: cat.category_name,
    preview_art: hero(`${cat.category_name}-${index}-hero`, `${name} Preview`),
    stream_format: 'm3u8',
  }))
);

const vodCategories = [
  { category_id: '201', category_name: 'Action' },
  { category_id: '202', category_name: 'Drama' },
  { category_id: '203', category_name: 'Comedy' },
  { category_id: '204', category_name: 'Family' },
  { category_id: '205', category_name: 'Sci-Fi' },
];

const vodStreams = Array.from({ length: 24 }, (_, index) => ({
  num: index + 1,
  name: `Mock Movie ${index + 1}`,
  stream_type: 'movie',
  stream_id: 5000 + index,
  stream_icon: poster(`movie-${index + 1}`, `Mock Movie ${index + 1}`),
  backdrop_path: [hero(`movie-backdrop-${index + 1}`, `Mock Movie ${index + 1}`)],
  rating: (6.8 + (index % 4) * 0.5).toFixed(1),
  rating_5based: ((6.8 + (index % 4) * 0.5) / 2).toFixed(1),
  added: `${1712000000 + index * 86400}`,
  category_id: vodCategories[index % vodCategories.length].category_id,
  container_extension: 'm3u8',
  plot: `A polished fake VOD entry for prototype testing, centered on mock movie ${index + 1} and tuned for browsing demos.`,
  genre: ['Action', 'Drama', 'Comedy', 'Family', 'Sci-Fi'][index % 5],
  director: ['A. North', 'M. Rivera', 'S. Kent'][index % 3],
  cast: 'Harper Quinn, Theo Vale, Sara North',
  language: ['English', 'French', 'Spanish'][index % 3],
  tagline: ['Every signal tells a story.', 'A premium fake catalog entry with real browse value.', 'Prototype movie night, but polished.'][index % 3],
  releasedate: `202${index % 6}-0${(index % 8) + 1}-1${index % 9}`,
  year: String(2020 + (index % 6)),
  duration: `${100 + index} min`,
  youtube_trailer: '',
  direct_source: pickStream(index),
}));

const seriesCategories = [
  { category_id: '301', category_name: 'Drama Series' },
  { category_id: '302', category_name: 'Kids Series' },
  { category_id: '303', category_name: 'Documentary Series' },
  { category_id: '304', category_name: 'Sci-Fi Series' },
];

const series = [
  { series_id: 7001, name: 'Northern Signal', category_id: '301', cover: poster('series-1', 'Northern Signal'), backdrop_path: [hero('series-1-hero', 'Northern Signal')], plot: 'A newsroom thriller set in Toronto.', cast: 'Ava Cole, Ryan Hart', director: 'N. Mercer', genre: 'Drama', language: 'English', year: '2025', tagline: 'The city breaks first on air.', rating: '8.2' },
  { series_id: 7002, name: 'Pocket Rockets', category_id: '302', cover: poster('series-2', 'Pocket Rockets'), backdrop_path: [hero('series-2-hero', 'Pocket Rockets')], plot: 'Tiny heroes with oversized missions.', cast: 'Milo, June', director: 'C. Vale', genre: 'Kids', language: 'English', year: '2024', tagline: 'Small crew, huge saves.', rating: '7.7' },
  { series_id: 7003, name: 'Atlas Unknown', category_id: '303', cover: poster('series-3', 'Atlas Unknown'), backdrop_path: [hero('series-3-hero', 'Atlas Unknown')], plot: 'Field documentaries from overlooked places.', cast: 'Nina Vale', director: 'R. Sol', genre: 'Documentary', language: 'English', year: '2025', tagline: 'Go further than the postcard.', rating: '8.5' },
  { series_id: 7004, name: 'Station Echo', category_id: '304', cover: poster('series-4', 'Station Echo'), backdrop_path: [hero('series-4-hero', 'Station Echo')], plot: 'A deep-space relay station goes silent.', cast: 'Jae Kim, L. Mercer', director: 'I. Kade', genre: 'Sci-Fi', language: 'English', year: '2026', tagline: 'Silence is the first warning.', rating: '8.0' },
];

const filterByCategory = (items, categoryId) => (!categoryId ? items : items.filter((item) => String(item.category_id) === String(categoryId)));

const getSeriesInfo = (seriesId) => {
  const selected = series.find((item) => String(item.series_id) === String(seriesId));
  if (!selected) return { info: {}, seasons: [], episodes: {} };

  const seasons = [1, 2].map((season) => ({
    season_number: season,
    name: `Season ${season}`,
    air_date: `2025-0${season}-01`,
    episode_count: 4,
    overview: `${selected.name} season ${season} keeps the same polished mock-provider structure for UI testing.`,
    cover: selected.cover,
  }));

  const episodes = Object.fromEntries(
    seasons.map((season) => [
      season.season_number,
      Array.from({ length: 4 }, (_, index) => ({
        id: Number(`${seriesId}${season.season_number}${index + 1}`),
        episode_num: index + 1,
        title: `${selected.name} S${season.season_number}E${index + 1}`,
        plot: `Episode ${index + 1} of ${selected.name} season ${season.season_number}.`,
        info: {
          movie_image: selected.cover,
          plot: `Episode ${index + 1} of ${selected.name} season ${season.season_number}.`,
          duration_secs: 1800,
          container_extension: 'm3u8',
          backdrop_path: selected.backdrop_path,
        },
        direct_source: pickStream(index + season.season_number),
      })),
    ])
  );

  return { info: selected, seasons, episodes };
};

const getShortEpg = (streamId) => {
  const stream = liveStreams.find((item) => String(item.stream_id) === String(streamId));
  const category = liveCategories.find((item) => item.category_id === stream?.category_id)?.category_name || 'News';
  const titles = scheduleByCategory[category] || scheduleByCategory.News;
  const base = Date.now() - 30 * 60 * 1000;

  return {
    epg_listings: Array.from({ length: 6 }, (_, index) => {
      const start = new Date(base + index * 30 * 60 * 1000);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const title = `${titles[index % titles.length]}${stream ? ` • ${stream.name}` : ''}`;
      const description = `${category} programming block ${index + 1}${stream ? ` on ${stream.name}` : ''}.`;
      return {
        id: Number(`${streamId}${index}`),
        title: base64(title),
        description: base64(description),
        start: start.toISOString().replace('T', ' ').slice(0, 19),
        end: end.toISOString().replace('T', ' ').slice(0, 19),
        start_timestamp: Math.floor(start.getTime() / 1000),
        stop_timestamp: Math.floor(end.getTime() / 1000),
      };
    }),
  };
};

const buildXmltv = () => {
  const listings = liveStreams.slice(0, 16).flatMap((stream, streamIndex) => {
    const category = liveCategories.find((item) => item.category_id === stream.category_id)?.category_name || 'News';
    const titles = scheduleByCategory[category] || scheduleByCategory.News;
    return Array.from({ length: 4 }, (_, slotIndex) => {
      const start = new Date(Date.now() + slotIndex * 30 * 60 * 1000);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const toXmlTime = (value) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, ' +0000');
      return `  <programme start="${toXmlTime(start)}" stop="${toXmlTime(end)}" channel="${stream.epg_channel_id}">\n    <title>${titles[(slotIndex + streamIndex) % titles.length]}</title>\n    <desc>${stream.name} mock XMLTV entry for preview testing.</desc>\n  </programme>`;
    });
  });

  const channels = liveStreams.slice(0, 16).map((stream) => `  <channel id="${stream.epg_channel_id}">\n    <display-name>${stream.name}</display-name>\n    <icon src="${stream.stream_icon}" />\n  </channel>`);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<tv generator-info-name="StreamDeck Mock Provider">\n${channels.join('\n')}\n${listings.join('\n')}\n</tv>`;
};

const authResponse = (username, password, scenario = 'healthy') => {
  const lineSaturated = scenario === 'lineSaturated';
  const expiredAccount = scenario === 'expiredAccount';
  const authUnstable = scenario === 'authUnstable';
  return ({
  user_info: {
    username,
    password,
    auth: expiredAccount || authUnstable ? 0 : 1,
    status: expiredAccount ? 'Expired' : authUnstable ? 'Unstable' : 'Active',
    exp_date: `${Math.floor(Date.now() / 1000) + 86400 * (expiredAccount ? -2 : authUnstable ? 2 : lineSaturated ? 7 : 30)}`,
    is_trial: '0',
    active_cons: lineSaturated ? '5' : '1',
    max_connections: '5',
    allowed_output_formats: ['m3u8', 'ts'],
  },
  server_info: {
    url: 'localhost',
    port: `${PORT}`,
    https_port: '',
    server_protocol: 'http',
    timezone: 'America/Toronto',
    timestamp_now: Math.floor(Date.now() / 1000),
    time_now: new Date().toISOString(),
  },
});
};

const buildMockAccountProfile = (scenario = 'healthy') => ({
  status: scenario === 'expiredAccount' ? 'Expired' : scenario === 'authUnstable' ? 'Unstable' : 'Active',
  expiryLabel: scenario === 'expiredAccount' ? 'Expired 2 days ago' : scenario === 'authUnstable' ? '2 days remaining' : scenario === 'lineSaturated' ? '7 days remaining' : '30 days remaining',
  activeConnections: scenario === 'lineSaturated' ? 5 : 1,
  maxConnections: 5,
  timezone: 'America/Toronto',
  supportsMultiConnection: true,
  warning: scenario === 'expiredAccount'
    ? 'Account auth is expired, so catalog and playback calls should guide the user toward reconnecting or switching providers.'
    : scenario === 'lineSaturated'
      ? 'All provider lines are in use, so playback can fail even while auth still succeeds.'
      : scenario === 'authUnstable'
        ? 'Auth checks are failing right now, but cached browse surfaces should stay useful while the user retries or switches to the healthiest saved provider.'
        : null,
});

const buildTrustSignals = (scenario = 'healthy') => {
  const lineSaturated = scenario === 'lineSaturated';
  const expiredAccount = scenario === 'expiredAccount';
  const degradedLive = scenario === 'degradedLive';
  const degradedSearch = scenario === 'degradedSearch';
  const degradedEpg = scenario === 'degradedEpg';
  const authUnstable = scenario === 'authUnstable';

  return [
    {
      id: 'account-status',
      label: expiredAccount ? 'Account expired' : authUnstable ? 'Auth unstable' : lineSaturated ? 'Capacity risk' : 'Account healthy',
      tone: expiredAccount || lineSaturated || authUnstable ? 'warning' : 'healthy',
      detail: expiredAccount ? 'Auth should downgrade immediately and the app should route users toward reconnecting or switching providers.' : authUnstable ? 'Fresh auth checks are failing even though cached browsing can still stay useful.' : lineSaturated ? 'Auth succeeds, but every line is already in use.' : 'Account is active and playback can start immediately.',
    },
    {
      id: 'guide-readiness',
      label: degradedEpg ? 'Guide degraded' : 'Guide ready',
      tone: degradedEpg ? 'warning' : 'healthy',
      detail: degradedEpg ? 'NOW and NEXT should fall back cleanly without collapsing browse surfaces.' : 'Inline NOW and NEXT should stay populated across Home and Live.',
    },
    {
      id: 'live-catalog',
      label: degradedLive ? 'Live catalog unstable' : 'Live catalog ready',
      tone: degradedLive ? 'warning' : 'healthy',
      detail: degradedLive ? 'Live category fetches should show retries and fallback copy.' : 'Live browse, surf rails, and preview should all hydrate normally.',
    },
    {
      id: 'search-catalog',
      label: degradedSearch ? 'Search catalogs partial' : 'Search catalogs ready',
      tone: degradedSearch ? 'warning' : 'healthy',
      detail: degradedSearch ? 'Movies and Series should lean on cache, partial-result messaging, and shared trust badges.' : 'Cross-provider search and detail surfaces should fill normally with the same trust language.',
    },
  ];
};

const buildSurfaceRecoveryPlans = (scenario = 'healthy') => ({
  login: {
    title: scenario === 'healthy' ? 'Fastest recovery route' : 'Fastest safe login recovery',
    detail: scenario === 'expiredAccount'
      ? 'If the active provider is expired, jump straight into Home on the healthiest saved provider instead of reconnecting into a dead catalog.'
      : scenario === 'lineSaturated'
        ? 'If this provider is out of lines, switch straight into Home on the healthiest saved provider before the user blames playback.'
        : scenario === 'authUnstable'
          ? 'If auth checks are wobbling, keep the saved connection visible but let the user jump straight into Home on the healthiest provider.'
          : 'Keep the login flow moving by switching directly into Home on the healthiest saved provider when this source gets risky.',
    cta: scenario === 'healthy' ? 'Open healthiest saved provider in Home' : 'Recover into Home on healthiest provider',
  },
  home: {
    title: scenario === 'healthy' ? 'Home recovery route' : 'Keep Home alive',
    detail: scenario === 'expiredAccount'
      ? 'Preserve the same browse session by moving Home onto the healthiest saved provider while the expired source falls back to cache, and keep same-category live rescue available when the exact featured copy is missing.'
      : scenario === 'lineSaturated'
        ? 'Preserve the same featured rails and quick actions by moving Home onto the healthiest saved provider before launch attempts fail, even if recovery has to open the same live category instead of the exact channel.'
        : scenario === 'authUnstable'
          ? 'Keep the cached Home rails alive, but point the primary recovery action toward the healthiest saved provider instead of a blind retry, with same-category live rescue still reachable from featured and spotlight cards.'
          : 'Move Home onto the healthiest saved provider before stale trust on the current source infects the rest of the browse session, and preserve live category context when an exact duplicate is missing.',
    cta: 'Switch Home to healthiest provider or same live category',
  },
  live: {
    title: scenario === 'healthy' ? 'Live recovery route' : 'Keep Live surfing alive',
    detail: scenario === 'expiredAccount'
      ? 'If the active account is expired, jump straight into the same Live category on the healthiest saved provider instead of forcing the user to back out and reconnect.'
      : scenario === 'lineSaturated'
        ? 'If the active provider is out of lines, move Live onto the healthiest saved provider and preserve the current category before the user blames the channel card.'
        : scenario === 'authUnstable'
          ? 'Keep the current browse context visible, but make the fastest escape hatch a one-tap jump into the same Live category on the healthiest saved provider.'
          : 'When provider trust degrades, Live should pivot into the healthiest saved provider while preserving channel-surf momentum and category context even if an exact duplicate channel is missing.',
    cta: 'Open same Live category on healthiest provider',
  },
  search: {
    title: scenario === 'healthy' ? 'Search recovery route' : 'Keep Search useful',
    detail: scenario === 'expiredAccount'
      ? 'If the active provider expires, preserve the user intent by reranking the same query on the healthiest saved provider instead of dumping them back to setup.'
      : scenario === 'lineSaturated'
        ? 'If playback is risky because every line is in use, keep the same query visible and push the healthiest provider copy to the top of the result group.'
        : scenario === 'authUnstable'
          ? 'If trust refresh is unstable, keep cached hits on screen and make the one-tap escape hatch a rerun on the healthiest saved provider.'
          : 'Let Search keep the same query and result intent while the healthiest saved provider takes over before the user loses confidence.',
    cta: 'Rerun query on healthiest provider',
  },
  settings: {
    title: scenario === 'healthy' ? 'Settings recovery route' : 'Keep trust decisions obvious',
    detail: scenario === 'expiredAccount'
      ? 'If a saved provider is expired, Settings should make the healthiest provider the obvious next action before the user wanders into a broken browse surface.'
      : scenario === 'lineSaturated'
        ? 'If a provider is out of lines, Settings should surface the healthiest saved provider as the fastest safe switch, not just another status chip.'
        : scenario === 'authUnstable'
          ? 'If auth status is unstable, keep the provider facts visible but turn the primary recovery action into a trust-led switch toward the healthiest saved source.'
          : 'Use Settings as a trust cockpit that recommends the healthiest saved provider before risky auth or capacity state spreads deeper into the shell.',
    cta: 'Promote healthiest saved provider',
  },
  movies: {
    title: scenario === 'healthy' ? 'Movies recovery route' : 'Keep Movies cinematic',
    detail: scenario === 'expiredAccount'
      ? 'If the active movie provider expires, keep the selected title visible and launch the healthiest saved provider copy instead of collapsing the detail rail.'
      : scenario === 'lineSaturated'
        ? 'If lines are maxed, preserve the detail surface and move the primary play action to the healthiest saved provider copy before playback fails.'
        : scenario === 'authUnstable'
          ? 'If trust refresh fails, keep the selected movie and cached art on screen, then steer the main recovery action toward the healthiest saved provider.'
          : 'Movies should preserve title intent while the healthiest saved provider takes over the play path behind the same detail rail.',
    cta: 'Play title on healthiest provider',
  },
  series: {
    title: scenario === 'healthy' ? 'Series recovery route' : 'Keep episode momentum alive',
    detail: scenario === 'expiredAccount'
      ? 'If the active series provider expires, preserve the selected show and episode context while moving playback to the healthiest saved provider copy.'
      : scenario === 'lineSaturated'
        ? 'If playback is at risk because lines are maxed, keep the selected season and episode context intact while the healthiest saved provider becomes the launch path.'
        : scenario === 'authUnstable'
          ? 'If auth trust is unstable, keep the drill-down context alive and let the healthiest saved provider resume the intended episode without a cold restart.'
          : 'Series should preserve show, season, and episode intent while a healthier provider copy takes over the playback route.',
    cta: 'Resume episode on healthiest provider',
  },
  favorites: {
    title: scenario === 'healthy' ? 'Favorites recovery route' : 'Keep saved picks actionable',
    detail: scenario === 'expiredAccount'
      ? 'If a saved favorite belongs to an expired provider, keep the title visible and let the healthiest saved provider copy take over instead of turning Favorites into a dead archive.'
      : scenario === 'lineSaturated'
        ? 'If provider lines are maxed, Favorites should rank the healthiest saved copy first so the user can recover the title without hunting through Settings, and keep same-category live rescue visible when the exact saved channel is missing.'
        : scenario === 'authUnstable'
          ? 'If trust refresh fails, Favorites should preserve saved titles and steer the main recovery action toward the healthiest saved provider copy.'
          : 'Favorites should preserve saved-title intent while the healthiest provider copy becomes the primary launch action when trust goes bad.',
    cta: 'Play favorite on healthiest provider',
  },
  continue: {
    title: scenario === 'healthy' ? 'Continue Watching recovery route' : 'Keep resume momentum alive',
    detail: scenario === 'expiredAccount'
      ? 'If the original provider expires, Continue Watching should preserve position and episode context while the healthiest saved provider copy becomes the resume path.'
      : scenario === 'lineSaturated'
        ? 'If playback risk comes from maxed lines, Continue Watching should protect the resume position and push the healthiest saved provider copy to the top, with same-category live rescue available when the exact live resume item is gone.'
        : scenario === 'authUnstable'
          ? 'If auth trust is unstable, keep the resume rail alive and let the healthiest saved provider copy carry the next play action without losing the spot.'
          : 'Continue Watching should preserve position and episode intent while the healthiest saved provider copy takes over the launch path.',
    cta: 'Resume on healthiest provider',
  },
  collections: {
    title: scenario === 'healthy' ? 'Collections recovery route' : 'Keep curated folders useful',
    detail: scenario === 'expiredAccount'
      ? 'If a collection item points at an expired provider, keep the folder intact and promote the healthiest saved provider copy instead of making curated lineups brittle, with same-category live rescue available when the exact channel copy is gone.'
      : scenario === 'lineSaturated'
        ? 'If the active provider is out of lines, Collections should turn the healthiest saved provider copy into the obvious one-tap recovery move for curated items, or open the same live category when no exact duplicate survives.'
        : scenario === 'authUnstable'
          ? 'If trust is unstable, keep curated folders visible and route launch actions toward the healthiest saved provider copy without dumping the user out of the collection, while preserving same-category live rescue for brittle lineups.'
          : 'Collections should preserve curation intent while the healthiest saved provider copy takes over the launch path for any risky item, and keep same-category live rescue available when exact duplicates are missing.',
    cta: 'Launch collection item on healthiest provider or same live category',
  },
});

const buildOperatorHeadline = (scenario = 'healthy') => {
  if (scenario === 'expiredAccount') {
    return {
      tone: 'warning',
      title: 'Renew or switch providers before browsing deeper',
      detail: 'This account is expired. Keep cached context visible, but push the user toward renewal, updated credentials, or another saved provider before they blame playback.',
    };
  }

  if (scenario === 'authUnstable') {
    return {
      tone: 'warning',
      title: 'Trust is unstable, but the session context should stay alive',
      detail: 'Fresh auth checks are failing. Keep the active provider visible, preserve cached rails, and make retry or switch-provider actions obvious on Login, Home, and Live.',
    };
  }

  if (scenario === 'lineSaturated') {
    return {
      tone: 'warning',
      title: 'The account is real, but capacity is maxed',
      detail: 'Warn before playback and steer users toward another saved provider or a retry later, instead of implying the stream itself is broken.',
    };
  }

  return {
    tone: 'healthy',
    title: 'Provider trust is aligned with playback',
    detail: 'Login, Home, and Live can all treat this provider as ready for normal browsing and playback rehearsal.',
  };
};

const buildRecoveryActions = (scenario = 'healthy') => {
  if (scenario === 'expiredAccount') {
    return [
      'Downgrade provider trust immediately instead of pretending the account is still usable.',
      'Keep cached Home rails visible when possible, but block fresh provider fetches behind explicit recovery guidance.',
      'Offer a clear next step: re-enter credentials, switch saved providers, or retry validation after renewal.',
      'If the same series exists on another saved provider, resume the matched episode directly instead of dropping the user at a generic detail page.',
    ];
  }

  if (scenario === 'authUnstable') {
    return [
      'Keep the active provider visible, but mark trust as unstable instead of ejecting the user into setup.',
      'Let Login, Home, and Live explain that cached browsing can continue while auth retries fail.',
      'Offer quick revalidate and switch-provider actions before the user assumes the whole app is broken.',
      'Do not clear saved rails or guide context just because the latest trust check failed.',
    ];
  }

  if (scenario === 'lineSaturated') {
    return [
      'Warn before playback that provider line capacity is already maxed.',
      'Suggest switching to another saved provider for the same title or channel, and if the exact channel is missing keep a same-category fallback launch reachable directly from Home cards, Live cards, collection-launched live items, favorite live cards, continue-watching live resume items, and the active player dock.',
      'Let the user retry validation later instead of pretending the account is fully healthy.',
      'Preserve season and episode resume context when a healthier provider copy is available.',
    ];
  }

  if (scenario === 'degradedLive') {
    return [
      'Keep Home and Login usable while Live shows a degraded-state banner.',
      'Offer retry from the Live surface before pushing the user back to setup.',
      'Keep preview artwork visible so the screen never looks dead during recovery.',
    ];
  }

  if (scenario === 'degradedEpg') {
    return [
      'Downgrade guide chips to clear fallback copy instead of empty whitespace.',
      'Keep browse counts, quick actions, and preview working while guide calls recover.',
      'Link the user to Live so they can keep surfing even with NOW and NEXT missing.',
    ];
  }

  if (scenario === 'degradedSearch') {
    return [
      'Keep cached Movies and Series results visible while catalog refresh fails.',
      'Call out partial provider truth explicitly instead of showing an empty state.',
      'Expose a quick retry path without clearing the current browse context.',
    ];
  }

  return [
    'Connect with mock credentials and verify the provider trust cockpit stays green.',
    'Open Home and confirm guide data, counts, and quick actions load together.',
    'Open Live and confirm surf rails, preview, and guide strips stay aligned.',
  ];
};

const buildSurfaceScorecards = (scenario = 'healthy') => {
  const loginTone = scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover';
  const homeTone = scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover';
  const liveTone = scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' ? 'watch' : 'recover';

  return [
    {
      screenId: 'login',
      title: 'Login proof scorecard',
      summary: scenario === 'healthy'
        ? 'Login should feel safe enough to move forward on the first read.'
        : 'Login should explain trust risk and the fastest safe move without losing the saved-provider story.',
      metrics: [
        {
          label: 'Connection path',
          value: scenario === 'healthy' ? 'Launch ready' : scenario === 'lineSaturated' ? 'Watch capacity' : 'Recovery led',
          detail: scenario === 'healthy'
            ? 'Sample credentials and saved providers should move straight into Home.'
            : scenario === 'lineSaturated'
              ? 'Auth still works, but the line-capacity warning should appear before playback gets blamed.'
              : 'Fresh trust is degraded, so the recovery move should be clearer than the connect button.',
          tone: loginTone,
        },
        {
          label: 'Saved switch',
          value: scenario === 'healthy' ? 'Hot-swap ready' : 'Backup path ready',
          detail: 'A healthier saved provider should always be one move away from Login.',
          tone: scenario === 'healthy' ? 'ready' : 'recover',
        },
        {
          label: 'Trust signal',
          value: scenario === 'healthy' ? 'Green posture' : scenario === 'authUnstable' ? 'Auth unstable' : scenario === 'expiredAccount' ? 'Expired account' : 'Risk visible',
          detail: 'Status, expiry, and line pressure should read as product truth instead of setup noise.',
          tone: loginTone,
        },
      ],
    },
    {
      screenId: 'home',
      title: 'Home proof scorecard',
      summary: scenario === 'healthy'
        ? 'Home should prove this is a premium streaming product on first paint.'
        : 'Home should keep the same browse context alive while the trust and recovery story stays obvious.',
      metrics: [
        {
          label: 'Featured browse',
          value: scenario === 'healthy' ? 'Hero ready' : scenario === 'expiredAccount' ? 'Cached hero' : 'Fallback hero',
          detail: scenario === 'healthy'
            ? 'Featured context, counts, and launch actions should land together.'
            : 'The hero surface should stay useful even when fresh provider truth degrades.',
          tone: homeTone,
        },
        {
          label: 'Quick rails',
          value: scenario === 'healthy' ? 'Launch rails live' : 'Context preserved',
          detail: 'Live, Favorites, Collections, Continue, Search, and Settings should remain one tap away.',
          tone: homeTone,
        },
        {
          label: 'Trust cockpit',
          value: scenario === 'healthy' ? 'Operator green' : scenario === 'lineSaturated' ? 'Capacity warning' : 'Recovery active',
          detail: 'Provider facts and the recovery move should stay visible together on Home.',
          tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
        },
      ],
    },
    {
      screenId: 'live',
      title: 'Live proof scorecard',
      summary: scenario === 'healthy'
        ? 'Live should feel fast enough that the provider disappears behind the browse flow.'
        : 'Live should preserve surf momentum while preview, guide, or provider trust degrades.',
      metrics: [
        {
          label: 'Preview confidence',
          value: scenario === 'healthy' ? 'Preview armed' : scenario === 'degradedLive' ? 'Fallback art' : 'Recovery surf',
          detail: scenario === 'healthy'
            ? 'Hover or focus should update the preview without leaving the grid.'
            : 'The preview zone should keep the surface alive even when live browse conditions get worse.',
          tone: liveTone,
        },
        {
          label: 'Guide posture',
          value: scenario === 'degradedEpg' ? 'Guide fallback' : 'NOW / NEXT ready',
          detail: scenario === 'degradedEpg'
            ? 'Guide copy should degrade cleanly while browse and preview stay intact.'
            : 'Inline NOW and NEXT should stay attached to channel-surf momentum.',
          tone: scenario === 'degradedEpg' ? 'watch' : liveTone,
        },
        {
          label: 'Recovery launch',
          value: scenario === 'healthy' ? 'On-card rescue' : 'Same-context rescue',
          detail: 'Exact-provider fallback or same-category recovery should remain attached to the channel card.',
          tone: scenario === 'healthy' ? 'ready' : 'recover',
        },
      ],
    },
  ];
};

const buildSurfaceExitCriteria = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login exit criteria',
    summary: scenario === 'healthy'
      ? 'Advance only when credentials, trust posture, and the next hop to Home all read as one confident move.'
      : 'Hold Login in place until the provider risk is named clearly and the fastest safe path is more obvious than blind retrying.',
    goSignal: scenario === 'healthy'
      ? 'Saved or sample credentials validate once and the user can move directly into Home.'
      : scenario === 'lineSaturated'
        ? 'The line-capacity warning is visible and the healthiest-provider jump is obvious before playback gets blamed.'
        : 'The trust issue is explicit and the safest move is visible on the same surface.',
    holdSignal: scenario === 'healthy'
      ? 'Do not advance if the provider story disappears behind generic loading or auth copy.'
      : scenario === 'expiredAccount'
        ? 'Hold if Login still implies the expired provider is launch-ready.'
        : scenario === 'authUnstable'
          ? 'Hold if retries erase the saved-provider context or hide the switch-provider escape hatch.'
          : 'Hold if the warning is present but the next safe move is still ambiguous.',
    nextHopLabel: 'Advance to Home',
    nextHopHref: '/home',
    recoveryOwner: 'Trust-first operator',
    recoveryMove: scenario === 'healthy'
      ? 'Promote the healthiest saved provider only when the active source stops feeling trustworthy.'
      : 'Keep Login anchored, name the risk, and route the user into Home on the healthiest saved provider when the active source is risky.',
  },
  {
    screenId: 'home',
    title: 'Home exit criteria',
    summary: scenario === 'healthy'
      ? 'Advance only when Home feels like a premium browse surface with trust cues and a clean path into Live.'
      : 'Hold Home in place until browse context stays visible and the rescue path remains product-facing instead of support-facing.',
    goSignal: scenario === 'healthy'
      ? 'Hero counts, quick rails, and provider facts render together without making Home feel like Settings.'
      : scenario === 'degradedEpg' || scenario === 'degradedLive'
        ? 'Cached or fallback browse context stays visible and the recovery path is attached to the same featured surface.'
        : 'The degraded state is specific, the rails stay useful, and the next hop is still obvious.',
    holdSignal: scenario === 'healthy'
      ? 'Do not advance if Home loses the product story and collapses into raw provider stats.'
      : scenario === 'expiredAccount'
        ? 'Hold if cached Home context disappears before renewal or provider-switch guidance appears.'
        : scenario === 'lineSaturated'
          ? 'Hold if Home invites playback without surfacing capacity pressure first.'
          : 'Hold if the recovery move requires leaving Home to understand what failed.',
    nextHopLabel: 'Advance to Live',
    nextHopHref: '/live',
    recoveryOwner: 'Browse-context operator',
    recoveryMove: scenario === 'healthy'
      ? 'Keep featured rails live and let healthier-provider launches stay attached to the same browse context.'
      : 'Preserve featured and quick-rail context while routing the next launch through the healthiest saved provider or same-category fallback.',
  },
  {
    screenId: 'live',
    title: 'Live exit criteria',
    summary: scenario === 'healthy'
      ? 'Advance only when channel surf, preview confidence, and NOW/NEXT all stay attached to the same fast browse flow.'
      : 'Hold Live in place until channel-surf momentum survives the degraded state and the recovery move stays on-card.',
    goSignal: scenario === 'healthy'
      ? 'The user can filter, preview, and launch from one card without losing category context.'
      : scenario === 'degradedLive'
        ? 'The grid stays understandable, the degraded state is named, and category-level recovery is one move away.'
        : scenario === 'degradedEpg'
          ? 'Preview and category surf stay alive even while guide data falls back.'
          : 'The user can keep browsing while the recovery action stays attached to the current card or category.',
    holdSignal: scenario === 'healthy'
      ? 'Do not advance if Live still requires a guide-first detour or hides the fallback launch path.'
      : scenario === 'lineSaturated'
        ? 'Hold if Live suggests the stream itself is broken before surfacing provider capacity pressure.'
        : scenario === 'authUnstable'
          ? 'Hold if auth wobble clears the current browse context or hides the healthiest-provider jump.'
          : 'Hold if the degraded state forces the user to back out before they understand the recovery path.',
    nextHopLabel: 'Return to Home',
    nextHopHref: '/home',
    recoveryOwner: 'Surf-flow operator',
    recoveryMove: scenario === 'healthy'
      ? 'Keep exact-provider fallback or same-category rescue attached to the active channel card.'
      : 'Keep the user on the same category flow and make the healthiest saved provider or same-category rescue the default recovery move.',
  },
]);

const buildSurfaceHandoffs = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login handoff map',
    summary: scenario === 'healthy'
      ? 'Login should hand saved trust context, sample credentials, and the active provider story into Home without feeling like a reset.'
      : 'Even in degraded trust states, Login should preserve what the user already chose and explain the safest next handoff instead of wiping context.',
    carriesForward: [
      'Saved provider identity and credential intent stay visible before and after validation.',
      'Trust posture, expiry pressure, and line-capacity warnings travel with the connection into Home.',
      'Scenario rehearsal state survives the jump so Home tells the same recovery story.',
    ],
    confidenceLabel: scenario === 'healthy' ? 'Safe handoff to Home' : 'Trust-led handoff in play',
    fallbackLabel: scenario === 'healthy' ? 'Fallback handoff' : 'Recovery handoff',
    fallbackDetail: scenario === 'healthy'
      ? 'If the active mock provider stops feeling trustworthy, Home should open on the healthiest saved provider without forcing a fresh login ritual.'
      : 'If validation degrades, keep Login anchored, preserve the selected provider context, and route the user into Home on the healthiest safe provider with the risk already named.',
  },
  {
    screenId: 'home',
    title: 'Home handoff map',
    summary: scenario === 'healthy'
      ? 'Home should carry hero context, provider truth, and quick-launch intent directly into Live so the next step feels like a premium browse continuation.'
      : 'When Home is rehearsing degraded conditions, the user should keep their browse intent, trust context, and rescue path before moving deeper.',
    carriesForward: [
      'Featured counts, quick rails, and selected provider posture stay attached to the next launch.',
      'Saved-provider recovery options remain visible before the user commits to Live playback.',
      'Guide softness or provider pressure should downgrade the copy, not delete the browse story.',
    ],
    confidenceLabel: scenario === 'healthy' ? 'Safe handoff to Live' : 'Browse context preserved',
    fallbackLabel: scenario === 'healthy' ? 'Fallback handoff' : 'Recovery handoff',
    fallbackDetail: scenario === 'healthy'
      ? 'If the active provider weakens, Home should launch the same intent through the healthiest provider or same-category rescue without collapsing into a settings detour.'
      : 'If counts, guide data, or account trust degrade, keep the rails on screen and move the user into Live only through a clearly named healthiest-provider or same-category rescue path.',
  },
  {
    screenId: 'live',
    title: 'Live handoff map',
    summary: scenario === 'healthy'
      ? 'Live should preserve category focus, preview confidence, and NOW/NEXT context while handing the user into playback from the same card.'
      : 'Under degraded browse or trust pressure, Live should keep category momentum intact and explain the safest recovery handoff before the user loses the surf flow.',
    carriesForward: [
      'Selected category, search filter, and highlighted channel stay in place during preview and launch.',
      'Provider trust posture and recovery choices stay attached to the same card or category rescue path.',
      'Preview fallback and guide downgrade should preserve surf momentum instead of forcing a restart from Home.',
    ],
    confidenceLabel: scenario === 'healthy' ? 'Safe handoff to playback' : 'Surf momentum preserved',
    fallbackLabel: scenario === 'healthy' ? 'Fallback handoff' : 'Recovery handoff',
    fallbackDetail: scenario === 'healthy'
      ? 'If the first provider copy fails, keep the user on the same card and hand off to the healthiest exact match or same-category fallback without breaking category context.'
      : 'If Live degrades, preserve the current category and selected channel context while the shell routes playback through the healthiest exact copy or same-category rescue path.',
  },
]);

const buildSurfaceEscalationLadders = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login escalation ladder',
    summary: scenario === 'healthy'
      ? 'Login should still publish the recovery order before the user needs it, so the fastest safe move never turns into guesswork.'
      : 'When trust degrades on Login, the shell should make the recovery order explicit before the user burns time retrying the wrong thing.',
    triggerLabel: scenario === 'healthy'
      ? 'Trigger when validation stalls, account trust downgrades, or the saved provider story starts to wobble.'
      : scenario === 'expiredAccount'
        ? 'Trigger as soon as the account reads expired or catalog access is clearly blocked.'
        : scenario === 'lineSaturated'
          ? 'Trigger as soon as line pressure appears before the user blames playback.'
          : 'Trigger as soon as Login stops feeling like a confident bridge into Home.',
    firstMove: scenario === 'healthy'
      ? 'Retry validation once with the saved provider still visible and keep the trust facts on screen.'
      : 'Keep the selected provider visible, name the trust risk plainly, and stop pretending a blind retry is the main path.',
    secondMove: scenario === 'healthy'
      ? 'Offer the healthiest saved provider as the next safe Home launch without forcing a new setup ritual.'
      : 'Promote the healthiest saved provider as the primary Home handoff while preserving the original provider story for context.',
    finalFallback: scenario === 'healthy'
      ? 'Route into Home on the healthiest saved provider and leave the original source ready for later review.'
      : 'Exit Login only through the healthiest safe provider path and leave the degraded source anchored as named context, not a hidden failure.',
    owner: 'Trust-first operator',
  },
  {
    screenId: 'home',
    title: 'Home escalation ladder',
    summary: scenario === 'healthy'
      ? 'Home should keep one visible rescue order behind the premium browse shell so hero, rails, and trust never split apart under pressure.'
      : 'When Home reheats from cache or trust weakens, the shell should publish the browse-rescue order before the surface feels like a broken dashboard.',
    triggerLabel: scenario === 'healthy'
      ? 'Trigger when hero context weakens, guide confidence drops, or provider posture no longer supports a clean launch into Live.'
      : scenario === 'degradedEpg' || scenario === 'degradedLive'
        ? 'Trigger as soon as Home falls back to cached or partial browse context.'
        : 'Trigger as soon as Home needs recovery language to stay product-facing.',
    firstMove: scenario === 'healthy'
      ? 'Keep the current hero, quick rails, and provider facts visible while refreshing in place.'
      : 'Preserve the current Home rails, facts, and spotlight context before asking the user to change providers or routes.',
    secondMove: scenario === 'healthy'
      ? 'Attach the healthiest-provider or same-category launch path directly to the affected featured or spotlight surface.'
      : 'Move the launch action to the healthiest saved provider or same-category rescue without forcing a settings detour.',
    finalFallback: scenario === 'healthy'
      ? 'Advance into Live only when the same browse story still survives the handoff.'
      : 'Hold the user on Home with clear rescue actions until the next launch path feels safer than a blind jump into Live.',
    owner: 'Browse-context operator',
  },
  {
    screenId: 'live',
    title: 'Live escalation ladder',
    summary: scenario === 'healthy'
      ? 'Live should make the surf recovery order obvious before preview, guide, or provider trust ever breaks the browsing rhythm.'
      : 'When Live degrades, the shell should escalate through one surf-preserving order instead of dumping the user into generic stream failure.',
    triggerLabel: scenario === 'healthy'
      ? 'Trigger when preview confidence dips, NOW/NEXT softens, or the current provider can no longer support a clean launch from the active card.'
      : scenario === 'degradedLive'
        ? 'Trigger as soon as the live catalog weakens and the current card cannot launch cleanly.'
        : scenario === 'degradedEpg'
          ? 'Trigger as soon as guide context drops but channel-surf momentum still matters.'
          : 'Trigger as soon as Live needs rescue language to preserve the same category flow.',
    firstMove: scenario === 'healthy'
      ? 'Keep the user on the same category and card while preview or launch retries happen in place.'
      : 'Hold category context, preserve the selected card, and explain the degraded state without sending the user backward.',
    secondMove: scenario === 'healthy'
      ? 'Offer the healthiest exact provider copy first, then keep same-category rescue one move away.'
      : 'Promote the healthiest exact copy or same-category rescue directly from the current card instead of hiding it behind search or settings.',
    finalFallback: scenario === 'healthy'
      ? 'Route back to Home only after on-card recovery stops feeling trustworthy.'
      : 'Return to Home only when the current category rescue path is exhausted and the shell can carry the same intent back with it.',
    owner: 'Surf-flow operator',
  },
]);

const buildSurfaceScenarioMatrix = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login scenario matrix',
    summary: scenario === 'healthy'
      ? 'Login should publish how every rehearsal mode changes trust before the user hits Connect.'
      : 'Login should keep the active rehearsal mode visible, but it also needs to explain what the other failure modes would change before the user blames the wrong layer.',
    scenarios: [
      {
        scenario: 'healthy',
        label: 'Healthy launch',
        impact: 'Login can validate once and hand straight into Home with a clean trust posture.',
        recommendedMove: 'Connect with the saved or sample provider and advance immediately.',
        tone: 'ready',
      },
      {
        scenario: 'lineSaturated',
        label: 'Lines maxed',
        impact: 'Auth still succeeds, but Login has to warn that playback risk comes from provider capacity, not bad credentials.',
        recommendedMove: 'Keep the provider facts visible and promote the healthiest saved-provider jump before playback is blamed.',
        tone: 'watch',
      },
      {
        scenario: 'expiredAccount',
        label: 'Expired account',
        impact: 'Fresh Xtream access is blocked, so Login must explain renewal or a provider switch without erasing the saved connection story.',
        recommendedMove: 'Hold the shell in place, name the expiry plainly, and route the user into Home only through a healthy saved provider.',
        tone: 'recover',
      },
      {
        scenario: 'authUnstable',
        label: 'Auth unstable',
        impact: 'Fresh auth checks fail intermittently, but cached provider context should stay visible so Login still feels deliberate.',
        recommendedMove: 'Keep retry and switch-provider actions on the same surface instead of bouncing the user into setup limbo.',
        tone: 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home scenario matrix',
    summary: scenario === 'healthy'
      ? 'Home should prove how the premium browse shell behaves across happy-path and degraded-provider states without losing the same featured context.'
      : 'Home should explain how each rehearsal mode affects the same hero, rails, and trust cockpit so the browse story survives provider churn.',
    scenarios: [
      {
        scenario: 'healthy',
        label: 'Healthy launch',
        impact: 'Hero counts, quick rails, guide context, and provider facts all land together on first paint.',
        recommendedMove: 'Use Home as the premium launch surface into Live, Favorites, Search, and Collections.',
        tone: 'ready',
      },
      {
        scenario: 'degradedEpg',
        label: 'Guide degraded',
        impact: 'Guide calls soften, but Home should keep featured context, counts, and launch actions visible.',
        recommendedMove: 'Downgrade NOW and NEXT copy gracefully while leaving the same hero and quick rails intact.',
        tone: 'watch',
      },
      {
        scenario: 'degradedLive',
        label: 'Live degraded',
        impact: 'Home is still healthy enough to carry the product story even when Live needs a fallback launch path.',
        recommendedMove: 'Keep Home confident and attach the rescue action directly to featured live surfaces before the user goes deeper.',
        tone: 'watch',
      },
      {
        scenario: 'expiredAccount',
        label: 'Expired account',
        impact: 'Fresh provider data may fail, so Home has to lean on cache while keeping renewal or provider-switch guidance above the rails.',
        recommendedMove: 'Preserve the featured browse context and shift the main CTA toward a healthier saved provider.',
        tone: 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live scenario matrix',
    summary: scenario === 'healthy'
      ? 'Live should make it obvious how preview, guide, and on-card recovery behave before the user ever hits a broken channel.'
      : 'Live should keep the current rehearsal mode visible, but it also needs to map the other failure modes so channel-surf recovery stays product-shaped instead of support-shaped.',
    scenarios: [
      {
        scenario: 'healthy',
        label: 'Healthy surf',
        impact: 'Category filter, preview, NOW/NEXT, and launch all stay attached to the same fast card flow.',
        recommendedMove: 'Browse, preview, and play directly from the active card without leaving the grid.',
        tone: 'ready',
      },
      {
        scenario: 'degradedLive',
        label: 'Catalog degraded',
        impact: 'The live catalog itself weakens, so Live has to explain the failure while keeping the browser readable and recovery local.',
        recommendedMove: 'Keep the current category visible and offer retry plus healthier-provider or same-category rescue from the same surface.',
        tone: 'watch',
      },
      {
        scenario: 'degradedEpg',
        label: 'Guide degraded',
        impact: 'NOW and NEXT become unreliable, but preview and channel-surf momentum should stay alive.',
        recommendedMove: 'Fall back to clear guide copy instead of empty space and keep preview-led browsing active.',
        tone: 'watch',
      },
      {
        scenario: 'lineSaturated',
        label: 'Capacity risk',
        impact: 'The account can browse, but playback may fail because every line is in use.',
        recommendedMove: 'Warn before launch and surface the healthiest exact copy or same-category rescue on the card itself.',
        tone: 'recover',
      },
    ],
  },
]);

const buildSurfacePromiseStacks = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login promise stack',
    summary: scenario === 'healthy'
      ? 'Login should tell the user exactly what they can trust before they ever leave setup.'
      : 'Login should still make plain-English promises about trust, protection, and the safest next move even while the provider weakens.',
    promises: [
      {
        label: 'Proves now',
        statement: scenario === 'healthy' ? 'This provider can validate and move into Home without a second-guess loop.' : scenario === 'lineSaturated' ? 'These credentials are real, but the account is warning about capacity pressure before playback starts.' : 'This shell can still explain the real trust state instead of hiding it behind a generic login error.',
        detail: scenario === 'healthy'
          ? 'Saved credentials, sample credentials, and the active provider story all stay aligned on the same first move.'
          : scenario === 'lineSaturated'
            ? 'Login proves the difference between auth success and playback readiness before the user blames the wrong layer.'
            : 'Login should name expiry or auth instability plainly while keeping the saved-provider context intact.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Protects next',
        statement: scenario === 'healthy' ? 'The saved-provider path stays visible if the active source weakens later.' : 'The selected provider identity survives the warning state so recovery never feels like a cold restart.',
        detail: scenario === 'healthy'
          ? 'Home can inherit trust facts, sample-credential intent, and the current rehearsal mode without a reset.'
          : 'Even under expiry or unstable auth, Login should preserve the original provider story while promoting the safest backup path.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
      {
        label: 'Safe next move',
        statement: scenario === 'healthy' ? 'Advance into Home immediately.' : 'Advance only through the healthiest saved-provider handoff.',
        detail: scenario === 'healthy'
          ? 'The user should not need a Settings detour or extra explanation before Home.'
          : 'The next action should be more obvious than blind retrying or reconnecting into a dead provider.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home promise stack',
    summary: scenario === 'healthy'
      ? 'Home should publish what the premium browse shell already proves before the user launches deeper.'
      : 'Home should still make crisp promises about preserved browse context and safe recovery when live data or provider trust degrades.',
    promises: [
      {
        label: 'Proves now',
        statement: scenario === 'healthy' ? 'This is a real streaming product surface, not a provider control panel.' : scenario === 'degradedEpg' ? 'The browse shell stays premium even while guide detail softens.' : 'The featured browse story stays on screen while the provider situation is explained honestly.',
        detail: scenario === 'healthy'
          ? 'Hero context, quick rails, and trust posture all land together on first paint.'
          : scenario === 'degradedEpg'
            ? 'Home still proves counts, featured context, and action rails without depending on perfect NOW and NEXT data.'
            : 'Home should keep the product story visible instead of collapsing into a failure dashboard.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Protects next',
        statement: scenario === 'healthy' ? 'The same browse intent can carry into Live, Favorites, Search, or Collections.' : 'The same rails, featured intent, and trust facts stay visible while the shell swaps to safer launch paths.',
        detail: scenario === 'healthy'
          ? 'The user keeps a coherent product story before committing to playback.'
          : 'Cached hero context, saved-provider recovery, and same-category rescue should stay attached to the surface.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
      {
        label: 'Safe next move',
        statement: scenario === 'healthy' ? 'Launch into Live from the same premium shell.' : 'Use the attached healthiest-provider or same-category rescue before a risky launch.',
        detail: scenario === 'healthy'
          ? 'Home should make the next browse step obvious without feeling technical.'
          : 'The recovery CTA belongs beside the same featured or quick-launch surface the user already trusts.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live promise stack',
    summary: scenario === 'healthy'
      ? 'Live should declare what channel-surfing can trust before a single stream launch happens.'
      : 'Live should keep promise language attached to the grid so degraded browse conditions still feel controlled, not chaotic.',
    promises: [
      {
        label: 'Proves now',
        statement: scenario === 'healthy' ? 'The user can filter, preview, and play from one fast card flow.' : scenario === 'degradedLive' ? 'The grid can stay readable and truthful even when the live catalog weakens.' : scenario === 'degradedEpg' ? 'Channel-surfing still works even when guide data goes soft.' : 'This surface can keep channel intent visible while it explains why the active provider is risky.',
        detail: scenario === 'healthy'
          ? 'Preview confidence, category browse, and NOW/NEXT should all reinforce the same premium surf rhythm.'
          : scenario === 'degradedLive'
            ? 'Live should name catalog weakness without dead cards or a back-out-first recovery pattern.'
            : scenario === 'degradedEpg'
              ? 'Guide fallback copy should preserve motion and trust instead of opening gaps in the grid.'
              : 'Line saturation or trust instability should not erase the current category or selected channel story.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' ? 'watch' : 'recover',
      },
      {
        label: 'Protects next',
        statement: scenario === 'healthy' ? 'The current category and selected card stay intact through preview and launch.' : 'The same category momentum and selected-card context survive the recovery path.',
        detail: scenario === 'healthy'
          ? 'Users should not lose the surf rhythm just because they hovered, filtered, or pressed play.'
          : 'Exact-provider fallback or same-category rescue should happen without dumping the user out of the grid.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
      {
        label: 'Safe next move',
        statement: scenario === 'healthy' ? 'Play directly from the active card.' : 'Use the on-card rescue path before leaving the current category flow.',
        detail: scenario === 'healthy'
          ? 'A clean launch should feel like the natural continuation of browsing.'
          : 'The user should see retry, healthiest exact copy, or same-category rescue without hunting through another surface.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' ? 'watch' : 'recover',
      },
    ],
  },
]);

const buildSurfaceEvidenceLedgers = (scenario = 'healthy') => {
  const loginLiveStatement = scenario === 'healthy'
    ? 'Credentials, trust facts, and the next hop into Home are all confirmed by fresh provider checks.'
    : scenario === 'lineSaturated'
      ? 'Credentials still validate live, but capacity pressure is also live and must stay attached to the provider before playback starts.'
      : scenario === 'expiredAccount'
        ? 'Fresh auth truth says this account is expired, so Login cannot pretend the active provider is ready.'
        : scenario === 'authUnstable'
          ? 'Fresh auth checks are wobbling, so Login can only claim that trust is currently unstable.'
          : 'Fresh provider truth is not clean enough to carry Login forward without visible recovery guidance.';

  const homeLiveStatement = scenario === 'healthy'
    ? 'Featured counts, live rails, and trust posture are coming from fresh provider reads.'
    : scenario === 'degradedLive'
      ? 'Home can still trust fresh account posture even while live catalog density is degraded.'
      : scenario === 'degradedEpg'
        ? 'Home can still trust fresh catalog counts even though guide freshness is degraded.'
        : scenario === 'expiredAccount'
          ? 'Fresh provider truth says Home cannot promise a fully live catalog on this source.'
          : 'Fresh provider truth is partial, so Home must separate what is live from what is protected by cache.';

  const liveLiveStatement = scenario === 'healthy'
    ? 'Category rails, preview launch paths, and inline guide context are all backed by fresh provider calls.'
    : scenario === 'degradedLive'
      ? 'Live can only claim that the current provider is degraded, not that the grid is fully trustworthy.'
      : scenario === 'degradedEpg'
        ? 'Live can still trust fresh channel browse results even though guide detail is degraded.'
        : scenario === 'lineSaturated'
          ? 'Live can still trust the current channel list, but must surface that playback capacity is already maxed.'
          : 'Fresh Live truth is constrained, so the shell must stay explicit about what is currently proven.';

  return [
    {
      screenId: 'login',
      title: 'Login evidence ledger',
      summary: scenario === 'healthy'
        ? 'Login should separate live provider truth from saved context so the connect step feels trustworthy instead of theatrical.'
        : 'Login should name exactly what the app knows live, what saved context still protects, and where recovery is an intentional inference rather than a fake certainty.',
      entries: [
        {
          label: 'Provider truth',
          source: 'live',
          statement: loginLiveStatement,
          detail: 'Auth status, expiry pressure, and line usage should always come from the freshest provider read available.',
          tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
        },
        {
          label: 'Saved context',
          source: 'cache',
          statement: 'Saved provider identity, connection labels, and hot-swap options stay visible even while validation changes underneath them.',
          detail: 'The shell should protect multi-provider context so the user never feels like one degraded auth check erased their setup history.',
          tone: scenario === 'healthy' ? 'ready' : 'watch',
        },
        {
          label: 'Recovery boundary',
          source: 'inference',
          statement: scenario === 'healthy'
            ? 'If trust falls later, the healthiest saved provider is the safest inferred next move from Login.'
            : 'The healthiest saved provider is a safe inferred next move, but Login should not overclaim that the degraded source is fixed.',
          detail: 'Recovery language should be explicit that the app is choosing the safest next action, not asserting fresh success on the broken provider.',
          tone: scenario === 'healthy' ? 'ready' : 'recover',
        },
      ],
    },
    {
      screenId: 'home',
      title: 'Home evidence ledger',
      summary: scenario === 'healthy'
        ? 'Home should prove which browse cues are live and which continuity cues are protected by local cache so the surface still feels premium under stress.'
        : 'Home should keep the browse story intact while making the provenance of every reassurance obvious instead of hand-wavy.',
      entries: [
        {
          label: 'Browse truth',
          source: 'live',
          statement: homeLiveStatement,
          detail: 'Featured rails, catalog counts, and provider trust should be treated as live only when the current scenario supports that claim.',
          tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' ? 'watch' : 'recover',
        },
        {
          label: 'Continuity shield',
          source: 'cache',
          statement: 'Saved Home snapshots protect hero art, quick rails, and recent browse context while the provider refreshes or degrades.',
          detail: 'Cache should keep the product story alive without lying that every element is freshly loaded right now.',
          tone: scenario === 'healthy' ? 'ready' : 'watch',
        },
        {
          label: 'Launch inference',
          source: 'inference',
          statement: scenario === 'healthy'
            ? 'If the featured launch goes bad later, the shell can infer the healthiest provider or same-category rescue path without dropping browse intent.'
            : 'The shell can still infer the safest next launch path, but it must say that rescue is based on preserved intent, not fresh proof from the degraded provider.',
          detail: 'The recovery move should preserve the same browse intent while acknowledging when it is switching from live proof to trust-ranked inference.',
          tone: scenario === 'healthy' ? 'ready' : 'recover',
        },
      ],
    },
    {
      screenId: 'live',
      title: 'Live evidence ledger',
      summary: scenario === 'healthy'
        ? 'Live should make it obvious what is freshly proven on-card, what fallback keeps surf momentum alive, and where provider recovery becomes an intentional inference.'
        : 'Live should stay brutally honest about preview, guide, and playback provenance so degraded surf never feels like random failure.',
      entries: [
        {
          label: 'Channel proof',
          source: 'live',
          statement: liveLiveStatement,
          detail: 'Category results, inline NOW/NEXT, preview launch paths, and trust pressure should only be labeled live when the provider still supports that claim.',
          tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
        },
        {
          label: 'Surf fallback',
          source: 'cache',
          statement: 'Preview art, selected channel context, and category focus should remain visible even if live guide or playback conditions degrade.',
          detail: 'Fallback visuals and preserved selection state keep the Live browser usable without pretending the active stream is healthy.',
          tone: scenario === 'healthy' ? 'ready' : 'watch',
        },
        {
          label: 'Rescue inference',
          source: 'inference',
          statement: scenario === 'healthy'
            ? 'If the first playback path fails, the shell can infer the healthiest exact match or same-category fallback without breaking surf flow.'
            : 'The rescue path is an intentional trust-ranked inference, and Live should state that clearly instead of claiming a fresh provider guarantee it does not have.',
          detail: 'Recovery should preserve category and channel intent while clearly labeling the handoff as the safest inferred continuation.',
          tone: scenario === 'healthy' ? 'ready' : 'recover',
        },
      ],
    },
  ];
};

const buildSurfaceFreshnessBoards = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login freshness budget',
    summary: scenario === 'healthy'
      ? 'Login should publish how fresh auth and trust facts must be before the user moves into Home.'
      : 'Login should tell the truth about how long saved trust can stay useful before recovery needs to lead the surface.',
    budgets: [
      {
        label: 'Auth truth',
        liveWindow: scenario === 'healthy' ? 'Fresh on connect' : 'Fresh retry required',
        safeFallbackWindow: scenario === 'healthy' ? 'Saved provider visible until next validation' : 'Saved identity can stay visible while live auth is degraded',
        recoveryTrigger: scenario === 'healthy'
          ? 'If the next validation fails or line pressure spikes, switch Login from launch-led to recovery-led.'
          : 'If auth stays unstable, expired, or saturated after retry, recovery must outrank blind reconnect.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Provider switch path',
        liveWindow: 'Immediate on every saved-provider tap',
        safeFallbackWindow: 'Safe while saved connection metadata remains intact',
        recoveryTrigger: 'If the active provider cannot validate cleanly, promote the healthiest saved provider as the next move.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home freshness budget',
    summary: scenario === 'healthy'
      ? 'Home should state how long hero, counts, and trust cues stay premium before cached continuity takes over.'
      : 'Home should be explicit about when the featured story is still safe from cache and when trust recovery must take the lead.',
    budgets: [
      {
        label: 'Hero + counts',
        liveWindow: scenario === 'healthy' ? 'Current provider refresh cycle' : scenario === 'degradedEpg' ? 'Catalog live, guide soft' : 'Partial live truth only',
        safeFallbackWindow: 'Saved Home snapshot remains safe for the next in-place refresh',
        recoveryTrigger: scenario === 'healthy'
          ? 'If refresh misses or provider trust drops, keep the cached Home shell visible and attach recovery to the same launch rail.'
          : 'If repeated refreshes miss or trust worsens, recovery must replace any claim that Home is fully live.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Featured launch path',
        liveWindow: scenario === 'healthy' ? 'Fresh while provider trust stays green' : 'Fresh only while the current scenario still supports launch confidence',
        safeFallbackWindow: 'Safe while the healthiest exact copy or same-category rescue remains available',
        recoveryTrigger: 'If the active provider cannot back the featured launch, switch to healthiest-provider or same-category rescue without dropping Home context.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live freshness budget',
    summary: scenario === 'healthy'
      ? 'Live should tell the user how fresh preview, guide, and recovery claims are before they press play.'
      : 'Live should separate usable surf continuity from stale playback certainty so degraded browse never feels misleading.',
    budgets: [
      {
        label: 'Guide + preview',
        liveWindow: scenario === 'healthy' ? 'Fresh on current surf load' : scenario === 'degradedEpg' ? 'Guide degraded, preview still current' : scenario === 'degradedLive' ? 'Preview context only' : 'Partial live surf truth',
        safeFallbackWindow: 'Selected channel, category focus, and preview art stay safe while the grid recovers',
        recoveryTrigger: scenario === 'healthy'
          ? 'If preview or guide freshness drops, keep surf context visible and attach fallback copy directly to the card.'
          : 'If fresh surf proof weakens further, Live must stop implying the active card is launch-safe and lead with recovery.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' ? 'watch' : 'recover',
      },
      {
        label: 'Playback rescue',
        liveWindow: scenario === 'healthy' ? 'Fresh while the current provider can still back playback' : 'Fresh only while trust and capacity still support launch',
        safeFallbackWindow: 'Safe while healthiest exact copy or same-category rescue is still available',
        recoveryTrigger: 'If trust, auth, or line capacity breaks launch safety, switch the card to rescue-first behavior before the user loses surf momentum.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceContradictionBoards = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login contradiction board',
    summary: scenario === 'healthy'
      ? 'Login should still publish which signal wins if saved-provider familiarity, live trust, and launch momentum ever disagree.'
      : 'Login should make the winning truth explicit whenever the saved provider still looks familiar but live trust says the next move must change.',
    contradictions: [
      {
        label: 'Saved provider looks healthy, live auth says no',
        conflictingSignals: scenario === 'healthy'
          ? 'A familiar saved provider can feel trustworthy even before the latest validation completes.'
          : 'Saved-provider familiarity and remembered success can conflict with expired or unstable live auth truth.',
        winningTruth: scenario === 'healthy'
          ? 'Fresh auth validation outranks saved comfort before Login promotes Home.'
          : 'The live auth result wins, even if the saved connection still looks polished and familiar.',
        suppressRule: scenario === 'healthy'
          ? 'Do not show a blind advance state until fresh trust is known.'
          : 'Suppress launch-confident copy and promote recovery-first guidance until trust is clean again.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
      {
        label: 'Auth succeeds, capacity says risky',
        conflictingSignals: 'A green auth result can conflict with line-capacity pressure that makes playback unsafe.',
        winningTruth: 'Capacity risk wins over generic success because the user’s next pain happens at launch, not login.',
        suppressRule: 'Suppress “ready to stream” language and keep the healthiest-provider escape hatch visible before Home.',
        tone: scenario === 'lineSaturated' ? 'watch' : 'ready',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home contradiction board',
    summary: scenario === 'healthy'
      ? 'Home should state which browse truth wins if cached continuity, live counts, and recovery posture ever drift apart.'
      : 'Home should explain which message wins when the hero still looks premium but live browse truth no longer fully backs it.',
    contradictions: [
      {
        label: 'Hero feels live, cache is carrying it',
        conflictingSignals: scenario === 'healthy'
          ? 'Featured art and rails can stay smooth even while a refresh is happening underneath them.'
          : 'Cached hero continuity can look fully live even when fresh provider truth is partial or degraded.',
        winningTruth: scenario === 'healthy'
          ? 'Continuity can stay premium, but Home should only call the surface fully live once the refresh lands.'
          : 'Cache-backed continuity wins over empty-state collapse, but it cannot be labeled as fully live provider truth.',
        suppressRule: 'Suppress hard-live wording when the hero is being protected by cache and keep recovery language attached to the same rail.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Launch CTA looks confident, trust posture says recover',
        conflictingSignals: 'A premium featured launch can conflict with expiry, auth instability, or provider-capacity warnings.',
        winningTruth: 'Trust posture wins over hero confidence because the next action must stay safer than the artwork looks.',
        suppressRule: 'Suppress blind play language and keep the healthiest-provider or same-category rescue attached to the featured surface.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live contradiction board',
    summary: scenario === 'healthy'
      ? 'Live should make clear which signal wins if preview confidence, guide confidence, and playback safety ever disagree.'
      : 'Live should keep the surf flow honest when the grid still looks usable but guide, catalog, or provider trust is telling a more cautious story.',
    contradictions: [
      {
        label: 'Preview looks ready, launch safety is degraded',
        conflictingSignals: scenario === 'healthy'
          ? 'A healthy preview can make the active card feel launch-ready before every playback risk is checked.'
          : 'Preview art or motion can still look alive while capacity, auth, or provider degradation makes the active launch unsafe.',
        winningTruth: scenario === 'healthy'
          ? 'Launch safety must still win over visual confidence before the user presses play.'
          : 'Recovery truth wins over visual preview confidence whenever the provider cannot safely back playback.',
        suppressRule: 'Suppress “play now” certainty on the active card and elevate retry, healthiest-copy, or same-category rescue first.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Guide is stale, channel surf is still useful',
        conflictingSignals: 'Missing or degraded NOW/NEXT can make the whole grid look broken even when category browse and preview still work.',
        winningTruth: 'Surf continuity wins over guide completeness as long as the surface states that guide detail is the degraded layer.',
        suppressRule: 'Suppress dead-air guide gaps; replace them with explicit fallback copy while keeping preview and category actions live.',
        tone: scenario === 'degradedEpg' ? 'watch' : 'ready',
      },
    ],
  },
]);

const buildSurfaceResetBoundaries = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login reset boundary',
    summary: scenario === 'healthy'
      ? 'Login should make it obvious that provider revalidation can happen in place and should not wipe setup confidence by default.'
      : 'Login should say exactly which trust changes can refresh in place and which ones truly force a fresh start so recovery never feels punitive.',
    boundaries: [
      {
        label: 'Trust recheck',
        refreshesInPlace: scenario === 'healthy'
          ? 'Revalidate auth, expiry, and line usage inside the current form.'
          : 'Retry auth and provider trust in place without throwing away the saved-provider surface.',
        preserves: 'Server URL, username, saved provider identity, and the active recovery prompt stay visible.',
        hardResetTrigger: scenario === 'healthy'
          ? 'Only a provider switch or explicit credential edit should reset the current Login story.'
          : 'Only a different provider choice or new credentials should hard-reset Login; degraded auth alone should not.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider continuity',
        refreshesInPlace: 'Switch the next recommended provider or retry target without dumping the user out of setup.',
        preserves: 'Saved connection labels, sample-credential guidance, and the next hop into Home remain attached to the same surface.',
        hardResetTrigger: 'Delete the saved connection or intentionally clear the setup state.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home reset boundary',
    summary: scenario === 'healthy'
      ? 'Home should preserve the premium browse shell through refreshes instead of acting like every trust wobble is a full-screen failure.'
      : 'Home should tell the truth about what can refresh in place, what browse context survives, and what event actually justifies a hard reset.',
    boundaries: [
      {
        label: 'Browse shell refresh',
        refreshesInPlace: scenario === 'healthy'
          ? 'Hero art, rail counts, and trust posture can all refresh inside the same Home shell.'
          : 'Trust facts, hero freshness, and rail density should refresh inside Home even when the active provider is degraded.',
        preserves: 'Featured focus, quick-launch intent, cached rails, and current recovery CTAs stay visible during the refresh.',
        hardResetTrigger: scenario === 'healthy'
          ? 'Only an intentional provider swap or a route change should rebuild Home from scratch.'
          : 'Only losing both live truth and usable cached continuity should justify a hard Home reset.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Launch-path recovery',
        refreshesInPlace: 'Swap to the healthiest exact provider or same-category rescue path directly on the same hero or rail.',
        preserves: 'The original browse intent, featured context, and visible provider trust story stay attached to the CTA.',
        hardResetTrigger: 'Only a missing fallback path or an explicit provider replacement should force Home back to a neutral state.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live reset boundary',
    summary: scenario === 'healthy'
      ? 'Live should keep surf momentum alive through guide, preview, and trust refreshes instead of punting the user out of the grid.'
      : 'Live should publish which failures still allow in-place surf recovery and which ones actually force a hard grid reset.',
    boundaries: [
      {
        label: 'Surf refresh',
        refreshesInPlace: scenario === 'healthy'
          ? 'Guide, preview, and playback readiness can refresh on the active card without losing the current category.'
          : scenario === 'degradedEpg'
            ? 'Guide truth can soften in place while the selected card and category stay live.'
            : 'Grid trust, recovery posture, and launch safety should refresh in place before Live ever abandons the current surf flow.',
        preserves: 'Selected category, selected card, preview art, favorites state, and visible recovery actions remain on-screen.',
        hardResetTrigger: scenario === 'healthy'
          ? 'Only an intentional category jump, provider swap, or explicit player launch should move the user out of the current grid story.'
          : 'Only losing both the selected-card context and all safe rescue paths should justify a hard Live reset.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Playback rescue',
        refreshesInPlace: 'Swap to the healthiest exact match or same-category fallback directly from the active card.',
        preserves: 'Channel intent, category momentum, and the reason for the rescue stay attached to the same browsing surface.',
        hardResetTrigger: 'Only a totally missing rescue path or a deliberate provider change should force Live back to first principles.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceActionGates = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login action gate',
    summary: scenario === 'healthy'
      ? 'Login should say exactly when Connect is truly premium and when recovery into a healthier saved provider is the safer first action.'
      : 'Login should downgrade the loudest button before the user walks into bad auth, expired access, or maxed lines with false confidence.',
    gates: [
      {
        label: 'Connect CTA',
        primaryAction: scenario === 'healthy'
          ? 'Connect with saved or sample credentials and move straight into Home.'
          : 'Keep Connect available only as a trust-aware action, not as a blind promise of safe launch.',
        downgradedAction: scenario === 'healthy'
          ? 'If trust is still checking, hold the premium tone and keep retry guidance visible in place.'
          : 'Promote recover into Home on the healthiest saved provider before asking for another blind auth attempt.',
        unlockCondition: scenario === 'healthy'
          ? 'Fresh auth, valid account status, and usable provider capacity keep Connect premium.'
          : 'Restore the premium Connect path only after fresh auth is clean and account pressure no longer outranks launch confidence.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider shortcut',
        primaryAction: 'Let the saved-provider card stay one move away from Home without turning it into a stale trust shortcut.',
        downgradedAction: 'Downgrade the shortcut into a recovery move when live trust says this provider should not own the next launch.',
        unlockCondition: 'The shortcut becomes premium again once the saved provider validates cleanly and no better provider posture exists.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home action gate',
    summary: scenario === 'healthy'
      ? 'Home should state when featured launch stays premium and when provider recovery needs to take over the brightest CTA.'
      : 'Home should not let a cinematic hero keep selling a blind play move after trust, freshness, or provider capacity says recovery first.',
    gates: [
      {
        label: 'Featured launch',
        primaryAction: scenario === 'healthy'
          ? 'Keep the featured play path premium while hero truth, provider trust, and launch safety all line up.'
          : 'Only treat featured launch as premium while the active provider can still back the next move.',
        downgradedAction: scenario === 'healthy'
          ? 'If Home is refreshing, keep the same featured shell live and attach trust-aware copy to the CTA.'
          : 'Promote healthiest-provider or same-category rescue on the hero before the user clicks into a dead launch.',
        unlockCondition: 'Restore premium featured launch only when fresh Home truth and provider posture both support the same next action again.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Quick rails',
        primaryAction: 'Keep quick rails feeling instant while their linked surfaces still have safe launch paths behind them.',
        downgradedAction: 'Downgrade rails into recovery-led navigation when the provider can no longer back the normal browse path safely.',
        unlockCondition: 'Rail actions regain premium status once the linked surface validates that its trust and launch story are aligned again.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live action gate',
    summary: scenario === 'healthy'
      ? 'Live should say when play now is truly safe and when rescue-first actions need to take over without killing surf momentum.'
      : 'Live should downgrade the hottest launch action before preview confidence tricks the user into clicking through provider failure.',
    gates: [
      {
        label: 'Active card play',
        primaryAction: scenario === 'healthy'
          ? 'Keep Play premium when selected-card trust, preview confidence, guide context, and provider capacity all support launch.'
          : 'Only let Play feel premium while the active card still has live launch safety behind it.',
        downgradedAction: scenario === 'healthy'
          ? 'If Live is rechecking trust, keep surf context and make retry or rescue visible on the same card.'
          : 'Promote healthiest exact copy or same-category rescue before asking the user to press Play again.',
        unlockCondition: 'Restore premium Play only when the active card regains fresh launch safety and no stronger recovery warning is active.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'lineSaturated' || scenario === 'degradedEpg' ? 'watch' : 'recover',
      },
      {
        label: 'Category surf actions',
        primaryAction: 'Keep category changes, favorites, and preview motion feeling live while the grid still supports safe browsing.',
        downgradedAction: 'Downgrade the active card into rescue-led surf copy when the grid can still browse but the current provider should stop owning launch.',
        unlockCondition: 'Bring back premium surf actions once fresh trust confirms the current category can safely launch again from the active provider.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceIntentLocks = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login intent lock',
    summary: scenario === 'healthy'
      ? 'Login should protect the user intent to connect a known provider quickly without making them restart setup for every trust recheck.'
      : 'Login should say exactly which setup intent stays protected through auth noise and which event actually breaks the path into Home.',
    locks: [
      {
        label: 'Connect this provider',
        protectedIntent: 'Keep the current server, username, and saved-provider identity anchored while trust revalidates in place.',
        allowedDrift: scenario === 'healthy'
          ? 'Auth, expiry, and line-capacity facts can refresh without changing the setup story.'
          : 'Recovery copy, trust badges, and healthiest-provider suggestions may change while the typed credentials stay locked in place.',
        breakCondition: scenario === 'healthy'
          ? 'Only an intentional provider swap or credential edit should break the current connect intent.'
          : 'Only a different provider choice or explicit credential replacement should break the current connect intent.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Use a saved shortcut',
        protectedIntent: 'Keep the saved-provider shortcut tied to a clear next move instead of turning it into a blind trust leap.',
        allowedDrift: 'The shortcut can downgrade from premium launch to recovery-first guidance without losing the provider identity or destination.',
        breakCondition: 'Delete the saved connection or replace it with a healthier provider choice.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home intent lock',
    summary: scenario === 'healthy'
      ? 'Home should protect browse intent so featured discovery, quick rails, and provider trust can refresh without collapsing the product story.'
      : 'Home should keep the user anchored to the same discovery intent even when trust, freshness, or recovery posture changes underneath it.',
    locks: [
      {
        label: 'Stay in browse mode',
        protectedIntent: 'Keep the user in the same featured or quick-rail discovery flow while Home refreshes provider truth in place.',
        allowedDrift: scenario === 'healthy'
          ? 'Hero counts, guide support, and provider trust chips can update without moving the user out of Home.'
          : 'Hero confidence, trust language, and fallback actions may change while the same browse context stays visible.',
        breakCondition: scenario === 'healthy'
          ? 'Only a deliberate route change or provider swap should break Home browse intent.'
          : 'Only losing both live truth and usable cached continuity should break the current Home browse intent.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Launch from this rail',
        protectedIntent: 'Keep the chosen hero or quick rail as the launch anchor even if the recovery action changes.',
        allowedDrift: 'The CTA can shift from premium launch to healthiest-provider or same-category rescue without losing the original discovery target.',
        breakCondition: 'Only a missing rescue path or an intentional provider replacement should break the rail-level launch intent.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live intent lock',
    summary: scenario === 'healthy'
      ? 'Live should protect surf momentum so category choice, selected card, and preview context survive trust and guide refreshes.'
      : 'Live should keep the user anchored to the same channel-surf intent even when the launch action has to downgrade into recovery.',
    locks: [
      {
        label: 'Surf this category',
        protectedIntent: 'Keep the selected category, selected card, and preview context attached to the current surf session.',
        allowedDrift: scenario === 'healthy'
          ? 'Guide detail, trust facts, and readiness copy can refresh without kicking the user out of the grid.'
          : 'Guide fidelity, rescue copy, and CTA hierarchy may change while the same category surf stays alive.',
        breakCondition: scenario === 'healthy'
          ? 'Only an intentional category jump, player launch, or provider switch should break the current surf intent.'
          : 'Only losing both the selected-card context and all safe rescue paths should break the current surf intent.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Launch this channel safely',
        protectedIntent: 'Keep the current channel choice as the target even when Live has to hand launch authority to rescue-first actions.',
        allowedDrift: 'The active action can pivot from Play to healthiest exact copy or same-category recovery without losing the chosen channel intent.',
        breakCondition: 'Only a totally missing recovery path or an explicit provider replacement should break the channel-level launch intent.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceExplanationBoundaries = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login explanation boundary',
    summary: scenario === 'healthy'
      ? 'Login should say the trust-critical setup facts out loud, while keeping the premium tone free from unnecessary support narration.'
      : 'Login should declare which provider risks must be explicit immediately, which setup confidence can stay implied, and when blunt recovery language has to take over.',
    boundaries: [
      {
        label: 'Trust disclosure',
        mustSayExplicitly: scenario === 'healthy'
          ? 'State which provider is being connected, whether auth is fresh, and whether the account looks launch-ready.'
          : 'State the actual provider risk directly: expired account, unstable auth, or maxed lines cannot stay buried in decorative trust copy.',
        canStayImplied: 'Premium visual polish, saved-provider familiarity, and the fact that Home is the next destination can stay implied by the shell.',
        forcedDisclosureTrigger: scenario === 'healthy'
          ? 'Only a real trust downgrade should force the copy to become more literal than premium.'
          : 'Any failed auth check, expired status, or capacity warning forces blunt recovery wording before another connect attempt.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider reassurance',
        mustSayExplicitly: 'Tell the user when a healthier saved provider is the safer next move than retrying the active one.',
        canStayImplied: 'The saved-provider card can still feel lightweight and one-tap without re-explaining the entire connection model.',
        forcedDisclosureTrigger: 'The moment the active provider stops being the safest next launch owner, the shortcut has to explain why it downgraded.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home explanation boundary',
    summary: scenario === 'healthy'
      ? 'Home should say enough about freshness, trust, and launch readiness to keep browse confidence high without turning the hero into a support article.'
      : 'Home should declare which degraded truths must be spoken plainly, which product confidence can stay ambient, and when the hero has to stop implying everything is fine.',
    boundaries: [
      {
        label: 'Hero truth disclosure',
        mustSayExplicitly: scenario === 'healthy'
          ? 'Call out provider readiness, featured launch safety, and any cache or guide fallback that affects the next move.'
          : 'State when the hero is leaning on cached truth, rescue-first launch, or degraded provider posture instead of pretending the featured path is fully live.',
        canStayImplied: 'The cinematic browse tone, category density, and quick-rail momentum can stay implied by the layout and interaction model.',
        forcedDisclosureTrigger: scenario === 'healthy'
          ? 'Only a mismatch between featured confidence and provider trust should force stronger explanatory copy.'
          : 'Any time recovery outranks featured launch, the hero must explain the downgrade explicitly instead of relying on badges alone.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail recovery disclosure',
        mustSayExplicitly: 'Say when a rail is sending the user into a healthier provider or same-category rescue instead of the default launch path.',
        canStayImplied: 'The broader promise that StreamDeck still feels premium during recovery can stay visual and interaction-driven.',
        forcedDisclosureTrigger: 'A rail CTA switching away from its normal owner must explain the recovery ownership change immediately.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live explanation boundary',
    summary: scenario === 'healthy'
      ? 'Live should say the surf-critical truth clearly while letting the grid stay fast, visual, and not overloaded with operator prose.'
      : 'Live should declare which launch and guide risks must be explicit on-card, which surf confidence can stay ambient, and when rescue copy must override preview seduction.',
    boundaries: [
      {
        label: 'On-card launch disclosure',
        mustSayExplicitly: scenario === 'healthy'
          ? 'State when the selected card is launch-ready, when guide truth is partial, and when playback rescue is available.'
          : 'State when Play is no longer the safest move, when preview is only decorative confidence, and when rescue has taken over launch authority.',
        canStayImplied: 'The feeling of fast category surf, visual scanning, and live-TV momentum can stay implied by the grid and preview behavior.',
        forcedDisclosureTrigger: scenario === 'healthy'
          ? 'Only a direct mismatch between the selected card and safe launch should force stronger language.'
          : 'Any time preview confidence outruns launch safety, the card must switch to plain recovery language immediately.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Category rescue disclosure',
        mustSayExplicitly: 'Explain when the surf session is being preserved through exact-match rescue or same-category recovery rather than the original provider.',
        canStayImplied: 'The broader premium promise that the user did not lose their place can stay visible through preserved selection and category state.',
        forcedDisclosureTrigger: 'A provider handoff inside the same surf flow must explain who owns launch now and why.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildAdapterManifest = (scenario = 'healthy') => ({
  adapterId: 'mock-xtream-codes',
  providerName: 'StreamDeck Mock Xtream Provider',
  providerType: 'Xtream Codes rehearsal adapter',
  projectStatus: 'Login + Home + Live proof scaffolded and demo-ready in the shell',
  activeScenario: scenario,
  commandCenter: {
    title: 'Shared launch ops console',
    summary: scenario === 'healthy'
      ? 'Login, Home, and Live now read from one adapter-driven operations shell so the launch path, trust path, and recovery path stay aligned in-product.'
      : 'Login, Home, and Live are now driven by one adapter-fed operations shell, so degraded rehearsals keep the same next move and recovery story instead of drifting into surface-specific copy.',
    nextMoveLabel: scenario === 'healthy' ? 'Connect -> Home -> Live' : 'Keep context, then recover fast',
    failureModeLabel: scenario === 'healthy' ? 'Healthy launch rehearsal' : scenarioLabels[scenario] || 'Scenario rehearsal',
  },
  sampleCredentials: {
    server: host,
    username: 'test',
    password: 'test',
  },
  differentiators: [
    {
      title: 'Trust-first login',
      detail: 'Login can connect, validate, save, and rehearse failure without dropping the provider context.',
      surface: 'login',
    },
    {
      title: 'Home with provider truth',
      detail: 'Home combines hero browse rails, inline guide context, and saved-provider recovery instead of hiding account risk in Settings.',
      surface: 'home',
    },
    {
      title: 'Live TV surf flow',
      detail: 'Live keeps filtering, preview, NOW/NEXT, and fallback launch paths in one browser instead of forcing guide-first detours.',
      surface: 'live',
    },
    {
      title: 'Shared escalation ladder',
      detail: 'Login, Home, and Live now publish the same first move, second move, and last safe fallback straight from the adapter manifest.',
      surface: 'live',
    },
    {
      title: 'Scenario impact matrix',
      detail: 'Login, Home, and Live now publish how healthy, degraded, and trust-risk rehearsals change each surface before the user hits a dead end.',
      surface: 'home',
    },
    {
      title: 'Surface promise stack',
      detail: 'Login, Home, and Live now publish what the screen proves now, what it protects next, and why the next move is still safe straight from the adapter manifest.',
      surface: 'login',
    },
    {
      title: 'Surface freshness budget',
      detail: 'Login, Home, and Live now publish how fresh each trust and browse claim must be, what fallback stays safe, and when recovery takes over straight from the adapter manifest.',
      surface: 'home',
    },
    {
      title: 'Surface contradiction board',
      detail: 'Login, Home, and Live now publish which signal wins when live truth, cache continuity, and recovery posture disagree straight from the adapter manifest.',
      surface: 'live',
    },
    {
      title: 'Surface action gate',
      detail: 'Login, Home, and Live now publish which action stays premium, which fallback takes over first, and what unlocks the premium path again straight from the adapter manifest.',
      surface: 'login',
    },
    {
      title: 'Surface intent lock',
      detail: 'Login, Home, and Live now publish which user intent stays protected, what can drift around it, and what actually breaks that promise straight from the adapter manifest.',
      surface: 'home',
    },
    {
      title: 'Surface explanation boundary',
      detail: 'Login, Home, and Live now publish what must be said explicitly, what can stay implied, and what forces blunt recovery language straight from the adapter manifest.',
      surface: 'live',
    },
  ],
  supportedScreens: [
    {
      id: 'login',
      title: 'Login shell',
      status: 'ready',
      detail: 'Supports sample credentials, saved-connection switching, scenario rehearsal, and trust-led recovery into Home.',
      proof: [
        'Connect with the local mock credentials',
        'Switch scenarios without leaving the screen',
        'Jump to the healthiest saved provider when trust degrades',
      ],
      verificationTarget: 'Saved-provider login has to feel safe, deliberate, and one move away from Home.',
      successSignal: 'The user can connect or switch providers without asking what to do next.',
    },
    {
      id: 'home',
      title: 'Home dashboard',
      status: 'ready',
      detail: 'Shows featured live browse, provider trust cockpit, quick-launch rails, and mock-provider recovery guidance.',
      proof: [
        'Featured live card launches playback directly',
        'Quick actions cover Live, Favorites, Collections, Continue, Search, and Settings',
        'Scenario toggles refresh Home in place',
      ],
      verificationTarget: 'Home needs to prove this is a product surface, not a provider admin screen.',
      successSignal: 'Hero context, quick rails, and trust cues stay visible together on the first paint.',
    },
    {
      id: 'live',
      title: 'Live browser',
      status: 'rehearsal-friendly',
      detail: 'Delivers category browse, inline guide, preview fallback, favorites, and healthier-provider recovery from each channel card.',
      proof: [
        'Filter by category and search without leaving the page',
        'Hover/focus updates the preview player',
        'Exact-provider fallback or same-category rescue stays on-card',
      ],
      verificationTarget: 'Live browsing should feel fast enough that users stop thinking about the provider.',
      successSignal: 'The user can filter, preview, and recover from one channel card without losing browse context.',
    },
  ],
  launchMatrix: [
    {
      screenId: 'login',
      title: 'Login launch contract',
      primaryActionLabel: 'Use mock credentials',
      primaryActionHref: '#connect-form',
      recoveryActionLabel: 'Recover into Home',
      recoveryActionHref: '/home',
      operatorPrompt: scenario === 'healthy'
        ? 'Start by loading the sample credentials, validate once, and move into Home without leaving the shell.'
        : 'Use the same saved-login shell, but make the recovery move obvious before the user mistakes trust failure for a bad stream.',
      verificationSteps: [
        'Load the sample credentials or a saved connection',
        'Validate once and confirm trust context stays visible',
        'Move into Home without dropping the active provider story',
      ],
    },
    {
      screenId: 'home',
      title: 'Home launch contract',
      primaryActionLabel: 'Open Home rails',
      primaryActionHref: '/home',
      recoveryActionLabel: 'Open Live browser',
      recoveryActionHref: '/live',
      operatorPrompt: scenario === 'healthy'
        ? 'Home should prove featured browse, provider trust, and fast launch paths from one premium surface.'
        : 'Keep counts, rails, and trust visible while recovery stays one tap away instead of burying the rescue move in Settings.',
      verificationSteps: [
        'Confirm hero counts and provider facts render together',
        'Use a quick rail without leaving the product narrative',
        'Verify scenario refresh keeps the same Home context alive',
      ],
    },
    {
      screenId: 'live',
      title: 'Live launch contract',
      primaryActionLabel: 'Open Live browser',
      primaryActionHref: '/live',
      recoveryActionLabel: 'Return to Home',
      recoveryActionHref: '/home',
      operatorPrompt: scenario === 'healthy'
        ? 'Live should prove category surf speed, preview confidence, and inline NOW/NEXT without a guide-first detour.'
        : 'Keep the same browse context alive while the recovery path stays attached to the card-level launch flow.',
      verificationSteps: [
        'Open a category and confirm the grid stays fast',
        'Preview a channel without a full navigation jump',
        'Use the recovery move without losing the selected browse context',
      ],
    },
  ],
  proofJourney: [
    {
      label: 'Login first',
      detail: 'Start with credentials, trust, and saved-provider switching.',
      href: '#connect-form',
    },
    {
      label: 'Home second',
      detail: 'Prove hero context, quick rails, and provider posture together.',
      href: '/home',
    },
    {
      label: 'Live third',
      detail: 'Finish on category surf speed, preview, and fallback launch.',
      href: '/live',
    },
  ],
  surfacePlaybooks: [
    {
      screenId: 'login',
      readinessLabel: scenario === 'healthy' ? 'Launch ready' : scenario === 'expiredAccount' || scenario === 'authUnstable' ? 'Trust recovery in play' : 'Watch trust before launch',
      readinessTone: scenario === 'healthy' ? 'ready' : scenario === 'expiredAccount' || scenario === 'authUnstable' ? 'recover' : 'watch',
      operatorGoal: 'Make the first move feel safe, obvious, and one step away from Home.',
      userPromise: scenario === 'healthy'
        ? 'The user can load sample credentials or a saved provider and move forward without feeling like they entered a setup utility.'
        : 'The user should understand the provider risk immediately and still see the fastest safe move without leaving the login shell.',
      commandChips: ['Saved providers', 'Trust facts', 'Recover to Home'],
    },
    {
      screenId: 'home',
      readinessLabel: scenario === 'healthy' ? 'Browse ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'Fallback browse active' : 'Recovery browse active',
      readinessTone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      operatorGoal: 'Keep the product story intact while trust, counts, and launch rails stay visible together.',
      userPromise: scenario === 'healthy'
        ? 'The user lands on a product surface with featured context, quick rails, and provider posture on the first paint.'
        : 'The user keeps the same Home context while the shell explains what degraded and how to recover without bouncing into Settings.',
      commandChips: ['Hero counts', 'Quick rails', 'Same-category rescue'],
    },
    {
      screenId: 'live',
      readinessLabel: scenario === 'healthy' ? 'Surf ready' : scenario === 'degradedLive' ? 'Catalog fallback active' : 'Recovery surf active',
      readinessTone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' ? 'watch' : 'recover',
      operatorGoal: 'Keep channel-surf momentum alive while preview, NOW/NEXT, and fallback launches stay attached to the card.',
      userPromise: scenario === 'healthy'
        ? 'The user can filter, preview, and play fast enough to stop thinking about the provider.'
        : 'The user should keep their browsing context while the shell makes the healthiest exact copy or same-category rescue obvious.',
      commandChips: ['Preview first', 'NOW / NEXT', 'On-card recovery'],
    },
  ],
  surfaceScorecards: buildSurfaceScorecards(scenario),
  surfaceExitCriteria: buildSurfaceExitCriteria(scenario),
  surfaceHandoffs: buildSurfaceHandoffs(scenario),
  surfaceEscalationLadders: buildSurfaceEscalationLadders(scenario),
  surfaceScenarioMatrix: buildSurfaceScenarioMatrix(scenario),
  surfacePromiseStacks: buildSurfacePromiseStacks(scenario),
  surfaceEvidenceLedgers: buildSurfaceEvidenceLedgers(scenario),
  surfaceFreshnessBoards: buildSurfaceFreshnessBoards(scenario),
  surfaceContradictionBoards: buildSurfaceContradictionBoards(scenario),
  surfaceResetBoundaries: buildSurfaceResetBoundaries(scenario),
  surfaceActionGates: buildSurfaceActionGates(scenario),
  surfaceIntentLocks: buildSurfaceIntentLocks(scenario),
  surfaceExplanationBoundaries: buildSurfaceExplanationBoundaries(scenario),
  scenarioSpotlight: {
    title: scenario === 'healthy' ? 'Healthy launch rehearsal' : scenarioLabels[scenario] || 'Scenario rehearsal',
    summary: scenario === 'healthy'
      ? 'The happy path should walk cleanly from saved-provider login into Home and then into Live without any dead-end utility screens.'
      : scenario === 'degradedLive'
        ? 'This rehearsal is about keeping Home and Login confident while Live explains degraded browse conditions without pretending the whole provider disappeared.'
        : scenario === 'degradedSearch'
          ? 'This rehearsal is about preserving the product shell while catalog-heavy surfaces lose depth and recovery messaging has to stay specific.'
          : scenario === 'degradedEpg'
            ? 'This rehearsal is about letting guide data fail quietly while the launch path, preview flow, and trust shell stay intact.'
            : scenario === 'lineSaturated'
              ? 'This rehearsal is about showing account pressure before playback gets blamed, while keeping healthier-provider recovery obvious.'
              : scenario === 'expiredAccount'
                ? 'This rehearsal is about keeping the saved-provider story understandable even when fresh Xtream requests are blocked.'
                : 'This rehearsal is about holding cached context in place while auth confidence drops and the next move stays explicit.',
    surfaces: scenario === 'degradedSearch'
      ? ['login', 'home']
      : scenario === 'degradedLive'
        ? ['home', 'live']
        : ['login', 'home', 'live'],
    checks: scenario === 'healthy'
      ? [
        'Login should hand the user into Home without any admin-panel detour.',
        'Home should make the Live launch path obvious from the first screenful.',
        'Live should keep preview plus NOW/NEXT attached to the browsing flow.',
      ]
      : scenario === 'degradedLive'
        ? [
          'Login still looks trustworthy because auth is not the problem.',
          'Home still carries provider context and the rescue move forward.',
          'Live explains the degraded catalog state and keeps a recovery action nearby.',
        ]
        : scenario === 'degradedSearch'
          ? [
            'Login and Home should still feel launch-ready.',
            'The shell should explain which deeper catalogs are degraded instead of going vague.',
            'Recovery copy should stay product-facing, not debug-facing.',
          ]
          : scenario === 'degradedEpg'
            ? [
              'Guide chips can degrade, but launch actions should not disappear.',
              'Home should preserve counts and hero context while guide copy downgrades.',
              'Live should keep preview-first browsing active even when NOW/NEXT goes missing.',
            ]
            : scenario === 'lineSaturated'
              ? [
                'Trust warnings should appear before playback gets blamed.',
                'Home and Live should keep the browse flow intact while capacity risk is visible.',
                'The healthiest saved-provider switch should feel like part of the product, not support advice.',
              ]
              : scenario === 'expiredAccount'
                ? [
                  'Login has to say the account is expired plainly.',
                  'Home should keep cached product context alive alongside renewal guidance.',
                  'Live should stop treating the failure as a stream-only issue.',
                ]
                : [
                  'Saved-provider context should stay visible while auth revalidation fails.',
                  'Home and Live should keep usable cached context on screen.',
                  'Retry and switch-provider actions should stay explicit on the same surface.',
                ],
  },
  demoChecklist: [
    'Connect with test/test on localhost:3579',
    'Open Home and verify hero counts plus provider fact grid',
    'Open Live and confirm preview + NOW/NEXT + provider fallback actions',
    'Flip to a degraded scenario and confirm the shell keeps context instead of blanking out',
  ],
  capabilityMatrix: [
    { label: 'Live groups', value: String(liveCategories.length) },
    { label: 'Live channels', value: String(liveStreams.length) },
    { label: 'Movies', value: String(vodStreams.length) },
    { label: 'Series', value: String(series.length) },
    { label: 'Scenarios', value: Object.keys(scenarioLabels).length.toString() },
    { label: 'Primary surfaces', value: 'Login, Home, Live' },
  ],
});

const sendJson = (res, data) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  });
  res.end(JSON.stringify(data));
};

const server = http.createServer((req, res) => {
  if (!req.url) return sendJson(res, { error: 'Invalid request' });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, host);
  const path = url.pathname;
  const action = url.searchParams.get('action');
  const username = url.searchParams.get('username') || 'demo';
  const password = url.searchParams.get('password') || 'demo';
  const categoryId = url.searchParams.get('category_id');
  const scenario = url.searchParams.get('scenario') || 'healthy';
  const degradedSearch = scenario === 'degradedSearch';
  const degradedLive = scenario === 'degradedLive';
  const degradedEpg = scenario === 'degradedEpg';
  const lineSaturated = scenario === 'lineSaturated';
  const expiredAccount = scenario === 'expiredAccount';
  const authUnstable = scenario === 'authUnstable';

  if (path === '/player_api.php') {
    if (!action) return sendJson(res, authResponse(username, password, scenario));
    if (expiredAccount || authUnstable) {
      res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: expiredAccount ? 'Mock provider account expired' : 'Mock provider auth temporarily unstable', scenario }));
    }
    if (action === 'get_live_categories') return sendJson(res, liveCategories);
    if (action === 'get_live_streams') {
      if (degradedLive) {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Mock live catalog temporarily unavailable', scenario }));
      }
      return sendJson(res, filterByCategory(liveStreams, categoryId));
    }
    if (action === 'get_vod_categories') return sendJson(res, vodCategories);
    if (action === 'get_vod_streams') {
      if (degradedSearch) {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Mock VOD search catalog temporarily unavailable', scenario }));
      }
      return sendJson(res, filterByCategory(vodStreams, categoryId));
    }
    if (action === 'get_vod_info') {
      const vodId = url.searchParams.get('vod_id');
      const selected = vodStreams.find((item) => String(item.stream_id) === String(vodId));
      return sendJson(res, { info: selected || null, movie_data: selected || null });
    }
    if (action === 'get_series_categories') return sendJson(res, seriesCategories);
    if (action === 'get_series') {
      if (degradedSearch) {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Mock series search catalog temporarily unavailable', scenario }));
      }
      return sendJson(res, filterByCategory(series, categoryId));
    }
    if (action === 'get_series_info') return sendJson(res, getSeriesInfo(url.searchParams.get('series_id')));
    if (action === 'get_short_epg') {
      if (degradedEpg) {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Mock EPG temporarily unavailable', scenario }));
      }
      return sendJson(res, getShortEpg(url.searchParams.get('stream_id') || '0'));
    }
    return sendJson(res, { error: 'Unsupported action', action });
  }

  if (path === '/xmltv.php') {
    res.writeHead(200, { 'Content-Type': 'application/xml', 'Access-Control-Allow-Origin': '*' });
    return res.end(buildXmltv());
  }

  if (/^\/(movie|series)\//.test(path) || /^\/\w+\/\w+\/\d+$/.test(path)) {
    res.writeHead(302, { Location: pickStream(path.length), 'Access-Control-Allow-Origin': '*' });
    return res.end();
  }

  if (path === '/' || path === '/health') {
    return sendJson(res, {
      ok: true,
      service: 'streamdeck-mock-provider',
      port: PORT,
      liveCategories: liveCategories.length,
      liveStreams: liveStreams.length,
      vodStreams: vodStreams.length,
      series: series.length,
      searchHints: ['sports', 'news', 'movie', 'kids', 'atlas'],
      playerCapabilities: {
        livePreview: true,
        vodResumeFriendly: true,
        seriesResumeFriendly: true,
        detailMetadata: true,
        cachedCatalogFriendly: true,
        previewFallbackFriendly: true,
        trustFactGridFriendly: true,
        streamFormats: ['m3u8'],
      },
      endpointHealth: {
        auth: lineSaturated || expiredAccount || authUnstable ? 'degraded' : 'healthy',
        liveCatalog: degradedLive || expiredAccount ? 'degraded' : 'healthy',
        vodCatalog: degradedSearch || expiredAccount ? 'degraded' : 'healthy',
        seriesCatalog: degradedSearch || expiredAccount ? 'degraded' : 'healthy',
        epg: degradedEpg || expiredAccount ? 'degraded' : 'healthy',
      },
      activeScenario: scenario,
      healthScenarios: {
        healthy: {
          label: scenarioLabels.healthy,
          summary: 'Default mock mode, all Xtream endpoints respond with full catalogs.',
          appImpact: 'Best for first-run login, home, and live demo validation.',
          healthUrl: `${host}/health`,
          affectedEndpoints: ['auth', 'get_live_streams', 'get_vod_streams', 'get_series', 'get_short_epg'],
          expectedUx: ['Connect instantly', 'Browse live with inline guide', 'Search and detail panels stay fully populated'],
          verificationSteps: ['Connect with mock credentials', 'Open Home and confirm hero guide loads', 'Open Live and confirm NOW and NEXT labels stay populated'],
        },
        degradedSearch: {
          label: scenarioLabels.degradedSearch,
          summary: 'VOD and series catalog requests fail while health stays reachable.',
          appImpact: 'Use this to verify cached search results and partial-result messaging stay useful.',
          healthUrl: `${host}/health?scenario=degradedSearch`,
          affectedEndpoints: ['get_vod_streams', 'get_series'],
          expectedUx: ['Home stays usable', 'Search explains partial results', 'Movies and Series fall back gracefully'],
          verificationSteps: ['Tap Degraded search in-product', 'Open Search and verify partial-result messaging refreshes immediately', 'Open Movies and Series and confirm degraded states still feel intentional without a manual reload'],
        },
        degradedLive: {
          label: scenarioLabels.degradedLive,
          summary: 'Live stream catalog requests fail while health still documents the provider.',
          appImpact: 'Use this to validate live-browser status banners, retries, and degraded preview messaging.',
          healthUrl: `${host}/health?scenario=degradedLive`,
          affectedEndpoints: ['get_live_streams'],
          expectedUx: ['Provider stays connectable', 'Live browser shows degraded state', 'Preview area explains fallback instead of looking broken'],
          verificationSteps: ['Tap Degraded live in-product', 'Validate the login and home shell still render', 'Open Live and verify the browser refreshes in place with retry plus fallback messaging instead of a dead surface'],
        },
        degradedEpg: {
          label: scenarioLabels.degradedEpg,
          summary: 'Live guide requests fail while catalogs and playback paths still respond.',
          appImpact: 'Use this to verify Home and Live survive guide outages without collapsing the whole browse flow.',
          healthUrl: `${host}/health?scenario=degradedEpg`,
          affectedEndpoints: ['get_short_epg'],
          expectedUx: ['Connect normally', 'Home shows guide fallback copy instead of emptying', 'Live still browses and previews channels while guide chips explain the outage'],
          verificationSteps: ['Tap Degraded guide in-product', 'Open Home and verify guide copy downgrades gracefully without a manual reload', 'Open Live and confirm cards still browse and preview even when NOW and NEXT are unavailable'],
        },
        lineSaturated: {
          label: scenarioLabels.lineSaturated,
          summary: 'Auth still succeeds, but the provider reports every line is already in use.',
          appImpact: 'Use this to rehearse trust warnings and degraded account-state messaging before playback fails in front of a user.',
          healthUrl: `${host}/health?scenario=lineSaturated`,
          affectedEndpoints: ['auth'],
          expectedUx: ['Login shows provider-risk copy instead of a false green state', 'Home trust cockpit warns that capacity is maxed', 'Live surfaces the same account pressure before the user blames playback and can still recover into the same category on a healthier provider'],
          verificationSteps: ['Tap Lines maxed in-product', 'Reconnect or revalidate mock provider and confirm status downgrades from healthy to degraded', 'Open Home and Live and verify account-capacity warnings appear inline without hiding browse actions'],
        },
        expiredAccount: {
          label: scenarioLabels.expiredAccount,
          summary: 'Auth reports the account as expired and fresh catalog requests are rejected.',
          appImpact: 'Use this to verify Login, Home, and Live show explicit recovery guidance while cached browse state stays as useful as possible.',
          healthUrl: `${host}/health?scenario=expiredAccount`,
          affectedEndpoints: ['auth', 'get_live_categories', 'get_live_streams', 'get_vod_streams', 'get_series', 'get_short_epg'],
          expectedUx: ['Login downgrades trust immediately', 'Home falls back to cached content with renewal guidance', 'Live stops pretending playback issues are stream-only when the account is expired and preserves same-category recovery actions'],
          verificationSteps: ['Tap Expired account in-product', 'Reconnect or revalidate mock provider and confirm the account status flips to expired', 'Open Home, Live, and Settings and verify trust badges plus recovery guidance stay visible even if fresh provider data is blocked'],
        },
        authUnstable: {
          label: scenarioLabels.authUnstable,
          summary: 'Fresh auth checks fail, but the provider still advertises enough health metadata to keep cached browse surfaces useful.',
          appImpact: 'Use this to verify Login, Home, and Live degrade trust clearly without dumping the user out of the active provider context.',
          healthUrl: `${host}/health?scenario=authUnstable`,
          affectedEndpoints: ['auth'],
          expectedUx: ['Login flags trust as unstable instead of silently failing', 'Home keeps cached rails and quick actions visible while auth is retried', 'Live keeps browsing context and shows a direct retry or same-category switch-provider path'],
          verificationSteps: ['Tap Auth unstable in-product', 'Revalidate the mock provider and confirm trust drops to unstable', 'Open Login, Home, Live, Movies, and Series and verify cached context plus trust badges stay visible while retry guidance is explicit'],
        },
      },
      topCategories: liveCategories.map((category) => ({
        id: category.category_id,
        name: category.category_name,
        channels: liveStreams.filter((stream) => stream.category_id === category.category_id).length,
      })),
      featuredChannels: liveStreams.slice(0, 4).map((stream) => ({
        name: stream.name,
        category: liveCategories.find((category) => category.category_id === stream.category_id)?.category_name || 'Live',
        guide: getShortEpg(stream.stream_id).epg_listings[0] ? Buffer.from(getShortEpg(stream.stream_id).epg_listings[0].title, 'base64').toString('utf8') : 'Guide loading',
      })),
      accountProfile: buildMockAccountProfile(scenario),
      trustSignals: buildTrustSignals(scenario),
      operatorHeadline: buildOperatorHeadline(scenario),
      recoveryActions: buildRecoveryActions(scenario),
      surfaceRecoveryPlans: buildSurfaceRecoveryPlans(scenario),
      recommendedDemoSequence: degradedLive
        ? ['Connect with mock credentials', 'Open Home to confirm provider context still feels healthy', 'Open Live and verify degraded live fallback plus retry copy']
        : degradedEpg
          ? ['Connect with mock credentials', 'Open Home and confirm guide fallback copy', 'Open Live and verify preview stays usable while NOW and NEXT degrade']
          : degradedSearch
            ? ['Connect with mock credentials', 'Open Home to confirm the shell stays useful', 'Open Search, Movies, and Series to verify partial-result behavior']
            : lineSaturated
              ? ['Connect with mock credentials', 'Revalidate provider and confirm the trust cockpit warns that all lines are in use', 'Open Home and Live and verify capacity-risk messaging stays visible before playback']
              : expiredAccount
                ? ['Connect with mock credentials', 'Revalidate provider and confirm trust downgrades to expired', 'Open Home and Live and verify cached data plus renewal guidance stay visible together']
                : authUnstable
                  ? ['Connect with mock credentials', 'Revalidate provider and confirm trust downgrades to unstable without wiping the saved connection', 'Open Home and Live and verify cached context plus retry guidance stay visible together']
                  : ['Connect with mock credentials', 'Open Home and verify provider trust + hero guide data', 'Open Live and surf preview cards with inline NOW and NEXT'],
      sampleCredentials: {
        server: host,
        username: 'test',
        password: 'test',
      },
      demoFlows: {
        login: degradedLive
          ? 'Connect with the mock credentials, then verify the app explains that live browsing is degraded instead of failing silently.'
          : degradedEpg
            ? 'Connect normally, then verify the app calls out guide degradation without making login feel broken.'
            : lineSaturated
              ? 'Connect normally, then verify Login downgrades provider trust from healthy to capacity-risk without pretending the account is fine.'
              : expiredAccount
                ? 'Connect or revalidate the mock provider, then verify Login makes the expired account explicit and points the user toward renewal or another saved provider.'
                : authUnstable
                  ? 'Connect or revalidate the mock provider, then verify Login keeps the saved connection visible while trust drops to unstable and retry guidance appears inline.'
                  : 'Use the saved mock credentials to connect instantly and validate multi-provider login UX.',
        home: degradedSearch
          ? 'Verify Home still feels useful while search-oriented catalogs degrade and cached content remains visible, and that the rehearsal switch refreshes the surface in place.'
          : degradedEpg
            ? 'Verify Home still loads counts, quick actions, and featured content while guide copy falls back gracefully without a manual reload.'
            : lineSaturated
              ? 'Verify Home keeps browse counts and quick actions live, but the provider trust cockpit clearly warns that line capacity is maxed before users hit playback, with healthier saved-provider copies still launchable from discovery rails.'
              : expiredAccount
                ? 'Verify Home falls back to saved provider state when fresh catalog requests are blocked, while renewal and provider-switch guidance stays visible above the rails and alternate provider copies stay actionable from spotlight cards.'
                : authUnstable
                  ? 'Verify Home keeps cached rails and quick actions visible while auth revalidation fails, and that retry plus switch-provider guidance stays above the content while healthier provider variants remain launchable from discovery rails.'
                  : 'Verify hero counts, quick-launch actions, cached provider refresh messaging, instant in-place rehearsal refresh, and alternate-provider launch paths from Home discovery rails from one healthy source.',
        live: degradedLive
          ? 'Verify inline provider status banners, retry actions, graceful preview fallback, and in-place browser refresh when the live catalog becomes unavailable.'
          : degradedEpg
            ? 'Verify channel browsing and preview remain intact while NOW and NEXT labels explain the guide outage without forcing a full reload.'
            : lineSaturated
              ? 'Verify Live keeps browsing available while account-capacity warnings stay visible in the provider trust cockpit before the user blames the stream itself, with the healthiest saved provider copy launchable from the same live card.'
              : expiredAccount
                ? 'Verify Live stops blaming the stream, surfaces the expired-account recovery path clearly, and keeps any saved context more useful than a blank error wall while alternate saved-provider copies stay directly launchable from the same live card.'
                : authUnstable
                  ? 'Verify Live keeps the current browse context visible while auth checks fail, and that retry or provider-switch guidance is clearer than a generic playback error, with direct alternate-provider launch still available from live cards.'
                  : 'Verify inline NOW/NEXT guide data, hover preview fallback, surf-rail browsing, and in-place rehearsal refresh against realistic fake categories.',
        search: degradedSearch
          ? 'Verify cross-provider search keeps cached hits visible, explains partial provider failure, offers direct retry actions, keeps alternate provider copies launchable from the same result card, and refreshes immediately when the rehearsal mode changes.'
          : 'Verify one query returns ranked live, movie, and series hits across saved providers without leaving the shell, with the healthiest copy first and alternate provider copies still launchable from the same result card.',
        movies: degradedSearch
          ? 'Verify Movies falls back to saved catalog state with intentional degraded copy instead of blanking the browse surface, and that the shared premium recovery rail plus provider fact grid still present healthiest-provider actions without a manual reload.'
          : 'Verify the movie library loads from cache first, then refreshes into the cinematic detail rail cleanly as soon as the rehearsal mode changes, with alternate-provider actions and provider posture rendered through the shared premium recovery rail plus provider fact grid.',
        series: degradedSearch
          ? 'Verify Series keeps the drill-down shell usable from saved catalog data even when search-oriented provider endpoints are degraded, with the shared premium recovery rail plus provider fact grid preserving episode-aware fallback actions.'
          : 'Verify series list, season switches, episode launch, and alternate-provider resume all stay connected to the real mock Xtream payloads, then flip rehearsal modes and watch the drill-down refresh live through the shared premium recovery rail plus provider fact grid.',
        favorites: lineSaturated
          ? 'Verify Favorites keeps saved live items launchable through healthier exact copies first, then same-category rescue when no exact duplicate survives on the healthier provider, while the shared provider fact grid keeps account posture visible.'
          : expiredAccount
            ? 'Verify Favorites does not turn into a dead archive when the active provider expires, and that saved live items can still recover through healthier exact or same-category fallback paths.'
            : authUnstable
              ? 'Verify Favorites preserves saved titles and directs the main recovery action toward the healthiest provider copy while keeping same-category live rescue visible for brittle live rows.'
              : 'Verify Favorites can launch healthier provider copies of saved live, movie, and series items, preserve same-category live rescue when the exact channel is missing, and keep provider posture visible through the shared fact grid.',
        collections: lineSaturated
          ? 'Verify Collections now presents the same premium recovery rail language as the rest of the shell while curated live items still prefer healthier exact copies first, then same-category rescue when no exact duplicate survives.'
          : expiredAccount
            ? 'Verify Collections keeps curated folders actionable when the active provider expires, with the shared recovery rail steering launches toward healthier exact or same-category fallback paths.'
            : authUnstable
              ? 'Verify Collections preserves curated launch intent during auth instability and uses the same shared premium recovery rail to direct the main recovery move toward the healthiest provider copy.'
              : 'Verify Collections uses the same shared premium recovery rail language as Search, Home, Live, Favorites, Continue Watching, and the player shell while keeping healthier exact and same-category rescue launches actionable, including an in-rail deep link for series fallback.',
        continue: lineSaturated
          ? 'Verify Continue Watching and the player dock protect live resume momentum by surfacing healthier exact copies first, then same-category rescue when the exact live item is unavailable, while the shared provider fact grid keeps account posture visible.'
          : expiredAccount
            ? 'Verify Continue Watching preserves live resume momentum and episode context even when the original provider expires, including same-category live fallback when needed.'
            : authUnstable
              ? 'Verify Continue Watching keeps saved resume context visible during auth instability and still exposes healthier exact or same-category live recovery paths.'
              : 'Verify Continue Watching can resume on healthier provider copies, keep the same live category available when an exact resume channel is missing, and preserve provider posture through the shared fact grid.',
        player: lineSaturated
          ? 'Verify the active player dock can jump directly to the healthiest saved live copy, and fall back to same-category rescue when the exact channel is gone.'
          : expiredAccount
            ? 'Verify the active player dock stops blaming playback alone, preserves current live context, and offers healthier exact or same-category recovery when the original provider expires.'
            : authUnstable
              ? 'Verify the active player dock keeps live context visible during auth instability and still offers a trust-led jump to healthier exact or same-category recovery.'
              : 'Verify the active player dock uses the same canonical live recovery helper as the main Live browser, with healthier exact copies ranked ahead of same-category rescue and the same shared provider fact grid keeping account posture visible.',
      },
      scenarioUrls: {
        healthy: `${host}/health`,
        degradedSearch: `${host}/health?scenario=degradedSearch`,
        degradedLive: `${host}/health?scenario=degradedLive`,
        degradedEpg: `${host}/health?scenario=degradedEpg`,
        lineSaturated: `${host}/health?scenario=lineSaturated`,
        expiredAccount: `${host}/health?scenario=expiredAccount`,
        authUnstable: `${host}/health?scenario=authUnstable`,
      },
      xmltv: `${host}/xmltv.php?username=test&password=test`,
      sampleLive: `${host}/player_api.php?username=test&password=test&action=get_live_streams&category_id=1`,
      sampleVod: `${host}/player_api.php?username=test&password=test&action=get_vod_streams&category_id=201`,
      sampleSeries: `${host}/player_api.php?username=test&password=test&action=get_series`,
      sampleVodInfo: `${host}/player_api.php?username=test&password=test&action=get_vod_info&vod_id=5000`,
      sampleSeriesInfo: `${host}/player_api.php?username=test&password=test&action=get_series_info&series_id=7001`,
    });
  }

  if (path === '/adapter/manifest') {
    return sendJson(res, buildAdapterManifest(scenario));
  }

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Mock Xtream provider running at http://localhost:${PORT}`);
});
