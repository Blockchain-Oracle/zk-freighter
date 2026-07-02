const userAgent = process.env.npm_config_user_agent ?? ''

// Reject only an explicit npm/yarn invocation. pnpm sets `pnpm/` in the agent;
// corepack shims and some CI/Docker builds leave it empty — those are allowed so
// the guard never blocks a legitimate pnpm install in a build image.
if (/\b(?:npm|yarn)\//u.test(userAgent) && !userAgent.includes('pnpm/')) {
  console.error('Use pnpm for this workspace. Run `pnpm install`, not npm or yarn.')
  process.exit(1)
}
