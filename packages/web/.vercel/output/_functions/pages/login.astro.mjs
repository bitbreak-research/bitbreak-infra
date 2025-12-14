import { e as createComponent$1, f as createAstro, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_HrKuE-E2.mjs';
import { $ as $$AuthLayout } from '../chunks/AuthLayout_BGB8CP8v.mjs';
import { createComponent, ssr, ssrHydrationKey, escape } from 'solid-js/web';
import { createSignal, onMount, Show } from 'solid-js';
import { A as Alert, B as Button } from '../chunks/Alert_Bmwi9hfX.mjs';
import { I as Input } from '../chunks/Input_FNDmMe0b.mjs';
import { g as getAuthStatus } from '../chunks/auth_CUsekmvO.mjs';
import '../chunks/auth_Bu6R9w5K.mjs';
import { c as checkSession } from '../chunks/session_BaeJQyks.mjs';
import '@nanostores/solid';
import { c as checkAuth } from '../chunks/server-auth_BYbom2jb.mjs';
export { renderers } from '../renderers.mjs';

var _tmpl$ = ["<form", ' class="space-y-6"><div class="text-center mb-6"><h2 class="text-lg font-semibold text-[var(--color-gray-900)]">Sign In</h2><p class="text-sm text-[var(--color-gray-500)] mt-1">Enter your credentials to continue</p></div><div class="space-y-4"><!--$-->', "<!--/--><!--$-->", "<!--/--></div><!--$-->", "<!--/--><!--$-->", "<!--/--></form>"], _tmpl$2 = ["<div", ' class="flex items-center justify-center py-8"><svg class="animate-spin h-6 w-6 text-[var(--color-gray-400)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>'];
function LoginForm(props) {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [checking, setChecking] = createSignal(true);
  onMount(async () => {
    const hasSession = await checkSession();
    if (hasSession) {
      window.location.href = props.redirectUrl || "/workers";
      return;
    }
    const result = await getAuthStatus();
    if (result.success && result.data?.needsSetup) {
      window.location.href = "/setup";
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
        autocomplete: "username",
        placeholder: "admin"
      })), escape(createComponent(Input, {
        label: "Password",
        type: "password",
        get value() {
          return password();
        },
        onInput: (e) => setPassword(e.currentTarget.value),
        required: true,
        autocomplete: "current-password",
        placeholder: "Enter your password"
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
        children: "Sign In"
      })));
    }
  });
}

const $$Astro = createAstro();
const prerender = false;
const $$Login = createComponent$1(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Login;
  const redirectUrl = Astro2.url.searchParams.get("redirect") || "/workers";
  const { isAuthenticated } = await checkAuth(Astro2.cookies);
  if (isAuthenticated) {
    return Astro2.redirect(redirectUrl);
  }
  return renderTemplate`${renderComponent($$result, "AuthLayout", $$AuthLayout, { "title": "Sign In" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "LoginForm", LoginForm, { "client:load": true, "redirectUrl": redirectUrl, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/auth", "client:component-export": "LoginForm" })} ` })}`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/login.astro", void 0);

const $$file = "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/login.astro";
const $$url = "/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
