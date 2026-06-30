const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const COLORS = ['var(--bd2)', 'var(--dng)', 'var(--warn)', 'var(--ac2)', 'var(--pos)']

/** 0–4 heuristic: length, length again, letters+digits, and a symbol. */
function score(password: string): number {
  if (!password) return 0
  let value = 0
  if (password.length >= 8) value++
  if (password.length >= 12) value++
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) value++
  if (/[^a-zA-Z0-9]/.test(password)) value++
  return Math.min(4, value)
}

/** Four-segment password strength meter with a label (Weak/Fair/Good/Strong). */
export function PasswordStrength({ password }: { password: string }) {
  const value = score(password)
  const color = COLORS[value]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
      {[0, 1, 2, 3].map((index) => (
        <span key={index} style={{ flex: 1, height: 4, borderRadius: 2, background: index < value ? color : 'var(--bd2)' }} />
      ))}
      {value > 0 ? <span style={{ font: '600 9.5px/1 var(--sans)', color, marginLeft: 4 }}>{LABELS[value]}</span> : null}
    </div>
  )
}
