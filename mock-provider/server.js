const http = require('http');
const { URL } = require('url');

const PORT = 3579;
const host = `http://localhost:${PORT}`;
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
  releasedate: `202${index % 6}-0${(index % 8) + 1}-1${index % 9}`,
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
  { series_id: 7001, name: 'Northern Signal', category_id: '301', cover: poster('series-1', 'Northern Signal'), backdrop_path: [hero('series-1-hero', 'Northern Signal')], plot: 'A newsroom thriller set in Toronto.', cast: 'Ava Cole, Ryan Hart', genre: 'Drama', rating: '8.2' },
  { series_id: 7002, name: 'Pocket Rockets', category_id: '302', cover: poster('series-2', 'Pocket Rockets'), backdrop_path: [hero('series-2-hero', 'Pocket Rockets')], plot: 'Tiny heroes with oversized missions.', cast: 'Milo, June', genre: 'Kids', rating: '7.7' },
  { series_id: 7003, name: 'Atlas Unknown', category_id: '303', cover: poster('series-3', 'Atlas Unknown'), backdrop_path: [hero('series-3-hero', 'Atlas Unknown')], plot: 'Field documentaries from overlooked places.', cast: 'Nina Vale', genre: 'Documentary', rating: '8.5' },
  { series_id: 7004, name: 'Station Echo', category_id: '304', cover: poster('series-4', 'Station Echo'), backdrop_path: [hero('series-4-hero', 'Station Echo')], plot: 'A deep-space relay station goes silent.', cast: 'Jae Kim, L. Mercer', genre: 'Sci-Fi', rating: '8.0' },
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
  const categoryId = url.searchParams.get('category_id');

  if (path === '/player_api.php') {
    if (!action) return sendJson(res, authResponse(username, password));
    if (action === 'get_live_categories') return sendJson(res, liveCategories);
    if (action === 'get_live_streams') return sendJson(res, filterByCategory(liveStreams, categoryId));
    if (action === 'get_vod_categories') return sendJson(res, vodCategories);
    if (action === 'get_vod_streams') return sendJson(res, filterByCategory(vodStreams, categoryId));
    if (action === 'get_vod_info') {
      const vodId = url.searchParams.get('vod_id');
      const selected = vodStreams.find((item) => String(item.stream_id) === String(vodId));
      return sendJson(res, { info: selected || null, movie_data: selected || null });
    }
    if (action === 'get_series_categories') return sendJson(res, seriesCategories);
    if (action === 'get_series') return sendJson(res, filterByCategory(series, categoryId));
    if (action === 'get_series_info') return sendJson(res, getSeriesInfo(url.searchParams.get('series_id')));
    if (action === 'get_short_epg') return sendJson(res, getShortEpg(url.searchParams.get('stream_id') || '0'));
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
        streamFormats: ['m3u8'],
      },
      topCategories: liveCategories.map((category) => ({
        id: category.category_id,
        name: category.category_name,
        channels: liveStreams.filter((stream) => stream.category_id === category.category_id).length,
      })),
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
