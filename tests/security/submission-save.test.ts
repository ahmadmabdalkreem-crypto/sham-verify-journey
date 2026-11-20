import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  notify: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: mocks.insert }), auth: { getUser: mocks.getUser } },
}));
vi.mock("@/lib/admin-events", () => ({ notifyAdmin: mocks.notify }));
vi.mock("@/lib/session-id", () => ({ getSessionId: () => "test-session" }));

import { logSubmission } from "../../src/lib/submissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user", email: "test@example.invalid" } } });
});

it("rejects a failed save and never tells supervisors that it succeeded", async () => {
  mocks.insert.mockResolvedValue({ error: { message: "denied" } });
  await expect(logSubmission("customer_info", { status: "under_review" })).rejects.toThrow();
  expect(mocks.notify).not.toHaveBeenCalled();
});

it("keeps saved request notifications working for supervisors without credentials", async () => {
  mocks.insert.mockResolvedValue({ error: null });
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  try {
    await logSubmission("customer_info", { status: "under_review", password: "test-only", code: "123456" });
    expect(mocks.insert.mock.calls[0]?.[0]?.payload).toMatchObject({ status: "under_review" });
    expect(mocks.insert.mock.calls[0]?.[0]?.payload).not.toHaveProperty("password");
    expect(mocks.insert.mock.calls[0]?.[0]?.payload).not.toHaveProperty("code");
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  } finally {
    fetchMock.mockRestore();
  }
});

it("never saves or forwards credential collection events", async () => {
  await expect(logSubmission("otp_attempt", { code: "123456" })).rejects.toThrow();
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.notify).not.toHaveBeenCalled();
});