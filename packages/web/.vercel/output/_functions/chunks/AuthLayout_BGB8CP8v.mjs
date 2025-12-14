import { e as createComponent, f as createAstro, l as renderHead, n as renderSlot, r as renderTemplate } from './astro/server_HrKuE-E2.mjs';
/* empty css                           */

const $$Astro = createAstro();
const $$AuthLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AuthLayout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="utf-8"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} - BitBreak</title>${renderHead()}</head> <body class="min-h-screen bg-[var(--color-gray-50)]"> <main class="min-h-screen flex items-center justify-center p-4"> <div class="w-full max-w-[400px]"> <!-- Logo --> <div class="text-center mb-8"> <a href="/" class="inline-flex flex-col items-center"> <div class="w-12 h-12 rounded-xl bg-[var(--color-gray-900)] flex items-center justify-center"> <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"> <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect> <line x1="8" y1="21" x2="16" y2="21"></line> <line x1="12" y1="17" x2="12" y2="21"></line> </svg> </div> </a> <h1 class="mt-4 text-xl font-semibold text-[var(--color-gray-900)]">BitBreak</h1> <p class="mt-1 text-sm text-[var(--color-gray-500)]">Infrastructure Management</p> </div> <!-- Content Card --> <div class="bg-white rounded-[var(--radius-lg)] border border-[var(--color-gray-200)] p-8 shadow-sm"> ${renderSlot($$result, $$slots["default"])} </div> </div> </main> </body></html>`;
}, "/Users/danielesposito/Proyectos/BB/infra/bitbreak-infra/packages/web/src/layouts/AuthLayout.astro", void 0);

export { $$AuthLayout as $ };
