import { base } from './instances';
import type { Country, CountryPayload, CreateCountryPayload, CursorPage, FindCountriesParams } from './types';

export const country = {
  findAll: (params?: FindCountriesParams) => base.get<CursorPage<Country>>('/countries', { params }),
  findOne: (id: string) => base.get<Country>(`/countries/${id}`).then((r) => r.data),
  create: (payload: CreateCountryPayload) => base.post<Country>('/countries', payload).then((r) => r.data),
  update: (id: string, payload: CountryPayload) => base.patch<Country>(`/countries/${id}`, payload).then((r) => r.data),
  remove: (id: string) => base.delete<void>(`/countries/${id}`).then((r) => r.data),
};
