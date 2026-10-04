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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
 checkManglik,
 birthInputError,
 canComputeBirth,
 TIMEZONE_OPTIONS,
 MANGLIK_REMEDIES,
 CANCELLATION_RULES,
} from '../../lib/astrology-tools';
import {
 Bullets,
 Card,
 ChipRow,
 Disclaimer,
 Field,
 Notice,
 ResultRow,
 SectionTitle,
 ToolHeader,
 toolStyles,
} from '../../lib/astrology-ui';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Mangal (Manglik) dosh from chandra-lagna.
 *
 * Same function the website runs — apps/web/lib/manglik.ts and this screen
 * both import `checkManglik` from @poojly/shared/astrology, so a chart cannot
 * come out manglik on one client and clear on the other.
 *
 * WHAT THIS CHECK IS, STATED ON THE SCREEN
 * ----------------------------------------
 * It counts Mars's house FROM THE MOON, not from the lagna, because the lagna
 * needs a birth latitude and longitude this form does not ask for. That is the
 * widely used marriage-matching variant, and the screen says so rather than
 * implying a full lagna reading — a devotee told "you are Manglik" deserves to
 * know which of the two checks produced it.
 */

const TZ_OPTIONS = TIMEZONE_OPTIONS.map((t) => ({ value: t.value, label: t.label }));

const SEVERITY_LABEL: Record<'none' | 'anshik' | 'poorna', string> = {
 none: 'No Mangal dosh',
 anshik: 'Anshik (partial) Mangal dosh',
 poorna: 'Poorna (full) Mangal dosh',
};

export default function ManglikScreen() {
 const [dob, setDob] = useState('');
 const [time, setTime] = useState('');
 const [tz, setTz] = useState(5.5);

 const error = birthInputError(dob, time);
 const ready = canComputeBirth(dob, time);

 const result = useMemo(
  () =>
   ready ? checkManglik({ dob: dob.trim(), time: time.trim(), timezoneOffset: tz }) : null,
  [dob, time, tz, ready],
 );

 return (
  <SafeAreaView style={toolStyles.screen} edges={['top', 'bottom']}>
   <ToolHeader title="Manglik check" subtitle="Mangal dosh from chandra-lagna" icon="flame" />

   <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
   >
    <ScrollView contentContainerStyle={toolStyles.content} keyboardShouldPersistTaps="handled">
     <Card>
      <Field label="Date of birth" hint="YYYY-MM-DD">
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

      <Field label="Time of birth" hint="HH:MM on a 24-hour clock, local to the birth place">
       <TextInput
        style={toolStyles.input}
        placeholder="14:30"
        placeholderTextColor={colors.stone[400]}
        value={time}
        onChangeText={setTime}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Time of birth"
       />
      </Field>

      <Field label="Timezone of the birth place">
       <ChipRow label="Timezone" options={TZ_OPTIONS} value={tz} onChange={setTz} scroll />
      </Field>

      {error ? <Notice tone="warn">{error}</Notice> : null}
     </Card>

     {result ? (
      <>
       <Card
        style={{
         borderColor: result.isManglik ? colors.amber[200] : colors.green[200],
        }}
       >
        <View style={styles.verdictRow}>
         <View
          style={[
           styles.verdictIcon,
           {
            backgroundColor: result.isManglik ? colors.amber[50] : colors.green[50],
           },
          ]}
         >
          <Ionicons
           name={result.isManglik ? 'alert-circle' : 'checkmark-circle'}
           size={26}
           color={result.isManglik ? colors.amber[600] : colors.green[600]}
          />
         </View>
         <View style={{ flex: 1 }}>
          <Text style={styles.verdictTitle}>{SEVERITY_LABEL[result.severity]}</Text>
          <Text style={styles.verdictSub}>
           Mars sits in house {result.marsHouseFromMoon} from your Moon.
          </Text>
         </View>
        </View>
        <Text style={styles.reasoning}>{result.reasoning}</Text>
       </Card>

       <Card>
        <SectionTitle>The placement</SectionTitle>
        <ResultRow label="Chandra rashi (Moon)" value={result.moonRashi} />
        <ResultRow label="Mangal rashi (Mars)" value={result.marsRashi} />
        <ResultRow
         label="Mars house from Moon"
         value={String(result.marsHouseFromMoon)}
         emphasis
        />
        <ResultRow
         label="Moon longitude (sidereal)"
         value={`${result.moonLongitude.toFixed(3)}°`}
        />
        <ResultRow
         label="Mars longitude (sidereal)"
         value={`${result.marsLongitude.toFixed(3)}°`}
        />
       </Card>

       {result.isManglik ? (
        <Card>
         <SectionTitle>Traditional remedies</SectionTitle>
         <Bullets items={MANGLIK_REMEDIES} />
        </Card>
       ) : null}

       <Card>
        <SectionTitle>When the dosh is considered cancelled</SectionTitle>
        <Bullets items={CANCELLATION_RULES} />
        <View style={{ height: spacing.sm }} />
        <Notice tone="info">
         Whether a cancellation applies to a specific chart is a reading, not a lookup — that
         is the part a pandit does.
        </Notice>
       </Card>

       <TouchableOpacity
        style={toolStyles.submitBtn}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open Kundli Milan"
        accessibilityHint="Opens the Gun Milan screen in the app"
        onPress={() => router.push('/(devotee)/kundli-milan' as never)}
       >
        <Ionicons name="heart" size={16} color={colors.white} />
        <Text style={toolStyles.submitText}>Match a kundli with this</Text>
       </TouchableOpacity>

       <Disclaimer>
        Mars house counted from the Moon, not from the lagna — the lagna variant needs a birth
        latitude and longitude, which this form does not ask for. Mars longitude via the
        abridged Meeus series (about 0.5°) against 30°-wide houses.
       </Disclaimer>
      </>
     ) : null}
    </ScrollView>
   </KeyboardAvoidingView>
  </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 verdictRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
 verdictIcon: {
  width: 48,
  height: 48,
  borderRadius: borderRadius.md,
  alignItems: 'center',
  justifyContent: 'center',
 },
 verdictTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
 verdictSub: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: 2 },
 reasoning: {
  fontSize: fontSize.sm,
  color: colors.stone[700],
  lineHeight: 20,
  marginTop: spacing.sm,
 },
});
