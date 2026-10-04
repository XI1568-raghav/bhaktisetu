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
import { formatInr } from '../../lib/api-contracts';
import {
  selectStoreAdminProducts,
  storeAdminQueryKeys,
  useStoreAdminProducts,
} from '../../lib/store-admin-catalogue';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-24. This screen was the worst fabrication in the provider portals.
 *
 *   • The list was `useProducts()` = GET /api/v1/store/products, the PUBLIC
 *     storefront served from a hardcoded seed array. A merchant's own catalogue
 *     was never on this screen, and the products they added here (which POST to
 *     the scoped /store-admin/products) could never appear in it.
 *   • `stock: FALLBACK[i % FALLBACK.length]!.stock` ran for EVERY row,
 *     unconditionally — so the In-stock / Low / Out pill reported invented
 *     inventory. `title` and `price` had the same fallback behind `??`.
 *   • With an empty catalogue the whole five-row FALLBACK array rendered as if
 *     it were the shop, complete with prices.
 *
 * All of it is deleted. The list is now the role-gated
 * GET /api/v1/store-admin/products, `stock` and `price` are the server's, and
 * an empty catalogue reads as empty. See lib/store-admin-catalogue.ts.
 */

type CreateProductForm = {
  name: string;
  price: string;
  stock: string;
  category: string;
  sku: string;
  description: string;
};

const EMPTY_FORM: CreateProductForm = {
  name: '',
  price: '',
  stock: '',
  category: '',
  sku: '',
  description: '',
};

export default function StoreProducts() {
  const productsQuery = useStoreAdminProducts();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateProductForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const catalogue = selectStoreAdminProducts(productsQuery.data);
  // `null` = the catalogue is unknown (403 / error envelope). It is NOT the
  // same as an empty shop and must never be counted or rendered as one.
  const unavailable = !productsQuery.isLoading && catalogue === null;
  const rows = catalogue?.rows ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await productsQuery.refetch();
    setRefreshing(false);
  }

  async function handleSubmit() {
    const name = form.name.trim();
    const priceNum = Number(form.price);
    if (!name || name.length < 2) {
      Alert.alert('Required', 'Product name (min 2 chars) is required.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      Alert.alert('Invalid price', 'Price must be a non-negative number.');
      return;
    }
    const stockNum = form.stock.trim() ? Number(form.stock) : 0;
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      Alert.alert('Invalid stock', 'Stock must be a non-negative integer.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/v1/store-admin/products', {
        name,
        price: priceNum,
        stock: stockNum,
        category: form.category.trim() || undefined,
        sku: form.sku.trim() || undefined,
        description: form.description.trim() || undefined,
        isActive: true,
      });
      // The list is registered under ['store-admin','products']. The old code
      // invalidated ['store','products'] — the PUBLIC storefront query — so
      // even once the write succeeded nothing on this screen refetched.
      await qc.invalidateQueries({ queryKey: storeAdminQueryKeys.products });
      await productsQuery.refetch();
      setForm(EMPTY_FORM);
      setModalOpen(false);
      Alert.alert('Added', `${name} listed in catalogue.`);
    } catch (err) {
      // packages/api-client builds ApiClientError.message from
      // `data.error.message`, but these routes send a FLAT body
      // (`{code, error, message}`), so `err.message` is always the generic
      // "Request failed with status N". The status code is the only signal
      // that survives, so map the one case the owner can act on.
      const status = err instanceof ApiClientError ? err.statusCode : 0;
      Alert.alert(
        'Could not add product',
        status === 409
          ? 'Finish setting your store up — add your store name on the web portal — before listing products.'
          : status === 403
            ? 'This account does not have store-owner permissions.'
            : err instanceof Error
              ? err.message
              : 'Could not add product.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalScreen
      title="Products"
      subtitle={
        productsQuery.isLoading
          ? 'Loading…'
          : unavailable
            ? 'Unavailable'
            : `${catalogue?.total ?? 0} in catalogue`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {unavailable ? (
        <Text style={styles.errorBanner}>
          Your catalogue could not be loaded, so nothing is listed. This is a
          server or permission error — it is not a report that your shop is
          empty. Pull down to retry.
        </Text>
      ) : null}

      {catalogue?.storeProfileMissing ? (
        <Text style={styles.notice}>
          Your store is not set up yet. Add your store name on the Darshya web
          portal, then products you list here will be saved.
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => setModalOpen(true)}
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Add New Product</Text>
      </TouchableOpacity>

      {productsQuery.isLoading ? (
        <EmptyHint text="Loading your catalogue…" />
      ) : unavailable ? null : rows.length === 0 ? (
        <EmptyHint text="No products yet — use Add New Product to list one." />
      ) : (
        rows.map((p) => (
          <ListRow
            key={p.id}
            primary={p.name}
            secondary={
              [p.sku, p.categoryName, `Stock: ${p.stock}`, p.isActive ? null : 'Unlisted']
                .filter(Boolean)
                .join(' • ')
            }
            // A price that failed to parse shows a dash. ₹0 would be a claim
            // about what the shop charges.
            trailing={p.priceInr === null ? '—' : formatInr(p.priceInr)}
            status={
              p.stock === 0
                ? { label: 'Out', color: colors.red[600] }
                : p.stock < 10
                  ? { label: 'Low', color: colors.amber[600] }
                  : { label: 'In stock', color: colors.green[600] }
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
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity onPress={() => !submitting && setModalOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Field label="Name *">
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder="e.g. Rudraksha Mala 108 Beads"
                  maxLength={200}
                />
              </Field>
              <Field label="Price (₹) *">
                <TextInput
                  style={styles.input}
                  value={form.price}
                  onChangeText={(v) => setForm({ ...form, price: v.replace(/[^0-9.]/g, '') })}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </Field>
              <Field label="Stock">
                <TextInput
                  style={styles.input}
                  value={form.stock}
                  onChangeText={(v) => setForm({ ...form, stock: v.replace(/[^0-9]/g, '') })}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </Field>
              <Field label="Category">
                <TextInput
                  style={styles.input}
                  value={form.category}
                  onChangeText={(v) => setForm({ ...form, category: v })}
                  placeholder="e.g. Malas, Idols, Books"
                  maxLength={80}
                />
              </Field>
              <Field label="SKU">
                <TextInput
                  style={styles.input}
                  value={form.sku}
                  onChangeText={(v) => setForm({ ...form, sku: v })}
                  placeholder="Optional internal code"
                  maxLength={120}
                  autoCapitalize="characters"
                />
              </Field>
              <Field label="Description">
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  placeholder="Optional"
                  multiline
                  numberOfLines={3}
                  maxLength={5000}
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
                  {submitting ? 'Saving…' : 'Add Product'}
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
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: colors.red[500],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.red[600],
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  notice: {
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[500],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.stone[700],
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
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
  modalFooter: { padding: spacing.md, borderTopWidth: 1, borderTopColor: '#eee' },
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
  submitButton: {
    backgroundColor: colors.saffron[600],
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
});
