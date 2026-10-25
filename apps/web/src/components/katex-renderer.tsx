'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface KatexRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses a string containing math delimiters ($...$ or $$...$$) and renders KaTeX spans.
 */
export function KatexRenderer({ content, className = '' }: KatexRendererProps) {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    // Pattern matches $$...$$ (display mode) or $...$ (inline mode)
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
    const parts = content.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="my-2 block overflow-x-auto py-1"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span key={index} className="font-mono text-destructive">
              {part}
            </span>
          );
        }
      } else if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="inline-block px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span key={index} className="font-mono text-destructive">
              {part}
            </span>
          );
        }
      }

      // Plain text (handles line breaks nicely)
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  }, [content]);

  return <div className={`font-serif leading-relaxed ${className}`}>{renderedElements}</div>;
}
