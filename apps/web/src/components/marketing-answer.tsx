export function MarketingAnswer({
  question,
  answer,
}: {
  question: string;
  answer: string;
}): React.JSX.Element {
  return (
    <section className="rounded-card border-2 border-ink bg-surface-white p-5 text-left shadow-card dark:bg-card sm:p-7">
      <h2 className="text-xl font-extrabold leading-snug text-ink dark:text-white sm:text-2xl">
        {question}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary dark:text-muted-foreground sm:text-base">
        {answer}
      </p>
    </section>
  );
}
