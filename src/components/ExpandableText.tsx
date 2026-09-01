import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableTextProps {
  text: string;
  maxLines?: number;
  className?: string;
}

export function ExpandableText({ text, maxLines = 4, className = '' }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  const clampStyle: React.CSSProperties = expanded
    ? {}
    : {
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      };

  return (
    <div className={className}>
      <p
        className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap"
        style={clampStyle}
      >
        {text}
      </p>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mt-1 transition-colors"
      >
        {expanded ? (
          <>See Less <ChevronUp className="h-3 w-3" /></>
        ) : (
          <>See More <ChevronDown className="h-3 w-3" /></>
        )}
      </button>
    </div>
  );
}
