import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ['label', 'error', 'class', 'id'])
  const inputId = local.id || `input-${local.label.toLowerCase().replace(/\s+/g, '-')}`
  
  return (
    <div class="space-y-1">
      <label for={inputId} class="block text-sm text-gray-600">
        {local.label}
      </label>
      <input
        {...rest}
        id={inputId}
        class={`w-full py-2 px-0 text-base bg-transparent border-0 border-b border-gray-300 focus:border-black focus:outline-none transition-colors ${local.error ? 'border-red-500' : ''} ${local.class || ''}`}
      />
      {local.error && (
        <p class="text-sm text-gray-500">{local.error}</p>
      )}
    </div>
  )
}

