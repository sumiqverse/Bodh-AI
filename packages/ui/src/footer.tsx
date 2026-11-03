import * as React from 'react';
import { BrandMark } from './brand-mark';
import { cn } from './utils';

export interface FooterLinkSection {
  readonly title: string;
  readonly links: readonly {
    readonly label: string;
    readonly href: string;
  }[];
}

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  brandName?: string;
  tagline?: string;
  sections: readonly FooterLinkSection[];
  copyright?: string;
  citationNotice?: string;
  legalDraftNotice?: string;
  languageSwitcher?: React.ReactNode;
  linkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
}

export function Footer({
  className,
  brandName = 'BodhAI (बोधAI)',
  tagline = 'Adaptive learning platform for Classes 6–10 in India.',
  sections,
  copyright,
  citationNotice,
  legalDraftNotice,
  languageSwitcher,
  linkComponent: LinkComp,
  ...props
}: FooterProps): React.JSX.Element {
  const LinkElement =
    LinkComp ??
    (({ href, className: cls, children }) => (
      <a href={href} className={cls}>
        {children}
      </a>
    ));

  return (
    <footer
      suppressHydrationWarning
      className={cn(
        'w-full border-t-2 border-ink bg-surface-white dark:bg-card text-card-foreground mt-auto',
        className,
      )}
      {...props}
    >
      <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-10">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 lg:col-span-2 flex flex-col gap-4 text-left">
            <BrandMark name={brandName} />
            <p className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground leading-relaxed max-w-sm font-medium">
              {tagline}
            </p>
            {citationNotice && (
              <p className="text-[11px] font-mono text-text-secondary dark:text-muted-foreground border-l-2 border-primary-orange pl-3 leading-relaxed bg-surface-cream/30 dark:bg-muted/20 py-2 pr-2 rounded-r-xl border-y border-r border-ink/10">
                {citationNotice}
              </p>
            )}
            {languageSwitcher && <div className="mt-1">{languageSwitcher}</div>}
          </div>

          {/* Nav Sections */}
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-3 text-left">
              <h4 className="text-xs font-mono font-black uppercase tracking-wider text-ink dark:text-white">
                {section.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <LinkElement
                      href={link.href}
                      className="text-xs sm:text-sm text-text-secondary dark:text-muted-foreground hover:text-ink dark:hover:text-white transition-colors font-medium hover:underline inline-flex items-center gap-1"
                    >
                      {link.label}
                    </LinkElement>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal Draft Notice & Copyright */}
        <div className="mt-12 pt-6 border-t-2 border-ink/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-secondary dark:text-muted-foreground font-medium">
          <p>{copyright ?? `© ${new Date().getFullYear()} BodhAI. All rights reserved.`}</p>
          {legalDraftNotice && (
            <div className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-surface-yellow/40 px-3 py-1 text-xs font-bold text-ink dark:text-white shadow-xs">
              <span
                className="h-2 w-2 rounded-full bg-primary-orange shrink-0 animate-pulse"
                aria-hidden="true"
              />
              <span>{legalDraftNotice}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
