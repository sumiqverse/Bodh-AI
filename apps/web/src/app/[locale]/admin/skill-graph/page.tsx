'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
} from '@bodhai/ui';
import { AdminNav } from '@/components/admin/AdminNav';
import { getWebApiClient } from '@/lib/api-client';
import type { CurriculumGraphResponse, GraphNode } from '@bodhai/api-client';
import { Network, Search } from 'lucide-react';

export default function SkillGraphPage(): React.JSX.Element {
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [curriculumCode, setCurriculumCode] = React.useState<string>('NCERT-MATH-C8');
  const [graphData, setGraphData] = React.useState<CurriculumGraphResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedTopic, setSelectedTopic] = React.useState<string>('all');
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null);

  const fetchGraph = React.useCallback(
    async (code: string) => {
      setIsLoading(true);
      try {
        const data = await apiClient.getCurriculumGraph(code);
        setGraphData(data);
        setError('');
      } catch {
        setGraphData(null);
        setError('Could not load the curriculum graph.');
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient],
  );

  React.useEffect(() => {
    void fetchGraph(curriculumCode);
  }, [curriculumCode, fetchGraph]);

  const topics = React.useMemo(() => {
    if (!graphData) return [];
    const map = new Map<string, string>();
    graphData.nodes.forEach((n) => {
      if (n.topic_code) {
        map.set(n.topic_code, n.topic_name || n.topic_code);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [graphData]);

  const skills = React.useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes;
  }, [graphData]);

  const filteredSkills = React.useMemo(() => {
    let list = skills;
    if (selectedTopic !== 'all') {
      list = list.filter((s) => s.topic_code === selectedTopic || s.topic_name === selectedTopic);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
      );
    }
    return list;
  }, [skills, selectedTopic, searchQuery]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      <AdminNav />
      {error && <p role="alert">{error}</p>}

      {/* Curriculum & Metric Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="font-serif text-xl font-bold text-foreground">
            {graphData?.curriculum_code
              ? `${graphData.curriculum_code} Competency Graph`
              : 'NCERT Competency Graph'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Directed Acyclic Graph (DAG) enforcing pedagogical prerequisite order and Bloom's
            difficulty calibration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-56">
            <Select
              id="curriculum-select"
              value={curriculumCode}
              onChange={(e) => setCurriculumCode(e.target.value)}
              options={[
                { value: 'NCERT-MATH-C8', label: 'NCERT Class 8 Mathematics' },
                { value: 'NCERT-MATH-CLASS-6', label: 'NCERT Class 6 Mathematics' },
                { value: 'NCERT-MATH-C7', label: 'NCERT Class 7 Mathematics' },
                { value: 'NCERT-MATH-C9', label: 'NCERT Class 9 Mathematics' },
                { value: 'NCERT-MATH-C10', label: 'NCERT Class 10 Mathematics' },
              ]}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchGraph(curriculumCode)}
            className="text-xs cursor-pointer"
          >
            Refresh Graph
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Curriculum Topics
          </span>
          <span className="font-serif text-2xl font-bold text-foreground mt-1 block">
            {topics.length}
          </span>
        </Card>
        <Card className="p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary block">
            Atomic Skills
          </span>
          <span className="font-serif text-2xl font-bold text-primary mt-1 block">
            {skills.length}
          </span>
        </Card>
        <Card className="p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Prerequisite Edges
          </span>
          <span className="font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {graphData?.edges.length || 0}
          </span>
        </Card>
        <Card className="p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Average Difficulty
          </span>
          <span className="font-serif text-2xl font-bold text-foreground mt-1 block">
            {skills.length > 0
              ? `${Math.round((skills.reduce((acc, s) => acc + (s.difficulty || 0.5), 0) / skills.length) * 100)}%`
              : '55%'}
          </span>
        </Card>
      </div>

      {/* Search & Topic Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search skill code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
          <div className="w-48">
            <Select
              id="topic-filter"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              options={[
                { value: 'all', label: 'All Topics' },
                ...topics.map((t) => ({ value: t.code, label: t.name })),
              ]}
            />
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filteredSkills.length} of {skills.length} atomic competencies
        </span>
      </div>

      {/* Interactive DAG Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skills Nodes Grid */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="py-24 text-center text-sm text-muted-foreground">
              Loading competency graph hierarchy...
            </div>
          ) : filteredSkills.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              No skills found matching your filter.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredSkills.map((sk) => {
                const incomingEdges = graphData?.edges.filter((e) => e.target === sk.id) || [];
                const outgoingEdges = graphData?.edges.filter((e) => e.source === sk.id) || [];
                const isSelected = selectedNode?.id === sk.id;

                return (
                  <Card
                    key={sk.id}
                    onClick={() => setSelectedNode(sk)}
                    className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                      isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-primary">
                          {sk.code}
                        </span>
                        {sk.blooms_level && (
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {sk.blooms_level}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-serif text-sm font-bold text-foreground leading-snug">
                        {sk.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">{sk.topic_name}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                        <span>Difficulty: {Math.round((sk.difficulty || 0.5) * 100)}%</span>
                        <span>
                          {incomingEdges.length} prereq • {outgoingEdges.length} unlocks
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Skill Detail Inspector Drawer */}
        <div className="space-y-4">
          <Card className="sticky top-20 shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                Competency Node Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedNode
                  ? 'Prerequisite graph details & Bloom taxonomy level'
                  : 'Select a skill to inspect dependency pathways'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {selectedNode ? (
                <>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        {selectedNode.code}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Class 8
                      </Badge>
                    </div>
                    <p className="font-serif text-sm font-bold text-foreground">
                      {selectedNode.name}
                    </p>
                    <p className="text-muted-foreground">Topic: {selectedNode.topic_name}</p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Pedagogical Parameters
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <span className="text-muted-foreground block text-[10px]">Bloom Level</span>
                        <strong className="text-foreground capitalize">
                          {selectedNode.blooms_level || 'Apply'}
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <span className="text-muted-foreground block text-[10px]">Difficulty</span>
                        <strong className="text-primary">
                          {Math.round((selectedNode.difficulty || 0.5) * 100)}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Prerequisites Required (In-Degree)
                    </span>
                    {graphData?.edges.filter((e) => e.target === selectedNode.id).length === 0 ? (
                      <p className="text-muted-foreground italic">None (Root foundational skill)</p>
                    ) : (
                      graphData?.edges
                        .filter((e) => e.target === selectedNode.id)
                        .map((edge, idx) => {
                          const src = skills.find((s) => s.id === edge.source);
                          return (
                            <div
                              key={`${edge.source}-${edge.target}-${idx}`}
                              className="p-2 rounded-lg bg-muted/60 flex items-center justify-between"
                            >
                              <span className="font-mono text-[11px] font-semibold">
                                {src?.code || edge.source}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {src?.name || 'Prerequisite'}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Unlocks Forward (Out-Degree)
                    </span>
                    {graphData?.edges.filter((e) => e.source === selectedNode.id).length === 0 ? (
                      <p className="text-muted-foreground italic">
                        Terminal competency in this grade level
                      </p>
                    ) : (
                      graphData?.edges
                        .filter((e) => e.source === selectedNode.id)
                        .map((edge, idx) => {
                          const tgt = skills.find((s) => s.id === edge.target);
                          return (
                            <div
                              key={`${edge.source}-${edge.target}-${idx}`}
                              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 flex items-center justify-between"
                            >
                              <span className="font-mono text-[11px] font-semibold">
                                {tgt?.code || edge.target}
                              </span>
                              <span className="text-[10px]">{tgt?.name || 'Advanced Skill'}</span>
                            </div>
                          );
                        })
                    )}
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/admin/questions?skillId=${selectedNode.id}`)}
                      className="w-full text-xs font-semibold cursor-pointer"
                    >
                      View Calibrated Questions →
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Click any skill card on the left to inspect its mathematical prerequisites and
                  unlocks.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
