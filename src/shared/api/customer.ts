import { base } from './instances';
import type { Customer, CursorPage, FindCustomersParams } from './types';

export const customer = {
  findAll: (params?: FindCustomersParams) => base.get<CursorPage<Customer>>('/customers', { params }),
};
