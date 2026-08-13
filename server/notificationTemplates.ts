
export function lowInventoryTemplate(productId: number, quantity: number) {
  return `⚠️ هشدار موجودی
محصول: ${productId}
موجودی فعلی: ${quantity}`;
}
