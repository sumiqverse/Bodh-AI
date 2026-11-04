'use client';

import * as React from 'react';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import type {
  ClassroomContentResponse,
  ClassroomLesson,
  ClassroomSkillItem,
  ClassroomTopicItem,
} from '@bodhai/api-client';

interface LessonOption {
  skill: ClassroomSkillItem;
  topic: ClassroomTopicItem;
}

export function ClassLessonEditor({
  classId,
  content,
}: {
  classId: string;
  content: ClassroomContentResponse | null;
}): React.JSX.Element {
  const api = getWebApiClient();
  const options = React.useMemo<LessonOption[]>(
    () => content?.topics.flatMap((topic) => topic.skills.map((skill) => ({ skill, topic }))) ?? [],
    [content],
  );
  const [lessons, setLessons] = React.useState<ClassroomLesson[]>([]);
  const [skillId, setSkillId] = React.useState('');
  const [language, setLanguage] = React.useState('en');
  const [difficulty, setDifficulty] = React.useState(1);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setLessons(await api.listClassLessons(classId, getAuthToken() || undefined));
    } catch {
      setMessage('Could not load lessons.');
    }
  }, [api, classId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setSkillId((current) =>
      current && options.some((option) => option.skill.id === current)
        ? current
        : (options[0]?.skill.id ?? ''),
    );
  }, [options]);

  const selected = React.useMemo(
    () => options.find((option) => option.skill.id === skillId) ?? options[0] ?? null,
    [options, skillId],
  );
  const defaultLesson = selected?.skill.default_lesson ?? null;
  const savedLesson = lessons.find(
    (item) =>
      item.skill_id === skillId && item.language === language && item.difficulty === difficulty,
  );

  React.useEffect(() => {
    setTitle(savedLesson?.title ?? defaultLesson?.title ?? '');
    setBody(savedLesson?.body ?? defaultLesson?.body ?? '');
  }, [defaultLesson, savedLesson, skillId, language, difficulty]);

  const isTeacherVersion = Boolean(savedLesson);

  return (
    <section className="rounded-xl border-2 border-ink p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold">Classroom lesson editor</h3>
          <p className="text-sm">
            The NCERT-aligned study guide is preloaded for every skill. Review it, then edit or
            extend it with your own examples, activities, or local context; saving creates a version
            for this class only.
          </p>
        </div>
        <span className="shrink-0 rounded-full border-2 border-ink bg-surface-cream px-3 py-1 text-[10px] font-black uppercase tracking-wider text-ink">
          {isTeacherVersion
            ? 'Your class version'
            : defaultLesson
              ? 'NCERT-aligned default'
              : 'Default unavailable'}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <select
          aria-label="Lesson skill"
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          className="border rounded p-2"
        >
          {options.map((option) => (
            <option key={option.skill.id} value={option.skill.id}>
              {option.topic.name} — {option.skill.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Lesson language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border rounded p-2"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
        <select
          aria-label="Lesson difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="border rounded p-2"
        >
          {[1, 2, 3, 4, 5].map((level) => (
            <option key={level} value={level}>
              Level {level}
            </option>
          ))}
        </select>
      </div>

      {!isTeacherVersion && language === 'hi' && defaultLesson && (
        <p className="text-xs text-text-secondary">
          The default guide is in English. Edit and save this level to add a Hindi version.
        </p>
      )}

      <input
        aria-label="Lesson title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Lesson title"
        className="w-full border rounded p-2"
      />
      <textarea
        aria-label="Lesson content"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write the lesson content"
        rows={10}
        className="w-full border rounded p-2 font-mono text-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!skillId || !title.trim() || !body.trim()}
          className="rounded-full bg-primary-orange px-4 py-2 text-white disabled:opacity-50"
          onClick={async () => {
            try {
              await api.saveClassLesson(
                classId,
                { skill_id: skillId, language, difficulty, title: title.trim(), body: body.trim() },
                getAuthToken() || undefined,
              );
              await load();
              setMessage('Lesson saved for this class.');
            } catch {
              setMessage('Could not save the lesson.');
            }
          }}
        >
          Save lesson
        </button>

        {isTeacherVersion && defaultLesson && (
          <button
            type="button"
            className="rounded-full border-2 border-ink px-4 py-2 text-sm font-bold"
            onClick={() => {
              setTitle(defaultLesson.title);
              setBody(defaultLesson.body);
              setMessage(
                'NCERT default restored in the editor. Save to replace your class version.',
              );
            }}
          >
            Restore NCERT default
          </button>
        )}
      </div>

      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
