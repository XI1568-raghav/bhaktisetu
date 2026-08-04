'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  IndianRupee,
  Save,
  Loader2,
  Search,
  Image as ImageIcon,
  Tag,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import {
  listStoreProducts,
  createStoreProduct,
  updateStoreProduct,
  deleteStoreProduct,
  type StoreProduct,
  type CreateStoreProductInput,
} from '../../../lib/store-admin-api';

// ─── Constants ──────────────────────────────────────────────────

const CATEGORIES = [
  'Puja Items',
  'Idols & Murtis',
  'Rudraksha & Malas',
  'Incense & Dhoop',
  'Books & Scriptures',
  'Clothing & Accessories',
  'Home Decor',
  'Havan Samagri',
  'Prasad & Bhog',
  'Other',
];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Component ──────────────────────────────────────────────────

export default function StoreAdminProductsPage() {
  return (
    <AuthGuard allowedRoles={['store_owner', 'admin']}>
      <StoreAdminProductsPageContent />
    </AuthGuard>
  );
}

function StoreAdminProductsPageContent() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form state
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formSku, setFormSku] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listStoreProducts(token);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token, load]);

  function resetForm() {
    setFormName('');
    setFormPrice('');
    setFormDesc('');
    setFormImageUrl('');
    setFormCategory('');
    setFormStock('');
    setFormSku('');
    setEditingId(null);
    setShowForm(false);
  }

  function openEditForm(p: StoreProduct) {
    setFormName(p.name);
    setFormPrice(p.price);
    setFormDesc(p.description ?? '');
    setFormImageUrl(p.imageUrl ?? '');
    setFormCategory(p.category ?? '');
    setFormStock(String(p.stock));
    setFormSku(p.sku ?? '');
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // P2 #218 (2026-08-03): previously a missing token silently `return`ed with
    // no POST and no feedback — the form appeared to do nothing. Surface the
    // reason; also fail loudly when the session token is rejected (demo/401)
    // instead of looking like a no-op.
    if (!formName.trim() || !formPrice) return;
    if (!token) {
      setError('You are not signed in. Please sign in again to add a product.');
      return;
    }
    setSaving(true);
    setError(null);
    const body: CreateStoreProductInput = {
      name: formName.trim(),
      price: Number(formPrice),
      description: formDesc.trim() || undefined,
      imageUrl: formImageUrl.trim() || undefined,
      category: formCategory || undefined,
      stock: formStock ? Number(formStock) : 0,
      sku: formSku.trim() || undefined,
    };
    try {
      if (editingId) {
        const updated = await updateStoreProduct(token, editingId, body);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createStoreProduct(token, body);
        setProducts((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: StoreProduct) {
    if (!token) return;
    setBusyId(p.id);
    const prev = products;
    setProducts((cur) =>
      cur.map((x) => (x.id === p.id ? { ...x, isActive: !x.isActive } : x)),
    );
    try {
      const updated = await updateStoreProduct(token, p.id, { isActive: !p.isActive });
      setProducts((cur) => cur.map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      setProducts(prev);
      setError(err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this product?')) return;
    setBusyId(id);
    const prev = products;
    setProducts((cur) => cur.filter((x) => x.id !== id));
    try {
      await deleteStoreProduct(token, id);
    } catch (err) {
      setProducts(prev);
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="h-8 w-40 bg-surface-100 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku?.toLowerCase().includes(q) ?? false);
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Products</h1>
          <p className="text-surface-500 mt-1">
            {products.length} products &middot; {totalStock} total stock &middot;{' '}
            {outOfStock} out of stock
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => void load()}
            className="ml-2 text-xs font-medium text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-surface-800">
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button
              onClick={resetForm}
              className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="e.g. Brass Diya Set"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Description
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
                placeholder="Product description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Image URL
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Price (INR) *
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="450"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Stock Quantity
                </label>
                <div className="relative">
                  <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="100"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  SKU
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingId ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 text-surface-600 font-medium text-sm rounded-lg hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Search by name or SKU..."
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Package className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">
            No products found
          </h3>
          <p className="text-sm text-surface-500 mt-1">
            {search || categoryFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Add your first product to start selling.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-50 text-xs font-semibold text-surface-500 uppercase tracking-wider border-b border-surface-100">
            <div className="col-span-4">Product</div>
            <div className="col-span-1">Price</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Stock</div>
            <div className="col-span-1">SKU</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-surface-50">
            {filtered.map((product) => {
              const price = Number(product.price);
              const isBusy = busyId === product.id;
              return (
                <div
                  key={product.id}
                  className="px-5 py-4 hover:bg-surface-50/50 transition-colors"
                >
                  <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-surface-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">
                          {product.name}
                        </p>
                        {product.description && (
                          <p className="text-xs text-surface-400 truncate">
                            {product.description.slice(0, 60)}
                            {product.description.length > 60 ? '…' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm font-semibold text-surface-800">
                        {formatCurrency(price)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      {product.category && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span
                        className={`text-sm font-medium ${
                          product.stock === 0
                            ? 'text-red-600'
                            : product.stock < 20
                              ? 'text-amber-600'
                              : 'text-surface-800'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs text-surface-500 font-mono">
                        {product.sku ?? '—'}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          product.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : product.isActive
                              ? 'bg-tulsi-green-light/30 text-tulsi-green'
                              : 'bg-surface-100 text-surface-500'
                        }`}
                      >
                        {product.stock === 0
                          ? 'Out of Stock'
                          : product.isActive
                            ? 'Active'
                            : 'Inactive'}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => void handleToggleActive(product)}
                        disabled={isBusy}
                        className="px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {product.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => openEditForm(product)}
                        disabled={isBusy}
                        className="p-2 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => void handleDelete(product.id)}
                        disabled={isBusy}
                        className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="lg:hidden space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-surface-300" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-800">
                            {product.name}
                          </p>
                          <p className="text-xs text-surface-500">
                            {product.category ?? 'Uncategorized'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-surface-800">
                        {formatCurrency(price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {product.sku && (
                        <span className="text-xs text-surface-400 font-mono">
                          {product.sku}
                        </span>
                      )}
                      <span className="text-xs text-surface-400">
                        &middot; Stock: {product.stock}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          product.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-tulsi-green-light/30 text-tulsi-green'
                        }`}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => openEditForm(product)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(product.id)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
