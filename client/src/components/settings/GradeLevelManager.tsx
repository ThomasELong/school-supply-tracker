import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { gradeLevelsApi } from '../../api/gradeLevels';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { GradeLevel } from '../../types';

export function GradeLevelManager() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState(0);
  const [deletingItem, setDeletingItem] = useState<GradeLevel | null>(null);
  const [error, setError] = useState('');

  const { data: levels = [] } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: gradeLevelsApi.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, sort_order }: { id: number; name: string; sort_order: number }) =>
      gradeLevelsApi.update(id, { name, sort_order }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grade-levels'] });
      setEditingId(null);
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: gradeLevelsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grade-levels'] });
      setDeletingItem(null);
    },
    onError: (e: Error) => {
      setError(e.message);
      setDeletingItem(null);
    },
  });

  const startEdit = (g: GradeLevel) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditOrder(g.sort_order);
    setError('');
  };

  const saveEdit = () => {
    if (!editName.trim() || editingId === null) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), sort_order: editOrder });
  };

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-500 mb-3">
        Grade levels are pre-seeded. Edit names or sort order as needed.
      </p>

      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
        {levels.map((g) => (
          <li key={g.id} className="flex items-center gap-2 px-4 py-2.5 bg-white">
            {editingId === g.id ? (
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
                <input
                  type="number"
                  className="w-14 text-sm border-b border-blue-400 focus:outline-none px-0.5 text-center"
                  value={editOrder}
                  onChange={(e) => setEditOrder(Number(e.target.value))}
                  title="Sort order"
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
                <span className="flex-1 text-sm text-gray-800">{g.name}</span>
                <span className="text-xs text-gray-400 mr-1">order: {g.sort_order}</span>
                <Button variant="ghost" size="sm" onClick={() => startEdit(g)}>
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingItem(g)}
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
        title="Delete Grade Level"
        message={`Delete "${deletingItem?.name}"? This cannot be done if projects reference it.`}
        onConfirm={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
        onCancel={() => setDeletingItem(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
