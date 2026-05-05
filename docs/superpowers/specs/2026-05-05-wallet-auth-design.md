# Wallet Auth Design — Meteora Agent Dashboard

**Date:** 2026-05-05  
**Status:** Approved  

## Overview

Add Solana wallet connect (Phantom/Backpack/Solflare) to the Next.js dashboard. A verified wallet owner gets admin privileges — currently kill switch toggle, extensible to future admin actions. The trading keypair is untouched; the connected wallet is the operator identity only.

## Deployment Context

- Frontend: Vercel (Next.js 16, App Router)
- Backend: FastAPI behind nginx, publicly accessible over HTTPS
- Single authorized wallet: pubkey stored as `AUTHORIZED_PUBKEY` env var on the backend

---

## Auth Flow

```
Browser                          FastAPI Backend
  │                                    │
  │── GET /auth/nonce?pubkey=<pk> ────▶│  validate pubkey matches AUTHORIZED_PUBKEY
  │◀──── { nonce: "Sign in to Meteora Agent: <uuid>" } ──│  store nonce in memory (TTL 2 min)
  │                                    │
  │  [wallet signs nonce message]       │
  │                                    │
  │── POST /auth/verify ───────────────▶│  verify ed25519 sig, check nonce not expired
  │   { pubkey, signature, nonce }      │  return signed JWT (1h expiry)
  │◀──── { token: "<jwt>" } ───────────│
  │                                    │
  │  [store token in sessionStorage]    │
  │                                    │
  │── POST /admin/kill-switch ─────────▶│  Authorization: Bearer <token>
  │   { arm: true }                     │  verify JWT → execute action
  │◀──── { ok: true, armed: true } ────│
```

---

## Backend Changes (`src/`)

### New env vars (`.env` + `.env.example`)

```
AUTHORIZED_PUBKEY=<base58 pubkey>
JWT_SECRET=<random 32-byte hex>
```

### New dependencies (`pyproject.toml`)

- `pynacl` — ed25519 signature verification  
- `pyjwt` — JWT sign/verify

### `src/dashboard/auth.py` (new)

- `nonce_store: dict[str, tuple[str, float]]` — in-memory `{pubkey: (nonce, expires_at)}`
- `GET /auth/nonce?pubkey=<pk>` — validates pubkey matches `AUTHORIZED_PUBKEY`, generates UUID nonce, stores with 2-min TTL, returns nonce string
- `POST /auth/verify` body `{pubkey, signature, nonce}` — verifies nonce exists and not expired, verifies ed25519 signature using `nacl.signing.VerifyKey`, returns signed JWT (`sub=pubkey`, `exp=1h`)
- `require_auth` FastAPI dependency — extracts `Authorization: Bearer <token>`, verifies JWT, raises 401 if invalid

### `src/dashboard/admin.py` (new)

- `POST /admin/kill-switch` body `{arm: bool}`, protected by `require_auth`
  - `arm=true` → creates `KILL_SWITCH_FILE`
  - `arm=false` → deletes `KILL_SWITCH_FILE` if present
  - Returns `{ok: bool, armed: bool}`

### `src/dashboard/api.py` (modify)

- Mount `auth` and `admin` routers onto the FastAPI app
- Add `DASHBOARD_CORS_ORIGINS` support so Vercel domain can be whitelisted

### `src/config.py` (modify)

- Add `authorized_pubkey: str` and `jwt_secret: str` fields, both `_required()`

---

## Frontend Changes (`frontend/`)

### New dependencies

- `@solana/wallet-adapter-react`
- `@solana/wallet-adapter-wallets` (Phantom, Backpack, Solflare)
- `@solana/wallet-adapter-react-ui`
- `@solana/web3.js`
- `bs58` — encode signature `Uint8Array` as base58 string for the verify payload

### `frontend/lib/auth.ts` (new)

- `fetchNonce(pubkey)` — `GET /auth/nonce?pubkey=<pk>`
- `verifyWallet(pubkey, signMessage)` — fetches nonce, calls `wallet.signMessage()`, POSTs to `/auth/verify`, stores JWT in `sessionStorage`
- `getToken()` / `clearToken()` — sessionStorage helpers
- `isAuthenticated()` — checks token exists and not expired (decode JWT exp client-side)

### `frontend/components/ui/WalletProvider.tsx` (new)

- `"use client"` wrapper with `ConnectionProvider` + `WalletProvider` from wallet-adapter
- Configured for the correct cluster (devnet/mainnet from `NEXT_PUBLIC_SOLANA_NETWORK`)
- Wraps children — mounted in `app/layout.tsx` around `<main>`

### `frontend/components/ui/Nav.tsx` (modify)

- Replace the static "Live Dashboard" button with a `WalletButton` component
- When disconnected: shows `@solana/wallet-adapter-react-ui` connect button (styled to match dark theme)
- When connected + verified: shows truncated pubkey with green dot
- When connected + unverified (wrong wallet): shows amber "Unauthorized" badge

### `frontend/components/ui/WalletButton.tsx` (new)

- `"use client"` — uses `useWallet()` hook
- On wallet connect: automatically triggers `verifyWallet()` from `lib/auth.ts`
- Manages local state: `idle | connecting | signing | verified | unauthorized`
- On disconnect: clears token from sessionStorage

### `frontend/components/dashboard/AdminPanel.tsx` (new)

- `"use client"` — uses `useWallet()` + `isAuthenticated()`
- Only renders when `isAuthenticated()` is true
- Kill switch toggle: button that calls `POST /admin/kill-switch` with JWT, shows current armed state from `AgentStatus`
- Optimistic UI update on toggle

### `frontend/app/dashboard/page.tsx` (modify)

- Import and render `<AdminPanel status={status} />` below the StatusRow, conditionally shown when auth is active

---

## Error Handling

- Wrong wallet connects → `/auth/nonce` returns 403 → `WalletButton` shows "Unauthorized"
- Nonce expires (> 2 min to sign) → `/auth/verify` returns 401 → prompt reconnect
- JWT expires → next admin call returns 401 → clear token, show connect prompt
- Kill switch toggle fails → show error toast (inline, no library needed)

---

## Security Notes

- Nonce is single-use and expires in 2 minutes — prevents replay attacks
- JWT is signed with `HS256` + `JWT_SECRET`, 1-hour expiry — short enough for operator sessions
- `AUTHORIZED_PUBKEY` and `JWT_SECRET` are server-side env vars only — never exposed to the browser
- CORS restricted to `DASHBOARD_CORS_ORIGINS` (Vercel domain) in production
- Admin endpoints are POST-only, no sensitive data in query params

---

## Not In Scope

- Multiple authorized wallets
- Role-based permissions
- Persistent sessions (refresh tokens)
- Dashboard page-level route protection (read-only data is public)
