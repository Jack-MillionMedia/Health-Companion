// Disclaimer enforcement middleware
// Ensures every AI chat response contains the required medical disclaimer

const REQUIRED_DISCLAIMER_PATTERNS = [
  /consult.*healthcare/i,
  /consult.*medical/i,
  /consult.*doctor/i,
  /consult.*physician/i,
  /healthcare professional/i,
  /medical professional/i,
  /not.*medical advice/i,
  /educational.*only/i,
  /⚕️/,
];

const FALLBACK_DISCLAIMER =
  "\n\n---\n⚕️ **Important:** This information is for educational purposes only. " +
  "Always consult a healthcare professional before making medical decisions.";

/**
 * Check if a response already contains an appropriate disclaimer
 */
export function hasDisclaimer(text: string): boolean {
  return REQUIRED_DISCLAIMER_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Ensure a response has a disclaimer, adding one if missing
 */
export function ensureDisclaimer(text: string): string {
  if (hasDisclaimer(text)) {
    return text;
  }
  return text + FALLBACK_DISCLAIMER;
}

/**
 * Create a response wrapper that enforces disclaimers
 */
export function createDisclaimerEnforcer() {
  let responsesChecked = 0;
  let disclaimersAdded = 0;

  return {
    /**
     * Process a response, adding disclaimer if needed
     */
    enforce(text: string): string {
      responsesChecked++;
      if (!hasDisclaimer(text)) {
        disclaimersAdded++;
        return text + FALLBACK_DISCLAIMER;
      }
      return text;
    },

    /**
     * Get enforcement statistics
     */
    getStats() {
      return {
        responsesChecked,
        disclaimersAdded,
        complianceRate:
          responsesChecked > 0
            ? (responsesChecked - disclaimersAdded) / responsesChecked
            : 1,
      };
    },
  };
}

// Singleton enforcer
export const disclaimerEnforcer = createDisclaimerEnforcer();

export default { hasDisclaimer, ensureDisclaimer, disclaimerEnforcer };
