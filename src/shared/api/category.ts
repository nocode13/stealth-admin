import { base } from './instances';
import type { Category, CategoryPayload, CursorPage, FindCategoriesParams } from './types';

export const category = {
  findAll: (params?: FindCategoriesParams) => base.get<CursorPage<Category>>('/categories', { params }),
  create: (payload: CategoryPayload) => base.post<Category>('/categories', payload).then((r) => r.data),
  update: (id: string, payload: Partial<CategoryPayload>) =>
    base.patch<Category>(`/categories/${id}`, payload).then((r) => r.data),
  /** Иконка плитки — только категории товаров (верхний уровень), только SUPER_ADMIN. */
  uploadIcon: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return base
      .post<Category>(`/categories/${id}/icon`, formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },
};
