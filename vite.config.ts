import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

/**
 * Ветка tools/catalog-import: локальная админка ходит в прод через прокси дев-сервера
 * (VITE_API_BASE_URL=/prod-api, IMPORT_PROXY_TARGET=https://<api>). Сессионную cookie прод ставит
 * с Domain/Secure/SameSite=None — переписываем, чтобы браузер принял её на http://localhost.
 * CORS прода при этом не трогаем: для браузера запросы same-origin.
 */
const rewriteCookie = (cookie: string) =>
  cookie
    .split(';')
    .map((part) => part.trim())
    .filter((part) => !/^(domain|secure)(=|$)/i.test(part))
    .map((part) => (/^samesite=/i.test(part) ? 'SameSite=Lax' : part))
    .join('; ');

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const importProxyTarget = loadEnv(mode, process.cwd(), '').IMPORT_PROXY_TARGET;

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: importProxyTarget
      ? {
          proxy: {
            '/prod-api': {
              target: importProxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/prod-api/, ''),
              configure: (proxy) => {
                proxy.on('proxyRes', (proxyRes) => {
                  const cookies = proxyRes.headers['set-cookie'];
                  if (cookies) proxyRes.headers['set-cookie'] = cookies.map(rewriteCookie);
                });
              },
            },
          },
        }
      : undefined,
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) {
              return 'antd';
            }
            // Редактор HTML-описаний нужен только в модалках каталога/продавца.
            if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
              return 'tiptap';
            }
          },
        },
      },
    },
  };
});
