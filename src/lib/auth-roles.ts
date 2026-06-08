import type { AuthUser, ProformaApi } from "@/lib/api";

/** Lowercase slug: "Super Admin" → "super_admin", "superadmin" → "superadmin" */
export function normalizeRole(role?: string | null): string {
  return (role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isSuperAdminUser(user?: AuthUser | null): boolean {
  if (!user) return false;
  if (user.is_super_admin === true) return true;
  const role = normalizeRole(user.role);
  return role === "super_admin" || role === "superadmin";
}

export function isProformaConverted(proforma: Pick<ProformaApi, "status" | "invoice">): boolean {
  const status = normalizeRole(proforma.status);
  if (status === "converted") return true;
  return proforma.invoice != null;
}

export function isProformaDraft(proforma: Pick<ProformaApi, "status" | "invoice">): boolean {
  return !isProformaConverted(proforma);
}
