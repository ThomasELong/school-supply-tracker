import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { gradeLevelsApi } from '../../api/gradeLevels';
import { subjectsApi } from '../../api/subjects';
import { itemsApi } from '../../api/items';
import { projectsApi } from '../../api/projects';
import type { Project, CreateProjectBody, CreateProjectItemBody } from '../../types';

interface ItemRow {
  item_id: number;
  quantity_needed: number;
  notes: string;
}

function emptyRow(): ItemRow {
  return { item_id: 0, quantity_needed: 1, notes: '' };
}

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  editProject?: Project | null;
  defaultDate?: string;
}

export function ProjectForm({ open, onClose, editProject, defaultDate }: ProjectFormProps) {
  const qc = useQueryClient();

  const [gradeId, setGradeId] = useState(0);
  const [subjectId, setSubjectId] = useState(0);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editProject) {
        setGradeId(editProject.grade_level_id);
        setSubjectId(editProject.subject_id);
        setDate(editProject.scheduled_date);
        setNotes(editProject.notes ?? '');
        setRows(
          editProject.items.length > 0
            ? editProject.items.map((i) => ({
                item_id: i.item_id,
                quantity_needed: i.quantity_needed,
                notes: i.notes ?? '',
              }))
            : [emptyRow()]
        );
      } else {
        setGradeId(0);
        setSubjectId(0);
        setDate(defaultDate ?? '');
        setNotes('');
        setRows([emptyRow()]);
      }
      setError('');
    }
  }, [open, editProject, defaultDate]);

  const { data: gradeLevels = [] } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: gradeLevelsApi.list,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsApi.list,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.list(),
  });

  const mutation = useMutation({
    mutationFn: (body: CreateProjectBody) =>
      editProject
        ? projectsApi.update(editProject.id, body)
        : projectsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  const updateRow = (index: number, patch: Partial<ItemRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const handleSubmit = () => {
    if (!gradeId) { setError('Grade level is required'); return; }
    if (!subjectId) { setError('Subject is required'); return; }
    if (!date) { setError('Date is required'); return; }

    const validRows = rows.filter((r) => r.item_id > 0);
    if (validRows.length === 0) { setError('At least one item is required'); return; }

    const itemsPayload: CreateProjectItemBody[] = validRows.map((r) => ({
      item_id: r.item_id,
      quantity_needed: r.quantity_needed,
      notes: r.notes || undefined,
    }));

    mutation.mutate({
      grade_level_id: gradeId,
      subject_id: subjectId,
      scheduled_date: date,
      notes: notes || undefined,
      items: itemsPayload,
    });
  };

  const itemOptions = items.map((it) => ({ value: it.id, label: `${it.name} (${it.category_name})` }));

  return (
    <Modal
      open={open}
      title={editProject ? 'Edit Project' : 'New Project'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editProject ? 'Save Changes' : 'Add Project'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="proj-grade"
            label="Grade Level"
            value={gradeId || ''}
            onChange={(e) => setGradeId(Number(e.target.value))}
            placeholder="Select grade…"
            options={gradeLevels.map((g) => ({ value: g.id, label: g.name }))}
          />
          <Select
            id="proj-subject"
            label="Subject"
            value={subjectId || ''}
            onChange={(e) => setSubjectId(Number(e.target.value))}
            placeholder="Select subject…"
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>

        <Input
          id="proj-date"
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="proj-notes" className="text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="proj-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Supply Items</span>
            <Button variant="secondary" size="sm" onClick={addRow}>
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          </div>

          {rows.map((row, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  id={`proj-item-${idx}`}
                  label={idx === 0 ? 'Item' : undefined}
                  value={row.item_id || ''}
                  onChange={(e) => updateRow(idx, { item_id: Number(e.target.value) })}
                  placeholder="Select item…"
                  options={itemOptions}
                />
              </div>
              <div className="w-24">
                <Input
                  id={`proj-qty-${idx}`}
                  label={idx === 0 ? 'Qty Needed' : undefined}
                  type="number"
                  min={1}
                  value={row.quantity_needed}
                  onChange={(e) => updateRow(idx, { quantity_needed: Math.max(1, Number(e.target.value)) })}
                />
              </div>
              <button
                onClick={() => removeRow(idx)}
                disabled={rows.length === 1}
                className="mb-0.5 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove item"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
