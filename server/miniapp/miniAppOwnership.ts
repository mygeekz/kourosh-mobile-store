export const ownsMiniAppCustomerResource = (
  resource: { customerId?: unknown } | null | undefined,
  authenticatedCustomerId: number,
): boolean => Boolean(
  resource
  && Number.isInteger(authenticatedCustomerId)
  && authenticatedCustomerId > 0
  && Number(resource.customerId || 0) === authenticatedCustomerId,
);

export const ownsMiniAppCustomerInvoice = (
  invoice: { customerDetails?: { id?: unknown } | null } | null | undefined,
  authenticatedCustomerId: number,
): boolean => Boolean(
  invoice
  && Number.isInteger(authenticatedCustomerId)
  && authenticatedCustomerId > 0
  && Number(invoice.customerDetails?.id || 0) === authenticatedCustomerId,
);
