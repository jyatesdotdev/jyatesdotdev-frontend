import { defineConfig } from 'vitest/config'
import { reactRouter } from "@react-router/dev/vite"
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'

function mockRumTelemetryPlugin() {
  return {
    name: 'mock-rum-telemetry',
    configureServer(server: any) {
      server.middlewares.use('/rum-telemetry', (req: any, res: any, next: any) => {
        if (req.method === 'POST' || req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            return res.end();
          }

          let body = '';
          req.on('data', (chunk: any) => body += chunk.toString());
          req.on('end', () => {
            console.log('\n📊 [AWS RUM] Telemetry metrics captured locally:');
            try {
              const data = JSON.parse(body);
              if (data.events && data.events.length) {
                console.log(`Received ${data.events.length} metrics events (PageId: ${data.events[0].pageId})`);
                // Uncomment to see full payload:
                // console.log(JSON.stringify(data, null, 2));
              }
            } catch (e) {
              console.log('Raw Payload:', body);
            }
            res.statusCode = 200;
            res.end();
          });
        } else {
          next();
        }
      });
    }
  };
}


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm, remarkFrontmatter, [remarkMdxFrontmatter, { name: 'metadata' }]],
    }),
    process.env.VITEST ? react() : reactRouter(), 
    tailwindcss(),
    mockRumTelemetryPlugin(),
  ],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
  },
})
