import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ['label', 'error', 'class', 'id'])
  const inputId = local.id || (local.label ? `input-${local.label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
  
  return (
    <div class="space-y-1.5">
      {local.label && (
        <label for={inputId} class="block text-sm font-medium text-[var(--color-gray-700)]">
          {local.label}
        </label>
      )}
      <input
        {...rest}
        id={inputId}
        class={`input ${local.error ? 'border-[var(--color-error)] focus:border-[var(--color-error)]' : ''} ${local.class || ''}`}
      />
      {local.error && (
        <p class="text-sm text-[var(--color-error)]">{local.error}</p>
      )}
    </div>
  )
}
