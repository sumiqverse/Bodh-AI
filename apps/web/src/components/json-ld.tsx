export type JsonLdData = Record<string, unknown> | readonly Record<string, unknown>[];

export function JsonLd({ data }: { data: JsonLdData }): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
