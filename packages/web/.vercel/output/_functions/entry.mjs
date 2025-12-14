import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_BgtVFCzT.mjs';
import { manifest } from './manifest_ChcGQk7t.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/auth/check.astro.mjs');
const _page2 = () => import('./pages/api/auth/login.astro.mjs');
const _page3 = () => import('./pages/api/auth/logout.astro.mjs');
const _page4 = () => import('./pages/api/auth/me.astro.mjs');
const _page5 = () => import('./pages/api/auth/refresh.astro.mjs');
const _page6 = () => import('./pages/api/auth/setup.astro.mjs');
const _page7 = () => import('./pages/api/auth/status.astro.mjs');
const _page8 = () => import('./pages/api/dashboard/metrics.astro.mjs');
const _page9 = () => import('./pages/api/dashboard/stats.astro.mjs');
const _page10 = () => import('./pages/api/workers/status.astro.mjs');
const _page11 = () => import('./pages/api/workers/_id_/metrics/latest.astro.mjs');
const _page12 = () => import('./pages/api/workers/_id_/metrics.astro.mjs');
const _page13 = () => import('./pages/api/workers/_id_/start.astro.mjs');
const _page14 = () => import('./pages/api/workers/_id_/stop.astro.mjs');
const _page15 = () => import('./pages/api/workers/_id_/token.astro.mjs');
const _page16 = () => import('./pages/api/workers/_id_.astro.mjs');
const _page17 = () => import('./pages/api/workers.astro.mjs');
const _page18 = () => import('./pages/connect.astro.mjs');
const _page19 = () => import('./pages/dashboard.astro.mjs');
const _page20 = () => import('./pages/login.astro.mjs');
const _page21 = () => import('./pages/setup.astro.mjs');
const _page22 = () => import('./pages/workers/new.astro.mjs');
const _page23 = () => import('./pages/workers/_id_.astro.mjs');
const _page24 = () => import('./pages/workers.astro.mjs');
const _page25 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["../../node_modules/.pnpm/astro@5.16.0_@types+node@24.10.1_@vercel+functions@2.2.13_jiti@2.6.1_lightningcss@1.30._e0aae9301e195c8a8f54d1d33e1dc851/node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/auth/check.ts", _page1],
    ["src/pages/api/auth/login.ts", _page2],
    ["src/pages/api/auth/logout.ts", _page3],
    ["src/pages/api/auth/me.ts", _page4],
    ["src/pages/api/auth/refresh.ts", _page5],
    ["src/pages/api/auth/setup.ts", _page6],
    ["src/pages/api/auth/status.ts", _page7],
    ["src/pages/api/dashboard/metrics.ts", _page8],
    ["src/pages/api/dashboard/stats.ts", _page9],
    ["src/pages/api/workers/status.ts", _page10],
    ["src/pages/api/workers/[id]/metrics/latest.ts", _page11],
    ["src/pages/api/workers/[id]/metrics/index.ts", _page12],
    ["src/pages/api/workers/[id]/start.ts", _page13],
    ["src/pages/api/workers/[id]/stop.ts", _page14],
    ["src/pages/api/workers/[id]/token.ts", _page15],
    ["src/pages/api/workers/[id].ts", _page16],
    ["src/pages/api/workers/index.ts", _page17],
    ["src/pages/connect.astro", _page18],
    ["src/pages/dashboard.astro", _page19],
    ["src/pages/login.astro", _page20],
    ["src/pages/setup.astro", _page21],
    ["src/pages/workers/new.astro", _page22],
    ["src/pages/workers/[id].astro", _page23],
    ["src/pages/workers.astro", _page24],
    ["src/pages/index.astro", _page25]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "e6403b32-0b4c-44dd-8349-88986d242f45",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
