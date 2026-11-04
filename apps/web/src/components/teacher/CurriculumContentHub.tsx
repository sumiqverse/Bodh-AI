'use client';

import * as React from 'react';
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
import {
  BookOpen,
  Search,
  Upload,
  PlusCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import { ClassLessonEditor } from './ClassLessonEditor';
import type {
  CurriculumSearchResponse,
  ClassroomContentResponse,
  ClassResponse,
} from '@bodhai/api-client';

interface CurriculumContentHubProps {
  readonly activeClass: ClassResponse | null;
  readonly onRefreshData?: () => void;
}

function detectClassSubject(name?: string, subject?: string): string {
  if (subject && subject !== 'all') {
    return subject.toLowerCase().replace(/\s+/g, '_');
  }
  if (!name) return 'mathematics';
  const n = name.toLowerCase();
  if (n.includes('soc') || n.includes('sst') || n.includes('hist') || n.includes('geo')) {
    return 'social_science';
  }
  if (n.includes('sci')) {
    return 'science';
  }
  if (n.includes('eng')) {
    return 'english';
  }
  if (n.includes('hin')) {
    return 'hindi';
  }
  return 'mathematics';
}

function formatSubjectLabel(subj: string): string {
  if (subj === 'social_science') return 'Social Science';
  if (subj === 'mathematics') return 'Mathematics';
  if (subj === 'science') return 'Science';
  if (subj === 'english') return 'English';
  if (subj === 'hindi') return 'Hindi';
  return subj.charAt(0).toUpperCase() + subj.slice(1);
}

export function CurriculumContentHub({
  activeClass,
  onRefreshData,
}: CurriculumContentHubProps): React.JSX.Element {
  const apiClient = getWebApiClient();

  const classSubject = React.useMemo(() => {
    const rawSubj = (activeClass as unknown as { subject?: string })?.subject;
    return detectClassSubject(activeClass?.name, rawSubj);
  }, [activeClass]);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchGrade, setSearchGrade] = React.useState<string>(
    activeClass?.grade ? String(activeClass.grade) : 'all',
  );
  const [searchSubject, setSearchSubject] = React.useState<string>(classSubject);
  const [isSearching, setIsSearching] = React.useState<boolean>(false);
  const [searchResults, setSearchResults] = React.useState<CurriculumSearchResponse | null>(null);

  // Classroom Syllabus Content state (locked to activeClass's subject)
  const [classContent, setClassContent] = React.useState<ClassroomContentResponse | null>(null);
  const [isLoadingContent, setIsLoadingContent] = React.useState<boolean>(false);
  const [expandedTopics, setExpandedTopics] = React.useState<Record<string, boolean>>({});
  const [expandedSkills, setExpandedSkills] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (activeClass) {
      if (activeClass.grade) {
        setSearchGrade(String(activeClass.grade));
      }
      setSearchSubject(classSubject);
    }
  }, [activeClass, classSubject]);

  // Upload Content Pack Dialog / State
  const [uploadJsonText, setUploadJsonText] = React.useState<string>('');
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);

  // Custom Question Creator Dialog / State
  const [targetSkillCode, setTargetSkillCode] = React.useState<string>('');
  const [promptEn, setPromptEn] = React.useState<string>('');
  const [promptHi, setPromptHi] = React.useState<string>('');
  const [optionA, setOptionA] = React.useState<string>('');
  const [optionB, setOptionB] = React.useState<string>('');
  const [optionC, setOptionC] = React.useState<string>('');
  const [optionD, setOptionD] = React.useState<string>('');
  const [correctOption, setCorrectOption] = React.useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = React.useState<string>('');
  const [hint1, setHint1] = React.useState<string>('');
  const [hint2, setHint2] = React.useState<string>('');
  const [hint3, setHint3] = React.useState<string>('');
  const [difficulty, setDifficulty] = React.useState<number>(3);
  const [isCreatingQuestion, setIsCreatingQuestion] = React.useState<boolean>(false);
  const [createSuccessMsg, setCreateSuccessMsg] = React.useState<string | null>(null);

  // Sub-tab view: 'syllabus' | 'search' | 'upload' | 'create'
  const [hubTab, setHubTab] = React.useState<'syllabus' | 'search' | 'upload' | 'create'>(
    'syllabus',
  );

  // Load classroom content for this specific subject
  const loadClassroomContent = React.useCallback(
    async (subj?: string) => {
      if (!activeClass) return;
      const token = getAuthToken();
      if (!token) return;

      const effectiveSubj = subj && subj !== 'all' ? subj : classSubject;
      setIsLoadingContent(true);
      try {
        const res = await apiClient.getClassroomContent(activeClass.id, effectiveSubj, token);
        setClassContent(res);
        // Expand first 2 topics by default
        if (res.topics.length > 0) {
          const initExp: Record<string, boolean> = {};
          res.topics.slice(0, 2).forEach((t) => {
            initExp[t.id] = true;
          });
          setExpandedTopics(initExp);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setIsLoadingContent(false);
      }
    },
    [activeClass, apiClient, classSubject],
  );

  React.useEffect(() => {
    if (activeClass) {
      void loadClassroomContent(classSubject);
    }
  }, [activeClass, loadClassroomContent, classSubject]);

  // Execute Search across Classes 6-10
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const token = getAuthToken();
    if (!token) return;

    setIsSearching(true);
    try {
      const res = await apiClient.searchCurriculumContent(
        searchQuery.trim(),
        {
          grade: searchGrade === 'all' ? undefined : parseInt(searchGrade, 10),
          subject: searchSubject === 'all' ? undefined : searchSubject,
          limit: 40,
        },
        token,
      );
      setSearchResults(res);
      setHubTab('search');
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle Topic
  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle Skill
  const toggleSkill = (id: string) => {
    setExpandedSkills((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Submit Content Upload Pack
  const handleUploadSubmit = async () => {
    if (!activeClass || !uploadJsonText.trim()) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      const parsed = JSON.parse(uploadJsonText);
      setIsUploading(true);
      setUploadStatus(null);
      const res = await apiClient.uploadClassroomContent(activeClass.id, parsed, token);
      setUploadStatus(`✅ ${res.message}`);
      setUploadJsonText('');
      void loadClassroomContent(classSubject);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      setUploadStatus(
        `❌ Upload failed: ${err instanceof Error ? err.message : 'Invalid JSON format'}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Custom Question
  const handleCreateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !targetSkillCode || !promptEn.trim()) return;
    const token = getAuthToken();
    if (!token) return;

    setIsCreatingQuestion(true);
    setCreateSuccessMsg(null);

    const payload = {
      skill_code: targetSkillCode.trim(),
      prompt_en: promptEn.trim(),
      prompt_hi: promptHi.trim() || undefined,
      options: [
        { id: 'A', text: optionA.trim() || 'Option A', is_correct: correctOption === 'A' },
        { id: 'B', text: optionB.trim() || 'Option B', is_correct: correctOption === 'B' },
        { id: 'C', text: optionC.trim() || 'Option C', is_correct: correctOption === 'C' },
        { id: 'D', text: optionD.trim() || 'Option D', is_correct: correctOption === 'D' },
      ],
      difficulty,
      explanation: explanation.trim() || 'Custom teacher-authored competency item.',
      hints: [
        hint1.trim() || 'Review foundational definitions.',
        hint2.trim() || 'Apply the problem-solving rubric step-by-step.',
        hint3.trim() || `Option ${correctOption} satisfies all logical invariants.`,
      ],
    };

    try {
      const created = await apiClient.createClassroomQuestion(activeClass.id, payload, token);
      setCreateSuccessMsg(
        `✅ Custom Question ${created.code} published and linked to ${created.skill_code}!`,
      );
      // Reset form
      setPromptEn('');
      setPromptHi('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setExplanation('');
      setHint1('');
      setHint2('');
      setHint3('');
      void loadClassroomContent(classSubject);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      setCreateSuccessMsg(
        `❌ Creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setIsCreatingQuestion(false);
    }
  };

  return (
    <div className="space-y-6">
      {activeClass && <ClassLessonEditor classId={activeClass.id} content={classContent} />}
      {/* Top Banner & Hub Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Curriculum & Content Hub{activeClass ? ` • ${activeClass.name}` : ' (Classes 6 to 10)'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeClass
              ? `NCERT-aligned ${formatSubjectLabel(classContent?.subject || classSubject)} curriculum and competencies for Class ${activeClass.grade}.`
              : 'Explore NCERT-aligned chapter sequences and upload custom questions for your classroom.'}
          </p>
        </div>

        {/* Action Button Group */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={hubTab === 'syllabus' ? 'primary' : 'outline'}
            onClick={() => setHubTab('syllabus')}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            Classroom Syllabus
          </Button>

          <Button
            type="button"
            size="sm"
            variant={hubTab === 'search' ? 'primary' : 'outline'}
            onClick={() => setHubTab('search')}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Search Curriculum
          </Button>

          <Button
            type="button"
            size="sm"
            variant={hubTab === 'create' ? 'primary' : 'outline'}
            onClick={() => {
              setHubTab('create');
              if (!targetSkillCode && classContent?.topics[0]?.skills[0]) {
                setTargetSkillCode(classContent.topics[0].skills[0].code);
              }
            }}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create Custom Question
          </Button>

          <Button
            type="button"
            size="sm"
            variant={hubTab === 'upload' ? 'primary' : 'outline'}
            onClick={() => setHubTab('upload')}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Content Pack
          </Button>
        </div>
      </div>

      {/* SEARCH INTERFACE */}
      <Card className="border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            NCERT Curriculum Search
          </CardTitle>
          <CardDescription className="text-xs">
            Query any topic, chapter, or competency for{' '}
            {activeClass
              ? `Class ${activeClass.grade} ${formatSubjectLabel(classSubject)}`
              : 'your classroom'}
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Search topic or skill (e.g. 'Linear Equations', 'Photosynthesis', 'Tenses', 'Integers')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pr-8"
              />
            </div>

            {/* Grade Filter */}
            <select
              value={searchGrade}
              onChange={(e) => setSearchGrade(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
            >
              <option value="all">All Grades (6-10)</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>

            {/* Subject Filter */}
            <select
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
            >
              <option value="all">All Subjects</option>
              <option value="mathematics">Mathematics</option>
              <option value="science">Science</option>
              <option value="social_science">Social Science</option>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
            </select>

            <Button
              type="submit"
              size="sm"
              disabled={isSearching || !searchQuery.trim()}
              className="text-xs gap-1.5 cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              {isSearching ? 'Searching...' : 'Search NCERT'}
            </Button>
          </form>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[11px] text-muted-foreground mr-1">
              Popular in {formatSubjectLabel(classSubject)}:
            </span>
            {(classSubject === 'science'
              ? [
                  'Matter in Our Surroundings',
                  'Acids & Bases',
                  'Photosynthesis',
                  'Electricity',
                  'Light',
                  'Atoms & Molecules',
                ]
              : classSubject === 'social_science'
                ? [
                    'Resources & Development',
                    'French Revolution',
                    'Democracy',
                    'Indian Constitution',
                    'Climate',
                  ]
                : classSubject === 'english'
                  ? [
                      'Grammar Tenses',
                      'Active & Passive Voice',
                      'Direct & Indirect Speech',
                      'Reading Comprehension',
                    ]
                  : classSubject === 'hindi'
                    ? ['व्याकरण', 'समास', 'मुहावरे', 'संधि', 'अलंकार']
                    : [
                        'Linear Equations',
                        'Fractions',
                        'Polynomials',
                        'Quadratic Equations',
                        'Coordinate Geometry',
                      ]
            ).map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setSearchQuery(term);
                  void apiClient
                    .searchCurriculumContent(
                      term,
                      {
                        grade: activeClass?.grade,
                        subject: classSubject,
                      },
                      getAuthToken() || undefined,
                    )
                    .then((res) => {
                      setSearchResults(res);
                      setHubTab('search');
                    });
                }}
                className="text-[11px] px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer text-muted-foreground"
              >
                {term}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* VIEW: SEARCH RESULTS */}
      {hubTab === 'search' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Search Results{' '}
              {searchResults &&
                `(${searchResults.total_topics} Topics, ${searchResults.total_skills} Competencies)`}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHubTab('syllabus')}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Back to Classroom Syllabus
            </Button>
          </div>

          {!searchResults && (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
              Enter a search keyword above to inspect topics and competencies across Classes 6 to
              10.
            </div>
          )}

          {searchResults &&
            searchResults.total_topics === 0 &&
            searchResults.total_skills === 0 && (
              <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                No matching NCERT topics or competencies found for &quot;{searchResults.query}
                &quot;. Try adjusting your keywords or filters.
              </div>
            )}

          {searchResults && searchResults.topics.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Matching Chapters / Topics
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.topics.map((t) => (
                  <Card
                    key={t.id}
                    className="border-border hover:border-primary/40 transition-colors"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20"
                            >
                              Class {t.grade}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {t.subject.replace('_', ' ')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              #{t.code}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground">{t.name}</h4>
                          {t.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {searchResults && searchResults.skills.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Matching Competency Skills
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.skills.map((s) => (
                  <Card
                    key={s.id}
                    className="border-border hover:border-primary/40 transition-colors"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20"
                            >
                              Class {s.grade}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {s.subject.replace('_', ' ')}
                            </Badge>
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {s.topic_name}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground">{s.name}</h4>
                          {s.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {s.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">
                              {s.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold uppercase">
                              {s.blooms_level}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTargetSkillCode(s.code);
                            setHubTab('create');
                          }}
                          className="text-[11px] h-7 px-2 gap-1 cursor-pointer shrink-0"
                          title="Author custom question for this skill"
                        >
                          <PlusCircle className="w-3 h-3 text-primary" />
                          Add Question
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: CLASSROOM SYLLABUS & COMPETENCIES */}
      {hubTab === 'syllabus' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                {classContent ? `${classContent.class_name} Syllabus` : 'Classroom Curriculum'}
                {classContent && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono text-primary bg-primary/5"
                  >
                    Class {classContent.grade} • {classContent.topics.length} Chapters
                  </Badge>
                )}
                {classContent && classContent.custom_questions_count > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold"
                  >
                    {classContent.custom_questions_count} Teacher Questions
                  </Badge>
                )}
              </h3>
            </div>

            {/* Classroom Subject Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Subject:
              </span>
              <span className="text-xs font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-cream px-3 py-1 text-ink shadow-xs">
                {formatSubjectLabel(classContent?.subject || classSubject)}
              </span>
            </div>
          </div>

          {isLoadingContent && (
            <div className="p-8 text-center rounded-xl border border-border text-muted-foreground text-xs animate-pulse">
              Loading syllabus topics and calibrated questions...
            </div>
          )}

          {!isLoadingContent && classContent && classContent.topics.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
              No topics found for this grade and subject combination.
            </div>
          )}

          {/* CHAPTER ACCORDION LIST */}
          {!isLoadingContent && classContent && (
            <div className="space-y-3">
              {classContent.topics.map((topic, tIdx) => {
                const isExpanded = !!expandedTopics[topic.id];
                return (
                  <Card key={topic.id} className="border-border overflow-hidden">
                    {/* Chapter Header */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleTopic(topic.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleTopic(topic.id);
                        }
                      }}
                      className="p-3 sm:p-4 bg-card hover:bg-muted/30 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                          {tIdx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">
                              {topic.name}
                            </h4>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {topic.code}
                            </span>
                          </div>
                          {topic.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {topic.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                          {topic.skills.length} Competencies
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Competency Skills list */}
                    {isExpanded && (
                      <div className="p-3 sm:p-4 border-t border-border bg-muted/10 space-y-3">
                        {topic.skills.map((skill) => {
                          const isSkillExpanded = !!expandedSkills[skill.id];
                          return (
                            <div
                              key={skill.id}
                              className="rounded-lg border border-border bg-card p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted font-semibold">
                                      {skill.code}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] uppercase font-bold text-primary"
                                    >
                                      {skill.blooms_level}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      Difficulty: {Math.round(skill.difficulty * 100)}%
                                    </span>
                                  </div>
                                  <h5 className="text-xs font-bold text-foreground mt-1">
                                    {skill.name}
                                  </h5>
                                  {skill.description && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {skill.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setTargetSkillCode(skill.code);
                                      setHubTab('create');
                                    }}
                                    className="text-[10px] h-6 px-2 gap-1 cursor-pointer"
                                    title="Create custom question for this skill"
                                  >
                                    <PlusCircle className="w-3 h-3 text-primary" />
                                    Add Question
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleSkill(skill.id)}
                                    className="text-[10px] h-6 px-2 text-muted-foreground cursor-pointer"
                                  >
                                    {isSkillExpanded
                                      ? 'Hide'
                                      : `Questions (${skill.questions.length})`}
                                  </Button>
                                </div>
                              </div>

                              {/* Questions Under Skill */}
                              {isSkillExpanded && (
                                <div className="pt-2 border-t border-border/60 space-y-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Calibrated Assessment Items ({skill.questions.length})
                                  </span>
                                  {skill.questions.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground italic">
                                      No questions linked yet. Use &quot;Add Question&quot; to
                                      author one!
                                    </p>
                                  )}
                                  {skill.questions.map((q, qIdx) => (
                                    <div
                                      key={q.id}
                                      className="p-2.5 rounded-lg border border-border/80 bg-background/50 space-y-1.5 text-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-primary">
                                            Q{qIdx + 1}.
                                          </span>
                                          <span className="font-mono text-[10px] text-muted-foreground">
                                            {q.code}
                                          </span>
                                          {q.is_custom && (
                                            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                                              Teacher Uploaded
                                            </Badge>
                                          )}
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">
                                          Level {q.difficulty}
                                        </Badge>
                                      </div>

                                      {/* Prompt */}
                                      <div className="text-foreground font-medium text-xs leading-relaxed">
                                        {q.prompt}
                                      </div>

                                      {/* Options */}
                                      {q.options && q.options.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                          {q.options.map((opt) => (
                                            <div
                                              key={opt.id}
                                              className={`p-1.5 rounded text-[11px] flex items-center justify-between border ${
                                                opt.is_correct
                                                  ? 'border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400'
                                                  : 'border-border/50 bg-card text-muted-foreground'
                                              }`}
                                            >
                                              <span>
                                                <strong>{opt.id}.</strong> {opt.text}
                                              </span>
                                              {opt.is_correct && (
                                                <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* 3-Level Hints Ladder */}
                                      {q.hints && q.hints.length > 0 && (
                                        <div className="pt-1.5 flex flex-col gap-1 text-[11px]">
                                          <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                            <Lightbulb className="w-3 h-3 text-amber-500" />
                                            3-Level Hints:
                                          </span>
                                          {q.hints.map((hint, hIdx) => (
                                            <div
                                              key={hIdx}
                                              className="text-[10px] text-muted-foreground pl-3 border-l border-amber-500/40"
                                            >
                                              <strong>Hint {hIdx + 1}:</strong> {hint}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: CREATE CUSTOM QUESTION */}
      {hubTab === 'create' && (
        <Card className="border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" />
              Author Custom Question with Pedagogical Hints & Math Preview
            </CardTitle>
            <CardDescription className="text-xs">
              Create an assessment question calibrated for your classroom. Supports LaTeX math
              expressions enclosed in $...$.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <form onSubmit={handleCreateQuestionSubmit} className="space-y-4">
              {createSuccessMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold ${
                    createSuccessMsg.startsWith('✅')
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  }`}
                >
                  {createSuccessMsg}
                </div>
              )}

              {/* Target Skill Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Target Skill Competency Code *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. SKILL-M8-01-01"
                    value={targetSkillCode}
                    onChange={(e) => setTargetSkillCode(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Copy from any competency skill card above
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Difficulty Level (1 = Basic, 5 = Olympiad)
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}
                    className="w-full text-xs font-semibold rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                  >
                    <option value={1}>1 - Foundational (Recall)</option>
                    <option value={2}>2 - Standard (Understanding)</option>
                    <option value={3}>3 - Intermediate (Application)</option>
                    <option value={4}>4 - Advanced (Analysis)</option>
                    <option value={5}>5 - Mastery (Evaluation / Creation)</option>
                  </select>
                </div>
              </div>

              {/* Prompt English */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Question Prompt (English) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Find the value of $x$ in the equation $5x - 15 = 35$."
                  value={promptEn}
                  onChange={(e) => setPromptEn(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              {/* Prompt Hindi (Optional) */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Question Prompt (Hindi - Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. समीकरण $5x - 15 = 35$ में $x$ का मान ज्ञात कीजिए।"
                  value={promptHi}
                  onChange={(e) => setPromptHi(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              {/* Options with Radio for Correct */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Multiple Choice Options (Select radio button for the correct answer) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      key: 'A' as const,
                      val: optionA,
                      setVal: setOptionA,
                      placeholder: 'Option A (e.g. x = 10)',
                    },
                    {
                      key: 'B' as const,
                      val: optionB,
                      setVal: setOptionB,
                      placeholder: 'Option B (e.g. x = 8)',
                    },
                    {
                      key: 'C' as const,
                      val: optionC,
                      setVal: setOptionC,
                      placeholder: 'Option C (e.g. x = 4)',
                    },
                    {
                      key: 'D' as const,
                      val: optionD,
                      setVal: setOptionD,
                      placeholder: 'Option D (e.g. x = 12)',
                    },
                  ].map((opt) => (
                    <div
                      key={opt.key}
                      className={`flex items-center gap-2 p-2 rounded-lg border ${
                        correctOption === opt.key
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-border bg-card'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === opt.key}
                        onChange={() => setCorrectOption(opt.key)}
                        className="cursor-pointer"
                        id={`opt-${opt.key}`}
                      />
                      <label
                        htmlFor={`opt-${opt.key}`}
                        className="text-xs font-bold text-foreground shrink-0 cursor-pointer"
                      >
                        {opt.key}:
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder={opt.placeholder}
                        value={opt.val}
                        onChange={(e) => opt.setVal(e.target.value)}
                        className="text-xs border-0 bg-transparent p-0 focus:ring-0 shadow-none h-6"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3-Level Hint Ladder */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Progressive 3-Level Hints Ladder
                </label>
                <Input
                  type="text"
                  placeholder="Hint 1 (Conceptual): Add 15 to both sides to balance the equation."
                  value={hint1}
                  onChange={(e) => setHint1(e.target.value)}
                  className="text-xs"
                />
                <Input
                  type="text"
                  placeholder="Hint 2 (Strategic): $5x = 35 + 15 = 50$."
                  value={hint2}
                  onChange={(e) => setHint2(e.target.value)}
                  className="text-xs"
                />
                <Input
                  type="text"
                  placeholder="Hint 3 (Procedural): Divide 50 by 5 to obtain $x = 10$."
                  value={hint3}
                  onChange={(e) => setHint3(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Pedagogical Explanation */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Pedagogical Step-by-Step Explanation *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain why the correct option holds and highlight common miscalculations."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHubTab('syllabus')}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingQuestion}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {isCreatingQuestion ? 'Publishing...' : 'Save & Publish to Classroom'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* VIEW: UPLOAD CONTENT PACK */}
      {hubTab === 'upload' && (
        <Card className="border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Batch Content Pack Uploader (JSON Format)
            </CardTitle>
            <CardDescription className="text-xs">
              Upload multiple calibrated questions in one bulk submission attached to your classroom
              section.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Paste JSON question definitions matching the standard schema below.
              </span>
            </div>

            <textarea
              rows={12}
              placeholder="Paste JSON pack here: { 'questions': [ { 'skill_code': '...', 'prompt': '...', 'options': [...] } ] }"
              value={uploadJsonText}
              onChange={(e) => setUploadJsonText(e.target.value)}
              className="w-full text-xs font-mono rounded-lg border border-border bg-muted/20 p-3 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
            />

            {uploadStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold ${
                  uploadStatus.startsWith('✅')
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                }`}
              >
                {uploadStatus}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHubTab('syllabus')}
                className="text-xs cursor-pointer"
              >
                Back to Syllabus
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleUploadSubmit}
                disabled={isUploading || !uploadJsonText.trim()}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {isUploading ? 'Uploading to Database...' : 'Upload & Sync Questions'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
