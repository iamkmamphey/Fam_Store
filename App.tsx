
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  Store,
  ShieldCheck,
  User as UserIcon,
  Users,
  Search,
  Loader2,
  Lightbulb,
  TrendingUp,
  Zap,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { User, UserAccount, UserRole, Product, Sale } from './types';
import { db } from './services/db';
import { GoogleGenAI, Type } from "@google/genai";
import famyankLogo from './fam-movement.png';
import { ghsToUsd, usdToGhs } from './services/currency';

// --- Branding: Logo Component ---
const FamyankLogo = ({ className = "w-8 h-8", textColor = "text-white" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <img
      src={famyankLogo}
      alt="Famyank logo"
      className="w-10 h-10 object-contain"
    />
    <div className="flex flex-col leading-none">
      <span className={`font-black text-lg tracking-tighter ${textColor}`}>Famyank</span>
      <span className={`text-[6px] font-bold uppercase tracking-[0.2em] ${textColor} opacity-80`}>The Family Movement</span>
    </div>
  </div>
);

const ghsFormatter = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' });
const formatGhs = (amount: number) => ghsFormatter.format(amount);

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('famyank_auth');
    return saved ? JSON.parse(saved) : null;
  });

  // Keep session user in sync with stored accounts (e.g., name changes/migrations)
  useEffect(() => {
    if (!user?.email) return;
    const emailKey = user.email.toLowerCase();
    const account = db.getUsers().find(u => u.email.toLowerCase() === emailKey);
    if (!account) return;
    const { password: _pw, passwordHash: _ph, passwordSalt: _ps, ...sessionUser } = account;
    const changed = JSON.stringify(sessionUser) !== JSON.stringify(user);
    if (changed) {
      setUser(sessionUser);
      localStorage.setItem('famyank_auth', JSON.stringify(sessionUser));
    }
  }, [user?.email]);

  const login = async (email: string, password: string) => {
    const found = await db.authenticate(email, password);
    if (found) {
      const { password: _pw, passwordHash: _ph, passwordSalt: _ps, ...sessionUser } = found;
      setUser(sessionUser);
      localStorage.setItem('famyank_auth', JSON.stringify(sessionUser));
      return;
    }
    alert("Invalid credentials.");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('famyank_auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- Components ---

const PublicNavbar = () => (
  <nav className="bg-black text-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between">
    <Link to="/" className="flex items-center">
      <FamyankLogo />
    </Link>
    <Link to="/login" className="text-sm font-medium hover:text-gray-300 flex items-center gap-1">
      <ShieldCheck size={18} />
      Staff Portal
    </Link>
  </nav>
);

const PrivateLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', roles: [UserRole.ADMIN] },
    { icon: Users, label: 'Staff', path: '/admin/staff', roles: [UserRole.ADMIN] },
    { icon: Package, label: 'Inventory', path: '/admin/inventory', roles: [UserRole.ADMIN, UserRole.WORKER] },
    { icon: ShoppingCart, label: 'POS Terminal', path: '/admin/pos', roles: [UserRole.ADMIN, UserRole.WORKER] },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports', roles: [UserRole.ADMIN] },
  ];

  const filteredMenu = menuItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Top Nav */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2">
          <Menu size={24} />
        </button>
        <div className="scale-75 origin-center">
          <FamyankLogo textColor="text-black" />
        </div>
        <div className="w-8" />
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-[60] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64 bg-slate-900 text-slate-300 flex flex-col
      `}>
        <div className="p-6 flex items-center justify-between">
          <FamyankLogo />
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {filteredMenu.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                ${location.pathname === item.path ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <UserIcon size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom POS shortcut */}
      <div className="md:hidden fixed bottom-6 right-6">
         <Link to="/admin/pos" className="w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white">
            <ShoppingCart size={24} />
         </Link>
      </div>
    </div>
  );
};

// --- Pages ---

const PublicCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setProducts(db.getProducts());
    return db.subscribe(() => setProducts(db.getProducts()));
  }, []);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2 tracking-tight">IN-STORE</h1>
          <p className="text-gray-600">Famyank gives the Best of Prices.</p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map(product => (
            <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-black">
              <div className="aspect-square relative group overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                {!product.stock && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-white text-black px-4 py-1.5 text-[10px] font-black rounded-full uppercase tracking-tighter shadow-lg">Sold Out</span>
                  </div>
                )}
              </div>
              <div className="p-4 md:p-5">
                <div className="flex justify-between items-start mb-1">
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{product.category}</span>
                   {product.stock > 0 && product.stock < 5 && <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded font-bold">Limited</span>}
                </div>
                <h3 className="font-bold text-gray-900 line-clamp-1 text-base md:text-lg">{product.name}</h3>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xl font-black text-black">{formatGhs(product.priceGhs)}</span>
                  <div className={`w-2 h-2 rounded-full ${product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('admin@famyank.com');
  const [password, setPassword] = useState('');
  
  if (user) return <Navigate to="/admin/dashboard" />;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <FamyankLogo textColor="text-black" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Staff Portal</h2>
          <p className="text-slate-500 mt-2">Inventory & Sales Management</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Account Email</label>
            <input 
              type="email" 
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 outline-none transition-all font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 outline-none transition-all font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs text-indigo-700 leading-relaxed">
            <p className="font-black mb-1 uppercase tracking-tighter">Security Notice:</p>
            <p className="opacity-80">
              Credentials are required for staff access. For production, change default passwords and avoid sharing them publicly.
            </p>
          </div>
          <button 
            onClick={() => void login(email, password)}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 mt-4"
          >
            Authenticate
          </button>
          <Link to="/" className="block text-center text-sm font-bold text-slate-400 mt-6 hover:text-slate-600 transition-colors">
            Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};

// --- Admin Pages ---

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const Dashboard = () => {
  const [sales, setSales] = useState(db.getSales());
  const [products, setProducts] = useState(db.getProducts());

  useEffect(() => {
    return db.subscribe(() => {
      setSales(db.getSales());
      setProducts(db.getProducts());
    });
  }, []);

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = sales.reduce((acc, s) => acc + s.totalProfit, 0);
  const lowStock = products.filter(p => p.stock < 10).length;

  const totalRevenueUsd = ghsToUsd(totalRevenue);
  const totalProfitUsd = ghsToUsd(totalProfit);

  const recentSales = sales.slice(-5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black">DASHBOARD</h1>
        <p className="text-gray-500">Quick overview of your business</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-sm font-medium text-indigo-100 uppercase">Total Revenue</p>
          <h2 className="text-3xl font-black mt-2">{formatGhs(totalRevenue)}</h2>
          <p className="text-xs text-indigo-200 mt-1">${totalRevenueUsd.toFixed(2)} USD</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-sm font-medium text-emerald-100 uppercase">Net Profit</p>
          <h2 className="text-3xl font-black mt-2">{formatGhs(totalProfit)}</h2>
          <p className="text-xs text-emerald-200 mt-1">${totalProfitUsd.toFixed(2)} USD</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-sm font-medium text-blue-100 uppercase">Total Orders</p>
          <h2 className="text-3xl font-black mt-2">{sales.length}</h2>
          <p className="text-xs text-blue-200 mt-1">All time</p>
        </div>
        <div className={`bg-gradient-to-br ${lowStock > 0 ? 'from-red-600 to-red-700' : 'from-slate-600 to-slate-700'} text-white p-6 rounded-2xl shadow-lg`}>
          <p className="text-sm font-medium text-white/80 uppercase">Low Stock Items</p>
          <h2 className="text-3xl font-black mt-2">{lowStock}</h2>
          <p className="text-xs text-white/70 mt-1">{lowStock > 0 ? 'Needs attention' : 'All good'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4 text-slate-800 flex items-center gap-2">
            <ShoppingCart size={20} className="text-indigo-600" />
            Recent Transactions
          </h3>
          {recentSales.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-500 font-medium">No sales yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.reverse().map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{sale.staffName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(sale.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-indigo-600">{formatGhs(sale.totalAmount)}</p>
                    <p className="text-xs text-emerald-600 font-bold">+{formatGhs(sale.totalProfit)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4 text-slate-800 flex items-center gap-2">
            <Package size={20} className="text-red-600" />
            Low Stock Alert
          </h3>
          {lowStock === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="text-emerald-600" size={32} />
              </div>
              <p className="text-slate-700 font-bold">All items well stocked!</p>
              <p className="text-slate-500 text-sm mt-1">No action needed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.filter(p => p.stock < 10).slice(0, 5).map(product => (
                <div key={product.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <img src={product.image} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-600">{product.stock}</p>
                    <p className="text-xs text-slate-500">units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black mb-2">Need Detailed Analytics?</h3>
            <p className="text-indigo-100 text-sm">View comprehensive reports, sales summaries, and smart recommendations</p>
          </div>
          <Link 
            to="/admin/reports"
            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg"
          >
            View Reports
          </Link>
        </div>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const [sales, setSales] = useState(db.getSales());
  const [products, setProducts] = useState(db.getProducts());

  useEffect(() => {
    return db.subscribe(() => {
      setSales(db.getSales());
      setProducts(db.getProducts());
    });
  }, []);

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = sales.reduce((acc, s) => acc + s.totalProfit, 0);
  const lowStock = products.filter(p => p.stock < 10).length;

    // Convert total revenue and profit from GHS to USD
    const totalRevenueUsd = ghsToUsd(totalRevenue);
    const totalProfitUsd = ghsToUsd(totalProfit);

  const categoryData = products.reduce((acc: any[], p) => {
    const existing = acc.find(item => item.name === p.category);
    if (existing) existing.value += p.stock;
    else acc.push({ name: p.category, value: p.stock });
    return acc;
  }, []);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const avgTransactionValue = sales.length > 0 ? totalRevenue / sales.length : 0;
  const avgProfit = sales.length > 0 ? totalProfit / sales.length : 0;
  const topCategory = categoryData.length > 0 ? categoryData.reduce((a, b) => a.value > b.value ? a : b) : null;

  const handlePrintReport = () => {
    window.print();
  };

  const handleResetSales = () => {
    if (confirm('Are you sure you want to reset all sales data? This action cannot be undone.')) {
      db.resetSales();
      alert('Sales data has been reset successfully.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">ANALYTICS OVERVIEW</h1>
          <p className="text-gray-500">Real-time performance metrics</p>
        </div>
        <div className="no-print flex items-center gap-3">
          <button
            onClick={handleResetSales}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            <X size={18} />
            Reset Sales
          </button>
          <button
            onClick={handlePrintReport}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Printer size={18} />
            Print Report
          </button>
        </div>
      </header>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-[2rem] p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 mb-4">Sales Summary Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-700">
          <div>
            <p className="font-bold text-indigo-600 mb-2">Performance Overview</p>
            <p className="text-sm leading-relaxed">
              {sales.length === 0 
                ? "No sales recorded yet. Start selling to see your performance metrics here."
                : `Your store has completed ${sales.length} transaction${sales.length !== 1 ? 's' : ''} with a total revenue of ${formatGhs(totalRevenue)}. The average transaction value stands at ${formatGhs(avgTransactionValue)}, demonstrating ${avgTransactionValue > 0 ? 'solid customer engagement' : 'strong market potential'}.`
              }
            </p>
          </div>
          <div>
            <p className="font-bold text-emerald-600 mb-2">Profitability Analysis</p>
            <p className="text-sm leading-relaxed">
              {sales.length === 0
                ? "Profit metrics will appear once sales are recorded."
                : `Your net profit totals ${formatGhs(totalProfit)} with an average profit per transaction of ${formatGhs(avgProfit)}. This reflects a healthy profit margin of ${((totalProfit / totalRevenue) * 100).toFixed(1)}% across all sales.`
              }
            </p>
          </div>
          <div>
            <p className="font-bold text-blue-600 mb-2">Inventory Status</p>
            <p className="text-sm leading-relaxed">
              {lowStock === 0
                ? "All inventory items are well stocked. No restocking needed at this time."
                : `${lowStock} product${lowStock !== 1 ? 's' : ''} ${lowStock !== 1 ? 'are' : 'is'} currently running low on stock. Consider restocking these items to maintain sales momentum.`
              }
            </p>
          </div>
          <div>
            <p className="font-bold text-orange-600 mb-2">Category Insights</p>
            <p className="text-sm leading-relaxed">
              {topCategory
                ? `${topCategory.name} is your top-performing category with ${topCategory.value} units in stock. Focus on maintaining strong inventory in this category.`
                : "Category data will appear once products are added to your inventory."
              }
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase">Total Revenue</p>
          <h2 className="text-2xl font-black text-indigo-600 mt-1">{formatGhs(totalRevenue)}</h2>
          <p className="text-xs text-gray-400 mt-1">USD: ${totalRevenueUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase">Net Profit</p>
          <h2 className="text-2xl font-black text-emerald-600 mt-1">{formatGhs(totalProfit)}</h2>
          <p className="text-xs text-gray-400 mt-1">USD: ${totalProfitUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase">Total Orders</p>
          <h2 className="text-2xl font-black mt-1">{sales.length}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Low Stock Items</p>
          <h2 className={`text-2xl font-black mt-1 ${lowStock > 0 ? 'text-red-500' : 'text-gray-900'}`}>{lowStock}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-96">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-800">
            <BarChart3 className="text-indigo-600" size={20} />
            Recent Sales Activity
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sales.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="id" hide />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="totalAmount" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-96">
          <h3 className="font-bold mb-6 text-slate-800">Inventory Split</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap gap-2">
            {categoryData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-xs text-gray-500 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Lightbulb size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Smart Recommendations</h2>
            <p className="text-sm text-slate-600">AI-powered suggestions based on sales performance</p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600 font-medium">No sales data available yet. Complete some transactions to receive personalized product recommendations.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {(() => {
              // Analyze best-selling products
              const productSalesCount: Record<string, number> = {};
              const productDetails: Record<string, Product> = {};
              
              sales.forEach(sale => {
                sale.items.forEach(item => {
                  productSalesCount[item.productId] = (productSalesCount[item.productId] || 0) + item.quantity;
                  const prod = products.find(p => p.id === item.productId);
                  if (prod) productDetails[item.productId] = prod;
                });
              });

              const topProducts = Object.entries(productSalesCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([id]) => productDetails[id])
                .filter(Boolean);

              // Identify top-performing categories by sales volume
              const categorySalesVolume: Record<string, number> = {};
              topProducts.forEach(p => {
                categorySalesVolume[p.category] = (categorySalesVolume[p.category] || 0) + (productSalesCount[p.id] || 0);
              });

              const topCategory = Object.entries(categorySalesVolume).sort(([, a], [, b]) => b - a)[0]?.[0];
              
              // Find similar products in top category that haven't sold much
              const similarProducts = products
                .filter(p => p.category === topCategory && !topProducts.find(tp => tp.id === p.id))
                .sort((a, b) => (productSalesCount[b.id] || 0) - (productSalesCount[a.id] || 0))
                .slice(0, 2);

              // Find low-stock items
              const lowStockTopCategory = products
                .filter(p => p.category === topCategory && p.stock < 5)
                .slice(0, 2);

              return (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-emerald-200">
                      <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-600" />
                        Stock More Of These
                      </h3>
                      <div className="space-y-3">
                        {topProducts.length > 0 ? (
                          topProducts.map((p, idx) => (
                            <div key={p.id} className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center font-bold text-emerald-600 text-sm flex-shrink-0">
                                #{idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-slate-800">{p.name}</p>
                                <p className="text-xs text-slate-600 mt-1">Sold {productSalesCount[p.id] || 0} units • Current stock: {p.stock} units</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-600 text-sm">No sales data to recommend yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-emerald-200">
                      <h3 className="font-bold text-teal-800 mb-4 flex items-center gap-2">
                        <Zap size={18} className="text-teal-600" />
                        Expand In {topCategory || 'Top Category'}
                      </h3>
                      <div className="space-y-3">
                        {similarProducts.length > 0 ? (
                          similarProducts.map((p) => (
                            <div key={p.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                <img src={p.image} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                <p className="text-xs text-slate-600 mt-0.5">Stock: {p.stock} units</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-600 text-sm">Limited product variety in top category. Consider adding more options.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {lowStockTopCategory.length > 0 && (
                    <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                      <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-600" />
                        Critical: Restock These Best-Sellers
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lowStockTopCategory.map((p) => (
                          <div key={p.id} className="bg-white rounded-xl p-4 border border-red-100">
                            <p className="font-bold text-slate-800">{p.name}</p>
                            <p className="text-xs text-red-600 font-bold mt-2">Only {p.stock} units left</p>
                            <p className="text-xs text-slate-600 mt-1">At current sales rate, may stockout soon.</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-emerald-200">
                    <h3 className="font-bold text-slate-800 mb-3">📊 Insight Summary</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Based on {sales.length} transaction{sales.length !== 1 ? 's' : ''}, your <span className="font-bold text-emerald-600">{topCategory}</span> category is performing exceptionally well. 
                      {topProducts.length > 0 ? ` Focus on keeping "${topProducts[0].name}" well-stocked and ` : ' '} 
                      consider expanding product variety in this category. 
                      {lowStockTopCategory.length > 0 ? `Prioritize restocking ${lowStockTopCategory.map(p => `"${p.name}"`).join(' and ')} to avoid missed sales opportunities.` : 'Your inventory levels are healthy.'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

const POSTerminal = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [manualProductName, setManualProductName] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [isProcessing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Sale | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [taxRate, setTaxRate] = useState(0);

  useEffect(() => {
    const updateProducts = () => setProducts(db.getProducts());
    updateProducts();
    return db.subscribe(updateProducts);
  }, []);

  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock === 0) return alert("Out of stock!");
    if (quantity <= 0) return;
    if (product.stock < quantity) return alert("Insufficient stock!");
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + quantity > product.stock) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleManualAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = manualProductName.trim().toLowerCase();
    if (!name) return;
    const product = products.find(p => p.name.trim().toLowerCase() === name)
      || products.find(p => p.name.trim().toLowerCase().includes(name));
    if (!product) {
      alert("Product not found. Please select from the list.");
      return;
    }
    addToCart(product, manualQty);
    setManualProductName('');
    setManualQty(1);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.priceGhs * item.quantity), 0);

  const handleCheckout = async () => {
    if (!cart.length || !user) return;
    setProcessing(true);
    try {
      const sale = await db.executeSale(cart, { id: user.id, name: user.name });
      setLastReceipt(sale);
      setCart([]);
      setShowPrintDialog(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getTaxAmount = () => lastReceipt ? (lastReceipt.totalAmount * taxRate) / 100 : 0;
  const getGrandTotal = () => lastReceipt ? lastReceipt.totalAmount + getTaxAmount() : 0;

  const handlePrint = () => {
    window.print();
  };

  const handlePrintToPDF = () => {
    window.print();
  };

  const handleEmail = () => {
    if (!lastReceipt) return;
    const subject = `Receipt ${lastReceipt.id}`;
    const items = lastReceipt.items.map((item, idx) => {
      const prod = products.find(p => p.id === item.productId);
      return `${idx + 1}. ${prod?.name || 'Product'} - Qty: ${item.quantity} @ ${formatGhs(item.unitPrice)} = ${formatGhs(item.total)}`;
    }).join('\n');
    const body = `RECEIPT\n\nTransaction ID: ${lastReceipt.id}\nDate: ${new Date(lastReceipt.timestamp).toLocaleString()}\nStaff: ${lastReceipt.staffName}\n\n--- ITEMS ---\n${items}\n\nSubtotal: ${formatGhs(lastReceipt.totalAmount)}\nTax (${taxRate}%): ${formatGhs(getTaxAmount())}\nGrand Total: ${formatGhs(getGrandTotal())}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleWhatsApp = () => {
    if (!lastReceipt) return;
    const items = lastReceipt.items.map((item, idx) => {
      const prod = products.find(p => p.id === item.productId);
      return `${idx + 1}. *${prod?.name || 'Product'}*\n   Qty: ${item.quantity} @ ${formatGhs(item.unitPrice)} = ${formatGhs(item.total)}`;
    }).join('\n\n');
    const message = `🧾 *RECEIPT*\n\n*Transaction ID:* ${lastReceipt.id}\n*Date:* ${new Date(lastReceipt.timestamp).toLocaleString()}\n*Staff:* ${lastReceipt.staffName}\n\n--- *ITEMS* ---\n\n${items}\n\n*Subtotal:* ${formatGhs(lastReceipt.totalAmount)}\n*Tax (${taxRate}%):* ${formatGhs(getTaxAmount())}\n*Grand Total:* ${formatGhs(getGrandTotal())}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black uppercase tracking-tight">Terminal</h1>
        </div>

        <form onSubmit={handleManualAdd} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Product</label>
            <select
              value={manualProductName}
              onChange={e => setManualProductName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold text-slate-900 transition-all"
              required
            >
              <option value="" disabled>Select product</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Qty</label>
            <input
              type="number"
              min={1}
              value={manualQty}
              onChange={e => setManualQty(Math.max(1, Number(e.target.value)))}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold text-slate-900 transition-all"
              required
            />
          </div>
          <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-black/20">
            Add
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map(p => (
            <button 
              key={p.id} 
              onClick={() => addToCart(p)}
              disabled={p.stock === 0}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 text-left hover:border-indigo-600 hover:shadow-md transition-all group relative overflow-hidden"
            >
              {p.stock === 0 && <div className="absolute inset-0 bg-white/60 z-10" />}
              <img src={p.image} className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-black text-slate-900 leading-tight">{p.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-black text-indigo-600 text-lg">{formatGhs(p.priceGhs)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl h-fit sticky top-24 border border-slate-800">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
            <ShoppingCart size={24} className="text-indigo-400" />
            Active Cart
          </h3>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="py-12 text-center">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="text-white/20" size={32} />
                 </div>
                  <p className="text-slate-500 font-bold italic">Empty cart. Add a product to begin.</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex-1">
                    <p className="font-black text-sm leading-tight text-white">{item.product.name}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{formatGhs(item.product.priceGhs)} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-indigo-400">{formatGhs(item.product.priceGhs * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-white/20 hover:text-red-400 transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-black uppercase tracking-widest text-xs">Grand Total</span>
              <span className="text-3xl font-black text-white">{formatGhs(total)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </div>
              ) : 'Complete Checkout'}
            </button>
          </div>
        </div>

        {lastReceipt && !showPrintDialog && (
          <div className="bg-emerald-500 text-white p-5 rounded-3xl text-center animate-bounce shadow-xl shadow-emerald-500/20">
            <p className="font-black text-lg">Transaction Secured</p>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">ID: {lastReceipt.id}</p>
          </div>
        )}

        {showPrintDialog && lastReceipt && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl my-8">
              <div className="bg-emerald-500 text-white p-6 text-center">
                <p className="font-black text-2xl">✓ Transaction Complete</p>
                <p className="text-sm font-bold opacity-90 mt-1">ID: {lastReceipt.id}</p>
                <p className="text-xs opacity-80 mt-1">{new Date(lastReceipt.timestamp).toLocaleString()}</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Items Purchased</p>
                  <div className="space-y-2">
                    {lastReceipt.items.map((item, idx) => {
                      const prod = products.find(p => p.id === item.productId);
                      return (
                        <div key={idx} className="flex items-start justify-between gap-4 pb-2 border-b border-slate-200 last:border-0">
                          <div className="flex-1">
                            <p className="font-black text-slate-900 text-sm">{prod?.name || 'Product'}</p>
                            <p className="text-xs text-slate-500 font-medium">{item.quantity} × {formatGhs(item.unitPrice)}</p>
                          </div>
                          <p className="font-black text-indigo-600">{formatGhs(item.total)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold">Subtotal</span>
                    <span className="font-black text-slate-900">{formatGhs(lastReceipt.totalAmount)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-slate-600 font-bold flex-shrink-0">Tax Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate}
                      onChange={e => setTaxRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-20 px-3 py-2 bg-white rounded-lg border-2 border-indigo-200 focus:border-indigo-600 outline-none font-black text-slate-900 text-center"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold">Tax ({taxRate}%)</span>
                    <span className="font-black text-slate-900">{formatGhs(getTaxAmount())}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t-2 border-indigo-200">
                    <span className="text-slate-900 font-black uppercase text-sm">Grand Total</span>
                    <span className="font-black text-indigo-600 text-xl">{formatGhs(getGrandTotal())}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 no-print">
                  <button 
                    onClick={handlePrint}
                    className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-indigo-500 transition-all shadow-lg"
                  >
                    🖨️ Print
                  </button>
                  <button 
                    onClick={handlePrintToPDF}
                    className="bg-slate-700 text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-slate-600 transition-all shadow-lg"
                  >
                    📄 Save PDF
                  </button>
                  <button 
                    onClick={handleEmail}
                    className="bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-blue-500 transition-all shadow-lg"
                  >
                    ✉️ Email
                  </button>
                  <button 
                    onClick={handleWhatsApp}
                    className="bg-green-600 text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-green-500 transition-all shadow-lg"
                  >
                    💬 WhatsApp
                  </button>
                </div>
                
                <button 
                  onClick={() => { setShowPrintDialog(false); setLastReceipt(null); setTaxRate(0); }}
                  className="w-full bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black hover:bg-slate-200 transition-all no-print"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InventoryManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const updateProducts = () => {
      const latest = db.getProducts();
      setProducts(latest);
    };
    updateProducts();
    return db.subscribe(updateProducts);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const priceGhs = parseFloat(formData.get('priceGhs') as string);
    const costGhs = parseFloat(formData.get('costGhs') as string);

    const productData: Product = {
      id: editingProduct?.id || `P-${Date.now()}`,
      sku: formData.get('sku') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      priceGhs,
      priceUsd: ghsToUsd(priceGhs),
      costGhs,
      costUsd: ghsToUsd(costGhs),
      stock: parseInt(formData.get('stock') as string),
      category: formData.get('category') as string,
      image: (formData.get('image') as string) || editingProduct?.image || `https://picsum.photos/seed/${formData.get('sku')}/400/400`
    };

    if (editingProduct) db.updateProduct(productData);
    else db.addProduct(productData);
    
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleRestoreProducts = () => {
    if (confirm('Restore all 40 default products? This will replace your current inventory.')) {
      db.restoreInitialProducts();
      alert('Products restored successfully!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Inventory</h1>
          <p className="text-slate-500 font-medium">Global Stock Control & Management</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRestoreProducts}
            className="bg-indigo-600 text-white px-6 py-4 rounded-[1.5rem] font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
          >
            <Package size={20} />
            Restore Products
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setModalOpen(true); }}
            className="bg-black text-white px-6 py-4 rounded-[1.5rem] font-black flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-black/20"
          >
            <Package size={20} />
            Add Manual
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
            <tr>
              <th className="px-8 py-6">Product Information</th>
              <th className="px-8 py-6">Category</th>
              <th className="px-8 py-6">Pricing</th>
              <th className="px-8 py-6">Availability</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-100 flex-shrink-0">
                      <img src={p.image} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{p.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[9px] font-black uppercase px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">{p.category}</span>
                </td>
                <td className="px-8 py-6">
                  <p className="font-black text-indigo-600 text-sm">{formatGhs(p.priceGhs)}</p>
                  <p className="text-[9px] text-slate-400 font-black italic uppercase tracking-widest mt-0.5">Mgn: {formatGhs(p.priceGhs - p.costGhs)}</p>
                </td>
                <td className="px-8 py-6">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${p.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${p.stock < 10 ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'}`} />
                    {p.stock} Units
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => { setEditingProduct(p); setModalOpen(true); }}
                    className="text-slate-400 hover:text-indigo-600 font-black text-xs uppercase tracking-widest transition-colors"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 my-8">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                {editingProduct ? 'Modify Asset' : 'New Entry'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                 <div className="w-full md:w-48 space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Preview</label>
                    <div className="aspect-square bg-slate-100 rounded-3xl overflow-hidden border-4 border-slate-50 relative group">
                       <img src={editingProduct?.image || "https://placehold.co/400x400?text=No+Image"} className="w-full h-full object-cover" id="product-image-preview" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black uppercase">{editingProduct ? 'Replace Image' : 'Upload Image'}</div>
                       <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                         onChange={e => {
                           const file = e.target.files?.[0];
                           if (file) {
                             const reader = new FileReader();
                             reader.onload = () => {
                               setEditingProduct(prev => prev ? { ...prev, image: reader.result as string } : { ...prev, image: reader.result as string });
                             };
                             reader.readAsDataURL(file);
                           }
                         }}
                       />
                    </div>
                    <input type="hidden" name="image" value={editingProduct?.image || ''} />
                 </div>
                 <div className="flex-1 grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Asset Name</label>
                      <input name="name" defaultValue={editingProduct?.name} required className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold text-slate-900 transition-all" />
                    </div>
                    <input type="hidden" name="sku" defaultValue={editingProduct?.sku || `FY-${Math.floor(Math.random() * 10000)}`} />
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Categorization</label>
                      <select name="category" defaultValue={editingProduct?.category} required className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold text-slate-900 transition-all">
                        <option value="Apparel">Apparel</option>
                        <option value="Footwear">Footwear</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Outerwear">Outerwear</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">MSRP (₵)</label>
                      <input name="priceGhs" type="number" step="0.01" defaultValue={editingProduct?.priceGhs} required className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-black text-slate-900 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Asset Cost (₵)</label>
                      <input name="costGhs" type="number" step="0.01" defaultValue={editingProduct?.costGhs} required className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-black text-slate-900 transition-all" />
                    </div>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Current Stock</label>
                  <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-black text-slate-900 transition-all" />
                </div>
                <div className="col-span-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Projected Margin</p>
                   <div className="px-5 py-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <span className="font-black text-indigo-600">Calculated Automatically</span>
                   </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Marketing Description</label>
                  <textarea name="description" defaultValue={editingProduct?.description} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold text-slate-900 h-32 transition-all resize-none" />
                </div>
              </div>
              
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Discard</button>
                <button type="submit" className="flex-1 py-5 font-black bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-900/20 uppercase tracking-widest hover:bg-black transition-all active:scale-95">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StaffManagement = () => {
  const [users, setUsers] = useState<UserAccount[]>(db.getUsers());
  const [isCreating, setCreating] = useState(false);

  useEffect(() => {
    return db.subscribe(() => setUsers(db.getUsers()));
  }, []);

  const workers = users.filter(u => u.role === UserRole.WORKER);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    try {
      const formData = new FormData(e.currentTarget);
      const name = String(formData.get('name') || '');
      const email = String(formData.get('email') || '');
      const password = String(formData.get('password') || '');
      await db.addWorkerAccount({ name, email, password });
      e.currentTarget.reset();
      alert('Worker account created.');
    } catch (err: any) {
      alert(err?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight">Staff</h1>
        <p className="text-slate-500 font-medium">Create worker accounts and manage access</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight">Create Worker</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">New workers can access Inventory + POS</p>
          </div>
          <form onSubmit={handleCreate} className="p-8 space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Full Name</label>
              <input
                name="name"
                required
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold text-slate-900 transition-all"
                placeholder="Francisca Worker"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold text-slate-900 transition-all"
                placeholder="worker@famyank.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold text-slate-900 transition-all"
                placeholder="Set a strong password"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-40"
            >
              {isCreating ? 'Creating...' : 'Create Worker'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight">Workers</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">{workers.length} worker account(s)</p>
          </div>
          <div className="p-4">
            {workers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-bold">
                No workers yet. Create one on the left.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                {workers.map(w => (
                  <div key={w.id} className="p-5 flex items-center justify-between bg-white">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">{w.name}</p>
                      <p className="text-xs text-slate-500 font-bold truncate">{w.email}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
                      Password Set
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: UserRole[] }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <PrivateLayout>{children}</PrivateLayout>;
};

const App = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicCatalog />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/staff" element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory" element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.WORKER]}>
              <InventoryManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/pos" element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.WORKER]}>
              <POSTerminal />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <ReportsPage />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
