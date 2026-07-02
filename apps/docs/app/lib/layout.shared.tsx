import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

function CoinMark() {
  return (
    <span
      aria-hidden
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        flex: 'none',
        border: '1px solid rgba(255,255,255,.12)',
        boxShadow: '0 8px 22px -8px rgba(94,124,250,.6)',
      }}
    >
      <span style={{ flex: 1, background: '#1b1a24' }} />
      <span style={{ flex: 1, background: 'linear-gradient(135deg,#8a9bff,#5E7CFA)' }} />
    </span>
  )
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <CoinMark />
          <span style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>ZK Fighter</span>
        </>
      ),
    },
    githubUrl: 'https://github.com/Blockchain-Oracle/zk-fighter',
    themeSwitch: { enabled: false },
  }
}
