import { useState, useEffect, ElementType } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ShoppingCart, AlertTriangle, Recycle, Package, FlaskConical } from 'lucide-react';
import { itemsApi } from '../api/items';
import type { ItemType } from '../types';
import { categoriesApi } from '../api/categories';
import { ItemForm } from '../components/items/ItemForm';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useUrgentItems } from '../context/UrgentItemsContext';
import type { Item } from '../types';

export function InventoryPage() {
  const qc = useQueryClient();
  const { urgentIds, dismissId } = useUrgentItems();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [needsOrderFilter, setNeedsOrderFilter] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', { search, categoryId, needsOrderFilter }],
    queryFn: () =>
      itemsApi.list({
        search: search || undefined,
        category_id: categoryId,
        needs_order: needsOrderFilter || undefined,
      }),
  });

  // Clean up stale urgent IDs for items that no longer exist
  useEffect(() => {
    if (items.length === 0) return;
    const itemIdSet = new Set(items.map((i) => i.id));
    urgentIds.forEach((id) => {
      if (!itemIdSet.has(id)) dismissId(id);
    });
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const toggleOrderMutation = useMutation({
    mutationFn: ({ id, needs_order }: { id: number; needs_order: boolean }) =>
      itemsApi.update(id, { needs_order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: itemsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      setDeletingItem(null);
    },
    onError: (e: Error) => {
      setDeleteError(e.message);
      setDeletingItem(null);
    },
  });

  const openEdit = (item: Item) => {
    setEditItem(item);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
  };

  // Split into urgent (pinned) and normal items
  const urgentIdSet = new Set(urgentIds);
  const urgentItems = items.filter((i) => urgentIdSet.has(i.id));
  const normalItems = items.filter((i) => !urgentIdSet.has(i.id));

  const rowProps = {
    onEdit: openEdit,
    onDelete: setDeletingItem,
    onToggleOrder: (item: Item) =>
      toggleOrderMutation.mutate({ id: item.id, needs_order: !item.needs_order }),
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="All supply items"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={15} /> Add Item
          </Button>
        }
      />

      {deleteError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {deleteError}
          <button className="ml-2 underline text-xs" onClick={() => setDeleteError('')}>
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Input
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select
          value={categoryId ?? ''}
          onChange={(e) =>
            setCategoryId(e.target.value ? Number(e.target.value) : undefined)
          }
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="All categories"
          className="w-48"
        />
        <button
          onClick={() => setNeedsOrderFilter((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
            needsOrderFilter
              ? 'bg-orange-100 text-orange-800 border-orange-300'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart size={14} />
          Needs Order
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No items found"
          description={search || categoryId || needsOrderFilter ? 'Try adjusting your filters.' : 'Add your first item to get started.'}
          action={
            !search && !categoryId && !needsOrderFilter ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus size={15} /> Add Item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">On Hand</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Min</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {urgentItems.length > 0 && (
                <>
                  <tr className="bg-red-50">
                    <td colSpan={8} className="px-4 py-1.5 text-xs font-semibold text-red-700 uppercase tracking-wide">
                      ⚠ Needs Setup — added from a project, quantities not yet configured
                    </td>
                  </tr>
                  {urgentItems.map((item) => (
                    <ItemRow key={item.id} item={item} urgent {...rowProps} />
                  ))}
                  {normalItems.length > 0 && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        All Items
                      </td>
                    </tr>
                  )}
                </>
              )}
              {normalItems.map((item) => (
                <ItemRow key={item.id} item={item} {...rowProps} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ItemForm open={showForm} onClose={closeForm} editItem={editItem} />

      <ConfirmDialog
        open={deletingItem !== null}
        title="Delete Item"
        message={`Delete "${deletingItem?.name}"? All projects referencing this item will also be affected.`}
        onConfirm={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
        onCancel={() => setDeletingItem(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

const ITEM_TYPE_DISPLAY: Record<ItemType, { label: string; icon: ElementType; className: string }> = {
  consumable: { label: 'Consumable', icon: Package,      className: 'text-blue-700 bg-blue-50'   },
  reusable:   { label: 'Reusable',   icon: Recycle,      className: 'text-green-700 bg-green-50' },
  bulk:       { label: 'Bulk',       icon: FlaskConical, className: 'text-purple-700 bg-purple-50' },
};

function ItemTypeBadge({ type }: { type: ItemType }) {
  const { label, icon: Icon, className } = ITEM_TYPE_DISPLAY[type] ?? ITEM_TYPE_DISPLAY.consumable;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function ItemRow({
  item,
  urgent = false,
  onEdit,
  onDelete,
  onToggleOrder,
}: {
  item: Item;
  urgent?: boolean;
  onEdit: (i: Item) => void;
  onDelete: (i: Item) => void;
  onToggleOrder: (i: Item) => void;
}) {
  const isLowStock = item.quantity_min > 0 && item.quantity_on_hand < item.quantity_min;

  return (
    <tr className={urgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
      <td className="px-4 py-3 font-medium text-gray-900">
        {item.name}
        {urgent && (
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
            New
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-600">{item.category_name}</td>
      <td className="px-4 py-3"><ItemTypeBadge type={item.item_type} /></td>
      <td className="px-4 py-3 text-center text-gray-700">{item.quantity_on_hand}</td>
      <td className="px-4 py-3 text-center text-gray-500">{item.quantity_min}</td>
      <td className="px-4 py-3">
        {item.needs_order && <Badge variant="orange">Needs Order</Badge>}
        {!item.needs_order && isLowStock && (
          <Badge variant="yellow">
            <AlertTriangle size={11} className="mr-1" />
            Low Stock
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
        {item.notes ?? '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onToggleOrder(item)}
            title={item.needs_order ? 'Remove order flag' : 'Flag for ordering'}
            className={`p-1.5 rounded-md transition-colors ${
              item.needs_order
                ? 'text-orange-500 hover:bg-orange-50'
                : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
            }`}
          >
            <ShoppingCart size={14} />
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
