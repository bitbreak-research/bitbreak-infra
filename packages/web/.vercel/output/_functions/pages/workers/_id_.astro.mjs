import { e as createComponent$1, f as createAstro, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_HrKuE-E2.mjs';
import { $ as $$DashboardLayout, A as AuthGuard } from '../../chunks/DashboardLayout_Cxi79TD7.mjs';
import { ssr, ssrHydrationKey, escape, createComponent, ssrAttribute } from 'solid-js/web';
import { createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { $ as $authState } from '../../chunks/auth_Bu6R9w5K.mjs';
import { g as getWorker, a as getWorkerMetrics } from '../../chunks/workers_DBjwXdAk.mjs';
export { renderers } from '../../renderers.mjs';

var _tmpl$ = ["<div", ' class="animate-pulse space-y-6"><div class="h-8 bg-[var(--color-gray-200)] rounded w-1/3"></div><div class="card p-6"><div class="h-32 bg-[var(--color-gray-100)] rounded"></div></div></div>'], _tmpl$2 = ["<div", ' class="card p-6 bg-red-50 border-red-200"><p class="text-red-600">', "</p></div>"], _tmpl$3 = ["<button", ' class="btn btn-primary"', ">Start Engine</button>"], _tmpl$4 = ["<button", ' class="btn btn-secondary"', ">Stop Engine</button>"], _tmpl$5 = ["<div", ' class="h-48 relative">', "</div>"], _tmpl$6 = ["<div", ' class="space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-semibold text-[var(--color-gray-900)]">', '</h1><div class="flex items-center gap-3 mt-2"><span class="', '"></span><span class="text-sm text-[var(--color-gray-500)]">', '</span><span class="text-sm text-[var(--color-gray-400)]">|</span><span class="text-xs font-mono text-[var(--color-gray-400)]">', '</span></div></div><div class="flex items-center gap-3">', '</div></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div class="stat-card"><div class="stat-value"><!--$-->', '<!--/-->%</div><div class="stat-label">CPU Usage</div></div><div class="stat-card"><div class="stat-value"><!--$-->', '<!--/--><span class="text-lg font-normal text-[var(--color-gray-500)]">GB</span></div><div class="stat-label">Memory Usage</div></div><div class="stat-card"><div class="stat-value">', '</div><div class="stat-label">Keys/min</div></div><div class="stat-card"><div class="stat-value">', '</div><div class="stat-label">Token Expires</div></div></div><div class="card p-6"><h2 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Performance History</h2><!--$-->', '<!--/--></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="card p-6"><h2 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Machine Details</h2><dl class="space-y-4"><div class="flex justify-between"><dt class="text-sm text-[var(--color-gray-500)]">Status</dt><dd class="text-sm font-medium text-[var(--color-gray-900)]"><span class="', '">', '</span></dd></div><div class="flex justify-between"><dt class="text-sm text-[var(--color-gray-500)]">Created</dt><dd class="text-sm font-medium text-[var(--color-gray-900)]">', '</dd></div><div class="flex justify-between"><dt class="text-sm text-[var(--color-gray-500)]">Last IP</dt><dd class="text-sm font-mono text-[var(--color-gray-900)]">', '</dd></div><div class="flex justify-between"><dt class="text-sm text-[var(--color-gray-500)]">Token Expires</dt><dd class="text-sm font-medium text-[var(--color-gray-900)]">', '</dd></div></dl></div><div class="card p-6"><h2 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Actions</h2><div class="space-y-3"><button class="btn btn-secondary w-full justify-start"', '><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>Regenerate Token</button><button class="btn btn-danger w-full justify-start"', '><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete Machine</button></div></div></div></div>'], _tmpl$7 = ["<div", "><!--$-->", "<!--/--><!--$-->", "<!--/--><!--$-->", "<!--/--></div>"], _tmpl$8 = ["<div", ' class="h-48 flex items-center justify-center text-[var(--color-gray-500)]">No metrics data available</div>'], _tmpl$9 = ["<svg", ' viewBox="', '" class="w-full h-full"><!--$-->', "<!--/--><path", ' fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path', ' fill="none" stroke="var(--color-gray-400)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4"></path><g transform="', '"><circle cx="0" cy="0" r="4" fill="var(--color-primary)"></circle><text x="10" y="4" class="text-xs fill-[var(--color-gray-600)]">CPU</text><circle cx="60" cy="0" r="4" fill="var(--color-gray-400)"></circle><text x="70" y="4" class="text-xs fill-[var(--color-gray-600)]">Rate</text></g></svg>'], _tmpl$0 = ["<line", ' stroke="var(--color-gray-200)" stroke-dasharray="4"></line>'], _tmpl$1 = ["<text", ' text-anchor="end" class="text-xs fill-[var(--color-gray-400)]"><!--$-->', "<!--/-->%</text>"];
function WorkerDetail(props) {
  const authState = useStore($authState);
  const [worker, setWorker] = createSignal(null);
  const [metrics, setMetrics] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const fetchData = async () => {
    if (!authState().isAuthenticated) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    const [workerResult, metricsResult] = await Promise.all([getWorker(props.workerId), getWorkerMetrics(props.workerId, {
      limit: 60
    })]);
    if (workerResult.success && workerResult.data) {
      setWorker(workerResult.data);
    } else {
      setError(workerResult.error?.message || "Failed to load worker");
    }
    if (metricsResult.success && metricsResult.data) {
      setMetrics(metricsResult.data);
    }
    setLoading(false);
  };
  const latestMetric = createMemo(() => {
    const m = metrics();
    return m?.metrics[0] || null;
  });
  const formatDate = (dateString) => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleString();
  };
  const formatExpiresAt = (dateString) => {
    const date = new Date(dateString);
    const now = /* @__PURE__ */ new Date();
    const daysUntilExpiry = Math.ceil((date.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return "Expired";
    if (daysUntilExpiry < 7) return `${daysUntilExpiry} days`;
    return `${daysUntilExpiry} days`;
  };
  onMount(() => {
    fetchData();
    const interval = setInterval(fetchData, 5e3);
    return () => clearInterval(interval);
  });
  return ssr(_tmpl$7, ssrHydrationKey(), escape(createComponent(Show, {
    get when() {
      return loading();
    },
    get children() {
      return ssr(_tmpl$, ssrHydrationKey());
    }
  })), escape(createComponent(Show, {
    get when() {
      return error();
    },
    get children() {
      return ssr(_tmpl$2, ssrHydrationKey(), escape(error()));
    }
  })), escape(createComponent(Show, {
    get when() {
      return !loading() && worker();
    },
    get children() {
      return ssr(_tmpl$6, ssrHydrationKey(), escape(worker().name), `status-dot ${worker().is_connected ? "online" : "offline"}`, worker().is_connected ? "Connected" : "Disconnected", escape(props.workerId), escape(createComponent(Show, {
        get when() {
          return worker().is_connected;
        },
        get children() {
          return [ssr(_tmpl$3, ssrHydrationKey(), ssrAttribute("disabled", actionLoading(), true)), ssr(_tmpl$4, ssrHydrationKey(), ssrAttribute("disabled", actionLoading(), true))];
        }
      })), escape(latestMetric()?.cpu) ?? "--", latestMetric()?.memory ? `${escape((latestMetric().memory / 1024).toFixed(1))}` : "--", escape(latestMetric()?.rate) ?? "--", escape(formatExpiresAt(worker().token_expires_at)), escape(createComponent(Show, {
        get when() {
          return metrics()?.metrics.length;
        },
        get fallback() {
          return ssr(_tmpl$8, ssrHydrationKey());
        },
        get children() {
          return ssr(_tmpl$5, ssrHydrationKey(), escape(createComponent(MetricsChart, {
            get metrics() {
              return metrics().metrics;
            }
          })));
        }
      })), `badge ${worker().status === "active" ? "badge-success" : "badge-error"}`, escape(worker().status), escape(formatDate(worker().created_at)), escape(worker().last_ip) || "--", escape(formatDate(worker().token_expires_at)), ssrAttribute("disabled", actionLoading(), true), ssrAttribute("disabled", actionLoading(), true));
    }
  })));
}
function MetricsChart(props) {
  const chartWidth = 800;
  const chartHeight = 180;
  const padding = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 50
  };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const sortedMetrics = () => [...props.metrics].reverse();
  const cpuPath = createMemo(() => {
    const data = sortedMetrics();
    if (data.length < 2) return "";
    const xScale = innerWidth / (data.length - 1);
    const yScale = innerHeight / 100;
    return data.map((d, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + innerHeight - d.cpu * yScale;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  });
  const ratePath = createMemo(() => {
    const data = sortedMetrics();
    if (data.length < 2) return "";
    const maxRate = Math.max(...data.map((d) => d.rate), 100);
    const xScale = innerWidth / (data.length - 1);
    const yScale = innerHeight / maxRate;
    return data.map((d, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + innerHeight - d.rate * yScale;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  });
  return ssr(_tmpl$9, ssrHydrationKey(), `0 0 ${escape(chartWidth, true)} ${escape(chartHeight, true)}`, escape(createComponent(For, {
    each: [0, 25, 50, 75, 100],
    children: (tick) => {
      const y = padding.top + innerHeight - tick / 100 * innerHeight;
      return [ssr(_tmpl$0, ssrHydrationKey() + ssrAttribute("x1", escape(padding.left, true), false) + ssrAttribute("y1", escape(y, true), false) + ssrAttribute("x2", escape(chartWidth, true) - escape(padding.right, true), false) + ssrAttribute("y2", escape(y, true), false)), ssr(_tmpl$1, ssrHydrationKey() + ssrAttribute("x", escape(padding.left, true) - 10, false) + ssrAttribute("y", escape(y, true) + 4, false), escape(tick))];
    }
  })), ssrAttribute("d", escape(cpuPath(), true), false), ssrAttribute("d", escape(ratePath(), true), false), `translate(${escape(padding.left, true)}, ${escape(chartHeight, true) - 8})`);
}

const $$Astro = createAstro();
const prerender = false;
const $$id = createComponent$1(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Machine Details", "currentPath": "/workers" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AuthGuard", AuthGuard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/auth/components/AuthGuard", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate`  ${maybeRenderHead()}<a href="/workers" class="inline-flex items-center gap-2 text-sm text-[var(--color-gray-500)] hover:text-[var(--color-gray-900)] mb-6"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <line x1="19" y1="12" x2="5" y2="12"></line> <polyline points="12 19 5 12 12 5"></polyline> </svg>
Back to Machines
</a> ${renderComponent($$result3, "WorkerDetail", WorkerDetail, { "client:load": true, "workerId": id, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/workers/components/WorkerDetail", "client:component-export": "default" })} ` })} ` })}`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/workers/[id].astro", void 0);

const $$file = "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/workers/[id].astro";
const $$url = "/workers/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
