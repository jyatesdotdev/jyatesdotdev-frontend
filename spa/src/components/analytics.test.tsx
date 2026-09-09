import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AwsRum } from 'aws-rum-web';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Analytics } from './analytics';

const appId = '11111111-1111-4111-8111-111111111111';
const identityPoolId = `us-west-2:${appId}`;
const originalBeacon = Object.getOwnPropertyDescriptor(navigator, 'sendBeacon');

async function productionClient() {
  await waitFor(() => expect(window.awsRum).toBeInstanceOf(AwsRum));
  return window.awsRum as AwsRum;
}

beforeEach(() => {
  delete window.awsRum;
  delete window.awsRumInstance;
  sessionStorage.clear();
  vi.stubEnv('VITE_RUM_APPLICATION_ID', appId);
  vi.stubEnv('VITE_RUM_IDENTITY_POOL_ID', identityPoolId);
  vi.stubEnv('VITE_RUM_ENDPOINT', '');
  // Exercise the installed SDK, including Cognito initialization, without AWS traffic.
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    IdentityId: identityPoolId,
    Credentials: {
      AccessKeyId: 'test',
      SecretKey: 'test',
      SessionToken: 'test',
      Expiration: Math.floor(Date.now() / 1000) + 3600,
    },
  }), { headers: { 'Content-Type': 'application/json' } })));
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: vi.fn(() => true),
  });
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {
    throw new Error('Unexpected XMLHttpRequest in offline analytics test');
  });
});

afterEach(() => {
  cleanup();
  const client = window.awsRum as AwsRum | undefined;
  client?.disable();
  client?.clearCookies();
  delete window.awsRum;
  delete window.awsRumInstance;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (originalBeacon) Object.defineProperty(navigator, 'sendBeacon', originalBeacon);
  else Reflect.deleteProperty(navigator, 'sendBeacon');
});

describe('Analytics production SDK', () => {
  it('loads the real SDK without enabling replay or changing transport and session settings', async () => {
    render(<MemoryRouter><Analytics /></MemoryRouter>);
    const client = await productionClient();

    expect(window.awsRumInstance).toBe(client);
    // Inspect resolved SDK state, not just constructor arguments: defaults changed in v3.
    expect(client).toMatchObject({
      applicationId: appId,
      config: {
        identityPoolId,
        endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
        signing: true,
        sessionSampleRate: 1,
        sessionLengthSeconds: 1800,
        telemetries: ['performance', 'errors', 'http'],
        compressionStrategy: { enabled: false },
        allowCookies: true,
        cookieAttributes: { sameSite: 'Strict', secure: true, path: '/' },
        enableXRay: false,
        eventPluginsToLoad: [],
      },
    });
    expect(Reflect.get(client, 'pluginManager').hasPlugin('rrweb')).toBe(false);
    expect(client.getSessionId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(client.getUserId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('records custom events, errors and route changes through the installed SDK', async () => {
    let navigate: ReturnType<typeof useNavigate>;
    function TestApp() {
      navigate = useNavigate();
      return <Analytics />;
    }
    render(<MemoryRouter><TestApp /></MemoryRouter>);
    const client = await productionClient();
    const cache = Reflect.get(client, 'eventCache');
    const recordPageView = vi.spyOn(client, 'recordPageView');

    client.recordEvent('like_toggled', { slug: 'an-introduction', liked: true });
    client.recordError(new Error('offline error test'));
    await act(async () => { await navigate('/blog/an-introduction'); });

    const events = (cache.getEventBatch() as Array<{ type: string; details: string }>)
      .map(({ type, details }) => ({ type, details: JSON.parse(details) }));
    expect(events).toEqual(expect.arrayContaining([
      { type: 'like_toggled', details: { slug: 'an-introduction', liked: true } },
      {
        type: 'com.amazon.rum.js_error_event',
        details: expect.objectContaining({ message: 'offline error test' }),
      },
    ]));
    expect(recordPageView).toHaveBeenCalledWith('/blog/an-introduction');
    expect(window.awsRum).toBe(client);
  });
});
