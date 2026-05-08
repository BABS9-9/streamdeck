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
      detail: degradedSearch ? 'Movies and Series should lean on cache and partial-result messaging.' : 'Cross-provider search and detail surfaces should fill normally.',
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
      'Suggest switching to another saved provider for the same title or channel, and if the exact channel is missing keep a same-category fallback launch reachable directly from Home cards, Live cards, collection-launched live items, favorite live cards, and continue-watching live resume items.',
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
          verificationSteps: ['Tap Expired account in-product', 'Reconnect or revalidate mock provider and confirm the account status flips to expired', 'Open Home and Live and verify recovery guidance stays visible even if fresh provider data is blocked'],
        },
        authUnstable: {
          label: scenarioLabels.authUnstable,
          summary: 'Fresh auth checks fail, but the provider still advertises enough health metadata to keep cached browse surfaces useful.',
          appImpact: 'Use this to verify Login, Home, and Live degrade trust clearly without dumping the user out of the active provider context.',
          healthUrl: `${host}/health?scenario=authUnstable`,
          affectedEndpoints: ['auth'],
          expectedUx: ['Login flags trust as unstable instead of silently failing', 'Home keeps cached rails and quick actions visible while auth is retried', 'Live keeps browsing context and shows a direct retry or same-category switch-provider path'],
          verificationSteps: ['Tap Auth unstable in-product', 'Revalidate the mock provider and confirm trust drops to unstable', 'Open Home and Live and verify cached context stays visible while retry guidance is explicit'],
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
          ? 'Verify Movies falls back to saved catalog state with intentional degraded copy instead of blanking the browse surface, and that the scenario switch refreshes without a manual reload.'
          : 'Verify the movie library loads from cache first, then refreshes into the cinematic detail rail cleanly as soon as the rehearsal mode changes.',
        series: degradedSearch
          ? 'Verify Series keeps the drill-down shell usable from saved catalog data even when search-oriented provider endpoints are degraded, with the new scenario switch refreshing immediately.'
          : 'Verify series list, season switches, episode launch, and alternate-provider resume all stay connected to the real mock Xtream payloads, then flip rehearsal modes and watch the drill-down refresh live.',
        favorites: lineSaturated
          ? 'Verify Favorites keeps saved live items launchable through healthier exact copies first, then same-category rescue when no exact duplicate survives on the healthier provider.'
          : expiredAccount
            ? 'Verify Favorites does not turn into a dead archive when the active provider expires, and that saved live items can still recover through healthier exact or same-category fallback paths.'
            : authUnstable
              ? 'Verify Favorites preserves saved titles and directs the main recovery action toward the healthiest provider copy while keeping same-category live rescue visible for brittle live rows.'
              : 'Verify Favorites can launch healthier provider copies of saved live, movie, and series items, and preserve same-category live rescue when the exact channel is missing.',
        continue: lineSaturated
          ? 'Verify Continue Watching protects live resume momentum by surfacing healthier exact copies first, then same-category rescue when the exact live item is unavailable.'
          : expiredAccount
            ? 'Verify Continue Watching preserves live resume momentum and episode context even when the original provider expires, including same-category live fallback when needed.'
            : authUnstable
              ? 'Verify Continue Watching keeps saved resume context visible during auth instability and still exposes healthier exact or same-category live recovery paths.'
              : 'Verify Continue Watching can resume on healthier provider copies and keep the same live category available when an exact resume channel is missing.',
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

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Mock Xtream provider running at http://localhost:${PORT}`);
});
