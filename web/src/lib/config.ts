// config.ts — runtime configuration helpers
// Centralises env-flag checks so views, routes, and lib all read
// from one place rather than scattering process.env checks everywhere.

/**
 * SELF_HOSTED=true — headless mode for self-hosters.
 *
 * When true:
 *  - No account number required for analysis
 *  - No daily rate limits
 *  - /upgrade returns 404
 *  - Pricing UI, subscription copy, and commercial FAQ are hidden
 *  - Terms sections 4 (Payments) and 5 (Shutdown/Refunds) are hidden
 *  - Stripe references are omitted from the Privacy Policy
 */
export function isSelfHosted(): boolean {
  return process.env.SELF_HOSTED === 'true'
}
