// ============================================
// COMPLETE BACKEND SERVICE - SUPABASE INTEGRATION
// ============================================
// Real backend service for REVIVAL OF V
// All database operations using Supabase

import { supabase } from './supabaseClient';
import { uploadToCloudinary, uploadMultipleToCloudinary } from './cloudinary';
import type { Product, Review } from '../types';

// ============================================
// TYPES
// ============================================

interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor?: string;
}

interface OrderData {
  items: CartItem[];
  email: string;
  total: number;
  shippingAddress: any;
  paymentMethod: string;
  couponCode?: string;
  discount?: number;
}

const normalizeProduct = (row: any): Product => ({
  ...row,
  compareAtPrice: row.compareAtPrice ?? row.compare_at_price,
  gsmRating: row.gsmRating ?? row.gsm_rating,
  fabricDetails: row.fabricDetails ?? row.fabric_details,
  homepageSlot: row.homepageSlot ?? row.homepage_slot,
  isPublished: row.isPublished ?? row.is_published,
  createdAt: row.createdAt ?? row.created_at,
  updatedAt: row.updatedAt ?? row.updated_at,
  images: (row.images || []).map((image: any) => ({
    url: image.url ?? image.cloudinary_url,
    altText: image.altText ?? image.alt_text ?? '',
    isPrimary: image.isPrimary ?? image.is_primary ?? false,
  })),
  variants: (row.variants || []).map((variant: any) => ({
    size: variant.size,
    stockCount: variant.stockCount ?? variant.stock_count ?? 0,
    sku: variant.sku,
  })),
});

const normalizeOrder = (row: any) => ({
  ...row,
  orderNumber: row.order_number ?? row.orderNumber ?? null,
  userEmail: row.customer_email ?? row.shipping_address?.email ?? row.user_email ?? row.userEmail ?? '',
  createdAt: row.created_at ?? row.createdAt ?? null,
  shippingAddress: row.shipping_address ?? row.shippingAddress ?? {},
  paymentMethod: row.payment_method ?? row.paymentMethod ?? '',
  couponCode: row.coupon_code ?? row.couponCode,
  items: Array.isArray(row.items) ? row.items : [],
});

const toDatabaseProduct = (product: Partial<Product>) => {
  const databaseProduct: Record<string, unknown> = { ...product };
  const fieldMap: Record<string, string> = {
    compareAtPrice: 'compare_at_price',
    gsmRating: 'gsm_rating',
    fabricDetails: 'fabric_details',
    homepageSlot: 'homepage_slot',
    isPublished: 'is_published',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };

  Object.entries(fieldMap).forEach(([frontendField, databaseField]) => {
    if (frontendField in databaseProduct) {
      databaseProduct[databaseField] = databaseProduct[frontendField];
      delete databaseProduct[frontendField];
    }
  });

  delete databaseProduct.images;
  delete databaseProduct.variants;
  return databaseProduct;
};

// ============================================
// PRODUCTS
// ============================================

class BackendService {
  static async findDuplicateSkus(skus: string[], excludeProductId?: string): Promise<string[]> {
    const uniqueSkus = [...new Set(skus.map((sku) => sku.trim()).filter(Boolean))];
    if (uniqueSkus.length === 0) return [];
    let query = supabase.from('product_variants').select('sku,product_id').in('sku', uniqueSkus);
    if (excludeProductId) query = query.neq('product_id', excludeProductId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => row.sku);
  }

  /**
   * Get all published products
   */
  static async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*),
        variants:product_variants(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching products:', error.message, error.details, error.hint);
      return [];
    }

    console.log(`✅ Fetched ${data?.length || 0} products`);
    return (data || []).map(normalizeProduct);
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error) {
      console.error('❌ Error fetching product by slug:', error);
      return null;
    }

    return data ? normalizeProduct(data) : null;
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) {
      console.error('❌ Error fetching product by ID:', error);
      return null;
    }

    return data ? normalizeProduct(data) : null;
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(category: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('category', category)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching products by category:', error);
      return [];
    }

    return (data || []).map(normalizeProduct);
  }

  /**
   * Get products by homepage slot
   */
  static async getProductsBySlot(slot: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('homepage_slot', slot)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching products by slot:', error.message, error.details, error.hint);
      return [];
    }

    return (data || []).map(normalizeProduct);
  }

  /**
   * Add new product with images
   */
  static async addProduct(
    product: Partial<Product>,
    images: File[]
  ): Promise<Product | null> {
    try {
      // Upload images to Cloudinary
      const uploadedImages = [];
      for (let i = 0; i < images.length; i++) {
        const uploaded = await uploadToCloudinary(images[i], 'products');
        uploadedImages.push(uploaded);
      }

      // Insert product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([toDatabaseProduct(product)])
        .select()
        .single();

      if (productError) throw productError;

      // Insert images
      const imageRecords = uploadedImages.map((img, index) => ({
        product_id: productData.id,
        url: img.secure_url,
        alt_text: `${product.title} - Image ${index + 1}`,
        is_primary: index === 0,
        display_order: index,
      }));

      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imageRecords);

      if (imagesError) throw imagesError;

      console.log('✅ Product added successfully');
      return productData ? normalizeProduct(productData) : null;
    } catch (error) {
      console.error('❌ Error adding product:', error);
      return null;
    }
  }

  static async saveProduct(
    product: Partial<Product>,
    images: File[],
    variants: Array<{ size: string; stockCount: number; sku: string }>,
    id?: string
  ): Promise<Product | null> {
    let createdProductId: string | null = null;
    let uploadedImages: Awaited<ReturnType<typeof uploadMultipleToCloudinary>> = [];
    try {
      uploadedImages = images.length
        ? await uploadMultipleToCloudinary(images, 'products')
        : [];
      const productPayload = toDatabaseProduct(product);
      const productQuery = id
        ? supabase.from('products').update(productPayload).eq('id', id).select().single()
        : supabase.from('products').insert(productPayload).select().single();
      const { data: productData, error: productError } = await productQuery;
      if (productError || !productData) throw productError || new Error('Product was not saved');

      const productId = productData.id;
      if (!id) createdProductId = productId;
      if (uploadedImages.length > 0) {
        if (id) {
          const { data: oldImages } = await supabase
            .from('product_images')
            .select('cloudinary_public_id')
            .eq('product_id', productId);
          await Promise.all(
            (oldImages || [])
              .filter((image) => image.cloudinary_public_id)
              .map((image) => this.deleteCloudinaryAsset(image.cloudinary_public_id))
          );
          await supabase.from('product_images').delete().eq('product_id', productId);
        }
        const { error: imageError } = await supabase.from('product_images').insert(
          uploadedImages.map((image, index) => ({
            product_id: productId,
            url: image.secure_url,
            cloudinary_url: image.secure_url,
            cloudinary_public_id: image.public_id,
            alt_text: `${product.title || productData.title} - Image ${index + 1}`,
            is_primary: index === 0,
            display_order: index,
          }))
        );
        if (imageError) throw imageError;
      }

      if (id) {
        const { error: deleteVariantsError } = await supabase.from('product_variants').delete().eq('product_id', productId);
        if (deleteVariantsError) throw deleteVariantsError;
      }
      if (variants.length > 0) {
        const { error: variantError } = await supabase.from('product_variants').insert(
          variants.map((variant) => ({ size: variant.size, stock_count: variant.stockCount, sku: variant.sku, product_id: productId }))
        );
        if (variantError) throw variantError;
      }

      return normalizeProduct({ ...productData, images: [], variants: [] });
    } catch (error) {
      console.error('Error saving product:', error);
      if (createdProductId) await supabase.from('products').delete().eq('id', createdProductId);
      await Promise.all(uploadedImages.map((image) => this.deleteCloudinaryAsset(image.public_id)));
      return null;
    }
  }

  static async deleteCloudinaryAsset(publicId: string): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('delete-cloudinary-asset', {
      body: { publicId },
    });
    return !error && data?.deleted === true;
  }

  /**
   * Update product
   */
  static async updateProduct(
    id: string,
    updates: Partial<Product>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .update(toDatabaseProduct(updates))
      .eq('id', id);

    if (error) {
      console.error('❌ Error updating product:', error);
      return false;
    }

    console.log('✅ Product updated successfully');
    return true;
  }

  /**
   * Delete product
   */
  static async deleteProduct(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting product:', error);
      return false;
    }

    console.log('✅ Product deleted successfully');
    return true;
  }

  static async getHomepageBanners(): Promise<any[]> {
    const { data, error } = await supabase
      .from('homepage_banners')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) {
      console.error('Error fetching homepage banners:', error.message);
      return [];
    }
    return data || [];
  }

  static async saveHomepageBanner(
    banner: Record<string, unknown>,
    image?: File,
    id?: string
  ): Promise<any | null> {
    try {
      const imageUrl = image
        ? (await uploadToCloudinary(image, 'homepage/banners')).secure_url
        : banner.image_url;
      const payload = { ...banner, image_url: imageUrl };
      const query = id
        ? supabase.from('homepage_banners').update(payload).eq('id', id)
        : supabase.from('homepage_banners').insert(payload);
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving homepage banner:', error);
      return null;
    }
  }

  static async deleteHomepageBanner(id: string): Promise<boolean> {
    const { error } = await supabase.from('homepage_banners').delete().eq('id', id);
    return !error;
  }

  static async getHomepageCategories(): Promise<any[]> {
    const { data, error } = await supabase
      .from('homepage_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) {
      console.error('Error fetching homepage categories:', error.message);
      return [];
    }
    return data || [];
  }

  static async saveHomepageCategory(
    category: Record<string, unknown>,
    image?: File,
    id?: string
  ): Promise<any | null> {
    try {
      const imageUrl = image
        ? (await uploadToCloudinary(image, 'homepage/categories')).secure_url
        : category.image_url;
      const payload = {
        title: category.title,
        subtitle: category.subtitle,
        page: category.page || 'shirts',
        image_url: imageUrl,
        display_order: category.display_order,
        is_active: category.is_active,
      };
      const query = id
        ? supabase.from('homepage_categories').update(payload).eq('id', id)
        : supabase.from('homepage_categories').insert(payload);
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving homepage category:', error);
      throw error;
    }
  }

  static async deleteHomepageCategory(id: string): Promise<boolean> {
    const { error } = await supabase.from('homepage_categories').delete().eq('id', id);
    return !error;
  }

  static async getStoreSettings(): Promise<Record<string, any>> {
    const { data, error } = await supabase.from('store_settings').select('key,value');
    if (error) {
      console.error('Error fetching store settings:', error.message);
      return {};
    }
    return Object.fromEntries((data || []).map((setting) => [setting.key, setting.value]));
  }

  static async saveStoreSetting(key: string, value: Record<string, unknown>): Promise<boolean> {
    const { error } = await supabase.from('store_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      console.error('Error saving store setting:', error.message);
      return false;
    }
    return true;
  }

  static async getUserAddresses(userId?: string): Promise<any[]> {
    const currentUser = userId || (await this.getCurrentUser())?.id;
    if (!currentUser) return [];
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', currentUser)
      .order('is_default', { ascending: false });
    if (error) {
      console.error('Error fetching addresses:', error.message);
      return [];
    }
    return data || [];
  }

  static async saveAddress(address: Record<string, unknown>, id?: string): Promise<any | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;
    const payload = { ...address, user_id: user.id };
    const query = id
      ? supabase.from('addresses').update(payload).eq('id', id).eq('user_id', user.id)
      : supabase.from('addresses').insert(payload);
    const { data, error } = await query.select().single();
    if (error) {
      console.error('Error saving address:', error.message);
      return null;
    }
    return data;
  }

  static async deleteAddress(id: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;
    const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', user.id);
    return !error;
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Register new user
   */
  static async registerUser(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<{ success: boolean; message: string; user?: any; session?: any }> {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          phone: userData.phone,
        },
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    console.log('✅ User registered successfully');
    return {
      success: true,
      message: data.session
        ? 'Registration successful'
        : 'Account created. Please check your email to confirm your account before signing in.',
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Login user
   */
  static async loginUser(
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: any }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    console.log('✅ User logged in successfully');
    return { success: true, message: 'Login successful', user: data.user };
  }

  /**
   * Logout user
   */
  static async logoutUser(): Promise<void> {
    await supabase.auth.signOut();
    console.log('✅ User logged out successfully');
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<any | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // ============================================
  // ORDERS
  // ============================================

  /**
   * Create new order
   */
  static async createOrder(orderData: OrderData): Promise<{
    success: boolean;
    message: string;
    order?: any
  }> {
    const user = await this.getCurrentUser();

    const subtotal = orderData.items.reduce(
      (sum, item) => sum + (item.product.price * item.quantity),
      0
    );
    const settings = await this.getStoreSettings();
    const checkoutSettings = settings.checkout || {};
    const freeShippingThreshold = Number(checkoutSettings.free_shipping_threshold || 0);
    const deliveryCharge = Number(checkoutSettings.delivery_charge || 0);
    const taxRate = Number(checkoutSettings.tax_rate || 0);

    const newOrder = {
      user_id: user?.id || null,
      items: orderData.items,
      subtotal: subtotal,
      discount: orderData.discount || 0,
      shipping: freeShippingThreshold > 0 && subtotal >= freeShippingThreshold ? 0 : deliveryCharge,
      tax: Math.round((subtotal - (orderData.discount || 0)) * (taxRate / 100) * 100) / 100,
      total: orderData.total,
      shipping_address: orderData.shippingAddress,
      payment_method: orderData.paymentMethod,
      coupon_code: orderData.couponCode,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([newOrder])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating order:', error);
      return { success: false, message: error.message };
    }

    console.log('✅ Order created successfully');
    const { error: notificationError } = await supabase.functions.invoke('order-confirmation', {
      body: { email: orderData.email, order: data },
    });
    if (notificationError) console.warn('Order saved, but confirmation email was not sent:', notificationError.message);
    return { success: true, message: 'Order placed successfully', order: data };
  }

  /**
   * Get user orders
   */
  static async getUserOrders(userId?: string): Promise<any[]> {
    const currentUser = userId || (await this.getCurrentUser())?.id;
    if (!currentUser) return [];

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', currentUser)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user orders:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get all orders (admin)
   */
  static async getAllOrders(): Promise<any[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return [];
    }

    return (data || []).map(normalizeOrder);
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      console.error('❌ Error updating order status:', error);
      return false;
    }

    console.log('✅ Order status updated');
    return true;
  }

  // ============================================
  // REVIEWS
  // ============================================

  /**
   * Get all reviews
   */
  static async getAllReviews(): Promise<any[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching reviews:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get product reviews
   */
  static async getProductReviews(productId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching product reviews:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Add review
   */
  static async addReview(review: Omit<Review, 'id' | 'date' | 'helpful'>): Promise<any | null> {
    const user = await this.getCurrentUser();

    const newReview = {
      product_id: review.productId,
      user_id: user?.id || null,
      user_name: review.userName,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      verified: review.verified,
    };

    const { data, error } = await supabase
      .from('reviews')
      .insert([newReview])
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding review:', error);
      return null;
    }

    console.log('✅ Review added successfully');
    return data;
  }

  /**
   * Mark review as helpful
   */
  static async markReviewHelpful(reviewId: string): Promise<boolean> {
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('helpful')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) return false;

    const { error } = await supabase
      .from('reviews')
      .update({ helpful: review.helpful + 1 })
      .eq('id', reviewId);

    if (error) {
      console.error('❌ Error marking review helpful:', error);
      return false;
    }

    return true;
  }

  // ============================================
  // WISHLIST
  // ============================================

  /**
   * Get user wishlist
   */
  static async getUserWishlist(userId?: string): Promise<Product[]> {
    const currentUser = userId || (await this.getCurrentUser())?.id;
    if (!currentUser) return [];

    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        product_id,
        products (*)
      `)
      .eq('user_id', currentUser);

    if (error) {
      console.error('❌ Error fetching wishlist:', error);
      return [];
    }

    return data?.map((item: any) => normalizeProduct(item.products)) || [];
  }

  /**
   * Add to wishlist
   */
  static async addToWishlist(productId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const { error } = await supabase
      .from('wishlists')
      .insert([{ user_id: user.id, product_id: productId }]);

    if (error) {
      console.error('❌ Error adding to wishlist:', error);
      return false;
    }

    console.log('✅ Added to wishlist');
    return true;
  }

  /**
   * Remove from wishlist
   */
  static async removeFromWishlist(productId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) {
      console.error('❌ Error removing from wishlist:', error);
      return false;
    }

    console.log('✅ Removed from wishlist');
    return true;
  }

  // ============================================
  // COUPONS
  // ============================================

  /**
   * Get all active coupons
   */
  static async getAllCoupons(): Promise<any[]> {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching coupons:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Validate coupon
   */
  static async validateCoupon(code: string): Promise<{
    valid: boolean;
    discount?: number;
    message: string
  }> {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return { valid: false, message: 'Invalid coupon code' };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, message: 'Coupon has expired' };
    }

    return {
      valid: true,
      discount: coupon.discount,
      message: 'Coupon applied successfully',
    };
  }

  /**
   * Add coupon (admin)
   */
  static async addCoupon(coupon: any): Promise<boolean> {
    const { error } = await supabase
      .from('coupons')
      .insert([coupon]);

    if (error) {
      console.error('❌ Error adding coupon:', error);
      return false;
    }

    console.log('✅ Coupon added');
    return true;
  }

  /**
   * Update coupon (admin)
   */
  static async updateCoupon(id: string, updates: any): Promise<boolean> {
    const { error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('❌ Error updating coupon:', error);
      return false;
    }

    console.log('✅ Coupon updated');
    return true;
  }

  /**
   * Delete coupon (admin)
   */
  static async deleteCoupon(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting coupon:', error);
      return false;
    }

    console.log('✅ Coupon deleted');
    return true;
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Track event
   */
  static async trackEvent(eventName: string, eventData?: any): Promise<void> {
    const user = await this.getCurrentUser();

    await supabase.from('analytics').insert([{
      event: eventName,
      user_id: user?.id || null,
      data: eventData || {},
    }]);
  }

  /**
   * Get analytics
   */
  static async getAnalytics(): Promise<any[]> {
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching analytics:', error);
      return [];
    }

    return data || [];
  }

  // ============================================
  // USERS
  // ============================================

  /**
   * Get all users (admin)
   */
  static async getUsers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }

    return data || [];
  }

  static async getAllCustomerAddresses(): Promise<any[]> {
    const { data, error } = await supabase.from('addresses').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching customer addresses:', error);
      return [];
    }
    return data || [];
  }

  static async getNewsletterSubscribers(): Promise<any[]> {
    const { data, error } = await supabase.from('newsletter_subscribers').select('*').order('consented_at', { ascending: false });
    if (error) {
      console.error('Error fetching newsletter subscribers:', error);
      return [];
    }
    return data || [];
  }

  // ============================================
  // STATS
  // ============================================

  /**
   * Get dashboard stats
   */
  static async getStats(): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
  }> {
    const [products, orders, users] = await Promise.all([
      this.getProducts(),
      this.getAllOrders(),
      this.getUsers(),
    ]);

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      totalCustomers: users.length,
    };
  }
}

export default BackendService;
