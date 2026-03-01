import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CalendarMonth } from '../components/schedule/CalendarMonth';
import { CalendarWeek } from '../components/schedule/CalendarWeek';
import { DayDetailPanel } from '../components/schedule/DayDetailPanel';
import { ProjectForm } from '../components/schedule/ProjectForm';
import { projectsApi } from '../api/projects';
import type { Project } from '../types';

type CalendarView = 'month' | 'week';

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function addWeeks(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n * 7);
  return r;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function weekLabel(d: Date): string {
  const sun = new Date(d);
  sun.setDate(sun.getDate() - sun.getDay());
  const sat = new Date(sun);
  sat.setDate(sat.getDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(sun)} – ${fmt(sat)}, ${sat.getFullYear()}`;
}

function dateRangeForView(view: CalendarView, d: Date): { date_from: string; date_to: string } {
  if (view === 'month') {
    const year = d.getFullYear();
    const month = d.getMonth();
    const from = new Date(year, month, -6);
    const to = new Date(year, month + 1, 14);
    return { date_from: toYMD(from), date_to: toYMD(to) };
  } else {
    const sun = new Date(d);
    sun.setDate(sun.getDate() - sun.getDay());
    const sat = new Date(sun);
    sat.setDate(sat.getDate() + 6);
    return { date_from: toYMD(sun), date_to: toYMD(sat) };
  }
}

export function SchedulePage() {
  const qc = useQueryClient();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [defaultDate, setDefaultDate] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDayClick = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  const { date_from, date_to } = useMemo(
    () => dateRangeForView(view, currentDate),
    [view, currentDate]
  );

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', date_from, date_to],
    queryFn: () => projectsApi.list({ date_from, date_to }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setDeleteTarget(null);
    },
  });

  const handlePrev = () =>
    setCurrentDate((d) => (view === 'month' ? addMonths(d, -1) : addWeeks(d, -1)));

  const handleNext = () =>
    setCurrentDate((d) => (view === 'month' ? addMonths(d, 1) : addWeeks(d, 1)));

  const handleToday = () => setCurrentDate(new Date());

  const handleAddProject = (date: string) => {
    setEditProject(null);
    setDefaultDate(date);
    setFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditProject(project);
    setDefaultDate('');
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditProject(null);
    setDefaultDate('');
  };

  const label = view === 'month' ? monthLabel(currentDate) : weekLabel(currentDate);

  const headerAction = (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrev}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[200px] text-center text-sm font-semibold text-gray-800">
          {label}
        </span>
        <button
          onClick={handleNext}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <Button variant="secondary" size="sm" onClick={handleToday}>
        Today
      </Button>

      <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
        {(['month', 'week'] as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={[
              'px-3 py-1.5 capitalize font-medium transition-colors',
              view === v
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Schedule" action={headerAction} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {selectedDate && (
          <DayDetailPanel
            date={selectedDate}
            projects={projects}
            onClose={() => setSelectedDate(null)}
          />
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            Loading…
          </div>
        ) : view === 'month' ? (
          <CalendarMonth
            currentDate={currentDate}
            projects={projects}
            selectedDate={selectedDate ?? undefined}
            onEditProject={handleEditProject}
            onAddProject={handleAddProject}
            onDayClick={handleDayClick}
          />
        ) : (
          <CalendarWeek
            currentDate={currentDate}
            projects={projects}
            selectedDate={selectedDate ?? undefined}
            onEditProject={handleEditProject}
            onAddProject={handleAddProject}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      <ProjectForm
        open={formOpen}
        onClose={handleFormClose}
        editProject={editProject}
        defaultDate={defaultDate}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Project"
        message={
          deleteTarget
            ? `Delete the project for ${deleteTarget.grade_level_name} / ${deleteTarget.subject_name} on ${deleteTarget.scheduled_date}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
