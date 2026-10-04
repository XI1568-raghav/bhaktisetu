import React, { useMemo, useState } from 'react';
import {
 View,
 Text,
 ScrollView,
 StyleSheet,
 TextInput,
 TouchableOpacity,
 KeyboardAvoidingView,
 Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
 computeNumerology,
 isValidDateInput,
 type NumberMeaning,
} from '../../lib/astrology-tools';
import {
 Bullets,
 Card,
 Disclaimer,
 Field,
 Notice,
 SectionTitle,
 ToolHeader,
 toolStyles,
} from '../../lib/astrology-ui';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Numerology — Pythagorean life-path and birthday numbers, Chaldean name
 * number, soul-urge and personality numbers.
 *
 * Ported by moving apps/web/lib/numerology.ts into @poojly/shared/astrology,
 * not by rewriting it: the letter tables and the master-number rule (11, 22
 * and 33 stay unreduced) are the same objects the website calls, so the two
 * cannot give different answers for the same name and date.
 *
 * The name fields are optional on purpose. A devotee who only wants their life
 * path should not have to type a name to get one, so the name-derived numbers
 * are hidden until there is a name to derive them from — rather than shown as
 * a 1 computed from an empty string.
 */

export default function NumerologyScreen() {
 const [dob, setDob] = useState('');
 const [name, setName] = useState('');

 const dateReady = isValidDateInput(dob);
 const dateTyped = dob.trim().length > 0;
 const nameReady = name.trim().replace(/[^a-zA-Z]/g, '').length > 0;

 const result = useMemo(
  () => (dateReady ? computeNumerology(dob.trim(), name) : null),
  [dob, name, dateReady],
 );

 return (
  <SafeAreaView style={toolStyles.screen} edges={['top', 'bottom']}>
   <ToolHeader title="Numerology" subtitle="Life path · birthday · name" icon="calculator" />

   <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
   >
    <ScrollView contentContainerStyle={toolStyles.content} keyboardShouldPersistTaps="handled">
     <Card>
      <Field label="Date of birth" hint="YYYY-MM-DD, e.g. 1995-08-21">
       <TextInput
        style={toolStyles.input}
        placeholder="1995-08-21"
        placeholderTextColor={colors.stone[400]}
        value={dob}
        onChangeText={setDob}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Date of birth"
       />
      </Field>

      <Field
       label="Full name (optional)"
       hint="The name you actually go by. Leave it empty for the date numbers alone."
      >
       <TextInput
        style={toolStyles.input}
        placeholder="Arjun Sharma"
        placeholderTextColor={colors.stone[400]}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        accessibilityLabel="Full name"
       />
      </Field>

      {dateTyped && !dateReady ? (
       <Notice tone="warn">
        Enter the date as YYYY-MM-DD — the calculation adds every digit of it, so a partial
        date would give a number that means nothing.
       </Notice>
      ) : null}
     </Card>

     {result ? (
      <>
       <Card style={{ borderColor: colors.saffron[200] }}>
        <View style={styles.bigRow}>
         <View>
          <Text style={styles.bigNumber}>{result.lifePath}</Text>
          <Text style={styles.bigCaption}>Life path</Text>
         </View>
         <View style={styles.bigMeta}>
          <Text style={styles.bigTitle}>{result.meanings.lifePath.title}</Text>
          <Text style={styles.bigShort}>{result.meanings.lifePath.short}</Text>
         </View>
        </View>
        <Text style={styles.trace}>Digits of your date summed: {result.lifePathSteps}</Text>
       </Card>

       <MeaningCard heading="Life path" meaning={result.meanings.lifePath} />

       <Card>
        <SectionTitle>Birthday number · {result.birthday}</SectionTitle>
        <Text style={styles.short}>{result.meanings.birthday.short}</Text>
       </Card>

       {nameReady ? (
        <>
         <Card>
          <SectionTitle>From your name</SectionTitle>
          <NumberLine
           n={result.nameChaldean}
           label="Chaldean name number"
           note="Babylonian sound-vibration values — the mapping that skips 9."
          />
          <NumberLine
           n={result.nameSoul}
           label="Soul urge (vowels)"
           note="What you want, in Pythagorean values over the vowels only."
          />
          <NumberLine
           n={result.namePersonality}
           label="Personality (consonants)"
           note="How you come across, from the consonants."
          />
         </Card>
         <MeaningCard heading="Chaldean name number" meaning={result.meanings.nameChaldean} />
        </>
       ) : (
        <Notice tone="info">
         Add a name above to also get the Chaldean name, soul-urge and personality numbers.
        </Notice>
       )}

       <Disclaimer>
        Pythagorean for the date numbers, Chaldean for the name. Master numbers 11, 22 and 33
        are left unreduced, per the Cheiro / Sepharial convention.
       </Disclaimer>
      </>
     ) : null}
    </ScrollView>
   </KeyboardAvoidingView>
  </SafeAreaView>
 );
}

function NumberLine({ n, label, note }: { n: number; label: string; note: string }) {
 return (
  <View style={styles.numberLine}>
   <View style={styles.numberBadge}>
    <Text style={styles.numberBadgeText}>{n}</Text>
   </View>
   <View style={{ flex: 1 }}>
    <Text style={styles.numberLabel}>{label}</Text>
    <Text style={styles.numberNote}>{note}</Text>
   </View>
  </View>
 );
}

function MeaningCard({ heading, meaning }: { heading: string; meaning: NumberMeaning }) {
 return (
  <Card>
   <SectionTitle>
    {heading} · {meaning.number} — {meaning.title}
   </SectionTitle>
   {meaning.planet ? (
    <Text style={styles.short}>
     Ruling graha: {meaning.planet}
     {meaning.element ? ` · Element: ${meaning.element}` : ''}
    </Text>
   ) : null}

   <View style={{ height: spacing.sm }} />
   <Text style={styles.subhead}>Strengths</Text>
   <Bullets items={meaning.strengths} />

   <View style={{ height: spacing.sm }} />
   <Text style={styles.subhead}>Challenges</Text>
   <Bullets items={meaning.challenges} />

   <View style={{ height: spacing.sm }} />
   <Text style={styles.subhead}>Careers it favours</Text>
   <Text style={styles.short}>{meaning.careers.join(' · ')}</Text>

   <View style={{ height: spacing.sm }} />
   <Text style={styles.subhead}>Lucky days and colours</Text>
   <Text style={styles.short}>
    {meaning.luckyDays.join(', ')} · {meaning.luckyColors.join(', ')}
   </Text>

   <View style={{ height: spacing.sm }} />
   <Notice tone="info">{meaning.spiritualNote}</Notice>
  </Card>
 );
}

const styles = StyleSheet.create({
 bigRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
 bigNumber: { fontSize: 52, fontWeight: '800', color: colors.saffron[600], lineHeight: 58 },
 bigCaption: { fontSize: fontSize.xs, color: colors.stone[500], fontWeight: '700' },
 bigMeta: { flex: 1 },
 bigTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
 bigShort: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 20, marginTop: 2 },
 trace: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: spacing.sm },

 short: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
 subhead: { fontSize: fontSize.sm, fontWeight: '800', color: colors.stone[800], marginBottom: 4 },

 numberLine: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.stone[100],
 },
 numberBadge: {
  width: 44,
  height: 44,
  borderRadius: borderRadius.md,
  backgroundColor: colors.saffron[50],
  alignItems: 'center',
  justifyContent: 'center',
 },
 numberBadgeText: { fontSize: fontSize.xl, fontWeight: '800', color: colors.saffron[700] },
 numberLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[900] },
 numberNote: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1, lineHeight: 16 },
});
