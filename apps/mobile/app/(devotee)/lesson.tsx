import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { apiBase } from '../../lib/api';
import { readErrorMessage, failureMessage } from '../../lib/fetch-budget';
import { authedFetch } from '../../lib/authed-fetch';

interface QuizQ { q: string; options: string[]; correct: number; explanation?: string }
interface Lesson {
  id: string; title: string; subtitle?: string; minutes: number;
  intro: string; body: string; quiz: QuizQ[];
}

const CATALOG: Record<string, Lesson> = {
  'l01-devanagari-vowels': {
    id: 'l01-devanagari-vowels',
    title: 'Devanagari Vowels (स्वराः)',
    subtitle: '14 vowel sounds',
    minutes: 8,
    intro: 'Sanskrit has 14 traditional vowels: अ आ इ ई उ ऊ ऋ ॠ ऌ ॡ ए ऐ ओ औ.',
    body: 'Most vowels come in short/long pairs. अ (a) short, आ (ā) long. The long takes twice the duration. Compound vowels ए ऐ ओ औ are always long.',
    quiz: [
      { q: 'How many vowels?', options: ['12', '14', '16', '10'], correct: 1 },
      { q: 'Long counterpart of इ?', options: ['ए', 'ई', 'ऐ', 'ऋ'], correct: 1 },
      { q: 'Always long?', options: ['अ', 'इ', 'उ', 'ऐ'], correct: 3 },
    ],
  },
  'l02-devanagari-consonants': {
    id: 'l02-devanagari-consonants',
    title: 'Devanagari Consonants',
    subtitle: '33 consonants in 5 vargas',
    minutes: 10,
    intro: 'Sanskrit consonants are organized by place of articulation — scientifically arranged.',
    body: 'Velar: क ख ग घ ङ. Palatal: च छ ज झ ञ. Retroflex: ट ठ ड ढ ण. Dental: त थ द ध न. Labial: प फ ब भ म.',
    quiz: [
      { q: 'How many vargas?', options: ['4', '5', '6', '8'], correct: 1 },
      { q: 'क is in which varga?', options: ['Palatal', 'Velar', 'Dental', 'Labial'], correct: 1 },
      { q: 'Nasal of dental varga?', options: ['ङ', 'ण', 'न', 'म'], correct: 2 },
    ],
  },
  'l03-namaste': {
    id: 'l03-namaste',
    title: 'Your first word: नमस्ते',
    subtitle: 'Greeting and etymology',
    minutes: 5,
    intro: 'Namaste — perhaps the most famous Sanskrit word. Let us decode it.',
    body: 'नमस्ते = नमः + ते. नमः = bowing, salutation. ते = to you. Literally "salutation to you", meaning "I bow to the divine in you."',
    quiz: [
      { q: 'What does "ते" mean?', options: ['I', 'You (to)', 'We', 'They'], correct: 1 },
      { q: 'नमः means…', options: ['Hello', 'Bowing/salutation', 'Goodbye', 'Friend'], correct: 1 },
    ],
  },
};

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const lesson = id ? CATALOG[id] : undefined;
  const [phase, setPhase] = useState<'read' | 'quiz' | 'done'>('read');
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /**
   * Whether the completed lesson actually reached the server.
   *
   * `submitProgress` used to `return` silently when there was no token, and
   * swallow a failure into a dismissable Alert. Either way the "Lesson
   * complete" screen looked identical, so a signed-out devotee finished three
   * lessons, saw three trophies, and had nothing recorded — the streak and the
   * badges the next screen shows are minted server-side from these rows.
   */
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'signed-out' | 'failed'>(
    'idle',
  );

  if (!lesson) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={{ padding: spacing.md }}>Lesson not found.</Text>
      </SafeAreaView>
    );
  }

  const correctCount = answers.filter((a, i) => a === lesson.quiz[i]?.correct).length;
  const score = Math.round((correctCount / lesson.quiz.length) * 100);

  async function submitProgress(finalScore: number) {
    const token = session?.accessToken;
    if (!token) {
      setSaveState('signed-out');
      return;
    }
    setSubmitting(true);
    setSaveState('saving');
    try {
      // `completeSchema` is `{lessonId: string(1..64), score: int 0..100}`.
      // The score is passed in rather than read off state because `answers`
      // has not re-rendered yet when `nextQuestion` calls this — the old code
      // posted the score from BEFORE the last answer was recorded.
      const res = await authedFetch(`${apiBase()}/api/v1/lessons/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lessonId: lesson!.id, score: finalScore }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      setSaveState('saved');
    } catch (e) {
      setSaveState('failed');
      Alert.alert('Progress not saved', failureMessage(e, 'Try again later.'));
    } finally {
      setSubmitting(false);
    }
  }

  function answerCurrent(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
  }

  function nextQuestion() {
    const next = [...answers, selected ?? -1];
    setAnswers(next);
    setSelected(null);
    if (qIdx + 1 >= lesson!.quiz.length) {
      setPhase('done');
      // Computed off `next`, not off `answers`: `setAnswers` has not committed
      // yet at this point, so the old `submitProgress()` posted the score from
      // BEFORE the final question was answered. A three-question lesson
      // answered perfectly was recorded as 67%.
      const finalCorrect = next.filter((a, i) => a === lesson!.quiz[i]?.correct).length;
      void submitProgress(Math.round((finalCorrect / lesson!.quiz.length) * 100));
    } else {
      setQIdx(qIdx + 1);
    }
  }

  const currentQ = lesson.quiz[qIdx];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <Text style={styles.headerLabel} numberOfLines={1}>{lesson.subtitle ?? 'Lesson'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {phase === 'read' && (
          <>
            <Text style={styles.title}>{lesson.title}</Text>
            <Text style={styles.meta}>{lesson.minutes} min · {lesson.quiz.length} questions</Text>
            <Text style={styles.intro}>{lesson.intro}</Text>
            <Text style={styles.body}>{lesson.body}</Text>
            <TouchableOpacity style={styles.cta} onPress={() => setPhase('quiz')}>
              <Text style={styles.ctaText}>Start quiz</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'quiz' && currentQ && (
          <>
            <Text style={styles.qProgress}>Question {qIdx + 1} of {lesson.quiz.length}</Text>
            <Text style={styles.qText}>{currentQ.q}</Text>
            {currentQ.options.map((opt, i) => {
              const isCorrect = i === currentQ.correct;
              const isSelected = selected === i;
              let bg: string = colors.white;
              let bc: string = colors.stone[200];
              if (selected !== null) {
                if (isCorrect) { bg = colors.green[50]; bc = colors.green[600]; }
                else if (isSelected) { bg = '#fee2e2'; bc = '#dc2626'; }
              }
              return (
                <TouchableOpacity
                  key={i}
                  disabled={selected !== null}
                  onPress={() => answerCurrent(i)}
                  style={[styles.optBtn, { backgroundColor: bg, borderColor: bc }]}
                >
                  <Text style={styles.optText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
            {selected !== null && currentQ.explanation && (
              <Text style={styles.explain}>{currentQ.explanation}</Text>
            )}
            {selected !== null && (
              <TouchableOpacity style={styles.cta} onPress={nextQuestion}>
                <Text style={styles.ctaText}>{qIdx + 1 >= lesson.quiz.length ? 'Finish' : 'Next'}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {phase === 'done' && (
          <View style={styles.doneBox}>
            <Ionicons name="trophy" size={48} color={colors.saffron[600]} />
            <Text style={styles.doneTitle}>Lesson complete</Text>
            <Text style={styles.doneScore}>{correctCount} / {lesson.quiz.length} correct</Text>
            <Text style={styles.doneScorePct}>{score}%</Text>
            {submitting && <Text style={styles.savingText}>Saving progress...</Text>}
            {saveState === 'saved' && <Text style={styles.savingText}>Progress saved.</Text>}
            {saveState === 'signed-out' && (
              <Text style={styles.notSavedText}>
                Not saved — sign in to record this lesson towards your streak and badges.
              </Text>
            )}
            {saveState === 'failed' && (
              <Text style={styles.notSavedText}>
                Not saved — we could not reach Darshya. Retake the lesson when you are back online.
              </Text>
            )}
            <TouchableOpacity style={[styles.cta, { marginTop: spacing.md }]} onPress={() => router.back()}>
              <Text style={styles.ctaText}>Back to lessons</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.stone[100] },
  backBtn: { padding: spacing.xs },
  headerLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.saffron[700] },
  scroll: { padding: spacing.md },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  meta: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 4 },
  intro: { fontSize: fontSize.base, color: colors.stone[700], marginTop: spacing.md, lineHeight: 24, fontStyle: 'italic' },
  body: { fontSize: fontSize.base, color: colors.stone[700], marginTop: spacing.md, lineHeight: 24 },
  cta: { backgroundColor: colors.saffron[600], padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.lg },
  ctaText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  qProgress: { fontSize: fontSize.xs, color: colors.stone[500], fontWeight: '600', textTransform: 'uppercase' },
  qText: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[900], marginTop: spacing.xs, marginBottom: spacing.md },
  optBtn: { padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 2, marginBottom: spacing.sm },
  optText: { fontSize: fontSize.base, color: colors.stone[800] },
  explain: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: spacing.sm, fontStyle: 'italic' },
  doneBox: { alignItems: 'center', padding: spacing.xl },
  doneTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900], marginTop: spacing.sm },
  doneScore: { fontSize: fontSize.base, color: colors.stone[600], marginTop: spacing.xs },
  doneScorePct: { fontSize: 48, fontWeight: '800', color: colors.saffron[600], marginTop: spacing.xs },
  savingText: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: spacing.sm },
  notSavedText: {
    fontSize: fontSize.sm, color: colors.amber[700], marginTop: spacing.sm,
    textAlign: 'center', lineHeight: 20,
  },
});
