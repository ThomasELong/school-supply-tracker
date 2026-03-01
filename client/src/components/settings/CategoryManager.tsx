import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { categoriesApi } from '../../api/categories';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { Category } from '../../types';

export function CategoryManager() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingItem, setDeletingItem] = useState<Category | null>(null);
  const [error, setError] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      categoriesApi.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setDeletingItem(null);
    },
    onError: (e: Error) => {
      setError(e.message);
      setDeletingItem(null);
    },
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim() });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setError('');
  };

  const saveEdit = () => {
    if (!editName.trim() || editingId === null) return;
    updateMutation.mutate({ id: editingId, name: editName.trim() });
  };

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={createMutation.isPending || !newName.trim()}>
          <Plus size={15} /> Add
        </Button>
      </div>

      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
        {categories.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-400">No categories yet</li>
        )}
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center gap-2 px-4 py-2.5 bg-white">
            {editingId === cat.id ? (
              <>
                <input
                  autoFocus
                  className="flex-1 text-sm border-b border-blue-400 focus:outline-none px-0.5"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <Button variant="ghost" size="sm" onClick={saveEdit}>
                  <Check size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  <X size={14} />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{cat.name}</span>
                <Button variant="ghost" size="sm" onClick={() => startEdit(cat)}>
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingItem(cat)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deletingItem !== null}
        title="Delete Category"
        message={`Delete "${deletingItem?.name}"? This cannot be done if items are assigned to it.`}
        onConfirm={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
        onCancel={() => setDeletingItem(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
