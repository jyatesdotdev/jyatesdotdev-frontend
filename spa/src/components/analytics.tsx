import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Telemetry event structure matching the shape AWS RUM produces.
 */
interface TelemetryEvent {
  type: string;
  timestamp: number;
  pageId: string;
  data: Record<string, unknown>;
}

/**
 * Collects base page info for events.
 */
function getBaseEventData() {
  return {
    url: window.location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };
}

/**
 * Dispatches telemetry events to the configured endpoint.
 */
function dispatchTelemetry(events: TelemetryEvent[]) {
  const env = (import.meta as any).env || {};
  const APPLICATION_ID = env.VITE_RUM_APPLICATION_ID;
  if (!APPLICATION_ID) return;

  const endpoint = env.VITE_RUM_ENDPOINT || '/rum-telemetry';
  const payload = JSON.stringify({
    appId: APPLICATION_ID,
    region: env.VITE_RUM_REGION || 'us-east-1',
    sessionId: (window as any).__telemetrySessionId || 'local-session',
    events,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, payload);
  } else {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

/**
 * Mocks the AWS RUM recordEvent API for local use.
 */
function setupMockRum() {
  if ((window as any).awsRum) return;

  (window as any).awsRum = {
    recordEvent: (type: string, data: Record<string, unknown>) => {
      dispatchTelemetry([{
        type: `custom:${type}`,
        timestamp: Date.now(),
        pageId: window.location.pathname,
        data,
      }]);
    },
    recordError: (error: Error | string) => {
      const message = typeof error === 'string' ? error : error.message;
      dispatchTelemetry([{
        type: 'error',
        timestamp: Date.now(),
        pageId: window.location.pathname,
        data: { message, stack: (error as Error).stack },
      }]);
    }
  };
}

export function Analytics() {
  const location = useLocation();

  useEffect(() => {
    // 1. Check if we should even run (needs at least an App ID)
    const env = (import.meta as any).env || {};
    const APPLICATION_ID = env.VITE_RUM_APPLICATION_ID;
    if (!APPLICATION_ID || typeof window === 'undefined') return;

    // 2. Determine if we are in Production (AWS Credentials present) or Local (Mock)
    const identityPoolId = env.VITE_RUM_IDENTITY_POOL_ID;
    const hasIdentityPool = !!(identityPoolId && identityPoolId.length > 0 && identityPoolId !== "undefined");

    if (hasIdentityPool) {
      // Production path (real SDK)
      if (!(window as any).awsRumInstance) {
        import('aws-rum-web').then((pkg) => {
          const { AwsRum } = pkg.default || pkg;
          (window as any).awsRumInstance = new AwsRum(
            APPLICATION_ID,
            '1.0.0',
            env.VITE_RUM_REGION || 'us-east-1',
            {
              sessionSampleRate: 1,
              guestRoleArn: env.VITE_RUM_GUEST_ROLE_ARN || '',
              identityPoolId: identityPoolId || '',
              endpoint: env.VITE_RUM_ENDPOINT || 'https://dataplane.rum.us-east-1.amazonaws.com',
              telemetries: ['performance', 'errors', 'http'],
              allowCookies: true,
              enableXRay: false,
            } as any
          );
        });
      }
    } else {
      // Local path (Mock SDK)
      if (!(window as any).__telemetrySessionId) {
        (window as any).__telemetrySessionId = crypto.randomUUID();
        setupMockRum();

        // Global error tracking (only setup once)
        const errorHandler = (event: ErrorEvent) => {
          (window as any).awsRum?.recordError(event.error || event.message);
        };
        const rejectionHandler = (event: PromiseRejectionEvent) => {
          (window as any).awsRum?.recordError(`Unhandled Rejection: ${event.reason}`);
        };

        window.addEventListener('error', errorHandler);
        window.addEventListener('unhandledrejection', rejectionHandler);
      }

      // Track the page view for the current location
      dispatchTelemetry([{
        type: 'page_view',
        timestamp: Date.now(),
        pageId: location.pathname,
        data: getBaseEventData(),
      }]);

      // If it's the initial load, also capture performance metrics
      if (document.readyState === 'complete') {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
          const nav = navEntries[0] as PerformanceNavigationTiming;
          dispatchTelemetry([{
            type: 'performance',
            timestamp: Date.now(),
            pageId: location.pathname,
            data: {
              domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
              loadEvent: nav.loadEventEnd - nav.startTime,
              ttfb: nav.responseStart - nav.requestStart,
            },
          }]);
        }
      }
    }
  }, [location.pathname]); // Trigger on every route change

  return null;
}
