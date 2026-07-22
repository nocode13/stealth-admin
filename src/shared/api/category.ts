import { base } from './instances';
import type { Category, CategoryPayload, CursorPage, FindCategoriesParams } from './types';

export const category = {
  findAll: (params?: FindCategoriesParams) => base.get<CursorPage<Category>>('/categories', { params }),
  create: (payload: CategoryPayload) => base.post<Category>('/categories', payload).then((r) => r.data),
  update: (id: string, payload: Partial<CategoryPayload>) =>
    base.patch<Category>(`/categories/${id}`, payload).then((r) => r.data),
};
