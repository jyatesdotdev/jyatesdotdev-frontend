import { useEffect } from 'react';
import { useLocation } from 'react-router';

interface RumLike {
  recordPageView(path: string): void;
  recordEvent(type: string, data: Record<string, unknown>): void;
  recordError(error: Error): void;
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

  recordError(error: Error) {
    this.push({ type: 'error', data: { message: error.message, stack: error.stack }, pageId: this.currentPage });
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
    const env = (import.meta as any).env || {};
    const appId = env.VITE_RUM_APPLICATION_ID;
    const identityPoolId = env.VITE_RUM_IDENTITY_POOL_ID;
    const localEndpoint = env.VITE_RUM_ENDPOINT;

    if (!appId || typeof window === 'undefined') return;
    if ((window as any).awsRumInstance) return;

    if (identityPoolId) {
      // Production: use real AWS RUM SDK
      import('aws-rum-web').then((pkg) => {
        const { AwsRum } = pkg.default || pkg;
        const rum = new AwsRum(appId, '1.0.0', 'us-west-2', {
          sessionSampleRate: 1,
          identityPoolId,
          endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
          telemetries: ['performance', 'errors', 'http'],
          allowCookies: true,
          enableXRay: false,
        } as any);
        (window as any).awsRum = rum;
        (window as any).awsRumInstance = rum;
      }).catch(() => {});
    } else if (localEndpoint) {
      // Local dev: lightweight mock that posts to a local endpoint
      const rum = new LocalRum(appId, localEndpoint);
      (window as any).awsRum = rum;
      (window as any).awsRumInstance = rum;
    }
  }, []);

  useEffect(() => {
    (window as any).awsRumInstance?.recordPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
