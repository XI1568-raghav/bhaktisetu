import React, { useMemo, useState } from 'react';
import {
 View,
 Text,
 ScrollView,
 StyleSheet,
 TouchableOpacity,
 Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
 allNakshatraOptions,
 computeMilan,
 milanScoreLabel,
 type MilanReport,
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
 * Ashtakoot Gun Milan — the real one.
 *
 * This screen used to be a link to darshya.online. The reason recorded on
 * app/(devotee)/astrology.tsx was that the calculation lived in
 * apps/web/lib/kundli-milan.ts with no endpoint behind it — true at the time,
 * and no longer a reason, because the module now lives in
 * @poojly/shared/astrology and both clients import it. Same eight kootas, same
 * 36 points, same dosh flags; one implementation.
 *
 * It is NOT `GET /astrology/compatibility`. That route scores two rashi NAMES
 * by arithmetic over their character codes and returns the same four
 * "strengths" whatever you send it. Nothing here calls it.
 *
 * The Manglik switches are inputs, not a second calculation: shastra treats
 * mutual Manglik as cancelling, so the report says so — but it never moves the
 * 36-point total, and the screen does not pretend it did. A devotee who does
 * not know their Manglik status can find it on the Manglik check screen.
 */

const NAK_OPTIONS = allNakshatraOptions().map((o) => ({ value: o.slug, label: o.label }));

const VERDICT_TONE: Record<MilanReport['verdictLevel'], string> = {
 excellent: colors.green[600],
 good: colors.green[600],
 acceptable: colors.amber[600],
 caution: colors.amber[700],
 avoid: colors.red[600],
};

export default function KundliMilanScreen() {
 const [maleNak, setMaleNak] = useState('rohini');
 const [femaleNak, setFemaleNak] = useState('hasta');
 const [maleManglik, setMaleManglik] = useState(false);
 const [femaleManglik, setFemaleManglik] = useState(false);
 const [submitted, setSubmitted] = useState(false);

 const report = useMemo(
  () => computeMilan(maleNak, femaleNak, { maleManglik, femaleManglik }),
  [maleNak, femaleNak, maleManglik, femaleManglik],
 );

 return (
  <SafeAreaView style={toolStyles.screen} edges={['top', 'bottom']}>
   <ToolHeader
    title="Kundli Milan"
    subtitle="Ashtakoot Gun Milan · 36 points"
    icon="heart"
   />

   <ScrollView contentContainerStyle={toolStyles.content} keyboardShouldPersistTaps="handled">
    <Card>
     <Field
      label="Groom's nakshatra"
      hint="The janma nakshatra — the one the Moon was in at birth. The Nakshatra finder works it out from date and time."
     >
      <ChipRow
       label="Groom's nakshatra"
       options={NAK_OPTIONS}
       value={maleNak}
       onChange={(v) => {
        setMaleNak(v);
        setSubmitted(true);
       }}
      />
     </Field>

     <Field label="Bride's nakshatra">
      <ChipRow
       label="Bride's nakshatra"
       options={NAK_OPTIONS}
       value={femaleNak}
       onChange={(v) => {
        setFemaleNak(v);
        setSubmitted(true);
       }}
      />
     </Field>

     <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>Groom is Manglik</Text>
      <Switch
       value={maleManglik}
       onValueChange={setMaleManglik}
       accessibilityLabel="Groom is Manglik"
       trackColor={{ true: colors.saffron[300], false: colors.stone[200] }}
       thumbColor={maleManglik ? colors.saffron[600] : colors.stone[100]}
      />
     </View>
     <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>Bride is Manglik</Text>
      <Switch
       value={femaleManglik}
       onValueChange={setFemaleManglik}
       accessibilityLabel="Bride is Manglik"
       trackColor={{ true: colors.saffron[300], false: colors.stone[200] }}
       thumbColor={femaleManglik ? colors.saffron[600] : colors.stone[100]}
      />
     </View>

     <TouchableOpacity
      style={toolStyles.submitBtn}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Match the kundlis"
      accessibilityHint="Scores the eight kootas out of 36 in the app"
      onPress={() => setSubmitted(true)}
     >
      <Ionicons name="heart" size={16} color={colors.white} />
      <Text style={toolStyles.submitText}>Match the kundlis</Text>
     </TouchableOpacity>
    </Card>

    {submitted && report ? (
     <>
      <Card style={{ borderColor: colors.saffron[200] }}>
       <View style={styles.scoreHead}>
        <Text style={[styles.score, { color: VERDICT_TONE[report.verdictLevel] }]}>
         {milanScoreLabel(report.total, report.maxTotal)}
        </Text>
        <Text style={styles.scoreCaption}>guna milan</Text>
       </View>
       <Text style={styles.verdict}>{report.verdict}</Text>

       <View style={styles.pairRow}>
        <View style={styles.pairCell}>
         <Text style={styles.pairWho}>Groom</Text>
         <Text style={styles.pairNak}>{report.male.name}</Text>
         <Text style={styles.pairMeta}>
          {report.male.sanskrit} · {report.male.rashi}
         </Text>
        </View>
        <View style={styles.pairCell}>
         <Text style={styles.pairWho}>Bride</Text>
         <Text style={styles.pairNak}>{report.female.name}</Text>
         <Text style={styles.pairMeta}>
          {report.female.sanskrit} · {report.female.rashi}
         </Text>
        </View>
       </View>
      </Card>

      <Card>
       <SectionTitle>The eight kootas</SectionTitle>
       {report.gunas.map((g) => (
        <View key={g.name} style={styles.gunaRow}>
         <View style={{ flex: 1 }}>
          <Text style={styles.gunaName}>{g.name}</Text>
          <Text style={styles.gunaDesc}>{g.desc}</Text>
          <View style={styles.barTrack}>
           <View
            style={[
             styles.barFill,
             { width: `${Math.round((g.score / g.max) * 100)}%` },
             g.score === 0 ? styles.barFillZero : null,
            ]}
           />
          </View>
         </View>
         <Text style={styles.gunaScore}>
          {Number.isInteger(g.score) ? g.score : g.score.toFixed(1)}/{g.max}
         </Text>
        </View>
       ))}
      </Card>

      {report.hasNadiDosh || report.hasBhakootDosh || report.hasGanaDosh ? (
       <Card>
        <SectionTitle>Doshas found</SectionTitle>
        <Bullets
         items={[
          ...(report.hasNadiDosh
           ? [
              'Nadi dosh — both charts share the same nadi. Traditionally the heaviest of the eight, read as a caution about health and progeny.',
             ]
           : []),
          ...(report.hasBhakootDosh
           ? [
              'Bhakoot dosh — the two moon rashis fall in a 6-8, 9-5 or 12-2 relation, which shastra reads as a strain on household prosperity.',
             ]
           : []),
          ...(report.hasGanaDosh
           ? [
              'Gana dosh — the temperaments (Deva / Manushya / Rakshasa) are mismatched.',
             ]
           : []),
         ]}
        />
        <View style={{ height: spacing.sm }} />
        <Notice tone="warn">
         A dosh is not a verdict. Which cancellations apply to a specific pair is what a
         pandit reads off the full chart — this screen scores the eight kootas, it does not
         run a lagna chart.
        </Notice>
       </Card>
      ) : null}

      {report.manglikNote ? (
       <Card>
        <SectionTitle>Manglik</SectionTitle>
        <Notice tone="info">{report.manglikNote}</Notice>
        <View style={{ height: spacing.xs }} />
        <Text style={styles.footnote}>
         Entered by you, not computed here — and it does not change the {report.maxTotal}-point
         total above.
        </Text>
       </Card>
      ) : null}

      <Card>
       <ResultRow label="Groom's nakshatra" value={report.male.name} />
       <ResultRow label="Bride's nakshatra" value={report.female.name} />
       <ResultRow
        label="Total"
        value={milanScoreLabel(report.total, report.maxTotal)}
        emphasis
       />
      </Card>

      <Disclaimer>
       Nakshatra-based Ashtakoot per Brihat Parashara Hora Shastra. Pada-precise milan and
       dosh cancellation need a full birth chart from a pandit.
      </Disclaimer>
     </>
    ) : null}
   </ScrollView>
  </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 switchRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 44,
  marginBottom: spacing.xs,
 },
 switchLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[700] },

 scoreHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
 score: { fontSize: fontSize['4xl'], fontWeight: '800' },
 scoreCaption: { fontSize: fontSize.sm, color: colors.stone[500], fontWeight: '600' },
 verdict: {
  fontSize: fontSize.sm,
  color: colors.stone[700],
  lineHeight: 20,
  marginTop: spacing.xs,
 },

 pairRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
 pairCell: {
  flex: 1,
  padding: spacing.sm,
  borderRadius: borderRadius.md,
  backgroundColor: colors.stone[50],
 },
 pairWho: { fontSize: fontSize.xs, color: colors.stone[500], fontWeight: '700' },
 pairNak: { fontSize: fontSize.base, color: colors.stone[900], fontWeight: '800', marginTop: 2 },
 pairMeta: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },

 gunaRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.stone[100],
 },
 gunaName: { fontSize: fontSize.sm, fontWeight: '800', color: colors.stone[900] },
 gunaDesc: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1 },
 gunaScore: { fontSize: fontSize.sm, fontWeight: '800', color: colors.stone[800], minWidth: 46, textAlign: 'right' },
 barTrack: {
  height: 6,
  marginTop: 6,
  borderRadius: 3,
  backgroundColor: colors.stone[100],
  overflow: 'hidden',
 },
 barFill: { height: 6, borderRadius: 3, backgroundColor: colors.saffron[500] },
 barFillZero: { backgroundColor: colors.red[500] },

 footnote: { fontSize: fontSize.xs, color: colors.stone[500], lineHeight: 16 },
});
