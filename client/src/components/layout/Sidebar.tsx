import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { Archive, ShoppingCart, CalendarDays, Settings } from 'lucide-react';

const links = [
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/inventory', label: 'Inventory', icon: Archive },
  { to: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-100 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-gray-700">
        <h1 className="text-sm font-bold tracking-wide text-white uppercase">
          Supply Tracker
        </h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
