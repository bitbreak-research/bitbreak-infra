import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary'
}

export default function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['loading', 'variant', 'children', 'class', 'disabled'])
  
  const baseStyles = 'w-full py-3 px-4 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-black text-white hover:bg-gray-800',
    secondary: 'bg-white text-black border border-gray-300 hover:bg-gray-50'
  }
  
  return (
    <button
      {...rest}
      disabled={local.disabled || local.loading}
      class={`${baseStyles} ${variants[local.variant || 'primary']} ${local.class || ''}`}
    >
      {local.loading ? 'Loading...' : local.children}
    </button>
  )
}

