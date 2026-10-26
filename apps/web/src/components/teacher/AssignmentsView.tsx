'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
} from '@bodhai/ui';
import type {
  AssignmentResponse,
  HeatmapStudent,
  HeatmapSkill,
  GapClusterItem,
} from '@bodhai/api-client';

interface AssignmentsViewProps {
  readonly assignments: AssignmentResponse[];
  readonly students: HeatmapStudent[];
  readonly skills: HeatmapSkill[];
  readonly onCreateAssignment: (data: {
    title: string;
    description?: string;
    skill_ids: string[];
    student_ids: string[];
    due_date?: string;
  }) => Promise<void>;
  readonly prefilledCluster?: GapClusterItem | null;
  readonly onClearPrefilled?: () => void;
}

export function AssignmentsView({
  assignments,
  students,
  skills,
  onCreateAssignment,
  prefilledCluster,
  onClearPrefilled,
}: AssignmentsViewProps): React.JSX.Element {
  const t = useTranslations('teacherDashboard.assignments');

  const [isFormOpen, setIsFormOpen] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form states
  const [title, setTitle] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [selectedSkillIds, setSelectedSkillIds] = React.useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([]);
  const [skillSearch, setSkillSearch] = React.useState<string>('');
  const [dueDate, setDueDate] = React.useState<string>('');

  // Handle prefilled cluster
  React.useEffect(() => {
    if (prefilledCluster) {
      setTitle(`Targeted Revision: ${prefilledCluster.skill_name}`);
      const strat = prefilledCluster.suggested_revision_plan?.strategy || 'Targeted Practice';
      setDescription(
        `Scaffolded practice addressing conceptual gap in ${prefilledCluster.skill_name}. Strategy: ${strat}`,
      );
      setSelectedSkillIds([prefilledCluster.skill_id]);
      setSelectedStudentIds([...prefilledCluster.student_ids]);
      setIsFormOpen(true);
    }
  }, [prefilledCluster]);

  const handleToggleSkill = (skillId: string): void => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  };

  const handleToggleStudent = (studentId: string): void => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleSelectAllStudents = (): void => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.student_id));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an assignment title');
      return;
    }
    if (selectedSkillIds.length === 0) {
      setErrorMsg('Please select at least one target skill');
      return;
    }

    // If no students explicitly selected, assign to all students
    const finalStudentIds =
      selectedStudentIds.length > 0 ? selectedStudentIds : students.map((s) => s.student_id);

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onCreateAssignment({
        title: title.trim(),
        description: description.trim() || undefined,
        skill_ids: selectedSkillIds,
        student_ids: finalStudentIds,
        due_date: dueDate || undefined,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedSkillIds([]);
      setSelectedStudentIds([]);
      setDueDate('');
      setIsFormOpen(false);
      onClearPrefilled?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSkills = React.useMemo(() => {
    if (!skillSearch.trim()) return skills.slice(0, 30);
    const q = skillSearch.toLowerCase();
    return skills
      .filter(
        (s) => s.skill_name.toLowerCase().includes(q) || s.skill_code.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [skills, skillSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{t('title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          className="cursor-pointer shrink-0"
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          {isFormOpen ? 'Cancel' : `+ ${t('createNew')}`}
        </Button>
      </div>

      {/* Assignment Creation Form */}
      {isFormOpen && (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">{t('createNew')}</CardTitle>
            <CardDescription className="text-xs">
              Push competencies to specific students or the entire class.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs rounded border border-destructive/20 bg-destructive/10 text-destructive font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {t('assignmentTitle')} *
                  </label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Integer Addition & Subtraction Ladder"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Due Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {t('assignmentDesc')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional teacher instructions or focus notes..."
                  className="w-full text-xs rounded-md border border-input bg-transparent px-3 py-2 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[70px]"
                />
              </div>

              {/* Target Skills Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    {t('targetSkills')} * ({selectedSkillIds.length} selected)
                  </label>
                  <Input
                    placeholder="Search skills..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    className="text-xs max-w-xs h-7"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-border rounded-md p-2 space-y-1 bg-muted/20">
                  {filteredSkills.map((sk) => {
                    const isSelected = selectedSkillIds.includes(sk.skill_id);
                    return (
                      <button
                        key={sk.skill_id}
                        type="button"
                        onClick={() => handleToggleSkill(sk.skill_id)}
                        className={`w-full flex items-center justify-between text-left p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {sk.skill_code}
                          </span>
                          <span className="truncate">{sk.skill_name}</span>
                        </div>
                        <span className="shrink-0 text-xs">{isSelected ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Students Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    {t('targetGroup')} (
                    {selectedStudentIds.length === 0
                      ? 'All Students'
                      : `${selectedStudentIds.length} Selected`}
                    )
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllStudents}
                    className="text-xs h-7 cursor-pointer"
                  >
                    {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="max-h-32 overflow-y-auto border border-border rounded-md p-2 flex flex-wrap gap-1.5 bg-muted/20">
                  {students.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.student_id);
                    return (
                      <button
                        key={st.student_id}
                        type="button"
                        onClick={() => handleToggleStudent(st.student_id)}
                        className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-medium'
                            : 'bg-background border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {st.student_name} {st.roll_number ? `(${st.roll_number})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  className="cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="cursor-pointer text-xs"
                >
                  {isSubmitting ? t('creating') : t('createButton')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assignment List */}
      {assignments.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((asgn) => (
            <Card key={asgn.id} className="border-border shadow-xs">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{asgn.title}</span>
                    <Badge
                      variant={asgn.status === 'active' ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {asgn.status}
                    </Badge>
                  </div>
                  {asgn.description && (
                    <p className="text-xs text-muted-foreground">{asgn.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                    <span>{t('totalAssigned', { count: asgn.total_assigned })}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {t('completedCount', { count: asgn.completed_count })}
                    </span>
                    {asgn.due_date && (
                      <>
                        <span>•</span>
                        <span>Due: {new Date(asgn.due_date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs font-mono">
                    {asgn.skill_ids.length} Competencies
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
