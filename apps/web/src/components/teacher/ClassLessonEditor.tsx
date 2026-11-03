'use client';

import * as React from 'react';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import type { ClassroomContentResponse, ClassroomLesson } from '@bodhai/api-client';

export function ClassLessonEditor({
  classId,
  content,
}: {
  classId: string;
  content: ClassroomContentResponse | null;
}): React.JSX.Element {
  const api = getWebApiClient();
  const skills = React.useMemo(
    () => content?.topics.flatMap((topic) => topic.skills) ?? [],
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
    setSkillId(skills[0]?.id ?? '');
  }, [classId, skills]);
  React.useEffect(() => {
    const found = lessons.find(
      (item) =>
        item.skill_id === skillId && item.language === language && item.difficulty === difficulty,
    );
    setTitle(found?.title ?? '');
    setBody(found?.body ?? '');
  }, [lessons, skillId, language, difficulty]);

  return (
    <section className="rounded-xl border-2 border-ink p-4 space-y-3">
      <h3 className="font-bold">Classroom lesson editor</h3>
      <p className="text-sm">
        Create a lesson for each difficulty level. Students receive a level matched to their
        mastery.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          aria-label="Lesson skill"
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          className="border rounded p-2"
        >
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
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
        rows={7}
        className="w-full border rounded p-2"
      />
      <button
        type="button"
        disabled={!skillId || !title.trim() || !body.trim()}
        className="rounded-full bg-primary-orange text-white px-4 py-2 disabled:opacity-50"
        onClick={async () => {
          try {
            await api.saveClassLesson(
              classId,
              { skill_id: skillId, language, difficulty, title: title.trim(), body: body.trim() },
              getAuthToken() || undefined,
            );
            await load();
            setMessage('Lesson saved.');
          } catch {
            setMessage('Could not save the lesson.');
          }
        }}
      >
        Save lesson
      </button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
