import { CircleHelp, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface PageGuideProps {
  storageKey: string;
  title: string;
  items: string[];
  testId?: string;
}

function readGuideVisibility(storageKey: string): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.localStorage.getItem(storageKey) !== 'dismissed';
}

export default function PageGuide({ storageKey, title, items, testId }: PageGuideProps) {
  const [isVisible, setIsVisible] = useState(() => readGuideVisibility(storageKey));
  const visibleItems = useMemo(() => items.filter(Boolean), [items]);

  const dismissGuide = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, 'dismissed');
    }
  };

  const reopenGuide = () => {
    setIsVisible(true);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
  };

  if (!visibleItems.length) {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={reopenGuide}
        data-testid={testId ? `${testId}-trigger` : undefined}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
      >
        <CircleHelp className="h-4 w-4 text-primary" />
        查看操作提示
      </button>
    );
  }

  return (
    <section
      data-testid={testId}
      className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 shadow-sm ring-1 ring-blue-100/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-primary shadow-sm">
            <CircleHelp className="h-3.5 w-3.5" />
            使用指引
          </div>
          <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
        </div>
        <button
          type="button"
          onClick={dismissGuide}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
          aria-label={`关闭${title}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {visibleItems.map((item) => (
          <div key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400">关闭后仍可通过“查看操作提示”重新打开</span>
        <button
          type="button"
          onClick={dismissGuide}
          className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary/25 transition-colors hover:bg-blue-600"
        >
          我知道了
        </button>
      </div>
    </section>
  );
}
