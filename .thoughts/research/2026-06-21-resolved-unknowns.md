# Resolved unknowns (answers, not homework)

These are answers. Where something still needs proving, it is a test **we** run in Phase 0 — never a step you do.

---

## Trustline on withdraw — the definitive answer + the invisible-to-user UX

**The short version: on what we've actually deployed today, there is no trustline problem at all.**

Our live pool moves native XLM (Stellar's built-in currency). Native XLM doesn't use trustlines, so a withdraw is just one button. Even better: if someone withdraws to a brand-new wallet that's never been funded, sending 1 XLM or more *automatically creates that wallet* (a 2026 protocol change, CAP-73). The only rule we enforce is "send at least 1 XLM to a fresh address," and we do that silently in the background.

**A "trustline" only becomes a thing if we later add a USDC pool.** Here's the plain-English mechanics, fully resolved:

- A trustline is just a one-time "yes, I'll accept this dollar-token" flip on a wallet. It costs the wallet owner a refundable 0.5 XLM deposit. Classic tokens like USDC require it; XLM never does.
- **Our pool never needs one.** A smart contract holds USDC as an internal balance number, not via a trustline. So the pool custodies dollars with zero setup.
- The trustline question only ever touches the *person receiving a withdrawal* — and only for USDC, never XLM.

**How we make the word "trustline" never appear to the user:**

1. **Withdrawing to your own wallet (the 99% case):** when you first set up your wallet we quietly enable USDC acceptance in the same step, and we bundle the "enable + receive" into a single tap. One Face-ID / one signature covers both. You never see a second screen.
2. **Withdrawing to someone else's wallet:** we check ahead of time whether their wallet can accept USDC. If it can, it's instant. If it can't, we show a friendly "this address can't receive USDC yet" message *before* you send — instead of a confusing failed transaction after. (We can't silently flip a stranger's wallet; that's a hard protocol rule, not a gap in our build.)
3. **Optional polish:** we can pre-pay that 0.5 XLM deposit for the user so it feels completely free.

**Recommendation:** keep native XLM for the demo — zero trustline UX, sending money feels exactly like Venmo. If a USDC pool is required, steps 1 + 2 keep the experience to a single tap with no jargon.

---

## Concrete ids/addresses (testnet + mainnet) we now have

The user never types any of these. One config block flips the whole app from test to live.

**Testnet USDC**
- Issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
- USDC token contract: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`

**Mainnet USDC**
- Issuer (confirmed): `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- Token contract: Circle doesn't publish this; it's computed automatically from the issuer at startup. **We verify the computed value in Phase 0** (test below).

**Circle CCTP on Stellar mainnet** (the dollar-bridge contracts)
- TokenMessengerMinter: `CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL`
- MessageTransmitter: `CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV`
- CctpForwarder: `CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T`
- Live attestation API: `https://iris-api.circle.com` (Stellar = domain 27, Ethereum = domain 0)

**Privacy pool deployments**
- Testnet (live, native XLM): pool `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`, token `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`, verifier `CBJFCMPURNJM67NOBQTMGPMHYIEQQJ2QHVNXX2RDFUW2PU67HI7X5MSZ`
- Mainnet: **none exists** (the source project is testnet-only by design). So we feature-flag mainnet privacy OFF and offer plain transfers on mainnet until a pool ships.

---

## Key derivation + passkey determinism — confirmed or assigned to a Phase-0 run (ours)

**Confirmed and solid:**
- The recovery scheme uses **one wallet signature** to regenerate *all* the user's private keys. Recovery = "sign one message, keys come back," with nothing secret stored anywhere.
- The exact text that gets signed is version **[v1]** and must stay byte-for-byte identical forever (a single changed character silently produces wrong keys). There's a stale `[v2]` label in a code *comment* (not the real logic) — we'll fix the comment so no future dev trips on it.
- Passkeys (Face-ID-derived keys) produce the **same output every time on the same device** — confirmed by the spec.

**Assigned to a Phase-0 run (ours, not the founder's):**
- Whether a passkey produces the *byte-identical* result on a user's **second / restored device** (iCloud or Google synced) is the one thing no vendor doc guarantees. The risk: the user logs in fine but can't decrypt anything — a silent failure, the worst kind.
- **Mitigation we ship regardless of the test result:** envelope encryption — we never use the passkey output directly as the key; we use it to *unlock* the real key. If a device ever produces a different output, it fails loudly with a "re-enroll" prompt instead of silently showing garbage.

---

## What genuinely needs a Phase-0 run (the exact tests WE will execute, not the founder)

1. **P0-SAC-DERIVE — COMPLETED 2026-06-22.**
   `stellar contract id asset --asset USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN --network mainnet` returned `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`. A read-only `stellar contract info interface` call against `https://mainnet.sorobanrpc.com` returned the token interface. See `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`.

2. **P0-PRF-DETERMINISM — confirm passkeys regenerate identical keys across devices.**
   We run a tiny HTTPS test page that asks a passkey for output using a fixed salt, across: (A) same device twice, (B) a second synced Apple device, (C) the cross-device QR flow, (D) a restored device, (E) Android/Google sync.
   Pass = A, B, and D produce identical results; we record C separately. Either way, envelope encryption is already in the build so a mismatch fails safe.

That's the whole list. Two tests, both ours.
