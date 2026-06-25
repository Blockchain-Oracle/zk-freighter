import type { CctpSourceKey, EvmCctpSourceConfig } from '@zk-fighter/core'

interface BridgeSourceSelectorProps {
  readonly sources: readonly EvmCctpSourceConfig[]
  readonly selectedKey: CctpSourceKey
  readonly disabled: boolean
  readonly onSelect: (sourceKey: CctpSourceKey) => void
}

export function BridgeSourceSelector({ sources, selectedKey, disabled, onSelect }: BridgeSourceSelectorProps) {
  return (
    <fieldset className="bridge-source-grid" disabled={disabled}>
      <legend>Source chain</legend>
      {sources.map((source) => (
        <label className={source.key === selectedKey ? 'selected' : ''} key={source.key}>
          <input
            type="radio"
            name="cctp-source-chain"
            value={source.key}
            checked={source.key === selectedKey}
            onChange={() => onSelect(source.key)}
          />
          <span>{source.label}</span>
          <small>
            {source.gasToken} gas · domain {source.domain}
          </small>
        </label>
      ))}
    </fieldset>
  )
}
