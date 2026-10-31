'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CurriculumTabs } from '@/components/curriculum-tabs';
import { Card, Badge, Button, buttonVariants, Input, Skeleton } from '@bodhai/ui';
import {
  BookOpen,
  Search,
  Layers,
  ChevronDown,
  ChevronRight,
  Network,
  HelpCircle,
  PlusCircle,
} from 'lucide-react';
import { getWebApiClient } from '@/lib/api-client';
import type { CurriculumResponse, TopicResponse } from '@bodhai/api-client';

export default function CurriculumBrowserPage(): React.JSX.Element {
  const t = useTranslations('curriculum');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [curricula, setCurricula] = React.useState<CurriculumResponse[]>([]);
  const [selectedCurriculumCode, setSelectedCurriculumCode] =
    React.useState<string>('NCERT-MATH-08');
  const [topics, setTopics] = React.useState<TopicResponse[]>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [expandedTopics, setExpandedTopics] = React.useState<Record<string, boolean>>({});

  const client = React.useMemo(() => getWebApiClient(), []);

  // Fetch curricula list
  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const list = await client.listCurricula();
        setCurricula(list);
        if (list.length > 0) {
          const defaultCurr = list.find((c) => c.grade === 8) || list[0];
          if (defaultCurr) {
            setSelectedCurriculumCode(defaultCurr.code);
            const topicList = await client.getCurriculumTopics(defaultCurr.code);
            setTopics(topicList);
            // Expand first 3 topics by default
            const initialExpanded: Record<string, boolean> = {};
            topicList.slice(0, 3).forEach((t) => {
              initialExpanded[t.id] = true;
            });
            setExpandedTopics(initialExpanded);
          }
        }
      } catch (err) {
        console.error('Failed to load curricula:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [client]);

  // Handle changing curriculum selection
  const handleCurriculumChange = async (code: string) => {
    setSelectedCurriculumCode(code);
    setLoading(true);
    try {
      const topicList = await client.getCurriculumTopics(code);
      setTopics(topicList);
      const initialExpanded: Record<string, boolean> = {};
      topicList.slice(0, 3).forEach((t) => {
        initialExpanded[t.id] = true;
      });
      setExpandedTopics(initialExpanded);
    } catch (err) {
      console.error('Failed to switch curriculum:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    topics.forEach((t) => {
      allExp[t.id] = true;
    });
    setExpandedTopics(allExp);
  };

  const collapseAll = () => {
    setExpandedTopics({});
  };

  // Filter topics and skills based on search query
  const filteredTopics = React.useMemo(() => {
    if (!searchQuery.trim()) return topics;
    const query = searchQuery.toLowerCase();
    const result: TopicResponse[] = [];

    for (const topic of topics) {
      const matchesTopic =
        topic.name.toLowerCase().includes(query) || topic.code.toLowerCase().includes(query);
      const matchingSkills = (topic.skills || []).filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.code.toLowerCase().includes(query) ||
          Boolean(skill.description && skill.description.toLowerCase().includes(query)),
      );
      if (matchesTopic || matchingSkills.length > 0) {
        result.push({
          ...topic,
          skills: matchesTopic ? topic.skills : matchingSkills,
        });
      }
    }
    return result;
  }, [topics, searchQuery]);

  const totalSkillsCount = React.useMemo(() => {
    return topics.reduce((acc, t) => acc + (t.skills?.length || 0), 0);
  }, [topics]);

  const selectedCurriculum = curricula.find((c) => c.code === selectedCurriculumCode);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-primary/10 via-background to-background pt-10 pb-6 border-b border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="text-xs">
                  NEP 2020 & NCERT Aligned
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  Atomic DAG Engine
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t('title')}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
                {t('subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/curriculum/graph"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'gap-2 inline-flex items-center',
                })}
              >
                <Network className="h-4 w-4 text-primary" />
                <span>{t('viewGraph')}</span>
              </Link>
              <Link
                href="/curriculum/questions"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'gap-2 inline-flex items-center',
                })}
              >
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>{t('manageQuestions')}</span>
              </Link>
              <Link
                href="/curriculum/import"
                className={buttonVariants({
                  variant: 'primary',
                  size: 'sm',
                  className: 'gap-2 shadow-xs inline-flex items-center',
                })}
              >
                <PlusCircle className="h-4 w-4" />
                <span>{t('importPack')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Tabs Bar */}
      <div className="container mx-auto px-4 max-w-7xl">
        <CurriculumTabs />
      </div>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        {/* Filter & Metric Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border flex flex-col justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('board')}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-foreground">
                {selectedCurriculum?.board || 'NCERT'}
              </span>
              <Badge variant="outline">Class {selectedCurriculum?.grade || 8}</Badge>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border flex flex-col justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('totalTopics')}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-foreground">{topics.length}</span>
              <BookOpen className="h-5 w-5 text-primary opacity-80" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border flex flex-col justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('totalSkills')}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-foreground">{totalSkillsCount}</span>
              <Layers className="h-5 w-5 text-primary opacity-80" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border flex flex-col justify-between">
            <span className="text-xs font-medium text-muted-foreground">Curriculum Selector</span>
            <select
              value={selectedCurriculumCode}
              onChange={(e) => handleCurriculumChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {curricula.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.name || curr.code} ({curr.code})
                </option>
              ))}
            </select>
          </Card>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
              Collapse All
            </Button>
          </div>
        </div>

        {/* Topic & Skill Explorer */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredTopics.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Topics Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              No topics or skills matched your filter &quot;{searchQuery}&quot;. Clear search or
              import a curriculum pack.
            </p>
            <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="mt-4">
              Clear Search
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTopics.map((topic, index) => {
              const isExpanded = Boolean(expandedTopics[topic.id]);
              const skillCount = topic.skills?.length || 0;

              return (
                <div
                  key={topic.id}
                  className="rounded-lg border border-border bg-card shadow-xs overflow-hidden transition-all duration-150"
                >
                  {/* Topic Header Row */}
                  <div
                    onClick={() => toggleTopic(topic.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Toggle Topic"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-primary">
                            {topic.code}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • Order #{topic.order_index ?? index + 1}
                          </span>
                        </div>
                        <h2 className="text-base font-semibold text-foreground">{topic.name}</h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {skillCount} {skillCount === 1 ? 'Skill' : 'Skills'}
                      </Badge>
                    </div>
                  </div>

                  {/* Skills List in Topic */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10 p-4 space-y-3">
                      {skillCount === 0 ? (
                        <p className="text-sm text-muted-foreground italic pl-8">
                          No atomic skills configured for this topic yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pl-2 sm:pl-6">
                          {topic.skills.map((skill) => (
                            <div
                              key={skill.id}
                              className="rounded-md border border-border/80 bg-card p-4 hover:border-primary/50 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-mono font-semibold text-primary/90 bg-primary/10 px-2 py-0.5 rounded">
                                    {skill.code}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {skill.blooms_level && (
                                      <span className="text-[11px] font-medium text-muted-foreground capitalize border border-border px-1.5 py-0.5 rounded">
                                        {skill.blooms_level}
                                      </span>
                                    )}
                                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                      Diff {skill.difficulty || 1}/5
                                    </span>
                                  </div>
                                </div>
                                <h3 className="text-sm font-semibold text-foreground">
                                  {skill.name}
                                </h3>
                                {skill.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {skill.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                                <Link
                                  href={`/curriculum/graph`}
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                >
                                  <Network className="h-3.5 w-3.5" />
                                  <span>DAG Prereqs</span>
                                </Link>

                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/curriculum/questions?skill_id=${encodeURIComponent(skill.id)}`}
                                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium"
                                  >
                                    <HelpCircle className="h-3.5 w-3.5" />
                                    <span>Questions</span>
                                  </Link>
                                  <Link
                                    href={`/curriculum/questions/new`}
                                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                  >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    <span>Add</span>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
