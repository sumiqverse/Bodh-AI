import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';
import type { FaqItem } from '@/lib/seo';

export function MarketingFaq({
  locale,
  items,
  id = 'page-faq',
}: {
  locale: string;
  items: readonly FaqItem[];
  id?: string;
}): React.JSX.Element {
  if (items.length === 0) return <></>;

  const isHindi = locale === 'hi';
  const headingId = `${id}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-12 rounded-card border-2 border-ink bg-surface-white p-5 shadow-card dark:bg-card sm:p-7"
    >
      <div className="flex flex-col gap-4 border-b-2 border-dashed border-ink/20 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface-yellow px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-ink shadow-xs">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            {isHindi ? 'सीधे उत्तर' : 'Direct answers'}
          </span>
          <h2
            id={headingId}
            className="mt-3 font-sans text-2xl font-black leading-tight tracking-tight text-ink dark:text-white sm:text-3xl"
          >
            {isHindi ? 'अक्सर पूछे जाने वाले प्रश्न' : 'Frequently asked questions'}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-secondary dark:text-muted-foreground sm:text-base">
            {isHindi
              ? 'बोधAI के बारे में सबसे ज़्यादा पूछे जाने वाले सवालों के सीधे, संक्षिप्त उत्तर।'
              : 'Short, direct answers to the questions people ask most about BodhAI.'}
          </p>
        </div>

        <span
          className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-surface-blue text-ink shadow-xs sm:flex"
          aria-hidden="true"
        >
          <HelpCircle className="h-6 w-6" strokeWidth={2.2} />
        </span>
      </div>

      <div className="divide-y-2 divide-dashed divide-ink/15">
        {items.map((item) => (
          <details key={item.question} className="group py-4 first:pt-5 last:pb-0">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-1 py-1 text-left marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-orange focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-extrabold leading-snug text-ink dark:text-white sm:text-base">
                {item.question}
              </span>
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface-cream text-ink shadow-xs transition-transform duration-200 group-open:rotate-180">
                <ChevronDown className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
              </span>
            </summary>
            <p className="mt-3 max-w-3xl pl-1 pr-8 text-sm font-medium leading-relaxed text-text-secondary dark:text-muted-foreground sm:text-[15px]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
