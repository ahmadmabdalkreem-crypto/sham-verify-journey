/** Credentials never belong in application submissions, including nested legacy queues. */
export function sanitizeSubmission(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSubmission);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => {
      const normalized = key.toLowerCase().replace(/[\s_-]/g, "");
      return !/password|passwd|passphrase|otp|token|secret|verificationcode|onetimecode/.test(normalized)
        && normalized !== "pass" && normalized !== "code";
    }).map(([key, entry]) => [key, sanitizeSubmission(entry)]),
  );
}

export function safeSubmissionPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return sanitizeSubmission(payload) as Record<string, unknown>;
}

export function isCredentialEvent(kind: string): boolean {
  return kind === "login_attempt" || kind.startsWith("otp_");
}