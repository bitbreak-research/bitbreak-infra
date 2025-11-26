import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

interface AlertProps {
  type?: 'error' | 'success' | 'info'
  message: string
  children?: JSX.Element
}

export default function Alert(props: AlertProps) {
  return (
    <Show when={props.message}>
      <div
        role="alert"
        class="py-2 px-3 text-sm text-gray-600 border-l-2 border-gray-400"
      >
        {props.message}
        {props.children}
      </div>
    </Show>
  )
}

