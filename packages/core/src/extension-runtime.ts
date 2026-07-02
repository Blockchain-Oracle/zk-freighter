export type ExtensionCapabilityStatus = 'ready' | 'in-progress' | 'deferred'

export interface ExtensionCapability {
  readonly id: string
  readonly label: string
  readonly status: ExtensionCapabilityStatus
  readonly evidence: string
  readonly caveat: string
}

export interface ExtensionReadiness {
  readonly phase: 'Phase 11'
  readonly surface: 'WXT MV3 extension'
  readonly judgedSurface: 'web + extension popup'
  readonly status: 'in-progress'
  readonly summary: string
  readonly capabilities: readonly ExtensionCapability[]
}

export const phase11ExtensionReadiness = {
  phase: 'Phase 11',
  surface: 'WXT MV3 extension',
  judgedSurface: 'web + extension popup',
  status: 'in-progress',
  summary:
    'The extension popup reuses ZK Freighter core and has Chrome runtime evidence for prover packaging, XLM and USDC QuickShield, and the native bridge route. It is a compact wallet surface, not a general public dApp signing wallet.',
  capabilities: [
    {
      id: 'shared-core',
      label: 'Shared wallet core',
      status: 'ready',
      evidence: '@zk-freighter/core is the only wallet/domain dependency for extension surfaces.',
      caveat: 'No separate extension wallet implementation is allowed.',
    },
    {
      id: 'wxt-build',
      label: 'WXT MV3 packaging',
      status: 'ready',
      evidence: 'WXT chrome-mv3 production build passes and emits popup, background, content script, and offscreen page.',
      caveat: 'Packaging readiness does not prove extension proof generation.',
    },
    {
      id: 'chrome-runtime-smoke',
      label: 'Chrome runtime smoke',
      status: 'ready',
      evidence:
        'Chrome for Testing 150 loaded the unpacked extension; popup mobile routes rendered; background/offscreen messaging passed.',
      caveat: 'This used a temporary Chrome-for-Testing profile, not a Chrome Web Store install.',
    },
    {
      id: 'prover-runtime',
      label: 'Browser prover in extension runtime',
      status: 'ready',
      evidence:
        'Chrome-for-Testing deep runtime harness generated a dry XLM deposit proof in the extension offscreen context after ephemeral testnet ASP insertion.',
      caveat: 'The dry run stopped before submitting a deposit transaction; MV3 background remains a coordinator.',
    },
    {
      id: 'passkey-runtime',
      label: 'Passkey ceremony',
      status: 'deferred',
      evidence: 'Phone/browser PRF support is not claimed for extension yet.',
      caveat: 'Run in a full extension page/tab, not a transient popup, before making a support claim.',
    },
    {
      id: 'dapp-profile',
      label: 'dApp detection profile',
      status: 'ready',
      evidence:
        'Freighter-style connection and network-detail responses are covered by a Chrome runtime harness; public-key access and signing fail closed.',
      caveat: 'This does not claim Wallets Kit branding, external public address sharing, or coexistence behavior with Freighter installed.',
    },
    {
      id: 'external-signing',
      label: 'External dApp signing',
      status: 'deferred',
      evidence:
        'A local signing spike verified feasibility, but the product direction is QuickShield and bridge, not a Freighter replacement.',
      caveat: 'External transaction/auth/message signing must stay disabled unless a later product decision reverses this.',
    },
    {
      id: 'quickshield-bridge',
      label: 'QuickShield and bridge companion',
      status: 'ready',
      evidence:
        'Chrome-for-Testing harnesses submitted real XLM and USDC QuickShield deposits and verified the extension-native bridge route renders funding, destination, and resume controls.',
      caveat:
        'The extension USDC path uses a reusable local testnet funder in the harness; extension-native Ethereum provider access and full bridge execution remain deferred.',
    },
  ],
} as const satisfies ExtensionReadiness

export function extensionReadinessDigest(readiness: ExtensionReadiness = phase11ExtensionReadiness): string {
  return [
    `${readiness.phase}: ${readiness.surface}`,
    `Status: ${readiness.status}`,
    `Judged surface: ${readiness.judgedSurface}`,
    readiness.summary,
    ...readiness.capabilities.map(
      (capability) =>
        `${capability.label}: ${capability.status}. Evidence: ${capability.evidence} Caveat: ${capability.caveat}`,
    ),
  ].join('\n')
}
