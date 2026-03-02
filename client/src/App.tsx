import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { UrgentItemsProvider } from './context/UrgentItemsContext';
import { InventoryPage } from './pages/InventoryPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { SchedulePage } from './pages/SchedulePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UrgentItemsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell><Outlet /></AppShell>}>
              <Route path="/" element={<Navigate to="/schedule" replace />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/shopping-list" element={<ShoppingListPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </UrgentItemsProvider>
    </QueryClientProvider>
  );
}
