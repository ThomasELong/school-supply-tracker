import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'urgent_item_ids';

function loadIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function saveIds(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

interface UrgentItemsContextValue {
  urgentIds: number[];
  addUrgentId: (id: number) => void;
  dismissId: (id: number) => void;
}

const UrgentItemsContext = createContext<UrgentItemsContextValue | null>(null);

export function UrgentItemsProvider({ children }: { children: ReactNode }) {
  const [urgentIds, setUrgentIds] = useState<number[]>(loadIds);

  const addUrgentId = useCallback((id: number) => {
    setUrgentIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveIds(next);
      return next;
    });
  }, []);

  const dismissId = useCallback((id: number) => {
    setUrgentIds((prev) => {
      const next = prev.filter((x) => x !== id);
      saveIds(next);
      return next;
    });
  }, []);

  return (
    <UrgentItemsContext.Provider value={{ urgentIds, addUrgentId, dismissId }}>
      {children}
    </UrgentItemsContext.Provider>
  );
}

export function useUrgentItems() {
  const ctx = useContext(UrgentItemsContext);
  if (!ctx) throw new Error('useUrgentItems must be used within UrgentItemsProvider');
  return ctx;
}
