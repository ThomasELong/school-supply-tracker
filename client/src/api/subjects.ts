import { api } from './client';
import type { Subject, CreateSubjectBody } from '../types';

export const subjectsApi = {
  list: () => api.get<Subject[]>('/subjects'),
  getById: (id: number) => api.get<Subject>(`/subjects/${id}`),
  create: (body: CreateSubjectBody) => api.post<Subject>('/subjects', body),
  update: (id: number, body: CreateSubjectBody) =>
    api.put<Subject>(`/subjects/${id}`, body),
  delete: (id: number) => api.delete(`/subjects/${id}`),
};
