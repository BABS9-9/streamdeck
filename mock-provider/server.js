const http = require('http');
const { URL } = require('url');

const PORT = 3579;
const host = `http://localhost:${PORT}`;
const logo = (seed) => `https://picsum.photos/seed/${seed}/320/180`;
const poster = (seed) => `https://picsum.photos/seed/${seed}/420/630`;
const streamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const altStreamUrl = 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8';

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
].map(([category_id, category_name]) => ({ category_id, category_name, parent_id: 0 }));

const makeChannels = () => {
  const names = {
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

  let id = 1001;
  return liveCategories.flatMap((cat) =>
    (names[cat.category_name] || []).map((name, index) => ({
      num: id - 1000,
      name,
      stream_type: 'live',
      stream_id: id++,
      stream_icon: logo(`${cat.category_name}-${index}`),
      epg_channel_id: `${cat.category_name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      added: '1712980800',
      is_adult: '0',
      category_id: cat.category_id,
      custom_sid: '',
      tv_archive: 0,
      direct_source: index % 3 === 0 ? altStreamUrl : streamUrl,
    }))
  );
};

const liveStreams = makeChannels();

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
  stream_icon: poster(`movie-${index + 1}`),
  rating: (6.8 + (index % 4) * 0.5).toFixed(1),
  rating_5based: ((6.8 + (index % 4) * 0.5) / 2).toFixed(1),
  added: `${1712000000 + index * 86400}`,
  category_id: vodCategories[index % vodCategories.length].category_id,
  container_extension: 'm3u8',
  plot: `A polished fake VOD entry for prototype testing, centered on mock movie ${index + 1}.`,
  genre: ['Action', 'Drama', 'Comedy', 'Family', 'Sci-Fi'][index % 5],
  director: ['A. North', 'M. Rivera', 'S. Kent'][index % 3],
  direct_source: index % 2 === 0 ? streamUrl : altStreamUrl,
}));

const seriesCategories = [
  { category_id: '301', category_name: 'Drama Series' },
  { category_id: '302', category_name: 'Kids Series' },
  { category_id: '303', category_name: 'Documentary Series' },
  { category_id: '304', category_name: 'Sci-Fi Series' },
];

const series = [
  { series_id: 7001, name: 'Northern Signal', category_id: '301', cover: poster('series-1'), plot: 'A newsroom thriller set in Toronto.', cast: 'Ava Cole, Ryan Hart', genre: 'Drama', rating: '8.2' },
  { series_id: 7002, name: 'Pocket Rockets', category_id: '302', cover: poster('series-2'), plot: 'Tiny heroes with oversized missions.', cast: 'Milo, June', genre: 'Kids', rating: '7.7' },
  { series_id: 7003, name: 'Atlas Unknown', category_id: '303', cover: poster('series-3'), plot: 'Field documentaries from overlooked places.', cast: 'Nina Vale', genre: 'Documentary', rating: '8.5' },
  { series_id: 7004, name: 'Station Echo', category_id: '304', cover: poster('series-4'), plot: 'A deep-space relay station goes silent.', cast: 'Jae Kim, L. Mercer', genre: 'Sci-Fi', rating: '8.0' },
];

const getSeriesInfo = (seriesId) => {
  const selected = series.find((item) => String(item.series_id) === String(seriesId));
  if (!selected) return { info: {}, seasons: [], episodes: {} };
  const seasons = [1, 2].map((season) => ({ season_number: season, name: `Season ${season}`, air_date: `2025-0${season}-01`, episode_count: 4 }));
  const episodes = Object.fromEntries(
    seasons.map((season) => [
      season.season_number,
      Array.from({ length: 4 }, (_, index) => ({
        id: Number(`${seriesId}${season.season_number}${index + 1}`),
        episode_num: index + 1,
        title: `${selected.name} S${season.season_number}E${index + 1}`,
        plot: `Episode ${index + 1} of ${selected.name} season ${season.season_number}.`,
        info: { movie_image: selected.cover, duration_secs: 1800, container_extension: 'm3u8' },
        direct_source: index % 2 === 0 ? streamUrl : altStreamUrl,
      })),
    ])
  );
  return { info: selected, seasons, episodes };
};

const getShortEpg = (streamId) => {
  const base = Date.now();
  const titles = ['Morning Headlines', 'Live Matchday', 'Cinema Showcase', 'Kids Clubhouse', 'Music Express', 'City Update'];
  return {
    epg_listings: Array.from({ length: 4 }, (_, index) => {
      const start = new Date(base + index * 30 * 60 * 1000);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return {
        id: Number(`${streamId}${index}`),
        title: Buffer.from(titles[(Number(streamId) + index) % titles.length]).toString('base64'),
        description: Buffer.from(`Program block ${index + 1} for stream ${streamId}.`).toString('base64'),
        start: start.toISOString().replace('T', ' ').slice(0, 19),
        end: end.toISOString().replace('T', ' ').slice(0, 19),
        start_timestamp: Math.floor(start.getTime() / 1000),
        stop_timestamp: Math.floor(end.getTime() / 1000),
      };
    }),
  };
};

const authResponse = (username, password) => ({
  user_info: {
    username,
    password,
    auth: 1,
    status: 'Active',
    exp_date: `${Math.floor(Date.now() / 1000) + 86400 * 30}`,
    is_trial: '0',
    active_cons: '1',
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

  if (path === '/player_api.php') {
    if (!action) return sendJson(res, authResponse(username, password));
    if (action === 'get_live_categories') return sendJson(res, liveCategories);
    if (action === 'get_live_streams') {
      const categoryId = url.searchParams.get('category_id');
      return sendJson(res, categoryId ? liveStreams.filter((item) => item.category_id === categoryId) : liveStreams);
    }
    if (action === 'get_vod_categories') return sendJson(res, vodCategories);
    if (action === 'get_vod_streams') return sendJson(res, vodStreams);
    if (action === 'get_vod_info') {
      const vodId = url.searchParams.get('vod_id');
      const selected = vodStreams.find((item) => String(item.stream_id) === String(vodId));
      return sendJson(res, { info: selected || null, movie_data: selected || null });
    }
    if (action === 'get_series_categories') return sendJson(res, seriesCategories);
    if (action === 'get_series') return sendJson(res, series);
    if (action === 'get_series_info') return sendJson(res, getSeriesInfo(url.searchParams.get('series_id')));
    if (action === 'get_short_epg') return sendJson(res, getShortEpg(url.searchParams.get('stream_id') || '0'));
    return sendJson(res, { error: 'Unsupported action', action });
  }

  if (/^\/(movie|series)\//.test(path) || /^\/\w+\/\w+\/\d+$/.test(path)) {
    res.writeHead(302, { Location: path.includes('movie') ? streamUrl : altStreamUrl, 'Access-Control-Allow-Origin': '*' });
    return res.end();
  }

  if (path === '/' || path === '/health') return sendJson(res, { ok: true, service: 'streamdeck-mock-provider', port: PORT });

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Mock Xtream provider running at http://localhost:${PORT}`);
});
