/**
 * Saved addresses — the address book behind Profile → Addresses.
 *
 * WHAT THIS REPLACES
 * ------------------
 * `app/(devotee)/profile.tsx` had an Addresses row whose entire behaviour was
 *
 *     Alert.alert('Addresses', `${addressCount} saved address...`)
 *
 * — a real number, read from the real endpoint, and nowhere to go with it. The
 * devotee could see that they had two addresses and could not read, add, fix or
 * remove either one. Meanwhile `app/(devotee)/checkout.tsx` refuses to place a
 * store order without a saved address and tells the devotee to "Add one under
 * Profile", which was advice to open a dialog that closes again.
 *
 * All four operations exist server-side (apps/api/src/routes/users.ts:207-355)
 * and are used here directly. See lib/account-api.ts for why the
 * `useCreateAddress` / `useUpdateAddress` hooks in @poojly/api-client are NOT
 * used: they are typed against a different field set than the route parses.
 *
 * DEFAULT ADDRESS. The route owns that invariant — POST and PATCH both clear
 * every other `isDefault` in the same request when one is set. So this screen
 * never writes two rows to move a flag, and refetches after every mutation
 * rather than patching a local list it cannot keep correct.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useUserAddresses } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { breakpoints, useResponsiveGrid } from '../../lib/use-responsive';
import {
  ADDRESS_LABELS,
  EMPTY_ADDRESS_FORM,
  addressFormFrom,
  addressLabelText,
  addressLines,
  createAddress,
  deleteAddress,
  failureMessage,
  selectSavedAddresses,
  updateAddress,
  validateAddressForm,
  type AddressFormValues,
  type SavedAddress,
} from '../../lib/account-api';

/**
 * `useUserAddresses` (packages/api-client/src/hooks/index.ts:579) is the READ.
 * It is one of the hooks PAR-02 already corrected — it reads `.addresses`, the
 * key the route actually sends — and its query key is `['user','addresses']`,
 * the same entry `app/(devotee)/checkout.tsx` reads. Reusing it means an edit
 * made here is visible at checkout without a second cache to keep in step. Only
 * the WRITES bypass the package, for the field-name reason in lib/account-api.ts.
 */

type EditorTarget = { mode: 'create' } | { mode: 'edit'; address: SavedAddress };

export default function AddressesScreen() {
  const queryClient = useQueryClient();
  // Live viewport — never Dimensions.get() at module scope (see lib/use-responsive.ts).
  const { width } = useResponsiveGrid();
  const wide = width >= breakpoints.compact;

  const addressesQuery = useUserAddresses();

  const [refreshing, setRefreshing] = useState(false);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [form, setForm] = useState<AddressFormValues>(EMPTY_ADDRESS_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const addresses = selectSavedAddresses(addressesQuery.data);

  const invalidate = useCallback(async () => {
    // The store screens read this list through `useUserAddresses`, whose key is
    // `queryKeys.user.addresses`. Invalidating the prefix catches both.
    await queryClient.invalidateQueries({ queryKey: ['user'] });
    await addressesQuery.refetch();
  }, [queryClient, addressesQuery]);

  async function onRefresh() {
    setRefreshing(true);
    await addressesQuery.refetch();
    setRefreshing(false);
  }

  function openCreate() {
    setForm(EMPTY_ADDRESS_FORM);
    setFormError(null);
    setEditor({ mode: 'create' });
  }

  function openEdit(address: SavedAddress) {
    setForm(addressFormFrom(address));
    setFormError(null);
    setEditor({ mode: 'edit', address });
  }

  async function handleSave() {
    if (editor === null || saving) return;
    const problem = validateAddressForm(form);
    if (problem !== null) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      if (editor.mode === 'create') {
        await createAddress(form);
        setBanner('Address saved.');
      } else {
        await updateAddress(editor.address.id, form);
        setBanner('Address updated.');
      }
      setEditor(null);
      await invalidate();
    } catch (err) {
      setFormError(
        failureMessage(err, editor.mode === 'create' ? 'Saving the address' : 'Updating the address'),
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(address: SavedAddress) {
    Alert.alert(
      'Remove address?',
      `${addressLabelText(address.label)} — ${addressLines(address)}\n\nThis cannot be undone. Orders already placed keep the address they were shipped to.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void handleDelete(address);
          },
        },
      ],
    );
  }

  async function handleDelete(address: SavedAddress) {
    setDeletingId(address.id);
    setBanner(null);
    try {
      await deleteAddress(address.id);
      setBanner('Address removed.');
      await invalidate();
    } catch (err) {
      Alert.alert('Could not remove', failureMessage(err, 'Removing the address'));
    } finally {
      setDeletingId(null);
    }
  }

  /** Promote a row to default through PATCH — the route clears the others. */
  async function handleMakeDefault(address: SavedAddress) {
    setDeletingId(address.id);
    setBanner(null);
    try {
      await updateAddress(address.id, { ...addressFormFrom(address), isDefault: true });
      setBanner(`${addressLabelText(address.label)} is now your default address.`);
      await invalidate();
    } catch (err) {
      Alert.alert('Could not update', failureMessage(err, 'Updating the address'));
    } finally {
      setDeletingId(null);
    }
  }

  function renderBody() {
    if (addressesQuery.isLoading) {
      return (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading your saved addresses…</Text>
        </View>
      );
    }

    if (addressesQuery.isError) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Could not load your addresses</Text>
          <Text style={styles.errorText}>
            {addressesQuery.error instanceof Error
              ? addressesQuery.error.message
              : 'Something went wrong reaching Darshya.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void addressesQuery.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Try loading your addresses again"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (addresses.length === 0) {
      return (
        <View style={styles.empty}>
          <Ionicons name="location-outline" size={36} color={colors.stone[300]} />
          <Text style={styles.emptyTitle}>No saved addresses yet</Text>
          <Text style={styles.emptyText}>
            Add one here and it becomes selectable at checkout for prasad and store deliveries.
          </Text>
        </View>
      );
    }

    return (
      <View style={wide ? styles.gridWide : undefined}>
        {addresses.map((address) => {
          const busy = deletingId === address.id;
          const isDefault = address.isDefault === true;
          return (
            <View key={address.id} style={[styles.card, wide ? styles.cardWide : null]}>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>{addressLabelText(address.label)}</Text>
                {isDefault ? (
                  <View style={styles.defaultPill}>
                    <Text style={styles.defaultPillText}>Default</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardBody}>{addressLines(address)}</Text>
              {typeof address.country === 'string' && address.country.length > 0 ? (
                <Text style={styles.cardCountry}>{address.country}</Text>
              ) : null}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => openEdit(address)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${addressLabelText(address.label)} address`}
                >
                  <Ionicons name="create-outline" size={18} color={colors.stone[700]} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>

                {isDefault ? null : (
                  <TouchableOpacity
                    style={styles.action}
                    onPress={() => void handleMakeDefault(address)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Make ${addressLabelText(address.label)} the default address`}
                  >
                    <Ionicons name="star-outline" size={18} color={colors.stone[700]} />
                    <Text style={styles.actionText}>Make default</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.action}
                  onPress={() => confirmDelete(address)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${addressLabelText(address.label)} address`}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.red[600]} />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={colors.red[600]} />
                  )}
                  <Text style={[styles.actionText, { color: colors.red[600] }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Addresses</Text>
          <Text style={styles.subtitle}>
            {addressesQuery.isLoading
              ? 'Loading…'
              : addressesQuery.isError
                ? 'Could not load addresses'
                : `${addresses.length} saved · used for prasad and store delivery`}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}
        {renderBody()}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={openCreate}
          accessibilityRole="button"
          accessibilityLabel="Add a new address"
        >
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.primaryBtnText}>Add address</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={editor !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditor(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editor?.mode === 'edit' ? 'Edit address' : 'Add address'}
              </Text>

              {formError ? (
                <View style={styles.formError}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Label</Text>
              <View style={styles.chipRow}>
                {ADDRESS_LABELS.map((option) => {
                  const active = form.label === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setForm({ ...form, label: option })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Label this address ${option}`}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {addressLabelText(option)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Address line 1</Text>
              <TextInput
                style={styles.input}
                value={form.line1}
                onChangeText={(t) => setForm({ ...form, line1: t })}
                placeholder="House / flat, street"
                placeholderTextColor={colors.stone[400]}
                maxLength={200}
                accessibilityLabel="Address line 1"
              />

              <Text style={styles.label}>Address line 2 (optional)</Text>
              <TextInput
                style={styles.input}
                value={form.line2}
                onChangeText={(t) => setForm({ ...form, line2: t })}
                placeholder="Landmark, area"
                placeholderTextColor={colors.stone[400]}
                maxLength={200}
                accessibilityLabel="Address line 2, optional"
              />

              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={form.city}
                onChangeText={(t) => setForm({ ...form, city: t })}
                maxLength={100}
                accessibilityLabel="City"
              />

              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={form.state}
                onChangeText={(t) => setForm({ ...form, state: t })}
                maxLength={100}
                accessibilityLabel="State"
              />

              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                value={form.pincode}
                onChangeText={(t) => setForm({ ...form, pincode: t.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
                maxLength={10}
                accessibilityLabel="Pincode"
              />

              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={form.country}
                onChangeText={(t) => setForm({ ...form, country: t })}
                maxLength={100}
                accessibilityLabel="Country"
              />

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setForm({ ...form, isDefault: !form.isDefault })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: form.isDefault }}
                accessibilityLabel="Use this as my default address"
              >
                <Ionicons
                  name={form.isDefault ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={form.isDefault ? colors.saffron[600] : colors.stone[400]}
                />
                <Text style={styles.checkText}>Use this as my default address</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalGhost]}
                  onPress={() => setEditor(null)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.modalGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalPrimary, saving && styles.modalDisabled]}
                  onPress={() => void handleSave()}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={editor?.mode === 'edit' ? 'Save changes' : 'Save address'}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.modalPrimaryText}>
                      {editor?.mode === 'edit' ? 'Save changes' : 'Save address'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  centre: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  centreText: { color: colors.stone[500], fontSize: fontSize.base },

  banner: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[600],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  bannerText: { color: colors.green[800], fontSize: fontSize.sm, fontWeight: '600' },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  errorTitle: { color: colors.red[600], fontSize: fontSize.base, fontWeight: '700' },
  errorText: { color: colors.stone[700], fontSize: fontSize.sm, marginTop: 4 },
  retryBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.red[500],
  },
  retryText: { color: colors.red[600], fontWeight: '700', fontSize: fontSize.sm },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[800],
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  gridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardWide: { width: '48.5%', marginBottom: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardLabel: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  defaultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[600],
  },
  defaultPillText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.green[700] },
  cardBody: { fontSize: fontSize.base, color: colors.stone[700], marginTop: 4, lineHeight: 20 },
  cardCountry: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
    paddingTop: spacing.xs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  actionText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[700] },

  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.lg },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  formError: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  formErrorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[700],
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: fontSize.lg,
    color: colors.stone[900],
    backgroundColor: colors.white,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
  },
  chipActive: { backgroundColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[600] },
  chipTextActive: { color: colors.white },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    marginTop: spacing.sm,
  },
  checkText: { fontSize: fontSize.base, color: colors.stone[700], flex: 1 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtn: {
    minHeight: 44,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  modalPrimary: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  modalPrimaryText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  modalGhost: { backgroundColor: colors.white, borderColor: colors.stone[300] },
  modalGhostText: { color: colors.stone[700], fontSize: fontSize.base, fontWeight: '700' },
  modalDisabled: { opacity: 0.6 },
});
