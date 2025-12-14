import { e as createComponent$1, f as createAstro, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_HrKuE-E2.mjs';
import { $ as $$AuthLayout } from '../chunks/AuthLayout_BGB8CP8v.mjs';
import '../chunks/auth_Bu6R9w5K.mjs';
import '@nanostores/solid';
import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { createSignal, onMount, Show } from 'solid-js';
import { A as Alert, B as Button } from '../chunks/Alert_Bmwi9hfX.mjs';
import { c as createWorker } from '../chunks/workers_DBjwXdAk.mjs';
import { c as checkAuth } from '../chunks/server-auth_BYbom2jb.mjs';
export { renderers } from '../renderers.mjs';

var _tmpl$ = ["<div", ' class="text-center text-sm text-gray-600 py-2">', "</div>"], _tmpl$2 = ["<div", ' class="space-y-6"><div class="text-center space-y-2"><h1 class="text-2xl font-semibold">Connect CLI</h1><p class="text-gray-600">Click the button below to connect your CLI to this account.</p><p class="text-sm text-gray-500">A new worker will be created and configured for your CLI.</p></div><!--$-->', "<!--/--><!--$-->", "<!--/--><!--$-->", "<!--/--><!--$-->", "<!--/--><!--$-->", '<!--/--><div class="text-xs text-gray-400 text-center space-y-1"><p>Source: <!--$-->', '<!--/--></p><p class="break-all">Callback: <!--$-->', "<!--/--></p></div></div>"];
function ConnectForm(props) {
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [status, setStatus] = createSignal("");
  onMount(() => {
    if (!props.callback || !props.token) {
      setError("Missing required parameters (callback or token)");
    }
  });
  const handleConnect = async () => {
    setError("");
    setSuccess(false);
    setLoading(true);
    setStatus("Creating worker...");
    try {
      const workerName = `CLI Worker - ${(/* @__PURE__ */ new Date()).toISOString()}`;
      const workerResult = await createWorker(workerName);
      if (!workerResult.success || !workerResult.data) {
        setError(workerResult.error?.message || "Failed to create worker");
        setLoading(false);
        setStatus("");
        return;
      }
      const {
        worker_id,
        token: workerToken,
        websocket_url
      } = workerResult.data;
      const config = {
        id: worker_id,
        token: workerToken,
        websocket_url
      };
      setStatus("Connecting to CLI...");
      const callbackUrl = new URL(props.callback);
      callbackUrl.searchParams.set("token", props.token);
      const response = await fetch(callbackUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        setSuccess(true);
        setStatus("Successfully connected! You can close this window.");
      } else {
        const errorText = await response.text();
        setError(`CLI rejected the connection: ${errorText || "Unknown error"}`);
      }
    } catch (err) {
      setError("Connection error. Make sure the CLI is still running.");
      console.error("Connection error:", err);
    } finally {
      setLoading(false);
      if (!success()) {
        setStatus("");
      }
    }
  };
  return ssr(_tmpl$2, ssrHydrationKey(), escape(createComponent(Show, {
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
  })), escape(createComponent(Show, {
    get when() {
      return success();
    },
    get children() {
      return [createComponent(Alert, {
        message: "Successfully connected! You can close this window and return to your CLI.",
        type: "success"
      }), createComponent(Button, {
        onClick: () => window.location.href = "/workers",
        children: "Go Back to Workers"
      })];
    }
  })), escape(createComponent(Show, {
    get when() {
      return status();
    },
    get children() {
      return ssr(_tmpl$, ssrHydrationKey(), escape(status()));
    }
  })), escape(createComponent(Show, {
    get when() {
      return !props.callback || !props.token;
    },
    get children() {
      return createComponent(Alert, {
        message: "Invalid connection request. Missing required parameters.",
        type: "error"
      });
    }
  })), escape(createComponent(Show, {
    get when() {
      return props.callback && props.token;
    },
    get children() {
      return createComponent(Button, {
        onClick: handleConnect,
        get loading() {
          return loading();
        },
        get disabled() {
          return success();
        },
        get children() {
          return success() ? "Connected" : loading() ? "Connecting..." : "Connect";
        }
      });
    }
  })), escape(props.source) || "unknown", escape(props.callback));
}

const $$Astro$1 = createAstro();
const $$ConnectPage = createComponent$1(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$ConnectPage;
  const { callback, token, source } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "AuthLayout", $$AuthLayout, { "title": "Connect CLI" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "ConnectForm", ConnectForm, { "client:load": true, "callback": callback, "token": token, "source": source, "client:component-hydration": "load", "client:component-path": "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/features/auth", "client:component-export": "ConnectForm" })} ` })}`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/components/pages/ConnectPage.astro", void 0);

const $$Astro = createAstro();
const prerender = false;
const $$Connect = createComponent$1(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Connect;
  const callback = Astro2.url.searchParams.get("callback") || "";
  const token = Astro2.url.searchParams.get("token") || "";
  const source = Astro2.url.searchParams.get("source") || "";
  const { isAuthenticated } = await checkAuth(Astro2.cookies);
  if (!isAuthenticated) {
    const connectUrl = `/connect?callback=${encodeURIComponent(callback)}&token=${encodeURIComponent(token)}&source=${encodeURIComponent(source)}`;
    return Astro2.redirect(`/login?redirect=${encodeURIComponent(connectUrl)}`);
  }
  return renderTemplate`${renderComponent($$result, "ConnectPage", $$ConnectPage, { "callback": callback, "token": token, "source": source })}`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/connect.astro", void 0);

const $$file = "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/pages/connect.astro";
const $$url = "/connect";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Connect,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
