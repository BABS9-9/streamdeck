import { MockProviderHealth, XtreamCredentials } from './types';

const MOCK_HOST = 'http://localhost:3579';

export const isMockProviderServer = (server?: string | null) => {
  if (!server) return false;
  try {
    const url = new URL(server);
    return url.origin === MOCK_HOST;
  } catch {
    return false;
  }
};

export async function fetchMockProviderHealth(serverOrCredentials?: string | XtreamCredentials | null) {
  const server = typeof serverOrCredentials === 'string'
    ? serverOrCredentials
    : serverOrCredentials?.server;

  if (!isMockProviderServer(server)) return null;

  const response = await fetch(`${MOCK_HOST}/health`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Mock provider health failed: ${response.status}`);
  }

  return response.json() as Promise<MockProviderHealth>;
}
