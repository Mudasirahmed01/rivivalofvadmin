import { useEffect, useState } from 'react';
import BackendService from '../lib/backend';
import type { Product } from '../types';

interface AdminProductFormProps {
  product?: Product;
  onSaved: () => void;
  onCancel: () => void;
}

export default function AdminProductForm({ product, onSaved, onCancel }: AdminProductFormProps) {
  const [catalogOptions, setCatalogOptions] = useState<{ categories: Array<{ key: string; label: string; requiresSize: boolean; active: boolean }>; placements: Array<{ key: string; label: string; active: boolean }> }>({ categories: [], placements: [] });
  const [form, setForm] = useState({
    title: product?.title || '',
    slug: product?.slug || '',
    price: String(product?.price || ''),
    compareAtPrice: String(product?.compareAtPrice || ''),
    description: product?.description || '',
    fabricDetails: product?.fabricDetails || '',
    category: product?.category || '',
    homepageSlot: product?.homepageSlot || '',
    isPublished: product?.isPublished ?? true,
    tags: product?.tags?.join(', ') || '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [mobileImages, setMobileImages] = useState<File[]>([]);
  const [variants, setVariants] = useState(() => {
    if (product) return product.variants?.map((variant) => ({ size: variant.size, stockCount: variant.stockCount, sku: variant.sku })) || [];
    return [{ size: 'S', stockCount: 0, sku: '' }, { size: 'M', stockCount: 0, sku: '' }, { size: 'L', stockCount: 0, sku: '' }, { size: 'XL', stockCount: 0, sku: '' }];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([BackendService.getStoreSettings(), BackendService.getProducts()]).then(([settings, products]) => {
      const options = settings.catalog_options || { categories: [], placements: [] };
      const categories = Array.isArray(options.categories) ? options.categories : [];
      const missingCategories = [...new Set(products.map((item) => item.category))]
        .filter((key) => !categories.some((category: any) => category.key === key))
        .map((key) => ({ key, label: key.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), requiresSize: products.some((item) => item.category === key && item.variants.length > 0), active: true }));
      options.categories = [...categories, ...missingCategories];
      if (product?.category && !options.categories.some((category: any) => category.key === product.category)) {
        options.categories = [...options.categories, { key: product.category, label: product.category, requiresSize: product.variants.length > 0, active: true }];
      }
      setCatalogOptions(options);
    });
  }, [product?.category]);

  const selectedCategory = catalogOptions.categories.find((category) => category.key === form.category);

  const update = (field: string, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const productTitle = form.title.trim() || 'Untitled product';
    const normalizedSlug = form.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      || productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      || `product-${crypto.randomUUID().slice(0, 8)}`;
    const productCategory = form.category || catalogOptions.categories.find((category) => category.active)?.key || 'tops';
    const productCategoryOption = catalogOptions.categories.find((category) => category.key === productCategory);
    const normalizedVariants = (productCategoryOption?.requiresSize ? variants.filter((variant) => variant.size.trim()) : []).map((variant) => ({
      ...variant,
      size: variant.size.trim().toUpperCase(),
      sku: variant.sku.trim() || `${normalizedSlug}-${variant.size.trim().toLowerCase()}`,
    }));
    const localSkus = normalizedVariants.map((variant) => variant.sku.toLowerCase());
    if (new Set(localSkus).size !== localSkus.length) {
      setSaving(false);
      setError('Each size must have a different SKU.');
      return;
    }
    try {
      const duplicates = await BackendService.findDuplicateSkus(normalizedVariants.map((variant) => variant.sku), product?.id);
      if (duplicates.length) {
        setSaving(false);
        setError(`SKU already exists: ${duplicates.join(', ')}. Use a unique SKU.`);
        return;
      }
    } catch (validationError) {
      console.error('SKU validation failed:', validationError);
      setSaving(false);
      setError('Could not check SKU availability. Verify admin access to product_variants, then retry.');
      return;
    }
    const payload = {
      ...form,
      title: productTitle,
      slug: normalizedSlug,
      price: Number(form.price) || 0,
      description: form.description.trim(),
      fabricDetails: form.fabricDetails.trim(),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      category: productCategory,
      homepageSlot: form.homepageSlot || 'none',
    };
    const saved = await BackendService.saveProduct(payload, images, normalizedVariants, product?.id, mobileImages);
    setSaving(false);
    if (!saved) {
      setError('Could not save product. SKU must be unique; also verify Supabase product, image and variant policies.');
      return;
    }
    onSaved();
  };

  return (
    <form onSubmit={submit} className="mb-6 grid gap-4 rounded-2xl border border-black/10 bg-[#F5F5F7] p-5 md:grid-cols-2">
      <h3 className="text-lg font-bold md:col-span-2">{product ? 'Edit Product' : 'Add Product'}</h3>
      <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Product title (optional)" className="rounded-xl bg-white p-3 text-sm" />
      <input value={form.slug} onChange={(e) => update('slug', e.target.value)} placeholder="Slug (generated if blank)" className="rounded-xl bg-white p-3 text-sm" />
      <input type="number" min="0" value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="Price (defaults to 0)" className="rounded-xl bg-white p-3 text-sm" />
      <input type="number" min="0" value={form.compareAtPrice} onChange={(e) => update('compareAtPrice', e.target.value)} placeholder="Sale compare price (optional)" className="rounded-xl bg-white p-3 text-sm" />
      <input value={form.fabricDetails} onChange={(e) => update('fabricDetails', e.target.value)} placeholder="Fabric details" className="rounded-xl bg-white p-3 text-sm" />
      <select value={form.category} onChange={(e) => update('category', e.target.value)} className="rounded-xl bg-white p-3 text-sm">
        <option value="">Default category</option>
        {catalogOptions.categories.filter((category) => category.active).map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
      </select>
      <select value={form.homepageSlot} onChange={(e) => update('homepageSlot', e.target.value)} className="rounded-xl bg-white p-3 text-sm">
        {catalogOptions.placements.filter((placement) => placement.active).map((placement) => <option key={placement.key} value={placement.key}>{placement.label}</option>)}
      </select>
      <input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="Tags: sale, new-arrival, bestseller" className="rounded-xl bg-white p-3 text-sm md:col-span-2" />
      <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Description (optional)" className="min-h-24 rounded-xl bg-white p-3 text-sm md:col-span-2" />
      <label className="grid gap-2 text-xs font-semibold text-gray-600 md:col-span-2">Desktop / laptop product images (select multiple; you can add more than once)
        <input type="file" accept="image/*" multiple onChange={(event) => {
          const selectedFiles = Array.from(event.currentTarget.files || []);
          if (selectedFiles.length) setImages((current) => [...current, ...selectedFiles]);
          event.currentTarget.value = '';
        }} className="rounded-xl bg-white p-3 text-sm font-normal" />
        {images.length > 0 && <div className="grid gap-2 sm:grid-cols-2">
          {images.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
            <span className="truncate text-xs font-normal text-gray-700">{index + 1}. {file.name}</span>
            <button type="button" onClick={() => setImages((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="shrink-0 text-xs text-red-600">Remove</button>
          </div>)}
        </div>}
      </label>
      <label className="grid gap-2 text-xs font-semibold text-gray-600 md:col-span-2">Mobile product images (match desktop image order; optional, multiple allowed)
        <input type="file" accept="image/*" multiple onChange={(event) => {
          const selectedFiles = Array.from(event.currentTarget.files || []);
          if (selectedFiles.length) setMobileImages((current) => [...current, ...selectedFiles]);
          event.currentTarget.value = '';
        }} className="rounded-xl bg-white p-3 text-sm font-normal" />
        {mobileImages.length > 0 && <div className="grid gap-2 sm:grid-cols-2">
          {mobileImages.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
            <span className="truncate text-xs font-normal text-gray-700">{index + 1}. {file.name}</span>
            <button type="button" onClick={() => setMobileImages((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="shrink-0 text-xs text-red-600">Remove</button>
          </div>)}
        </div>}
      </label>
      {selectedCategory?.requiresSize && <div className="grid gap-2 md:col-span-2">
        <p className="text-sm font-semibold">Sizes, stock and SKU</p>
        {variants.map((variant, index) => <div key={variant.size} className="grid grid-cols-3 gap-2"><input value={variant.size} onChange={(e) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, size: e.target.value } : item))} placeholder="Size" className="rounded-xl bg-white p-3 text-sm" /><input type="number" min="0" value={variant.stockCount} onChange={(e) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stockCount: Number(e.target.value) } : item))} placeholder="Stock" className="rounded-xl bg-white p-3 text-sm" /><input value={variant.sku} onChange={(e) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sku: e.target.value } : item))} placeholder="SKU" className="rounded-xl bg-white p-3 text-sm" /></div>)}
      </div>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={(e) => update('isPublished', e.target.checked)} /> Published</label>
      {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
      <div className="flex gap-2 md:col-span-2"><button disabled={saving} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Product'}</button><button type="button" onClick={onCancel} className="rounded-full border border-black/10 px-5 py-3 text-sm">Cancel</button></div>
    </form>
  );
}
