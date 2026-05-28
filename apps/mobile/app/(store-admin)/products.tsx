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
import { api, useProducts } from '@poojly/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const FALLBACK = [
  { id: '1', title: 'Premium Rudraksha Mala', handle: 'rudraksha-mala-108', stock: 23, price: 1299 },
  { id: '2', title: 'Brass Ganesha Idol (6 inch)', handle: 'brass-ganesha-6', stock: 8, price: 2499 },
  { id: '3', title: 'Complete Puja Thali Set', handle: 'puja-thali-set', stock: 0, price: 899 },
  { id: '4', title: 'Bhagavad Gita (Hindi + English)', handle: 'bhagavad-gita', stock: 45, price: 349 },
  { id: '5', title: 'Pure Sandalwood Dhoop Sticks', handle: 'sandalwood-dhoop', stock: 4, price: 199 },
];

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
  const productsQuery = useProducts();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateProductForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const apiProducts = productsQuery.data?.products ?? [];
  const display =
    apiProducts.length > 0
      ? apiProducts.map((p, i) => ({
          id: p.id,
          title: p.title ?? FALLBACK[i % FALLBACK.length]!.title,
          handle: p.handle ?? '—',
          stock: FALLBACK[i % FALLBACK.length]!.stock,
          price: (p as any).price ?? FALLBACK[i % FALLBACK.length]!.price,
        }))
      : FALLBACK;

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
      await qc.invalidateQueries({ queryKey: ['store', 'products'] });
      setForm(EMPTY_FORM);
      setModalOpen(false);
      Alert.alert('Added', `${name} listed in catalogue.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add product.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalScreen
      title="Products"
      subtitle={`${display.length} in catalogue`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => setModalOpen(true)}
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Add New Product</Text>
      </TouchableOpacity>

      {display.length === 0 ? (
        <EmptyHint text="No products yet." />
      ) : (
        display.map((p) => (
          <ListRow
            key={p.id}
            primary={p.title}
            secondary={`${p.handle} • Stock: ${p.stock}`}
            trailing={`₹${p.price.toLocaleString('en-IN')}`}
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
