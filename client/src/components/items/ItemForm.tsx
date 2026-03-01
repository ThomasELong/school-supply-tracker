import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { categoriesApi } from '../../api/categories';
import { itemsApi } from '../../api/items';
import type { Item, CreateItemBody } from '../../types';

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  editItem?: Item | null;
}

const EMPTY: CreateItemBody = {
  name: '',
  category_id: 0,
  quantity_on_hand: 0,
  quantity_min: 0,
  needs_order: false,
  notes: '',
};

export function ItemForm({ open, onClose, editItem }: ItemFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateItemBody>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editItem) {
      setForm({
        name: editItem.name,
        category_id: editItem.category_id,
        quantity_on_hand: editItem.quantity_on_hand,
        quantity_min: editItem.quantity_min,
        needs_order: editItem.needs_order,
        notes: editItem.notes ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setError('');
  }, [editItem, open]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const mutation = useMutation({
    mutationFn: (body: CreateItemBody) =>
      editItem ? itemsApi.update(editItem.id, body) : itemsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const set = (field: keyof CreateItemBody, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.category_id) {
      setError('Category is required');
      return;
    }
    mutation.mutate({ ...form, notes: form.notes || undefined });
  };

  return (
    <Modal
      open={open}
      title={editItem ? 'Edit Item' : 'Add Item'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Input
          id="item-name"
          label="Item Name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Tempera Paint, Red"
          autoFocus
        />

        <Select
          id="item-category"
          label="Category"
          value={form.category_id || ''}
          onChange={(e) => set('category_id', Number(e.target.value))}
          placeholder="Select a category…"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="item-qty"
            label="Quantity On Hand"
            type="number"
            min={0}
            value={form.quantity_on_hand}
            onChange={(e) => set('quantity_on_hand', Number(e.target.value))}
          />
          <Input
            id="item-min"
            label="Minimum Quantity"
            type="number"
            min={0}
            value={form.quantity_min}
            onChange={(e) => set('quantity_min', Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="item-notes" className="text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="item-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Optional notes…"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.needs_order}
            onChange={(e) => set('needs_order', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Flag for ordering
        </label>
      </div>
    </Modal>
  );
}
