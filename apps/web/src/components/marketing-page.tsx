import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { buttonVariants } from '@bodhai/ui';

export interface MarketingPageShellProps {
  readonly badge: string;
  readonly title: string;
  readonly subtitle: string;
  readonly locale: string;
  readonly children: React.ReactNode;
  readonly maxWidth?: string;
  readonly dots?: readonly string[];
}

export function MarketingPageShell({
  badge,
  title,
  subtitle,
  locale,
  children,
  maxWidth = 'max-w-5xl',
  dots,
}: MarketingPageShellProps): React.JSX.Element {
  const headingFont = locale === 'hi' ? 'font-sans' : 'font-serif';

  return (
    <div className="relative overflow-hidden bg-canvas-gradient">
      <div
        className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full border-2 border-ink/10 bg-surface-butter/60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-28 top-[34rem] h-72 w-72 rounded-full border-2 border-ink/10 bg-surface-blue/60"
        aria-hidden="true"
      />

      <div className={`container relative mx-auto ${maxWidth} px-4 py-14 sm:px-6 sm:py-20`}>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface-cream px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary-orange" aria-hidden="true" />
            {badge}
          </span>

          <h1
            className={`mt-5 ${headingFont} text-4xl font-black leading-[1.08] tracking-tight text-ink dark:text-white sm:text-5xl md:text-6xl`}
          >
            {title}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-text-secondary dark:text-muted-foreground sm:text-lg">
            {subtitle}
          </p>

          {dots && dots.length > 0 && (
            <div className="mt-7 flex items-center justify-center gap-2" aria-hidden="true">
              {dots.map((surface, index) => (
                <span
                  key={`${surface}-${index}`}
                  className={`h-2.5 w-2.5 rounded-full border border-ink ${surface}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 sm:mt-16">{children}</div>
      </div>
    </div>
  );
}

export interface MarketingFeature {
  readonly title: string;
  readonly description?: string;
  readonly Icon: LucideIcon;
  readonly surface: string;
  readonly iconSurface: string;
  readonly marker?: 'number' | 'icon';
}

export interface MarketingFeatureGridProps {
  readonly features: readonly MarketingFeature[];
  readonly columns?: 2 | 3;
}

export function MarketingFeatureGrid({
  features,
  columns = 3,
}: MarketingFeatureGridProps): React.JSX.Element {
  const gridColumns = columns === 2 ? 'sm:grid-cols-2' : 'md:grid-cols-3';

  return (
    <div className={`grid grid-cols-1 gap-5 ${gridColumns}`}>
      {features.map((feature, index) => {
        const Icon = feature.Icon;
        const markerIsIcon = feature.marker === 'icon';

        return (
          <article
            key={feature.title}
            className={`flex h-full flex-col rounded-card border-2 border-ink ${feature.surface} p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated sm:p-6`}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink text-sm font-black text-ink shadow-sm ${
                  markerIsIcon ? feature.iconSurface : 'bg-surface-white'
                }`}
                aria-hidden="true"
              >
                {markerIsIcon ? (
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                ) : (
                  String(index + 1).padStart(2, '0')
                )}
              </span>

              {!markerIsIcon && (
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${feature.iconSurface} text-ink shadow-sm`}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
              )}
            </div>

            <h2 className="mt-5 text-xl font-extrabold leading-snug text-ink">{feature.title}</h2>
            {feature.description && (
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink/75">
                {feature.description}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

export interface MarketingAction {
  readonly href: string;
  readonly label: string;
}

export interface MarketingActionsProps {
  readonly actions: readonly MarketingAction[];
}

export function MarketingActions({ actions }: MarketingActionsProps): React.JSX.Element {
  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-3.5">
      {actions.map((action, index) => (
        <Link
          key={`${action.href}-${action.label}`}
          href={action.href}
          className={buttonVariants({
            variant: index === 0 ? 'orange' : 'outline',
            size: 'lg',
            className:
              index === 0
                ? 'rounded-full px-8 shadow-card transition-all hover:-translate-y-0.5 active:translate-y-0'
                : 'rounded-full border-2 border-ink bg-surface-white px-7 transition-all hover:-translate-y-0.5 hover:bg-surface-cream active:translate-y-0 dark:bg-card',
          })}
        >
          {action.label}
          {index === 0 && <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />}
        </Link>
      ))}
    </div>
  );
}
