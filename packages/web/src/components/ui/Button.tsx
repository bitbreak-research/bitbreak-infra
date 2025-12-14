import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['loading', 'variant', 'size', 'children', 'class', 'disabled'])
  
  const sizeStyles = {
    sm: 'py-2 px-3 text-xs',
    md: 'py-2.5 px-4 text-sm',
    lg: 'py-3 px-6 text-base'
  }
  
  const variantStyles = {
    primary: 'bg-[var(--color-gray-900)] text-white hover:bg-[var(--color-black)]',
    secondary: 'bg-[var(--color-gray-100)] text-[var(--color-gray-900)] border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-200)]',
    danger: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]',
    ghost: 'bg-transparent text-[var(--color-gray-600)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-900)]'
  }
  
  const baseStyles = 'w-full font-medium rounded-[var(--radius-md)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
  
  return (
    <button
      {...rest}
      disabled={local.disabled || local.loading}
      class={`${baseStyles} ${sizeStyles[local.size || 'md']} ${variantStyles[local.variant || 'primary']} ${local.class || ''}`}
    >
      {local.loading ? (
        <>
          <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : local.children}
    </button>
  )
}
