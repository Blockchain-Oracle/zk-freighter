#!/usr/bin/env node
// Trigger Coolify redeploys via the REST API. Reads config from env:
//   COOLIFY_URL    — https://coolify.<host>
//   COOLIFY_TOKEN  — API token with Deploy permission (Keys & Tokens in the UI)
//   COOLIFY_UUID_<SERVICE> — per-service application UUID
// Usage: node scripts/coolify-deploy.mjs [all|<service> ...] [--force]
// See docs/deploy/coolify.md.

const services = {
  landing: process.env.COOLIFY_UUID_LANDING,
  web: process.env.COOLIFY_UUID_WEB,
  mobile: process.env.COOLIFY_UUID_MOBILE,
  docs: process.env.COOLIFY_UUID_DOCS,
  funding: process.env.COOLIFY_UUID_FUNDING,
  bootnode: process.env.COOLIFY_UUID_BOOTNODE,
  'bootnode-mainnet': process.env.COOLIFY_UUID_BOOTNODE_MAINNET,
}

const base = process.env.COOLIFY_URL?.replace(/\/+$/, '')
const token = process.env.COOLIFY_TOKEN
if (!base || !token) {
  console.error('Set COOLIFY_URL and COOLIFY_TOKEN. See docs/deploy/coolify.md.')
  process.exit(1)
}

const args = process.argv.slice(2)
const force = args.includes('--force')
const names = args.filter((a) => a !== '--force')
const targets = names.length === 0 || names.includes('all') ? Object.keys(services) : names

let failures = 0
for (const name of targets) {
  const uuid = services[name]
  if (!uuid) {
    console.error(`✗ ${name}: no UUID (set COOLIFY_UUID_${name.toUpperCase().replace(/-/g, '_')})`)
    failures += 1
    continue
  }
  const url = `${base}/api/v1/deploy?uuid=${encodeURIComponent(uuid)}&force=${force}`
  try {
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      console.error(`✗ ${name}: HTTP ${res.status} ${await res.text()}`)
      failures += 1
    } else {
      console.log(`✓ ${name}: deploy triggered${force ? ' (force)' : ''}`)
    }
  } catch (error) {
    console.error(`✗ ${name}: ${error instanceof Error ? error.message : error}`)
    failures += 1
  }
}

process.exit(failures > 0 ? 1 : 0)
