# E2E smoke tests

## BAS Lipid Meter product (`bas-lipid-meter-smoke.mjs`)

End-to-end verification of the customer-facing Biological Age Score (BAS)
journey, added for **SCRUM-14**. It exercises the full pipeline against a live
deployment and fails loudly if any stage is broken:

1. **Account login** — in-app Cognito sign-in (`/login`).
2. **Provisioning** — first chat message auto-provisions the Meterbolic user.
3. **Lipid Meter entry** — `/personalize` "Use example" loads a full lipid +
   glucose + body panel; "Parse with AI" structures it.
4. **Submit** — measurements are written via `bang-api`.
5. **Indices generation** — `bang-api` computes the BAS from the panel.
6. **Display** — the numeric BAS appears in the customer's Recent Activity.

It is a **verification harness only**: it adds no application code and changes
nothing but the test user's own measurement data on the target environment. The
clinical indices/Truth-Engine math is intentionally **not** touched here.

### Run (staging)

```bash
E2E_BASE=https://app.dev.meterbolic.com \
E2E_EMAIL=<confirmed staging test user> \
E2E_PASS=<password> \
PW_CHROMIUM=/home/ubuntu/.cache/ms-playwright/chromium-1140/chrome-linux/chrome \
PW_MODULE=/abs/path/to/node_modules/playwright \
node e2e/bas-lipid-meter-smoke.cjs
```

No credentials are committed — all come from the environment. The test user must
already exist and be `CONFIRMED` in the environment's Cognito pool. Screenshots
are written to `$E2E_SHOTS` (default `/tmp/bas-e2e`). Exit code `0` means a
numeric BAS was computed and surfaced.
```
