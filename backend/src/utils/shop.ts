import { Shop } from '@prisma/client';
import { AuthPayload } from '../middleware/auth';

export const ALL_SHOPS: Shop[] = ['SHOP_COMPUTER', 'SHOP_XEROX'];

export function canAccessShop(user: AuthPayload, shop: string): boolean {
  return user.shopAccess.includes(shop);
}

/**
 * Prisma `shop` filter for list/analytics queries.
 * No `?shop=` → every shop the user may access. A shop outside the user's
 * access → null (callers answer 403). Never trust the query string alone.
 */
export function getShopFilter(user: AuthPayload, requestedShop: unknown): Shop | { in: Shop[] } | null {
  if (requestedShop === undefined || requestedShop === '') {
    return { in: user.shopAccess as Shop[] };
  }
  if (typeof requestedShop === 'string' && canAccessShop(user, requestedShop)) {
    return requestedShop as Shop;
  }
  return null;
}
