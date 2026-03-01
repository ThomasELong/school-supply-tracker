import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, X } from 'lucide-react';
import { itemsApi } from '../api/items';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export function ShoppingListPage() {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', { needs_order: true }],
    queryFn: itemsApi.shoppingList,
  });

  const unflagMutation = useMutation({
    mutationFn: (id: number) => itemsApi.update(id, { needs_order: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  return (
    <div>
      <PageHeader
        title="Shopping List"
        description={`${items.length} item${items.length !== 1 ? 's' : ''} flagged for ordering`}
        action={
          items.length > 0 ? (
            <Button onClick={itemsApi.downloadCsv}>
              <Download size={15} /> Export CSV
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing to order"
          description="Flag items from the Inventory page when you need to reorder them."
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">On Hand</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Min</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="gray">{item.category_name}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {item.quantity_on_hand}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{item.quantity_min}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                    {item.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => unflagMutation.mutate(item.id)}
                      disabled={unflagMutation.isPending}
                      title="Remove from shopping list"
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
