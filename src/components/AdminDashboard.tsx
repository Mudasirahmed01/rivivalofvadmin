import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Package, ShoppingBag, Users, TrendingUp, 
  DollarSign, Eye, Edit, Trash2, Plus, Check, X 
} from 'lucide-react';
import BackendService from '../lib/backend';
import { Product, Order } from '../types';
import { formatPKR } from '../lib/currency';
import AdminProductForm from './AdminProductForm';
import AdminContentManager from './AdminContentManager';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'customers' | 'content'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  useEffect(() => {
    BackendService.getCurrentUser().then((user) => {
      const role = user?.app_metadata?.role || user?.user_metadata?.role;
      const isAdmin = role === 'admin';
      setAuthorized(isAdmin);
      if (isAdmin) loadData();
    });
  }, []);

  if (authorized === null) {
    return <div className="min-h-screen bg-[#FAFAFA] pt-24 px-4 text-center">Checking admin access...</div>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-24 px-4 text-center">
        <h1 className="text-2xl font-bold text-[#111]">Admin access required</h1>
        <p className="mt-2 text-sm text-gray-600">Your account is not authorized to view this page.</p>
        <button onClick={onBack} className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">Back to Store</button>
      </div>
    );
  }

  const loadData = async () => {
    const [allProducts, allOrders, allUsers] = await Promise.all([
      BackendService.getProducts(),
      BackendService.getAllOrders(),
      BackendService.getUsers(),
    ]);

    setProducts(allProducts);
    setOrders(allOrders);
    setUsers(allUsers);
    setStats({
      totalProducts: allProducts.length,
      totalOrders: allOrders.length,
      totalRevenue: allOrders.reduce((sum, order) => sum + order.total, 0),
      totalCustomers: allUsers.length,
    });
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await BackendService.deleteProduct(id);
      await loadData();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    await BackendService.updateOrderStatus(orderId, status);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-20 pb-16 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Store
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-[#111]">Admin Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your store</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'content', label: 'Homepage Content', icon: Edit },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <Package className="text-gray-400" size={24} />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <p className="text-3xl font-bold text-[#111]">{stats.totalProducts}</p>
              <p className="text-sm text-gray-600 mt-1">Products</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <ShoppingBag className="text-gray-400" size={24} />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <p className="text-3xl font-bold text-[#111]">{stats.totalOrders}</p>
              <p className="text-sm text-gray-600 mt-1">Orders</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="text-gray-400" size={24} />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <p className="text-3xl font-bold text-[#111]">{formatPKR(stats.totalRevenue)}</p>
              <p className="text-sm text-gray-600 mt-1">Revenue</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <Users className="text-gray-400" size={24} />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <p className="text-3xl font-bold text-[#111]">{stats.totalCustomers}</p>
              <p className="text-sm text-gray-600 mt-1">Customers</p>
            </div>

            {/* Recent Orders */}
            <div className="md:col-span-2 lg:col-span-4 bg-white rounded-2xl p-6 border border-black/5">
              <h2 className="text-xl font-bold text-[#111] mb-4">Recent Orders</h2>
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-[#111]">{order.id}</p>
                      <p className="text-xs text-gray-600">{order.userEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#111]">{formatPKR(order.total)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-black/5"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#111]">All Products</h2>
              <button onClick={() => { setEditingProduct(undefined); setShowProductForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-black/90 transition-colors">
                <Plus size={16} />
                Add Product
              </button>
            </div>

            {showProductForm && (
              <AdminProductForm
                product={editingProduct}
                onSaved={async () => { setShowProductForm(false); setEditingProduct(undefined); await loadData(); }}
                onCancel={() => { setShowProductForm(false); setEditingProduct(undefined); }}
              />
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-3 text-xs font-bold text-gray-600 uppercase">Product</th>
                    <th className="text-left py-3 text-xs font-bold text-gray-600 uppercase">Price</th>
                    <th className="text-left py-3 text-xs font-bold text-gray-600 uppercase">Stock</th>
                    <th className="text-left py-3 text-xs font-bold text-gray-600 uppercase">Category</th>
                    <th className="text-right py-3 text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-black/5 hover:bg-[#F5F5F7] transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.images[0]?.url}
                            alt={product.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-semibold text-[#111]">{product.title}</p>
                            <p className="text-xs text-gray-600">{product.fabricDetails}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm font-bold text-[#111]">{formatPKR(product.price)}</td>
                      <td className="py-4 text-sm text-gray-600">
                        {product.variants.reduce((sum, v) => sum + v.stockCount, 0)} units
                      </td>
                      <td className="py-4">
                        <span className="text-xs px-2 py-1 bg-[#F5F5F7] rounded-full text-gray-700 capitalize">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingProduct(product); setShowProductForm(true); }} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                            <Eye size={16} className="text-gray-600" />
                          </button>
                          <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                            <Edit size={16} className="text-gray-600" />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-5">
            <h2 className="mb-5 text-xl font-bold text-[#111]">Homepage Content</h2>
            <AdminContentManager />
          </motion.div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-black/5"
          >
            <h2 className="text-xl font-bold text-[#111] mb-6">All Orders</h2>

            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 bg-[#F5F5F7] rounded-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-[#111]">{order.id}</p>
                      <p className="text-xs text-gray-600">{order.userEmail}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.createdAt).toLocaleDateString('en-PK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#111]">{formatPKR(order.total)}</p>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="mt-2 text-xs px-3 py-1.5 rounded-full border border-black/10 bg-white outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-black/10 pt-3">
                    <p className="text-xs font-bold text-gray-600 mb-2">Items:</p>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">
                            {item.product.title} × {item.quantity} ({item.selectedSize})
                          </span>
                          <span className="font-semibold text-[#111]">
                            {formatPKR(item.product.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-black/5"
          >
            <h2 className="text-xl font-bold text-[#111] mb-6">All Customers</h2>

            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111]">{user.name}</p>
                      <p className="text-xs text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      Joined {new Date(user.createdAt).toLocaleDateString('en-PK')}
                    </p>
                    <span className="text-xs px-2 py-1 bg-black/5 rounded-full text-gray-700 capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
