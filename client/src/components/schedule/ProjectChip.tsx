import { Pencil } from 'lucide-react';
import { getItemStatus } from '../../types';
import type { Project } from '../../types';

const STATUS_DOT: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
};

interface ProjectChipProps {
  project: Project;
  compact?: boolean;
  onClick: () => void;
}

export function ProjectChip({ project, compact = false, onClick }: ProjectChipProps) {
  const MAX_ITEMS = compact ? 3 : 99;
  const visibleItems = project.items.slice(0, MAX_ITEMS);
  const overflow = project.items.length - visibleItems.length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-md border border-gray-200 bg-white px-2 py-1.5 shadow-sm hover:border-blue-400 hover:shadow transition-all group"
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-xs font-semibold text-gray-700 truncate">
          {project.grade_level_name} · {project.subject_name}
        </span>
        <Pencil
          size={11}
          className="shrink-0 text-gray-300 group-hover:text-blue-500 transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {visibleItems.map((item) => {
          const status = getItemStatus(item);
          const label = compact
            ? item.item_name.length > 18
              ? item.item_name.slice(0, 17) + '…'
              : item.item_name
            : item.item_name;
          return (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 text-xs text-gray-600"
            >
              <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
              {label}
            </span>
          );
        })}
        {overflow > 0 && (
          <span className="text-xs text-gray-400 italic">+{overflow} more</span>
        )}
      </div>
    </button>
  );
}
