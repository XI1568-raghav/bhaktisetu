import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

type StoreCategory = 'all' | 'puja-items' | 'idols' | 'books' | 'rudraksha' | 'clothing';

interface Product {
  id: string;
  name: string;
  category: Exclude<StoreCategory, 'all'>;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  tag?: string;
}

const categoryFilters: { key: StoreCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'puja-items', label: 'Puja Items' },
  { key: 'idols', label: 'Idols' },
  { key: 'books', label: 'Books' },
  { key: 'rudraksha', label: 'Rudraksha' },
  { key: 'clothing', label: 'Clothing' },
];

const productsData: Product[] = [
  {
    id: '1',
    name: 'Premium Rudraksha Mala (108 beads)',
    category: 'rudraksha',
    price: 1299,
    originalPrice: 1999,
    rating: 4.8,
    reviews: 456,
    inStock: true,
    tag: 'Bestseller',
  },
  {
    id: '2',
    name: 'Brass Ganesha Idol (6 inch)',
    category: 'idols',
    price: 2499,
    originalPrice: 3499,
    rating: 4.9,
    reviews: 312,
    inStock: true,
  },
  {
    id: '3',
    name: 'Complete Puja Thali Set',
    category: 'puja-items',
    price: 899,
    originalPrice: 1299,
    rating: 4.7,
    reviews: 890,
    inStock: true,
    tag: 'Top Rated',
  },
  {
    id: '4',
    name: 'Bhagavad Gita (Hindi + English)',
    category: 'books',
    price: 349,
    originalPrice: 499,
    rating: 4.9,
    reviews: 2100,
    inStock: true,
  },
  {
    id: '5',
    name: 'Pure Sandalwood Dhoop Sticks (100g)',
    category: 'puja-items',
    price: 199,
    originalPrice: 299,
    rating: 4.6,
    reviews: 1450,
    inStock: true,
  },
  {
    id: '6',
    name: 'Silk Dhoti & Angavastram Set',
    category: 'clothing',
    price: 1599,
    originalPrice: 2199,
    rating: 4.5,
    reviews: 230,
    inStock: true,
  },
  {
    id: '7',
    name: 'Copper Kalash with Coconut',
    category: 'puja-items',
    price: 699,
    originalPrice: 999,
    rating: 4.7,
    reviews: 567,
    inStock: true,
  },
  {
    id: '8',
    name: '5 Mukhi Rudraksha (Certified)',
    category: 'rudraksha',
    price: 499,
    originalPrice: 799,
    rating: 4.8,
    reviews: 1890,
    inStock: true,
    tag: 'Certified',
  },
];

const iconForCategory: Record<Exclude<StoreCategory, 'all'>, React.ComponentProps<typeof Ionicons>['name']> = {
  'puja-items': 'flame',
  idols: 'body',
  books: 'book',
  rudraksha: 'ellipse',
  clothing: 'shirt',
};

function ProductCard({ product }: { product: Product }) {
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <TouchableOpacity
      style={[styles.productCard, { width: CARD_WIDTH }]}
      activeOpacity={0.7}
      onPress={() => Linking.openURL(`https://darshya.online/store?utm_source=mobile-app&utm_medium=product-card&q=${encodeURIComponent(product.name)}`)}
    >
      {/* Image placeholder */}
      <View style={styles.productImage}>
        <Ionicons
          name={iconForCategory[product.category]}
          size={28}
          color={colors.saffron[300]}
        />
        {product.tag && (
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{product.tag}</Text>
          </View>
        )}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>
            {'\u20B9'}{product.price.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.originalPrice}>
            {'\u20B9'}{product.originalPrice.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={11} color={colors.amber[500]} />
          <Text style={styles.ratingText}>{product.rating}</Text>
          <Text style={styles.reviewCount}>
            ({product.reviews.toLocaleString('en-IN')})
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={() => Linking.openURL(`https://darshya.online/store?utm_source=mobile-app&utm_medium=add-to-cart&q=${encodeURIComponent(product.name)}`)}>
          <Ionicons name="cart-outline" size={14} color={colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function inferStoreCategory(handle?: string | null, title?: string | null): Exclude<StoreCategory, 'all'> {
  const h = `${handle ?? ''} ${title ?? ''}`.toLowerCase();
  if (h.includes('rudraksh')) return 'rudraksha';
  if (h.includes('idol') || h.includes('murti') || h.includes('statue')) return 'idols';
  if (h.includes('book') || h.includes('gita') || h.includes('granth')) return 'books';
  if (h.includes('cloth') || h.includes('dhoti') || h.includes('saree') || h.includes('shawl')) return 'clothing';
  return 'puja-items';
}

export default function StoreScreen() {
  const [activeCategory, setActiveCategory] = useState<StoreCategory>('all');
  const productsQuery = useProducts();
  const [refreshing, setRefreshing] = useState(false);

  const apiProducts = productsQuery.data?.products ?? [];
  const sourceProducts: Product[] = apiProducts.length > 0
    ? apiProducts.map((p, i) => {
        const fb = productsData[i % productsData.length]!;
        const price = (p as any).price ?? fb.price;
        const original = (p as any).originalPrice ?? Math.round(price * 1.4);
        return {
          id: p.id,
          name: p.title ?? fb.name,
          category: inferStoreCategory(p.handle, p.title),
          price,
          originalPrice: original,
          rating: fb.rating,
          reviews: fb.reviews,
          inStock: true,
          tag: fb.tag,
        };
      })
    : productsData;

  const filteredProducts =
    activeCategory === 'all'
      ? sourceProducts
      : sourceProducts.filter((p) => p.category === activeCategory);

  async function onRefresh() {
    setRefreshing(true);
    await productsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Darshya Store</Text>
            <Text style={styles.headerSubtitle}>
              Sacred items delivered to your door
            </Text>
          </View>
          <TouchableOpacity style={styles.cartButton} activeOpacity={0.7} onPress={() => Linking.openURL('https://darshya.online/store/cart?utm_source=mobile-app&utm_medium=cart-icon')}>
            <Ionicons name="cart-outline" size={22} color={colors.stone[700]} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
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
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => setActiveCategory(item.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bag-outline" size={48} color={colors.stone[300]} />
            <Text style={styles.emptyText}>No products in this category</Text>
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
  cartButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
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
