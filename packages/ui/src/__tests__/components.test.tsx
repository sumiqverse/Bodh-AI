import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';
import { Input } from '../input';
import { Select } from '../select';
import { Badge } from '../badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import { Skeleton } from '../skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../dialog';
import { Navbar } from '../navbar';
import { Footer } from '../footer';

describe('UI Design System Components', () => {
  it('renders Button with variants and sizes', () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toBeDefined();
    expect(button.className).toContain('bg-destructive');
  });

  it('renders Input with accessible error state', () => {
    render(<Input label="Email address" error="Invalid email format" />);
    const input = screen.getByLabelText(/email address/i);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Invalid email format');
  });

  it('renders Select with options and label', () => {
    const options = [
      { value: 'class-6', label: 'Class 6' },
      { value: 'class-7', label: 'Class 7' },
    ];
    render(<Select label="Grade" options={options} defaultValue="class-6" />);
    const select = screen.getByLabelText(/grade/i);
    expect(select).toBeDefined();
    expect(screen.getByText('Class 6')).toBeDefined();
  });

  it('renders Badge with custom variants', () => {
    render(<Badge variant="success">Completed</Badge>);
    const badge = screen.getByText('Completed');
    expect(badge.className).toContain('text-success');
  });

  it('renders Card compound components structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Mathematics Mastery</CardTitle>
          <CardDescription>Class 8 Algebra Diagnostic</CardDescription>
        </CardHeader>
        <CardContent>Content body</CardContent>
        <CardFooter>Footer info</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Mathematics Mastery')).toBeDefined();
    expect(screen.getByText('Class 8 Algebra Diagnostic')).toBeDefined();
    expect(screen.getByText('Content body')).toBeDefined();
  });

  it('renders Skeleton loading placeholder', () => {
    render(<Skeleton className="w-24 h-4" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton.getAttribute('aria-label')).toBe('Loading...');
  });

  it('renders Table markup accurately', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Subject</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Class 9</TableCell>
            <TableCell>Science</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('Class')).toBeDefined();
    expect(screen.getByText('Science')).toBeDefined();
  });

  it('renders Tabs and handles tab switching', () => {
    render(
      <Tabs defaultValue="tab-1">
        <TabsList>
          <TabsTrigger value="tab-1">Tab One</TabsTrigger>
          <TabsTrigger value="tab-2">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab-1">Content One</TabsContent>
        <TabsContent value="tab-2">Content Two</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Content One')).toBeDefined();
    expect(screen.queryByText('Content Two')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /tab two/i }));
    expect(screen.getByText('Content Two')).toBeDefined();
  });

  it('opens and closes Dialog via trigger and escape key', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assessment Overview</DialogTitle>
            <DialogDescription>Details about your test.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Assessment Overview')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders Navbar with items and mobile toggle', () => {
    const items = [
      { label: 'How it Works', href: '/how-it-works' },
      { label: 'About', href: '/about' },
    ];
    render(<Navbar items={items} />);
    expect(screen.getByText('BodhAI')).toBeDefined();
    expect(screen.getByRole('button', { name: /toggle navigation menu/i })).toBeDefined();
  });

  it('renders Footer with sections and legal draft notice', () => {
    const sections = [
      {
        title: 'Platform',
        links: [{ label: 'Students', href: '/for-students' }],
      },
    ];
    render(<Footer sections={sections} legalDraftNotice="DRAFT - PENDING LEGAL REVIEW" />);
    expect(screen.getByText('DRAFT - PENDING LEGAL REVIEW')).toBeDefined();
    expect(screen.getByText('Students')).toBeDefined();
  });
});
