import { api } from './client';
import type { Category, CreateCategoryBody } from '../types';

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories'),
  getById: (id: number) => api.get<Category>(`/categories/${id}`),
  create: (body: CreateCategoryBody) => api.post<Category>('/categories', body),
  update: (id: number, body: CreateCategoryBody) =>
    api.put<Category>(`/categories/${id}`, body),
  delete: (id: number) => api.delete(`/categories/${id}`),
};
