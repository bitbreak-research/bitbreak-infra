import { e as createComponent$1, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_HrKuE-E2.mjs';
import { $ as $$AuthLayout } from '../chunks/AuthLayout_BGB8CP8v.mjs';
import '../chunks/auth_Bu6R9w5K.mjs';
import { createComponent, ssr, ssrHydrationKey, escape } from 'solid-js/web';
import { createSignal, onMount, Show } from 'solid-js';
import { A as Alert, B as Button } from '../chunks/Alert_Bmwi9hfX.mjs';
import { I as Input } from '../chunks/Input_FNDmMe0b.mjs';
import { g as getAuthStatus } from '../chunks/auth_CUsekmvO.mjs';
import { c as checkSession } from '../chunks/session_BaeJQyks.mjs';
import '@nanostores/solid';
export { renderers } from '../renderers.mjs';

var _tmpl$ = ["<form", ' class="space-y-6"><div class="space-y-4"><!--$-->', "<!--/--><!--$-->", "<!--/--><!--$-->", "<!--/--></div><!--$-->", "<!--/--><!--$-->", "<!--/--></form>"], _tmpl$2 = ["<div", ' class="text-center text-gray-500">Loading...</div>'];
function SetupForm() {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [checking, setChecking] = createSignal(true);
  onMount(async () => {
    const hasSession = await checkSession();
    if (hasSession) {
      window.location.href = "/workers";
      return;
    }
    const result = await getAuthStatus();
    if (result.success && !result.data?.needsSetup) {
      window.location.href = "/login";
      return;
    }
    setChecking(false);
  });
  return createComponent(Show, {
    get when() {
      return !checking();
    },
    get fallback() {
      return ssr(_tmpl$2, ssrHydrationKey());
    },
    get children() {
      return ssr(_tmpl$, ssrHydrationKey(), escape(createComponent(Input, {
        label: "Username",
        type: "text",
        get value() {
          return username();
        },
        onInput: (e) => setUsername(e.currentTarget.value),
        required: true,
        autocomplete: "username"
      })), escape(createComponent(Input, {
        label: "Password",
        type: "password",
        get value() {
          return password();
        },
        onInput: (e) => setPassword(e.currentTarget.value),
        required: true,
        autocomplete: "new-password"
      })), escape(createComponent(Input, {
        label: "Confirm Password",
        type: "password",
        get value() {
          return confirmPassword();
        },
        onInput: (e) => setConfirmPassword(e.currentTarget.value),
        required: true,
        autocomplete: "new-password"
      })), escape(createComponent(Show, {
        get when() {
          return error();
        },
        get children() {
          return createComponent(Alert, {
            get message() {
              return error();
            },
            type: "error"
          });
        }
      })), escape(createComponent(Button, {
        type: "submit",
        get loading() {
          return loading();
        },
        children: "Create Account"
      })));
    }
  });
}

const $$Setup = createComponent$1(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AuthLayout", $$AuthLayout, { "title": "Setup" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-8"> <div class="text-center"> <h1 class="text-lg font-medium">Create Account</h1> <p class="mt-2 text-sm text-gray-500">Set up your first account</p> </div> ${renderComponent($$result2, "SetupForm", SetupForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/auth", "client:component-export": "SetupForm" })} </div> ` })}`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/setup.astro", void 0);

const $$file = "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/setup.astro";
const $$url = "/setup";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Setup,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
