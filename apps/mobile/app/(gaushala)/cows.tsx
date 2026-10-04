import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiClientError } from '@poojly/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { selectPortalCows } from '../../lib/api-contracts';
import { useGaushalaPortalCows, portalQueryKeys } from '../../lib/portal-queries';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { cowHealthStatusLabel } from '../../lib/enum-labels';

/**
 * PAR-12. The list read the PUBLIC GET /api/v1/gaushala/cows — 19 cows across
 * all five seeded gaushalas — so a manager saw a herd they do not own, with
 * other people's adoption status and health records, while Register Cow POSTed
 * to the SCOPED /api/v1/gaushala-portal/cows. Every cow they added went into a
 * collection this screen never read and silently vanished; adoption revenue
 * was attributed against the wrong herd.
 *
 * Both ends now use the scoped route, and the create invalidates exactly the
 * key the list is registered under (the old code invalidated
 * ['gaushala','cows'], which is the public query).
 *
 * The six-row FALLBACK herd (Lakshmi, Nandini, Kamadhenu…) is deleted. An
 * empty registry now reads as empty: inventing livestock that a donor can
 * sponsor is not a placeholder.
 */

type CreateCowForm = {
  tagNumber: string;
  name: string;
  breed: string;
  ageYears: string;
  gender: 'female' | 'male';
  healthStatus: 'healthy' | 'treatment' | 'pregnant' | 'recovering';
  notes: string;
};

const EMPTY_FORM: CreateCowForm = {
  tagNumber: '',
  name: '',
  breed: '',
  ageYears: '',
  gender: 'female',
  healthStatus: 'healthy',
  notes: '',
};

export default function GaushalaCows() {
  const cowsQuery = useGaushalaPortalCows();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateCowForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const cows = selectPortalCows(cowsQuery.data);

  async function onRefresh() {
    setRefreshing(true);
    await cowsQuery.refetch();
    setRefreshing(false);
  }

  async function handleSubmit() {
    if (!form.tagNumber.trim() || !form.name.trim()) {
      Alert.alert('Required', 'Tag number and name are required.');
      return;
    }
    const ageNum = form.ageYears.trim() ? Number(form.ageYears) : undefined;
    if (ageNum !== undefined && (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 40)) {
      Alert.alert('Invalid age', 'Age must be a number between 0 and 40.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/v1/gaushala-portal/cows', {
        tagNumber: form.tagNumber.trim(),
        name: form.name.trim(),
        breed: form.breed.trim() || undefined,
        ageYears: ageNum,
        gender: form.gender,
        healthStatus: form.healthStatus,
        notes: form.notes.trim() || undefined,
      });
      // Refetch the SCOPED list this screen renders and wait for it, so the
      // success alert only fires once the new cow is actually in the registry
      // the manager is looking at.
      await qc.invalidateQueries({ queryKey: portalQueryKeys.gaushalaCows });
      await cowsQuery.refetch();
      setForm(EMPTY_FORM);
      setModalOpen(false);
      Alert.alert('Registered', `${form.name} added to registry.`);
    } catch (err) {
      // packages/api-client reads ApiClientError.message off `data.error.message`
      // and this route sends a flat `{error}` body, so the message is always the
      // generic "Request failed with status N". Matching on the digits in that
      // string worked only by accident; the status code is the real signal.
      const code = err instanceof ApiClientError ? err.statusCode : 0;
      Alert.alert(
        'Could not register cow',
        code === 409
          ? 'That tag number is already in your registry.'
          : code === 403
            ? 'This account does not have gaushala-manager permissions.'
            : code === 400
              ? 'One of the fields was rejected. Check the tag number, name and age.'
              : err instanceof Error
                ? err.message
                : 'Could not register cow.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalScreen
      title="Cow Registry"
      subtitle={`${cows.length} cows`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => setModalOpen(true)}
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Register New Cow</Text>
      </TouchableOpacity>

      {cowsQuery.isLoading ? (
        <EmptyHint text="Loading your registry…" />
      ) : cowsQuery.isError ? (
        <EmptyHint text="Could not load your cow registry. Pull down to retry." />
      ) : cows.length === 0 ? (
        <EmptyHint text="No cows registered yet — use Register New Cow to add one." />
      ) : (
        cows.map((c) => (
          <ListRow
            key={c.id}
            primary={`${c.name}${c.tagNumber ? ` (${c.tagNumber})` : ''}`}
            secondary={[
              c.breed,
              c.ageYears !== null ? `${c.ageYears} yrs` : null,
              c.gender,
            ]
              .filter(Boolean)
              .join(' • ')}
            // Cow has a healthStatus column but no adoption column — the pill
            // used to read "Available" for every animal, which is an adoption
            // claim the server never made.
            status={
              c.healthStatus
                ? {
                    label: cowHealthStatusLabel(c.healthStatus),
                    color:
                      c.healthStatus === 'healthy' ? colors.green[600] : colors.amber[600],
                  }
                : undefined
            }
          />
        ))
      )}

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !submitting && setModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Cow</Text>
              <TouchableOpacity onPress={() => !submitting && setModalOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Field label="Tag Number *">
                <TextInput
                  style={styles.input}
                  value={form.tagNumber}
                  onChangeText={(v) => setForm({ ...form, tagNumber: v })}
                  placeholder="e.g. GS-101"
                  maxLength={20}
                  autoCapitalize="characters"
                />
              </Field>
              <Field label="Name *">
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder="e.g. Lakshmi"
                  maxLength={100}
                />
              </Field>
              <Field label="Breed">
                <TextInput
                  style={styles.input}
                  value={form.breed}
                  onChangeText={(v) => setForm({ ...form, breed: v })}
                  placeholder="e.g. Gir, Sahiwal, Tharparkar"
                  maxLength={50}
                />
              </Field>
              <Field label="Age (years)">
                <TextInput
                  style={styles.input}
                  value={form.ageYears}
                  onChangeText={(v) => setForm({ ...form, ageYears: v.replace(/[^0-9]/g, '') })}
                  placeholder="0-40"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </Field>
              <Field label="Gender">
                <SegmentRow
                  options={[
                    { key: 'female', label: 'Female' },
                    { key: 'male', label: 'Male' },
                  ]}
                  value={form.gender}
                  onChange={(v) => setForm({ ...form, gender: v as 'female' | 'male' })}
                />
              </Field>
              <Field label="Health Status">
                <SegmentRow
                  options={[
                    { key: 'healthy', label: 'Healthy' },
                    { key: 'treatment', label: 'Treatment' },
                    { key: 'pregnant', label: 'Pregnant' },
                    { key: 'recovering', label: 'Recovering' },
                  ]}
                  value={form.healthStatus}
                  onChange={(v) => setForm({ ...form, healthStatus: v as CreateCowForm['healthStatus'] })}
                />
              </Field>
              <Field label="Notes">
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={form.notes}
                  onChangeText={(v) => setForm({ ...form, notes: v })}
                  placeholder="Optional"
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </Field>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                activeOpacity={0.7}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Registering…' : 'Register Cow'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </PortalScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SegmentRow({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmentRow}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(o.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.saffron[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  addButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  modalScroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: 6, color: '#444' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.base,
    backgroundColor: '#fafafa',
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  segmentActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  segmentText: { fontSize: fontSize.sm, color: '#444' },
  segmentTextActive: { color: colors.white, fontWeight: '600' },
  submitButton: {
    backgroundColor: colors.saffron[600],
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
});
