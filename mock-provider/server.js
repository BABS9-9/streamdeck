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

const providerDescriptor = {
  providerName: 'NorthStar Mock Xtream',
  region: 'Ontario demo cluster',
  operatorNote: 'Built for StreamDeck login, home, live, EPG, favorites, playback, guide-freshness truth, launch-scorecard truth, fallback-cost honesty, fallback-equivalence truth, interruption-budget demos, retry-honesty rehearsals, provider-return truth, and provider-stability truth.',
};

const channelNames = {
  Sports: ['TSN Prime', 'Arena One', 'GoalLine 24', 'Fight Night+', 'CourtVision', 'North Ice', 'Action Sports', 'FastTrack'],
  News: ['World Report', 'NewsNow', 'Capital Desk', '24 North', 'Global Wire', 'Metro Live'],
  Entertainment: ['Binge Central', 'Laugh Loop', 'Prime Stories', 'Reality Max', 'Drama One', 'Spotlight TV'],
  Movies: ['Cinema Hits', 'Retro Reels', 'Action Vault', 'Family Screen', 'Night Movies', 'Premiere 8'],
  Kids: ['Tiny Tunes', 'Adventure Jr', 'Cartoon Galaxy', 'Storybook TV', 'Kids Club'],
  Music: ['Pulse FM TV', 'Top 40 Live', 'Acoustic Room', 'Indie Mix', 'Classic Gold'],
  Documentary: ['Wild Planet', 'Deep History', 'Science Scope', 'True North Docs', 'Explorer HD'],
  Local: ['Toronto One', 'Ontario Live', 'City Pulse', 'Local Weather', 'Morning Ontario', 'Peel Region News'],
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

const buildDifferentiators = () => ([
  {
    title: 'Premium-first login',
    detail: 'The demo path is built to prove StreamDeck can connect like an IPTV utility but feel like a polished streaming product from the first screen.',
    surface: 'login',
  },
  {
    title: 'Provider-choice truth on login',
    detail: 'The adapter publishes when StreamDeck may auto-pick the healthiest saved provider and when setup intent changed enough that the user must choose explicitly.',
    surface: 'login',
  },
  {
    title: 'Canonical provider identity on login',
    detail: 'The adapter now publishes which saved labels, reconnect URLs, and recovery shortcuts still resolve to the same provider owner before Login reuses trust, history, or Home shortcuts.',
    surface: 'login',
  },
  {
    title: 'Fallback ranking on login',
    detail: 'The adapter now publishes which saved-provider rescue currently ranks first, what evidence keeps it first, and what trigger forces Login to rerank before it auto-picks.',
    surface: 'login',
  },
  {
    title: 'Recovery route on login',
    detail: 'The adapter now publishes the fastest safe handoff once Login stops being the honest owner of the next Home launch.',
    surface: 'login',
  },
  {
    title: 'Freshness truth on login',
    detail: 'The adapter now publishes when auth proof is live, when only saved-provider identity is still safe to trust, and when recovery must outrank reconnect.',
    surface: 'login',
  },
  {
    title: 'Proof debt on login',
    detail: 'The adapter now publishes what login confidence is still borrowed from saved-provider memory and what fresh proof repays that debt before Connect feels premium again.',
    surface: 'login',
  },
  {
    title: 'Rescue receipt on login',
    detail: 'The adapter now publishes what setup context survived fallback, what changed under the hood, and what the user should reconfirm before Connect feels seamless again.',
    surface: 'login',
  },
  {
    title: 'Proof provenance on login',
    detail: 'The adapter now publishes whether Connect is backed by fresh auth proof, saved-provider continuity, or rescue-owned logic before setup polish outruns the real trust source.',
    surface: 'login',
  },
  {
    title: 'Action gate on login',
    detail: 'The adapter now publishes when Connect is still the premium move, what safer recovery action takes over first, and what proof re-opens the premium path.',
    surface: 'login',
  },
  {
    title: 'Fallback cost on login',
    detail: 'The adapter now publishes what premium setup convenience Login already lost, what safe value still survives, and what extra loss ends the polished shortcut story.',
    surface: 'login',
  },
  {
    title: 'Confidence floor on login',
    detail: 'The adapter now publishes the minimum honest proof below the login polish, the downgrade mode that takes over when trust slips, and the hard-stop trigger that ends premium connect posture.',
    surface: 'login',
  },
  {
    title: 'Claim ceiling on login',
    detail: 'The adapter now publishes the strongest promise Login can still make, the overclaim Connect must suppress, and the proof that earns premium setup language back.',
    surface: 'login',
  },
  {
    title: 'Identity anchor on login',
    detail: 'The adapter now publishes which provider identity or launch owner must stay visible for Login to keep making sense, what meaning that anchor preserves, and what break ends polished recovery.',
    surface: 'login',
  },
  {
    title: 'Intent lock on login',
    detail: 'The adapter now publishes what setup intent Login is still protecting, what trust drift is acceptable without breaking that path, and what event truly forces a fresh start.',
    surface: 'login',
  },
  {
    title: 'Explanation boundary on login',
    detail: 'The adapter now publishes what provider risk Login must say plainly, what setup confidence can stay ambient, and what trigger forces blunt disclosure before Connect keeps sounding premium.',
    surface: 'login',
  },
  {
    title: 'Autonomy boundary on login',
    detail: 'The adapter now publishes what trust work Login can keep maintaining automatically, what provider choice still belongs to the user, and what trigger forces an explicit handoff before setup becomes dishonest.',
    surface: 'login',
  },
  {
    title: 'Provider-switch truth on login',
    detail: 'The adapter now publishes when the current provider has honestly lost the next Home launch, what setup context a switch must preserve, and what proof lets Login keep the current provider in control.',
    surface: 'login',
  },
  {
    title: 'Retry honesty on login',
    detail: 'The adapter now publishes when retrying the same provider is still preserving setup intent, what context retry keeps alive, and what trigger means recovery should replace reconnect.',
    surface: 'login',
  },
  {
    title: 'Recovery witness on login',
    detail: 'The adapter now publishes what visible proof must survive on Login, what setup context that proof carries forward, and what missing evidence means fallback is no longer trustworthy.',
    surface: 'login',
  },
  {
    title: 'Believable home destination',
    detail: 'The mock adapter ships enough live, movie, series, and guide data to make Home feel curated instead of empty or obviously fake.',
    surface: 'home',
  },
  {
    title: 'Provider-choice truth on Home',
    detail: 'Featured rescue and quick-launch rails now say when a healthier provider preserves the same browse story versus when the shell has to expose the trade-off.',
    surface: 'home',
  },
  {
    title: 'Canonical provider identity on Home',
    detail: 'The adapter now publishes which hero, rail, and trust cues still belong to the same provider owner even when saved labels or host variants differ.',
    surface: 'home',
  },
  {
    title: 'Fallback ranking on Home',
    detail: 'The adapter now publishes which featured or rail rescue currently ranks first, what proof keeps it there, and what event forces Home to rerank before hero polish outruns truth.',
    surface: 'home',
  },
  {
    title: 'Recovery route on Home',
    detail: 'The adapter now publishes the fastest safe browse-preserving move once the current provider should stop owning featured and quick-launch actions.',
    surface: 'home',
  },
  {
    title: 'Freshness truth on Home',
    detail: 'The adapter now publishes when featured rails are live, when cached Home is still safe, and when stale provider truth forces recovery-led browse.',
    surface: 'home',
  },
  {
    title: 'Proof debt on Home',
    detail: 'The adapter now publishes what browse confidence is still borrowed from cache or rescue posture and what proof repays that debt before the hero overclaims certainty.',
    surface: 'home',
  },
  {
    title: 'Rescue receipt on Home',
    detail: 'The adapter now publishes what browse context survived fallback, what launch ownership changed under the hood, and what the user should reconfirm before the hero feels seamless again.',
    surface: 'home',
  },
  {
    title: 'Proof provenance on Home',
    detail: 'The adapter now publishes whether the hero is backed by live provider browse proof, cached continuity, or rescue-owned launch logic before Home keeps sounding current.',
    surface: 'home',
  },
  {
    title: 'Action gate on Home',
    detail: 'The adapter now publishes when featured launch is still the premium move, what safer fallback action should replace it first, and what proof re-opens premium browse confidence.',
    surface: 'home',
  },
  {
    title: 'Fallback cost on Home',
    detail: 'The adapter now publishes what cinematic browse confidence Home already lost, what honest browse value still survives, and what extra loss ends the premium hero story.',
    surface: 'home',
  },
  {
    title: 'Confidence floor on Home',
    detail: 'The adapter now publishes the minimum browse proof behind the hero, the downgrade mode that takes over below that floor, and the hard-stop trigger that ends cinematic certainty.',
    surface: 'home',
  },
  {
    title: 'Claim ceiling on Home',
    detail: 'The adapter now publishes the strongest browse promise Home can still make, the hero overclaim it must suppress, and the proof that earns premium browse language back.',
    surface: 'home',
  },
  {
    title: 'Identity anchor on Home',
    detail: 'The adapter now publishes which provider, hero, or fallback owner still anchors the browse story, what meaning that anchor preserves, and what break turns premium rescue into anonymous confidence theater.',
    surface: 'home',
  },
  {
    title: 'Intent lock on Home',
    detail: 'The adapter now publishes what browse intent Home is still protecting, what freshness or recovery drift is acceptable, and what break truly forces a reset.',
    surface: 'home',
  },
  {
    title: 'Explanation boundary on Home',
    detail: 'The adapter now publishes what degraded browse truth the hero must now say out loud, what premium confidence can stay ambient, and what trigger forces the featured story to stop implying everything is still fully live.',
    surface: 'home',
  },
  {
    title: 'Autonomy boundary on Home',
    detail: 'The adapter now publishes what browse maintenance Home can keep automatic, what launch or provider choice still belongs to the user, and what trigger forces an explicit handoff before the hero starts lying.',
    surface: 'home',
  },
  {
    title: 'Provider-switch truth on Home',
    detail: 'The adapter now publishes when the current provider has honestly lost featured-browse ownership, what discovery context a switch must preserve, and what proof lets Home keep the current provider controlling the hero.',
    surface: 'home',
  },
  {
    title: 'Retry honesty on Home',
    detail: 'The adapter now publishes when retrying the current featured refresh is still preserving the same browse story, what discovery context retry keeps alive, and what trigger means recovery should outrank patience.',
    surface: 'home',
  },
  {
    title: 'Recovery witness on Home',
    detail: 'The adapter now publishes what visible browse proof must survive on Home, what discovery context that proof carries forward, and what missing evidence means the hero has turned into confidence theater.',
    surface: 'home',
  },
  {
    title: 'Real live browse rehearsal',
    detail: 'Live categories, channel logos, NOW/NEXT data, and playable HLS streams are all included so the prototype can actually be demoed end to end.',
    surface: 'live',
  },
  {
    title: 'Provider-choice truth on Live',
    detail: 'Selected-card rescue now tells the user when StreamDeck can silently pick the safest equivalent source and when rescue changed enough that the user must choose.',
    surface: 'live',
  },
  {
    title: 'Canonical provider identity on Live',
    detail: 'The adapter now publishes which selected card, preview, and Play target still belong to the same provider owner before exact-copy rescue sounds like the same source story.',
    surface: 'live',
  },
  {
    title: 'Fallback ranking on Live',
    detail: 'The adapter now publishes which exact-channel or category-level rescue currently ranks first, what evidence keeps it ahead, and what trigger forces Live to rerank before Play changes hands.',
    surface: 'live',
  },
  {
    title: 'Recovery route on Live',
    detail: 'The adapter now publishes the fastest safe same-category or healthier-provider move once exact-channel launch is no longer honest.',
    surface: 'live',
  },
  {
    title: 'Freshness truth on Live',
    detail: 'The adapter now publishes when guide and preview proof are current, when surf context is only safely borrowed, and when recovery must replace stale play confidence.',
    surface: 'live',
  },
  {
    title: 'Proof debt on Live',
    detail: 'The adapter now publishes what surf confidence is still borrowed from preview or category continuity and what proof repays that debt before Play overclaims safety.',
    surface: 'live',
  },
  {
    title: 'Rescue receipt on Live',
    detail: 'The adapter now publishes what surf context survived fallback, what playback ownership changed under the hood, and what the user should reconfirm before preview or Play feels seamless again.',
    surface: 'live',
  },
  {
    title: 'Proof provenance on Live',
    detail: 'The adapter now publishes whether Play is backed by live preview plus guide proof, same-category continuity, or rescue-owned logic before playback confidence gets overstated.',
    surface: 'live',
  },
  {
    title: 'Action gate on Live',
    detail: 'The adapter now publishes when Play is still the premium move, what rescue-first action should replace it when proof drops, and what evidence re-opens premium playback confidence.',
    surface: 'live',
  },
  {
    title: 'Fallback cost on Live',
    detail: 'The adapter now publishes what exact-match or direct-launch confidence Live already lost, what surf value still survives, and what extra loss means fallback can no longer pass as seamless.',
    surface: 'live',
  },
  {
    title: 'Confidence floor on Live',
    detail: 'The adapter now publishes the minimum surf proof behind Play, the downgrade mode that takes over below that floor, and the hard-stop trigger that ends premium channel-launch confidence.',
    surface: 'live',
  },
  {
    title: 'Claim ceiling on Live',
    detail: 'The adapter now publishes the strongest surf promise Live can still make, the playback overclaim it must suppress, and the proof that earns premium play language back.',
    surface: 'live',
  },
  {
    title: 'Identity anchor on Live',
    detail: 'The adapter now publishes which channel, category, or launch owner still anchors the surf story, what meaning that anchor preserves, and what break turns rescue into a disguised channel jump.',
    surface: 'live',
  },
  {
    title: 'Intent lock on Live',
    detail: 'The adapter now publishes what surf or channel intent Live is still protecting, what guide or rescue drift is acceptable, and what break truly ends the current path.',
    surface: 'live',
  },
  {
    title: 'Explanation boundary on Live',
    detail: 'The adapter now publishes what launch or guide risk the selected card must say explicitly, what surf momentum can stay ambient, and what trigger forces plain recovery language before preview mood outruns launch truth.',
    surface: 'live',
  },
  {
    title: 'Autonomy boundary on Live',
    detail: 'The adapter now publishes what surf continuity Live can keep automatic, what playback or provider switch still belongs to the user, and what trigger forces an explicit handoff before preview motion outruns trust.',
    surface: 'live',
  },
  {
    title: 'Provider-switch truth on Live',
    detail: 'The adapter now publishes when the current provider has honestly lost surf ownership, what selected-card context a switch must preserve, and what proof lets Live keep the current provider owning Play.',
    surface: 'live',
  },
  {
    title: 'Retry honesty on Live',
    detail: 'The adapter now publishes when retrying preview, guide, or launch authority is still preserving the same surf session, what selected-card context retry keeps alive, and what trigger means rescue should replace another Play nudge.',
    surface: 'live',
  },
  {
    title: 'Recovery witness on Live',
    detail: 'The adapter now publishes what visible surf proof must survive on the selected card, what launch context that proof carries forward, and what missing evidence means rescue has become a disguised restart.',
    surface: 'live',
  },
  {
    title: 'Scenario-switched rehearsal',
    detail: 'The adapter is not just fake data. It hot-swaps realistic provider failure modes in-app so Login, Home, and Live can be demoed under pressure without changing environments.',
    surface: 'login',
  },
  {
    title: 'Provider risk strip on Login',
    detail: 'The adapter now publishes one compact provider-risk story on Login so auth pressure, expiry, and unstable trust are visible before Connect implies the current source still safely owns Home.',
    surface: 'login',
  },
  {
    title: 'Launch scorecard on Login',
    detail: 'The adapter now publishes whether Connect is genuinely launch-ready, only watch-safe, or already recovery-led before setup polish outruns the proof behind the next Home handoff.',
    surface: 'login',
  },
  {
    title: 'Scenario-switched rehearsal',
    detail: 'Home can refresh against healthy, degraded, saturated, and expired provider states in place so browse continuity is demoable instead of theoretical.',
    surface: 'home',
  },
  {
    title: 'Provider risk strip on Home',
    detail: 'The adapter now publishes the same provider-risk strip on Home so hero browse, quick rails, and the next safe launch all inherit one honest trust story.',
    surface: 'home',
  },
  {
    title: 'Launch scorecard on Home',
    detail: 'The adapter now publishes whether the hero and rails are fully launch-ready, only cache-borrowed, or already recovery-owned before Home overclaims premium browse confidence.',
    surface: 'home',
  },
  {
    title: 'Scenario-switched rehearsal',
    detail: 'Live can re-run its category and guide flow against changing provider conditions while staying on the same surface, proving surf resilience instead of describing it.',
    surface: 'live',
  },
  {
    title: 'Provider risk strip on Live',
    detail: 'The adapter now publishes the same provider-risk strip on Live so auth pressure, line saturation, and unstable trust are visible before users blame the selected channel.',
    surface: 'live',
  },
  {
    title: 'Launch scorecard on Live',
    detail: 'The adapter now publishes whether Play is exact-channel ready, only safe to preview, or already leaning on rescue logic before motion implies more confidence than current proof.',
    surface: 'live',
  },
  {
    title: 'Fallback equivalence on Login',
    detail: 'The adapter now publishes when a saved-provider shortcut is still the same Home move, when it is only an approximate convenience, and when rescue has turned setup into a true restart.',
    surface: 'login',
  },
  {
    title: 'Fallback equivalence on Home',
    detail: 'The adapter now publishes when hero rescue preserved the same discovery story, when it only kept rough browse intent alive, and when the fallback has actually become a new launch path.',
    surface: 'home',
  },
  {
    title: 'Fallback equivalence on Live',
    detail: 'The adapter now publishes when rescue preserved the exact selected channel, when it only preserved category surf momentum, and when the user has effectively restarted the live session.',
    surface: 'live',
  },
]);

const buildCompetitiveDifferentiators = () => ([
  {
    slug: 'multi-connection-switching',
    feature: 'Multi-connection switching',
    pitch: 'Save multiple Xtream providers and hot-swap between them without re-entering credentials.',
    competitiveGap: 'TiviMate, IPTV Smarters Pro, Flix IPTV, and iMPlayer all make provider switching feel heavier than it should.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Persist canonical provider IDs, auth summaries, provider-specific caches, and explicit launch ownership so switching does not corrupt favorites, history, search, or playback context.',
    surfaces: ['login', 'home'],
  },
  {
    slug: 'smart-epg-overlay',
    feature: 'Smart EPG overlay',
    pitch: 'Show NOW and NEXT inline on live cards and preview rails instead of burying guide data in a separate mode.',
    competitiveGap: 'Most IPTV players either bury guide context or make it feel like a second-class overlay.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Keep short EPG fetches cheap, normalize NOW and NEXT labels, attach guide state to selected and visible live items, and degrade honestly when guide freshness drops.',
    surfaces: ['home', 'live'],
  },
  {
    slug: 'guide-freshness-board',
    feature: 'Guide freshness board',
    pitch: 'Publish how much tracked guide truth is fresh, refreshing, stale, missing, or erroring before browse and launch copy overclaims what the provider proved.',
    competitiveGap: 'Most IPTV players only show guide data as present or absent, which hides partial freshness, cache-backed continuity, and recovery ownership when guide sync is in-between.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Drive Login, Home, and Live from one provider-scoped guide coverage report so freshness counts, stale callouts, recovery ownership, and the safest next move stay aligned.',
    surfaces: ['login', 'home', 'live'],
  },
  {
    slug: 'launch-scorecard',
    feature: 'Launch scorecard',
    pitch: 'Publish a compact go / watch / recover scorecard on each key surface before the user commits to Connect, Browse, or Play.',
    competitiveGap: 'Most IPTV players imply readiness through UI polish and leave users guessing whether the next CTA is fully proven, cache-backed, or already recovery-owned.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Drive Login, Home, and Live from one scorecard, exit-criteria, and handoff contract so readiness, hold conditions, and next-hop truth stay synchronized.',
    surfaces: ['login', 'home', 'live'],
  },
  {
    slug: 'continue-watching-unified',
    feature: 'Continue Watching across live and VOD',
    pitch: 'Keep one resume system for live channels, movies, and series so the next launch always starts from user intent.',
    competitiveGap: 'Competitors usually split resume behavior by media type or ignore live continuity entirely.',
    buildPhase: 'Phase 1 -> Phase 2 polish',
    architectureNotes: 'Store provider-aware watch history with playback URLs, progress, episode context, and last-live-channel recall so recovery can preserve the same mission.',
    surfaces: ['home', 'live'],
  },
  {
    slug: 'instant-channel-preview',
    feature: 'Instant channel preview',
    pitch: 'Hover or focus a live card and see motion immediately without leaving the grid.',
    competitiveGap: 'Most IPTV apps still force a full channel open before the user gets enough signal to switch.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Drive preview from selected-card state, update it on hover and focus, and preserve category and search context while preview changes.',
    surfaces: ['live'],
  },
  {
    slug: 'folder-playlist-organization',
    feature: 'Folder / playlist organization',
    pitch: 'Let users build custom groups like Game Day, Kids Bedtime, and Morning News instead of one flat favorites list.',
    competitiveGap: 'Favorites are standard; meaningful user-owned channel grouping is not.',
    buildPhase: 'Phase 1 baseline, Phase 2 expansion',
    architectureNotes: 'Persist provider-aware collection items locally, keep mixed-content groups legal, and surface curated launch rails on Home and Collections.',
    surfaces: ['home'],
  },
  {
    slug: 'one-click-recording',
    feature: 'One-click recording',
    pitch: 'Start recording live TV locally with one obvious action instead of a buried setup flow.',
    competitiveGap: 'Web IPTV players rarely support useful recording at all.',
    buildPhase: 'Phase 2+',
    architectureNotes: 'Needs HLS capture strategy, recording metadata, storage quotas, and UI states that do not block current playback.',
    surfaces: ['live'],
  },
  {
    slug: 'search-across-all-providers',
    feature: 'Search across all providers',
    pitch: 'Search one query across every saved Xtream provider and rank results together.',
    competitiveGap: 'Competitors typically search only the active provider, which breaks the multi-provider promise.',
    buildPhase: 'Phase 2',
    architectureNotes: 'Maintain per-provider catalogs, group duplicates, rank exact versus rescue copies, and keep result provenance visible after switches.',
    surfaces: ['login', 'home'],
  },
  {
    slug: 'provider-risk-strip',
    feature: 'Provider risk strip',
    pitch: 'Keep one compact cross-surface strip that says when the current provider is healthy, pressured, expired, or unstable before users blame the wrong layer.',
    competitiveGap: 'Most IPTV players bury provider risk in settings or only reveal it after playback and search already failed.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Drive Login, Home, and Live from one provider-health model with operator headline, trust signals, and an explicit recovery CTA so risk language stays aligned while the user moves through the shell.',
    surfaces: ['login', 'home', 'live'],
  },
  {
    slug: 'canonical-provider-identity',
    feature: 'Canonical provider identity',
    pitch: 'Keep retries, saved labels, and rescue paths tied to one canonical provider owner so continuity never silently attaches to the wrong source.',
    competitiveGap: 'Most IPTV players let alias URLs, relabeled connections, or nearly identical providers blur together until favorites, history, or trust cues feel random.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Normalize provider identity around one canonical key and surface that ownership on Login, Home, and Live before reconnect shortcuts, cached rails, or rescue copy imply the wrong source story.',
    surfaces: ['login', 'home', 'live'],
  },
  {
    slug: 'fallback-ranking',
    feature: 'Fallback ranking',
    pitch: 'Publish which rescue is currently the best exact save, which is only an approximate fallback, and what evidence will rerank the next move.',
    competitiveGap: 'Competitors usually pick a fallback silently or make users guess whether the fastest rescue is also the truest one.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Use one fallback-ranking contract across Login, Home, and Live so rescue order comes from shared proof instead of ad hoc per-screen heuristics.',
    surfaces: ['login', 'home', 'live'],
  },
  {
    slug: 'fallback-equivalence',
    feature: 'Fallback equivalence',
    pitch: 'Tell users when rescue still preserves the same destination, when it only preserves rough browse or surf momentum, and when it has become a real restart.',
    competitiveGap: 'Competitors usually label every fallback as seamless even when the destination, title, or trust story changed under the hood.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Publish one surface-specific contract across Login, Home, and Live so the shell can distinguish exact preservation, approximate rescue, and honest restart without ad hoc copy.',
    surfaces: ['login', 'home', 'live'],
  },
  {
    slug: 'watch-party-sync-viewing',
    feature: 'Watch party / sync viewing',
    pitch: 'Share a session link so multiple viewers stay on the same stream position together.',
    competitiveGap: 'None of the major IPTV players make synchronized viewing a real product feature.',
    buildPhase: 'Phase 3',
    architectureNotes: 'Needs shared session state, playback clock sync, provider compatibility checks, and a safe desync fallback.',
    surfaces: ['home', 'live'],
  },
  {
    slug: 'parental-controls-per-profile',
    feature: 'Parental controls with per-profile PINs',
    pitch: 'Lock content by profile and maturity level instead of one blunt adult-content switch.',
    competitiveGap: 'Existing IPTV players usually stop at a single global content toggle.',
    buildPhase: 'Phase 2',
    architectureNotes: 'Introduce profile objects, PIN gates, provider and category restrictions, and gate-aware browse and playback actions.',
    surfaces: ['login', 'home'],
  },
  {
    slug: 'stream-health-indicator',
    feature: 'Stream health indicator',
    pitch: 'Show bitrate, buffer health, codec, resolution, and dropped frames in a subtle HUD that power users can trust.',
    competitiveGap: 'Debug detail is usually hidden or absent entirely.',
    buildPhase: 'Phase 1',
    architectureNotes: 'Update stream-health metrics from HLS.js or native playback events and tie the UI copy to the same truth model as recovery and retry guidance.',
    surfaces: ['live'],
  },
]);

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

const buildManifestSurfaceRecoveryPlans = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Surface recovery plan',
    summary: 'Login should never strand the user in credential repair if a healthier saved provider can safely own the next move.',
    plans: [
      {
        label: scenario === 'healthy' ? 'Primary fallback route' : 'Fastest safe login route',
        fastestRoute: scenario === 'expiredAccount'
          ? 'Skip reconnecting into the expired source and open Home on the healthiest saved provider.'
          : scenario === 'lineSaturated'
            ? 'Skip another launch attempt on the maxed account and open Home on the healthiest saved provider.'
            : scenario === 'authUnstable'
              ? 'Keep the saved connection visible, but hand the next move to Home on the healthiest saved provider.'
              : 'Open Home on the healthiest saved provider before risky trust spreads deeper into the shell.',
        preservedContext: 'Keep the saved provider identity, sample credentials, and trust posture visible so recovery still feels anchored to the same account story.',
        healthierProviderHandoff: 'The healthiest saved provider owns the next launch once Login stops being the honest place to keep retrying.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'authUnstable' ? 'watch' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Surface recovery plan',
    summary: 'Home should preserve browse momentum while moving onto the healthiest provider before the featured rail becomes a trap.',
    plans: [
      {
        label: scenario === 'healthy' ? 'Browse-preserving route' : 'Fastest safe Home route',
        fastestRoute: scenario === 'expiredAccount'
          ? 'Move Home onto the healthiest saved provider while the expired source falls back to cache and same-category live rescue.'
          : scenario === 'lineSaturated'
            ? 'Move featured rails and quick actions onto the healthiest saved provider before playback fails.'
            : scenario === 'authUnstable'
              ? 'Keep cached rails visible, but point the primary recovery move toward the healthiest saved provider.'
              : 'Move Home onto the healthiest saved provider before stale trust infects the rest of the browse session.',
        preservedContext: 'Keep the featured rail, spotlight intent, and same-category live recovery path visible even when the exact copy changes providers.',
        healthierProviderHandoff: 'The healthiest saved provider takes over launch ownership while Home preserves the same discovery posture.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'authUnstable' ? 'watch' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Surface recovery plan',
    summary: 'Live should preserve surf momentum and category context while handing launch ownership to the healthiest provider before the user blames the channel itself.',
    plans: [
      {
        label: scenario === 'healthy' ? 'Surf-preserving route' : 'Fastest safe Live route',
        fastestRoute: scenario === 'expiredAccount'
          ? 'Jump straight into the same Live category on the healthiest saved provider instead of forcing a reconnect.'
          : scenario === 'lineSaturated'
            ? 'Move Live onto the healthiest saved provider before another line-capacity failure lands on the same card.'
            : scenario === 'authUnstable'
              ? 'Keep the current browse context visible, but make the one-tap escape hatch the same category on the healthiest saved provider.'
              : 'Pivot Live into the healthiest saved provider while preserving channel-surf momentum and category context.',
        preservedContext: 'Keep the active category, selected card, preview expectations, and recovery explanation visible so the user does not lose their place.',
        healthierProviderHandoff: 'The healthiest saved provider owns the next launch even when the exact duplicate is missing and the fallback becomes category-preserving instead.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'authUnstable' ? 'watch' : 'recover',
      },
    ],
  },
]);

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
      'Verify that Login, Home, and Live visibly downgrade to their confidence-floor state before premium launch copy survives another tap.',
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
      ? 'Login should publish exactly how fresh auth and trust facts must be before the user moves into Home.'
      : 'Login should tell the truth about how long saved trust can stay useful before stale auth proof forces recovery to lead the surface.',
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
      : 'Home should be explicit about when the featured story is still safe from cache and when stale browse proof means trust recovery must take the lead.',
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
      : 'Live should separate usable surf continuity from stale playback certainty so degraded browse never feels like live launch proof.',
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

const buildSurfaceAutonomyBoundaries = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login autonomy boundary',
    summary: scenario === 'healthy'
      ? 'Login should quietly refresh trust and saved-provider posture, but the user must still own the final provider choice and credential edits.'
      : 'Login should say which trust and recovery moves the shell can handle automatically, which choice still belongs to the user, and what forces a hard handoff before setup becomes dishonest.',
    boundaries: [
      {
        label: 'Trust revalidation',
        autoMaintains: scenario === 'healthy'
          ? 'Refresh auth, expiry, and line-capacity facts in place while keeping the current server and saved-provider identity visible.'
          : 'Auto-refresh trust posture and downgrade recovery copy in place so the user sees the real provider risk without rebuilding the form.',
        userOwns: 'The user still owns changing the server, replacing credentials, or choosing a different saved provider as the primary source.',
        forcedHandoffTrigger: scenario === 'healthy'
          ? 'Only an intentional provider change or credential edit should force Login back into explicit user control.'
          : 'Any failed auth result, expired account, or repeated unstable check forces Login to hand the next move back to the user explicitly.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider rescue',
        autoMaintains: 'Keep healthiest saved-provider suggestions hot and revalidated so recovery options stay current without extra clicks.',
        userOwns: 'The user still decides whether to retry the active provider or switch to the healthier saved option.',
        forcedHandoffTrigger: 'The shell must stop feeling one-tap automatic once the safer route requires a different provider than the user selected.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home autonomy boundary',
    summary: scenario === 'healthy'
      ? 'Home should refresh hero trust, counts, and browse rails automatically, but the user must still own which destination and provider they actually launch.'
      : 'Home should say which product polish can stay automatic during degradation, which recovery choice still belongs to the user, and what event forces an explicit handoff before the hero starts lying.',
    boundaries: [
      {
        label: 'Hero and rail maintenance',
        autoMaintains: scenario === 'healthy'
          ? 'Refresh hero counts, featured trust posture, and quick-rail readiness in place without interrupting browse flow.'
          : 'Auto-refresh hero confidence, cached browse context, and recovery copy so the screen stays alive while the provider weakens.',
        userOwns: 'The user still owns whether to open Live, switch providers, or accept a rescue path instead of the default featured launch.',
        forcedHandoffTrigger: scenario === 'healthy'
          ? 'Only a mismatch between featured polish and real launch safety should force Home into an explicit recovery handoff.'
          : 'The moment recovery outranks the normal hero CTA, Home must hand the launch choice back to the user explicitly.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Cross-provider rescue suggestion',
        autoMaintains: 'Keep healthier-provider and same-category rescue options ranked in the background so the best fallback stays visible immediately.',
        userOwns: 'The user still chooses whether to stay with the active provider story or jump to the recommended fallback owner.',
        forcedHandoffTrigger: 'Once the default provider no longer safely owns launch, Home must make the provider switch a visible user choice rather than a hidden automation.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live autonomy boundary',
    summary: scenario === 'healthy'
      ? 'Live should automatically preserve surf context, preview focus, and guide refreshes, but the user must still own the moment a different provider or rescue path takes over launch.'
      : 'Live should say which surf behaviors stay automatic through degradation, which launch choice stays user-owned, and what trigger forces an explicit handoff before preview motion outruns trust.',
    boundaries: [
      {
        label: 'Surf continuity',
        autoMaintains: scenario === 'healthy'
          ? 'Preserve selected category, selected card, preview target, and guide refresh in place while the user keeps surfing.'
          : 'Preserve the same category surf and selected-card context while Live swaps in rescue copy, fallback guide posture, or provider warnings automatically.',
        userOwns: 'The user still owns whether to press Play, launch an alternate provider copy, or leave the current surf session.',
        forcedHandoffTrigger: scenario === 'healthy'
          ? 'Only a direct mismatch between selected-card confidence and real launch safety should force Live into an explicit user decision.'
          : 'Any time Live wants to hand launch to a different provider or rescue path, it must surface that switch as an explicit user choice.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'On-card rescue',
        autoMaintains: 'Keep alternate exact copies and same-category rescues ranked and visible on the active card without dumping the user out of the grid.',
        userOwns: 'The user still owns accepting the rescue launch and deciding whether the provider handoff is worth taking.',
        forcedHandoffTrigger: 'The shell must stop auto-feeling premium the moment preview confidence and rescue ownership point at different providers.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceIdentityAnchors = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login identity anchor',
    summary: scenario === 'healthy'
      ? 'Login stays premium only while the screen keeps proving which provider is being connected, which saved provider is being suggested, and which trust posture owns the next move.'
      : 'Login should say which provider and trust markers must stay visible during recovery, what meaning that preserved identity protects, and what missing proof turns fallback into an anonymous setup shuffle.',
    anchors: [
      {
        label: 'Provider identity',
        mustStayVisible: scenario === 'healthy'
          ? 'The selected server, saved-provider name, and current account posture stay visible next to the connect path.'
          : 'The failed provider, the healthier saved provider, and the reason that recommendation is safer must stay visible together.',
        preservesMeaning: 'The user understands whose credentials are active, whose trust is degraded, and whose Home path would take over next.',
        breakTrigger: scenario === 'healthy'
          ? 'If Login hides which provider owns the next move, the premium setup story becomes generic and brittle.'
          : 'If recovery no longer names which provider failed or which provider is rescuing the flow, Login has lost its identity anchor.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Scenario ownership',
        mustStayVisible: 'The active rehearsal mode and trust state stay attached to the same provider story instead of floating as detached warning copy.',
        preservesMeaning: 'The user can tell whether retry, connect, or switch-provider ownership changed because of this provider, not because the whole app forgot who it was talking about.',
        breakTrigger: 'If scenario or trust copy survives without provider ownership beside it, the fallback starts reading like random setup friction.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home identity anchor',
    summary: scenario === 'healthy'
      ? 'Home stays cinematic only while the hero and rails keep proving which provider owns the browse session, which trust posture is current, and whose fallback would take over if launch shifts.'
      : 'Home should say which provider and browse markers must stay visible during fallback, what meaning they preserve, and what missing identity proof turns the hero into anonymous confidence theater.',
    anchors: [
      {
        label: 'Browse-session owner',
        mustStayVisible: scenario === 'healthy'
          ? 'The active provider label, trust posture, and hero launch owner stay visible with the featured rail story.'
          : 'The current provider, cached-vs-live posture, and rescue owner must stay visible on the same Home frame.',
        preservesMeaning: 'The user understands whether the hero still belongs to the active provider, a cached continuation, or a healthier-provider rescue path.',
        breakTrigger: scenario === 'healthy'
          ? 'If the hero keeps selling launch without naming who owns it, Home loses its premium identity anchor.'
          : 'If the hero cannot say whose Home story survived, the fallback becomes anonymous wallpaper instead of trustworthy browse continuity.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail continuity',
        mustStayVisible: 'Quick rails keep the provider label or rescue owner attached when launch authority changes under the surface.',
        preservesMeaning: 'The user can tell whether a rail is preserving the current provider story or switching to a healthier owner before leaving Home.',
        breakTrigger: 'If a rail CTA no longer reveals who owns launch, Home has lost enough identity proof to treat that rail like a premium shortcut.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live identity anchor',
    summary: scenario === 'healthy'
      ? 'Live stays slick only while the selected card keeps proving which provider, category, and launch owner define the current surf session.'
      : 'Live should say which provider and surf markers must stay visible during rescue, what meaning they preserve, and what missing identity proof turns fallback into a disguised channel jump.',
    anchors: [
      {
        label: 'Selected-card owner',
        mustStayVisible: scenario === 'healthy'
          ? 'The selected channel, provider label, selected category, and launch owner stay attached to the active card.'
          : 'The active card must still show which provider weakened, which category the user is surfing, and who now safely owns launch.',
        preservesMeaning: 'The user understands whether the current card is still the same surf session or a rescue path attached to that session.',
        breakTrigger: scenario === 'healthy'
          ? 'If the active card cannot still name who owns Play, Live loses its surf identity anchor.'
          : 'If the selected card loses provider or category identity during rescue, the fallback becomes an anonymous jump instead of controlled continuity.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Rescue ownership',
        mustStayVisible: 'Exact-match rescue or same-category continuity stays labeled with the provider taking over and the context it preserved.',
        preservesMeaning: 'The user can see whether fallback kept the same channel identity, the same category surf, or only the safer provider owner.',
        breakTrigger: 'If rescue stays clickable without saying who took over or what context survived, Live has lost enough identity proof to market it as seamless.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceCanonicalProviderIdentityContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login canonical provider identity',
    summary: scenario === 'healthy'
      ? 'Login should prove that reconnecting with trimmed URLs, default-port variants, or saved labels still resolves to one canonical provider owner before saved trust or shortcut recovery takes over.'
      : 'Login should say when a reconnect still belongs to the same provider owner, which saved aliases are safe to absorb, and what mismatch means the shell must stop selling recovery as the same account story.',
    identities: [
      {
        label: 'Reconnect owner',
        canonicalOwner: scenario === 'healthy'
          ? 'Normalize server + username into one canonical provider key before saved-provider trust, Home shortcuts, or resume recovery attach to it.'
          : 'Keep recovery pinned to the same canonical provider key even when the reconnect URL, saved label, or retry path looks slightly different.',
        aliasCoverage: 'Accept trimmed host variants, default-port differences, and prior saved labels as aliases under the same provider owner instead of duplicating the account.',
        mismatchTrigger: scenario === 'healthy'
          ? 'If reconnect produces a second provider record for the same account, Login loses the right to call the next move seamless.'
          : 'If recovery cannot prove the reconnect still belongs to the same canonical owner, Login must present it as a different provider choice instead of a continuation.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-state continuity',
        canonicalOwner: 'Favorites, watch history, collections, and cached Home trust only stay premium when they resolve back to the same canonical provider owner.',
        aliasCoverage: 'Hydration may merge legacy IDs and prior server formatting into the current canonical owner as long as username ownership still matches.',
        mismatchTrigger: 'If saved history or favorites could attach to two provider owners at once, Login must stop implying one-tap continuity.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home canonical provider identity',
    summary: scenario === 'healthy'
      ? 'Home should keep the hero, rails, and trust posture attached to one canonical provider owner even when the saved provider was previously stored under a different host format or label.'
      : 'Home should say when cached rails still belong to the same provider owner, which alias history is safe to absorb into that owner, and what mismatch means fallback has become a new provider story.',
    identities: [
      {
        label: 'Hero owner',
        canonicalOwner: scenario === 'healthy'
          ? 'The hero launch, trust posture, and featured counts should all resolve to one canonical provider key.'
          : 'The fallback hero must still say whether it belongs to the current canonical provider owner or a healthier replacement owner.',
        aliasCoverage: 'Saved connection labels, prior host spellings, and normalized ports may differ, but the hero still counts as the same provider if the canonical owner matches.',
        mismatchTrigger: scenario === 'healthy'
          ? 'If Home can no longer prove the hero and trust posture share one provider owner, the cinematic story is overclaiming.'
          : 'If cached Home state looks continuous but belongs to a different canonical owner, Home must surface a provider switch instead of pretending the hero survived intact.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail recovery ownership',
        canonicalOwner: 'Quick rails may recommend a healthier provider, but they must show whether that recommendation preserves the original provider owner or hands off to a new canonical owner.',
        aliasCoverage: 'Alternate saved labels can collapse under the same provider owner without forcing the user to relearn their library.',
        mismatchTrigger: 'If a rail rescue changes provider ownership without naming that change, Home loses the right to market it as a premium shortcut.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live canonical provider identity',
    summary: scenario === 'healthy'
      ? 'Live should keep the selected card, preview, and launch owner tied to one canonical provider identity so exact-copy rescue and same-category rescue never blur into the wrong source story.'
      : 'Live should say when the current surf session still belongs to the same canonical owner, which alias history is safe to absorb, and what mismatch means rescue became a different provider jump.',
    identities: [
      {
        label: 'Surf-session owner',
        canonicalOwner: scenario === 'healthy'
          ? 'The selected card, preview URL, and Play ownership should all resolve to one canonical provider key.'
          : 'When rescue kicks in, Live must still tell the user whether the surf session stayed on the same canonical provider owner or moved to a new one.',
        aliasCoverage: 'Prior saved labels and normalized host differences may still count as the same source owner if the canonical provider key matches.',
        mismatchTrigger: scenario === 'healthy'
          ? 'If preview, selected card, and launch ownership point at different provider identities, Live has lost enough proof to feel seamless.'
          : 'If rescue launches under a different canonical owner without naming that handoff, Live must stop presenting it as the same surf session.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Exact-copy versus rescue',
        canonicalOwner: 'Exact duplicates only count as the same continuity story when they map back to the same canonical provider owner; otherwise they are an explicit provider rescue.',
        aliasCoverage: 'Live may absorb legacy IDs and alias labels while keeping favorites and history attached to the canonical owner the user already trusts.',
        mismatchTrigger: 'If alternate playback launches can inherit favorites or history without proving canonical ownership, Live is overstating continuity.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceFallbackRankingContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login fallback-ranking contract',
    summary: scenario === 'healthy'
      ? 'Login should show which saved provider currently leads the Home rescue stack so a one-tap shortcut never feels like a blind guess.'
      : 'Login should publish which saved provider currently leads rescue, what trust evidence put it there, and what new proof would rerank the stack before the user gets pushed into the wrong Home owner.',
    rankings: [
      {
        label: 'Lead the Home rescue stack',
        currentLeader: scenario === 'healthy'
          ? 'The leader is the saved provider with the cleanest auth, calmest line posture, and clearest Home handoff.'
          : 'The leader is the saved provider that can still deliver a believable Home launch while the active source has lost setup trust.',
        rankingEvidence: 'Rank auth health, expiry posture, line capacity, and whether the same saved-provider identity can carry the user into Home without rewriting the trust story.',
        rerankTrigger: scenario === 'healthy'
          ? 'Rerank the moment another provider gains a cleaner trust posture or the current leader needs caveats that the runner-up does not.'
          : 'Rerank as soon as fresh auth proof lands, line pressure changes, or the current leader starts needing more explanation than a competitor.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Lead the one-tap saved shortcut',
        currentLeader: 'The shortcut leader is whichever provider preserves the fastest safe move into Home without hiding risk behind the CTA.',
        rankingEvidence: 'The winning shortcut has to combine the clearest trust story with the least surprising launch destination for the user.',
        rerankTrigger: 'Rerank once two saved providers preserve Home equally well or the current shortcut keeps needing warning copy to stay honest.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home fallback-ranking contract',
    summary: scenario === 'healthy'
      ? 'Home should show which saved provider currently leads browse rescue so hero and rail fallbacks keep the discovery story honest.'
      : 'Home should publish which saved provider leads browse rescue, what continuity evidence put it on top, and what proof would rerank the stack before hero recovery feels arbitrary.',
    rankings: [
      {
        label: 'Lead the featured rescue stack',
        currentLeader: scenario === 'healthy'
          ? 'The leader is the saved provider that best preserves the same hero, same launch story, and strongest trust posture.'
          : 'The leader is the saved provider that can keep the same discovery story alive while the current hero has lost the safest next move.',
        rankingEvidence: 'Rank exact hero continuity first, then trust posture, then how much of the rail story survives without forcing the user to rediscover what they meant to launch.',
        rerankTrigger: scenario === 'healthy'
          ? 'Rerank when another provider preserves the hero equally well but carries a cleaner trust posture or stronger launch certainty.'
          : 'Rerank as soon as a provider restores fresher browse proof, stronger rail continuity, or less caveated launch ownership than the current leader.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Lead the rail launch stack',
        currentLeader: 'The rail leader is whichever provider keeps the same title family, same rail meaning, and safest next launch with the least explanation debt.',
        rankingEvidence: 'Trust ranking is not enough by itself; the winning rail provider also has to preserve why this rail mattered on the current Home frame.',
        rerankTrigger: 'Rerank once another provider offers stronger continuity for the same rail or the current leader starts changing what the rail promises.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live fallback-ranking contract',
    summary: scenario === 'healthy'
      ? 'Live should show which saved provider currently leads surf rescue so exact-match recovery and same-category fallback do not feel interchangeable.'
      : 'Live should publish which saved provider leads surf rescue, what playback evidence put it on top, and what new proof would rerank the stack before Play gets handed to the wrong owner.',
    rankings: [
      {
        label: 'Lead the selected-card rescue stack',
        currentLeader: scenario === 'healthy'
          ? 'The leader is the saved provider that best preserves the same selected channel, same category surf, and safest next Play.'
          : 'The leader is the saved provider that can still preserve the watch target while preview, guide, or line posture have made the current source unsafe.',
        rankingEvidence: 'Rank exact channel continuity first, then preview and guide confidence, then line posture, and only then fall back to same-category rescue if exact-match proof weakens.',
        rerankTrigger: scenario === 'healthy'
          ? 'Rerank when another provider proves the same channel with cleaner preview or safer Play ownership than the current leader.'
          : 'Rerank as soon as preview health flips, guide confidence recovers, or the current leader falls back from exact-match rescue to approximate same-category rescue.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Lead the category fallback stack',
        currentLeader: 'When exact-channel rescue is weak, the leader becomes the provider that keeps the same category surf meaning with the safest next Play.',
        rankingEvidence: 'A category fallback only wins if it keeps surf momentum clearer than a riskier exact match or a provider with weaker trust posture.',
        rerankTrigger: 'Rerank once an exact match becomes healthy again or a safer provider can preserve more of the same watch decision than the current fallback leader.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceConfidenceFloors = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login confidence floor',
    summary: scenario === 'healthy'
      ? 'Login can stay premium as long as it still proves who the provider is, whether trust is current, and where the user safely goes next.'
      : 'Login should say what minimum trust proof must still hold before the surface keeps a premium posture, what downgrade takes over below that floor, and what trigger forces a hard stop.',
    floors: [
      {
        label: 'Connection confidence',
        minimumProof: scenario === 'healthy'
          ? 'The shell still knows the selected provider identity, fresh auth posture, and safe next hop into Home.'
          : 'The shell must still know whether auth is fresh, stale, expired, unstable, or capacity-risky before it keeps sounding launch-ready.',
        downgradeMode: scenario === 'healthy'
          ? 'If trust is merely aging, Login can downgrade into visible revalidation while keeping sample credentials and saved providers intact.'
          : 'If confidence drops below launch-ready, Login must downgrade into recovery-led copy and visible healthiest-provider escape hatches instead of decorative trust language.',
        hardStopTrigger: scenario === 'healthy'
          ? 'Only a real auth failure or an intentional provider change should break the premium setup posture.'
          : 'Any expired account, repeated failed auth, or missing provider identity forces Login to stop pretending connect is the default next move.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider confidence',
        minimumProof: 'The shell still knows which saved provider is currently healthiest and why it is safer than the active one.',
        downgradeMode: 'If that ranking goes soft, Login must downgrade into explicit “retry or switch” language instead of implying one-tap certainty.',
        hardStopTrigger: 'If no trustworthy provider ranking survives, Login must stop promoting shortcut recovery as a premium default.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home confidence floor',
    summary: scenario === 'healthy'
      ? 'Home can stay cinematic as long as featured browse, quick rails, and provider trust still point at a genuinely safe next move.'
      : 'Home should say what minimum browse and trust proof must still hold before the hero keeps a premium posture, what downgrade takes over below that floor, and what trigger forces a hard stop.',
    floors: [
      {
        label: 'Hero confidence',
        minimumProof: scenario === 'healthy'
          ? 'The hero still has trustworthy provider posture plus a safe featured or recovery launch path.'
          : 'The hero must still know whether it is showing live truth, safe cached truth, or a recovery-owned launch before it keeps acting cinematic.',
        downgradeMode: scenario === 'healthy'
          ? 'If trust softens, Home can downgrade into cache-aware rails and visible rescue actions while preserving the browse frame.'
          : 'If featured confidence falls below safe launch, Home must downgrade into recovery-first hero language and cached browse context instead of glossy certainty.',
        hardStopTrigger: scenario === 'healthy'
          ? 'Only a real mismatch between hero confidence and launch safety should break the premium hero posture.'
          : 'Any moment the hero cannot name who safely owns the next launch forces Home to stop selling premium confidence and hand control back clearly.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail confidence',
        minimumProof: 'Quick rails still know whether they are launching default provider flow, healthier-provider rescue, or same-category continuity.',
        downgradeMode: 'If rail ownership gets fuzzy, Home must downgrade into explicit rescue framing instead of ambient premium shortcuts.',
        hardStopTrigger: 'If the shell cannot explain why a rail CTA is still safe, that rail must stop behaving like a premium default launch.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live confidence floor',
    summary: scenario === 'healthy'
      ? 'Live can stay slick as long as the selected card still proves whether preview, guide, and launch authority belong to the same safe surf flow.'
      : 'Live should say what minimum surf proof must still hold before preview and on-card launch keep a premium posture, what downgrade takes over below that floor, and what trigger forces a hard stop.',
    floors: [
      {
        label: 'Selected-card confidence',
        minimumProof: scenario === 'healthy'
          ? 'The selected card still has trustworthy launch authority, preview support, and enough guide truth to keep the surf flow honest.'
          : 'The selected card must still know whether Play, preview, or rescue owns the next move before it keeps surf momentum feeling premium.',
        downgradeMode: scenario === 'healthy'
          ? 'If preview or guide confidence softens, Live can downgrade into fallback art and rescue-ready card copy while preserving selection.'
          : 'If launch authority drops below premium confidence, Live must downgrade into rescue-led surf language and explicit provider ownership instead of seductive preview motion.',
        hardStopTrigger: scenario === 'healthy'
          ? 'Only a direct mismatch between selected-card launch safety and visible confidence should break the premium surf posture.'
          : 'Any time preview, guide, and launch truth no longer point at the same safe owner, Live must stop implying effortless playback.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Recovery confidence',
        minimumProof: 'The active card still knows whether exact-match rescue or same-category continuity is the safest fallback.',
        downgradeMode: 'If fallback ranking gets soft, Live must downgrade into explicit “do not trust preview alone” recovery copy.',
        hardStopTrigger: 'If Live cannot name a safe launch owner for the current surf context, the card must stop acting launch-ready.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceRecoveryWitnesses = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login recovery witness',
    summary: scenario === 'healthy'
      ? 'Login recovery only feels trustworthy if the shell leaves visible proof of which provider survived, why it is still safe, and where the user goes next.'
      : 'Login should say what visible evidence has to remain on-screen to make recovery believable, what setup context must carry forward with it, and what missing proof means the rescue can no longer be sold as trustworthy.',
    witnesses: [
      {
        label: 'Saved-provider witness',
        requiredEvidence: scenario === 'healthy'
          ? 'The shell still shows the saved-provider name, current trust posture, and the safer next move without wiping the form.'
          : 'The shell must still show which provider failed, which saved provider is healthier, and why that recommendation outranks another blind retry.',
        carriesForward: 'Keep the typed server, the selected saved connection, and the intended next hop into Home visible together.',
        trustBreakTrigger: scenario === 'healthy'
          ? 'If Login cannot still name the active or healthier provider, the recovery shortcut stops being credible.'
          : 'If provider identity or the reason for the recommendation disappears, Login must stop framing the rescue as a premium fast path.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Connect-path witness',
        requiredEvidence: 'The screen still shows whether Connect, Retry, or Switch provider now owns the next safe move.',
        carriesForward: 'Keep the connect form, trust message, and recovery CTA hierarchy aligned on the same screen.',
        trustBreakTrigger: 'If the user must guess which button is now honest, Login has lost enough proof to market the fallback as trustworthy.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home recovery witness',
    summary: scenario === 'healthy'
      ? 'Home recovery only feels premium if the hero and rails still leave visible proof of which browse path survived and why the next move is still safe.'
      : 'Home should say what visible evidence must stay on-screen to make hero or rail recovery believable, what browse context must carry forward with it, and what missing proof means the fallback has turned into confidence theater.',
    witnesses: [
      {
        label: 'Hero witness',
        requiredEvidence: scenario === 'healthy'
          ? 'The hero still shows who owns launch, whether trust is live or cached, and what fallback remains safe if the featured path softens.'
          : 'The hero must still show whether launch is owned by the active provider, cached context, or a rescue path before it keeps acting cinematic.',
        carriesForward: 'Keep the featured title, provider posture, and next-safe action visible together instead of resetting to generic browse wallpaper.',
        trustBreakTrigger: scenario === 'healthy'
          ? 'If Home cannot still show why the hero CTA is safe, the cinematic polish is no longer enough.'
          : 'If the hero cannot name which path survived and why, Home must stop pretending the featured launch is still premium.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail witness',
        requiredEvidence: 'Each rescue rail still shows whether it is preserving the active provider story, switching to a healthier provider, or keeping same-category continuity.',
        carriesForward: 'Keep row titles, selected provider context, and rescue CTA copy aligned so the user sees what survived at a glance.',
        trustBreakTrigger: 'If a rail fallback cannot show who owns it anymore, that rail must stop behaving like a premium browse shortcut.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live recovery witness',
    summary: scenario === 'healthy'
      ? 'Live recovery only feels honest if the active card still leaves visible proof of what survived the degraded moment and who safely owns the next launch.'
      : 'Live should say what visible evidence must stay attached to the active card to make rescue believable, what surf context must carry forward with it, and what missing proof means preview or recovery can no longer be trusted.',
    witnesses: [
      {
        label: 'Selected-card witness',
        requiredEvidence: scenario === 'healthy'
          ? 'The active card still shows selected channel identity, launch owner, and enough guide or preview truth to keep surf confidence honest.'
          : 'The active card must still show whether preview is decorative, whether Play is safe, and whether rescue now owns launch before surf confidence stays premium.',
        carriesForward: 'Keep the selected category, highlighted card, and next launch owner visible while the grid stays in place.',
        trustBreakTrigger: scenario === 'healthy'
          ? 'If the selected card cannot still prove why launch is safe, the surf flow loses its premium witness.'
          : 'If the active card cannot show what survived and who safely owns launch now, Live must stop selling rescue as effortless.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Rescue-path witness',
        requiredEvidence: 'The card still shows whether exact-match rescue or same-category continuity is carrying the surf session forward.',
        carriesForward: 'Keep the user on the same category and selected-card story even when the safer provider changes.',
        trustBreakTrigger: 'If Live can no longer show which recovery path preserved the surf session, the fallback becomes a disguised restart instead of a trustworthy rescue.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceFallbackCosts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login fallback cost',
    summary: scenario === 'healthy'
      ? 'Login can stay premium while degraded recovery still makes the lost convenience explicit instead of silently charging the user setup friction.'
      : 'Login should say what premium convenience has already been lost, what safe value is still preserved, and what additional loss means the shell must stop presenting the downgrade as a polished continuation.',
    costs: [
      {
        label: 'Fresh-auth convenience',
        visibleLoss: scenario === 'healthy'
          ? 'The user has not yet lost fresh-auth confidence, so Login can stay one-step and launch-ready.'
          : 'The user has already lost effortless fresh-auth confidence, so Login must stop acting like retrying the same provider is frictionless.',
        preservedValue: 'Saved providers, entered server details, and the next-safe recovery move still stay visible on the same surface.',
        hardStopThreshold: scenario === 'healthy'
          ? 'Only a real trust failure should force Login out of its premium posture.'
          : 'If Login also loses provider identity or the safest next move, it must stop presenting the fallback as premium and switch to blunt recovery guidance.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'One-tap confidence',
        visibleLoss: 'The shortcut feel is gone the moment a healthier saved provider becomes safer than the one the user picked.',
        preservedValue: 'The shell still preserves the same saved-provider story and keeps the switch action adjacent to the degraded trust facts.',
        hardStopThreshold: 'If the safer provider swap is no longer explainable in one glance, Login must stop posing as a premium shortcut.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home fallback cost',
    summary: scenario === 'healthy'
      ? 'Home can stay cinematic while degraded browse still makes the lost premium layer explicit instead of pretending the hero is fully live.'
      : 'Home should say what premium browse capability has already been lost, what honest value is still preserved, and what additional loss means the hero has to stop acting like a polished default path.',
    costs: [
      {
        label: 'Hero certainty',
        visibleLoss: scenario === 'healthy'
          ? 'The hero has not yet lost live-launch certainty, so the featured path can still read as premium.'
          : 'The hero has already lost some live certainty, so Home must say when it is leaning on cache, rescue-first launch, or degraded trust instead of a fully live featured path.',
        preservedValue: 'Featured title context, provider posture, quick rails, and the next-safe move still stay visible together on first paint.',
        hardStopThreshold: scenario === 'healthy'
          ? 'Only a real mismatch between featured polish and launch safety should force a downgrade.'
          : 'If Home can no longer say what survives or who safely owns launch, the hero must stop behaving like a premium cinematic shortcut.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail directness',
        visibleLoss: 'The user may lose the default provider or direct featured launch, even if the same browse session is still preserved.',
        preservedValue: 'Category density, browse momentum, and rescue paths still remain attached to recognizable rails instead of collapsing into utility states.',
        hardStopThreshold: 'If the rails can no longer say what they saved versus what they lost, Home must stop presenting fallback as a premium rail experience.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live fallback cost',
    summary: scenario === 'healthy'
      ? 'Live can stay slick while degraded surf still makes the lost capability explicit instead of letting preview motion hide what the user gave up.'
      : 'Live should say what surf capability was already lost, what honest value is still preserved, and what additional loss means the selected-card recovery can no longer pass as seamless.',
    costs: [
      {
        label: 'Launch purity',
        visibleLoss: scenario === 'healthy'
          ? 'The user has not yet lost direct launch confidence, so Play and preview can still feel clean and premium.'
          : 'The user may already have lost direct launch purity, because rescue, same-category fallback, or preview-only confidence has taken over part of the surf story.',
        preservedValue: 'Selected card, current category, and the safest next launch owner still remain attached to the same surf session.',
        hardStopThreshold: scenario === 'healthy'
          ? 'Only a direct mismatch between preview confidence and launch safety should force a more explicit downgrade.'
          : 'If the card cannot still say what capability was lost and who owns the safer path now, Live must stop selling the fallback as seamless surf.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Exact-match continuity',
        visibleLoss: 'The user may lose the exact provider copy or exact selected channel, even when same-category surf continuity still survives.',
        preservedValue: 'The grid, selected category, and visible rescue action still preserve surf momentum better than a cold restart.',
        hardStopThreshold: 'If Live can no longer explain whether it preserved the exact match, the category, or only the safer provider, the fallback has become too lossy to market as premium.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceRescueReceipts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login rescue receipt',
    summary: scenario === 'healthy'
      ? 'Login can stay premium when any recovery still leaves a crisp receipt for what setup context survived, what connection logic changed, and what the user should reconfirm before moving on.'
      : 'Login should say what setup context survived the fallback, what the shell changed under the hood, and what the user must reconfirm before trusting the next move.',
    receipts: [
      {
        label: 'Saved-provider swap receipt',
        preservedContext: scenario === 'healthy'
          ? 'Typed credentials, saved-provider identity, and the intended move into Home all stay visible together.'
          : 'The form state, saved-provider list, and the original intent to enter Home still stay intact during recovery.',
        changedUnderTheHood: scenario === 'healthy'
          ? 'Nothing changed yet; the shell is still prepared to switch recovery ownership to the healthiest saved provider without wiping the setup state.'
          : 'The shell may have reassigned the safest next move from retrying the active provider to switching onto the healthiest saved provider.',
        requiresReconfirmation: scenario === 'healthy'
          ? 'The user only needs to reconfirm that the selected provider is still the one they want to launch with.'
          : 'The user should reconfirm which provider now owns the next move before treating Connect like a direct, one-provider path.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Trust posture receipt',
        preservedContext: 'The login shell still preserves provider identity, trust facts, and the visible next-safe CTA on the same screen.',
        changedUnderTheHood: 'Fresh auth may have been downgraded into cached trust posture, retry guidance, or provider-switch guidance.',
        requiresReconfirmation: 'The user should reconfirm whether Retry, Switch provider, or Connect is now the honest next action.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home rescue receipt',
    summary: scenario === 'healthy'
      ? 'Home can stay cinematic when any fallback still leaves a receipt for what browse context survived, what launch ownership shifted, and what the user should reconfirm before clicking the hero or a rail.'
      : 'Home should say what browse context survived the fallback, what the shell changed under the hood, and what the user must reconfirm before trusting the next launch.',
    receipts: [
      {
        label: 'Hero rescue receipt',
        preservedContext: scenario === 'healthy'
          ? 'The featured title, quick rails, provider posture, and first-paint browse frame all stay intact.'
          : 'The featured title, the same Home rails, and the current browse frame stay visible even when live trust weakens.',
        changedUnderTheHood: scenario === 'healthy'
          ? 'Nothing changed yet; the hero can still hand off to healthier-provider or cached fallback ownership without collapsing the Home frame.'
          : 'The hero may now be launching from cache, recovery ownership, or same-category continuity instead of a fully live direct path.',
        requiresReconfirmation: scenario === 'healthy'
          ? 'The user only needs to reconfirm that the hero still represents the launch path they want.'
          : 'The user should reconfirm whether the hero is still the direct launch path or a recovery-owned route before treating it as a premium shortcut.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail continuity receipt',
        preservedContext: 'Row labels, category density, and the current provider story still stay attached to recognizable browse rails.',
        changedUnderTheHood: 'A rail may have swapped from direct provider launch into healthier-provider rescue or same-category continuity.',
        requiresReconfirmation: 'The user should reconfirm whether the rail preserved the exact title path, the same category, or only the safer provider owner.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live rescue receipt',
    summary: scenario === 'healthy'
      ? 'Live can stay slick when any fallback still leaves a receipt for what surf context survived, what playback ownership shifted, and what the user should reconfirm before trusting preview or Play.'
      : 'Live should say what surf context survived the fallback, what the shell changed under the hood, and what the user must reconfirm before trusting preview or launch.',
    receipts: [
      {
        label: 'Selected-card rescue receipt',
        preservedContext: scenario === 'healthy'
          ? 'The selected card, category surf context, and visible launch owner all stay attached to the same browsing session.'
          : 'The selected card and category surf context stay in place even when preview, guide, or provider trust degrades.',
        changedUnderTheHood: scenario === 'healthy'
          ? 'Nothing changed yet; the card can still route into exact-match rescue or same-category continuity without losing the selected surf context.'
          : 'The shell may now be using fallback art, healthier-provider rescue, or same-category continuity instead of a direct launch on the active provider.',
        requiresReconfirmation: scenario === 'healthy'
          ? 'The user only needs to reconfirm that preview and Play still belong to the same safe launch owner.'
          : 'The user should reconfirm whether preview is decorative, whether Play still owns the next move, and whether rescue changed the actual provider path.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Fallback path receipt',
        preservedContext: 'The grid, selected category, and the current surf story still stay visible instead of forcing a cold reset.',
        changedUnderTheHood: 'The fallback may have preserved the exact channel, only the same category, or only the healthier provider owner.',
        requiresReconfirmation: 'The user should reconfirm exactly which part of the surf story survived before treating the fallback as seamless.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceProofDebts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login proof debt',
    summary: scenario === 'healthy'
      ? 'Login stays premium when it admits exactly how much trust is still unsettled, what confidence is being borrowed from saved-provider context, and what fresh proof clears that debt.'
      : 'Login should say what trust uncertainty is still being carried, what confidence the shell is borrowing to stay useful, and what evidence must land before Connect feels honestly premium again.',
    debts: [
      {
        label: 'Fresh-auth debt',
        carriedUncertainty: scenario === 'healthy'
          ? 'Fresh auth still needs to be re-earned each time the user changes providers, even though the shell already knows the saved-provider story.'
          : 'The shell is still carrying uncertainty about whether fresh auth, expiry, or line capacity changed since the last known good state.',
        borrowedConfidence: 'Saved provider identity, visible account posture, and intact connection form context keep Login useful before a fresh auth roundtrip finishes.',
        repaymentTrigger: scenario === 'healthy'
          ? 'A fresh auth check plus a clear next-safe move into Home repays the setup debt.'
          : 'A confirmed auth result or an explicit healthier-provider handoff must land before Login can stop sounding like recovery-first setup.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Shortcut debt',
        carriedUncertainty: 'One-tap recovery still carries uncertainty until the shell can prove why this saved provider outranks a blind retry.',
        borrowedConfidence: 'The recommendation borrows confidence from the saved-provider roster, last known trust facts, and visible CTA hierarchy.',
        repaymentTrigger: 'The shell has to prove the safer provider choice or fall back to blunt retry-versus-switch language before the shortcut can feel premium again.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home proof debt',
    summary: scenario === 'healthy'
      ? 'Home stays cinematic when it admits what browse truth is still unsettled, what confidence is being borrowed from cache or rescue posture, and what proof clears that debt before the hero overclaims certainty.'
      : 'Home should say what browse uncertainty is still being carried, what confidence the shell is borrowing to stay useful, and what evidence must land before the hero can honestly read as premium again.',
    debts: [
      {
        label: 'Hero-launch debt',
        carriedUncertainty: scenario === 'healthy'
          ? 'The hero still carries small uncertainty about live freshness between paints, even when provider posture is healthy.'
          : 'The hero is still carrying uncertainty about whether live trust, cache truth, or rescue ownership now safely owns the featured launch.',
        borrowedConfidence: 'Featured artwork, provider posture, quick rails, and visible launch ownership let Home stay useful while fresh proof catches up.',
        repaymentTrigger: scenario === 'healthy'
          ? 'A fresh provider-backed launch path repays the hero debt before the next featured click.'
          : 'Home needs a clear live refresh or an explicit recovery-owned launch label before the hero can stop borrowing premium confidence.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail-continuity debt',
        carriedUncertainty: 'Quick rails still carry uncertainty whenever same-category continuity or healthier-provider rescue might outrank the direct featured path.',
        borrowedConfidence: 'Row density, preserved browse frame, and visible rescue language keep the rails useful before every title path is freshly proven.',
        repaymentTrigger: 'Each rail must either refresh into a clearly owned launch path or keep admitting that it is borrowing confidence from recovery context.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live proof debt',
    summary: scenario === 'healthy'
      ? 'Live stays slick when it admits what surf truth is still unsettled, what confidence is being borrowed from preview or category continuity, and what proof clears that debt before Play overclaims safety.'
      : 'Live should say what surf uncertainty is still being carried, what confidence the shell is borrowing to keep the grid useful, and what evidence must land before preview or Play can honestly feel premium again.',
    debts: [
      {
        label: 'Preview debt',
        carriedUncertainty: scenario === 'healthy'
          ? 'Preview motion still carries small uncertainty until launch authority, guide truth, and playback readiness align on the same selected card.'
          : 'The active card is still carrying uncertainty about whether preview is real proof, decorative motion, or just a bridge toward rescue-owned launch.',
        borrowedConfidence: 'Selected-card context, category continuity, and visible launch ownership let Live stay fast before every preview state is fully proven.',
        repaymentTrigger: scenario === 'healthy'
          ? 'Preview, Play, and guide truth aligning on the same safe owner repays the surf debt.'
          : 'Live needs either restored launch authority or an explicit rescue-owned Play path before preview can stop borrowing confidence.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Fallback-ranking debt',
        carriedUncertainty: 'Exact-match rescue and same-category continuity still carry uncertainty until the shell can prove which fallback preserved the most honest surf story.',
        borrowedConfidence: 'The grid, current category, and selected-card state keep the browse session alive while fallback ranking settles.',
        repaymentTrigger: 'Live must either prove the safer launch owner or keep the fallback framed as borrowed-confidence recovery instead of seamless playback.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceProofProvenances = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login proof-provenance contract',
    summary: scenario === 'healthy'
      ? 'Login should say whether Connect is currently backed by fresh auth proof, saved-provider continuity, or rescue logic before the setup flow sounds effortless.'
      : 'Login should publish what proof source is backing Connect right now, why that source is still honest enough to act on, and what source change must be disclosed before setup language stays premium.',
    sources: [
      {
        label: 'Fresh auth-backed Connect',
        currentSource: scenario === 'healthy'
          ? 'Fresh auth proof, current account posture, and the active saved-provider identity all back the next Home launch.'
          : 'Fresh auth proof is only partially backing Connect, so the shell should name exactly how much of the login story is still live versus borrowed.',
        honestyReason: scenario === 'healthy'
          ? 'This is honest because the latest auth result, line posture, and expiry facts all still point to one safe Home owner.'
          : 'This stays honest only while the latest auth result still materially supports the same saved-provider handoff instead of merely echoing old confidence.',
        disclosureTrigger: scenario === 'healthy'
          ? 'Disclose a source shift as soon as saved-provider memory or rescue logic starts doing more real work than fresh auth proof.'
          : 'Disclose immediately when stale auth, saved-provider memory, or rescue logic becomes the real reason Connect still looks safe.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider continuity',
        currentSource: 'Saved provider identity, stored credentials, and the last known-good trust posture are carrying the setup story forward while fresh proof catches up.',
        honestyReason: 'This is still useful because the provider identity, destination, and recovery path remain clear even when fresh auth certainty softens.',
        disclosureTrigger: 'Disclose louder once saved-provider continuity stops mapping cleanly to the same next Home owner and rescue has to take over.',
        tone: scenario === 'healthy' ? 'watch' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home proof-provenance contract',
    summary: scenario === 'healthy'
      ? 'Home should tell the user whether the hero and rails are being backed by live provider browse proof, safe cached continuity, or a rescue-owned launch path.'
      : 'Home should publish the current proof source behind featured browse, why that source is still honest enough to launch from, and what source shift must be disclosed before the shell keeps sounding current.',
    sources: [
      {
        label: 'Live browse proof',
        currentSource: scenario === 'healthy'
          ? 'Fresh provider browse data, current counts, and live launch ownership are backing the hero and quick rails.'
          : 'Live provider browse proof is only partially intact, so the hero has to admit where cache or rescue posture is already helping carry the launch story.',
        honestyReason: scenario === 'healthy'
          ? 'This is honest because the hero, rail counts, and launch CTA all still come from the active provider without hidden rescue doing the real work.'
          : 'This stays honest only while live provider proof still materially reinforces the same featured launch instead of simply decorating a cached or rescued story.',
        disclosureTrigger: scenario === 'healthy'
          ? 'Disclose the source shift as soon as cached browse continuity or rescue ownership starts carrying the hero more than live provider proof.'
          : 'Disclose immediately when the hero is mostly being held together by cache or rescue rather than current provider browse truth.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' ? 'watch' : 'recover',
      },
      {
        label: 'Cached browse continuity',
        currentSource: 'Saved Home rails, prior featured context, and preserved browse intent are keeping discovery intact while fresh provider truth is catching up.',
        honestyReason: 'This is still honest because the user can keep the same browse posture and category momentum even though freshness has softened.',
        disclosureTrigger: 'Disclose louder once cached continuity stops protecting the same featured story and rescue becomes the real owner of the next launch.',
        tone: scenario === 'healthy' ? 'watch' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live proof-provenance contract',
    summary: scenario === 'healthy'
      ? 'Live should say whether the next Play is backed by live preview plus guide proof, borrowed same-category continuity, or explicit rescue logic before motion implies too much trust.'
      : 'Live should publish what proof source is backing the selected-card Play flow, why that source is still honest enough to use, and what source shift must be disclosed before playback language stays premium.',
    sources: [
      {
        label: 'Live preview plus guide proof',
        currentSource: scenario === 'healthy'
          ? 'Current preview motion, NOW / NEXT truth, and the active provider posture all back the next Play tap on the selected card.'
          : 'Preview and guide proof are only partially backing Play, so the card should say exactly where same-category continuity or rescue logic is already helping.',
        honestyReason: scenario === 'healthy'
          ? 'This is honest because preview, guide, and provider health still reinforce the same exact-channel decision.'
          : 'This stays honest only while preview or guide proof still materially supports the same selected-card meaning instead of merely borrowing confidence from rescue.',
        disclosureTrigger: scenario === 'healthy'
          ? 'Disclose the source shift as soon as same-category continuity or rescue logic becomes more responsible for safe Play than current preview and guide proof.'
          : 'Disclose immediately when Play is mostly being carried by same-category rescue or fallback logic instead of current preview and guide truth.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Same-category continuity',
        currentSource: 'Selected-card intent, active category momentum, and rescue-ready surf context are keeping Live usable while exact-channel proof softens.',
        honestyReason: 'This is still honest because the user keeps the same live lane and fastest safe next move even when the exact selected channel is no longer fully proven.',
        disclosureTrigger: 'Disclose louder once same-category continuity stops preserving the same surf lane and Live must force a fresh channel pick or full rescue handoff.',
        tone: scenario === 'healthy' ? 'watch' : 'recover',
      },
    ],
  },
]);

const buildSurfaceClaimCeilings = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login claim ceiling',
    summary: scenario === 'healthy'
      ? 'Login can stay premium when it caps its promise at safe provider entry, visible trust posture, and one honest move into Home until fresh auth proof fully lands.'
      : 'Login should say the strongest promise it can still make, what setup confidence it must stop implying, and what proof raises Connect back to a premium claim.',
    ceilings: [
      {
        label: 'Connection promise ceiling',
        allowedPromise: scenario === 'healthy'
          ? 'The shell can promise a safe saved-provider entry point plus a clear next step into Home.'
          : 'The shell can promise a visible trust-led recovery path without pretending fresh provider auth is already settled.',
        forbiddenOverclaim: 'Do not imply that Connect is frictionless, final, or playback-safe if auth, expiry, or line posture is still unsettled.',
        upgradeProof: scenario === 'healthy'
          ? 'A fresh auth success plus a visible Home handoff raises the ceiling back to a fully premium login claim.'
          : 'Confirmed auth health or an explicit healthier-provider handoff must land before Login can sound fully premium again.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider shortcut ceiling',
        allowedPromise: 'The shell can promise that switching providers is faster and safer than retyping credentials from scratch.',
        forbiddenOverclaim: 'Do not imply the recommended saved provider is automatically the best playback owner if the ranking proof is still borrowed.',
        upgradeProof: 'A visible trust comparison or fresh provider validation has to land before the shortcut can claim best-path certainty.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home claim ceiling',
    summary: scenario === 'healthy'
      ? 'Home can stay cinematic when it caps its promise at fast browse, visible provider posture, and honest launch ownership until the featured path is freshly proven.'
      : 'Home should say the strongest browse promise it can still make, what premium story it must stop overselling, and what proof raises the hero back to a full premium claim.',
    ceilings: [
      {
        label: 'Hero promise ceiling',
        allowedPromise: scenario === 'healthy'
          ? 'The hero can promise a fast launch path with visible provider ownership and current browse context.'
          : 'The hero can promise a safe next move plus preserved browse context without pretending every featured claim is freshly live.',
        forbiddenOverclaim: 'Do not let featured artwork or bold CTA language imply live certainty if cache, rescue posture, or partial trust now owns the launch.',
        upgradeProof: scenario === 'healthy'
          ? 'A fresh provider-backed featured launch path keeps the hero at premium claim height.'
          : 'A restored live refresh or an explicit recovery-owned launch label must land before Home can reclaim full premium hero language.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Quick-rail promise ceiling',
        allowedPromise: 'Rails can promise fast navigation, preserved context, and an honest recovery path when the source weakens.',
        forbiddenOverclaim: 'Do not imply every rail item is equally launch-ready if same-category rescue or healthier-provider substitution may outrank the direct click.',
        upgradeProof: 'Fresh rail-level launch proof or explicit recovery ownership has to land before the rail copy can sound fully premium again.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live claim ceiling',
    summary: scenario === 'healthy'
      ? 'Live can stay slick when it caps its promise at fast surf, visible preview ownership, and safe card-level recovery until preview, guide, and launch proof fully align.'
      : 'Live should say the strongest surf promise it can still make, what playback confidence it must stop implying, and what proof raises Play back to a premium claim.',
    ceilings: [
      {
        label: 'Preview promise ceiling',
        allowedPromise: scenario === 'healthy'
          ? 'The selected card can promise fast preview-led surf with a visible path into playback.'
          : 'The selected card can promise preserved surf context plus the safest next move without pretending preview already proves launch safety.',
        forbiddenOverclaim: 'Do not let motion, guide snippets, or the Play CTA imply that preview alone proves playback authority under degraded provider conditions.',
        upgradeProof: scenario === 'healthy'
          ? 'Preview, guide, and launch authority aligning on the same card keep the premium surf claim honest.'
          : 'Restored launch authority or an explicit rescue-owned Play path must land before Live can claim premium playback confidence again.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Fallback promise ceiling',
        allowedPromise: 'Fallback can promise preserved category momentum and the safest visible recovery path.',
        forbiddenOverclaim: 'Do not imply exact-channel continuity if the shell only proved same-category rescue, healthier-provider ownership, or partial preview continuity.',
        upgradeProof: 'Exact launch proof or a clearly labeled same-category rescue outcome must land before the fallback can sound seamless.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceInterruptionBudgets = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login interruption budget',
    summary: scenario === 'healthy'
      ? 'Login can ask for a very short pause while validation settles, but the provider identity and fastest safe next move must stay visible the whole time.'
      : 'Login should publish how long it is allowed to keep the user waiting, what visible continuity buys that time, and when it must escalate instead of hiding behind a spinner.',
    budgets: [
      {
        label: 'Fresh validation delay budget',
        acceptableDelay: scenario === 'healthy'
          ? 'A brief validation pause is acceptable if Connect still feels like one continuous move into Home.'
          : 'Only a short retry window is acceptable before Login must switch from hopeful loading into explicit recovery copy.',
        continuityLayer: 'Keep the selected provider, trust facts, and healthiest-provider escape hatch visible while validation runs.',
        escalationTrigger: scenario === 'healthy'
          ? 'Escalate as soon as the wait hides provider ownership or makes the next safe move ambiguous.'
          : 'Escalate as soon as retries outlast the visible trust story or the user can no longer tell whether auth is progressing.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider shortcut budget',
        acceptableDelay: 'Provider switching can take a beat, but it should feel faster than re-entering credentials from scratch.',
        continuityLayer: 'Carry the chosen provider name, account posture, and destination into Home without resetting the form ritual.',
        escalationTrigger: 'Escalate if the shortcut feels like a full restart or loses the provider comparison that justified the switch.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home interruption budget',
    summary: scenario === 'healthy'
      ? 'Home can spend a moment refreshing featured browse proof, but the cinematic shell only stays honest if the rails remain useful while that refresh lands.'
      : 'Home should publish how long featured browse can stay in a transitional state, what cached continuity keeps the surface premium enough, and when it must escalate instead of stalling beautifully.',
    budgets: [
      {
        label: 'Hero refresh delay budget',
        acceptableDelay: scenario === 'healthy'
          ? 'A short hero refresh is acceptable if counts, artwork, and the next launch move stay stable on screen.'
          : 'Only a brief refresh grace window is acceptable before Home must admit the hero is running on cache or recovery posture.',
        continuityLayer: 'Keep saved rails, provider facts, and a named recovery launch path visible while the hero refreshes.',
        escalationTrigger: scenario === 'healthy'
          ? 'Escalate once the hero pause starts feeling decorative instead of useful.'
          : 'Escalate once the hero stops proving current browse authority and the shell is only borrowing confidence from cache.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Rail continuity budget',
        acceptableDelay: 'Rails can tolerate stale edges briefly if the next safe launch path stays obvious.',
        continuityLayer: 'Use cached card context, provider trust posture, and explicit recovery ownership to keep the rail actionable.',
        escalationTrigger: 'Escalate if the user would need Settings or support knowledge to understand why a rail still deserves a click.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live interruption budget',
    summary: scenario === 'healthy'
      ? 'Live can spend a split second arming preview or NOW/NEXT, but surf flow only stays premium if the selected card keeps proving what happens next.'
      : 'Live should publish how long surf can tolerate preview, guide, or provider wobble, what continuity layer keeps the card trustworthy, and when it must escalate instead of faking momentum.',
    budgets: [
      {
        label: 'Preview arming delay budget',
        acceptableDelay: scenario === 'healthy'
          ? 'A quick preview arm is acceptable if the card still feels instantly playable.'
          : 'Only a short preview grace window is acceptable before the shell must admit it is preserving surf context rather than live preview confidence.',
        continuityLayer: 'Keep channel identity, category focus, guide context, and rescue ownership attached to the same card while preview catches up.',
        escalationTrigger: scenario === 'healthy'
          ? 'Escalate once preview delay starts breaking the surf rhythm.'
          : 'Escalate once motion or stale art is the only thing making the card look playable.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Guide fallback delay budget',
        acceptableDelay: 'Guide softness is acceptable briefly if the user can still surf and launch without losing channel context.',
        continuityLayer: 'Use the current category, selected channel, and explicit rescue path to preserve momentum while NOW and NEXT recover.',
        escalationTrigger: 'Escalate if the shell keeps pretty motion alive after guide, preview, and launch ownership have all gone soft at once.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceRetryContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login retry contract',
    summary: scenario === 'healthy'
      ? 'Login can offer a fast retry while the same provider still credibly owns the next move, but retry only stays honest if the saved escape route remains visible.'
      : 'Login should publish when retrying the current provider is still honest, what setup context retry is allowed to preserve, and what trigger means the shell must stop selling retry before it turns into spinner theater.',
    retries: [
      {
        label: 'Reconnect this provider',
        honestRetryWindow: scenario === 'healthy'
          ? 'Retry stays honest while auth is freshening the same provider story and the next move still points cleanly into Home.'
          : 'Retry is only honest during a short trust-refresh window where the same provider can still plausibly own the next launch.',
        preservesContext: 'Keep the typed server, saved-provider identity, trust facts, and healthiest-provider fallback visible while retry runs.',
        giveUpTrigger: scenario === 'healthy'
          ? 'Stop nudging retry as soon as provider ownership becomes ambiguous or a healthier saved provider clearly outranks it.'
          : 'Stop nudging retry as soon as auth stays unstable, expiry is confirmed, or line pressure makes another provider the safer launch owner.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Retry saved shortcut',
        honestRetryWindow: 'A saved-provider shortcut stays honest only while it still resolves faster than asking the user to rebuild setup by hand.',
        preservesContext: 'Preserve the chosen provider name, account posture, and Home destination so retry still feels like one move, not a reset.',
        giveUpTrigger: 'Stop nudging the shortcut once the shell can no longer explain why this provider is still safer than switching.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home retry contract',
    summary: scenario === 'healthy'
      ? 'Home can retry featured browse proof in place while the same provider still owns discovery, but retry stops being honest when cache or rescue already tells a safer story.'
      : 'Home should publish when retrying the active provider is still honest, what browse context can survive that retry, and what trigger means the hero must hand authority to recovery instead.',
    retries: [
      {
        label: 'Retry featured refresh',
        honestRetryWindow: scenario === 'healthy'
          ? 'Retry stays honest while featured rails and provider facts are refreshing toward the same browse story.'
          : 'Retry is only honest during a short grace window where cached browse context is holding the same featured intent alive.',
        preservesContext: 'Keep the hero, quick rails, provider trust posture, and same next-safe-move language visible while refresh runs.',
        giveUpTrigger: scenario === 'healthy'
          ? 'Stop nudging retry once the hero no longer adds fresher truth than the cached or rescue path already visible.'
          : 'Stop nudging retry once cached continuity or healthier-provider recovery is doing more real work than the live provider refresh.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Retry this rail launch owner',
        honestRetryWindow: 'A rail-level retry stays honest only while the active provider still has a believable claim to own the next launch.',
        preservesContext: 'Preserve the selected rail, featured identity, and recovery comparison so the user never loses discovery intent.',
        giveUpTrigger: 'Stop nudging retry once the safest next move is clearly a healthier provider or same-category rescue.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live retry contract',
    summary: scenario === 'healthy'
      ? 'Live can retry preview, guide, or launch authority in place while the selected card still belongs to the same surf session, but retry stops being honest when rescue already owns the safer next move.'
      : 'Live should publish when retrying the active provider is still honest, what surf context retry is allowed to preserve, and what trigger means the selected card must hand launch authority to recovery.',
    retries: [
      {
        label: 'Retry selected-card launch',
        honestRetryWindow: scenario === 'healthy'
          ? 'Retry stays honest while the selected card still points at the same provider, same surf context, and same likely launch owner.'
          : 'Retry is only honest during a short selected-card recovery window where the same provider can still plausibly reclaim launch authority.',
        preservesContext: 'Keep the selected category, selected card, preview target, guide state, and rescue comparison attached to the same surf path.',
        giveUpTrigger: scenario === 'healthy'
          ? 'Stop nudging retry once preview confidence and launch safety stop pointing at the same card.'
          : 'Stop nudging retry once same-category rescue or an alternate provider becomes safer than asking the user to hit Play again on the weakened source.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Retry guide and preview sync',
        honestRetryWindow: 'Guide or preview retry stays honest only while the user can still surf and launch without rebuilding their place in the grid.',
        preservesContext: 'Preserve category focus, channel identity, and the current fallback owner while Live re-arms preview or NOW and NEXT.',
        giveUpTrigger: 'Stop nudging retry once stale art or partial guide context is the only thing making the card look playable.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceProviderSwitchContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login provider-switch contract',
    summary: scenario === 'healthy'
      ? 'Login can keep the current provider in front while fresh auth proof is still landing, but it should switch as soon as a healthier saved provider clearly owns the safer path into Home.'
      : 'Login should publish when the current provider has honestly lost setup ownership, what context a switch must preserve, and what proof lets the current provider keep the surface.',
    switches: [
      {
        label: 'Switch away from unstable auth',
        switchTrigger: scenario === 'healthy'
          ? 'Switch only when a healthier saved provider clearly outranks the current line on auth, expiry, or connection pressure.'
          : 'Switch as soon as auth stays unstable, expiry is confirmed, or line pressure makes another saved provider the safer owner of Home.',
        preservesContext: 'Carry the typed server memory, chosen provider label, trust facts, and intended Home handoff so the move feels like rescue, not restart.',
        stayProof: scenario === 'healthy'
          ? 'Fresh auth success plus visible provider trust keeps the current provider in control.'
          : 'Only a fresh auth recovery with visible trust posture should keep the current provider from losing the next move.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Switch saved-provider shortcut owner',
        switchTrigger: 'Switch once the shortcut can no longer honestly claim it is faster or safer than moving to a healthier saved provider.',
        preservesContext: 'Preserve the chosen destination, saved-provider comparison, and user confidence that setup progress survived the swap.',
        stayProof: 'A visible trust comparison showing this provider still wins keeps the shortcut on the current owner.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home provider-switch contract',
    summary: scenario === 'healthy'
      ? 'Home can keep the current provider as the cinematic browse owner while featured proof and rails still reinforce the same discovery story, but it should switch once recovery truth clearly outranks live refresh.'
      : 'Home should publish when the current provider has honestly lost browse ownership, what discovery context a switch must preserve, and what proof lets the current provider keep the hero.',
    switches: [
      {
        label: 'Switch featured browse owner',
        switchTrigger: scenario === 'healthy'
          ? 'Switch only when cached browse continuity and a healthier provider together tell a safer discovery story than waiting on the current hero refresh.'
          : 'Switch as soon as recovery posture is doing more real work than live provider refresh and the same featured intent can survive elsewhere.',
        preservesContext: 'Carry the hero title, quick rails, provider trust posture, and next-safe-launch language so discovery momentum survives the provider swap.',
        stayProof: scenario === 'healthy'
          ? 'Fresh featured proof plus visible provider trust keeps Home on the current provider.'
          : 'Only a live refresh that restores current browse authority should keep the current provider in control of the hero.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Switch rail launch owner',
        switchTrigger: 'Switch once the safest launch path on the rail clearly belongs to another saved provider or same-intent recovery route.',
        preservesContext: 'Preserve the selected rail, featured context, and launch target so the user never has to rediscover what they meant to watch.',
        stayProof: 'A current-provider launch proof that still outranks every alternate keeps the rail on the same owner.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live provider-switch contract',
    summary: scenario === 'healthy'
      ? 'Live can keep the current provider on the selected card while preview, guide, and launch proof still point to the same surf owner, but it should switch as soon as rescue owns the safer next play.'
      : 'Live should publish when the current provider has honestly lost surf ownership, what selected-card context a switch must preserve, and what proof lets the current provider keep Play.',
    switches: [
      {
        label: 'Switch selected-card owner',
        switchTrigger: scenario === 'healthy'
          ? 'Switch only when same-category rescue or a healthier provider clearly owns a safer launch than the current selected card.'
          : 'Switch as soon as preview, guide, or line posture weakens enough that rescue owns the safest next Play on the selected card.',
        preservesContext: 'Carry the selected category, selected card, channel identity, preview target, and recovery comparison so surf rhythm survives the swap.',
        stayProof: scenario === 'healthy'
          ? 'Preview, guide, and launch ownership aligning on the same card keeps Live on the current provider.'
          : 'Only restored launch authority on the same selected card should keep the current provider from losing Play ownership.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Switch guide-and-preview owner',
        switchTrigger: 'Switch once the card looks playable only because stale art or partial guide context is masking that another provider now owns the safer launch.',
        preservesContext: 'Preserve category focus, channel meaning, and the current rescue explanation so the user keeps their place in the grid.',
        stayProof: 'A recovered preview-plus-guide state that points back to the same launch owner lets Live stay on the current provider.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceProviderChoiceContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login provider-choice contract',
    summary: scenario === 'healthy'
      ? 'Login can auto-pick the healthiest saved provider only while the account story, Home destination, and trust posture are equivalent enough to keep setup intent intact.'
      : 'Login should publish when StreamDeck may auto-pick the healthiest provider, what proof makes that shortcut honest, and what ambiguity means the user must choose the provider explicitly.',
    choices: [
      {
        label: 'Auto-pick the healthiest saved provider',
        autoPickTrigger: scenario === 'healthy'
          ? 'Auto-pick only when one saved provider clearly wins on auth, expiry, and line pressure while still pointing to the same Home launch.'
          : 'Auto-pick as soon as one saved provider clearly restores launch safety and the weakened provider no longer owns a believable path into Home.',
        equivalenceProof: 'The provider names may differ, but the destination, account trust story, and next move into Home must remain equivalent and visible.',
        userChoiceTrigger: scenario === 'healthy'
          ? 'Ask the user to choose if two providers look equally healthy or if switching would change the setup story they think they are confirming.'
          : 'Ask the user to choose once the rescue would change provider identity, account expectations, or the confidence story enough that the shortcut stops being obvious.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Choose between saved-provider shortcuts',
        autoPickTrigger: 'Auto-pick only while one shortcut is measurably safer and faster than presenting a choice chip set.',
        equivalenceProof: 'The same saved credentials, same Home target, and same trust facts must survive the shortcut for auto-pick to stay honest.',
        userChoiceTrigger: 'Ask the user to choose once two saved shortcuts preserve intent equally well or each one trades a different risk.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home provider-choice contract',
    summary: scenario === 'healthy'
      ? 'Home can auto-pick a healthier provider only while the featured title, rail intent, and launch story stay equivalent enough that discovery still feels continuous.'
      : 'Home should publish when StreamDeck may auto-pick the healthiest provider for browse rescue, what equivalence proof makes that auto-pick honest, and what ambiguity forces the user to choose.',
    choices: [
      {
        label: 'Auto-pick featured browse rescue',
        autoPickTrigger: scenario === 'healthy'
          ? 'Auto-pick only when one healthier provider preserves the same featured title, same next launch, and a clearly better trust posture.'
          : 'Auto-pick as soon as one healthier provider can preserve the same discovery intent while the weakened hero no longer owns the safest next move.',
        equivalenceProof: 'The hero identity, quick-rail intent, and launch promise must stay materially the same even if the provider under the hood changes.',
        userChoiceTrigger: scenario === 'healthy'
          ? 'Ask the user to choose if alternate providers would change the featured title, rail emphasis, or launch confidence story.'
          : 'Ask the user to choose once rescue would swap the hero, reorder the discovery story, or trade stronger trust for weaker content continuity.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Choose the launch owner for this rail',
        autoPickTrigger: 'Auto-pick only while one provider clearly preserves the selected rail and the next-safe-launch target better than every other option.',
        equivalenceProof: 'The same rail meaning, same title family, and same launch destination must survive the provider swap for auto-pick to stay invisible.',
        userChoiceTrigger: 'Ask the user to choose once alternate providers split between stronger trust, stronger catalog depth, or stronger continuity with prior history.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live provider-choice contract',
    summary: scenario === 'healthy'
      ? 'Live can auto-pick a healthier provider only while the selected channel, category surf context, and Play outcome stay equivalent enough that the swap does not feel like a different watch decision.'
      : 'Live should publish when StreamDeck may auto-pick the healthiest provider for surf rescue, what equivalence proof makes that auto-pick honest, and what ambiguity forces the user to choose the source explicitly.',
    choices: [
      {
        label: 'Auto-pick selected-card rescue',
        autoPickTrigger: scenario === 'healthy'
          ? 'Auto-pick only when one healthier provider preserves the same selected channel intent and clearly owns the safest next Play.'
          : 'Auto-pick as soon as one healthier provider can preserve the same surf target while preview, guide, or line pressure makes the current source unsafe.',
        equivalenceProof: 'The same category, same channel identity, and same likely Play outcome must survive the rescue for auto-pick to stay honest.',
        userChoiceTrigger: scenario === 'healthy'
          ? 'Ask the user to choose if alternate providers disagree on channel identity, guide confidence, or whether the selected card is really the same watch target.'
          : 'Ask the user to choose once rescue becomes approximate, category-only, or split between a safer provider and a truer channel match.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Choose between exact and approximate rescue',
        autoPickTrigger: 'Auto-pick only while one provider clearly wins both trust and channel equivalence on the selected card.',
        equivalenceProof: 'Preview identity, selected-card meaning, and surf momentum must all survive the swap for silent rescue to stay credible.',
        userChoiceTrigger: 'Ask the user to choose once the best trust source is not the best channel match or when same-category rescue becomes the only viable fallback.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceProviderReturnContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login provider-return contract',
    summary: scenario === 'healthy'
      ? 'Login should return from a rescue provider back to the original saved source only when that source has clearly earned safe Home ownership again.'
      : 'Login should publish when the original provider has honestly recovered enough to take setup ownership back, what continuity must survive that return, and what instability means the rescue provider should stay in control.',
    returns: [
      {
        label: 'Return Home ownership to the original provider',
        returnTrigger: scenario === 'healthy'
          ? 'Return only when the original provider restores clean auth, acceptable line capacity, and the same Home handoff the rescue provider preserved.'
          : 'Return only after fresh auth proof stabilizes, line pressure relaxes, and the original provider can tell the same Home story without hiding the prior risk.',
        preservesContext: 'Keep the typed server memory, saved-provider identity, trust facts, and planned Home destination visible so returning feels earned, not random.',
        stayOnRescueTrigger: scenario === 'healthy'
          ? 'Stay on the rescue provider if the original source still changes the trust story or cannot prove the same next move cleanly.'
          : 'Stay on the rescue provider while auth still wobbles, expiry or line pressure remains visible, or the original source cannot reclaim Home without making setup feel risky again.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Return the preferred saved-provider shortcut',
        returnTrigger: 'Return the preferred shortcut only when it is once again the safest and clearest one-tap path into Home.',
        preservesContext: 'Preserve the same shortcut label, provider comparison, and setup momentum the rescue path already protected.',
        stayOnRescueTrigger: 'Keep the shortcut on rescue while the original source still needs explanation, caveats, or a weaker CTA than the fallback owner.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home provider-return contract',
    summary: scenario === 'healthy'
      ? 'Home should return from a rescue provider back to the preferred source only when the original provider can restore the same browse story without downgrading trust or discovery continuity.'
      : 'Home should publish when the original provider has honestly recovered enough to own browse again, what discovery continuity must survive that return, and what instability means rescue should keep the hero.',
    returns: [
      {
        label: 'Return featured browse ownership',
        returnTrigger: scenario === 'healthy'
          ? 'Return only when the original provider restores the same hero identity, launch story, and trust posture the rescue path was preserving.'
          : 'Return only after fresh browse proof makes the original provider capable of carrying the same hero, rail intent, and launch confidence without leaning on apology copy.',
        preservesContext: 'Keep the hero title, quick rails, provider facts, and next-safe-launch language intact so discovery continuity survives the return.',
        stayOnRescueTrigger: scenario === 'healthy'
          ? 'Stay on rescue if going back would reorder the browse story, weaken trust cues, or make the next launch less safe.'
          : 'Stay on rescue while the original provider still risks swapping the hero, softening trust posture, or making the user rediscover what they already meant to watch.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Return this rail launch owner',
        returnTrigger: 'Return the rail owner only when the original provider again wins both trust and continuity for the same selected launch target.',
        preservesContext: 'Preserve rail meaning, selected title family, and prior watch intent so the user never feels the browse path reset under them.',
        stayOnRescueTrigger: 'Keep the rescue owner while the original source still offers a weaker launch, a thinner catalog copy, or a noisier trust story.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live provider-return contract',
    summary: scenario === 'healthy'
      ? 'Live should return from a rescue provider back to the preferred source only when the original provider can restore the same channel, category, and Play confidence without breaking surf momentum.'
      : 'Live should publish when the original provider has honestly recovered enough to take the selected card back, what surf continuity must survive that return, and what instability means rescue should keep Play ownership.',
    returns: [
      {
        label: 'Return selected-card ownership',
        returnTrigger: scenario === 'healthy'
          ? 'Return only when the original provider restores the same channel identity, guide confidence, and safer Play ownership on the selected card.'
          : 'Return only after preview, guide, and line posture recover enough that the original provider can reclaim the same selected card without weakening the surf path.',
        preservesContext: 'Keep the selected category, selected card, channel identity, preview target, and same rescue comparison visible so surf rhythm survives the return.',
        stayOnRescueTrigger: scenario === 'healthy'
          ? 'Stay on rescue if returning would make Play less certain, blur channel equivalence, or break category momentum.'
          : 'Stay on rescue while preview or guide confidence still flickers, line pressure still shadows Play, or the original source cannot prove it is the same watch target again.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Return from category rescue to exact channel owner',
        returnTrigger: 'Return from category-level rescue only when the original provider can again prove the exact channel match is healthier than staying on fallback.',
        preservesContext: 'Preserve category focus, channel meaning, and the user’s current surf rhythm while the exact-match owner earns the card back.',
        stayOnRescueTrigger: 'Keep category rescue in control while the exact-match source still creates ambiguity between safer playback and truer channel identity.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceFallbackEquivalenceContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login fallback-equivalence contract',
    summary: scenario === 'healthy'
      ? 'Login should tell the user whether the rescue provider preserves the same saved-provider experience, only an approximate shortcut, or a true restart into a different account story.'
      : 'Login should publish whether fallback keeps the same saved-provider experience, only preserves a rough shortcut, or forces an honest restart into a different account story.',
    equivalence: [
      {
        label: 'Saved-provider shortcut',
        equivalentExperience: scenario === 'healthy'
          ? 'Equivalent only when fallback preserves the same canonical provider owner, same Home destination, and the same trust posture the user thinks they are confirming.'
          : 'Equivalent only when the fallback still lands on the same canonical provider owner and Home destination without rewriting the trust story.',
        approximateExperience: 'Approximate when the healthiest fallback still reaches Home fast but changes the saved-provider label, warning posture, or the reason why this shortcut is safe.',
        restartTrigger: scenario === 'healthy'
          ? 'Treat it as a restart once the rescue changes account meaning, requires new credential trust, or lands the user somewhere other than the expected Home path.'
          : 'Treat it as a restart once rescue changes provider identity, asks for fresh trust, or can no longer honestly claim it is the same saved-provider move.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Direct reconnect',
        equivalentExperience: 'Equivalent only when reconnect still points at the same provider owner and restores the same next move without hidden caveats.',
        approximateExperience: 'Approximate when reconnect works, but only by softening confidence, delaying validation, or borrowing trust from a healthier saved fallback.',
        restartTrigger: 'Restart once reconnect requires different credentials, a different provider owner, or a different first destination than the user set out to confirm.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home fallback-equivalence contract',
    summary: scenario === 'healthy'
      ? 'Home should tell the user whether rescue preserves the same discovery surface, only keeps the rough browsing intent, or resets the product story into a different launch experience.'
      : 'Home should publish whether fallback preserves the same discovery surface, only keeps a rough browse intent, or forces a reset into a different launch story.',
    equivalence: [
      {
        label: 'Hero and quick-rail rescue',
        equivalentExperience: scenario === 'healthy'
          ? 'Equivalent only when rescue preserves the same hero title, same quick-launch meaning, and the same safest next play under a healthier provider.'
          : 'Equivalent only when the fallback keeps the same hero, same quick rails, and the same next-safe launch even while provider trust changes under the hood.',
        approximateExperience: 'Approximate when the healthiest fallback can keep the same mood and category intent, but swaps the hero, reorders the rails, or weakens metadata confidence.',
        restartTrigger: scenario === 'healthy'
          ? 'Treat it as a reset once rescue changes what the screen is about, replaces the launch path, or forces the user to rediscover the title family they already chose.'
          : 'Treat it as a reset once rescue cannot keep the same discovery story and instead drops the user into a different hero, thinner rail set, or a new browse path.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Featured live handoff',
        equivalentExperience: 'Equivalent only when the featured live fallback preserves the same channel identity, same row context, and same play promise from Home.',
        approximateExperience: 'Approximate when Home can preserve the same live category or title family, but not the exact featured launch target.',
        restartTrigger: 'Restart once the rescue loses both the exact featured card and the surrounding discovery context that made the Home launch feel intentional.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live fallback-equivalence contract',
    summary: scenario === 'healthy'
      ? 'Live should tell the user whether rescue keeps the exact same watch target, only keeps the same category momentum, or forces a true restart into a different surf path.'
      : 'Live should publish whether fallback keeps the exact watch target, only preserves category momentum, or forces a real restart into a different surf path.',
    equivalence: [
      {
        label: 'Selected channel rescue',
        equivalentExperience: scenario === 'healthy'
          ? 'Equivalent only when fallback preserves the same channel identity, same selected-card meaning, and the same likely play outcome under a healthier provider.'
          : 'Equivalent only when rescue still lands on the same selected channel and keeps preview plus play meaning intact, even though the provider owner changes.',
        approximateExperience: 'Approximate when the healthiest fallback can preserve the same live category and surf momentum, but not the exact selected channel copy.',
        restartTrigger: scenario === 'healthy'
          ? 'Treat it as a restart once rescue loses the selected channel identity and must send the user into a different category, card, or fresh browse context.'
          : 'Treat it as a restart once rescue cannot keep the selected card or category momentum and instead forces the user to rebuild the surf path from scratch.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Preview-to-play handoff',
        equivalentExperience: 'Equivalent only when the fallback provider can keep the same preview target and turn it into the same play decision without changing watch meaning.',
        approximateExperience: 'Approximate when the preview survives as the same category or same network family, but not the exact watch target the selected card promised.',
        restartTrigger: 'Restart once the fallback can no longer make the preview and play flow feel like the same channel decision the user already made.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceProviderStabilityContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login provider-stability contract',
    summary: scenario === 'healthy'
      ? 'Login should keep the current provider as the safe owner of fresh Home launches only while auth, line posture, and trust facts stay stable enough to hold through the next move.'
      : 'Login should publish when the current provider is stable enough to keep owning fresh Home launches, what jitter can be tolerated without yanking the setup flow away, and what instability means rescue should stay primary.',
    stabilities: [
      {
        label: 'Keep current-provider login ownership',
        stabilityThreshold: scenario === 'healthy'
          ? 'Keep the current provider primary while recent auth checks, expiry posture, and line usage all reinforce the same safe Home handoff.'
          : 'Only keep the current provider primary after fresh auth proof, calmer line posture, and consistent trust facts hold long enough to make the next Home launch feel boring again.',
        toleratedVolatility: 'A brief validation wobble or one stale trust refresh is acceptable only if the saved-provider story and Home destination remain unchanged and visible.',
        keepRescuePrimaryTrigger: scenario === 'healthy'
          ? 'Keep rescue primary once auth, expiry, or line posture starts changing the Home story faster than the current provider can prove stability.'
          : 'Keep rescue primary while auth keeps wobbling, line pressure keeps spiking, or provider trust still needs caveats before the user can safely leave Login.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Keep saved-provider shortcut ownership',
        stabilityThreshold: 'A saved-provider shortcut stays primary only while it remains the safest repeatable one-tap path into Home, not just the most recently recovered one.',
        toleratedVolatility: 'Minor timestamp drift or one delayed trust refresh is acceptable if the shortcut still points to the same provider identity and same next move.',
        keepRescuePrimaryTrigger: 'Keep rescue primary while the preferred shortcut still needs explanation, visible warnings, or a weaker CTA than the fallback owner.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home provider-stability contract',
    summary: scenario === 'healthy'
      ? 'Home should keep the current provider as the browse owner only while the hero, rails, and trust posture stay stable enough that fresh launches still feel safely attached to the same discovery story.'
      : 'Home should publish when the current provider is stable enough to keep owning fresh browse launches, what volatility the hero can tolerate, and what instability means rescue should stay primary.',
    stabilities: [
      {
        label: 'Keep featured browse ownership',
        stabilityThreshold: scenario === 'healthy'
          ? 'Keep the current provider primary while the hero, quick rails, and trust cues all keep reinforcing the same discovery and launch story.'
          : 'Only keep the current provider primary after live refresh, cached continuity, and trust cues stop contradicting one another across the hero and quick rails.',
        toleratedVolatility: 'A short guide miss or one delayed hero refresh is acceptable if cached browse context still protects the same featured title and same next-safe launch.',
        keepRescuePrimaryTrigger: scenario === 'healthy'
          ? 'Keep rescue primary once the hero needs repeated explanation or the current provider can no longer hold the same browse story across refreshes.'
          : 'Keep rescue primary while the hero keeps flipping between trust states, cached continuity is doing most of the real work, or the original source still cannot hold the same launch story twice in a row.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Keep rail launch ownership',
        stabilityThreshold: 'A rail stays on the current provider only while repeated launches would keep the same title family, same trust posture, and same recovery fallback hierarchy.',
        toleratedVolatility: 'Small artwork or metadata drift is acceptable if the rail meaning and launch confidence do not materially change.',
        keepRescuePrimaryTrigger: 'Keep rescue primary while the current provider still changes which card is safest or needs per-launch caveats that the fallback owner does not.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live provider-stability contract',
    summary: scenario === 'healthy'
      ? 'Live should keep the current provider as the selected-card owner only while preview, guide, and Play confidence stay stable enough that the next launch still belongs to the same surf path.'
      : 'Live should publish when the current provider is stable enough to keep owning fresh Play launches, what surf jitter can be tolerated, and what instability means rescue should stay primary.',
    stabilities: [
      {
        label: 'Keep selected-card Play ownership',
        stabilityThreshold: scenario === 'healthy'
          ? 'Keep the current provider primary while preview, NOW and NEXT, and Play confidence keep reinforcing the same selected-card launch owner.'
          : 'Only keep the current provider primary after preview, guide, and line posture stop wobbling enough that the same selected card can safely own the next Play again.',
        toleratedVolatility: 'A short preview buffer or one guide miss is acceptable if the same channel identity and same safest Play owner remain obvious on the selected card.',
        keepRescuePrimaryTrigger: scenario === 'healthy'
          ? 'Keep rescue primary once the current provider keeps changing whether the card is really safe to play.'
          : 'Keep rescue primary while preview keeps dropping, guide confidence keeps flickering, line posture still shadows Play, or the same selected card cannot hold launch ownership for more than a moment.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Keep category rescue parked on fallback',
        stabilityThreshold: 'Return from category rescue only when the original provider can repeatedly prove the exact channel or same surf target is healthy enough to own new launches again.',
        toleratedVolatility: 'Minor card-level guide drift is acceptable if category focus, channel meaning, and Play ownership still point to the same source.',
        keepRescuePrimaryTrigger: 'Keep rescue primary while the exact-match source still alternates between safer playback and truer identity instead of cleanly owning both.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceContinuityWindows = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login continuity window',
    summary: scenario === 'healthy'
      ? 'Login should say how long the same saved-provider handoff still counts as the exact same connection story before the shell must downgrade to retry or switch guidance.'
      : 'Login should name when it is still preserving a same-provider handoff, when it is only borrowing time from saved credentials, and when the setup story has to reset honestly.',
    windows: [
      {
        label: 'Saved-provider handoff',
        preservesFor: scenario === 'healthy'
          ? 'Keep the same provider owner, same credentials, and same next Home destination while trust signals still reinforce one clean handoff.'
          : 'Preserve the same saved-provider shortcut only while the account still looks trustworthy enough that reconnect feels like the same move, not a gamble.',
        downgradeAfter: 'Downgrade to retry-or-switch guidance once auth, expiry, or line posture stop pointing at one obvious Home owner.',
        resetTrigger: scenario === 'healthy'
          ? 'Reset when the saved provider stops being the same safe next move or no longer maps to the same canonical owner.'
          : 'Reset when auth instability, expiry, or line saturation make a fresh trust check or a different provider the only honest next move.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Typed credential continuity',
        preservesFor: 'Keep the current typed credentials intact through a trust-led retry so the user does not have to rebuild setup context from scratch.',
        downgradeAfter: 'Downgrade once repeated failures prove the current credential set is only historical input, not a launchable provider identity.',
        resetTrigger: 'Reset when the next safe move requires a different provider owner, different credentials, or a full reconnect explanation.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home continuity window',
    summary: scenario === 'healthy'
      ? 'Home should publish how long the same featured story and same browse intent stay exact before the shell has to admit it is leaning on cache or recovery.'
      : 'Home should tell the truth about when hero and rails are still the same browse session, when continuity is only approximate, and when the user is no longer in the same Home story.',
    windows: [
      {
        label: 'Hero browse continuity',
        preservesFor: scenario === 'healthy'
          ? 'Keep the same featured launch story while provider trust, artwork, counts, and launch ownership stay aligned.'
          : 'Preserve the same hero story only while cached context and live provider posture still point at the same launch owner.',
        downgradeAfter: 'Downgrade to rail-led browsing once the hero depends more on cached confidence or fallback ownership than current provider proof.',
        resetTrigger: 'Reset the hero promise when the featured path changes provider meaning, loses category intent, or can no longer honestly own the next launch.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Quick-rail continuity',
        preservesFor: 'Keep the same browse intent and same card meaning while rails can still route the user into the same category or title family without surprise.',
        downgradeAfter: 'Downgrade when rail clicks are still useful but no longer exact because fallback or cache is doing more work than the named provider.',
        resetTrigger: 'Reset when rails stop preserving category intent and the user must pick a new provider story or start a new browse path.',
        tone: scenario === 'healthy' ? 'ready' : 'watch',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live continuity window',
    summary: scenario === 'healthy'
      ? 'Live should show how long the selected card still represents the same channel session before surf continuity drops to same-category rescue or a full reset.'
      : 'Live should make explicit when the selected card is still the same exact channel story, when the shell is only keeping the same category alive, and when surf continuity is gone.',
    windows: [
      {
        label: 'Exact-channel continuity',
        preservesFor: scenario === 'healthy'
          ? 'Keep the same selected channel, same card identity, and same Play owner while preview, guide, and provider trust reinforce one exact-channel session.'
          : 'Preserve exact-channel surf continuity only while preview, guide, and fallback logic still agree that this is the same channel session.',
        downgradeAfter: 'Downgrade to same-category rescue once the card still points in the right direction but exact-channel ownership is no longer fully proven.',
        resetTrigger: 'Reset when preview, guide, and provider posture no longer agree on one exact selected channel the user can trust.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' ? 'watch' : 'recover',
      },
      {
        label: 'Category-surf continuity',
        preservesFor: 'Keep the same category rail, same surf momentum, and same fastest safe next channel while rescue is still meaningfully inside the current browse lane.',
        downgradeAfter: 'Downgrade when the shell can only preserve rough live-TV momentum instead of the same channel lane the user chose.',
        resetTrigger: 'Reset when provider pressure forces a fresh channel pick that no longer belongs to the same selected-card or same-category rescue story.',
        tone: scenario === 'healthy' ? 'ready' : 'watch',
      },
    ],
  },
]);

const buildSurfaceDowngradeLadders = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login downgrade ladder',
    summary: scenario === 'healthy'
      ? 'Login should tell the user whether StreamDeck can still hand off the same provider exactly, only approximate that handoff from saved facts, or needs a clean reconnect.'
      : 'Login should show when the saved-provider story is still exact, when it is only borrowing from saved facts, and when reconnect is the only honest next move.',
    rungs: [
      {
        label: 'Exact same-provider handoff',
        keeps: scenario === 'healthy' ? 'Saved provider, fresh auth proof, and immediate Home ownership stay attached to the same provider record.' : 'Saved provider identity and recent trust proof still support a same-provider Home handoff.',
        loses: 'Nothing yet; the user is still moving through the same provider owner.',
        handoffTrigger: 'Hold this rung until fresh auth proof, account state, and launch-readiness all still agree.',
        tone: 'ready',
      },
      {
        label: 'Approximate cached handoff',
        keeps: 'Provider identity, saved credentials, and the fastest route back into Home remain available.',
        loses: 'Fresh auth certainty drops, so Home may open on saved truth while reconnect finishes or fallback takes ownership.',
        handoffTrigger: 'Use this rung when auth is stale, unstable, or briefly unavailable but the saved provider story is still believable.',
        tone: 'watch',
      },
      {
        label: 'Fresh reconnect restart',
        keeps: 'Only the account label and reconnect affordance survive.',
        loses: 'Exact Home ownership and cached trust authority both fall away.',
        handoffTrigger: 'Trigger this rung when auth fails, the account is expired, or provider identity no longer matches the saved owner.',
        tone: 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home downgrade ladder',
    summary: scenario === 'healthy'
      ? 'Home should publish whether the hero and quick rails are still exact to the active provider, already leaning on approximate fallback, or back to a fresh browse restart.'
      : 'Home should show how far the shell has already slid from exact provider browse into approximate rescue before it finally has to restart discovery.',
    rungs: [
      {
        label: 'Exact featured browse',
        keeps: 'Featured hero, quick live rail, and provider counts all come from the active provider with current browse context intact.',
        loses: 'Nothing beyond ordinary provider latency tolerance.',
        handoffTrigger: 'Keep this rung while featured content, counts, and launch ownership still come from the active provider.',
        tone: 'ready',
      },
      {
        label: 'Approximate fallback browse',
        keeps: 'Hero mood, category direction, and quick-entry rails still carry the same user intent.',
        loses: 'Exact provider freshness drops, so rows may come from cache or a healthier rescue provider instead of the original source.',
        handoffTrigger: 'Use this rung when Home can still preserve the same browse story but needs cache or rescue data to keep the shell moving.',
        tone: 'watch',
      },
      {
        label: 'Fresh browse restart',
        keeps: 'Only top-level navigation and recovery entry points stay stable.',
        loses: 'Featured continuity, quick-rail certainty, and the current browse story all reset.',
        handoffTrigger: 'Trigger this rung when cached browse proof is exhausted or provider contradiction makes the current Home story no longer believable.',
        tone: 'recover',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live downgrade ladder',
    summary: scenario === 'healthy'
      ? 'Live should tell the user whether StreamDeck is still holding the exact selected channel, only a same-category rescue, or a full fresh channel restart.'
      : 'Live should show how far surf continuity has already degraded before the user taps Play again.',
    rungs: [
      {
        label: 'Exact-channel surf',
        keeps: 'Selected channel, preview path, and NOW/NEXT intent all stay attached to the same channel.',
        loses: 'Nothing beyond normal playback jitter tolerance.',
        handoffTrigger: 'Hold this rung while preview, guide, and launch readiness still support the exact selected channel.',
        tone: 'ready',
      },
      {
        label: 'Approximate same-category rescue',
        keeps: 'Category intent, surf momentum, and a fast alternate launch stay alive.',
        loses: 'Exact channel ownership drops, so the shell may rescue into a same-category alternate or fallback preview.',
        handoffTrigger: 'Use this rung when the exact selected channel cannot be trusted but category-level intent can still be preserved honestly.',
        tone: 'watch',
      },
      {
        label: 'Fresh channel restart',
        keeps: 'Only the live category shell and search/filter context remain.',
        loses: 'Exact selected-channel continuity and rescue-channel confidence both collapse.',
        handoffTrigger: 'Trigger this rung when preview, guide, and fallback all fail to support an honest next play from the current card.',
        tone: 'recover',
      },
    ],
  },
]);

const buildSurfaceLaunchReadinessContracts = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login launch readiness',
    summary: scenario === 'healthy'
      ? 'Login should tell the truth about whether Connect is merely valid auth, genuinely safe to hand into Home, or already leaning on recovery.'
      : 'Login should make the next safe move explicit before weak auth, line pressure, or unstable provider trust gets misread as a generic setup failure.',
    readiness: [
      {
        label: 'Connect into Home',
        safeWhen: scenario === 'healthy'
          ? 'Fresh auth, stable account posture, and a visible saved-provider owner all point at the same Home handoff.'
          : 'Only treat Connect as safe when the provider can still credibly own the next Home launch instead of just passing one auth check.',
        blockedWhen: scenario === 'healthy'
          ? 'Connect should soften as soon as auth, expiry, or line posture stop reinforcing the same next move.'
          : 'Block confidence when auth is unstable, the account is expired, or line pressure makes another provider safer than the current one.',
        recoveryMove: scenario === 'healthy'
          ? 'Keep the current provider visible and let the user move forward without retyping anything.'
          : 'Push the user toward the healthiest saved provider or a trust-led retry instead of pretending the current source is fine.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider shortcut',
        safeWhen: 'A saved provider is launch-ready only when it stays the fastest clear path into Home and still owns the best trust posture.',
        blockedWhen: 'Do not sell the shortcut as safe if it only won on recency, not on current provider health or playback readiness.',
        recoveryMove: 'Keep alternate saved providers visible so switching feels like a guided handoff, not a setup restart.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home launch readiness',
    summary: scenario === 'healthy'
      ? 'Home should make it obvious whether the hero and quick rails are safe launch surfaces right now or are being held together by cache and fallback continuity.'
      : 'Home should publish when the featured path is still genuinely launch-ready, when the shell is borrowing confidence from cached browse state, and when recovery owns the next move.',
    readiness: [
      {
        label: 'Featured launch',
        safeWhen: scenario === 'healthy'
          ? 'The hero is safe when provider trust, featured artwork, counts, and launch ownership all tell the same story.'
          : 'Only treat the hero as launch-ready when the featured path has current provider support instead of only cached browse confidence.',
        blockedWhen: scenario === 'healthy'
          ? 'Do not overclaim hero confidence once the provider story, guide freshness, or fallback owner starts drifting.'
          : 'Block confidence when cache is doing more real work than the live provider or when rescue ownership needs to be named first.',
        recoveryMove: scenario === 'healthy'
          ? 'Use quick rails and keep provider posture visible if the hero needs a brief refresh.'
          : 'Route the user to the safest quick-launch rail or recovery-owned browse path instead of stalling on one cinematic hero.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedEpg' || scenario === 'degradedLive' ? 'watch' : 'recover',
      },
      {
        label: 'Quick-launch rails',
        safeWhen: 'A rail is safe when it preserves the same browse intent and the same launch owner stays obvious from the card.',
        blockedWhen: 'Do not let every card look equally ready if some launches are cache-backed, fallback-owned, or only approximate matches.',
        recoveryMove: 'Keep rails live as the recovery surface so browse can continue without dumping the user back to Settings or Login.',
        tone: scenario === 'healthy' ? 'ready' : 'watch',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live launch readiness',
    summary: scenario === 'healthy'
      ? 'Live should tell the user whether the selected card is truly ready to play now, merely safe to preview, or already leaning on rescue logic.'
      : 'Live should keep surf speed high while being explicit about when preview, guide, or provider pressure means the next Play move is only partially proven.',
    readiness: [
      {
        label: 'Selected-channel Play',
        safeWhen: scenario === 'healthy'
          ? 'Play is safe when preview, NOW / NEXT, and provider posture all reinforce the same selected channel.'
          : 'Treat Play as safe only when the selected card still has a clear launch owner and preview is more than decorative motion.',
        blockedWhen: scenario === 'healthy'
          ? 'Do not let motion alone imply readiness if guide truth or provider posture goes soft.'
          : 'Block confidence when preview keeps dropping, guide confidence flickers, or line saturation means another provider now owns the safer Play.',
        recoveryMove: scenario === 'healthy'
          ? 'Keep the same card selected and refresh the preview path in place.'
          : 'Offer exact-channel rescue if available, otherwise keep the user inside the same category with an honest fallback label.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Category surf continuity',
        safeWhen: 'Surfing stays launch-ready when the selected card, current category, and next-safe provider still travel together.',
        blockedWhen: 'Do not present the grid as fully healthy if the user can keep browsing but the launch owner is shifting underneath the selected card.',
        recoveryMove: 'Preserve the selected category and explain whether fallback kept the exact channel, only the same category, or requires a restart.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildSurfaceLaunchOwnerships = (scenario = 'healthy') => ([
  {
    screenId: 'login',
    title: 'Login launch-ownership contract',
    summary: scenario === 'healthy'
      ? 'Login should make it obvious which provider currently owns the next Home handoff and what proof keeps Connect attached to that owner.'
      : 'Login should publish when the current provider still owns the next Home handoff, when rescue has already taken control, and what transfer trigger moved ownership away from the original source.',
    owners: [
      {
        label: 'Primary Connect owner',
        currentOwner: scenario === 'healthy'
          ? 'The current provider owns Connect while fresh auth, line posture, and expiry facts still support the same Home destination.'
          : scenario === 'expiredAccount'
            ? 'Recovery owns Connect because the current provider can no longer honestly take the user into Home.'
            : 'The current provider only partially owns Connect; rescue is shadowing the next move until auth and trust facts stabilize.',
        ownershipProof: scenario === 'healthy'
          ? 'Ownership stays with the current provider only when the latest auth check, saved-provider identity, and launch-readiness cues all point to the same Home owner.'
          : 'Ownership is only honest when the shell can name whether fresh auth proof or a healthier saved provider is actually backing the next Home launch.',
        transferTrigger: scenario === 'healthy'
          ? 'Transfer Connect ownership once auth, expiry, or line posture stops supporting the same saved-provider handoff.'
          : 'Transfer Connect ownership to rescue when auth instability, expiry, or line saturation makes retry-or-switch safer than pretending the current provider is still primary.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Saved-provider shortcut owner',
        currentOwner: scenario === 'healthy'
          ? 'A saved-provider shortcut owns the next tap only when it remains the safest one-step path into Home.'
          : 'The healthiest saved-provider shortcut owns the next tap only if it is safer than the current typed credentials and keeps the same setup story visible.',
        ownershipProof: 'The shortcut has to prove more than recency. It needs the best current trust posture, the clearest Home destination, and the least explanatory debt.',
        transferTrigger: 'Transfer ownership away from the shortcut once another provider becomes the safer Home owner or the shortcut needs caveats the rescue owner does not.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
  {
    screenId: 'home',
    title: 'Home launch-ownership contract',
    summary: scenario === 'healthy'
      ? 'Home should publish which provider currently owns the next featured or rail launch so the hero never hides a transfer of control.'
      : 'Home should tell the truth about whether the current provider, cached browse continuity, or a rescue path now owns the next launch from the hero and quick rails.',
    owners: [
      {
        label: 'Featured hero owner',
        currentOwner: scenario === 'healthy'
          ? 'The active provider owns the featured launch while the hero, counts, and trust posture still reinforce one clean browse story.'
          : scenario === 'degradedLive' || scenario === 'degradedEpg'
            ? 'Cached continuity and rescue posture are helping own the featured launch until the active provider can fully re-prove it.'
            : 'Recovery owns the featured launch because the original provider can no longer support the same hero promise cleanly.',
        ownershipProof: scenario === 'healthy'
          ? 'Hero ownership is only honest when the featured title, launch CTA, and provider trust all still come from the same live source.'
          : 'Hero ownership has to name whether the launch is being backed by live provider proof, safe cached continuity, or a healthier fallback path.',
        transferTrigger: scenario === 'healthy'
          ? 'Transfer hero ownership once the featured path depends more on fallback, cache, or recovery than on current provider proof.'
          : 'Transfer hero ownership fully to rescue once the original provider keeps changing the safest launch story or can no longer hold the same browse promise across refreshes.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' ? 'watch' : 'recover',
      },
      {
        label: 'Quick-rail owner',
        currentOwner: scenario === 'healthy'
          ? 'Each quick rail owns its next launch only while the card meaning and provider owner stay aligned.'
          : 'Quick rails stay owned by the fastest safe path, even if that means rescue or cache is quietly doing more real work than the named provider.',
        ownershipProof: 'Rail ownership is earned when the next click still preserves the same browse intent, same title family, and same honest launch owner.',
        transferTrigger: 'Transfer rail ownership when the click would keep the same mood but no longer the same provider-backed launch story.',
        tone: scenario === 'healthy' ? 'ready' : 'watch',
      },
    ],
  },
  {
    screenId: 'live',
    title: 'Live launch-ownership contract',
    summary: scenario === 'healthy'
      ? 'Live should tell the user who actually owns the next Play tap on the selected card before preview motion implies more than current proof.'
      : 'Live should publish when the current provider still owns the next Play tap, when same-category rescue took control, and what event transfers ownership off the selected card.',
    owners: [
      {
        label: 'Selected-card Play owner',
        currentOwner: scenario === 'healthy'
          ? 'The current provider owns Play while preview, NOW / NEXT, and line posture still reinforce the same selected channel.'
          : scenario === 'degradedLive' || scenario === 'lineSaturated'
            ? 'Rescue is partially owning Play because the selected card still carries intent, but the original provider no longer fully owns the safest launch.'
            : 'Recovery owns the next Play tap until the selected card can be re-proven as the safest exact-channel launch.',
        ownershipProof: scenario === 'healthy'
          ? 'Play ownership is only honest when preview, guide truth, and provider health all still support the same exact-channel decision.'
          : 'Play ownership must name whether the next tap is backed by exact-channel proof, same-category rescue, or a recovery-first path.',
        transferTrigger: scenario === 'healthy'
          ? 'Transfer Play ownership once guide truth, preview stability, or line posture stops supporting the same selected-channel launch.'
          : 'Transfer Play ownership fully to rescue when preview keeps dropping, guide confidence flickers, or line pressure makes another provider the safer owner.',
        tone: scenario === 'healthy' ? 'ready' : scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? 'watch' : 'recover',
      },
      {
        label: 'Category rescue owner',
        currentOwner: scenario === 'healthy'
          ? 'Category rescue is on standby only; it does not own the next Play unless exact-channel proof softens first.'
          : 'Category rescue owns the next surf move only while it can still preserve the same live lane more honestly than the original selected card.',
        ownershipProof: 'Rescue ownership is honest only when it keeps the same category momentum and can explain exactly what watch meaning survived the handoff.',
        transferTrigger: 'Transfer rescue ownership away once neither the exact selected card nor the same category can support an honest next Play and Live must force a fresh channel pick.',
        tone: scenario === 'healthy' ? 'ready' : 'recover',
      },
    ],
  },
]);

const buildAdapterManifest = (scenario = 'healthy') => ({
  adapterId: 'mock-xtream-codes',
  providerName: 'StreamDeck Mock Xtream Provider',
  providerType: 'Xtream Codes rehearsal adapter',
  projectStatus: 'Login + Home + Live proof scaffolded with provider-risk strips, launch scorecards, canonical provider identity, fallback ranking, fallback-equivalence truth, launch ownership, proof provenance, intent-lock continuity, explanation-boundary honesty, autonomy-boundary limits, interruption-budget discipline, retry-honesty contracts, provider-switch truth, provider-return truth, provider-stability truth, recovery-witness proof, action-gated CTAs, fallback-cost truth, provider-choice clarity, proof-debt visibility, claim-ceiling discipline, and identity-anchor continuity in the shell',
  activeScenario: scenario,
  commandCenter: {
    title: 'Shared launch ops console',
    summary: scenario === 'healthy'
      ? 'Login, Home, and Live now read from one adapter-driven operations shell so provider-risk strips, launch scorecards, canonical provider identity, fallback ranking, fallback-equivalence contracts, launch ownership, proof provenance, intent locks, explanation boundaries, autonomy limits, interruption budgets, retry contracts, provider-switch truth, provider-return truth, provider-stability truth, recovery witnesses, action gates, fallback cost, identity anchors, provider choice, recovery route, rescue receipts, and claim-ceiling truth stay aligned in-product.'
      : 'Login, Home, and Live are now driven by one adapter-fed operations shell, so degraded rehearsals keep the same provider-risk strip, launch scorecard, canonical provider owner, fallback ranking, fallback-equivalence contract, launch owner, proof source, intent lock, explanation boundary, autonomy boundary, interruption budget, retry contract, provider-switch truth, provider-return truth, provider-stability truth, recovery witness, action gate, fallback cost, identity anchor, next move, provider-choice truth, recovery route, rescue receipts, and claim ceiling instead of drifting into surface-specific copy.',
    nextMoveLabel: scenario === 'healthy' ? 'Connect -> choose honestly -> browse' : 'Keep context, then recover fast',
    failureModeLabel: scenario === 'healthy' ? 'Healthy launch rehearsal' : scenarioLabels[scenario] || 'Scenario receipt rehearsal',
  },
  sampleCredentials: {
    server: host,
    username: 'demo',
    password: 'demo',
  },
  differentiators: buildDifferentiators(),
  competitiveDifferentiators: buildCompetitiveDifferentiators(),
  supportedScreens: [
    {
      id: 'login',
      title: 'Login shell',
      status: 'ready',
      detail: 'Supports sample credentials, saved-connection switching, scenario rehearsal, provider-risk strips, and trust-led recovery into Home.',
      proof: [
        'Connect with the local mock credentials',
        'Switch scenarios without leaving the screen',
        'Provider risk strip updates before Connect overclaims launch safety',
        'Launch scorecard stays visible before Login hides whether Connect is ready, watch-only, or already recovery-led',
        'Guide freshness truth stays visible before saved-provider familiarity sounds like fully current now / next proof',
        'Canonical provider identity stays visible before trimmed URLs or relabeled saved providers pretend they are different accounts',
        'Fallback ranking stays visible before Login silently auto-picks the fastest rescue without proving it is still the best current move',
        'Fallback equivalence stays visible before a saved-provider shortcut pretends every rescue path is the same Home move',
        'Jump to the healthiest saved provider when trust degrades',
        'Launch ownership stays visible before Connect implies the current provider still owns Home',
        'Proof provenance stays visible before Login implies fresh auth is still backing Connect',
        'Login intent lock stays visible before trust noise makes setup feel like a fresh restart',
        'Login explanation boundary stays visible before degraded provider truth hides behind premium setup polish',
        'Login autonomy boundary stays visible before recovery feels like hidden automation instead of a user-owned setup choice',
        'Login interruption budget stays visible before validation delay turns into silent spinner theater',
        'Login retry contract stays visible before reconnect suggestions keep spinning after a healthier recovery path already owns the next move',
        'Login provider-switch truth stays visible before a saved-provider handoff quietly changes who owns the next Home launch',
        'Login provider-return truth stays visible before rescue holds the user longer than the original provider has earned',
        'Login provider-stability truth stays visible before one lucky refresh pretends the current provider is boringly safe again',
        'Login recovery witness stays visible before fallback asks the user to trust a provider switch on mood alone',
        'Connect action gate stays visible before the loudest CTA outruns current trust',
        'Login fallback cost stays visible before degraded recovery pretends convenience stayed fully intact',
        'Login identity anchor stays visible before recovery turns into an anonymous provider shuffle',
        'Login rescue receipt stays visible before Connect implies seamless fallback',
        'Keep the current claim ceiling honest before premium connect copy survives degraded proof',
      ],
      verificationTarget: 'Saved-provider login has to feel safe, deliberate, and one move away from Home.',
      successSignal: 'The user can connect or switch providers without asking what to do next.',
    },
    {
      id: 'home',
      title: 'Home dashboard',
      status: 'ready',
      detail: 'Shows featured live browse, provider trust cockpit, provider-risk strip, quick-launch rails, and mock-provider recovery guidance.',
      proof: [
        'Featured live card launches playback directly',
        'Provider risk strip stays aligned with hero trust and the next safe launch',
        'Launch scorecard stays visible before Home hides whether the hero is launch-ready, cache-borrowed, or already recovery-owned',
        'Guide freshness truth stays visible before cached rails or partial guide sync sound like fully current hero continuity',
        'Canonical provider identity stays visible before hero rescue reuses trust under a relabeled or host-variant provider story',
        'Fallback ranking stays visible before Home lets cinematic hero polish outrun which rescue really owns the safest next launch',
        'Fallback equivalence stays visible before hero rescue pretends every preserved rail is still the same discovery path',
        'Quick actions cover Live, Favorites, Collections, Continue, Search, and Settings',
        'Scenario toggles refresh Home in place',
        'Hero launch ownership stays visible before fallback silently takes the featured CTA',
        'Hero proof provenance stays visible before cache or rescue sounds like live provider browse proof',
        'Hero intent lock stays visible before trust drift makes the same browse story feel reset',
        'Hero explanation boundary stays visible before cached or rescue-owned browse keeps sounding fully live',
        'Hero interruption budget stays visible before refresh delay pretends the same browse story is still fully current',
        'Hero retry contract stays visible before Home keeps asking for patience after recovery already tells the safer browse story',
        'Hero provider-switch truth stays visible before featured browse ownership quietly changes providers under the same cinematic shell',
        'Hero provider-return truth stays visible before Home snaps back to the original provider without proving the same browse story survived',
        'Hero provider-stability truth stays visible before a brief calm spell pretends the hero is safely back under the current provider',
        'Hero autonomy boundary stays visible before Home quietly chooses around the user and calls it premium rescue',
        'Hero recovery witness stays visible before fallback asks the user to trust the featured launch without proof of what survived',
        'Hero action gate stays visible before cinematic browse CTA outruns current trust',
        'Hero fallback cost stays visible before preserved rails masquerade as fully live browse certainty',
        'Hero identity anchor stays visible before fallback keeps sounding like the same browse owner without proof',
        'Hero rescue receipt stays visible before fallback launch feels seamless',
        'Hero claim ceiling stays visible before cinematic browse language outruns proof',
      ],
      verificationTarget: 'Home needs to prove this is a product surface, not a provider admin screen.',
      successSignal: 'Hero context, quick rails, and trust cues stay visible together on the first paint.',
    },
    {
      id: 'live',
      title: 'Live browser',
      status: 'rehearsal-friendly',
      detail: 'Delivers category browse, provider-risk strip, inline guide, preview fallback, favorites, and healthier-provider recovery from each channel card.',
      proof: [
        'Filter by category and search without leaving the page',
        'Provider risk strip warns about auth, expiry, or line pressure before Play gets blamed',
        'Launch scorecard stays visible before preview motion hides whether Play is exact-channel ready, preview-safe only, or already rescue-led',
        'Guide freshness truth stays visible before partial guide sync or stale cards sound like fully current NOW / NEXT proof',
        'Canonical provider identity stays visible before exact-copy rescue sounds like the same source when the owner actually changed',
        'Fallback ranking stays visible before Live lets same-category rescue outrank an exact-channel save without saying why',
        'Fallback equivalence stays visible before same-category rescue pretends it preserved the exact selected channel',
        'Hover/focus updates the preview player',
        'Exact-provider fallback or same-category rescue stays on-card',
        'Selected-card launch ownership stays visible before Play silently changes hands',
        'Selected-card proof provenance stays visible before same-category rescue sounds like exact-channel proof',
        'Selected-card intent lock stays visible before guide or rescue drift makes the surf target feel reset',
        'Selected-card explanation boundary stays visible before preview mood outruns launch truth',
        'Selected-card interruption budget stays visible before preview or guide delay pretends the same Play confidence is still intact',
        'Selected-card retry contract stays visible before Live keeps nudging Play again after rescue already owns the safer launch',
        'Selected-card provider-switch truth stays visible before Play silently changes providers under the same surf card',
        'Selected-card provider-return truth stays visible before Live snaps back to the original provider without proving the same watch target survived',
        'Selected-card provider-stability truth stays visible before one steady preview moment pretends the current provider fully owns Play again',
        'Selected-card autonomy boundary stays visible before Live quietly changes launch ownership and hides the choice from the user',
        'Selected-card recovery witness stays visible before fallback asks the user to trust rescue without proof of what survived on-card',
        'Selected-card action gate stays visible before Play outruns current launch proof',
        'Selected-card fallback cost stays visible before preserved surf momentum pretends exact-launch confidence survived',
        'Selected-card identity anchor stays visible before rescue feels like the same watch target without proof',
        'Selected-card rescue receipt stays visible before fallback playback feels seamless',
        'Selected-card claim ceiling stays visible before Play sounds safer than current proof',
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
  surfaceLaunchReadinessContracts: buildSurfaceLaunchReadinessContracts(scenario),
  surfaceLaunchOwnerships: buildSurfaceLaunchOwnerships(scenario),
  surfaceContinuityWindows: buildSurfaceContinuityWindows(scenario),
  surfaceDowngradeLadders: buildSurfaceDowngradeLadders(scenario),
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
  surfaceAutonomyBoundaries: buildSurfaceAutonomyBoundaries(scenario),
  surfaceIdentityAnchors: buildSurfaceIdentityAnchors(scenario),
  surfaceConfidenceFloors: buildSurfaceConfidenceFloors(scenario),
  surfaceRecoveryWitnesses: buildSurfaceRecoveryWitnesses(scenario),
  surfaceFallbackCosts: buildSurfaceFallbackCosts(scenario),
  surfaceRescueReceipts: buildSurfaceRescueReceipts(scenario),
  surfaceProofDebts: buildSurfaceProofDebts(scenario),
  surfaceProofProvenances: buildSurfaceProofProvenances(scenario),
  surfaceClaimCeilings: buildSurfaceClaimCeilings(scenario),
  surfaceInterruptionBudgets: buildSurfaceInterruptionBudgets(scenario),
  surfaceRetryContracts: buildSurfaceRetryContracts(scenario),
  surfaceProviderSwitchContracts: buildSurfaceProviderSwitchContracts(scenario),
  surfaceProviderChoiceContracts: buildSurfaceProviderChoiceContracts(scenario),
  surfaceProviderReturnContracts: buildSurfaceProviderReturnContracts(scenario),
  surfaceProviderStabilityContracts: buildSurfaceProviderStabilityContracts(scenario),
  surfaceRecoveryPlans: buildManifestSurfaceRecoveryPlans(scenario),
  surfaceCanonicalProviderIdentityContracts: buildSurfaceCanonicalProviderIdentityContracts(scenario),
  surfaceFallbackRankingContracts: buildSurfaceFallbackRankingContracts(scenario),
  surfaceFallbackEquivalenceContracts: buildSurfaceFallbackEquivalenceContracts(scenario),
  scenarioSpotlight: {
    title: scenario === 'healthy' ? 'Healthy launch rehearsal' : scenarioLabels[scenario] || 'Scenario rehearsal',
    summary: scenario === 'healthy'
      ? 'The happy path should walk cleanly from saved-provider login into Home and then into Live without hiding what proof is fresh versus lightly borrowed, what premium language is still capped, what degraded truth must now be said explicitly, or what fallback change would need a visible rescue receipt.'
      : scenario === 'degradedLive'
        ? 'This rehearsal is about keeping Home and Login confident while Live explains degraded browse conditions, shows what changed under the hood, and avoids pretending the whole provider disappeared.'
        : scenario === 'degradedSearch'
          ? 'This rehearsal is about preserving the product shell while catalog-heavy surfaces lose depth, rescue receipts stay explicit, and recovery messaging stays specific.'
          : scenario === 'degradedEpg'
            ? 'This rehearsal is about letting guide data fail quietly while the launch path, preview flow, trust shell, and rescue receipts stay intact.'
            : scenario === 'lineSaturated'
              ? 'This rehearsal is about showing account pressure before playback gets blamed, while keeping healthier-provider recovery and its visible receipt obvious.'
              : scenario === 'expiredAccount'
                ? 'This rehearsal is about keeping the saved-provider story understandable even when fresh Xtream requests are blocked, including what changed under the hood when rescue takes over.'
                : 'This rehearsal is about holding cached context in place while auth confidence drops, borrowed proof debt stays visible, rescue receipts stay explicit, the claim ceiling stays honest, and the next move stays explicit.',
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
        'All three surfaces should keep their claim ceiling visible before premium language outruns proof.',
        'All three surfaces should keep their explanation boundary visible before degraded truth hides behind polish.',
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
    'Connect with demo/demo on http://localhost:3579',
    'Open Home and verify hero counts plus provider fact grid',
    'Open Live and confirm preview + NOW/NEXT + provider fallback actions',
    'Confirm Login, Home, and Live each publish what confidence is borrowed versus freshly proven before the next action is treated as premium',
    'Confirm Login, Home, and Live each publish what truth must be spoken plainly versus what can stay ambient before degraded states are treated as premium',
    'Confirm Login, Home, and Live each show the current claim ceiling before premium copy outruns proof',
    'Flip to a degraded scenario and confirm Login, Home, and Live refresh in place instead of blanking out',
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
        username: 'demo',
        password: 'demo',
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
