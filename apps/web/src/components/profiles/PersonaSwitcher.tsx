'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@bodhai/ui';
import {
  getAllStudents,
  getAllTeachers,
  getActivePersona,
  setActivePersona,
  type ActivePersona,
} from '@/lib/profiles-data';
import { GraduationCap, UserCheck, Users } from 'lucide-react';

interface PersonaSwitcherProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function PersonaSwitcher({ isOpen, onClose }: PersonaSwitcherProps): React.JSX.Element {
  const locale = useLocale();
  const router = useRouter();
  const [currentPersona, setCurrentPersona] = React.useState<ActivePersona | null>(null);

  const students = getAllStudents();
  const teachers = getAllTeachers();

  React.useEffect(() => {
    setCurrentPersona(getActivePersona());
  }, [isOpen]);

  const handleSelectStudent = (id: string, slug: string, name: string) => {
    const persona: ActivePersona = { type: 'student', id, slug, name };
    setActivePersona(persona);
    setCurrentPersona(persona);
    onClose();
    router.push(`/profiles/students/${slug}`);
  };

  const handleSelectTeacher = (id: string, slug: string, name: string) => {
    const persona: ActivePersona = { type: 'teacher', id, slug, name };
    setActivePersona(persona);
    setCurrentPersona(persona);
    onClose();
    router.push(`/profiles/teachers/${slug}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <DialogTitle className="text-lg font-bold">
              Switch Interactive Persona / सक्रिय प्रोफ़ाइल बदलें
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Experience BodhAI with distinct student competencies, streaks, and error patterns or inspect from an educator perspective.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* Section 1: Students */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              Student Profiles (कक्षा 6 से 10 के विद्यार्थी)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {students.map((st) => {
                const isSelected = currentPersona?.slug === st.slug;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStudent(st.id, st.slug, st.fullName)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-border/80 hover:border-primary/50 hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${st.avatarGradient} text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0`}
                    >
                      {st.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-foreground truncate">
                          {locale === 'hi' ? st.fullNameHi : st.fullName}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                          {st.overallMastery}%
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        Class {st.grade}-{st.section} • Roll {st.rollNumber}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Teachers */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Teacher Profiles (शिक्षक प्रोफ़ाइल)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teachers.map((tc) => {
                const isSelected = currentPersona?.slug === tc.slug;
                return (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => handleSelectTeacher(tc.id, tc.slug, tc.fullName)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-border/80 hover:border-primary/50 hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${tc.avatarGradient} text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0`}
                    >
                      {tc.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-foreground truncate">
                          {locale === 'hi' ? tc.fullNameHi : tc.fullName}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1">
                          {tc.experienceYears}y
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {locale === 'hi' ? tc.titleHi : tc.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
