import { SavedConnection, XtreamCredentials } from './types';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const normalizeProviderServer = (server: string) => {
  const trimmed = trimTrailingSlash(server.trim());
  try {
    const url = new URL(trimmed);
    const pathname = trimTrailingSlash(url.pathname);
    const normalizedPort =
      (url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')
        ? ''
        : url.port;
    const host = normalizedPort ? `${url.hostname.toLowerCase()}:${normalizedPort}` : url.hostname.toLowerCase();
    return `${url.protocol.toLowerCase()}//${host}${pathname}`;
  } catch {
    return trimmed.toLowerCase();
  }
};

export const normalizeProviderUsername = (username: string) => username.trim().toLowerCase();

export const buildCanonicalProviderId = (provider: Pick<XtreamCredentials, 'server' | 'username'>) =>
  `${normalizeProviderServer(provider.server)}::${normalizeProviderUsername(provider.username)}`;

export const buildLegacyProviderId = (provider: Pick<XtreamCredentials, 'server' | 'username'>) =>
  `${provider.server}-${provider.username}`;

export const getProviderIdentityCandidates = (provider: Pick<XtreamCredentials, 'server' | 'username'> & { id?: string | null }) => {
  const aliases = new Set<string>();
  const canonicalId = buildCanonicalProviderId(provider);
  aliases.add(canonicalId);
  aliases.add(buildLegacyProviderId(provider));
  aliases.add(`${provider.server.trim()}-${provider.username.trim()}`);
  if (provider.id) aliases.add(provider.id);
  return {
    canonicalId,
    aliases: [...aliases].filter(Boolean),
  };
};

export const canonicalizeSavedConnection = (connection: SavedConnection): SavedConnection => ({
  ...connection,
  id: buildCanonicalProviderId(connection),
  server: connection.server.trim(),
  username: connection.username.trim(),
  password: connection.password.trim(),
});
