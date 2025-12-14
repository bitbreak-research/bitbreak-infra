import { createComponent, ssr, ssrHydrationKey } from 'solid-js/web';
import { onMount, Show } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { $ as $authState, s as setLoading } from './auth_Bu6R9w5K.mjs';
import { c as checkSession } from './session_BaeJQyks.mjs';
import { e as createComponent$1, f as createAstro, l as renderHead, n as renderSlot, o as renderScript, h as addAttribute, r as renderTemplate } from './astro/server_HrKuE-E2.mjs';
/* empty css                           */

var _tmpl$ = ["<div", ' class="text-center text-gray-500">Loading...</div>'];
function AuthGuard(props) {
  const authState = useStore($authState);
  onMount(async () => {
    const hasSession = await checkSession();
    if (!hasSession) {
      window.location.href = "/login";
      return;
    }
    setLoading(false);
  });
  return createComponent(Show, {
    get when() {
      return !authState().isLoading && authState().isAuthenticated;
    },
    get fallback() {
      return props.fallback || ssr(_tmpl$, ssrHydrationKey());
    },
    get children() {
      return props.children;
    }
  });
}

const $$Astro = createAstro();
const $$DashboardLayout = createComponent$1(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$DashboardLayout;
  const { title, currentPath = "" } = Astro2.props;
  const navItems = [
    { href: "/workers", label: "Machines", icon: "server" },
    { href: "/dashboard", label: "Dashboard", icon: "chart" }
  ];
  function isActive(href) {
    return currentPath === href || currentPath.startsWith(href + "/");
  }
  return renderTemplate`<html lang="en"> <head><meta charset="utf-8"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} - BitBreak</title>${renderHead()}</head> <body class="min-h-screen bg-[var(--color-gray-50)]"> <div class="flex min-h-screen"> <!-- Sidebar --> <aside class="sidebar w-64 flex-shrink-0 fixed left-0 top-0 bottom-0 z-10 flex flex-col"> <!-- Logo --> <div class="p-6 border-b border-[var(--color-gray-200)]"> <a href="/workers" class="flex items-center gap-3"> <div class="w-8 h-8 rounded-lg bg-[var(--color-gray-900)] flex items-center justify-center"> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"> <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect> <line x1="8" y1="21" x2="16" y2="21"></line> <line x1="12" y1="17" x2="12" y2="21"></line> </svg> </div> <span class="font-semibold text-[var(--color-gray-900)]">BitBreak</span> </a> </div> <!-- Navigation --> <nav class="flex-1 p-4"> <ul class="space-y-1"> ${navItems.map((item) => renderTemplate`<li> <a${addAttribute(item.href, "href")}${addAttribute(`nav-link ${isActive(item.href) ? "active" : ""}`, "class")}> ${item.icon === "server" && renderTemplate`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect> <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect> <line x1="6" y1="6" x2="6.01" y2="6"></line> <line x1="6" y1="18" x2="6.01" y2="18"></line> </svg>`} ${item.icon === "chart" && renderTemplate`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <line x1="18" y1="20" x2="18" y2="10"></line> <line x1="12" y1="20" x2="12" y2="4"></line> <line x1="6" y1="20" x2="6" y2="14"></line> </svg>`} ${item.label} </a> </li>`)} </ul> </nav> <!-- User Section --> <div class="p-4 border-t border-[var(--color-gray-200)]"> <div class="flex items-center gap-3 px-3 py-2"> <div class="w-8 h-8 rounded-full bg-[var(--color-gray-200)] flex items-center justify-center"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[var(--color-gray-600)]"> <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path> <circle cx="12" cy="7" r="4"></circle> </svg> </div> <div class="flex-1 min-w-0"> <p class="text-sm font-medium text-[var(--color-gray-900)] truncate">Admin</p> </div> <form action="/api/auth/logout" method="POST" id="logout-form"> <button type="submit" class="p-2 hover:bg-[var(--color-gray-100)] rounded-lg transition-colors" title="Sign out"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[var(--color-gray-500)]"> <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path> <polyline points="16 17 21 12 16 7"></polyline> <line x1="21" y1="12" x2="9" y2="12"></line> </svg> </button> </form> </div> </div> </aside> <!-- Main Content --> <main class="flex-1 ml-64"> <div class="p-8"> ${renderSlot($$result, $$slots["default"])} </div> </main> </div> ${renderScript($$result, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/layouts/DashboardLayout.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/layouts/DashboardLayout.astro", void 0);

export { $$DashboardLayout as $, AuthGuard as A };
