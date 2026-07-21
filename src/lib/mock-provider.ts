import { storage } from './storage';
import { MockProviderHealth, MockProviderManifest, MockProviderScenario, XtreamCredentials } from './types';

const MOCK_HOST = 'http://localhost:3579';
const EVENT_NAME = 'streamdeck:mock-scenario-change';

export const isMockProviderServer = (server?: string | null) => {
  if (!server) return false;
  try {
    const url = new URL(server);
    return url.origin === MOCK_HOST;
  } catch {
    return false;
  }
};

export const getSelectedMockProviderScenario = () => storage.getMockScenario();

export const setSelectedMockProviderScenario = (scenario: MockProviderScenario) => {
  storage.saveMockScenario(scenario);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: scenario }));
  }
};

export const subscribeToMockProviderScenario = (callback: (scenario: MockProviderScenario) => void) => {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<MockProviderScenario>;
    callback(customEvent.detail || getSelectedMockProviderScenario());
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
};

export async function fetchMockProviderHealth(
  serverOrCredentials?: string | XtreamCredentials | null,
  scenario?: MockProviderScenario
) {
  const server = typeof serverOrCredentials === 'string'
    ? serverOrCredentials
    : serverOrCredentials?.server;

  if (!isMockProviderServer(server)) return null;

  const activeScenario = scenario || getSelectedMockProviderScenario();
  const healthUrl = new URL('/health', MOCK_HOST);
  if (activeScenario !== 'healthy') healthUrl.searchParams.set('scenario', activeScenario);

  const response = await fetch(healthUrl.toString(), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Mock provider health failed: ${response.status}`);
  }

  return response.json() as Promise<MockProviderHealth>;
}

export async function fetchMockProviderManifest(
  serverOrCredentials?: string | XtreamCredentials | null,
  scenario?: MockProviderScenario
) {
  const server = typeof serverOrCredentials === 'string'
    ? serverOrCredentials
    : serverOrCredentials?.server;

  if (!isMockProviderServer(server)) return null;

  const activeScenario = scenario || getSelectedMockProviderScenario();
  const manifestUrl = new URL('/adapter/manifest', MOCK_HOST);
  if (activeScenario !== 'healthy') manifestUrl.searchParams.set('scenario', activeScenario);

  const response = await fetch(manifestUrl.toString(), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Mock provider manifest failed: ${response.status}`);
  }

  return response.json() as Promise<MockProviderManifest>;
}
