import { phase11ExtensionReadiness } from '@zk-fighter/core'

import { Badge, Copy, Panel, SectionHeader } from './extension-ui'

function tone(status: string): 'ready' | 'deferred' | 'progress' {
  if (status === 'ready') return 'ready'
  if (status === 'in-progress') return 'progress'
  return 'deferred'
}

export function ExtensionReadinessPanel() {
  return (
    <Panel label="Extension readiness">
      <SectionHeader title="Extension readiness" />
      {phase11ExtensionReadiness.capabilities.map((capability) => (
        <div key={capability.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{capability.label}</div>
            <Copy>{capability.evidence}</Copy>
          </div>
          <span style={{ marginLeft: 'auto', flex: 'none' }}>
            <Badge tone={tone(capability.status)}>{capability.status}</Badge>
          </span>
        </div>
      ))}
    </Panel>
  )
}
