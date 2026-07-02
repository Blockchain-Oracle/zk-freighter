import type { CSSProperties } from 'react'
import type { AssetCode, CctpSourceKey } from '@zk-freighter/core'

const baseStyle: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  display: 'inline-grid',
  placeItems: 'center',
  flex: 'none',
  overflow: 'hidden',
  background: 'var(--card2)',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)',
}

export function AssetMark({ asset, size = 26 }: { readonly asset: AssetCode; readonly size?: number }) {
  return (
    <span aria-hidden="true" style={{ ...baseStyle, width: size, height: size }}>
      <img src={`/asset-icons/${asset === 'USDC' ? 'usdc' : 'xlm'}.svg`} alt="" style={{ width: size, height: size, display: 'block' }} />
    </span>
  )
}

const chainIcon: Record<CctpSourceKey, string> = {
  ethereum: 'ethereum',
  base: 'base',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
}

export function ChainMark({ chain, size = 26 }: { readonly chain: CctpSourceKey; readonly size?: number }) {
  return (
    <span aria-hidden="true" style={{ ...baseStyle, width: size, height: size }}>
      <img src={`/asset-icons/${chainIcon[chain]}.svg`} alt="" style={{ width: size, height: size, display: 'block', objectFit: 'contain', padding: chain === 'base' ? 2 : 0, boxSizing: 'border-box' }} />
    </span>
  )
}
