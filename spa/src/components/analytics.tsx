import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { api } from '../api';

const VISIT_BEACON_KEY = 'jyatesdotdev-visit-recorded';

interface RumLike {
  recordPageView(path: string): void;
  recordEvent(type: string, data: Record<string, unknown>): void;
  recordError(error: unknown): void;
}

declare global {
  interface Window {
    /** RUM client for app code to record custom events/errors (AwsRum in prod, LocalRum in dev). */
    awsRum?: RumLike;
    /** Init guard + page-view recorder; same instance as awsRum. */
    awsRumInstance?: RumLike;
  }
}

class LocalRum implements RumLike {
  private appId: string;
  private endpoint: string;
  private buffer: Array<{ type: string; data?: unknown; pageId?: string; timestamp: number }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentPage = '/';

  constructor(appId: string, endpoint: string) {
    this.appId = appId;
    this.endpoint = endpoint;
    this.setupVisibilityFlush();
  }

  recordPageView(path: string) {
    this.currentPage = path;
    this.push({ type: 'page_view', data: { path }, pageId: path });
  }

  recordEvent(type: string, data: Record<string, unknown>) {
    this.push({ type: `custom:${type}`, data, pageId: this.currentPage });
  }

  recordError(error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.push({ type: 'error', data: { message: err.message, stack: err.stack }, pageId: this.currentPage });
  }

  private push(event: { type: string; data?: unknown; pageId?: string }) {
    this.buffer.push({ ...event, timestamp: Date.now() });
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flush(), 1000);
  }

  private setupVisibilityFlush() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  private flush() {
    this.flushTimer = null;
    if (this.buffer.length === 0) return;
    const events = this.buffer.splice(0);
    const body = JSON.stringify({ appId: this.appId, events });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, body);
    } else {
      fetch(this.endpoint, { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  }
}

export function Analytics() {
  const location = useLocation();

  useEffect(() => {
    const env = import.meta.env || {};
    const appId = env.VITE_RUM_APPLICATION_ID;
    const identityPoolId = env.VITE_RUM_IDENTITY_POOL_ID;
    const localEndpoint = env.VITE_RUM_ENDPOINT;

    if (!appId || typeof window === 'undefined') return;
    if (window.awsRumInstance) return;

    if (identityPoolId) {
      // Production: use real AWS RUM SDK (guard against CJS/ESM default-export interop)
      import('aws-rum-web').then((pkg) => {
        const AwsRum =
          (pkg as typeof pkg & { default?: typeof pkg }).default?.AwsRum ?? pkg.AwsRum;
        const rum = new AwsRum(appId, '1.0.0', 'us-west-2', {
          sessionSampleRate: 1,
          identityPoolId,
          endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
          telemetries: ['performance', 'errors', 'http'],
          allowCookies: true,
          enableXRay: false,
        });
        window.awsRum = rum;
        window.awsRumInstance = rum;
      }).catch(() => {});
    } else if (localEndpoint) {
      // Local dev: lightweight mock that posts to a local endpoint
      const rum = new LocalRum(appId, localEndpoint);
      window.awsRum = rum;
      window.awsRumInstance = rum;
    }
  }, []);

  useEffect(() => {
    window.awsRumInstance?.recordPageView(location.pathname);
  }, [location.pathname]);

  // Record one geo hit per browser session for the visitor map. The backend
  // derives the country from CloudFront edge headers (no-op without them) and
  // rate-limits per IP, so this is a fire-and-forget beacon.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(VISIT_BEACON_KEY)) return;
      sessionStorage.setItem(VISIT_BEACON_KEY, '1');
    } catch {
      // sessionStorage unavailable (private mode) — fall through and still beacon once
    }
    api.visits.record().catch(() => {});
  }, []);

  return null;
}
