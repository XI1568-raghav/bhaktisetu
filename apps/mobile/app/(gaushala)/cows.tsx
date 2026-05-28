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
import { api, useCows } from '@poojly/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const FALLBACK = [
  { id: '1', name: 'Lakshmi', breed: 'Gir', age: 6, health: 'Healthy', adoptionStatus: 'Adopted' },
  { id: '2', name: 'Nandini', breed: 'Sahiwal', age: 4, health: 'Healthy', adoptionStatus: 'Available' },
  { id: '3', name: 'Kamadhenu', breed: 'Tharparkar', age: 8, health: 'Recovering', adoptionStatus: 'Available' },
  { id: '4', name: 'Surabhi', breed: 'Gir', age: 3, health: 'Healthy', adoptionStatus: 'Adopted' },
  { id: '5', name: 'Ganga', breed: 'Red Sindhi', age: 7, health: 'Senior care', adoptionStatus: 'Available' },
  { id: '6', name: 'Yamuna', breed: 'Gir', age: 5, health: 'Healthy', adoptionStatus: 'Adopted' },
];

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
  const cowsQuery = useCows();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateCowForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const apiCows = cowsQuery.data?.cows ?? [];
  const cows = apiCows.length > 0 ? apiCows : FALLBACK;

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
      await qc.invalidateQueries({ queryKey: ['gaushala', 'cows'] });
      setForm(EMPTY_FORM);
      setModalOpen(false);
      Alert.alert('Registered', `${form.name} added to registry.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not register cow.';
      Alert.alert('Error', msg.includes('409') ? 'Tag number already exists.' : msg);
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

      {cows.length === 0 ? (
        <EmptyHint text="No cows registered yet." />
      ) : (
        cows.map((c) => {
          const adopted = (c.adoptionStatus ?? '').toLowerCase().includes('adopt');
          return (
            <ListRow
              key={c.id}
              primary={c.name}
              secondary={`${c.breed ?? 'Unknown'} • ${c.age ?? '?'} yrs • ${c.health ?? 'No health data'}`}
              status={{
                label: c.adoptionStatus ?? 'Available',
                color: adopted ? colors.green[600] : colors.amber[600],
              }}
            />
          );
        })
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
