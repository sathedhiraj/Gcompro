'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Package,
  Loader2,
} from 'lucide-react';
import BackButton from '@/components/layout/BackButton';
import type { Product, Review } from '@/types';

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function calcDiscount(price: number, comparePrice?: number) {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
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

function ProductCardMini({ product }: { product: Product }) {
  const { navigate } = useUIStore();
  const discount = calcDiscount(product.price, product.comparePrice);
  const image = product.images?.split(',')[0] || '/placeholder.png';

  return (
    <Card
      className="group cursor-pointer overflow-hidden border border-gray-200 transition-shadow hover:shadow-md"
      onClick={() => navigate('product-detail', { productId: product.id })}
    >
      <div className="aspect-square overflow-hidden bg-gray-50">
        <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <CardContent className="p-2">
        <h4 className="line-clamp-2 text-xs font-medium text-gray-900">{product.name}</h4>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-sm font-bold">{formatPrice(product.price)}</span>
          {discount > 0 && (
            <span className="text-xs text-green-600 font-medium">{discount}% off</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductDetailPage() {
  const { selectedProductId, navigate } = useUIStore();
  const { user, isLoggedIn } = useAuthStore();
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const inWishlist = product ? isInWishlist(product.id) : false;

  useEffect(() => {
    if (!selectedProductId) return;
    let cancelled = false;
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${selectedProductId}`);
        const data = await res.json();
        if (!cancelled) {
          const p: Product = data.product || data;
          setProduct(p);
          setQuantity(1);
          setSelectedImage(0);

          // Fetch similar products from same category
          if (p.categoryId) {
            try {
              const simRes = await fetch(`/api/products?category=${p.categoryId}&limit=4`);
              const simData = await simRes.json();
              if (!cancelled) {
                const prods: Product[] = (simData.products || []).filter((pr: Product) => pr.id !== p.id);
                setSimilarProducts(prods.slice(0, 4));
              }
            } catch {
              // Ignore similar products fetch error
            }
          }
        }
      } catch {
        // Ignore product fetch error
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchProduct();
    return () => { cancelled = true; };
  }, [selectedProductId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <Package className="h-16 w-16 text-gray-300" />
        <h3 className="mt-4 text-lg font-semibold text-gray-600">Product not found</h3>
        <Button onClick={() => navigate('products')} variant="outline" className="mt-4">
          Browse Products
        </Button>
      </div>
    );
  }

  const images = product.images ? product.images.split(',').filter(Boolean) : [];
  const discount = calcDiscount(product.price, product.comparePrice);
  const reviews: Review[] = product.reviews || [];

  const handleAddToCart = async () => {
    if (!isLoggedIn || !user) {
      navigate('login');
      return;
    }
    setAddingToCart(true);
    try {
      await addItem(user.id, product.id, quantity);
      toast({ title: 'Added to cart', description: `${product.name} has been added to your cart` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add item to cart. Please try again.', variant: 'destructive' });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn || !user) {
      navigate('login');
      return;
    }
    setBuyingNow(true);
    try {
      await addItem(user.id, product.id, quantity);
      navigate('checkout');
    } catch {
      toast({ title: 'Error', description: 'Failed to process. Please try again.', variant: 'destructive' });
      setBuyingNow(false);
    }
  };

  const handleWishlist = async () => {
    if (!isLoggedIn || !user) {
      navigate('login');
      return;
    }
    setTogglingWishlist(true);
    try {
      if (inWishlist) {
        const item = useWishlistStore.getState().items.find((i) => i.productId === product.id);
        if (item) await removeFromWishlist(item.id);
        toast({ title: 'Removed from wishlist' });
      } else {
        await addToWishlist(user.id, product.id);
        toast({ title: 'Added to wishlist' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update wishlist. Please try again.', variant: 'destructive' });
    } finally {
      setTogglingWishlist(false);
    }
  };

  // Rating breakdown calculation
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-sm text-gray-500">
          <BackButton fallbackPage="products" className="mr-1 -ml-2" />
          <button onClick={() => navigate('home')} className="hover:text-[#2874f0]">Home</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => navigate('products')} className="hover:text-[#2874f0]">Products</button>
          <ChevronRight className="h-3 w-3" />
          {product.category && (
            <>
              <button
                onClick={() => { useUIStore.getState().setProductFilters({ category: product.category!.slug }); navigate('products'); }}
                className="hover:text-[#2874f0]"
              >
                {product.category.name}
              </button>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-gray-800 line-clamp-1">{product.name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg border bg-white">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-contain p-4"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50">
                  <Package className="h-24 w-24 text-gray-300" />
                </div>
              )}
              {discount > 0 && (
                <Badge className="absolute left-3 top-3 bg-[#ff9f00] text-sm font-semibold text-white hover:bg-[#ff9f00]">
                  {discount}% OFF
                </Badge>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                      idx === selectedImage ? 'border-[#2874f0]' : 'border-gray-200'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            {product.brand && (
              <p className="mt-1 text-sm text-gray-500">Brand: <span className="font-medium text-gray-700">{product.brand}</span></p>
            )}

            {/* Rating */}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-0.5 text-sm font-semibold text-white">
                {product.rating.toFixed(1)} <Star className="h-3 w-3 fill-white" />
              </span>
              <span className="text-sm text-gray-500">
                {product.numReviews} Rating{product.numReviews !== 1 ? 's' : ''} & Reviews
              </span>
            </div>

            <Separator className="my-4" />

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
                    <span className="text-lg font-semibold text-green-600">{discount}% off</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500">Inclusive of all taxes</p>
            </div>

            {/* Stock Status */}
            <div className="mt-3">
              {product.stock > 10 ? (
                <Badge variant="outline" className="border-green-600 text-green-600">In Stock</Badge>
              ) : product.stock > 0 ? (
                <Badge variant="outline" className="border-orange-500 text-orange-500">Only {product.stock} left</Badge>
              ) : (
                <Badge variant="outline" className="border-red-500 text-red-500">Out of Stock</Badge>
              )}
            </div>

            {/* Quantity */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center rounded-md border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="flex h-8 w-10 items-center justify-center text-sm font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || addingToCart}
                className="flex-1 bg-[#ff9f00] py-6 text-base font-semibold text-white hover:bg-[#e89100]"
              >
                {addingToCart ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Adding...</>
                ) : (
                  <><ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart</>
                )}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={product.stock === 0 || buyingNow}
                className="flex-1 bg-[#fb641b] py-6 text-base font-semibold text-white hover:bg-[#e55a18]"
              >
                {buyingNow ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  'Buy Now'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleWishlist}
                disabled={togglingWishlist}
                className="px-4"
              >
                {togglingWishlist ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Heart className={`h-5 w-5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                )}
              </Button>
            </div>

            {/* Benefits */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 rounded-md bg-gray-50 p-3 text-center">
                <Truck className="h-5 w-5 text-[#2874f0]" />
                <span className="text-xs text-gray-600">Free Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-md bg-gray-50 p-3 text-center">
                <Shield className="h-5 w-5 text-[#2874f0]" />
                <span className="text-xs text-gray-600">1 Year Warranty</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-md bg-gray-50 p-3 text-center">
                <RotateCcw className="h-5 w-5 text-[#2874f0]" />
                <span className="text-xs text-gray-600">7 Day Return</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-8">
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-4">
              <Card className="p-6">
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                  {product.description || 'No description available for this product.'}
                </p>
              </Card>
            </TabsContent>
            <TabsContent value="specifications" className="mt-4">
              <Card className="p-6">
                <div className="grid gap-0">
                  {product.brand && (
                    <div className="flex border-b py-3">
                      <span className="w-1/3 text-sm font-medium text-gray-500">Brand</span>
                      <span className="w-2/3 text-sm text-gray-900">{product.brand}</span>
                    </div>
                  )}
                  {product.category && (
                    <div className="flex border-b py-3">
                      <span className="w-1/3 text-sm font-medium text-gray-500">Category</span>
                      <span className="w-2/3 text-sm text-gray-900">{product.category.name}</span>
                    </div>
                  )}
                  <div className="flex border-b py-3">
                    <span className="w-1/3 text-sm font-medium text-gray-500">Price</span>
                    <span className="w-2/3 text-sm text-gray-900">{formatPrice(product.price)}</span>
                  </div>
                  <div className="flex border-b py-3">
                    <span className="w-1/3 text-sm font-medium text-gray-500">Rating</span>
                    <span className="w-2/3 text-sm text-gray-900">{product.rating.toFixed(1)} / 5</span>
                  </div>
                  <div className="flex py-3">
                    <span className="w-1/3 text-sm font-medium text-gray-500">Availability</span>
                    <span className={`w-2/3 text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="reviews" className="mt-4">
              <Card className="p-6">
                {reviews.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500">No reviews yet for this product.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                    {/* Rating Summary */}
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900">{product.rating.toFixed(1)}</div>
                      <StarRating rating={product.rating} />
                      <p className="mt-1 text-sm text-gray-500">{product.numReviews} reviews</p>
                    </div>
                    {/* Rating Breakdown */}
                    <div className="space-y-2">
                      {ratingBreakdown.map(({ star, count }) => (
                        <div key={star} className="flex items-center gap-2">
                          <span className="w-6 text-sm text-gray-600">{star}★</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${reviews.length > 0 ? (count / reviews.length) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-8 text-sm text-gray-500">{count}</span>
                        </div>
                      ))}
                      <Separator className="my-4" />
                      {/* Individual Reviews */}
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b py-3 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-0.5 rounded bg-green-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                              {review.rating} <Star className="h-2.5 w-2.5 fill-white" />
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              {review.user?.name || 'Anonymous'}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Similar Products</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {similarProducts.map((p) => (
                <ProductCardMini key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
