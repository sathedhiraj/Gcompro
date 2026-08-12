'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { Star, Heart, ShoppingCart, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import type { Product, Category, Banner } from '@/types';

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function calcDiscount(price: number, comparePrice?: number) {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { navigate } = useUIStore();
  const { user, isLoggedIn } = useAuthStore();
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);
  const discount = calcDiscount(product.price, product.comparePrice);
  const image = product.images?.split(',')[0] || '/placeholder.png';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn || !user) {
      navigate('login');
      return;
    }
    await addItem(user.id, product.id);
    toast({ title: 'Added to cart', description: `${product.name} has been added to your cart` });
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn || !user) {
      navigate('login');
      return;
    }
    if (inWishlist) {
      const item = useWishlistStore.getState().items.find((i) => i.productId === product.id);
      if (item) await removeFromWishlist(item.id);
      toast({ title: 'Removed from wishlist' });
    } else {
      await addToWishlist(user.id, product.id);
      toast({ title: 'Added to wishlist', description: `${product.name} has been added to your wishlist` });
    }
  };

  return (
    <Card
      className="group cursor-pointer overflow-hidden border border-gray-200 transition-shadow hover:shadow-lg"
      onClick={() => navigate('product-detail', { productId: product.id })}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        {discount > 0 && (
          <Badge className="absolute left-2 top-2 bg-[#ff9f00] text-xs font-semibold text-white hover:bg-[#ff9f00]">
            {discount}% OFF
          </Badge>
        )}
        <button
          onClick={handleWishlist}
          className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 shadow-sm transition-colors hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
        </button>
      </div>
      <CardContent className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
        {product.brand && (
          <p className="mt-0.5 text-xs text-gray-500">{product.brand}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-0.5 rounded bg-green-600 px-1.5 py-0.5 text-xs font-semibold text-white">
              {product.rating.toFixed(1)} <Star className="h-2.5 w-2.5 fill-white" />
            </span>
            <span className="text-xs text-gray-500">({product.numReviews})</span>
          </div>
        </div>
        <Button
          onClick={handleAddToCart}
          size="sm"
          className="mt-3 w-full bg-[#ff9f00] text-white hover:bg-[#e89100]"
        >
          <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden border border-gray-200">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-3">
        <Skeleton className="mb-2 h-4 w-3/4" />
        <Skeleton className="mb-1 h-3 w-1/2" />
        <Skeleton className="mb-1 h-5 w-2/3" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { navigate, setProductFilters } = useUIStore();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [topRated, setTopRated] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bannersRes, catRes, dealsRes, topRes, newRes] = await Promise.all([
          fetch('/api/banners'),
          fetch('/api/categories'),
          fetch('/api/products?sort=featured&limit=8'),
          fetch('/api/products?sort=rating&limit=8'),
          fetch('/api/products?sort=newest&limit=8'),
        ]);

        const bannersData = await bannersRes.json();
        const catData = await catRes.json();
        const dealsData = await dealsRes.json();
        const topData = await topRes.json();
        const newData = await newRes.json();

        setBanners(bannersData.banners || bannersData || []);
        setCategories(catData.categories || catData || []);
        setDeals(dealsData.products || []);
        setTopRated(topData.products || []);
        setNewArrivals(newData.products || []);
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate banner
  const nextBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev + 1) % (banners.length || 1));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(nextBanner, 4000);
    return () => clearInterval(timer);
  }, [banners.length, nextBanner]);

  const handleCategoryClick = (categorySlug: string) => {
    setProductFilters({ category: categorySlug });
    navigate('products');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Carousel */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          {loading ? (
            <Skeleton className="h-48 w-full rounded-lg sm:h-64 md:h-80" />
          ) : banners.length > 0 ? (
            <div className="relative overflow-hidden rounded-lg">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentBanner * 100}%)` }}
              >
                {banners.map((banner) => (
                  <div key={banner.id} className="w-full flex-shrink-0">
                    <div
                      className="relative h-48 sm:h-64 md:h-80 w-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${banner.image})`,
                        backgroundColor: '#2874f0',
                      }}
                    >
                      <div className="absolute inset-0 flex flex-col items-start justify-center bg-gradient-to-r from-black/40 to-transparent p-6 md:p-12">
                        <h2 className="text-xl font-bold text-white md:text-3xl">{banner.title}</h2>
                        {banner.subtitle && (
                          <p className="mt-2 text-sm text-gray-200 md:text-lg">{banner.subtitle}</p>
                        )}
                        {banner.link && (
                          <Button className="mt-4 bg-[#ff9f00] text-white hover:bg-[#e89100]">
                            Shop Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextBanner}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentBanner(idx)}
                        className={`h-2 rounded-full transition-all ${idx === currentBanner ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg bg-gradient-to-r from-[#2874f0] to-[#1a5dc8] sm:h-64 md:h-80">
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold md:text-4xl">Welcome to G-Ecom</h2>
                <p className="mt-2 text-blue-200">Shop the best deals online</p>
                <Button
                  onClick={() => navigate('products')}
                  className="mt-4 bg-[#ff9f00] text-white hover:bg-[#e89100]"
                >
                  Shop Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="bg-white py-6">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Shop by Category pritamjhjhjkhjkhjkhjkhjkh</h2>
          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-28 flex-shrink-0 rounded-lg" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="flex flex-shrink-0 flex-col items-center gap-2 rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-10 w-10 object-contain" />
                    ) : (
                      <Package className="h-8 w-8 text-[#2874f0]" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Deals of the Day */}
      <section className="bg-white py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">Deals of the Day</h2>
              <Badge className="bg-[#ff9f00] text-white hover:bg-[#e89100]">HOT</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setProductFilters({ sort: 'featured' }); navigate('products'); }}
              className="text-[#2874f0]"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : deals.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Top Rated */}
      <section className="bg-gray-50 py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Top Rated</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setProductFilters({ sort: 'rating' }); navigate('products'); }}
              className="text-[#2874f0]"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : topRated.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="bg-white py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">New Arrivals</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setProductFilters({ sort: 'newest' }); navigate('products'); }}
              className="text-[#2874f0]"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : newArrivals.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="bg-gradient-to-r from-[#ff9f00] to-[#f0c14b] py-8">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">Super Saver Deals</h2>
          <p className="mt-2 text-white/90">Get up to 70% off on top brands. Limited time offer!</p>
          <Button
            onClick={() => navigate('products')}
            className="mt-4 bg-white text-[#ff9f00] hover:bg-gray-100"
            size="lg"
          >
            Shop Now
          </Button>
        </div>
      </section>
    </div>
  );
}


