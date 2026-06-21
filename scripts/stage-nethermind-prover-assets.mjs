import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

const repoRoot = process.cwd()
const referenceRoot = join(repoRoot, 'reference/stellar-private-payments')
const sourceCircuitDir = join(referenceRoot, 'target/circuits-artifacts/release')
const sourceKeyDir = join(referenceRoot, 'deployments/testnet/circuit_keys')
const sourceDistDir = join(referenceRoot, 'dist')
const publicRoot = join(repoRoot, 'apps/web/public')
const managedDirs = ['js', 'circuits', 'circuit_keys', 'nethermind']

const files = [
  {
    src: join(sourceDistDir, 'js/prover-worker.js'),
    dest: join(publicRoot, 'js/prover-worker.js'),
  },
  {
    src: join(sourceDistDir, 'js/prover-worker_bg.wasm'),
    dest: join(publicRoot, 'js/prover-worker_bg.wasm'),
  },
  { src: join(sourceDistDir, 'js/web.js'), dest: join(publicRoot, 'js/web.js') },
  { src: join(sourceDistDir, 'js/web_bg.wasm'), dest: join(publicRoot, 'js/web_bg.wasm') },
  { src: join(sourceDistDir, 'js/storage-worker.js'), dest: join(publicRoot, 'js/storage-worker.js') },
  {
    src: join(sourceDistDir, 'js/storage-worker_bg.wasm'),
    dest: join(publicRoot, 'js/storage-worker_bg.wasm'),
  },
  {
    src: join(sourceCircuitDir, 'policy_tx_2_2.wasm'),
    dest: join(publicRoot, 'circuits/policy_tx_2_2.wasm'),
  },
  {
    src: join(sourceCircuitDir, 'policy_tx_2_2.r1cs'),
    dest: join(publicRoot, 'circuits/policy_tx_2_2.r1cs'),
  },
  {
    src: join(sourceCircuitDir, 'selectiveDisclosure_1.wasm'),
    dest: join(publicRoot, 'circuits/selectiveDisclosure_1.wasm'),
  },
  {
    src: join(sourceCircuitDir, 'selectiveDisclosure_1.r1cs'),
    dest: join(publicRoot, 'circuits/selectiveDisclosure_1.r1cs'),
  },
  {
    src: join(sourceKeyDir, 'policy_tx_2_2_proving_key.bin'),
    dest: join(publicRoot, 'circuit_keys/policy_tx_2_2_proving_key.bin'),
  },
  {
    src: join(sourceKeyDir, 'policy_tx_2_2_vk.json'),
    dest: join(publicRoot, 'circuit_keys/policy_tx_2_2_vk.json'),
  },
  {
    src: join(sourceKeyDir, 'policy_tx_2_2_vk_soroban.bin'),
    dest: join(publicRoot, 'circuit_keys/policy_tx_2_2_vk_soroban.bin'),
  },
]

const missing = files.filter((file) => !existsSync(file.src))

if (missing.length > 0) {
  console.error('Cannot stage Nethermind prover assets. Missing required files:')
  for (const file of missing) {
    console.error(`- ${file.src}`)
  }
  console.error('Run `cargo build -p circuits --release` and `make release` in reference/stellar-private-payments first.')
  process.exit(1)
}

for (const dir of managedDirs) {
  rmSync(join(publicRoot, dir), { force: true, recursive: true })
}

for (const file of files) {
  mkdirSync(dirname(file.dest), { recursive: true })
  copyFileSync(file.src, file.dest)
}

console.log(`Staged ${files.length} Nethermind prover assets into ${publicRoot}`)
