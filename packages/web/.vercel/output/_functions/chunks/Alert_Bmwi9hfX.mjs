import { ssrElement, mergeProps, escape, ssr, ssrHydrationKey, createComponent, ssrAttribute } from 'solid-js/web';
import { splitProps, Show } from 'solid-js';

var _tmpl$$1 = ["<svg", ' class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>'];
function Button(props) {
  const [local, rest] = splitProps(props, ["loading", "variant", "size", "children", "class", "disabled"]);
  const sizeStyles = {
    sm: "py-2 px-3 text-xs",
    md: "py-2.5 px-4 text-sm",
    lg: "py-3 px-6 text-base"
  };
  const variantStyles = {
    primary: "bg-[var(--color-gray-900)] text-white hover:bg-[var(--color-black)]",
    secondary: "bg-[var(--color-gray-100)] text-[var(--color-gray-900)] border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-200)]",
    danger: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]",
    ghost: "bg-transparent text-[var(--color-gray-600)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-900)]"
  };
  const baseStyles = "w-full font-medium rounded-[var(--radius-md)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";
  return ssrElement("button", mergeProps(rest, {
    get disabled() {
      return local.disabled || local.loading;
    },
    get ["class"]() {
      return `${baseStyles} ${sizeStyles[local.size || "md"]} ${variantStyles[local.variant || "primary"]} ${local.class || ""}`;
    }
  }), () => local.loading ? escape([ssr(_tmpl$$1, ssrHydrationKey()), "Loading..."]) : escape(local.children), true);
}

var _tmpl$ = ["<div", ' role="alert" class="', '"><svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"', '></path></svg><div class="text-sm"><!--$-->', "<!--/--><!--$-->", "<!--/--></div></div>"];
function Alert(props) {
  const typeStyles = {
    error: "bg-red-50 border-[var(--color-error)] text-red-700",
    success: "bg-green-50 border-[var(--color-success)] text-green-700",
    warning: "bg-amber-50 border-[var(--color-warning)] text-amber-700",
    info: "bg-blue-50 border-blue-500 text-blue-700"
  };
  const iconPaths = {
    error: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  };
  return createComponent(Show, {
    get when() {
      return props.message || props.children;
    },
    get children() {
      return ssr(_tmpl$, ssrHydrationKey(), `flex items-start gap-3 p-4 rounded-[var(--radius-md)] border-l-4 ${escape(typeStyles[props.type || "info"], true)}`, ssrAttribute("d", escape(iconPaths[props.type || "info"], true), false), escape(props.message), escape(props.children));
    }
  });
}

export { Alert as A, Button as B };
