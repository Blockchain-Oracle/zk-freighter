const userAgent = process.env.npm_config_user_agent ?? ''

if (!userAgent.includes('pnpm/')) {
  console.error('Use pnpm for this workspace. Run `pnpm install`, not npm or yarn.')
  process.exit(1)
}
