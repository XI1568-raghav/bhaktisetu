import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '@poojly/api-client';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const FALLBACK = [
  { id: '1', title: 'Premium Rudraksha Mala', handle: 'rudraksha-mala-108', stock: 23, price: 1299 },
  { id: '2', title: 'Brass Ganesha Idol (6 inch)', handle: 'brass-ganesha-6', stock: 8, price: 2499 },
  { id: '3', title: 'Complete Puja Thali Set', handle: 'puja-thali-set', stock: 0, price: 899 },
  { id: '4', title: 'Bhagavad Gita (Hindi + English)', handle: 'bhagavad-gita', stock: 45, price: 349 },
  { id: '5', title: 'Pure Sandalwood Dhoop Sticks', handle: 'sandalwood-dhoop', stock: 4, price: 199 },
];

export default function StoreProducts() {
  const productsQuery = useProducts();
  const [refreshing, setRefreshing] = useState(false);

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
        onPress={() => Alert.alert('Add Product', 'Product editing flows are coming soon.')}
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
    </PortalScreen>
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
});
