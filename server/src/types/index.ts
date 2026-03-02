// ─── Domain entities ───────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export type ItemType = 'consumable' | 'reusable' | 'bulk';

export interface Item {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  quantity_on_hand: number;
  quantity_min: number;
  needs_order: boolean;
  item_type: ItemType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradeLevel {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Subject {
  id: number;
  name: string;
  created_at: string;
}

export interface ProjectItem {
  id: number;               // project_items.id
  item_id: number;
  item_name: string;
  category_name: string;
  quantity_needed: number;
  quantity_on_hand: number;
  quantity_min: number;
  needs_order: boolean;
  notes: string | null;
}

export interface Project {
  id: number;
  grade_level_id: number;
  grade_level_name: string;
  subject_id: number;
  subject_name: string;
  scheduled_date: string;
  notes: string | null;
  items: ProjectItem[];
  created_at: string;
  updated_at: string;
}

// ─── Request bodies ─────────────────────────────────────────────────────────

export interface CreateCategoryBody {
  name: string;
}

export interface CreateItemBody {
  name: string;
  category_id: number;
  quantity_on_hand: number;
  quantity_min: number;
  needs_order?: boolean;
  item_type?: ItemType;
  notes?: string;
}

export type UpdateItemBody = Partial<CreateItemBody>;

export interface CreateGradeLevelBody {
  name: string;
  sort_order: number;
}

export interface CreateSubjectBody {
  name: string;
}

export interface CreateProjectItemBody {
  item_id: number;
  quantity_needed: number;
  notes?: string;
}

export interface CreateProjectBody {
  grade_level_id: number;
  subject_id: number;
  scheduled_date: string;
  notes?: string;
  items: CreateProjectItemBody[];
}
