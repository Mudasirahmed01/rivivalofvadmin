import { useEffect, useState } from 'react';
import BackendService from '../lib/backend';

type ContentMode = 'banners' | 'categories' | 'catalog' | 'settings';

const emptyBanner = { pre_title: '', headline: '', subheadline: '', cta: 'SHOP NOW', image_url: '', display_order: 0, is_active: true };
const emptyCategory = { title: '', subtitle: '', image_url: '', page: 'shirts', display_order: 0, is_active: true };

const formatSaveError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const databaseError = error as { message?: string; details?: string; hint?: string; code?: string };
    return [databaseError.message, databaseError.details, databaseError.hint, databaseError.code && `Code: ${databaseError.code}`]
      .filter(Boolean)
      .join(' ');
  }
  return String(error);
};

export default function AdminContentManager() {
  const [mode, setMode] = useState<ContentMode>('banners');
  const [items, setItems] = useState<any[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [form, setForm] = useState<any>(emptyBanner);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [image, setImage] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({ free_shipping_threshold: '', delivery_charge: '', tax_rate: '', marquee_items: '', brand_statement: '' });
  const [catalogOptions, setCatalogOptions] = useState<{ categories: Array<{ key: string; label: string; requiresSize: boolean; active: boolean }>; placements: Array<{ key: string; label: string; active: boolean }> }>({ categories: [], placements: [] });
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryRequiresSize, setNewCategoryRequiresSize] = useState(false);
  const [newPlacementLabel, setNewPlacementLabel] = useState('');
  const [visibility, setVisibility] = useState({ disabledCategories: [] as string[], disabledSections: [] as string[], disabledPages: [] as string[] });

  const load = async () => {
    if (mode === 'catalog') {
      const [storeSettings, products] = await Promise.all([BackendService.getStoreSettings(), BackendService.getProducts()]);
      const options = storeSettings.catalog_options || { categories: [], placements: [] };
      const missingCategories = [...new Set(products.map((product) => product.category))]
        .filter((key) => !options.categories.some((category: any) => category.key === key))
        .map((key) => ({ key, label: key.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), requiresSize: products.some((product) => product.category === key && product.variants.length > 0), active: true }));
      setCatalogOptions({ ...options, categories: [...options.categories, ...missingCategories] });
      return;
    }
    if (mode === 'settings') {
      const [storeSettings, products] = await Promise.all([BackendService.getStoreSettings(), BackendService.getProducts()]);
      setProductCategories([...new Set(products.map((product) => product.category))].sort());
      const storefrontVisibility = storeSettings.storefront_visibility || {};
      setSettings({
        free_shipping_threshold: String(storeSettings.checkout?.free_shipping_threshold || ''),
        delivery_charge: String(storeSettings.checkout?.delivery_charge || ''),
        tax_rate: String(storeSettings.checkout?.tax_rate || ''),
        marquee_items: (storeSettings.marquee?.items || []).join('\n'),
        brand_statement: String(storeSettings.brand_statement?.text || 'We do not design apparel for a single season. Revival of V builds architectural silhouettes designed to endure time, movement, and perception.'),
      });
      setVisibility({
        disabledCategories: Array.isArray(storefrontVisibility.disabled_categories) ? storefrontVisibility.disabled_categories : [],
        disabledSections: Array.isArray(storefrontVisibility.disabled_sections) ? storefrontVisibility.disabled_sections : [],
        disabledPages: Array.isArray(storefrontVisibility.disabled_pages) ? storefrontVisibility.disabled_pages : [],
      });
      return;
    }
    if (mode === 'banners') {
      setItems(await BackendService.getHomepageBanners());
    } else {
      const [categories, products] = await Promise.all([BackendService.getHomepageCategories(), BackendService.getProducts()]);
      setItems(categories);
      setProductCategories([...new Set(products.map((product) => product.category).filter((category) => !['tops', 'bottoms'].includes(category)))].sort());
    }
  };
  useEffect(() => { load(); }, [mode]);

  const startEdit = (item: any) => { setEditingId(item.id); setForm({ ...item }); setImage(undefined); setMessage(''); };
  const startNew = () => { setEditingId(undefined); setForm(mode === 'banners' ? { ...emptyBanner } : { ...emptyCategory }); setImage(undefined); setMessage(''); };
  const update = (field: string, value: unknown) => setForm((current: any) => ({ ...current, [field]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'catalog') {
      const saved = await BackendService.saveStoreSetting('catalog_options', catalogOptions);
      setMessage(saved ? 'Catalog options saved.' : 'Could not save catalog options. Check admin access to store_settings.');
      return;
    }
    if (mode === 'settings') {
      const saved = await Promise.all([
        BackendService.saveStoreSetting('checkout', {
          free_shipping_threshold: Number(settings.free_shipping_threshold),
          delivery_charge: Number(settings.delivery_charge),
          tax_rate: Number(settings.tax_rate),
        }),
        BackendService.saveStoreSetting('marquee', { items: settings.marquee_items.split('\n').map((item) => item.trim()).filter(Boolean) }),
        BackendService.saveStoreSetting('brand_statement', { text: settings.brand_statement.trim() }),
        BackendService.saveStoreSetting('storefront_visibility', {
          disabled_categories: visibility.disabledCategories,
          disabled_sections: visibility.disabledSections,
          disabled_pages: visibility.disabledPages,
        }),
      ]);
      setMessage(saved.every(Boolean) ? 'Store settings saved.' : 'Settings save failed.');
      return;
    }
    if (!editingId && !image) {
      setMessage('Please select an image before creating new content.');
      return;
    }
    setSaving(true);
    let saved;
    try {
      saved = mode === 'banners'
        ? await BackendService.saveHomepageBanner(form, image, editingId)
        : await BackendService.saveHomepageCategory(form, image, editingId);
    } catch (error) {
      const detail = formatSaveError(error);
      setMessage(`Save failed: ${detail}`);
      setSaving(false);
      return;
    }
    setSaving(false);
    if (!saved) { setMessage('Save failed. Check Supabase RLS and Cloudinary configuration.'); return; }
    setMessage('Saved successfully.');
    startNew();
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this content?')) return;
    if (mode === 'banners') await BackendService.deleteHomepageBanner(id);
    else await BackendService.deleteHomepageCategory(id);
    await load();
  };

  const addCategory = () => {
    const label = newCategoryLabel.trim();
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!key || catalogOptions.categories.some((category) => category.key === key)) return;
    setCatalogOptions((current) => ({ ...current, categories: [...current.categories, { key, label, requiresSize: newCategoryRequiresSize, active: true }] }));
    setNewCategoryLabel('');
    setNewCategoryRequiresSize(false);
  };

  const addPlacement = () => {
    const label = newPlacementLabel.trim();
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!key || catalogOptions.placements.some((placement) => placement.key === key)) return;
    setCatalogOptions((current) => ({ ...current, placements: [...current.placements, { key, label, active: true }] }));
    setNewPlacementLabel('');
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setMode('banners')} className={`rounded-full px-4 py-2 text-sm ${mode === 'banners' ? 'bg-black text-white' : 'bg-white'}`}>Hero Banners</button>
      <button onClick={() => setMode('categories')} className={`rounded-full px-4 py-2 text-sm ${mode === 'categories' ? 'bg-black text-white' : 'bg-white'}`}>Homepage Categories</button>
      <button onClick={() => setMode('catalog')} className={`rounded-full px-4 py-2 text-sm ${mode === 'catalog' ? 'bg-black text-white' : 'bg-white'}`}>Catalog Options</button>
      <button onClick={() => setMode('settings')} className={`rounded-full px-4 py-2 text-sm ${mode === 'settings' ? 'bg-black text-white' : 'bg-white'}`}>Store Settings</button>
      <button onClick={startNew} className="rounded-full bg-white px-4 py-2 text-sm">+ Add</button>
    </div>

    {mode === 'catalog' ? <form onSubmit={save} className="grid gap-5 rounded-2xl border border-black/10 bg-white p-5">
      <section className="space-y-3">
        <h3 className="text-sm font-bold">Product categories</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input value={newCategoryLabel} onChange={(event) => setNewCategoryLabel(event.target.value)} placeholder="New category, e.g. Perfume" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newCategoryRequiresSize} onChange={(event) => setNewCategoryRequiresSize(event.target.checked)} /> Requires size</label>
          <button type="button" onClick={addCategory} className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">Add category</button>
        </div>
        {catalogOptions.categories.map((category, index) => <div key={category.key} className="grid items-center gap-2 border-t border-black/5 pt-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input value={category.label} onChange={(event) => setCatalogOptions((current) => ({ ...current, categories: current.categories.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm" />
          <code className="text-xs text-gray-500">{category.key}</code>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={category.requiresSize} onChange={(event) => setCatalogOptions((current) => ({ ...current, categories: current.categories.map((item, itemIndex) => itemIndex === index ? { ...item, requiresSize: event.target.checked } : item) }))} /> Size required</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={category.active} onChange={(event) => setCatalogOptions((current) => ({ ...current, categories: current.categories.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item) }))} /> Active</label>
        </div>)}
      </section>
      <section className="space-y-3 border-t border-black/10 pt-4">
        <h3 className="text-sm font-bold">Homepage placements</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input value={newPlacementLabel} onChange={(event) => setNewPlacementLabel(event.target.value)} placeholder="New placement, e.g. Summer Edit" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
          <button type="button" onClick={addPlacement} className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">Add placement</button>
        </div>
        {catalogOptions.placements.map((placement, index) => <div key={placement.key} className="grid items-center gap-2 border-t border-black/5 pt-2 sm:grid-cols-[1fr_auto_auto]">
          <input value={placement.label} onChange={(event) => setCatalogOptions((current) => ({ ...current, placements: current.placements.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm" />
          <code className="text-xs text-gray-500">{placement.key}</code>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={placement.active} onChange={(event) => setCatalogOptions((current) => ({ ...current, placements: current.placements.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item) }))} /> Active</label>
        </div>)}
      </section>
      <button disabled={saving} className="w-fit rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">Save Catalog Options</button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form> : mode === 'settings' ? <form onSubmit={save} className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-2">
      <input required type="number" min="0" value={settings.free_shipping_threshold} onChange={(e) => setSettings((current) => ({ ...current, free_shipping_threshold: e.target.value }))} placeholder="Free shipping threshold (PKR)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <input required type="number" min="0" value={settings.delivery_charge} onChange={(e) => setSettings((current) => ({ ...current, delivery_charge: e.target.value }))} placeholder="Delivery charge (PKR)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <input required type="number" min="0" max="100" step="0.1" value={settings.tax_rate} onChange={(e) => setSettings((current) => ({ ...current, tax_rate: e.target.value }))} placeholder="Tax rate (%)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <textarea required value={settings.marquee_items} onChange={(e) => setSettings((current) => ({ ...current, marquee_items: e.target.value }))} placeholder="Marquee item per line" className="min-h-28 rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      <textarea required value={settings.brand_statement} onChange={(e) => setSettings((current) => ({ ...current, brand_statement: e.target.value }))} placeholder="Homepage brand statement" className="min-h-36 rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      <fieldset className="grid gap-3 border-t border-black/10 pt-4 md:col-span-2">
        <legend className="px-1 text-sm font-semibold">Storefront visibility</legend>
        <p className="text-xs text-gray-500">Turn sections off without deleting products or content. You can enable them again anytime.</p>
        <p className="text-xs font-semibold text-gray-600">Product categories</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[...new Set(['tops', 'bottoms', ...productCategories])].map((category) => (
            <label key={category} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={visibility.disabledCategories.includes(category)} onChange={(event) => setVisibility((current) => ({ ...current, disabledCategories: event.target.checked ? [...current.disabledCategories, category] : current.disabledCategories.filter((item) => item !== category) }))} /> Hide {category === 'tops' ? 'Shirts' : category === 'bottoms' ? 'Pants' : category.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</label>
          ))}
        </div>
        <p className="border-t border-black/10 pt-3 text-xs font-semibold text-gray-600">Homepage elements</p>
        <div className="grid gap-3 border-t border-black/10 pt-3 sm:grid-cols-2">
          {[
            ['hero', 'Hero banner'],
            ['header', 'Header / hamburger menu'],
            ['search', 'Search controls'],
            ['toast-container', 'Toast notifications'],
            ['marquee', 'Announcement marquee'],
            ['features', 'Store feature strip'],
            ['brand-statement', 'Brand statement'],
            ['new-releases', 'Latest Drops / New Releases'],
            ['best-sellers', 'Best Sellers'],
            ['complete-collection', 'Complete Collection'],
            ['shop-by-category', 'Shop by Category'],
            ['recently-viewed', 'Recently Viewed'],
            ['footer', 'Footer'],
            ['cart-drawer', 'Cart drawer'],
            ['back-to-top', 'Back to top button'],
            ['cookie-consent', 'Cookie consent notice'],
            ['social-proof', 'Social proof popup'],
            ['live-chat', 'Live chat button'],
            ['theme-toggle', 'Theme toggle'],
          ].map(([section, label]) => (
            <label key={section} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={visibility.disabledSections.includes(section)} onChange={(event) => setVisibility((current) => ({ ...current, disabledSections: event.target.checked ? [...current.disabledSections, section] : current.disabledSections.filter((item) => item !== section) }))} /> Hide {label}</label>
          ))}
        </div>
        <p className="border-t border-black/10 pt-3 text-xs font-semibold text-gray-600">Website pages</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['home', 'Home page'],
            ['all-products', 'All Products'],
            ['product-detail', 'Product detail pages'],
            ['new-releases', 'New Releases page'],
            ['best-sellers', 'Best Sellers page'],
            ['shirts', 'Shirts page'],
            ['pants', 'Pants page'],
            ['account', 'Account page'],
            ['auth', 'Sign in / Sign up page'],
            ['checkout', 'Checkout page'],
            ['wishlist', 'Wishlist page'],
            ['shipping', 'Shipping & Returns page'],
            ['terms', 'Terms page'],
            ['privacy', 'Privacy page'],
            ['contact', 'Contact page'],
          ].map(([page, label]) => (
            <label key={page} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={visibility.disabledPages.includes(page)} onChange={(event) => setVisibility((current) => ({ ...current, disabledPages: event.target.checked ? [...current.disabledPages, page] : current.disabledPages.filter((item) => item !== page) }))} /> Hide {label}</label>
          ))}
        </div>
      </fieldset>
      <button disabled={saving} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white md:col-span-2">{saving ? 'Saving...' : 'Save Store Settings'}</button>
      {message && <p className="text-sm text-gray-600 md:col-span-2">{message}</p>}
    </form> : <form onSubmit={save} className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-2">
      {mode === 'banners' ? <>
        <input required value={form.pre_title || ''} onChange={(e) => update('pre_title', e.target.value)} placeholder="Pre-title" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <input required value={form.cta || ''} onChange={(e) => update('cta', e.target.value)} placeholder="Button text" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <input required value={form.headline || ''} onChange={(e) => update('headline', e.target.value)} placeholder="Headline" className="rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
        <textarea required value={form.subheadline || ''} onChange={(e) => update('subheadline', e.target.value)} placeholder="Subheadline" className="rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      </> : <>
        <input required value={form.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="Category title" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <select value={form.page || 'shirts'} onChange={(e) => update('page', e.target.value)} className="rounded-xl bg-[#F5F5F7] p-3 text-sm"><option value="shirts">Shirts</option><option value="pants">Pants</option><option value="new-releases">New Releases</option>{productCategories.some((category) => category.startsWith('perfume')) && <option value="category:perfumes">All Perfumes</option>}{productCategories.length > 0 && <optgroup label="Product categories">{productCategories.map((category) => <option key={category} value={`category:${category}`}>{category.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</optgroup>}</select>
        <input required value={form.subtitle || ''} onChange={(e) => update('subtitle', e.target.value)} placeholder="Category subtitle" className="rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      </>}
      <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0])} className="rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      <input type="number" value={form.display_order || 0} onChange={(e) => update('display_order', Number(e.target.value))} placeholder="Display order" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => update('is_active', e.target.checked)} /> Active</label>
      <div className="flex gap-2 md:col-span-2"><button disabled={saving} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">{saving ? 'Uploading...' : editingId ? 'Update' : 'Create'}</button>{editingId && <button type="button" onClick={startNew} className="rounded-full border border-black/10 px-5 py-3 text-sm">Cancel</button>}</div>
      {message && <p className="text-sm text-gray-600 md:col-span-2">{message}</p>}
    </form>}

    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-black/5 bg-white p-3">
        <img src={item.image_url} alt={item.title || item.headline} className="h-16 w-16 rounded-lg object-cover" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title || item.headline}</p><p className="truncate text-xs text-gray-500">{item.subtitle || item.subheadline}</p></div>
        <button onClick={() => startEdit(item)} className="text-xs font-semibold">Edit</button><button onClick={() => remove(item.id)} className="text-xs text-red-600">Delete</button>
      </div>)}
    </div>
  </div>;
}
