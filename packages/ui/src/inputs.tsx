import { fontMono } from './tokens'
import { Chip } from './primitives'

/** Large centered amount field with an asset symbol, optional caption, Max and presets. */
export function AmountInput({
  value,
  onChange,
  asset,
  caption,
  onMax,
  presets,
  onPreset,
  autoFocus,
  invalid,
}: {
  value: string
  onChange: (value: string) => void
  asset: string
  caption?: string
  onMax?: () => void
  presets?: readonly string[]
  onPreset?: (value: string) => void
  autoFocus?: boolean
  invalid?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, maxWidth: '100%' }}>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          inputMode="decimal"
          autoFocus={autoFocus}
          aria-label={`${asset} amount`}
          style={{
            width: `${Math.max(1, value.length || 1)}ch`,
            maxWidth: '7ch',
            background: 'none',
            border: 'none',
            outline: 'none',
            textAlign: 'right',
            fontFamily: 'inherit',
            fontWeight: 800,
            fontSize: 46,
            letterSpacing: '-.03em',
            color: invalid ? 'var(--warn)' : 'var(--tx)',
            fontVariantNumeric: 'tabular-nums',
            padding: 0,
          }}
        />
        <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--tx2)', fontFamily: fontMono }}>{asset}</span>
      </div>
      {caption ? <div style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{caption}</div> : null}
      {onMax ? (
        <button
          type="button"
          onClick={onMax}
          style={{
            marginTop: 2,
            padding: '3px 11px',
            borderRadius: 999,
            border: '1px solid var(--bd)',
            background: 'var(--card)',
            color: 'var(--tx2)',
            fontSize: 10.5,
            fontFamily: fontMono,
            letterSpacing: '.06em',
            cursor: 'pointer',
          }}
        >
          MAX
        </button>
      ) : null}
      {presets && presets.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {presets.map((preset) => (
            <Chip key={preset} label={preset} onClick={() => onPreset?.(preset)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export interface SegmentedOption {
  readonly value: string
  readonly label: string
}

/** Generic n-segment toggle (Shielded|Public, Transfer|Deposit|Withdraw, Light|Dark). */
export function Segmented({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: readonly SegmentedOption[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        gap: 3,
        background: 'var(--card)',
        border: '1px solid var(--bd)',
        borderRadius: 11,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              padding: size === 'sm' ? '6px 12px' : '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: size === 'sm' ? 12 : 13,
              fontWeight: 600,
              background: selected ? 'var(--ac)' : 'transparent',
              color: selected ? '#fff' : 'var(--tx2)',
              transition: 'background .15s ease',
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export interface AssetOption {
  readonly code: string
  readonly sublabel?: string
}

/** Segmented selector for picking the shielded asset (XLM / USDC). */
export function AssetSelector({
  options,
  value,
  onChange,
}: {
  options: readonly AssetOption[]
  value: string
  onChange: (code: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {options.map((option) => {
        const selected = option.code === value
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => onChange(option.code)}
            style={{
              flex: 1,
              textAlign: 'left',
              padding: '12px 14px',
              borderRadius: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: selected ? '1px solid var(--ac)' : '1px solid var(--bd)',
              background: selected ? 'rgba(94,124,250,.08)' : 'var(--card)',
              color: 'var(--tx)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>{option.code}</div>
            {option.sublabel ? (
              <div style={{ marginTop: 3, fontSize: 11, color: 'var(--tx3)', fontFamily: fontMono }}>
                {option.sublabel}
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
