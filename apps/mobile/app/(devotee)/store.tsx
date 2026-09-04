import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useCart, useAddToCart } from '@poojly/api-client';
import {
  selectStoreProducts,
  selectCart,
  type StoreProductVM,
  type CartVM,
} from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { GRID_GAP, GRID_PADDING, useResponsiveGrid } from '../../lib/use-responsive';

/**
 * PAR-16. Nothing could be bought in the app.
 *
 * "Add" called `Linking.openURL('https://darshya.online/store?…&q=<product
 * name>')` — a web SEARCH for the product's name, in the mobile browser. Three
 * taps meant three browser tabs and an empty cart. The cart icon opened the web
 * cart and carried a hardcoded badge of "2" for every user, signed in or not.
 * Meanwhile useCart / useAddToCart / useUpdateCartItem / useRemoveCartItem all
 * existed in api-client and all resolve to live routes.
 *
 * The catalogue was equally invented. On the API path the screen did
 * `const fb = productsData[i % 8]` and took `rating`, `reviews` and `tag` from
 * that positional mock, then set `originalPrice = price * 1.4` — stamping a
 * real SKU with another product's 4.8/456-review social proof and a 29% "MRP
 * discount" that no one had ever offered. Every one of those fields is on the
 * product row (rating, reviewCount, compareAtPrice, discount, tag, inStock);
 * they are read from it now, and left blank when absent.
 *
 * Cart mutations return {message, cart} — the hooks type them as a bare Cart,
 * so the badge is read through selectCart, and it only moves after the server
 * has confirmed the new item count.
 *
 * THE CART BUTTON USED TO BE A DIALOG
 * -----------------------------------
 * `showCart` rendered the whole basket into an `Alert.alert` body — quantities
 * unchangeable, items unremovable, and a closing line reading "Checkout is on
 * the web store for now." Nothing in the app could complete a store order at
 * all. The cart is now app/(devotee)/cart.tsx, checkout is checkout.tsx, and
 * the placed order is visible in orders.tsx, all against the real endpoints.
 * The badge stays here because this is the screen that adds to the cart.
 */

type StoreCategory = 'all' | 'puja-items' | 'idols' | 'books' | 'rudraksha' | 'clothing';

const categoryFilters: { key: StoreCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'puja-items', label: 'Puja Items' },
  { key: 'idols', label: 'Idols' },
  { key: 'books', label: 'Books' },
  { key: 'rudraksha', label: 'Rudraksha' },
  { key: 'clothing', label: 'Clothing' },
];

const iconForCategory: Record<
  Exclude<StoreCategory, 'all'>,
  React.ComponentProps<typeof Ionicons>['name']
> = {
  'puja-items': 'flame',
  idols: 'body',
  books: 'book',
  rudraksha: 'ellipse',
  clothing: 'shirt',
};

function inferStoreCategory(product: StoreProductVM): Exclude<StoreCategory, 'all'> {
  const h = `${product.collection ?? ''} ${product.category ?? ''} ${product.handle} ${product.title}`.toLowerCase();
  if (h.includes('rudraksh')) return 'rudraksha';
  if (h.includes('idol') || h.includes('murti') || h.includes('statue')) return 'idols';
  if (h.includes('book') || h.includes('gita') || h.includes('granth') || h.includes('scripture'))
    return 'books';
  if (
    h.includes('cloth') ||
    h.includes('dhoti') ||
    h.includes('saree') ||
    h.includes('shawl') ||
    h.includes('apparel')
  )
    return 'clothing';
  return 'puja-items';
}

interface ProductRow extends StoreProductVM {
  uiCategory: Exclude<StoreCategory, 'all'>;
}

function ProductCard({
  product,
  onAdd,
  adding,
  width,
}: {
  product: ProductRow;
  onAdd: (p: ProductRow) => void;
  adding: boolean;
  width: number;
}) {
  return (
    <View style={[styles.productCard, { width }]}>
      <View style={styles.productImage}>
        <Ionicons name={iconForCategory[product.uiCategory]} size={28} color={colors.saffron[300]} />
        {product.tag ? (
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{product.tag}</Text>
          </View>
        ) : null}
        {product.discountPercent !== null && product.discountPercent > 0 ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discountPercent}% OFF</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>
            {product.priceInr === null
              ? '—'
              : `₹${product.priceInr.toLocaleString('en-IN')}`}
          </Text>
          {product.compareAtPriceInr !== null &&
          product.priceInr !== null &&
          product.compareAtPriceInr > product.priceInr ? (
            <Text style={styles.originalPrice}>
              {'₹'}
              {product.compareAtPriceInr.toLocaleString('en-IN')}
            </Text>
          ) : null}
        </View>
        {product.rating !== null ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={colors.amber[500]} />
            <Text style={styles.ratingText}>{product.rating}</Text>
            {product.reviewCount !== null ? (
              <Text style={styles.reviewCount}>
                ({product.reviewCount.toLocaleString('en-IN')})
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.ratingRow}>
            <Text style={styles.reviewCount}>No ratings yet</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.addButton, (!product.inStock || adding) && styles.addButtonDisabled]}
          activeOpacity={0.7}
          disabled={!product.inStock || adding}
          onPress={() => onAdd(product)}
        >
          <Ionicons name="cart-outline" size={14} color={colors.white} />
          <Text style={styles.addButtonText}>
            {!product.inStock ? 'Out of stock' : adding ? 'Adding…' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function StoreScreen() {
  // Live geometry. `gridKey` is what keeps the FlatList legal when `columns`
  // changes at runtime — see the `key` prop on the product grid below.
  const { columns, cardWidth, gridKey } = useResponsiveGrid();
  const [activeCategory, setActiveCategory] = useState<StoreCategory>('all');
  const productsQuery = useProducts();
  const cartQuery = useCart();
  const addToCart = useAddToCart();
  const [refreshing, setRefreshing] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const products: ProductRow[] = useMemo(
    () =>
      selectStoreProducts(productsQuery.data).map((p) => ({
        ...p,
        uiCategory: inferStoreCategory(p),
      })),
    [productsQuery.data],
  );

  const cart: CartVM | null = selectCart(cartQuery.data);

  const filteredProducts =
    activeCategory === 'all'
      ? products
      : products.filter((p) => p.uiCategory === activeCategory);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([productsQuery.refetch(), cartQuery.refetch()]);
    setRefreshing(false);
  }

  async function handleAdd(product: ProductRow) {
    setAddingId(product.id);
    try {
      const response = await addToCart.mutateAsync({ productId: product.id, quantity: 1 });
      // Confirm against what the SERVER says the cart now holds. If the
      // response is not a cart, the add did not happen — never report success
      // off a resolved promise alone.
      const updated = selectCart(response);
      if (!updated) {
        Alert.alert('Not added', 'The server did not confirm the item was added. Please retry.');
        return;
      }
      await cartQuery.refetch();
      Alert.alert(
        'Added to cart',
        `${product.title} — cart now has ${updated.itemCount} item${updated.itemCount === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add this item.';
      Alert.alert(
        'Could not add to cart',
        message.includes('401') ? 'Sign in to add items to your cart.' : message,
      );
    } finally {
      setAddingId(null);
    }
  }

  const badgeCount = cart?.itemCount ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Darshya Store</Text>
            <Text style={styles.headerSubtitle}>
              {productsQuery.isLoading
                ? 'Loading catalogue…'
                : productsQuery.isError
                  ? 'Catalogue unavailable'
                  : `${products.length} items · delivered to your door`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.cartButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="My orders"
              onPress={() => router.push('/(devotee)/orders' as never)}
            >
              <Ionicons name="receipt-outline" size={22} color={colors.stone[700]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cartButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                badgeCount > 0
                  ? `Your cart, ${badgeCount} item${badgeCount === 1 ? '' : 's'}`
                  : 'Your cart'
              }
              onPress={() => router.push('/(devotee)/cart' as never)}
            >
              <Ionicons name="cart-outline" size={22} color={colors.stone[700]} />
              {badgeCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{badgeCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={categoryFilters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveCategory(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        // VirtualizedList caches cell layout per column count and throws
        // "Changing numColumns on the fly is not supported" if the prop moves
        // under it. Keying the list on the column count remounts it on exactly
        // the renders where `numColumns` actually differs — a rotation, an
        // iPad Split View resize, a fold — and on no other render, so ordinary
        // re-renders (filter, refetch, add-to-cart) keep their scroll offset.
        key={gridKey}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onAdd={handleAdd}
            adding={addingId === item.id}
            width={cardWidth}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={productsQuery.isError ? 'cloud-offline-outline' : 'bag-outline'}
              size={48}
              color={colors.stone[300]}
            />
            <Text style={styles.emptyText}>
              {productsQuery.isLoading
                ? 'Loading…'
                : productsQuery.isError
                  ? 'Could not load the store'
                  : 'No products in this category'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.stone[900],
  },
  headerSubtitle: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartButton: {
    position: 'relative',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.saffron[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  // Filter
  filterContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
  },
  filterChipActive: {
    backgroundColor: colors.saffron[600],
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[500],
  },
  filterChipTextActive: {
    color: colors.white,
  },
  // Grid
  listContent: {
    padding: GRID_PADDING,
    gap: GRID_GAP,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  // Product Card
  productCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stone[100],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  productImage: {
    height: 110,
    backgroundColor: colors.saffron[50],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tagBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.saffron[600],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.green[600],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  productInfo: {
    padding: spacing.sm,
  },
  productName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[900],
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.saffron[700],
  },
  originalPrice: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: spacing.sm,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.stone[700],
  },
  reviewCount: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffron[600],
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  addButtonDisabled: {
    backgroundColor: colors.stone[300],
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.stone[600],
  },
});
