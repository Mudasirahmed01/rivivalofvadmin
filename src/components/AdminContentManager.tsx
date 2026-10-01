import { useEffect, useState } from 'react';
import BackendService from '../lib/backend';

type ContentMode = 'banners' | 'categories' | 'catalog' | 'settings';
type MenuEntry = { id: string; label: string; destination: string; type: 'link' | 'dropdown'; active: boolean; children: MenuEntry[] };

const pageDestinations = [
  ['home', 'Home'], ['all-products', 'All Products'], ['new-releases', 'New Releases'],
  ['best-sellers', 'Best Sellers'], ['shirts', 'Shirts'], ['pants', 'Pants'], ['perfumes', 'Perfumes'],
  ['account', 'Account'], ['auth', 'Sign in'], ['checkout', 'Checkout'],
  ['wishlist', 'Wishlist'], ['shipping', 'Shipping & Returns'], ['terms', 'Terms'],
  ['privacy', 'Privacy'], ['contact', 'Contact'],
];

const defaultMenu = (categories: Array<{ key: string; label: string }>): MenuEntry[] => [
  { id: 'nav-home', label: 'HOME', destination: 'home', type: 'link', active: true, children: [] },
  { id: 'nav-new-releases', label: 'NEW RELEASES', destination: 'new-releases', type: 'link', active: true, children: [] },
  { id: 'nav-best-sellers', label: 'BEST SELLERS', destination: 'best-sellers', type: 'link', active: true, children: [] },
  { id: 'nav-categories', label: 'CATEGORIES', destination: '', type: 'dropdown', active: true, children: categories.map((category) => ({ id: `category-${category.key}`, label: category.label.toUpperCase(), destination: `category:${category.key}`, type: 'link', active: true, children: [] })) },
];

const emptyBanner = { pre_title: '', headline: '', subheadline: '', cta: 'SHOP NOW', image_url: '', display_order: 0, is_active: true };
const emptyCategory = { title: '', subtitle: '', image_url: '', page: 'shirts', display_order: 0, is_active: true };
const defaultFooterLinks = {
  brand: [{ label: 'Our Story', destination: 'home', active: true }],
  shop: [{ label: 'All Products', destination: 'all-products', active: true }, { label: 'New Releases', destination: 'new-releases', active: true }, { label: 'Best Sellers', destination: 'best-sellers', active: true }, { label: 'Shirts', destination: 'shirts', active: true }, { label: 'Pants', destination: 'pants', active: true }],
  support: [{ label: 'Shipping & Returns', destination: 'shipping', active: true }, { label: 'Contact Us', destination: 'contact', active: true }],
  legal: [{ label: 'Privacy Policy', destination: 'privacy', active: true }, { label: 'Terms of Service', destination: 'terms', active: true }],
};

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
  const [productCategories, setProductCategories] = useState<Array<{ key: string; label: string; active: boolean }>>([]);
  const [visibilityCategoryKeys, setVisibilityCategoryKeys] = useState<string[]>([]);
  const [form, setForm] = useState<any>(emptyBanner);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [image, setImage] = useState<File>();
  const [mobileImage, setMobileImage] = useState<File>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({ free_shipping_threshold: '', delivery_charge: '', tax_rate: '', marquee_items: '', brand_statement: '', login_title: 'Welcome Back', login_tagline: 'Sign in to your account', signup_title: 'Create Account', signup_tagline: 'Join REVIVAL OF V' });
  const [footerLinks, setFooterLinks] = useState(defaultFooterLinks);
  const [footerNewsletterText, setFooterNewsletterText] = useState('Get product news and special offers by email.');
  const [catalogOptions, setCatalogOptions] = useState<{ categories: Array<{ key: string; label: string; requiresSize: boolean; active: boolean; showOnPerfumesPage?: boolean }>; placements: Array<{ key: string; label: string; active: boolean }> }>({ categories: [], placements: [] });
  const [navigationItems, setNavigationItems] = useState<MenuEntry[]>([]);
  const [newNavigationLabel, setNewNavigationLabel] = useState('');
  const [newNavigationDestination, setNewNavigationDestination] = useState('home');
  const [newNavigationType, setNewNavigationType] = useState<'link' | 'dropdown'>('link');
  const [newChildLabels, setNewChildLabels] = useState<Record<string, string>>({});
  const [newChildDestinations, setNewChildDestinations] = useState<Record<string, string>>({});
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
      const categories = [...options.categories, ...missingCategories];
      setCatalogOptions({ ...options, categories, placements: Array.isArray(options.placements) ? options.placements : [] });
      setNavigationItems(storeSettings.storefront_navigation?.items || defaultMenu(categories.filter((category: any) => category.active)));
      return;
    }
    if (mode === 'settings') {
      const [storeSettings, products] = await Promise.all([BackendService.getStoreSettings(), BackendService.getProducts()]);
      setVisibilityCategoryKeys([...new Set(products.map((product) => product.category))].sort());
      const savedCatalogOptions = storeSettings.catalog_options || { categories: [], placements: [] };
      const missingCatalogCategories = [...new Set(products.map((product) => product.category))]
        .filter((key) => !savedCatalogOptions.categories.some((category: any) => category.key === key))
        .map((key) => ({ key, label: key.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), requiresSize: products.some((product) => product.category === key && product.variants.length > 0), active: true }));
      setCatalogOptions({ ...savedCatalogOptions, categories: [...savedCatalogOptions.categories, ...missingCatalogCategories] });
      const storefrontVisibility = storeSettings.storefront_visibility || {};
      setSettings({
        free_shipping_threshold: String(storeSettings.checkout?.free_shipping_threshold || ''),
        delivery_charge: String(storeSettings.checkout?.delivery_charge || ''),
        tax_rate: String(storeSettings.checkout?.tax_rate || ''),
        marquee_items: (storeSettings.marquee?.items || []).join('\n'),
        brand_statement: String(storeSettings.brand_statement?.text || 'We do not design apparel for a single season. Revival of V builds architectural silhouettes designed to endure time, movement, and perception.'),
        login_title: String(storeSettings.auth_copy?.login_title || 'Welcome Back'),
        login_tagline: String(storeSettings.auth_copy?.login_tagline || 'Sign in to your account'),
        signup_title: String(storeSettings.auth_copy?.signup_title || 'Create Account'),
        signup_tagline: String(storeSettings.auth_copy?.signup_tagline || 'Join REVIVAL OF V'),
      });
      setFooterLinks(storeSettings.footer_links || defaultFooterLinks);
      setFooterNewsletterText(String(storeSettings.footer_newsletter?.text || 'Get product news and special offers by email.'));
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
      const [categories, products, storeSettings] = await Promise.all([BackendService.getHomepageCategories(), BackendService.getProducts(), BackendService.getStoreSettings()]);
      setItems(categories);
      const savedCategories = storeSettings.catalog_options?.categories || [];
      const existingKeys = new Set(savedCategories.map((category: { key: string }) => category.key));
      const legacyCategories = [...new Set(products.map((product) => product.category))]
        .filter((key) => !existingKeys.has(key))
        .map((key) => ({ key, label: key.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), active: true }));
      setProductCategories([...savedCategories, ...legacyCategories]);
    }
  };
  useEffect(() => { load(); }, [mode]);

  const startEdit = (item: any) => { setEditingId(item.id); setForm({ ...item }); setImage(undefined); setMobileImage(undefined); setMessage(''); };
  const startNew = () => { setEditingId(undefined); setForm(mode === 'banners' ? { ...emptyBanner } : { ...emptyCategory }); setImage(undefined); setMobileImage(undefined); setMessage(''); };
  const update = (field: string, value: unknown) => setForm((current: any) => ({ ...current, [field]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'catalog') {
      const saved = await Promise.all([
        BackendService.saveStoreSetting('catalog_options', catalogOptions),
        BackendService.saveStoreSetting('storefront_navigation', { items: navigationItems }),
      ]);
      setMessage(saved.every(Boolean) ? 'Catalog options and menu saved.' : 'Could not save catalog/menu settings. Check admin access to store_settings.');
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
        BackendService.saveStoreSetting('auth_copy', {
          login_title: settings.login_title.trim(),
          login_tagline: settings.login_tagline.trim(),
          signup_title: settings.signup_title.trim(),
          signup_tagline: settings.signup_tagline.trim(),
        }),
        BackendService.saveStoreSetting('footer_links', footerLinks),
        BackendService.saveStoreSetting('footer_newsletter', { text: footerNewsletterText.trim() }),
        BackendService.saveStoreSetting('storefront_visibility', {
          disabled_categories: visibility.disabledCategories,
          disabled_sections: visibility.disabledSections,
          disabled_pages: visibility.disabledPages,
        }),
      ]);
      setMessage(saved.every(Boolean) ? 'Store settings saved.' : 'Settings save failed.');
      return;
    }
    setSaving(true);
    const saveForm = editingId || image || mobileImage ? form : { ...form, is_active: false };
    let saved;
    try {
      saved = mode === 'banners'
        ? await BackendService.saveHomepageBanner(saveForm, image, editingId, mobileImage)
        : await BackendService.saveHomepageCategory(saveForm, image, editingId);
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

  const navigationDestinations = [
    ...pageDestinations.map(([key, label]) => ({ value: key, label })),
    ...catalogOptions.categories.filter((category) => category.active).map((category) => ({ value: `category:${category.key}`, label: `Category page — ${category.label}` })),
  ];

  const addNavigationItem = () => {
    const label = newNavigationLabel.trim();
    if (!label) return;
    const item: MenuEntry = {
      id: crypto.randomUUID(), label, destination: newNavigationType === 'link' ? newNavigationDestination : '',
      type: newNavigationType, active: true, children: [],
    };
    setNavigationItems((current) => [...current, item]);
    setNewNavigationLabel('');
  };

  const addNavigationChild = (parentId: string) => {
    const label = (newChildLabels[parentId] || '').trim();
    if (!label) return;
    const destination = newChildDestinations[parentId] || navigationDestinations[0]?.value || 'home';
    const child: MenuEntry = { id: crypto.randomUUID(), label, destination, type: 'link', active: true, children: [] };
    setNavigationItems((current) => current.map((item) => item.id === parentId ? { ...item, children: [...item.children, child] } : item));
    setNewChildLabels((current) => ({ ...current, [parentId]: '' }));
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
          <input value={newCategoryLabel} onChange={(event) => setNewCategoryLabel(event.target.value)} placeholder="New category name" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newCategoryRequiresSize} onChange={(event) => setNewCategoryRequiresSize(event.target.checked)} /> Requires size</label>
          <button type="button" onClick={addCategory} className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">Add category</button>
        </div>
        {catalogOptions.categories.map((category, index) => <div key={category.key} className="grid items-center gap-2 border-t border-black/5 pt-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <input value={category.label} onChange={(event) => setCatalogOptions((current) => ({ ...current, categories: current.categories.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm" />
          <code className="text-xs text-gray-500">{category.key}</code>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={category.requiresSize} onChange={(event) => setCatalogOptions((current) => ({ ...current, categories: current.categories.map((item, itemIndex) => itemIndex === index ? { ...item, requiresSize: event.target.checked } : item) }))} /> Size required</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(category.showOnPerfumesPage)} onChange={(event) => setCatalogOptions((current) => ({ ...current, categories: current.categories.map((item, itemIndex) => itemIndex === index ? { ...item, showOnPerfumesPage: event.target.checked } : item) }))} /> Perfumes page</label>
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
      <section className="space-y-3 border-t border-black/10 pt-4">
        <h3 className="text-sm font-bold">Hamburger menu</h3>
        <p className="text-xs text-gray-500">For a category page link, first add and activate that category under Product categories above. It will then appear in the destination list.</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem_12rem_auto]">
          <input value={newNavigationLabel} onChange={(event) => setNewNavigationLabel(event.target.value)} placeholder="Menu label" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
          <select value={newNavigationType} onChange={(event) => setNewNavigationType(event.target.value as 'link' | 'dropdown')} className="rounded-xl bg-[#F5F5F7] p-3 text-sm"><option value="link">Link</option><option value="dropdown">Dropdown</option></select>
          {newNavigationType === 'link' && <select value={newNavigationDestination} onChange={(event) => setNewNavigationDestination(event.target.value)} className="rounded-xl bg-[#F5F5F7] p-3 text-sm">{navigationDestinations.map((destination) => <option key={destination.value} value={destination.value}>{destination.label}</option>)}</select>}
          <button type="button" onClick={addNavigationItem} className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">Add menu item</button>
        </div>
        {navigationItems.map((item, index) => <div key={item.id} className="space-y-2 border-t border-black/5 pt-3">
          <div className="grid items-center gap-2 sm:grid-cols-[1fr_10rem_12rem_auto_auto]">
            <input value={item.label} onChange={(event) => setNavigationItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, label: event.target.value } : entry))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm" />
            <select value={item.type} onChange={(event) => setNavigationItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, type: event.target.value as 'link' | 'dropdown', destination: event.target.value === 'dropdown' ? '' : (entry.destination || 'home') } : entry))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm"><option value="link">Link</option><option value="dropdown">Dropdown</option></select>
            {item.type === 'link' ? <select value={item.destination} onChange={(event) => setNavigationItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, destination: event.target.value } : entry))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm">{navigationDestinations.map((destination) => <option key={destination.value} value={destination.value}>{destination.label}</option>)}</select> : <span className="text-xs text-gray-500">Dropdown group</span>}
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.active} onChange={(event) => setNavigationItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, active: event.target.checked } : entry))} /> Active</label>
            <button type="button" onClick={() => setNavigationItems((current) => current.filter((entry) => entry.id !== item.id))} className="text-sm text-red-600">Remove</button>
          </div>
          {item.type === 'dropdown' && <div className="ml-4 space-y-2 border-l-2 border-black/10 pl-3">
            {item.children.map((child, childIndex) => <div key={child.id} className="grid items-center gap-2 sm:grid-cols-[1fr_12rem_auto_auto]">
              <input value={child.label} onChange={(event) => setNavigationItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, children: entry.children.map((nested, nestedIndex) => nestedIndex === childIndex ? { ...nested, label: event.target.value } : nested) } : entry))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm" />
              <select value={child.destination} onChange={(event) => setNavigationItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, children: entry.children.map((nested, nestedIndex) => nestedIndex === childIndex ? { ...nested, destination: event.target.value } : nested) } : entry))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm">{navigationDestinations.map((destination) => <option key={destination.value} value={destination.value}>{destination.label}</option>)}</select>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={child.active} onChange={(event) => setNavigationItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, children: entry.children.map((nested, nestedIndex) => nestedIndex === childIndex ? { ...nested, active: event.target.checked } : nested) } : entry))} /> Active</label>
              <button type="button" onClick={() => setNavigationItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, children: entry.children.filter((nested) => nested.id !== child.id) } : entry))} className="text-xs text-red-600">Remove</button>
            </div>)}
            <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
              <input value={newChildLabels[item.id] || ''} onChange={(event) => setNewChildLabels((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Dropdown link label" className="rounded-lg bg-[#F5F5F7] p-2 text-sm" />
              <select value={newChildDestinations[item.id] || navigationDestinations[0]?.value || 'home'} onChange={(event) => setNewChildDestinations((current) => ({ ...current, [item.id]: event.target.value }))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm">{navigationDestinations.map((destination) => <option key={destination.value} value={destination.value}>{destination.label}</option>)}</select>
              <button type="button" onClick={() => addNavigationChild(item.id)} className="rounded-full border border-black/10 px-3 py-2 text-sm">Add dropdown link</button>
            </div>
          </div>}
        </div>)}
      </section>
      <button disabled={saving} className="w-fit rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">Save Catalog Options</button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form> : mode === 'settings' ? <form onSubmit={save} className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-2">
      <input type="number" min="0" value={settings.free_shipping_threshold} onChange={(e) => setSettings((current) => ({ ...current, free_shipping_threshold: e.target.value }))} placeholder="Free shipping threshold (PKR)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <input type="number" min="0" value={settings.delivery_charge} onChange={(e) => setSettings((current) => ({ ...current, delivery_charge: e.target.value }))} placeholder="Delivery charge (PKR)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <input type="number" min="0" max="100" step="0.1" value={settings.tax_rate} onChange={(e) => setSettings((current) => ({ ...current, tax_rate: e.target.value }))} placeholder="Tax rate (%)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      <textarea value={settings.marquee_items} onChange={(e) => setSettings((current) => ({ ...current, marquee_items: e.target.value }))} placeholder="Marquee item per line (optional)" className="min-h-28 rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      <textarea value={settings.brand_statement} onChange={(e) => setSettings((current) => ({ ...current, brand_statement: e.target.value }))} placeholder="Homepage brand statement (optional)" className="min-h-36 rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      <div className="grid gap-3 border-t border-black/10 pt-4 md:col-span-2 md:grid-cols-2">
        <h3 className="text-sm font-bold md:col-span-2">Sign in and sign up copy</h3>
        <input required value={settings.login_title} onChange={(event) => setSettings((current) => ({ ...current, login_title: event.target.value }))} placeholder="Sign in heading" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <input required value={settings.login_tagline} onChange={(event) => setSettings((current) => ({ ...current, login_tagline: event.target.value }))} placeholder="Sign in tagline" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <input required value={settings.signup_title} onChange={(event) => setSettings((current) => ({ ...current, signup_title: event.target.value }))} placeholder="Sign up heading" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <input required value={settings.signup_tagline} onChange={(event) => setSettings((current) => ({ ...current, signup_tagline: event.target.value }))} placeholder="Sign up tagline" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
      </div>
      <div className="grid gap-3 border-t border-black/10 pt-4 md:col-span-2">
        <h3 className="text-sm font-bold">Footer newsletter</h3>
        <input value={footerNewsletterText} onChange={(event) => setFooterNewsletterText(event.target.value)} placeholder="Footer newsletter offer copy" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <h3 className="mt-3 text-sm font-bold">Footer links</h3>
        {Object.entries(footerLinks).map(([group, links]) => <section key={group} className="space-y-2 border-t border-black/5 pt-3">
          <h4 className="text-xs font-bold uppercase text-gray-500">{group}</h4>
          {links.map((link, index) => <div key={`${group}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_12rem_auto_auto]">
            <input value={link.label} onChange={(event) => setFooterLinks((current) => ({ ...current, [group]: current[group as keyof typeof current].map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm" />
            <select value={link.destination} onChange={(event) => setFooterLinks((current) => ({ ...current, [group]: current[group as keyof typeof current].map((item, itemIndex) => itemIndex === index ? { ...item, destination: event.target.value } : item) }))} className="rounded-lg bg-[#F5F5F7] p-2 text-sm">{pageDestinations.map(([value, label]) => <option key={value} value={value}>{label}</option>)}{catalogOptions.categories.map((category) => <option key={category.key} value={`category:${category.key}`}>{category.label}</option>)}</select>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={link.active} onChange={(event) => setFooterLinks((current) => ({ ...current, [group]: current[group as keyof typeof current].map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item) }))} /> Active</label>
            <button type="button" onClick={() => setFooterLinks((current) => ({ ...current, [group]: current[group as keyof typeof current].filter((_, itemIndex) => itemIndex !== index) }))} className="text-xs text-red-600">Remove</button>
          </div>)}
          <button type="button" onClick={() => setFooterLinks((current) => ({ ...current, [group]: [...current[group as keyof typeof current], { label: '', destination: 'home', active: true }] }))} className="text-xs font-semibold">+ Add {group} link</button>
        </section>)}
      </div>
      <fieldset className="grid gap-3 border-t border-black/10 pt-4 md:col-span-2">
        <legend className="px-1 text-sm font-semibold">Storefront visibility</legend>
        <p className="text-xs text-gray-500">Turn sections off without deleting products or content. You can enable them again anytime.</p>
        <p className="text-xs font-semibold text-gray-600">Product categories</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[...new Set(['tops', 'bottoms', ...visibilityCategoryKeys])].map((category) => (
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
            ['perfumes', 'Perfumes page'],
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
        <input value={form.pre_title || ''} onChange={(e) => update('pre_title', e.target.value)} placeholder="Pre-title (optional)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <input value={form.cta || ''} onChange={(e) => update('cta', e.target.value)} placeholder="Button text (optional)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <input value={form.headline || ''} onChange={(e) => update('headline', e.target.value)} placeholder="Headline (optional)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
        <textarea value={form.subheadline || ''} onChange={(e) => update('subheadline', e.target.value)} placeholder="Subheadline (optional)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
        <label className="grid gap-2 text-xs font-semibold text-gray-600 md:col-span-2">Desktop / laptop image<input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0])} className="rounded-xl bg-[#F5F5F7] p-3 text-sm font-normal" /></label>
        <label className="grid gap-2 text-xs font-semibold text-gray-600 md:col-span-2">Mobile image (optional)<input type="file" accept="image/*" onChange={(e) => setMobileImage(e.target.files?.[0])} className="rounded-xl bg-[#F5F5F7] p-3 text-sm font-normal" /></label>
      </> : <>
        <input value={form.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="Category title (optional)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm" />
        <select value={form.page || 'shirts'} onChange={(e) => update('page', e.target.value)} className="rounded-xl bg-[#F5F5F7] p-3 text-sm"><option value="shirts">Shirts</option><option value="pants">Pants</option><option value="new-releases">New Releases</option>{productCategories.length > 0 && <optgroup label="Product categories">{productCategories.filter((category) => category.active).map((category) => <option key={category.key} value={`category:${category.key}`}>{category.label}</option>)}</optgroup>}</select>
        <input value={form.subtitle || ''} onChange={(e) => update('subtitle', e.target.value)} placeholder="Category subtitle (optional)" className="rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />
      </>}
      {mode !== 'banners' && <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0])} className="rounded-xl bg-[#F5F5F7] p-3 text-sm md:col-span-2" />}
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
