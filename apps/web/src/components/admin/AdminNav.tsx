'use client';

import * as React from 'react';
import { usePathname, Link } from '@/i18n/routing';
import { Badge } from '@bodhai/ui';
import {
  BarChart3,
  Network,
  HelpCircle,
  CheckCircle,
  UploadCloud,
  FileText,
  Activity,
} from 'lucide-react';

export function AdminNav(): React.JSX.Element {
  const pathname = usePathname();

  const links = [
    { label: 'School Stats', href: '/admin/stats', icon: BarChart3 },
    { label: 'Skill Graph', href: '/admin/skill-graph', icon: Network },
    { label: 'Question Editor', href: '/admin/questions', icon: HelpCircle },
    { label: 'Review Queue', href: '/admin/review-queue', icon: CheckCircle },
    { label: 'Content Import', href: '/admin/import', icon: UploadCloud },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
    { label: 'Model Eval', href: '/admin/evaluation', icon: Activity },
  ];

  return (
    <div className="space-y-4 border-b border-border pb-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold"
            >
              Admin & Content Portal
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              DPDP Compliance & Security Oversight
            </Badge>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Curriculum, Assessment & Governance
          </h1>
        </div>
      </div>

      <nav
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
        aria-label="Admin Navigation Tabs"
      >
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
