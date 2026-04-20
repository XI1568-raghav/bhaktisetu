'use client';

import { useState, useEffect } from 'react';
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
  Image,
  Tag,
  BarChart3,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
  stock: number;
  sku: string;
  isActive: boolean;
}

const STORAGE_KEY = 'poojly_store_products';

const CATEGORIES = [
  'Puja Items', 'Idols & Murtis', 'Rudraksha & Malas',
  'Incense & Dhoop', 'Books & Scriptures', 'Clothing & Accessories',
  'Home Decor', 'Havan Samagri', 'Prasad & Bhog', 'Other',
];

const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'Brass Diya Set (Pack of 6)',
    price: 450,
    description: 'Handcrafted brass diyas with intricate traditional designs. Perfect for daily puja and festivals. Comes with cotton wicks.',
    imageUrl: 'https://images.unsplash.com/photo-1606293926249-ed22bf21f0f0?w=200',
    category: 'Puja Items',
    stock: 156,
    sku: 'PJ-DYA-001',
    isActive: true,
  },
  {
    id: '2',
    name: '5 Mukhi Rudraksha Mala (108+1 Beads)',
    price: 1290,
    description: 'Authentic Nepal origin 5 mukhi Rudraksha mala. Lab tested and certified. Comes with silk thread and certificate of authenticity.',
    imageUrl: 'https://images.unsplash.com/photo-1583396897939-50cfb1735d25?w=200',
    category: 'Rudraksha & Malas',
    stock: 89,
    sku: 'RD-MLA-005',
    isActive: true,
  },
  {
    id: '3',
    name: 'Complete Puja Thali Set',
    price: 1850,
    description: 'German silver puja thali with kalash, diya, bell, incense holder, kumkum box, and spoon. Gift packaging available.',
    imageUrl: 'https://images.unsplash.com/photo-1567591370504-81e1642e4tried?w=200',
    category: 'Puja Items',
    stock: 67,
    sku: 'PJ-THI-010',
    isActive: true,
  },
  {
    id: '4',
    name: 'Premium Agarbatti Box (12 Fragrances)',
    price: 350,
    description: 'Charcoal-free hand-rolled incense sticks in 12 divine fragrances including sandalwood, rose, jasmine, mogra, and gulab.',
    imageUrl: 'https://images.unsplash.com/photo-1600577574532-30b5742e8a35?w=200',
    category: 'Incense & Dhoop',
    stock: 234,
    sku: 'IN-AGB-012',
    isActive: true,
  },
  {
    id: '5',
    name: 'Silver Plated Ganesh Idol (6 inch)',
    price: 4500,
    description: 'Exquisite silver plated Lord Ganesha idol. Fine detailing with jeweled crown. Perfect for home mandir or gifting.',
    imageUrl: 'https://images.unsplash.com/photo-1618397746666-63405ce5d015?w=200',
    category: 'Idols & Murtis',
    stock: 23,
    sku: 'ID-GNS-006',
    isActive: true,
  },
  {
    id: '6',
    name: 'Kumkum & Haldi Gift Set',
    price: 280,
    description: 'Pure organic kumkum and haldi powder set in brass containers. Traditional Rajasthani design packaging.',
    imageUrl: '',
    category: 'Puja Items',
    stock: 0,
    sku: 'PJ-KHG-003',
    isActive: true,
  },
  {
    id: '7',
    name: 'Camphor Tablets (Pack of 100)',
    price: 199,
    description: 'Pure camphor tablets for aarti and puja. Strong fragrance, burns cleanly without residue.',
    imageUrl: '',
    category: 'Puja Items',
    stock: 450,
    sku: 'PJ-CMP-002',
    isActive: true,
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function generateSku(category: string): string {
  const prefix = category.slice(0, 2).toUpperCase();
  const num = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${num}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

// ─── Component ──────────────────────────────────────────────────

export default function StoreAdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setProducts(JSON.parse(stored));
    } else {
      setProducts(defaultProducts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
    }
  }, []);

  function persist(updated: Product[]) {
    setProducts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

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

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setFormName(product.name);
    setFormPrice(String(product.price));
    setFormDesc(product.description);
    setFormImageUrl(product.imageUrl);
    setFormCategory(product.category);
    setFormStock(String(product.stock));
    setFormSku(product.sku);
    setEditingId(product.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPrice || !formCategory) return;

    setSaving(true);
    setTimeout(() => {
      if (editingId) {
        const updated = products.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: formName.trim(),
                price: parseInt(formPrice) || 0,
                description: formDesc.trim(),
                imageUrl: formImageUrl.trim(),
                category: formCategory,
                stock: parseInt(formStock) || 0,
                sku: formSku || p.sku,
              }
            : p
        );
        persist(updated);
      } else {
        const newProduct: Product = {
          id: generateId(),
          name: formName.trim(),
          price: parseInt(formPrice) || 0,
          description: formDesc.trim(),
          imageUrl: formImageUrl.trim(),
          category: formCategory,
          stock: parseInt(formStock) || 0,
          sku: formSku || generateSku(formCategory),
          isActive: true,
        };
        persist([...products, newProduct]);
      }
      setSaving(false);
      resetForm();
    }, 400);
  }

  function deleteProduct(id: string) {
    const updated = products.filter((p) => p.id !== id);
    persist(updated);
  }

  function toggleActive(id: string) {
    const updated = products.map((p) =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    );
    persist(updated);
  }

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Products</h1>
          <p className="text-surface-500 mt-1">
            {products.length} products &middot; {totalStock} total stock &middot; {outOfStock} out of stock
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Add/Edit Form */}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  placeholder="e.g. Brass Diya Set"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 bg-white"
                  required
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
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
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none"
                placeholder="Product description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Image URL
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
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
                    className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                    placeholder="450"
                    min="1"
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
                    className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
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
                    className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                    placeholder="Auto-generated if empty"
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

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
            placeholder="Search by name or SKU..."
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Package className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No products found</h3>
          <p className="text-sm text-surface-500 mt-1">
            {search || categoryFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Add your first product to start selling.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          {/* Desktop table header */}
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
            {filtered.map((product) => (
              <div key={product.id} className="px-5 py-4 hover:bg-surface-50/50 transition-colors">
                {/* Desktop */}
                <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="w-5 h-5 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>';
                          }}
                        />
                      ) : (
                        <Package className="w-5 h-5 text-surface-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">{product.name}</p>
                      <p className="text-xs text-surface-400 truncate">{product.description.slice(0, 50)}...</p>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm font-semibold text-surface-800">{formatCurrency(product.price)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {product.category}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className={`text-sm font-medium ${
                      product.stock === 0 ? 'text-red-600' : product.stock < 20 ? 'text-amber-600' : 'text-surface-800'
                    }`}>
                      {product.stock}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-xs text-surface-500 font-mono">{product.sku}</span>
                  </div>
                  <div className="col-span-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      product.stock === 0
                        ? 'bg-red-100 text-red-700'
                        : product.isActive
                        ? 'bg-tulsi-green-light/30 text-tulsi-green'
                        : 'bg-surface-100 text-surface-500'
                    }`}>
                      {product.stock === 0 ? 'Out of Stock' : product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleActive(product.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                    >
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEditForm(product)}
                      className="p-2 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile */}
                <div className="lg:hidden space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-surface-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-800">{product.name}</p>
                        <p className="text-xs text-surface-500">{product.category}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-surface-800">{formatCurrency(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-surface-400 font-mono">{product.sku}</span>
                    <span className="text-xs text-surface-400">&middot; Stock: {product.stock}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      product.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-tulsi-green-light/30 text-tulsi-green'
                    }`}>
                      {product.stock === 0 ? 'Out of Stock' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => openEditForm(product)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
