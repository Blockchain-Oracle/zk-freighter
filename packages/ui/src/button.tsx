import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Spinner } from './proving'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tertiary'

const VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--ac)', color: '#fff', border: 'none', boxShadow: 'var(--shadow-glow)' },
  secondary: { background: 'var(--card)', color: 'var(--tx)', border: '1px solid var(--bd)' },
  ghost: { background: 'none', color: 'var(--tx2)', border: 'none' },
  danger: { background: 'var(--dng)', color: '#fff', border: 'none' },
  tertiary: { background: 'none', color: 'var(--ac)', border: 'none' },
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly variant?: ButtonVariant
  readonly loading?: boolean
  readonly fullWidth?: boolean
  readonly children: ReactNode
}

/** Shared action button (primary/secondary/ghost) with a built-in loading state. */
export function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '12px 18px',
        borderRadius: 11,
        fontSize: 13.5,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.55 : 1,
        width: fullWidth ? '100%' : 'auto',
        ...VARIANT_STYLE[variant],
        ...style,
      }}
    >
      {loading ? <Spinner size={15} color={variant === 'primary' || variant === 'danger' ? '#fff' : 'var(--ac)'} /> : null}
      {children}
    </button>
  )
}
