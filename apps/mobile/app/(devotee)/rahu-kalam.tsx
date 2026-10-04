import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
 CITY_OPTIONS,
 computeChoghadiya,
 computeRahuKalam,
 isValidDateInput,
 todayLocalISO,
 type ChoghadiyaPeriod,
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
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Rahu Kalam, Yamaganda and Gulika — plus the full 16-period choghadiya.
 *
 * WHY THIS IS COMPUTED AND NOT FETCHED
 * ------------------------------------
 * The API does have a Rahu Kaal: apps/api/src/services/panchang.service.ts
 * reads sunrise and sunset out of a hardcoded per-city, per-MONTH `CITY_TIMES`
 * table and returns one window as a string. That is a coarser input than the
 * solver here, it covers only Rahu (no Yamaganda, no Gulika, no choghadiya),
 * and it needs a round trip for arithmetic the phone can do offline.
 *
 * The Almanac-for-Computers sunrise/sunset solver moved into
 * @poojly/shared/astrology with the choghadiya module, so this screen takes
 * real lat/lng for 26 cities and derives all three dosha windows plus both
 * eight-period arcs from the same code apps/web/app/astrology/rahu-kalam runs.
 *
 * `isCurrent` is the calculators' own, computed against the device clock at
 * render — so the "now" band is only shown for today, and the screen does not
 * claim a live window on a date the devotee scrolled to.
 */

const CITY_CHIPS = CITY_OPTIONS.map((c) => ({ value: c.label, label: c.label }));

const QUALITY_COLOR = {
 auspicious: colors.green[600],
 neutral: colors.stone[500],
 inauspicious: colors.red[600],
} as const;

export default function RahuKalamScreen() {
 const [cityLabel, setCityLabel] = useState('Delhi');
 const [date, setDate] = useState(todayLocalISO());

 const city = CITY_OPTIONS.find((c) => c.label === cityLabel) ?? CITY_OPTIONS[0]!;
 const dateReady = isValidDateInput(date);

 const input = useMemo(
  () => ({ date: date.trim(), lat: city.lat, lng: city.lng, tz: city.tz, city: city.label }),
  [date, city],
 );

 const dosha = useMemo(() => (dateReady ? computeRahuKalam(input) : null), [input, dateReady]);
 const chogh = useMemo(() => (dateReady ? computeChoghadiya(input) : null), [input, dateReady]);

 return (
  <SafeAreaView style={toolStyles.screen} edges={['top', 'bottom']}>
   <ToolHeader
    title="Rahu Kalam"
    subtitle="Rahu · Yamaganda · Gulika · Choghadiya"
    icon="time"
   />

   <ScrollView contentContainerStyle={toolStyles.content} keyboardShouldPersistTaps="handled">
    <Card>
     <Field label="City" hint="Sunrise and sunset are solved from this city's latitude and longitude.">
      <ChipRow
       label="City"
       options={CITY_CHIPS}
       value={cityLabel}
       onChange={setCityLabel}
       scroll
      />
     </Field>

     <Field label="Date" hint="YYYY-MM-DD">
      <TextInput
       style={toolStyles.input}
       placeholder={todayLocalISO()}
       placeholderTextColor={colors.stone[400]}
       value={date}
       onChangeText={setDate}
       keyboardType="numbers-and-punctuation"
       autoCapitalize="none"
       autoCorrect={false}
       accessibilityLabel="Date"
      />
     </Field>

     {!dateReady ? (
      <Notice tone="warn">Enter the date as YYYY-MM-DD.</Notice>
     ) : null}
    </Card>

    {dosha ? (
     <>
      <Card>
       <SectionTitle>
        {dosha.weekday}, {dosha.date} · {dosha.city}
       </SectionTitle>
       <ResultRow label="Sunrise" value={dosha.sunrise} />
       <ResultRow label="Sunset" value={dosha.sunset} />
       <ResultRow label="Day length" value={`${dosha.dayLengthHours.toFixed(2)} hours`} />
       <ResultRow
        label="Each octet"
        value={`${Math.round(dosha.octetLengthMin)} minutes`}
       />
      </Card>

      {dosha.currentDosha ? (
       <Notice tone="warn">
        {dosha.currentDosha.label} is running right now, until {dosha.currentDosha.endTime}.
       </Notice>
      ) : null}

      <Card>
       <SectionTitle>Windows to avoid</SectionTitle>
       {dosha.windows.map((w) => (
        <View
         key={w.kind}
         style={[styles.doshaCard, w.isCurrent ? styles.doshaCardNow : null]}
        >
         <View style={styles.doshaHead}>
          <Text style={styles.doshaLabel}>{w.label}</Text>
          <Text style={styles.doshaTime}>
           {w.startTime} – {w.endTime}
          </Text>
         </View>
         <Text style={styles.doshaSanskrit}>
          {w.sanskrit} · octet {w.octet} of 8
         </Text>
         <Text style={styles.doshaRuler}>{w.ruler}</Text>
         <Text style={styles.doshaAvoid}>{w.avoid}</Text>
        </View>
       ))}
      </Card>
     </>
    ) : null}

    {chogh ? (
     <>
      <Card>
       <SectionTitle>Day choghadiya · sunrise to sunset</SectionTitle>
       {chogh.day.map((p) => (
        <PeriodRow key={`d-${p.index}`} p={p} />
       ))}
      </Card>

      <Card>
       <SectionTitle>Night choghadiya · sunset to next sunrise</SectionTitle>
       {chogh.night.map((p) => (
        <PeriodRow key={`n-${p.index}`} p={p} />
       ))}
      </Card>

      {chogh.nextAuspicious ? (
       <Notice tone="info">
        Next auspicious period: {chogh.nextAuspicious.kind} at{' '}
        {chogh.nextAuspicious.startTime}. {chogh.nextAuspicious.bestFor}
       </Notice>
      ) : null}
     </>
    ) : null}

    {dosha ? (
     <Disclaimer>
      Sunrise and sunset solved by the Almanac for Computers method (about a minute), then the
      day-arc split into eight equal octets per Muhurta Chintamani. Times are local to the city
      you picked, not to your phone.
     </Disclaimer>
    ) : null}
   </ScrollView>
  </SafeAreaView>
 );
}

function PeriodRow({ p }: { p: ChoghadiyaPeriod }) {
 return (
  <View style={[styles.periodRow, p.isCurrent ? styles.periodRowNow : null]}>
   <View style={[styles.dot, { backgroundColor: QUALITY_COLOR[p.quality] }]} />
   <View style={{ flex: 1 }}>
    <View style={styles.periodHead}>
     <Text style={styles.periodKind}>{p.kind}</Text>
     {p.isCurrent ? (
      <View style={styles.nowPill}>
       <Ionicons name="ellipse" size={7} color={colors.saffron[700]} />
       <Text style={styles.nowPillText}>now</Text>
      </View>
     ) : null}
    </View>
    <Text style={styles.periodBest}>{p.bestFor}</Text>
    <Text style={styles.periodRuler}>{p.ruler}</Text>
   </View>
   <Text style={styles.periodTime}>
    {p.startTime}
    {'\n'}
    {p.endTime}
   </Text>
  </View>
 );
}

const styles = StyleSheet.create({
 doshaCard: {
  marginTop: spacing.sm,
  padding: spacing.sm,
  borderRadius: borderRadius.md,
  borderWidth: 1,
  borderColor: colors.stone[200],
  backgroundColor: colors.stone[50],
 },
 doshaCardNow: { borderColor: colors.amber[300], backgroundColor: colors.amber[50] },
 doshaHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
 doshaLabel: { fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900] },
 doshaTime: { fontSize: fontSize.base, fontWeight: '800', color: colors.red[600] },
 doshaSanskrit: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
 doshaRuler: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 4 },
 doshaAvoid: { fontSize: fontSize.sm, color: colors.stone[700], marginTop: 4, lineHeight: 19 },

 periodRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.stone[100],
 },
 periodRowNow: { backgroundColor: colors.saffron[50], borderRadius: borderRadius.sm },
 dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
 periodHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
 periodKind: { fontSize: fontSize.sm, fontWeight: '800', color: colors.stone[900] },
 nowPill: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
  paddingHorizontal: 6,
  paddingVertical: 1,
  borderRadius: borderRadius.full,
  backgroundColor: colors.saffron[100],
 },
 nowPillText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.saffron[700] },
 periodBest: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 1, lineHeight: 16 },
 periodRuler: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 1 },
 periodTime: {
  fontSize: fontSize.xs,
  fontWeight: '700',
  color: colors.stone[700],
  textAlign: 'right',
  lineHeight: 16,
 },
});
