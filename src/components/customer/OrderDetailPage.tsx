'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, MapPin, CreditCard, Package, XCircle, Loader2 } from 'lucide-react';
import BackButton from '@/components/layout/BackButton';
import type { Order } from '@/types';

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  PROCESSING: 'bg-blue-100 text-blue-700 border-blue-200',
  SHIPPED: 'bg-purple-100 text-purple-700 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
};

const paymentMethodLabels: Record<string, string> = {
  COD: 'Cash on Delivery',
  CARD: 'Credit / Debit Card',
  UPI: 'UPI',
  NETBANKING: 'Net Banking',
};

export default function OrderDetailPage() {
  const { selectedOrderId, navigate } = useUIStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!selectedOrderId) return;
    let cancelled = false;
    const loadOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${selectedOrderId}`);
        const data = await res.json();
        if (!cancelled) setOrder(data.order || data);
      } catch {
        if (!cancelled) toast({ title: 'Error', description: 'Failed to load order details', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadOrder();
    return () => { cancelled = true; };
  }, [selectedOrderId, toast]);

  const handleCancelOrder = async () => {
    if (!order || !user) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          paymentStatus: order.paymentStatus === 'COMPLETED' ? 'REFUNDED' : order.paymentStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data.order || { ...order, status: 'CANCELLED', paymentStatus: order.paymentStatus === 'COMPLETED' ? 'REFUNDED' : order.paymentStatus });
        toast({ title: 'Order Cancelled', description: `Order #${order.id.slice(-8).toUpperCase()} has been cancelled successfully.` });
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to cancel order', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <Package className="h-16 w-16 text-gray-300" />
        <h3 className="mt-4 text-lg font-semibold text-gray-600">Order not found</h3>
        <Button onClick={() => navigate('orders')} variant="outline" className="mt-4">
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <BackButton fallbackPage="orders" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
          </div>
          <Badge variant="outline" className={`ml-auto ${statusColors[order.status] || ''}`}>
            {order.status}
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-[#2874f0]" />
                Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items?.map((item) => {
                  const image = item.product?.images?.split(',')[0] || '/placeholder.png';
                  return (
                    <div key={item.id} className="flex gap-4 border-b pb-3 last:border-0 last:pb-0">
                      <button
                        onClick={() => item.product && navigate('product-detail', { productId: item.productId })}
                        className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-50"
                      >
                        <img src={image} alt={item.product?.name || 'Product'} className="h-full w-full object-cover" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => item.product && navigate('product-detail', { productId: item.productId })}
                          className="text-sm font-medium text-gray-900 hover:text-[#2874f0] text-left line-clamp-1"
                        >
                          {item.product?.name || 'Product'}
                        </button>
                        <p className="mt-0.5 text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                        <p className="text-xs text-gray-500">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-[#2874f0]" /> Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700">
                <p>{order.shippingStreet}</p>
                <p>{order.shippingCity}, {order.shippingState} - {order.shippingZipCode}</p>
                <p>{order.shippingCountry}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-[#2874f0]" /> Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
                  </p>
                  <p className="text-xs text-gray-500">Payment Status</p>
                </div>
                <Badge className={paymentStatusColors[order.paymentStatus] || ''}>
                  {order.paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Price Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Discount</span>
                  <span className="text-green-600">-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className={order.shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax (18% GST)</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              {order.couponCode && (
                <p className="text-xs text-gray-400">Coupon applied: {order.couponCode}</p>
              )}
            </CardContent>
          </Card>

          {/* Cancel Order Button */}
          {order.status === 'PENDING' || order.status === 'PROCESSING' ? (
            <Card className="border-red-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Want to cancel this order?</p>
                    <p className="text-xs text-gray-500">Once cancelled, this action cannot be undone.</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={cancelling}
                        className="gap-2"
                      >
                        {cancelling ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Cancelling...</>
                        ) : (
                          <><XCircle className="h-4 w-4" /> Cancel Order</>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel order #{order.id.slice(-8).toUpperCase()}? This action cannot be undone and the order will be marked as cancelled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Order</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelOrder}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Yes, Cancel Order
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Back Button */}
          <Button
            onClick={() => navigate('orders')}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Orders
          </Button>
        </div>
      </div>
    </div>
  );
}
