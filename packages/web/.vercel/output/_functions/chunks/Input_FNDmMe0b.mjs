import { ssr, ssrHydrationKey, ssrAttribute, escape, ssrElement, mergeProps } from 'solid-js/web';
import { splitProps } from 'solid-js';

var _tmpl$ = ["<div", ' class="space-y-1.5"><!--$-->', "<!--/-->", "<!--$-->", "<!--/--></div>"], _tmpl$2 = ["<label", ' class="block text-sm font-medium text-[var(--color-gray-700)]">', "</label>"], _tmpl$3 = ["<p", ' class="text-sm text-[var(--color-error)]">', "</p>"];
function Input(props) {
  const [local, rest] = splitProps(props, ["label", "error", "class", "id"]);
  const inputId = local.id || (local.label ? `input-${local.label.toLowerCase().replace(/\s+/g, "-")}` : void 0);
  return ssr(_tmpl$, ssrHydrationKey(), local.label && ssr(_tmpl$2, ssrHydrationKey() + ssrAttribute("for", escape(inputId, true), false), escape(local.label)), ssrElement("input", mergeProps(rest, {
    id: inputId,
    get ["class"]() {
      return `input ${local.error ? "border-[var(--color-error)] focus:border-[var(--color-error)]" : ""} ${local.class || ""}`;
    }
  }), void 0, false), local.error && ssr(_tmpl$3, ssrHydrationKey(), escape(local.error)));
}

export { Input as I };
