import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Order {
  id: string;
  number: string;
  customer: string;
  items: number;
  amount: number;
  status: 'pending' | 'packed' | 'shipped' | 'delivered';
  createdAt: string;
}

const ORDERS: Order[] = [
  { id: '1', number: 'ORD-2026-0001', customer: 'Priya M.', items: 3, amount: 1697, status: 'pending', createdAt: 'Today, 10:23 AM' },
  { id: '2', number: 'ORD-2026-0002', customer: 'Ramesh K.', items: 1, amount: 2499, status: 'packed', createdAt: 'Today, 09:15 AM' },
  { id: '3', number: 'ORD-2026-0003', customer: 'Anjali S.', items: 2, amount: 998, status: 'shipped', createdAt: 'Yesterday' },
  { id: '4', number: 'ORD-2026-0004', customer: 'Vikram B.', items: 5, amount: 4250, status: 'delivered', createdAt: '2 days ago' },
  { id: '5', number: 'ORD-2026-0005', customer: 'Meera D.', items: 1, amount: 599, status: 'pending', createdAt: '3 days ago' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const STATUS_COLOR: Record<Order['status'], string> = {
  pending: colors.amber[600],
  packed: colors.saffron[600],
  shipped: colors.stone[600],
  delivered: colors.green[600],
};

export default function StoreOrders() {
  const [filter, setFilter] = useState<string>('all');
  const filtered = filter === 'all' ? ORDERS : ORDERS.filter((o) => o.status === filter);

  return (
    <PortalScreen title="Orders" subtitle={`${ORDERS.length} total • ${ORDERS.filter((o) => o.status === 'pending').length} pending`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyHint text="No orders match this filter." />
      ) : (
        filtered.map((o) => (
          <ListRow
            key={o.id}
            primary={`${o.number} • ${o.customer}`}
            secondary={`${o.items} item${o.items === 1 ? '' : 's'} • ${o.createdAt}`}
            trailing={`₹${o.amount.toLocaleString('en-IN')}`}
            status={{ label: o.status, color: STATUS_COLOR[o.status] }}
          />
        ))
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[600] },
  chipTextActive: { color: colors.white },
});
