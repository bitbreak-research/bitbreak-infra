import { e as createComponent$1, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_HrKuE-E2.mjs';
import { $ as $$DashboardLayout, A as AuthGuard } from '../chunks/DashboardLayout_Cxi79TD7.mjs';
import { useStore } from '@nanostores/solid';
import { $ as $authState } from '../chunks/auth_Bu6R9w5K.mjs';
import { ssr, ssrHydrationKey, escape, createComponent, ssrStyle } from 'solid-js/web';
import { Show, createSignal, onMount, For } from 'solid-js';
import { b as getWorkersStatus } from '../chunks/workers_DBjwXdAk.mjs';
export { renderers } from '../renderers.mjs';

var _tmpl$$1 = ["<span", ' class="badge badge-success">Running</span>'], _tmpl$2$1 = ["<span", ' class="badge badge-neutral">Stopped</span>'], _tmpl$3$1 = ["<div", ' class="mt-4 pt-4 border-t border-[var(--color-gray-200)]"><div class="flex items-center justify-between"><span class="text-sm text-[var(--color-gray-500)]">Generation Rate</span><span class="text-sm font-medium text-[var(--color-gray-900)]"><!--$-->', "<!--/--> keys/min</span></div></div>"], _tmpl$4$1 = ["<div", ' class="card card-interactive p-6 cursor-pointer"><div class="flex items-start justify-between mb-6"><div><h3 class="text-lg font-semibold text-[var(--color-gray-900)]">', '</h3><div class="flex items-center gap-2 mt-1"><span class="', '"></span><span class="text-sm text-[var(--color-gray-500)]">', "</span></div></div><!--$-->", "<!--/--><!--$-->", '<!--/--></div><div class="flex justify-center mb-6"><svg class="machine-icon" viewBox="0 0 100 100" fill="none"><g transform="translate(15, 20)"><path d="M35 0 L70 15 L70 45 L35 30 Z" fill="#E8E8ED" stroke="#D2D2D7" stroke-width="1"></path><path d="M0 15 L35 0 L35 30 L0 45 Z" fill="#F5F5F7" stroke="#D2D2D7" stroke-width="1"></path><path d="M0 45 L35 30 L70 45 L35 60 Z" fill="#FAFAFA" stroke="#D2D2D7" stroke-width="1"></path><line x1="38" y1="8" x2="62" y2="18" stroke="#D2D2D7" stroke-width="1"></line><line x1="38" y1="12" x2="62" y2="22" stroke="#D2D2D7" stroke-width="1"></line><line x1="38" y1="16" x2="62" y2="26" stroke="#D2D2D7" stroke-width="1"></line><line x1="8" y1="20" x2="30" y2="12" stroke="#E8E8ED" stroke-width="1"></line><line x1="8" y1="24" x2="30" y2="16" stroke="#E8E8ED" stroke-width="1"></line><line x1="8" y1="28" x2="30" y2="20" stroke="#E8E8ED" stroke-width="1"></line></g></svg></div><div class="space-y-3"><div class="metric-row"><span class="metric-label">CPU</span><div class="metric-bar"><div class="metric-bar-fill" style="', '"></div></div><span class="metric-value"><!--$-->', '<!--/-->%</span></div><div class="metric-row"><span class="metric-label">Memory</span><div class="metric-bar"><div class="metric-bar-fill" style="', '"></div></div><span class="metric-value">', '</span></div><div class="metric-row"><span class="metric-label">Storage capacity</span><div class="metric-bar"><div class="metric-bar-fill" style="', '"></div></div><span class="metric-value"><!--$-->', "<!--/-->%</span></div></div><!--$-->", "<!--/--></div>"];
function MachineCard(props) {
  const getStoragePercent = () => {
    return 60;
  };
  const getMemoryPercent = () => {
    const memory = props.worker.memory;
    if (memory === null) return 0;
    return Math.min(Math.round(memory / 8192 * 100), 100);
  };
  const getCpuPercent = () => {
    return props.worker.cpu ?? 0;
  };
  const formatMemory = () => {
    const memory = props.worker.memory;
    if (memory === null) return "--";
    if (memory >= 1024) {
      return `${(memory / 1024).toFixed(1)}GB`;
    }
    return `${memory}MB`;
  };
  return ssr(_tmpl$4$1, ssrHydrationKey(), escape(props.worker.name), `status-dot ${props.worker.connected ? "online" : "offline"}`, props.worker.connected ? "Online" : "Offline", escape(createComponent(Show, {
    get when() {
      return props.worker.engine_status === "running";
    },
    get children() {
      return ssr(_tmpl$$1, ssrHydrationKey());
    }
  })), escape(createComponent(Show, {
    get when() {
      return props.worker.engine_status === "stopped" || !props.worker.engine_status;
    },
    get children() {
      return ssr(_tmpl$2$1, ssrHydrationKey());
    }
  })), ssrStyle(`width: ${getCpuPercent()}%`), escape(getCpuPercent()), ssrStyle(`width: ${getMemoryPercent()}%`), escape(formatMemory()), ssrStyle(`width: ${getStoragePercent()}%`), escape(getStoragePercent()), escape(createComponent(Show, {
    get when() {
      return props.worker.rate !== null && props.worker.rate > 0;
    },
    get children() {
      return ssr(_tmpl$3$1, ssrHydrationKey(), escape(props.worker.rate));
    }
  })));
}

var _tmpl$ = ["<div", ' class="p-4 mb-6 rounded-lg bg-red-50 border border-red-200"><p class="text-sm text-red-600">', "</p></div>"], _tmpl$2 = ["<div", ' class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">', "</div>"], _tmpl$3 = ["<div", ' class="card p-12 text-center"><div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-gray-100)] flex items-center justify-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-[var(--color-gray-400)]"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg></div><h3 class="text-lg font-medium text-[var(--color-gray-900)] mb-2">No machines configured</h3><p class="text-sm text-[var(--color-gray-500)] mb-6">Add your first Mac Mini to start monitoring and generating wallets.</p><a href="/workers/new" class="btn btn-primary">Add Machine</a></div>'], _tmpl$4 = ["<div", "><!--$-->", "<!--/--><!--$-->", "<!--/--><!--$-->", "<!--/--><!--$-->", "<!--/--></div>"], _tmpl$5 = ["<div", ' class="card p-6 animate-pulse"><div class="h-6 bg-[var(--color-gray-200)] rounded w-2/3 mb-4"></div><div class="h-20 bg-[var(--color-gray-100)] rounded mb-4"></div><div class="space-y-3"><div class="h-4 bg-[var(--color-gray-200)] rounded"></div><div class="h-4 bg-[var(--color-gray-200)] rounded"></div><div class="h-4 bg-[var(--color-gray-200)] rounded"></div></div></div>'];
function MachinesGrid(props) {
  const authState = useStore($authState);
  const [workers, setWorkers] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const fetchWorkers = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError("");
    if (!authState().isAuthenticated) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    const result = await getWorkersStatus();
    if (result.success && result.data) {
      setWorkers(result.data.workers);
    } else {
      setError(result.error?.message || "Failed to load machines");
    }
    if (showLoading) {
      setLoading(false);
    }
  };
  const handleMachineClick = (workerId) => {
    if (props.onMachineClick) {
      props.onMachineClick(workerId);
    } else {
      window.location.href = `/workers/${workerId}`;
    }
  };
  onMount(() => {
    fetchWorkers(true);
    const interval = setInterval(() => {
      fetchWorkers(false);
    }, 5e3);
    return () => clearInterval(interval);
  });
  return ssr(_tmpl$4, ssrHydrationKey(), escape(createComponent(Show, {
    get when() {
      return error();
    },
    get children() {
      return ssr(_tmpl$, ssrHydrationKey(), escape(error()));
    }
  })), escape(createComponent(Show, {
    get when() {
      return loading();
    },
    get children() {
      return ssr(_tmpl$2, ssrHydrationKey(), escape([1, 2, 3, 4].map(() => ssr(_tmpl$5, ssrHydrationKey()))));
    }
  })), escape(createComponent(Show, {
    get when() {
      return !loading() && workers().length === 0;
    },
    get children() {
      return ssr(_tmpl$3, ssrHydrationKey());
    }
  })), escape(createComponent(Show, {
    get when() {
      return !loading() && workers().length > 0;
    },
    get children() {
      return ssr(_tmpl$2, ssrHydrationKey(), escape(createComponent(For, {
        get each() {
          return workers();
        },
        children: (worker) => createComponent(MachineCard, {
          worker,
          onClick: () => handleMachineClick(worker.worker_id)
        })
      })));
    }
  })));
}

const prerender = false;
const $$Workers = createComponent$1(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Machines", "currentPath": "/workers" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AuthGuard", AuthGuard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/auth/components/AuthGuard", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="space-y-6"> <!-- Header --> <div class="flex items-center justify-between"> <div> <h1 class="text-2xl font-semibold text-[var(--color-gray-900)]">Machines</h1> <p class="text-sm text-[var(--color-gray-500)] mt-1">
Monitor and manage your Mac Mini workers
</p> </div> <a href="/workers/new" class="btn btn-primary"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <line x1="12" y1="5" x2="12" y2="19"></line> <line x1="5" y1="12" x2="19" y2="12"></line> </svg>
Add Machine
</a> </div> <!-- Machines Grid --> ${renderComponent($$result3, "MachinesGrid", MachinesGrid, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/workers", "client:component-export": "MachinesGrid" })} </div> ` })} ` })}`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/workers.astro", void 0);

const $$file = "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/workers.astro";
const $$url = "/workers";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Workers,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
