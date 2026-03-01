import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { subjectsApi } from '../../api/subjects';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { Subject } from '../../types';

export function SubjectManager() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingItem, setDeletingItem] = useState<Subject | null>(null);
  const [error, setError] = useState('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      setNewName('');
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      subjectsApi.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      setEditingId(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: subjectsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
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

  const startEdit = (s: Subject) => {
    setEditingId(s.id);
    setEditName(s.name);
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
          placeholder="New subject name"
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
        {subjects.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-400">No subjects yet</li>
        )}
        {subjects.map((s) => (
          <li key={s.id} className="flex items-center gap-2 px-4 py-2.5 bg-white">
            {editingId === s.id ? (
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
                <span className="flex-1 text-sm text-gray-800">{s.name}</span>
                <Button variant="ghost" size="sm" onClick={() => startEdit(s)}>
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingItem(s)}
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
        title="Delete Subject"
        message={`Delete "${deletingItem?.name}"? This cannot be done if projects reference it.`}
        onConfirm={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
        onCancel={() => setDeletingItem(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
