import { e as createComponent$1, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_HrKuE-E2.mjs';
import { $ as $$DashboardLayout, A as AuthGuard } from '../chunks/DashboardLayout_Cxi79TD7.mjs';
import { ssr, ssrHydrationKey, escape, createComponent, ssrAttribute } from 'solid-js/web';
import { createSignal, onMount, Show, createMemo, For } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { $ as $authState } from '../chunks/auth_Bu6R9w5K.mjs';
export { renderers } from '../renderers.mjs';

async function authGet(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: "UNKNOWN", message: "An error occurred" }
      };
    }
    return { success: true, data };
  } catch {
    return {
      success: false,
      error: { code: "NETWORK", message: "Network error" }
    };
  }
}
async function getDashboardStats() {
  return authGet("/api/dashboard/stats");
}
async function getDashboardMetrics() {
  return authGet("/api/dashboard/metrics");
}

var _tmpl$ = ["<div", ' class="animate-pulse space-y-6"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">', "</div></div>"], _tmpl$2 = ["<div", ' class="card p-6 bg-red-50 border-red-200"><p class="text-red-600">', "</p></div>"], _tmpl$3 = ["<div", ' class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div class="stat-card"><div class="stat-value" style="color:var(--color-primary)">', '</div><div class="stat-label">Total Wallets Generated</div></div><div class="stat-card"><div class="stat-value"><!--$-->', '<!--/--><span class="text-lg font-normal text-[var(--color-gray-500)]">/hr</span></div><div class="stat-label">Generation Rate</div></div><div class="stat-card"><div class="stat-value"><!--$-->', '<!--/--><span class="text-lg font-normal text-[var(--color-gray-500)]">/<!--$-->', '<!--/--></span></div><div class="stat-label">Machines Online</div></div><div class="stat-card"><div class="stat-value"><!--$-->', '<!--/--><span class="text-lg font-normal text-[var(--color-gray-500)]">%</span></div><div class="stat-label">Average CPU Usage</div></div></div>'], _tmpl$4 = ["<div", ' class="card p-6"><h3 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Machine Status</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-4"><div class="text-center p-4 rounded-lg bg-[var(--color-gray-50)]"><div class="text-2xl font-semibold text-[var(--color-gray-900)]">', '</div><div class="text-sm text-[var(--color-gray-500)]">Total Machines</div></div><div class="text-center p-4 rounded-lg bg-[var(--color-gray-50)]"><div class="text-2xl font-semibold" style="color:var(--color-primary)">', '</div><div class="text-sm" style="color:var(--color-primary)">Online</div></div><div class="text-center p-4 rounded-lg bg-[var(--color-gray-50)]"><div class="text-2xl font-semibold text-[var(--color-gray-600)]">', '</div><div class="text-sm text-[var(--color-gray-500)]">Offline</div></div><div class="text-center p-4 rounded-lg bg-[var(--color-gray-50)]"><div class="text-2xl font-semibold text-[var(--color-gray-900)]">', '</div><div class="text-sm text-[var(--color-gray-500)]">Reporting</div></div></div></div>'], _tmpl$5 = ["<div", ' class="h-64">', "</div>"], _tmpl$6 = ["<div", ' class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="card p-6"><h3 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Generation Rate (Last Hour)</h3><!--$-->', '<!--/--></div><div class="card p-6"><h3 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">CPU Usage (Last Hour)</h3><!--$-->', "<!--/--></div></div>"], _tmpl$7 = ["<div", ' class="h-48">', "</div>"], _tmpl$8 = ["<div", ' class="card p-6"><h3 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Last 24 Hours</h3><!--$-->', "<!--/--></div>"], _tmpl$9 = ["<div", ' class="space-y-6"><!--$-->', "<!--/--><!--$-->", "<!--/--><!--$-->", "<!--/--></div>"], _tmpl$0 = ["<div", ' class="stat-card"><div class="h-8 bg-[var(--color-gray-200)] rounded w-1/2 mb-2"></div><div class="h-4 bg-[var(--color-gray-100)] rounded w-2/3"></div></div>'], _tmpl$1 = ["<div", ' class="h-64 flex items-center justify-center text-[var(--color-gray-500)]">No data available</div>'], _tmpl$10 = ["<div", ' class="h-48 flex items-center justify-center text-[var(--color-gray-500)]">No historical data available</div>'], _tmpl$11 = ["<svg", ' viewBox="', '" class="w-full h-full"><!--$-->', "<!--/--><!--$-->", "<!--/--><text", ' text-anchor="middle" class="text-xs fill-[var(--color-gray-500)]">Time (Last Hour)</text><text transform="', '" text-anchor="middle" class="text-xs fill-[var(--color-gray-500)]">Keys/min</text></svg>'], _tmpl$12 = ["<line", ' stroke="var(--color-gray-200)"></line>'], _tmpl$13 = ["<text", ' text-anchor="end" class="text-xs fill-[var(--color-gray-400)]">', "</text>"], _tmpl$14 = ["<rect", ' fill="var(--color-primary)" rx="2"></rect>'], _tmpl$15 = ["<svg", ' viewBox="', '" class="w-full h-full"><!--$-->', "<!--/--><path", ' fill="var(--color-primary)" fill-opacity="0.1"></path><path', ' fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><text', ' text-anchor="middle" class="text-xs fill-[var(--color-gray-500)]">Time (Last Hour)</text><text transform="', '" text-anchor="middle" class="text-xs fill-[var(--color-gray-500)]">CPU Usage (%)</text></svg>'], _tmpl$16 = ["<text", ' text-anchor="end" class="text-xs fill-[var(--color-gray-400)]"><!--$-->', "<!--/-->%</text>"], _tmpl$17 = ["<svg", ' viewBox="', '" class="w-full h-full"><!--$-->', "<!--/--><!--$-->", "<!--/--></svg>"], _tmpl$18 = ["<text", ' text-anchor="middle" class="text-xs fill-[var(--color-gray-400)]"><!--$-->', "<!--/-->h</text>"], _tmpl$19 = ["<g", "><rect", ' fill="var(--color-gray-300)" rx="2"></rect><!--$-->', "<!--/--></g>"];
function DashboardView() {
  const authState = useStore($authState);
  const [stats, setStats] = createSignal(null);
  const [metrics, setMetrics] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    if (!authState().isAuthenticated) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    const [statsResult, metricsResult] = await Promise.all([getDashboardStats(), getDashboardMetrics()]);
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    } else {
      setError(statsResult.error?.message || "Failed to load dashboard");
    }
    if (metricsResult.success && metricsResult.data) {
      setMetrics(metricsResult.data);
    }
    if (showLoading) {
      setLoading(false);
    }
  };
  const formatNumber = (num) => {
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    }
    if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`;
    }
    return num.toString();
  };
  onMount(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 1e4);
    return () => clearInterval(interval);
  });
  return ssr(_tmpl$9, ssrHydrationKey(), escape(createComponent(Show, {
    get when() {
      return loading();
    },
    get children() {
      return ssr(_tmpl$, ssrHydrationKey(), escape([1, 2, 3, 4].map(() => ssr(_tmpl$0, ssrHydrationKey()))));
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
      return !loading() && stats();
    },
    get children() {
      return [ssr(_tmpl$3, ssrHydrationKey(), escape(formatNumber(stats().estimates.total_wallets)), escape(formatNumber(stats().estimates.hourly_rate)), escape(stats().workers.online), escape(stats().workers.total), escape(stats().metrics.avg_cpu)), ssr(_tmpl$4, ssrHydrationKey(), escape(stats().workers.total), escape(stats().workers.online), escape(stats().workers.offline), escape(stats().metrics.workers_reporting)), ssr(_tmpl$6, ssrHydrationKey(), escape(createComponent(Show, {
        get when() {
          return metrics()?.metrics.length;
        },
        get fallback() {
          return ssr(_tmpl$1, ssrHydrationKey());
        },
        get children() {
          return ssr(_tmpl$5, ssrHydrationKey(), escape(createComponent(RateChart, {
            get metrics() {
              return metrics().metrics;
            }
          })));
        }
      })), escape(createComponent(Show, {
        get when() {
          return metrics()?.metrics.length;
        },
        get fallback() {
          return ssr(_tmpl$1, ssrHydrationKey());
        },
        get children() {
          return ssr(_tmpl$5, ssrHydrationKey(), escape(createComponent(CpuChart, {
            get metrics() {
              return metrics().metrics;
            }
          })));
        }
      }))), ssr(_tmpl$8, ssrHydrationKey(), escape(createComponent(Show, {
        get when() {
          return stats().history.length > 0;
        },
        get fallback() {
          return ssr(_tmpl$10, ssrHydrationKey());
        },
        get children() {
          return ssr(_tmpl$7, ssrHydrationKey(), escape(createComponent(HistoryChart, {
            get history() {
              return stats().history;
            }
          })));
        }
      })))];
    }
  })));
}
function RateChart(props) {
  const chartWidth = 500;
  const chartHeight = 250;
  const padding = {
    top: 20,
    right: 20,
    bottom: 40,
    left: 60
  };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const maxRate = createMemo(() => Math.max(...props.metrics.map((m) => m.total_rate), 1));
  const bars = createMemo(() => {
    const data = props.metrics;
    const barWidth = Math.max(2, innerWidth / data.length - 2);
    return data.map((m, i) => {
      const x = padding.left + i * (innerWidth / data.length);
      const height = m.total_rate / maxRate() * innerHeight;
      const y = padding.top + innerHeight - height;
      return {
        x,
        y,
        width: barWidth,
        height,
        value: m.total_rate
      };
    });
  });
  return ssr(_tmpl$11, ssrHydrationKey(), `0 0 ${escape(chartWidth, true)} ${escape(chartHeight, true)}`, escape(createComponent(For, {
    each: [0, 0.25, 0.5, 0.75, 1],
    children: (ratio) => {
      const y = padding.top + innerHeight * (1 - ratio);
      const value = Math.round(maxRate() * ratio);
      return [ssr(_tmpl$12, ssrHydrationKey() + ssrAttribute("x1", escape(padding.left, true), false) + ssrAttribute("y1", escape(y, true), false) + ssrAttribute("x2", escape(chartWidth, true) - escape(padding.right, true), false) + ssrAttribute("y2", escape(y, true), false)), ssr(_tmpl$13, ssrHydrationKey() + ssrAttribute("x", escape(padding.left, true) - 10, false) + ssrAttribute("y", escape(y, true) + 4, false), escape(value))];
    }
  })), escape(createComponent(For, {
    get each() {
      return bars();
    },
    children: (bar) => ssr(_tmpl$14, ssrHydrationKey() + ssrAttribute("x", escape(bar.x, true), false) + ssrAttribute("y", escape(bar.y, true), false) + ssrAttribute("width", escape(bar.width, true), false) + ssrAttribute("height", escape(bar.height, true), false))
  })), ssrAttribute("x", escape(chartWidth, true) / 2, false) + ssrAttribute("y", escape(chartHeight, true) - 5, false), `translate(15, ${escape(chartHeight, true) / 2}) rotate(-90)`);
}
function CpuChart(props) {
  const chartWidth = 500;
  const chartHeight = 250;
  const padding = {
    top: 20,
    right: 20,
    bottom: 40,
    left: 60
  };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const linePath = createMemo(() => {
    const data = props.metrics;
    if (data.length < 2) return "";
    const xScale = innerWidth / (data.length - 1);
    const yScale = innerHeight / 100;
    return data.map((d, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + innerHeight - d.avg_cpu * yScale;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  });
  const areaPath = createMemo(() => {
    const data = props.metrics;
    if (data.length < 2) return "";
    const xScale = innerWidth / (data.length - 1);
    const yScale = innerHeight / 100;
    const points = data.map((d, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + innerHeight - d.avg_cpu * yScale;
      return `${x} ${y}`;
    });
    return `M ${padding.left} ${padding.top + innerHeight} L ${points.join(" L ")} L ${padding.left + innerWidth} ${padding.top + innerHeight} Z`;
  });
  return ssr(_tmpl$15, ssrHydrationKey(), `0 0 ${escape(chartWidth, true)} ${escape(chartHeight, true)}`, escape(createComponent(For, {
    each: [0, 25, 50, 75, 100],
    children: (tick) => {
      const y = padding.top + innerHeight - tick / 100 * innerHeight;
      return [ssr(_tmpl$12, ssrHydrationKey() + ssrAttribute("x1", escape(padding.left, true), false) + ssrAttribute("y1", escape(y, true), false) + ssrAttribute("x2", escape(chartWidth, true) - escape(padding.right, true), false) + ssrAttribute("y2", escape(y, true), false)), ssr(_tmpl$16, ssrHydrationKey() + ssrAttribute("x", escape(padding.left, true) - 10, false) + ssrAttribute("y", escape(y, true) + 4, false), escape(tick))];
    }
  })), ssrAttribute("d", escape(areaPath(), true), false), ssrAttribute("d", escape(linePath(), true), false), ssrAttribute("x", escape(chartWidth, true) / 2, false) + ssrAttribute("y", escape(chartHeight, true) - 5, false), `translate(15, ${escape(chartHeight, true) / 2}) rotate(-90)`);
}
function HistoryChart(props) {
  const chartWidth = 800;
  const chartHeight = 180;
  const padding = {
    top: 20,
    right: 60,
    bottom: 40,
    left: 60
  };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const maxRate = createMemo(() => Math.max(...props.history.map((h) => h.total_rate), 1));
  const bars = createMemo(() => {
    const data = props.history;
    const barWidth = Math.max(8, innerWidth / data.length - 4);
    return data.map((h, i) => {
      const x = padding.left + i * (innerWidth / data.length) + 2;
      const height = h.total_rate / maxRate() * innerHeight;
      const y = padding.top + innerHeight - height;
      const hour = new Date(h.hour).getHours();
      return {
        x,
        y,
        width: barWidth,
        height,
        value: h.total_rate,
        hour
      };
    });
  });
  return ssr(_tmpl$17, ssrHydrationKey(), `0 0 ${escape(chartWidth, true)} ${escape(chartHeight, true)}`, escape(createComponent(For, {
    each: [0, 0.5, 1],
    children: (ratio) => {
      const y = padding.top + innerHeight * (1 - ratio);
      const value = Math.round(maxRate() * ratio);
      return [ssr(_tmpl$12, ssrHydrationKey() + ssrAttribute("x1", escape(padding.left, true), false) + ssrAttribute("y1", escape(y, true), false) + ssrAttribute("x2", escape(chartWidth, true) - escape(padding.right, true), false) + ssrAttribute("y2", escape(y, true), false)), ssr(_tmpl$13, ssrHydrationKey() + ssrAttribute("x", escape(padding.left, true) - 10, false) + ssrAttribute("y", escape(y, true) + 4, false), escape(value))];
    }
  })), escape(createComponent(For, {
    get each() {
      return bars();
    },
    children: (bar) => ssr(_tmpl$19, ssrHydrationKey(), ssrAttribute("x", escape(bar.x, true), false) + ssrAttribute("y", escape(bar.y, true), false) + ssrAttribute("width", escape(bar.width, true), false) + ssrAttribute("height", escape(bar.height, true), false), escape(createComponent(Show, {
      get when() {
        return bars().indexOf(bar) % 4 === 0;
      },
      get children() {
        return ssr(_tmpl$18, ssrHydrationKey() + ssrAttribute("x", escape(bar.x, true) + escape(bar.width, true) / 2, false) + ssrAttribute("y", escape(chartHeight, true) - 20, false), escape(bar.hour));
      }
    })))
  })));
}

const prerender = false;
const $$Dashboard = createComponent$1(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard", "currentPath": "/dashboard" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AuthGuard", AuthGuard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/auth/components/AuthGuard", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="space-y-6"> <!-- Header --> <div> <h1 class="text-2xl font-semibold text-[var(--color-gray-900)]">Dashboard</h1> <p class="text-sm text-[var(--color-gray-500)] mt-1">
Monitor performance and wallet generation across all machines
</p> </div> <!-- Dashboard Content --> ${renderComponent($$result3, "DashboardView", DashboardView, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/dashboard", "client:component-export": "DashboardView" })} </div> ` })} ` })}`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/dashboard.astro", void 0);

const $$file = "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/dashboard.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
