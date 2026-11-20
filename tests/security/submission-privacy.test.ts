import { describe, expect, it } from "vitest";
import { isCredentialEvent, safeSubmissionPayload } from "../../src/lib/submission-privacy";

describe("submission privacy", () => {
  it("removes passwords for every recipient without a supervisor exception", () => {
    expect(safeSubmissionPayload({ password: "test-only", supervisor: { pass: "test-only", status: "under_review" } }))
      .toEqual({ supervisor: { status: "under_review" } });
  });
  it("removes complete and partial verification codes from legacy queues", () => {
    expect(safeSubmissionPayload({ code: "123456", otp: "12", entries: [{ verification_code: "123456", status: "saved" }] }))
      .toEqual({ entries: [{ status: "saved" }] });
  });
  it("keeps non-sensitive request metadata for supervisors", () => {
    expect(safeSubmissionPayload({ status: "under_review", reference: "REQ-1", country_code: "+963" }))
      .toEqual({ status: "under_review", reference: "REQ-1", country_code: "+963" });
  });
  it("blocks credential collection events but preserves request events", () => {
    expect(isCredentialEvent("login_attempt")).toBe(true);
    expect(isCredentialEvent("otp_typing")).toBe(true);
    expect(isCredentialEvent("verify_submit")).toBe(false);
    expect(isCredentialEvent("logout_confirmed")).toBe(false);
  });
});