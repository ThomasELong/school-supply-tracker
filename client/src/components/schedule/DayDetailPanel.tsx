import { X } from 'lucide-react';
import { getItemStatus } from '../../types';
import type { Project, ProjectItem } from '../../types';

interface DayDetailPanelProps {
  date: string; // YYYY-MM-DD
  projects: Project[];
  onClose: () => void;
}

function formatDate(ymd: string): string {
  // Parse as local date to avoid timezone shift
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const STATUS_STYLES = {
  green: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
  yellow: { dot: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  red: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
};

function ItemRow({ item }: { item: ProjectItem }) {
  const status = getItemStatus(item);
  const styles = STATUS_STYLES[status];

  return (
    <div className={`flex items-start gap-2 rounded-md px-2 py-1.5 ${styles.bg}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-800">{item.item_name}</p>
        <p className={`text-xs ${styles.text}`}>
          {item.quantity_on_hand} on hand / {item.quantity_needed} needed
        </p>
      </div>
    </div>
  );
}

export function DayDetailPanel({ date, projects, onClose }: DayDetailPanelProps) {
  const dayProjects = projects.filter((p) => p.scheduled_date === date);

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Selected Day
          </p>
          <p className="text-sm font-semibold text-gray-800">{formatDate(date)}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {dayProjects.length === 0 ? (
          <p className="text-center text-sm text-gray-400 mt-6">No projects on this day.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {dayProjects.map((project) => (
              <div key={project.id}>
                <p className="mb-1.5 text-xs font-semibold text-gray-700">
                  {project.grade_level_name}{' '}
                  <span className="text-gray-400">/</span>{' '}
                  {project.subject_name}
                </p>
                {project.items.length === 0 ? (
                  <p className="text-xs text-gray-400 pl-1">No items added.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {project.items.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-3">
        {(['green', 'yellow', 'red'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1 text-xs text-gray-500">
            <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].dot}`} />
            {s === 'green' ? 'Sufficient' : s === 'yellow' ? 'Low' : 'Out of stock'}
          </span>
        ))}
      </div>
    </div>
  );
}
