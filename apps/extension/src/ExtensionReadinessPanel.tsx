import { phase11ExtensionReadiness } from '@zk-fighter/core'

export function ExtensionReadinessPanel() {
  return (
    <section className="panel" aria-labelledby="status-heading">
      <h2 id="status-heading">Extension readiness</h2>
      {phase11ExtensionReadiness.capabilities.map((capability) => (
        <div className="status-row" key={capability.id}>
          <div>
            <p className="label">{capability.label}</p>
            <p className="copy">{capability.evidence}</p>
          </div>
          <span className={`badge badge-${capability.status}`}>{capability.status}</span>
        </div>
      ))}
    </section>
  )
}
