import React, { useMemo, useState } from 'react';
import {
 View,
 Text,
 ScrollView,
 StyleSheet,
 TextInput,
 KeyboardAvoidingView,
 Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
 findNakshatra,
 birthInputError,
 canComputeBirth,
 TIMEZONE_OPTIONS,
} from '../../lib/astrology-tools';
import {
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
import { colors, spacing, fontSize } from '../../lib/theme';

/**
 * Janma nakshatra, pada and chandra rashi from a birth moment.
 *
 * The moon-longitude series (Meeus, main term + 11 perturbations) and the
 * Lahiri ayanamsa fit moved into @poojly/shared/astrology, so this screen runs
 * the same function apps/web/app/astrology/nakshatra-finder does. No endpoint
 * is involved and none is needed — the computation is arithmetic on a Julian
 * Day, which works with the phone in flight mode.
 *
 * The timezone chip is the input people get wrong: the nakshatra can change
 * within an hour, so a chart computed in the wrong offset is quietly wrong
 * rather than obviously wrong. It defaults to IST and is asked for explicitly.
 *
 * The screen prints only what the shared table holds. The website's nakshatra
 * pages add prose (career, spiritual practice, compatibility notes) that lives
 * in apps/web/lib/nakshatras.ts and is not bundled here — so those rows are
 * absent rather than invented.
 */

const TZ_OPTIONS = TIMEZONE_OPTIONS.map((t) => ({ value: t.value, label: t.label }));

export default function NakshatraFinderScreen() {
 const [dob, setDob] = useState('');
 const [time, setTime] = useState('');
 const [tz, setTz] = useState(5.5);

 const error = birthInputError(dob, time);
 const ready = canComputeBirth(dob, time);

 const result = useMemo(
  () =>
   ready
    ? findNakshatra({ dob: dob.trim(), time: time.trim(), timezoneOffset: tz })
    : null,
  [dob, time, tz, ready],
 );

 return (
  <SafeAreaView style={toolStyles.screen} edges={['top', 'bottom']}>
   <ToolHeader
    title="Nakshatra finder"
    subtitle="Janma nakshatra · pada · chandra rashi"
    icon="star"
   />

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

      <Field
       label="Timezone of the birth place"
       hint="Not where you live now. The Moon moves about 13° a day, so an hour's error can change the pada."
      >
       <ChipRow
        label="Timezone"
        options={TZ_OPTIONS}
        value={tz}
        onChange={setTz}
        scroll
       />
      </Field>

      {error ? <Notice tone="warn">{error}</Notice> : null}
     </Card>

     {result ? (
      <>
       <Card style={{ borderColor: colors.saffron[200] }}>
        <Text style={styles.nakName}>{result.nakshatra.name}</Text>
        <Text style={styles.nakSanskrit}>{result.nakshatra.sanskritName}</Text>
        <Text style={styles.nakPada}>
         Pada {result.pada} · {result.rashi}
        </Text>
       </Card>

       <Card>
        <SectionTitle>The nakshatra</SectionTitle>
        <ResultRow label="Nakshatra" value={result.nakshatra.name} emphasis />
        <ResultRow label="Number" value={`${result.nakshatraIndex + 1} of 27`} />
        <ResultRow label="Pada" value={`${result.pada} of 4`} />
        <ResultRow label="Ruling graha" value={result.nakshatra.lord} />
        <ResultRow label="Deity" value={result.nakshatra.deity} />
        <ResultRow label="Symbol" value={result.nakshatra.symbol} />
        <ResultRow label="Gana" value={result.nakshatra.gana} />
        <ResultRow label="Span" value={result.nakshatra.range} />
       </Card>

       <Card>
        <SectionTitle>The chart behind it</SectionTitle>
        <ResultRow label="Chandra rashi" value={result.rashi} />
        <ResultRow
         label="Moon longitude (sidereal)"
         value={`${result.moonSiderealLongitude.toFixed(3)}°`}
        />
        <ResultRow label="Lahiri ayanamsa" value={`${result.ayanamsa.toFixed(3)}°`} />
        <ResultRow label="Julian Day" value={result.julianDay.toFixed(5)} />
       </Card>

       <View style={{ gap: spacing.xs }}>
        <Disclaimer>
         Moon longitude via the abridged Meeus series — within about 0.3°, against a pada
         roughly 3.33° wide. Enough for namakaran and a basic kundli.
        </Disclaimer>
        <Disclaimer>
         A muhurat that has to be exact still wants a pandit running full Drik panchang.
        </Disclaimer>
       </View>
      </>
     ) : null}
    </ScrollView>
   </KeyboardAvoidingView>
  </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 nakName: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.stone[900] },
 nakSanskrit: { fontSize: fontSize.xl, color: colors.saffron[700], marginTop: 2 },
 nakPada: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: spacing.xs },
});
