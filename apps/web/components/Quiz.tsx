'use client';

import { useState } from 'react';

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface Props {
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
}

export default function Quiz({ questions, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  if (done) {
    const score = answers.reduce((acc, a, i) => acc + (a === questions[i]!.correct ? 1 : 0), 0);
    return (
      <div className="border border-surface-200 rounded-2xl p-6 my-6 bg-white">
        <h3 className="text-xl font-bold text-surface-900 mb-2">Quiz Complete</h3>
        <p className="text-3xl font-bold text-saffron-600 mb-4">{score} / {questions.length}</p>
        <ul className="space-y-2 text-sm">
          {questions.map((q, i) => (
            <li key={i} className={answers[i] === q.correct ? 'text-emerald-700' : 'text-red-600'}>
              {answers[i] === q.correct ? 'OK' : 'X'} {q.q}
            </li>
          ))}
        </ul>
        <button
          onClick={() => { setIdx(0); setSelected(null); setAnswers([]); setDone(false); }}
          className="mt-4 px-4 py-2 bg-saffron-500 text-white rounded-lg hover:bg-saffron-600"
        >
          Retake
        </button>
      </div>
    );
  }

  const q = questions[idx]!;
  const isCorrect = selected !== null && selected === q.correct;

  return (
    <div className="border border-surface-200 rounded-2xl p-6 my-6 bg-white">
      <div className="text-xs text-surface-500 mb-2">Question {idx + 1} of {questions.length}</div>
      <h3 className="text-lg font-bold text-surface-900 mb-4">{q.q}</h3>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const showCorrect = selected !== null && i === q.correct;
          const showWrong = selected !== null && isSelected && i !== q.correct;
          return (
            <button
              key={i}
              onClick={() => selected === null && setSelected(i)}
              disabled={selected !== null}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                showCorrect ? 'border-emerald-500 bg-emerald-50' :
                showWrong ? 'border-red-500 bg-red-50' :
                isSelected ? 'border-saffron-500 bg-saffron-50' :
                'border-surface-200 hover:border-saffron-300'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="mt-4">
          <p className={`text-sm font-medium ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
            {isCorrect ? 'Correct.' : 'Not quite.'}
          </p>
          {q.explanation && <p className="text-sm text-surface-600 mt-1">{q.explanation}</p>}
          <button
            onClick={() => {
              const nextAnswers = [...answers, selected];
              setAnswers(nextAnswers);
              if (idx + 1 >= questions.length) {
                setDone(true);
                onComplete?.(nextAnswers.reduce((a, v, i) => a + (v === questions[i]!.correct ? 1 : 0), 0), questions.length);
              } else {
                setIdx(idx + 1);
                setSelected(null);
              }
            }}
            className="mt-3 px-4 py-2 bg-saffron-500 text-white rounded-lg hover:bg-saffron-600"
          >
            {idx + 1 >= questions.length ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
