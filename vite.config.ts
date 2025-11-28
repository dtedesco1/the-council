/**
 * Vite Configuration
 *
 * Includes proxy configuration for API endpoints to avoid CORS issues.
 * The proxies forward requests from /api/* to the actual API endpoints.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      /**
       * Anthropic API Proxy
       *
       * Anthropic's API requires the 'anthropic-dangerous-direct-browser-access' header
       * for browser requests. Even through a proxy, this header should be passed through.
       * The proxy handles CORS by making the request appear same-origin to the browser.
       */
      '/api/anthropic': {
        target: 'https://api.anthropic.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        secure: true,
        // Configure to handle headers properly
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Log for debugging
            console.log(`[Proxy] Anthropic request: ${req.method} ${req.url}`);
          });
          proxy.on('error', (err, req) => {
            console.error(`[Proxy] Anthropic error:`, err.message);
          });
        }
      },
      // OpenAI API Proxy
      '/api/openai': {
        target: 'https://api.openai.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        secure: true,
      },
      // xAI (Grok) API Proxy
      '/api/xai': {
        target: 'https://api.x.ai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xai/, ''),
        secure: true,
      }
    }
  }
});