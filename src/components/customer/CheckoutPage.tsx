'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  CreditCard,
  Truck,
  Tag,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import BackButton from '@/components/layout/BackButton';

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

type PaymentMethod = 'COD' | 'CARD' | 'UPI' | 'NETBANKING';

export default function CheckoutPage() {
  const { navigate } = useUIStore();
  const { user, isLoggedIn } = useAuthStore();
  const { items, getTotal, getItemCount, clearCart } = useCartStore();
  const { toast } = useToast();

  const [street, setStreet] = useState(user?.street || '');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [zipCode, setZipCode] = useState(user?.zipCode || '');
  const [country, setCountry] = useState(user?.country || 'India');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const subtotal = getTotal();
  const itemCount = getItemCount();
  const shipping = subtotal > 500 ? 0 : 49;
  const discount = items.reduce((acc, item) => {
    if (item.product.comparePrice && item.product.comparePrice > item.product.price) {
      return acc + (item.product.comparePrice - item.product.price) * item.quantity;
    }
    return acc;
  }, 0);
  const total = subtotal - couponDiscount + shipping;

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('login');
    }
  }, [isLoggedIn, navigate]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });

      const data = await res.json();
      if (res.ok) {
        setCouponDiscount(data.discountAmount || 0);
        setAppliedCoupon(couponCode);
        toast({ title: 'Coupon applied!', description: `You saved ${formatPrice(data.discountAmount || 0)}` });
      } else {
        setCouponError(data.error || 'Invalid coupon');
        setCouponDiscount(0);
        setAppliedCoupon('');
      }
    } catch {
      setCouponError('Failed to validate coupon');
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) return;
    if (!street || !city || !state || !zipCode) {
      toast({ title: 'Missing address', description: 'Please fill in all address fields', variant: 'destructive' });
      return;
    }

    setPlacingOrder(true);
    try {
      const orderData: Record<string, unknown> = {
        userId: user.id,
        shippingAddress: {
          street,
          city,
          state,
          zipCode,
          country,
        },
        paymentMethod,
      };

      if (appliedCoupon) {
        orderData.couponCode = appliedCoupon;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      if (res.ok) {
        clearCart();
        setOrderId(data.order?.id || data.id || '');
        setShowSuccess(true);
      } else {
        toast({ title: 'Order failed', description: data.error || 'Could not place order', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Order failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setPlacingOrder(false);
    }
  };

  if (items.length === 0 && !showSuccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Truck className="h-16 w-16 text-gray-300" />
        <h3 className="mt-4 text-lg font-semibold text-gray-600">Your cart is empty</h3>
        <Button onClick={() => navigate('products')} className="mt-4 bg-[#2874f0] text-white hover:bg-[#1a5dc8]">
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <BackButton fallbackPage="cart" />
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Shipping & Payment */}
          <div className="space-y-6 lg:col-span-2">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5 text-[#2874f0]" /> Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="400001"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="India"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-[#2874f0]" /> Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-gray-50 has-[data-state=checked]:border-[#2874f0] has-[data-state=checked]:bg-blue-50">
                      <RadioGroupItem value="COD" />
                      <div>
                        <p className="text-sm font-medium">Cash on Delivery</p>
                        <p className="text-xs text-gray-500">Pay when your order arrives</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-gray-50 has-[data-state=checked]:border-[#2874f0] has-[data-state=checked]:bg-blue-50">
                      <RadioGroupItem value="CARD" />
                      <div>
                        <p className="text-sm font-medium">Credit / Debit Card</p>
                        <p className="text-xs text-gray-500">Visa, Mastercard, Rupay</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-gray-50 has-[data-state=checked]:border-[#2874f0] has-[data-state=checked]:bg-blue-50">
                      <RadioGroupItem value="UPI" />
                      <div>
                        <p className="text-sm font-medium">UPI</p>
                        <p className="text-xs text-gray-500">Google Pay, PhonePe, Paytm</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-gray-50 has-[data-state=checked]:border-[#2874f0] has-[data-state=checked]:bg-blue-50">
                      <RadioGroupItem value="NETBANKING" />
                      <div>
                        <p className="text-sm font-medium">Net Banking</p>
                        <p className="text-xs text-gray-500">All major banks supported</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Right: Order Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Items Preview */}
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {items.map((item) => {
                    const image = item.product.images?.split(',')[0] || '/placeholder.png';
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <img src={image} alt={item.product.name} className="h-12 w-12 rounded-md object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{item.product.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({itemCount} items)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Product Discount</span>
                    <span className="text-green-600">-{formatPrice(discount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Coupon ({appliedCoupon})</span>
                    <span className="text-green-600">-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                    {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                {/* Coupon */}
                {!appliedCoupon && (
                  <div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Coupon code"
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                          className="pl-8 text-sm"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={!couponCode.trim()}>
                        Apply
                      </Button>
                    </div>
                    {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">{appliedCoupon}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCouponDiscount(0); setAppliedCoupon(''); setCouponCode(''); }}
                      className="text-red-500 h-auto p-0"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  className="w-full bg-[#fb641b] py-6 text-base font-semibold text-white hover:bg-[#e55a18]"
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing Order...
                    </>
                  ) : (
                    `Place Order - ${formatPrice(total)}`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <DialogTitle className="text-2xl">Order Placed!</DialogTitle>
            <DialogDescription className="text-gray-500">
              Your order has been placed successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-gray-600">
              Order ID: <span className="font-mono font-semibold">{orderId}</span>
            </p>
            <p className="text-sm text-gray-500">
              Payment: {paymentMethod === 'COD' ? 'Cash on Delivery' : paymentMethod === 'CARD' ? 'Credit/Debit Card' : paymentMethod === 'UPI' ? 'UPI' : 'Net Banking'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => { setShowSuccess(false); navigate('orders'); }}
              className="flex-1 bg-[#2874f0] text-white hover:bg-[#1a5dc8]"
            >
              View Orders
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowSuccess(false); navigate('home'); }}
              className="flex-1"
            >
              Continue Shopping
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
