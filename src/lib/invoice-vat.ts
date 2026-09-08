const VAT_PREFERENCE_PREFIX = "easy-garage-hub:invoice-vat:";

function vatPreferenceKey(documentId: string | number) {
  return `${VAT_PREFERENCE_PREFIX}${String(documentId)}`;
}

export function setInvoiceVatPreference(documentId: string | number, enabled: boolean) {
  try {
    localStorage.setItem(vatPreferenceKey(documentId), String(enabled));
  } catch {
    // VAT remains optional if browser storage is unavailable.
  }
}

export function getInvoiceVatPreference(documentId: string | number | null | undefined): boolean {
  if (documentId === null || documentId === undefined) return false;
  try {
    return localStorage.getItem(vatPreferenceKey(documentId)) === "true";
  } catch {
    return false;
  }
}

export function invoiceAmounts(subtotal: number, vatEnabled: boolean) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const vat = vatEnabled ? safeSubtotal * 0.18 : 0;
  return { subtotal: safeSubtotal, vat, total: safeSubtotal + vat };
}