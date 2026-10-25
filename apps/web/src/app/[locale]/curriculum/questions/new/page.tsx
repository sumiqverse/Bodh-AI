'use client';

import * as React from 'react';
import QuestionEditorPage from '../[id]/edit/page';

export default function NewQuestionPage(): React.JSX.Element {
  const paramsPromise = React.useMemo(() => Promise.resolve({ id: 'new' }), []);
  return <QuestionEditorPage params={paramsPromise} />;
}
