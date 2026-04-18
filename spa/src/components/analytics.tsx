import { useEffect } from 'react';
import { useLocation } from 'react-router';

export function Analytics() {
  const location = useLocation();

  useEffect(() => {
    const env = (import.meta as any).env || {};
    const appId = env.VITE_RUM_APPLICATION_ID;
    const identityPoolId = env.VITE_RUM_IDENTITY_POOL_ID;

    if (!appId || !identityPoolId || typeof window === 'undefined') return;
    if ((window as any).awsRumInstance) return;

    import('aws-rum-web').then((pkg) => {
      const { AwsRum } = pkg.default || pkg;
      const rum = new AwsRum(appId, '1.0.0', 'us-west-2', {
        sessionSampleRate: 0.1,
        identityPoolId,
        endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
        telemetries: ['performance', 'errors', 'http'],
        allowCookies: true,
        enableXRay: false,
      } as any);
      (window as any).awsRum = rum;
      (window as any).awsRumInstance = rum;
    }).catch(() => {});
  }, []);

  useEffect(() => {
    (window as any).awsRumInstance?.recordPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
