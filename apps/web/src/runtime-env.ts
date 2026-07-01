type RuntimeEnv = Record<string, string | undefined>
type RuntimeGlobal = typeof globalThis & {
  __ZKF_CONFIG__?: RuntimeEnv
}

(globalThis as RuntimeGlobal).__ZKF_CONFIG__ = {
  ...(globalThis as RuntimeGlobal).__ZKF_CONFIG__,
  ...import.meta.env,
}
