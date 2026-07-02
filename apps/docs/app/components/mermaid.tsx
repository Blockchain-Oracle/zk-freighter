import { useEffect, useId, useState } from 'react'

const brandTheme = {
  theme: 'base' as const,
  themeVariables: {
    darkMode: true,
    background: '#0c0d0f',
    fontFamily: "'Hanken Grotesk', ui-sans-serif, sans-serif",
    fontSize: '14px',
    primaryColor: '#1a1c22',
    primaryTextColor: '#f3f4f6',
    primaryBorderColor: '#5E7CFA',
    secondaryColor: '#141519',
    secondaryTextColor: '#9aa0a9',
    secondaryBorderColor: 'rgba(255,255,255,.13)',
    tertiaryColor: '#141519',
    tertiaryTextColor: '#9aa0a9',
    tertiaryBorderColor: 'rgba(255,255,255,.09)',
    lineColor: '#5E7CFA',
    textColor: '#f3f4f6',
    mainBkg: '#1a1c22',
    nodeBorder: '#5E7CFA',
    clusterBkg: '#141519',
    clusterBorder: 'rgba(255,255,255,.13)',
    edgeLabelBackground: '#141519',
    actorBkg: '#1a1c22',
    actorBorder: '#5E7CFA',
    actorTextColor: '#f3f4f6',
    signalColor: '#9aa0a9',
    signalTextColor: '#c9cdd6',
    labelBoxBkgColor: '#141519',
    labelBoxBorderColor: 'rgba(255,255,255,.13)',
    labelTextColor: '#f3f4f6',
    loopTextColor: '#9aa0a9',
    noteBkgColor: '#202329',
    noteTextColor: '#e5b45c',
    noteBorderColor: 'rgba(229,180,92,.4)',
  },
}

export function Mermaid({ chart }: { readonly chart: string }) {
  const rawId = useId()
  const [svg, setSvg] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const id = `zkfm${rawId.replace(/[^a-zA-Z0-9]/gu, '')}`
    void import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', ...brandTheme })
        const rendered = await mermaid.render(id, chart)
        if (alive) setSvg(rendered.svg)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [chart, rawId])

  if (failed) {
    return (
      <pre className="zkf-mermaid text-xs whitespace-pre-wrap">
        <code>{chart}</code>
      </pre>
    )
  }
  if (!svg) return <div className="zkf-mermaid text-fd-muted-foreground text-sm">Rendering diagram…</div>
  return <div className="zkf-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}
