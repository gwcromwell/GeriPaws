import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard for a real bug: inviteMember() used to only insert a
// pet_invites row and never actually notified the invitee — two real test
// invites went out with no email ever sent. This locks in that creating an
// invite always also asks send-pet-invite to email it, and that the caller
// still gets the created invite back (with emailSent: false) if that email
// fails, rather than losing the invite or throwing.

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  const getUser = vi.fn();
  const invoke = vi.fn();
  return { single, select, insert, from, getUser, invoke };
});

vi.mock("./supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}));

const { inviteMember } = await import("./pets");

const CREATED_INVITE = {
  id: "invite-1",
  pet_id: "pet-1",
  email: "amanda@example.com",
  role: "caregiver",
  token: "tok-123",
  status: "pending",
  invited_by: "user-1",
  created_at: "2026-01-15T00:00:00Z",
  expires_at: "2026-01-29T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mocks.single.mockResolvedValue({ data: CREATED_INVITE, error: null });
});

describe("inviteMember", () => {
  it("creates the invite row and asks send-pet-invite to email it", async () => {
    mocks.invoke.mockResolvedValue({ data: { sent: true }, error: null });

    const result = await inviteMember("pet-1", "amanda@example.com", "caregiver");

    expect(mocks.from).toHaveBeenCalledWith("pet_invites");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pet_id: "pet-1",
        email: "amanda@example.com",
        role: "caregiver",
        invited_by: "user-1",
      })
    );
    expect(mocks.invoke).toHaveBeenCalledWith("send-pet-invite", { body: { inviteId: "invite-1" } });
    expect(result.emailSent).toBe(true);
    expect(result.invite).toEqual(CREATED_INVITE);
  });

  it("still returns the created invite when the email fails to send", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: "Resend is down" } });

    const result = await inviteMember("pet-1", "amanda@example.com", "caregiver");

    expect(result.invite.id).toBe("invite-1");
    expect(result.emailSent).toBe(false);
  });

  it("never skips the send-pet-invite call for any role", async () => {
    mocks.invoke.mockResolvedValue({ data: { sent: true }, error: null });

    await inviteMember("pet-1", "amanda@example.com", "viewer");

    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it("throws if the invite row itself can't be created (RLS, bad pet id, etc.)", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: "permission denied" } });

    await expect(inviteMember("pet-1", "amanda@example.com", "caregiver")).rejects.toBeTruthy();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
