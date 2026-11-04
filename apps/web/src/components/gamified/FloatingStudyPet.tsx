'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { Lightbulb, X } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/routing';
import { SquirrelAvatar } from './MascotIcons';

type CompanionMood = 'idle' | 'thinking' | 'celebrating' | 'encouraging';

type Position = { x: number; y: number };
const SIZE = 112;
const POSITION_KEY = 'bodhai_pet_position';
const HIDDEN_KEY = 'bodhai_pet_hidden';

function clampPosition({ x, y }: Position): Position {
  return {
    x: Math.max(8, Math.min(x, window.innerWidth - SIZE - 8)),
    y: Math.max(72, Math.min(y, window.innerHeight - SIZE - 8)),
  };
}

export function FloatingStudyPet(): React.JSX.Element | null {
  const pathname = usePathname();
  const router = useRouter();
  const isHindi = useLocale() === 'hi';
  const isStudyPage = ['/student', '/learn', '/solve', '/test', '/diagnostic'].includes(pathname);
  const [position, setPosition] = React.useState<Position | null>(null);
  const [hidden, setHidden] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [mood, setMood] = React.useState<CompanionMood>('idle');
  const [hintLevel, setHintLevel] = React.useState(0);
  const drag = React.useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
    moved: boolean;
    latest: Position;
  } | null>(null);
  const ignoreClick = React.useRef(false);

  React.useEffect(() => {
    let saved: Position | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null') as Position | null;
      setHidden(localStorage.getItem(HIDDEN_KEY) === 'true');
    } catch {
      // Fall back to the default position if storage is invalid.
    }
    setPosition(
      clampPosition(
        saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
          ? saved
          : { x: window.innerWidth - SIZE - 24, y: window.innerHeight - SIZE - 90 },
      ),
    );
    const onResize = () => setPosition((current) => (current ? clampPosition(current) : current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    setMood('idle');
    setHintLevel(0);
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const onAttempt = (event: Event) => {
      setMood(
        (event as CustomEvent<{ isCorrect: boolean }>).detail?.isCorrect
          ? 'celebrating'
          : 'encouraging',
      );
      setOpen(true);
    };
    const onHint = (event: Event) => {
      setHintLevel((event as CustomEvent<{ level: number }>).detail?.level || 1);
      setMood('thinking');
      setOpen(true);
    };
    window.addEventListener('bodhai_attempt_submitted', onAttempt);
    window.addEventListener('bodhai_hint_requested', onHint);
    return () => {
      window.removeEventListener('bodhai_attempt_submitted', onAttempt);
      window.removeEventListener('bodhai_hint_requested', onHint);
    };
  }, []);

  React.useEffect(() => {
    if (mood === 'idle') return;
    const timer = window.setTimeout(() => setMood('idle'), 6500);
    return () => window.clearTimeout(timer);
  }, [mood, hintLevel]);

  if (!isStudyPage || !position) return null;

  const persist = (next: Position) => {
    const clamped = clampPosition(next);
    setPosition(clamped);
    localStorage.setItem(POSITION_KEY, JSON.stringify(clamped));
  };
  const hide = () => {
    setHidden(true);
    localStorage.setItem(HIDDEN_KEY, 'true');
  };
  const message = {
    idle: isHindi ? 'मैं यहाँ हूँ! पढ़ाई शुरू करें?' : 'I’m here! Ready to study?',
    thinking: isHindi ? `संकेत ${hintLevel} पर ध्यान दो।` : `Think through hint ${hintLevel}.`,
    celebrating: isHindi ? 'बहुत बढ़िया! आगे बढ़ते हैं।' : 'Great work! Keep going.',
    encouraging: isHindi ? 'कोई बात नहीं। फिर कोशिश करो।' : 'That’s okay. Try again.',
  }[mood];

  if (hidden) {
    return (
      <button
        type="button"
        className="fixed bottom-5 right-5 z-50 rounded-full border-2 border-ink bg-surface-cream p-2 shadow-card"
        onClick={() => {
          setHidden(false);
          localStorage.setItem(HIDDEN_KEY, 'false');
        }}
        aria-label={isHindi ? 'अध्ययन साथी दिखाएं' : 'Show study companion'}
      >
        <SquirrelAvatar className="h-10 w-10" />
      </button>
    );
  }

  return (
    <div className="fixed z-50" style={{ left: position.x, top: position.y }}>
      {open && (
        <div
          className={`absolute w-56 rounded-2xl border-2 border-ink bg-surface-cream p-3 text-ink shadow-card ${position.y < 230 ? 'top-[108px]' : 'bottom-[108px]'} ${position.x < 224 ? 'left-0' : 'right-0'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold" aria-live="polite">
              {message}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={isHindi ? 'संदेश बंद करें' : 'Close message'}
              className="rounded-full p-1 hover:bg-white/70"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            {pathname === '/solve' ? (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('bodhai_companion_request_hint'))}
                className="inline-flex items-center gap-1 rounded-full border border-ink bg-white px-2 py-1 text-xs font-bold hover:bg-surface-yellow"
              >
                <Lightbulb size={13} />
                {isHindi ? 'संकेत' : 'Hint'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push(pathname === '/student' ? '/progress' : '/student')}
                className="rounded-full border border-ink bg-white px-2 py-1 text-xs font-bold hover:bg-surface-yellow"
              >
                {pathname === '/student'
                  ? isHindi
                    ? 'प्रगति'
                    : 'My progress'
                  : isHindi
                    ? 'डैशबोर्ड'
                    : 'Dashboard'}
              </button>
            )}
            <button
              type="button"
              onClick={hide}
              className="rounded-full border border-ink bg-white px-2 py-1 text-xs font-bold hover:bg-surface-yellow"
            >
              {isHindi ? 'छिपाएं' : 'Hide'}
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="h-28 w-28 cursor-grab touch-none rounded-full focus-visible:ring-4 active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          drag.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            x: position.x,
            y: position.y,
            moved: false,
            latest: position,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const dx = event.clientX - drag.current.pointerX;
          const dy = event.clientY - drag.current.pointerY;
          if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
          if (drag.current.moved) {
            drag.current.latest = clampPosition({ x: drag.current.x + dx, y: drag.current.y + dy });
            setPosition(drag.current.latest);
          }
        }}
        onPointerUp={() => {
          if (!drag.current) return;
          ignoreClick.current = drag.current.moved;
          if (drag.current.moved) persist(drag.current.latest);
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 30 : 10;
          persist({
            x:
              position.x +
              (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
            y:
              position.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
          });
        }}
        onClick={() => {
          if (ignoreClick.current) {
            ignoreClick.current = false;
            return;
          }
          setOpen((value) => !value);
        }}
        aria-label={
          isHindi
            ? 'अध्ययन साथी; खोलने के लिए दबाएं, खींचकर स्थान बदलें'
            : 'Study companion; press to open, drag to move'
        }
        aria-expanded={open}
      >
        <SquirrelAvatar mood={mood} className="h-28 w-28 drop-shadow-lg" />
      </button>
    </div>
  );
}
