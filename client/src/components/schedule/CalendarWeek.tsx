import { Plus } from 'lucide-react';
import { ProjectChip } from './ProjectChip';
import type { Project } from '../../types';

const DAY_NAMES_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface CalendarWeekProps {
  currentDate: Date;
  projects: Project[];
  selectedDate?: string;
  onEditProject: (project: Project) => void;
  onAddProject: (date: string) => void;
  onDayClick: (date: string) => void;
}

export function CalendarWeek({
  currentDate,
  projects,
  selectedDate,
  onEditProject,
  onAddProject,
  onDayClick,
}: CalendarWeekProps) {
  // Find the Sunday of the week containing currentDate
  const sunday = new Date(currentDate);
  sunday.setDate(sunday.getDate() - sunday.getDay());

  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    return d;
  });

  const byDate: Record<string, Project[]> = {};
  for (const p of projects) {
    if (!byDate[p.scheduled_date]) byDate[p.scheduled_date] = [];
    byDate[p.scheduled_date].push(p);
  }

  const todayStr = toYMD(new Date());

  return (
    <div className="flex-1 overflow-auto">
      {/* Scroll wrapper — allows horizontal scroll on very small screens */}
      <div className="min-w-[420px]">
      {/* Column headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {days.map((day) => {
          const ymd = toYMD(day);
          const isToday = ymd === todayStr;
          return (
            <div
              key={ymd}
              className="py-2 text-center flex flex-col items-center gap-0.5 border-r border-gray-100 last:border-r-0"
            >
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span className="hidden sm:inline">{DAY_NAMES_FULL[day.getDay()]}</span>
                <span className="sm:hidden">{DAY_NAMES_SHORT[day.getDay()]}</span>
              </span>
              <span
                className={[
                  'text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full',
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-700',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map((day) => {
          const ymd = toYMD(day);
          const dayProjects = byDate[ymd] ?? [];
          const isSelected = ymd === selectedDate;

          return (
            <div
              key={ymd}
              onClick={() => onDayClick(ymd)}
              className={[
                'border-r border-gray-100 last:border-r-0 p-2 flex flex-col gap-1.5 cursor-pointer',
                isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-blue-50/40',
              ].join(' ')}
            >
              {dayProjects.map((p) => (
                <div key={p.id} onClick={(e) => e.stopPropagation()}>
                  <ProjectChip
                    project={p}
                    compact={false}
                    onClick={() => onEditProject(p)}
                  />
                </div>
              ))}

              <button
                onClick={(e) => { e.stopPropagation(); onAddProject(ymd); }}
                className="mt-auto flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-gray-200 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                aria-label={`Add project on ${ymd}`}
              >
                <Plus size={12} />
                Add
              </button>
            </div>
          );
        })}
      </div>
      </div>{/* end min-w scroll wrapper */}
    </div>
  );
}
