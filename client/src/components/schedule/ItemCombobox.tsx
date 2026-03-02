import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { itemsApi } from '../../api/items';
import { useUrgentItems } from '../../context/UrgentItemsContext';
import type { Item, Category } from '../../types';

interface ItemComboboxProps {
  id: string;
  label?: string;
  value: number; // item_id, 0 = nothing selected
  items: Item[];
  categories: Category[];
  onSelect: (item: Item) => void;
}

export function ItemCombobox({ id, label, value, items, categories, onSelect }: ItemComboboxProps) {
  const qc = useQueryClient();
  const { addUrgentId } = useUrgentItems();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [localItem, setLocalItem] = useState<Item | null>(null);
  const selectedItem = items.find((it) => it.id === value) ?? localItem ?? undefined;

  useEffect(() => {
    if (value === 0) setLocalItem(null);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Don't clear pendingName here — clicking elsewhere in the modal (e.g. another
        // form field) would accidentally dismiss the category picker panel.
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const createMutation = useMutation({
    mutationFn: ({ name, category_id }: { name: string; category_id: number }) =>
      itemsApi.create({
        name,
        category_id,
        quantity_on_hand: 0,
        quantity_min: 0,
        needs_order: true,
      }),
    onSuccess: (newItem) => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['shopping-list'] });
      setLocalItem(newItem); // show immediately before React Query refetch
      addUrgentId(newItem.id);
      onSelect(newItem);
      setQuery('');
      setOpen(false);
      setPendingName(null);
    },
  });

  const filtered = query.trim().length > 0
    ? items.filter(
        (it) =>
          it.name.toLowerCase().includes(query.toLowerCase()) ||
          it.category_name.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const hasExactMatch = items.some(
    (it) => it.name.toLowerCase() === query.trim().toLowerCase()
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setPendingName(null);
  }

  function handleSelectItem(item: Item) {
    onSelect(item);
    setQuery('');
    setOpen(false);
    setPendingName(null);
  }

  function handleAddNew() {
    setPendingName(query.trim());
    setOpen(false);
  }

  function handleCategorySelect(category_id: number) {
    if (!pendingName) return;
    createMutation.mutate({ name: pendingName, category_id });
  }

  // When closed: show the selected item's name; when open: show what the user is typing
  const inputValue = open ? query : (selectedItem ? `${selectedItem.name} (${selectedItem.category_name})` : query);

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder="Search items…"
          autoComplete="off"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
            {filtered.length === 0 && query.trim().length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">Start typing to search…</p>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelectItem(item); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 hover:text-blue-700 flex items-baseline gap-1"
              >
                {item.name}
                <span className="text-xs text-gray-400">({item.category_name})</span>
              </button>
            ))}
            {query.trim().length > 0 && !hasExactMatch && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleAddNew(); }}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 flex items-center gap-1.5"
              >
                <Plus size={13} />
                Add "{query.trim()}" to inventory
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline category picker when creating a new item */}
      {pendingName && (
        <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs font-medium text-amber-800 mb-2">
            Select a category for "{pendingName}":
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                disabled={createMutation.isPending}
                onClick={() => handleCategorySelect(cat.id)}
                className="px-2.5 py-1 text-xs rounded-full border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 disabled:opacity-50 transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>
          {createMutation.isPending && (
            <p className="text-xs text-amber-600 mt-2">Adding to inventory…</p>
          )}
          {createMutation.isError && (
            <p className="text-xs text-red-600 mt-2">
              {(createMutation.error as Error).message}
            </p>
          )}
          <button
            type="button"
            onClick={() => setPendingName(null)}
            className="text-xs text-gray-500 hover:text-gray-700 mt-2 block"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
