import * as React from 'react';
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
      className={cn(
        'w-full border-t border-border bg-card text-card-foreground mt-auto',
        className,
      )}
      {...props}
    >
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Purpose */}
          <div className="lg:col-span-2 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-sans font-bold text-base shadow-sm"
                aria-hidden="true"
              >
                बो
              </span>
              <span className="font-serif font-bold text-xl tracking-tight text-foreground">
                {brandName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{tagline}</p>
            {citationNotice && (
              <p className="text-xs text-muted-foreground/80 border-l-2 border-primary/40 pl-3 leading-relaxed">
                {citationNotice}
              </p>
            )}
            {languageSwitcher && <div className="mt-2">{languageSwitcher}</div>}
          </div>

          {/* Nav Sections */}
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-3 text-left">
              <h4 className="text-sm font-semibold tracking-wider text-foreground">
                {section.title}
              </h4>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <LinkElement
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
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
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>{copyright ?? `© ${new Date().getFullYear()} BodhAI. All rights reserved.`}</p>
          {legalDraftNotice && (
            <p className="inline-flex items-center gap-1.5 text-warning font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
              <span>{legalDraftNotice}</span>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
