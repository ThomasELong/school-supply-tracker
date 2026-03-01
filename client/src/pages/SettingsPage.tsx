import { PageHeader } from '../components/layout/PageHeader';
import { CategoryManager } from '../components/settings/CategoryManager';
import { SubjectManager } from '../components/settings/SubjectManager';
import { GradeLevelManager } from '../components/settings/GradeLevelManager';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage categories, subjects, and grade levels"
      />
      <Section title="Categories">
        <CategoryManager />
      </Section>
      <Section title="Subjects">
        <SubjectManager />
      </Section>
      <Section title="Grade Levels">
        <GradeLevelManager />
      </Section>
    </div>
  );
}
