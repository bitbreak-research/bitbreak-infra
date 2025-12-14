import { e as createComponent$1, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_HrKuE-E2.mjs';
import { $ as $$DashboardLayout, A as AuthGuard } from '../../chunks/DashboardLayout_Cxi79TD7.mjs';
import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { createSignal, Show } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { $ as $authState } from '../../chunks/auth_Bu6R9w5K.mjs';
import { B as Button, A as Alert } from '../../chunks/Alert_Bmwi9hfX.mjs';
import { I as Input } from '../../chunks/Input_FNDmMe0b.mjs';
export { renderers } from '../../renderers.mjs';

var _tmpl$ = ["<div", ' class="space-y-6"><div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200"><svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><p class="text-sm font-medium text-green-800">Machine created successfully</p><p class="text-xs text-green-700 mt-0.5">Configuration file has been downloaded</p></div></div><div class="space-y-4"><div><label class="block text-sm font-medium text-[var(--color-gray-700)] mb-1.5">Connection Token</label><p class="text-xs text-[var(--color-gray-500)] mb-2">Save this token securely. It will not be shown again.</p><div class="flex items-center gap-2"><code class="flex-1 px-3 py-2.5 bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-lg text-xs font-mono break-all text-[var(--color-gray-900)]">', '</code><button class="btn btn-secondary !w-auto !py-2.5" title="Copy token"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button></div></div><button class="btn btn-secondary w-full"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>Download Config Again</button></div><div class="flex gap-3"><!--$-->', '<!--/--><a href="/workers" class="btn btn-primary flex-1 text-center">View All Machines</a></div></div>'], _tmpl$2 = ["<form", ' class="space-y-6"><!--$-->', "<!--/--><!--$-->", `<!--/--><p class="text-xs text-[var(--color-gray-500)]">After creation, you'll receive a configuration file to set up the worker on your Mac Mini.</p><!--$-->`, "<!--/--></form>"];
function CreateWorkerForm(props) {
  useStore($authState);
  const [name, setName] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [newWorkerData, setNewWorkerData] = createSignal(null);
  if (newWorkerData()) {
    return ssr(_tmpl$, ssrHydrationKey(), escape(newWorkerData().token), escape(createComponent(Button, {
      onClick: () => {
        setNewWorkerData(null);
        props.onWorkerCreated?.();
      },
      variant: "secondary",
      children: "Create Another"
    })));
  }
  return ssr(_tmpl$2, ssrHydrationKey(), escape(createComponent(Show, {
    get when() {
      return error();
    },
    get children() {
      return createComponent(Alert, {
        type: "error",
        get message() {
          return error();
        }
      });
    }
  })), escape(createComponent(Input, {
    label: "Machine Name",
    type: "text",
    get value() {
      return name();
    },
    onInput: (e) => setName(e.currentTarget.value),
    placeholder: "e.g., MacMini-Office-01",
    required: true,
    minLength: 3,
    maxLength: 100,
    get disabled() {
      return loading();
    }
  })), escape(createComponent(Button, {
    type: "submit",
    get loading() {
      return loading();
    },
    get disabled() {
      return loading() || name().length < 3;
    },
    children: "Create Machine"
  })));
}

const prerender = false;
const $$New = createComponent$1(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Add Machine", "currentPath": "/workers" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AuthGuard", AuthGuard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/auth/components/AuthGuard", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div style="max-width: 480px;"> <!-- Back link --> <a href="/workers" class="inline-flex items-center gap-2 text-sm text-[var(--color-gray-500)] hover:text-[var(--color-gray-900)] mb-6 transition-colors"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <line x1="19" y1="12" x2="5" y2="12"></line> <polyline points="12 19 5 12 12 5"></polyline> </svg>
Back to Machines
</a> <div class="bg-white rounded-[var(--radius-lg)] border border-[var(--color-gray-200)] p-8"> <div class="mb-8 text-center"> <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-gray-100)] flex items-center justify-center"> <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-[var(--color-gray-600)]"> <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect> <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect> <line x1="6" y1="6" x2="6.01" y2="6"></line> <line x1="6" y1="18" x2="6.01" y2="18"></line> </svg> </div> <h1 class="text-xl font-semibold text-[var(--color-gray-900)]">Add New Machine</h1> <p class="text-sm text-[var(--color-gray-500)] mt-2">
Configure a new Mac Mini worker to start generating wallets
</p> </div> ${renderComponent($$result3, "CreateWorkerForm", CreateWorkerForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/workers", "client:component-export": "CreateWorkerForm" })} </div> </div> ` })} ` })}`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/workers/new.astro", void 0);

const $$file = "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/workers/new.astro";
const $$url = "/workers/new";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$New,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
