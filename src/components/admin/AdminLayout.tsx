'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Image,
  Tag,
  Warehouse,
  Menu,
  Store,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminCategories from './AdminCategories';
import AdminOrders from './AdminOrders';
import AdminUsers from './AdminUsers';
import AdminBanners from './AdminBanners';
import AdminCoupons from './AdminCoupons';
import AdminInventory from './AdminInventory';

const navItems = [
  { page: 'admin-dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { page: 'admin-products' as const, label: 'Products', icon: Package },
  { page: 'admin-categories' as const, label: 'Categories', icon: FolderTree },
  { page: 'admin-orders' as const, label: 'Orders', icon: ShoppingCart },
  { page: 'admin-users' as const, label: 'Users', icon: Users },
  { page: 'admin-banners' as const, label: 'Banners', icon: Image },
  { page: 'admin-coupons' as const, label: 'Coupons', icon: Tag },
  { page: 'admin-inventory' as const, label: 'Inventory', icon: Warehouse },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { currentPage, navigate } = useUIStore();
  const { user, logout } = useAuthStore();
  const { clearCart } = useCartStore();
  const { clearWishlist } = useWishlistStore();
  const { toast } = useToast();

  const handleNavigate = (page: Parameters<typeof navigate>[0]) => {
    navigate(page);
    onNavigate?.();
  };

  const handleLogout = () => {
    logout();
    clearCart();
    clearWishlist();
    navigate('home');
    onNavigate?.();
    toast({
      title: 'Logged out',
      description: 'You have been signed out successfully.',
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
          G
        </div>
        <span className="text-lg font-bold text-white">G-Ecom</span>
        <span className="ml-1 rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
          Admin
        </span>
      </div>

      <Separator className="bg-gray-800" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            const Icon = item.icon;
            return (
              <button
                key={item.page}
                onClick={() => handleNavigate(item.page)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-gray-800" />

      {/* User info */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-600 text-white text-xs">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={() => handleNavigate('home')}
        >
          <Store className="mr-2 h-4 w-4" />
          Back to Store
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-gray-800 mt-1"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

function getPageTitle(page: string): string {
  const item = navItems.find((n) => n.page === page);
  return item?.label || 'Dashboard';
}

export default function AdminLayout() {
  const { currentPage } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-products':
        return <AdminProducts />;
      case 'admin-categories':
        return <AdminCategories />;
      case 'admin-orders':
        return <AdminOrders />;
      case 'admin-users':
        return <AdminUsers />;
      case 'admin-banners':
        return <AdminBanners />;
      case 'admin-coupons':
        return <AdminCoupons />;
      case 'admin-inventory':
        return <AdminInventory />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-gray-900 lg:block">
        <SidebarNav />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 shadow-sm">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-gray-900 p-0 border-gray-800">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
            G
          </div>
          <span className="font-semibold text-gray-900">{getPageTitle(currentPage)}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Page Title - Desktop */}
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold text-gray-900">{getPageTitle(currentPage)}</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your e-commerce store</p>
          </div>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
