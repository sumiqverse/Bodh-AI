'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CurriculumTabs } from '@/components/curriculum-tabs';
import { Button, Badge, Input } from '@bodhai/ui';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Search,
  ArrowRight,
  ExternalLink,
  Info,
  Sparkles,
} from 'lucide-react';
import { getWebApiClient } from '@/lib/api-client';
import type { CurriculumGraphResponse, GraphNode } from '@bodhai/api-client';

interface NodePosition {
  x: number;
  y: number;
  rank: number;
}

export default function SkillGraphPage(): React.JSX.Element {
  const t = useTranslations('curriculum');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [graphData, setGraphData] = React.useState<CurriculumGraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedTopic, setSelectedTopic] = React.useState<string>('all');

  // Canvas Viewport Transform State
  const [scale, setScale] = React.useState<number>(0.65);
  const [pan, setPan] = React.useState<{ x: number; y: number }>({ x: 80, y: 80 });
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const client = React.useMemo(() => getWebApiClient(), []);

  // Fetch graph data from API
  React.useEffect(() => {
    async function fetchGraph() {
      setLoading(true);
      try {
        const data = await client.getCurriculumGraph('NCERT-MATH-08');
        setGraphData(data);
        if (data.nodes.length > 0 && data.nodes[0]) {
          setSelectedNode(data.nodes[0]);
        }
      } catch (err) {
        console.error('Failed to load skill graph:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [client]);

  // Distinct Topics list for filter dropdown
  const uniqueTopics = React.useMemo(() => {
    if (!graphData) return [];
    const set = new Set<string>();
    graphData.nodes.forEach((n) => {
      if (n.topic_code) set.add(n.topic_code);
    });
    return Array.from(set).sort();
  }, [graphData]);

  // Compute Topological Layering & Node Positions (Ranks)
  const { nodePositions, canvasWidth, canvasHeight } = React.useMemo(() => {
    if (!graphData || graphData.nodes.length === 0) {
      return {
        nodePositions: new Map<string, NodePosition>(),
        canvasWidth: 3000,
        canvasHeight: 2000,
      };
    }

    const nodes = graphData.nodes;
    const edges = graphData.edges;

    // Build in-degree map and adjacency
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    const nodeMap = new Map<string, GraphNode>();

    nodes.forEach((n) => {
      inDegree.set(n.code, 0);
      outgoing.set(n.code, []);
      nodeMap.set(n.code, n);
    });

    edges.forEach((e) => {
      if (inDegree.has(e.target)) {
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      }
      if (outgoing.has(e.source)) {
        outgoing.get(e.source)?.push(e.target);
      }
    });

    // Compute ranks using longest path / level propagation
    const rankMap = new Map<string, number>();
    nodes.forEach((n) => {
      if (inDegree.get(n.code) === 0) {
        rankMap.set(n.code, 0);
      }
    });

    // BFS rank assignment
    let queue = nodes.filter((n) => inDegree.get(n.code) === 0).map((n) => n.code);
    while (queue.length > 0) {
      const nextQueue: string[] = [];
      queue.forEach((curr) => {
        const currRank = rankMap.get(curr) || 0;
        (outgoing.get(curr) || []).forEach((next) => {
          const prevRank = rankMap.get(next) ?? 0;
          if (currRank + 1 > prevRank) {
            rankMap.set(next, currRank + 1);
            nextQueue.push(next);
          }
        });
      });
      queue = nextQueue;
    }

    // Default any remaining unranked node
    nodes.forEach((n) => {
      if (!rankMap.has(n.code)) {
        rankMap.set(n.code, 0);
      }
    });

    // Group nodes by rank
    const rankGroups = new Map<number, GraphNode[]>();
    nodes.forEach((n) => {
      const r = rankMap.get(n.code) || 0;
      if (!rankGroups.has(r)) rankGroups.set(r, []);
      rankGroups.get(r)?.push(n);
    });

    // Layout coordinates
    const NODE_WIDTH = 260;
    const NODE_HEIGHT = 80;
    const COL_GAP = 140;
    const ROW_GAP = 30;

    const positions = new Map<string, NodePosition>();
    let maxRank = 0;
    let maxRowInCol = 0;

    rankGroups.forEach((groupNodes, r) => {
      if (r > maxRank) maxRank = r;
      if (groupNodes.length > maxRowInCol) maxRowInCol = groupNodes.length;

      groupNodes.forEach((n, idx) => {
        const x = r * (NODE_WIDTH + COL_GAP) + 100;
        const y = idx * (NODE_HEIGHT + ROW_GAP) + 100;
        positions.set(n.code, { x, y, rank: r });
      });
    });

    const cWidth = Math.max(3000, (maxRank + 1) * (NODE_WIDTH + COL_GAP) + 400);
    const cHeight = Math.max(2200, maxRowInCol * (NODE_HEIGHT + ROW_GAP) + 400);

    return { nodePositions: positions, canvasWidth: cWidth, canvasHeight: cHeight };
  }, [graphData]);

  // Drag & Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left mouse button when not clicking a node card
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom Handlers
  const handleZoomIn = () => setScale((prev) => Math.min(2.0, prev + 0.15));
  const handleZoomOut = () => setScale((prev) => Math.max(0.2, prev - 0.15));
  const handleResetZoom = () => {
    setScale(0.65);
    setPan({ x: 80, y: 80 });
  };
  const handleFitView = () => {
    setScale(0.35);
    setPan({ x: 40, y: 40 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prev) => Math.min(2.0, Math.max(0.2, prev * zoomFactor)));
  };

  // Jump to and center on a node
  const focusOnNode = (nodeCode: string) => {
    const pos = nodePositions.get(nodeCode);
    const node = graphData?.nodes.find((n) => n.code === nodeCode);
    if (node) setSelectedNode(node);
    if (pos && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      setPan({
        x: containerWidth / 2 - pos.x * scale,
        y: containerHeight / 2 - pos.y * scale,
      });
    }
  };

  // Connected nodes & edges calculation for currently selected node
  const { incomingNodes, outgoingNodes, highlightedEdgeIds } = React.useMemo(() => {
    if (!selectedNode || !graphData) {
      return { incomingNodes: [], outgoingNodes: [], highlightedEdgeIds: new Set<string>() };
    }
    const incoming: GraphNode[] = [];
    const outgoing: GraphNode[] = [];
    const edgeIds = new Set<string>();

    graphData.edges.forEach((e) => {
      if (e.target === selectedNode.code) {
        edgeIds.add(`${e.source}->${e.target}`);
        const srcNode = graphData.nodes.find((n) => n.code === e.source);
        if (srcNode) incoming.push(srcNode);
      }
      if (e.source === selectedNode.code) {
        edgeIds.add(`${e.source}->${e.target}`);
        const tgtNode = graphData.nodes.find((n) => n.code === e.target);
        if (tgtNode) outgoing.push(tgtNode);
      }
    });

    return { incomingNodes: incoming, outgoingNodes: outgoing, highlightedEdgeIds: edgeIds };
  }, [selectedNode, graphData]);

  // Filtered/Highlighted nodes based on search or topic
  const isNodeDimmed = (node: GraphNode): boolean => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        node.name.toLowerCase().includes(q) ||
        node.code.toLowerCase().includes(q) ||
        node.topic_code.toLowerCase().includes(q);
      if (!match) return true;
    }
    if (selectedTopic !== 'all' && node.topic_code !== selectedTopic) {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Banner */}
      <section className="bg-card border-b border-border pt-6 pb-4">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">
                  DAG Dependency Matrix
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Readable at 150+ Nodes • Infinite Canvas
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('graphTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {t('graphSubtitle')}
              </p>
            </div>

            {/* Quick Status Legend (Mastery reserved) */}
            <div className="flex flex-wrap items-center gap-3 bg-muted/40 px-3 py-2 rounded-md border border-border text-xs">
              <span className="font-semibold text-muted-foreground">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-primary inline-block"></span>
                <span>Active / Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500 inline-block"></span>
                <span>Prerequisites</span>
              </div>
              <div
                className="flex items-center gap-1.5"
                title="Reserved for Bayesian Knowledge Tracing"
              >
                <span className="h-3 w-3 rounded-full bg-emerald-500/40 border border-emerald-500 inline-block"></span>
                <span className="text-muted-foreground">Mastery (Reserved)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="container mx-auto px-4 max-w-7xl">
        <CurriculumTabs />
      </div>

      {/* Main Interactive Visualizer Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-[750px] border-b border-border">
        {/* Controls Overlay (Zoom & Filter) */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-card/90 backdrop-blur-md p-2 rounded-lg border border-border shadow-md">
          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              title={t('zoomIn')}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              title={t('zoomOut')}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              title={t('resetZoom')}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFitView}
              title="Fit to Screen"
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono font-medium text-muted-foreground px-1">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Search Filter */}
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-7"
            />
          </div>

          {/* Topic Dropdown Filter */}
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="h-8 text-xs bg-background border border-input rounded-md px-2 focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Topics (60)</option>
            {uniqueTopics.map((tc) => (
              <option key={tc} value={tc}>
                {tc}
              </option>
            ))}
          </select>

          {/* Node Count Indicator */}
          <Badge variant="outline" className="text-[11px] font-mono">
            {graphData?.nodes.length || 0} Nodes • {graphData?.edges.length || 0} Edges
          </Badge>
        </div>

        {/* SVG Graph Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 overflow-hidden relative cursor-grab bg-muted/20 ${
            isDragging ? 'cursor-grabbing select-none' : ''
          }`}
          style={{ height: 'calc(100vh - 220px)', minHeight: '650px' }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-30">
              <div className="text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                <p className="text-sm font-medium text-muted-foreground">
                  Building DAG Topological Hierarchy...
                </p>
              </div>
            </div>
          ) : null}

          <svg
            width={canvasWidth}
            height={canvasHeight}
            className="transition-transform duration-75 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            }}
          >
            <defs>
              {/* Normal Arrowhead Marker */}
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="hsl(var(--muted-foreground))" opacity="0.5" />
              </marker>

              {/* Highlighted Arrowhead Marker */}
              <marker
                id="arrow-highlight"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="hsl(var(--primary))" />
              </marker>
            </defs>

            {/* Prerequisite Directed Edges */}
            <g className="edges-layer">
              {graphData?.edges.map((edge) => {
                const srcPos = nodePositions.get(edge.source);
                const tgtPos = nodePositions.get(edge.target);
                if (!srcPos || !tgtPos) return null;

                const edgeId = `${edge.source}->${edge.target}`;
                const isHighlighted = highlightedEdgeIds.has(edgeId);

                // Source connects from right edge of card, Target connects at left edge
                const x1 = srcPos.x + 260;
                const y1 = srcPos.y + 40;
                const x2 = tgtPos.x;
                const y2 = tgtPos.y + 40;

                // Bezier curve controls
                const dx = Math.max(40, (x2 - x1) / 2);
                const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                return (
                  <path
                    key={edgeId}
                    d={pathData}
                    fill="none"
                    stroke={
                      isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.35)'
                    }
                    strokeWidth={isHighlighted ? 3 : 1.5}
                    markerEnd={isHighlighted ? 'url(#arrow-highlight)' : 'url(#arrow)'}
                    className="transition-all duration-200"
                  />
                );
              })}
            </g>

            {/* Knowledge Component Nodes */}
            <g className="nodes-layer">
              {graphData?.nodes.map((node) => {
                const pos = nodePositions.get(node.code);
                if (!pos) return null;

                const isSelected = selectedNode?.code === node.code;
                const isIncomingPrereq = incomingNodes.some((n) => n.code === node.code);
                const isOutgoingDependent = outgoingNodes.some((n) => n.code === node.code);
                const dimmed = isNodeDimmed(node);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                    opacity={dimmed ? 0.25 : 1}
                  >
                    {/* Node Card Box */}
                    <rect
                      width="260"
                      height="80"
                      rx="8"
                      className={`transition-all duration-150 ${
                        isSelected
                          ? 'fill-card stroke-primary stroke-[3px] drop-shadow-md'
                          : isIncomingPrereq
                            ? 'fill-blue-500/10 stroke-blue-500 stroke-[2px]'
                            : isOutgoingDependent
                              ? 'fill-amber-500/10 stroke-amber-500 stroke-[2px]'
                              : 'fill-card stroke-border stroke-[1px] hover:stroke-primary/70 hover:drop-shadow-sm'
                      }`}
                    />

                    {/* Left Accent Bar */}
                    <rect
                      x="0"
                      y="0"
                      width="6"
                      height="80"
                      rx="3"
                      className={
                        isSelected
                          ? 'fill-primary'
                          : isIncomingPrereq
                            ? 'fill-blue-500'
                            : isOutgoingDependent
                              ? 'fill-amber-500'
                              : 'fill-border group-hover:fill-primary/60'
                      }
                    />

                    {/* Skill Code & Topic Badge */}
                    <text
                      x="16"
                      y="24"
                      className="text-[11px] font-mono font-bold fill-primary select-none"
                    >
                      {node.code}
                    </text>

                    <text
                      x="248"
                      y="24"
                      textAnchor="end"
                      className="text-[10px] font-medium fill-muted-foreground select-none"
                    >
                      {node.topic_code}
                    </text>

                    {/* Skill Name */}
                    <text
                      x="16"
                      y="46"
                      className="text-[12px] font-semibold fill-foreground select-none"
                      style={{ clipPath: 'polygon(0 0, 230px 0, 230px 20px, 0 20px)' }}
                    >
                      {node.name.length > 28 ? `${node.name.slice(0, 28)}…` : node.name}
                    </text>

                    {/* Bloom's Level & Difficulty */}
                    <text
                      x="16"
                      y="66"
                      className="text-[10px] capitalize fill-muted-foreground select-none"
                    >
                      Bloom: {node.blooms_level || 'apply'}
                    </text>

                    <text
                      x="248"
                      y="66"
                      textAnchor="end"
                      className="text-[10px] font-medium fill-amber-600 dark:fill-amber-400 select-none"
                    >
                      Diff: {node.difficulty || 1}/5
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Node Inspector Drawer / Sidebar */}
        <aside className="w-full lg:w-96 bg-card border-t lg:border-t-0 lg:border-l border-border p-6 overflow-y-auto space-y-6 shadow-lg z-20">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">{t('nodeDetails')}</h2>
            </div>
            {selectedNode && (
              <Badge variant="default" className="text-xs font-mono">
                {selectedNode.code}
              </Badge>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-6">
              {/* Skill Core Info */}
              <div>
                <h3 className="text-lg font-bold text-foreground leading-snug">
                  {selectedNode.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    Topic: {selectedNode.topic_code}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground capitalize border border-border px-2 py-0.5 rounded">
                    {selectedNode.blooms_level || 'Understanding'}
                  </span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    Difficulty {selectedNode.difficulty || 1} / 5
                  </span>
                </div>
              </div>

              {/* Prerequisite Skills (Incoming) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('prerequisites')} ({incomingNodes.length})
                  </span>
                </div>

                {incomingNodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded border border-border/50">
                    {t('noPrereqs')}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {incomingNodes.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => focusOnNode(p.code)}
                        className="flex items-center justify-between p-2 rounded bg-muted/40 hover:bg-primary/10 border border-border/60 hover:border-primary/50 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-[11px] font-mono font-semibold text-primary block">
                            {p.code}
                          </span>
                          <span className="text-xs font-medium text-foreground truncate block">
                            {p.name}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing Dependent Skills */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('dependents')} ({outgoingNodes.length})
                </span>

                {outgoingNodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded border border-border/50">
                    Terminal knowledge component in this curriculum branch.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {outgoingNodes.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => focusOnNode(d.code)}
                        className="flex items-center justify-between p-2 rounded bg-muted/40 hover:bg-amber-500/10 border border-border/60 hover:border-amber-500/50 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400 block">
                            {d.code}
                          </span>
                          <span className="text-xs font-medium text-foreground truncate block">
                            {d.name}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reserved Mastery Status Notice */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>Adaptive Mastery State (Reserved)</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Color fills on these nodes are strictly reserved for Bayesian Knowledge Tracing
                  (BKT) student mastery states during live diagnostic assessments.
                </p>
              </div>

              {/* Direct Actions */}
              <div className="pt-2 border-t border-border space-y-2">
                <Link
                  href={`/curriculum/questions?skill_id=${encodeURIComponent(selectedNode.id)}`}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View / Review Questions</span>
                  </Button>
                </Link>

                <Link
                  href={`/curriculum/questions/new?skill_id=${encodeURIComponent(selectedNode.id)}`}
                  className="w-full"
                >
                  <Button variant="primary" size="sm" className="w-full gap-2 text-xs shadow-xs">
                    <span>Draft New Question for this Skill</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">
              Click any node on the graph to inspect its atomic details and DAG prerequisite edges.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
