import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { apiBase } from '../../lib/api';
import { fetchWithBudget, readErrorMessage, failureMessage } from '../../lib/fetch-budget';
import {
  buildGurukulApplication,
  effectiveApplicantType,
  guardianRequired,
  GurukulApplicationError,
} from '../../lib/gurukul-application';

type ApplicantType = 'self' | 'parent';

/**
 * `POST /api/v1/gurukul-applications` (auth required).
 *
 * THE CONTRACT DEFECT FIXED HERE
 * ------------------------------
 * `submitSchema` closes with a `.refine` whose FIRST clause is
 *
 *     if (d.studentAgeYears < 18 && d.applicantType !== 'parent') return false;
 *
 * (apps/api/src/routes/gurukul-applications.ts:23). This screen let a devotee
 * keep `applicantType: 'self'` while typing an age under 18 — it only switched
 * on the GUARDIAN fieldset — so every under-18 self-application was posted in
 * a shape the route refuses, and came back 400 with the whole zod flatten()
 * blob rendered raw inside an `Alert`. The form now says what the server
 * requires and posts `parent` for a minor, which is the one value that can
 * succeed.
 *
 * `guardianAadhaarLast4` is `regex(/^\d{4}$/)` — a 3-digit entry 400s the
 * whole submission, so it is validated here rather than round-tripped.
 */
export default function GurukulApplyScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { session, isAuthenticated } = useAuth();

  const [applicantType, setApplicantType] = useState<ApplicantType>('self');
  const [studentName, setStudentName] = useState('');
  const [studentAgeYears, setStudentAgeYears] = useState('18');
  const [studentEmail, setStudentEmail] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianAadhaarLast4, setGuardianAadhaarLast4] = useState('');
  const [statement, setStatement] = useState('');
  const [consentSigned, setConsentSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const age = Number(studentAgeYears) || 0;
  const isMinor = age > 0 && age < 18;
  // The route refuses `{applicantType:'self', studentAgeYears:<18}` outright,
  // so a minor is ALWAYS submitted as a parent application. Both rules live in
  // lib/gurukul-application.ts, where vitest can hold them to the route.
  const applicantTypeToSend: ApplicantType = effectiveApplicantType(applicantType, age);
  const needsGuardian = guardianRequired(applicantTypeToSend, age);

  async function handleSubmit() {
    if (!isAuthenticated || !session?.accessToken) {
      Alert.alert('Sign in required', 'Please sign in to submit an application.');
      return;
    }

    let payload;
    try {
      payload = buildGurukulApplication({
        programId: programId ?? '',
        applicantType,
        studentName,
        studentAgeYears,
        studentEmail,
        guardianName,
        guardianRelation,
        guardianPhone,
        guardianAadhaarLast4,
        consentSigned,
        statement,
      });
    } catch (err) {
      Alert.alert(
        'Check the form',
        err instanceof GurukulApplicationError ? err.message : 'Please complete every field.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithBudget(`${apiBase()}/api/v1/gurukul-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // The body is JSON on every failure path — `{error}` or zod's
        // `{error:'Bad Request', details:{fieldErrors}}`. It used to be shown
        // as `res.text()`, i.e. a raw JSON blob in an Alert.
        throw new Error(await readErrorMessage(res, 'The gurukul could not accept this application.'));
      }
      setSuccess(true);
    } catch (e) {
      Alert.alert('Submission failed', failureMessage(e, 'Try again later.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color={colors.green[600]} />
          <Text style={styles.successTitle}>Application submitted</Text>
          <Text style={styles.successText}>
            The gurukul has been notified. You can track its status from your account.
          </Text>
          <TouchableOpacity style={styles.cta} onPress={() => router.back()}>
            <Text style={styles.ctaText}>Back to gurukul</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          All fields are required unless marked optional. Applications for those under 18 require parent/guardian consent.
        </Text>

        {!isAuthenticated && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>Please sign in to apply.</Text>
          </View>
        )}

        <Text style={styles.label}>Who is applying?</Text>
        <View style={styles.segRow}>
          {(['self', 'parent'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              disabled={isMinor}
              onPress={() => setApplicantType(t)}
              style={[
                styles.seg,
                applicantTypeToSend === t && styles.segActive,
                isMinor && applicantTypeToSend !== t && styles.segOff,
              ]}
            >
              <Text
                style={[styles.segText, applicantTypeToSend === t && styles.segTextActive]}
              >
                {t === 'self' ? 'Self (I am the student)' : 'Parent (for child)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {isMinor && (
          <Text style={styles.help}>
            The student is under 18, so this must be submitted by a parent or guardian.
          </Text>
        )}

        <Text style={styles.label}>Student name</Text>
        <TextInput style={styles.input} value={studentName} onChangeText={setStudentName} placeholder="Full name" placeholderTextColor={colors.stone[400]} />

        <Text style={styles.label}>Student age (years)</Text>
        <TextInput style={styles.input} value={studentAgeYears} onChangeText={setStudentAgeYears} keyboardType="number-pad" />

        <Text style={styles.label}>Student email (optional)</Text>
        <TextInput style={styles.input} value={studentEmail} onChangeText={setStudentEmail} keyboardType="email-address" autoCapitalize="none" />

        {needsGuardian && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldsetLegend}>Guardian details (required)</Text>

            <Text style={styles.label}>Guardian full name</Text>
            <TextInput style={styles.input} value={guardianName} onChangeText={setGuardianName} />

            <Text style={styles.label}>Relation</Text>
            <TextInput style={styles.input} value={guardianRelation} onChangeText={setGuardianRelation} placeholder="Father / Mother / Guardian" placeholderTextColor={colors.stone[400]} />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={guardianPhone} onChangeText={setGuardianPhone} keyboardType="phone-pad" />

            <Text style={styles.label}>Aadhaar last 4 digits (optional)</Text>
            <TextInput style={styles.input} value={guardianAadhaarLast4} onChangeText={setGuardianAadhaarLast4} keyboardType="number-pad" maxLength={4} />
            <Text style={styles.help}>For identity verification only. Full Aadhaar is never stored.</Text>
          </View>
        )}

        <Text style={styles.label}>Statement of intent</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={statement}
          onChangeText={setStatement}
          multiline
          numberOfLines={5}
          maxLength={4000}
          placeholder="Why do you want to study here? What is your background?"
          placeholderTextColor={colors.stone[400]}
        />

        <TouchableOpacity style={styles.consentRow} onPress={() => setConsentSigned(!consentSigned)}>
          <View style={[styles.checkbox, consentSigned && styles.checkboxOn]}>
            {consentSigned && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.consentText}>
            I confirm the information is true and{needsGuardian ? ', as guardian,' : ''} consent to my contact details being shared with the gurukul for the purpose of admission. (DPDP Act 2023 compliant)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cta, (submitting || !isAuthenticated) && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !isAuthenticated}
        >
          <Text style={styles.ctaText}>{submitting ? 'Submitting...' : 'Submit application'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.stone[100] },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  intro: { fontSize: fontSize.sm, color: colors.stone[600], marginBottom: spacing.md },
  warnBox: { padding: spacing.sm, backgroundColor: colors.amber[50] ?? '#fffbeb', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.amber[200] ?? '#fde68a', marginBottom: spacing.md },
  warnText: { fontSize: fontSize.sm, color: colors.amber[700] ?? '#b45309' },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[700], marginTop: spacing.sm, marginBottom: 4 },
  input: { backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.stone[200], paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: fontSize.base, color: colors.stone[900] },
  textarea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 10 },
  help: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 4 },
  segRow: { flexDirection: 'row', gap: spacing.xs },
  seg: { flex: 1, padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.stone[200], backgroundColor: colors.white, alignItems: 'center' },
  segActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  segOff: { opacity: 0.4 },
  segText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.stone[700] },
  segTextActive: { color: '#fff' },
  fieldset: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.stone[200] },
  fieldsetLegend: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[900], marginBottom: spacing.xs },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.stone[300], alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxOn: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  consentText: { flex: 1, fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
  cta: { backgroundColor: colors.saffron[600], padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.lg },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  successTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900], marginTop: spacing.sm },
  successText: { fontSize: fontSize.base, color: colors.stone[600], textAlign: 'center', marginTop: spacing.xs },
});
