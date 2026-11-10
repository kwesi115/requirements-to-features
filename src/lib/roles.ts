export type AppRole = "student" | "admin" | "recruiter" | "org_leader";
export type EntryStatus = "draft" | "pending" | "verified" | "rejected" | "flagged";

export const ROLE_LABELS: Record<AppRole, string> = {
  student: "Student",
  admin: "Admin",
  recruiter: "Recruiter",
  org_leader: "Organization Leader",
};

export const STATUS_LABELS: Record<EntryStatus, string> = {
  draft: "Draft",
  pending: "Pending Verification",
  verified: "Verified",
  rejected: "Rejected",
  flagged: "Flagged",
};

export const ORG_TYPES = [
  "Nonprofit",
  "School / University",
  "Healthcare",
  "Religious",
  "Government",
  "Environmental",
  "Community Group",
  "Other",
];

/** Students may edit or remove anything that is not yet verified. */
export function canStudentEdit(status: EntryStatus) {
  return status !== "verified";
}

/** Reject and flag decisions require a written explanation. */
export function reasonRequired(decision: EntryStatus) {
  return decision === "rejected" || decision === "flagged";
}

/** Total of hours that count as verified. */
export function verifiedTotal(entries: { hours: number; status: EntryStatus }[]) {
  return entries.filter((e) => e.status === "verified").reduce((s, e) => s + Number(e.hours), 0);
}

/** Running total of logged hours (everything except drafts). */
export function loggedTotal(entries: { hours: number; status: EntryStatus }[]) {
  return entries.filter((e) => e.status !== "draft").reduce((s, e) => s + Number(e.hours), 0);
}

export function spotsLeft(capacity: number, registered: number) {
  return Math.max(0, capacity - registered);
}
