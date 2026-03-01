import { Plus } from 'lucide-react';
import { ProjectChip } from './ProjectChip';
import type { Project } from '../../types';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface CalendarMonthProps {
  currentDate: Date;
  projects: Project[];
  selectedDate?: string;
  onEditProject: (project: Project) => void;
  onAddProject: (date: string) => void;
  onDayClick: (date: string) => void;
}

export function CalendarMonth({
  currentDate,
  projects,
  selectedDate,
  onEditProject,
  onAddProject,
  onDayClick,
}: CalendarMonthProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month and how many days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Build grid: pad with prev-month days so grid starts on Sunday
  const startOffset = firstDay.getDay(); // 0=Sun
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month, 1 - startOffset + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }

  // Index projects by date string
  const byDate: Record<string, Project[]> = {};
  for (const p of projects) {
    if (!byDate[p.scheduled_date]) byDate[p.scheduled_date] = [];
    byDate[p.scheduled_date].push(p);
  }

  const todayStr = toYMD(new Date());

  return (
    <div className="flex-1 overflow-auto">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div
        className="grid grid-cols-7 flex-1"
        style={{ gridAutoRows: 'minmax(110px, 1fr)' }}
      >
        {cells.map(({ date, inMonth }, idx) => {
          const ymd = toYMD(date);
          const dayProjects = byDate[ymd] ?? [];
          const isToday = ymd === todayStr;

          const isSelected = ymd === selectedDate;

          return (
            <div
              key={idx}
              onClick={() => inMonth && onDayClick(ymd)}
              className={[
                'relative border-r border-b border-gray-100 p-1.5 flex flex-col gap-1 min-h-0',
                inMonth ? 'cursor-pointer' : 'bg-gray-50 opacity-50',
                inMonth && !isSelected && 'bg-white hover:bg-blue-50/40',
                isSelected && 'bg-blue-50 ring-1 ring-inset ring-blue-300',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Date number + add button */}
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={[
                    'text-xs font-medium leading-none px-1 py-0.5 rounded',
                    isToday
                      ? 'bg-blue-600 text-white'
                      : inMonth
                      ? 'text-gray-700'
                      : 'text-gray-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {date.getDate()}
                </span>

                {inMonth && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddProject(ymd); }}
                    className="p-0.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                    aria-label={`Add project on ${ymd}`}
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              {/* Project chips */}
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayProjects.map((p) => (
                  <div key={p.id} onClick={(e) => e.stopPropagation()}>
                    <ProjectChip
                      project={p}
                      compact
                      onClick={() => onEditProject(p)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
