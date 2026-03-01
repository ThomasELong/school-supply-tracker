import { api } from './client';
import type { Item, CreateItemBody, UpdateItemBody } from '../types';

export const itemsApi = {
  list: (params?: { search?: string; category_id?: number; needs_order?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category_id) q.set('category_id', String(params.category_id));
    if (params?.needs_order) q.set('needs_order', 'true');
    const qs = q.toString();
    return api.get<Item[]>(`/items${qs ? `?${qs}` : ''}`);
  },
  getById: (id: number) => api.get<Item>(`/items/${id}`),
  create: (body: CreateItemBody) => api.post<Item>('/items', body),
  update: (id: number, body: UpdateItemBody) => api.put<Item>(`/items/${id}`, body),
  delete: (id: number) => api.delete(`/items/${id}`),
  shoppingList: () => api.get<Item[]>('/items/shopping-list'),
  downloadCsv: () => {
    window.location.href = '/api/items/shopping-list?format=csv';
  },
};
