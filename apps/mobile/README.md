# ZK Fighter Mobile

Capacitor mobile shell for ZK Fighter on Android and iOS.

This app is not a hosted web URL wrapper. It builds the React/Vite mobile surface into `dist`, then Capacitor syncs those assets into native Android and iOS projects. Wallet logic must stay in shared packages such as `@zk-fighter/core` and `@zk-fighter/ui`.

## Current Checkpoint

The current checkpoint is the real mobile shell plus runtime viability:

- Encrypted vault create/import/unlock using `@zk-fighter/core`.
- Home, Receive, Activity, More, Settings, network switching, and Sync now.
- Public balances are read from Horizon; Activity records are real local records only.
- Shielded balances load only through explicit Sync now to avoid background OPFS pressure.
- Runtime readiness checks WebCrypto, workers, WebAssembly, static proof assets, and Nethermind module init.

Do not claim mobile shield/proof support until this runtime gate is run on real Android and iOS devices or simulators and evidence is recorded.

## Commands

```bash
pnpm mobile:dev
pnpm mobile:dev:https
pnpm mobile:build
pnpm mobile:sync
pnpm mobile:android
pnpm mobile:ios
pnpm mobile:android:build
pnpm mobile:android:install
pnpm mobile:ios:open
```

`pnpm mobile:android:install` installs the debug APK onto the first connected Android device reported by `adb devices`.

## Phone Browser Preview (trusted HTTPS tunnel)

A phone opening `http://<mac-lan-ip>:4183` is not a secure context, so Web Crypto
APIs used by vault creation and proof setup are unavailable. `pnpm mobile:dev:https`
(Vite's self-signed SSL) restores the secure context but the phone browser rejects
the untrusted certificate. The working path is a Cloudflare quick tunnel with
same-origin API proxying:

```bash
# terminal 1 — funding + bootnode services must already be running locally
pnpm --filter @zk-fighter/mobile dev:phone   # serves 4183 with /zkf-* proxies to local services

# terminal 2
pnpm --filter @zk-fighter/mobile tunnel      # prints https://<random>.trycloudflare.com
```

Open the printed `https://….trycloudflare.com` URL on the phone. The page is a
trusted secure context, and the app's funding/bootnode calls go to same-origin
`/zkf-funding`, `/zkf-bootnode-testnet/rpc`, and `/zkf-bootnode-mainnet/rpc`
paths that the dev server proxies to the local services — no mixed content, no
certificate warnings. Fresh tunnel hostnames can take a minute to resolve on
some DNS providers.

Native Capacitor builds do not use the LAN browser origin and should be tested
with `pnpm mobile:ios` or `pnpm mobile:android`.

## iOS Setup

Full Xcode is required for Simulator and physical iPhone testing. The recommended install path is the Mac App Store:

1. Open Xcode in the Mac App Store and install it.
2. After install, run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
```

3. Open the iOS native project:

```bash
pnpm mobile:ios:open
```

4. In Xcode, select a Simulator first. For Abu's iPhone, plug it in, trust the computer, select the device, and use automatic signing with an Apple ID/team.

## Android Setup

Android CLI builds use the installed command-line tools and OpenJDK 21. To test on a phone:

```bash
adb devices
pnpm mobile:android:install
```

If `adb devices` is empty, enable Developer Options and USB debugging on the phone.

## Environment

Copy `.env.example` to `.env.local` for local development when mobile needs funding or bootnode services. The variable names match the web and extension builds:

- `VITE_ZKF_TESTNET_FUNDING_API_URL`
- `VITE_ZKF_TESTNET_BOOTNODE_URL`
- `VITE_ZKF_MAINNET_BOOTNODE_URL`

For a physical phone, do not use `127.0.0.1` in `.env.local`; that points at the phone. Use the Mac's LAN IP instead, for example:

```bash
VITE_ZKF_TESTNET_FUNDING_API_URL=http://192.168.18.4:8787
VITE_ZKF_TESTNET_BOOTNODE_URL=http://192.168.18.4:8788/rpc
VITE_ZKF_MAINNET_BOOTNODE_URL=http://192.168.18.4:8789/rpc
```

Then rebuild and sync the native app:

```bash
pnpm mobile:build
pnpm mobile:sync
```

Mainnet demo funding is intentionally unavailable.
