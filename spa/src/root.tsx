import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { HelmetProvider } from "react-helmet-async";
import type { Route } from "./+types/root";
import { Navbar } from "./components/nav";
import Footer from "./components/footer";
import { ThemeProvider } from "./components/theme-provider";
import { Analytics } from "./components/analytics";
import { SWRConfig } from "swr";

import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-mono/400.css";
import "./index.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        <HelmetProvider>
          {children}
        </HelmetProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="jyates-theme">
      <SWRConfig value={{
        onError: (error: Error, key: string) => {
          (window as any).awsRum?.recordError(
            error instanceof Error ? error : new Error(`SWR fetch failed: ${key}`)
          );
        },
      }}>
          <div 
            data-testid="app-container" 
            className="font-sans antialiased text-black bg-white dark:text-white dark:bg-black min-h-screen flex flex-col"
          >
            <main className="flex-auto min-w-0 mt-6 flex flex-col px-4 md:px-0 max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto w-full">
              <Navbar />
              <Outlet />
              <Footer />
            </main>
            <Analytics />
          </div>
      </SWRConfig>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    // Report rendering crashes to telemetry
    (window as any).awsRum?.recordError(error);
    if (import.meta.env.DEV) {
      details = error.message;
    }
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
    </main>
  );
}
