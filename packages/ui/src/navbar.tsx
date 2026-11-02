'use client';

import * as React from 'react';
import { cn } from './utils';

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly isActive?: boolean;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  brandName?: string;
  brandHref?: string;
  items: readonly NavItem[];
  languageSwitcher?: React.ReactNode;
  themeToggle?: React.ReactNode;
  actions?: React.ReactNode;
  linkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
  }>;
}

export function Navbar({
  className,
  brandName = 'BodhAI',
  brandHref = '/',
  items,
  languageSwitcher,
  themeToggle,
  actions,
  linkComponent: LinkComp,
  ...props
}: NavbarProps): React.JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const menuId = React.useId();

  const LinkElement =
    LinkComp ??
    (({ href, className: cls, children, onClick }) => (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    ));

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80',
        className,
      )}
      {...props}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <LinkElement
            href={brandHref}
            className="flex items-center gap-2.5 font-serif font-bold text-xl tracking-tight text-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-1 py-0.5"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-sans font-extrabold text-lg border-2 border-ink shadow-xs"
              aria-hidden="true"
            >
              बो
            </span>
            <span>{brandName}</span>
          </LinkElement>

          {/* Desktop Nav */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
            {items.map((item) => (
              <LinkElement
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap shrink-0',
                  item.isActive
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {item.label}
              </LinkElement>
            ))}
          </nav>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
          {languageSwitcher}
          {themeToggle}
          {actions}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          {themeToggle}
          {languageSwitcher}
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls={menuId}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          id={menuId}
          className="border-b border-border bg-card px-4 pt-3 pb-6 md:hidden animate-slide-in-up shadow-floating"
        >
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1.5">
            {items.map((item) => (
              <LinkElement
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                  item.isActive
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {item.label}
              </LinkElement>
            ))}
          </nav>
          {actions && (
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">{actions}</div>
          )}
        </div>
      )}
    </header>
  );
}
