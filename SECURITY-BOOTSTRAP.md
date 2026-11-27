# Security bootstrap

The seeded staff accounts are inactive unless deployment bootstrap passwords are configured. Set both variables to unique, strong passwords in the Vercel project environment and in the Cloudflare Worker secrets before enabling staff access:

- `PS_BOOTSTRAP_ADMIN_PASSWORD`
- `PS_BOOTSTRAP_SUPERADMIN_PASSWORD`

Each password must be at least eight characters and contain a letter and a number. The first migration hashes the configured password and activates its corresponding seeded account. Legacy seeded staff credentials are revoked; deployments without the variables keep those accounts inactive. Do not put these values in source control or share them in chat.

Self-service password reset is intentionally unavailable until a verified email-link or SMS one-time-code flow is configured. Users who cannot sign in must contact support for identity verification.

The batch E2E scripts mutate persistent backend data. Build the web bundle with `EXPO_PUBLIC_RORK_FUNCTIONS_URL` set to a disposable staging backend; set `ALLOW_LIVE_TEST_API=1` and `API_URL` for the batch 12 script. Use bootstrap passwords only for that staging environment.
