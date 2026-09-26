import { useState } from 'react';
import BackendService from '../lib/backend';
import type { Product } from '../types';

interface AdminProductFormProps {
  product?: Product;
  onSaved: () => void;
  onCancel: () => void;
}

export default function AdminProductForm({ product, onSaved, onCancel }: AdminProductFormProps) {
  const [form, setForm] = useState({
    title: product?.title || '',
    slug: product?.slug || '',
    price: String(product?.price || ''),
    compareAtPrice: String(product?.compareAtPrice || ''),
    description: product?.description || '',
    fabricDetails: product?.fabricDetails || '',
    category: product?.category || 'tops',
    homepageSlot: product?.homepageSlot || 'none',
    isPublished: product?.isPublished ?? true,
    tags: product?.tags?.join(', ') || '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [variants, setVariants] = useState(product?.variants?.map((variant) => ({ size: variant.size, stockCount: variant.stockCount, sku: variant.sku })) || [{ size: 'S', stockCount: 0, sku: '' }, { size: 'M', stockCount: 0, sku: '' }, { size: 'L', stockCount: 0, sku: '' }, { size: 'XL', stockCount: 0, sku: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      category: form.category as Product['category'],
      homepageSlot: form.homepageSlot as Product['homepageSlot'],
    };
    const saved = await BackendService.saveProduct(payload, images, variants, product?.id);
    setSaving(false);
    if (!saved) {
      setError('Could not save product. Check Supabase permissions and required fields.');
      return;
    }
    onSaved();
  };

  return (
    <form onSubmit={submit} className="mb-6 grid gap-4 rounded-2xl border border-black/10 bg-[#F5F5F7] p-5 md:grid-cols-2">
      <h3 className="text-lg font-bold md:col-span-2">{product ? 'Edit Product' : 'Add Product'}</h3>
      <input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Product title" className="rounded-xl bg-white p-3 text-sm" />
      <input required value={form.slug} onChange={(e) => update('slug', e.target.value)} placeholder="product-slug" className="rounded-xl bg-white p-3 text-sm" />
      <input required type="number" min="0" value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="Price in PKR" className="rounded-xl bg-white p-3 text-sm" />
      <input type="number" min="0" value={form.compareAtPrice} onChange={(e) => update('compareAtPrice', e.target.value)} placeholder="Sale compare price (optional)" className="rounded-xl bg-white p-3 text-sm" />
      <input value={form.fabricDetails} onChange={(e) => update('fabricDetails', e.target.value)} placeholder="Fabric details" className="rounded-xl bg-white p-3 text-sm" />
      <select value={form.category} onChange={(e) => update('category', e.target.value)} className="rounded-xl bg-white p-3 text-sm">
        <option value="tops">Shirts</option><option value="bottoms">Pants</option>
      </select>
      <select value={form.homepageSlot} onChange={(e) => update('homepageSlot', e.target.value)} className="rounded-xl bg-white p-3 text-sm">
        <option value="none">No homepage slot</option><option value="new_release">New release</option><option value="best_seller">Best seller</option><option value="hero">Hero</option>
      </select>
      <input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="Tags: sale, new-arrival, bestseller" className="rounded-xl bg-white p-3 text-sm md:col-span-2" />
      <textarea required value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Description" className="min-h-24 rounded-xl bg-white p-3 text-sm md:col-span-2" />
      <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files || []))} className="rounded-xl bg-white p-3 text-sm md:col-span-2" />
      <div className="grid gap-2 md:col-span-2">
        <p className="text-sm font-semibold">Sizes, stock and SKU</p>
        {variants.map((variant, index) => <div key={variant.size} className="grid grid-cols-3 gap-2"><input value={variant.size} onChange={(e) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, size: e.target.value } : item))} placeholder="Size" className="rounded-xl bg-white p-3 text-sm" /><input type="number" min="0" value={variant.stockCount} onChange={(e) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stockCount: Number(e.target.value) } : item))} placeholder="Stock" className="rounded-xl bg-white p-3 text-sm" /><input value={variant.sku} onChange={(e) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sku: e.target.value } : item))} placeholder="SKU" className="rounded-xl bg-white p-3 text-sm" /></div>)}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={(e) => update('isPublished', e.target.checked)} /> Published</label>
      {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
      <div className="flex gap-2 md:col-span-2"><button disabled={saving} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Product'}</button><button type="button" onClick={onCancel} className="rounded-full border border-black/10 px-5 py-3 text-sm">Cancel</button></div>
    </form>
  );
}
