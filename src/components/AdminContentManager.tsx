import { useEffect, useState } from 'react';
import BackendService from '../lib/backend';

type ContentMode = 'banners' | 'categories' | 'settings';

const emptyBanner = { pre_title: '', headline: '', subheadline: '', cta: 'SHOP NOW', image_url: '', display_order: 0, is_active: true };
const emptyCategory = { title: '', subtitle: '', image_url: '', page: 'shirts', display_order: 0, is_active: true };

export default function AdminContentManager() {
  const [mode, setMode] = useState<ContentMode>('banners');
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyBanner);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [image, setImage] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({ free_shipping_threshold: '', delivery_charge: '', tax_rate: '', marquee_items: '', brand_statement: '' });

  const load = async () => {
    if (mode === 'settings') {
      const storeSettings = await BackendService.getStoreSettings();
      setSettings({
        free_shipping_threshold: String(storeSettings.checkout?.free_shipping_threshold || ''),
        delivery_charge: String(storeSettings.checkout?.delivery_charge || ''),
        tax_rate: String(storeSettings.checkout?.tax_rate || ''),
        marquee_items: (storeSettings.marquee?.items || []).join('\n'),
        brand_statement: String(storeSettings.brand_statement?.text || 'We do not design apparel for a single season. Revival of V builds architectural silhouettes designed to endure time, movement, and perception.'),
      });
      return;
    }
    setItems(mode === 'banners' ? await BackendService.getHomepageBanners() : await BackendService.getHomepageCategories());
  };
  useEffect(() => { load(); }, [mode]);

  const startEdit = (item: any) => { setEditingId(item.id); setForm({ ...item }); setImage(undefined); setMessage(''); };
  const startNew = () => { setEditingId(undefined); setForm(mode === 'banners' ? { ...emptyBanner } : { ...emptyCategory }); setImage(undefined); setMessage(''); };
  const update = (field: string, value: unknown) => setForm((current: any) => ({ ...current, [field]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'settings') {
      const saved = await Promise.all([
        BackendService.saveStoreSetting('checkout', {
          free_shipping_threshold: Number(settings.free_shipping_threshold),
          delivery_charge: Number(settings.delivery_charge),
          tax_rate: Number(settings.tax_rate),
        }),
        BackendService.saveStoreSetting('marquee', { items: settings.marquee_items.split('\n').map((item) => item.trim()).filter(Boolean) }),
        BackendService.saveStoreSetting('brand_statement', { text: settings.brand_statement.trim() }),
      ]);
      setMessage(saved.every(Boolean) ? 'Store settings saved.' : 'Settings save failed.');
      return;
    }
    if (!editingId && !image) {
      setMessage('Please select an image before creating new content.');
      return;
    }
    setSaving(true);
    const saved = mode === 'banners'
      ? await BackendService.saveHomepageBanner(form, image, editingId)
      : await BackendService.saveHomepageCategory(form, image, editingId);
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

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setMode('banners')} className={`rounded-full px-4 py-2 text-sm ${mode === 'banners' ? 'bg-black text-white' : 'bg-white'}`}>Hero Banners</button>
      <button onClick={() => setMode('categories')} className={`rounded-full px-4 py-2 text-sm ${mode === 'categories' ? 'bg-black text-white' : 'bg-white'}`}>Homepage Categories</button>
      <button onClick={() => setMode('settings')} className={`rounded-full px-4 py-2 text-sm ${mode === 'settings' ? 'bg-black text-white' : 'bg-white'}`}>Store Settings</button>
      <button onClick={startNew} className="rounded-full bg-white px-4 py-2 text-sm">+ Add</button>
    </div>

    {mode === 'settings' ? <form onSubmit={save} className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-2">
      <input required type="number" min="0" value={settings.free_shipping_threshold} onChange={(e) => setSettings((current) => ({ ...current, free_shipping_threshold: e.target.value }))} placeholder="Free shipping threshold (PKR)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <input required type="number" min="0" value={settings.delivery_charge} onChange={(e) => setSettings((current) => ({ ...current, delivery_charge: e.target.value }))} placeholder="Delivery charge (PKR)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <input required type="number" min="0" max="100" step="0.1" value={settings.tax_rate} onChange={(e) => setSettings((current) => ({ ...current, tax_rate: e.target.value }))} placeholder="Tax rate (%)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <textarea required value={settings.marquee_items} onChange={(e) => setSettings((current) => ({ ...current, marquee_items: e.target.value }))} placeholder="Marquee item per line" className="min-h-28 rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      <textarea required value={settings.brand_statement} onChange={(e) => setSettings((current) => ({ ...current, brand_statement: e.target.value }))} placeholder="Homepage brand statement" className="min-h-36 rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
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
        <select value={form.page || 'shirts'} onChange={(e) => update('page', e.target.value)} className="rounded-xl bg-[#F5F5F7] p-3 text-sm"><option value="shirts">Shirts</option><option value="pants">Pants</option><option value="new-releases">New Releases</option></select>
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
