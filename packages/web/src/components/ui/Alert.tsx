import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

interface AlertProps {
  type?: 'error' | 'success' | 'info' | 'warning'
  message?: string
  children?: JSX.Element
}

export default function Alert(props: AlertProps) {
  const typeStyles = {
    error: 'bg-red-50 border-[var(--color-error)] text-red-700',
    success: 'bg-green-50 border-[var(--color-success)] text-green-700',
    warning: 'bg-amber-50 border-[var(--color-warning)] text-amber-700',
    info: 'bg-blue-50 border-blue-500 text-blue-700'
  }

  const iconPaths = {
    error: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }

  return (
    <Show when={props.message || props.children}>
      <div
        role="alert"
        class={`flex items-start gap-3 p-4 rounded-[var(--radius-md)] border-l-4 ${typeStyles[props.type || 'info']}`}
      >
        <svg 
          class="w-5 h-5 flex-shrink-0 mt-0.5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d={iconPaths[props.type || 'info']}
          />
        </svg>
        <div class="text-sm">
          {props.message}
          {props.children}
        </div>
      </div>
    </Show>
  )
}
