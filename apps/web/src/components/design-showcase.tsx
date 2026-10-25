'use client';

import * as React from 'react';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  useToast,
} from '@bodhai/ui';
import { ThemeToggle } from './theme-toggle';

export function DesignShowcase(): React.JSX.Element {
  const { toast } = useToast();
  const [selectVal, setSelectVal] = React.useState('math');
  const [inputVal, setInputVal] = React.useState('Standard IX - B');

  const selectOptions = [
    { value: 'math', label: 'Mathematics (NCERT Class 9)' },
    { value: 'science', label: 'Science (NCERT Class 9)' },
    { value: 'english', label: 'English (NCERT Class 9)' },
    { value: 'social', label: 'Social Science (NCERT Class 9)' },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-16 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-8">
        <div>
          <Badge variant="default" size="sm" className="mb-2 font-mono">
            DEV ONLY SHOWCASE
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-foreground">
            BodhAI Design System
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Comprehensive accessible tokens and components built on shadcn/ui and Tailwind tokens.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-xl border border-border">
          <span className="text-xs font-medium text-muted-foreground">Toggle Theme:</span>
          <ThemeToggle />
        </div>
      </div>

      {/* 1. Buttons */}
      <section aria-labelledby="section-buttons" className="space-y-4">
        <h2 id="section-buttons" className="font-serif text-2xl font-bold text-foreground">
          1. Button Variants & Sizes
        </h2>
        <div className="flex flex-wrap items-center gap-3 p-6 rounded-2xl border border-border bg-card">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link Style</Button>
          <Button variant="primary" isLoading>
            Loading
          </Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-6 rounded-2xl border border-border bg-card">
          <Button size="sm">Small (sm)</Button>
          <Button size="md">Medium (md)</Button>
          <Button size="lg">Large (lg)</Button>
          <Button size="icon" aria-label="Icon sample">
            ⭐
          </Button>
        </div>
      </section>

      {/* 2. Badges */}
      <section aria-labelledby="section-badges" className="space-y-4">
        <h2 id="section-badges" className="font-serif text-2xl font-bold text-foreground">
          2. Badge
        </h2>
        <div className="flex flex-wrap items-center gap-3 p-6 rounded-2xl border border-border bg-card">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success" size="sm">
            Small Success
          </Badge>
        </div>
      </section>

      {/* 3. Inputs & Select */}
      <section aria-labelledby="section-form" className="space-y-4">
        <h2 id="section-form" className="font-serif text-2xl font-bold text-foreground">
          3. Input & Select Controls
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border border-border bg-card">
          <Input
            label="Student Classroom ID"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            helperText="Format: Standard [Roman Numeral] - [Section]"
          />
          <Input
            label="Roll Number (with error)"
            defaultValue="9999"
            error="Roll number must be between 1 and 60"
          />
          <Select
            label="Subject Track"
            options={selectOptions}
            value={selectVal}
            onChange={(e) => setSelectVal(e.target.value)}
            helperText="Aligned with NCERT Class 9 syllabus"
          />
          <Select
            label="Term Assessment (with error)"
            options={selectOptions}
            defaultValue=""
            placeholder="Select term..."
            error="Please select an assessment term"
          />
        </div>
      </section>

      {/* 4. Card */}
      <section aria-labelledby="section-card" className="space-y-4">
        <h2 id="section-card" className="font-serif text-2xl font-bold text-foreground">
          4. Card Compound Components
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="success">Class 8</Badge>
                <span className="text-xs text-muted-foreground font-mono">NCERT-MATH-8.1</span>
              </div>
              <CardTitle className="mt-3">Rational Numbers: Closure Property</CardTitle>
              <CardDescription>
                Diagnostic checkpoint covering addition and multiplication closure of rational
                numbers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80">
                Identifies foundational prerequisites before introducing irrational numbers and real
                number geometry.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-4">
              <span className="text-xs text-muted-foreground">Estimated: 10 mins</span>
              <Button size="sm" variant="primary">
                Begin Assessment
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="warning">Class 10</Badge>
                <span className="text-xs text-muted-foreground font-mono">NCERT-SCI-10.3</span>
              </div>
              <CardTitle className="mt-3">Metals & Non-Metals: Reactivity Series</CardTitle>
              <CardDescription>
                Adaptive practice module measuring mastery of displacement reactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80">
                Calibrates question difficulty based on student reaction time and accuracy curves.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-4">
              <span className="text-xs text-muted-foreground">Estimated: 15 mins</span>
              <Button size="sm" variant="outline">
                View Prerequisite Tree
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 5. Tabs */}
      <section aria-labelledby="section-tabs" className="space-y-4">
        <h2 id="section-tabs" className="font-serif text-2xl font-bold text-foreground">
          5. Tabs (Keyboard Navigable)
        </h2>
        <Card className="p-6">
          <Tabs defaultValue="classes-6-8">
            <TabsList aria-label="Curriculum Stages">
              <TabsTrigger value="classes-6-8">Middle Stage (Classes 6–8)</TabsTrigger>
              <TabsTrigger value="classes-9-10">Secondary Stage (Classes 9–10)</TabsTrigger>
              <TabsTrigger value="pedagogy">NEP 2020 Pedagogical Alignment</TabsTrigger>
            </TabsList>
            <TabsContent value="classes-6-8" className="p-4 border rounded-xl bg-muted/20">
              <h4 className="font-semibold text-foreground mb-1">Middle Stage (Classes 6, 7, 8)</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Emphasis on experiential learning, arithmetic mastery, scientific exploration, and
                bilingual terminology.
              </p>
            </TabsContent>
            <TabsContent value="classes-9-10" className="p-4 border rounded-xl bg-muted/20">
              <h4 className="font-semibold text-foreground mb-1">
                Secondary Stage (Classes 9, 10)
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deep conceptual understanding, board preparation scaffolding, critical thinking, and
                multidisciplinary problem-solving.
              </p>
            </TabsContent>
            <TabsContent value="pedagogy" className="p-4 border rounded-xl bg-muted/20">
              <h4 className="font-semibold text-foreground mb-1">NEP 2020 5+3+3+4 Structure</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Replaces rote exam memorization with low-stakes formative diagnostic assessment.
              </p>
            </TabsContent>
          </Tabs>
        </Card>
      </section>

      {/* 6. Dialog & Toast */}
      <section aria-labelledby="section-feedback" className="space-y-4">
        <h2 id="section-feedback" className="font-serif text-2xl font-bold text-foreground">
          6. Dialog & Toast Notifications
        </h2>
        <div className="flex flex-wrap items-center gap-4 p-6 rounded-2xl border border-border bg-card">
          {/* Dialog sample */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="primary">Launch Modal Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Diagnostic Micro-Assessment</DialogTitle>
                <DialogDescription>
                  This session consists of 5 adaptive questions. It adapts to your responses and
                  does not penalize incorrect attempts.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 text-sm text-foreground/80">
                <p>
                  Press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Escape</kbd> or
                  the close button to dismiss.
                </p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="primary">Start Session</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Toast triggers */}
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: 'Mastery Progress Saved',
                description: 'Class 8 Linear Equations checkpoint saved successfully.',
                variant: 'success',
              })
            }
          >
            Trigger Success Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: 'Intermittent Connection',
                description: 'Offline practice mode enabled. Responses will sync automatically.',
                variant: 'warning',
              })
            }
          >
            Trigger Warning Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: 'Assessment Timed Out',
                description: 'Session expired due to inactivity. Re-authenticated.',
                variant: 'destructive',
              })
            }
          >
            Trigger Error Toast
          </Button>
        </div>
      </section>

      {/* 7. Skeleton */}
      <section aria-labelledby="section-skeleton" className="space-y-4">
        <h2 id="section-skeleton" className="font-serif text-2xl font-bold text-foreground">
          7. Skeleton Loading Placeholders
        </h2>
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12" rounded="full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" rounded="lg" />
        </Card>
      </section>

      {/* 8. Table */}
      <section aria-labelledby="section-table" className="space-y-4">
        <h2 id="section-table" className="font-serif text-2xl font-bold text-foreground">
          8. Table (Accessible Semantic Data)
        </h2>
        <Table>
          <TableCaption>Official NCERT Framework Alignment for BodhAI (Classes 6–10)</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Target Age</TableHead>
              <TableHead>Key Competencies</TableHead>
              <TableHead>Official Curriculum Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-foreground">Class 6</TableCell>
              <TableCell>11–12 years</TableCell>
              <TableCell>
                Number systems, Basic geometrical ideas, Separation of substances
              </TableCell>
              <TableCell>NCERT Middle Stage</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Class 7</TableCell>
              <TableCell>12–13 years</TableCell>
              <TableCell>Fractions, Integers, Heat, Nutrition in plants & animals</TableCell>
              <TableCell>NCERT Middle Stage</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Class 8</TableCell>
              <TableCell>13–14 years</TableCell>
              <TableCell>
                Rational numbers, Linear equations, Cell structure, Force & pressure
              </TableCell>
              <TableCell>NCERT Middle Stage</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Class 9</TableCell>
              <TableCell>14–15 years</TableCell>
              <TableCell>
                Polynomials, Coordinate geometry, Matter, Motion & laws of motion
              </TableCell>
              <TableCell>NCERT Secondary</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Class 10</TableCell>
              <TableCell>15–16 years</TableCell>
              <TableCell>
                Real numbers, Quadratic equations, Light & optics, Life processes
              </TableCell>
              <TableCell>NCERT Secondary</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
