---
Task ID: 1
Agent: Main Agent
Task: Add Cancel Order button for users + Fix Add to Cart/Buy Now/Wishlist buttons + Fix CheckoutPage shipping address

Work Log:
- Explored project structure and identified key files
- Analyzed uploaded screenshot (cancelled.png) - shows Order Detail page with PENDING order
- Found root cause of Add to Cart/Buy Now/Wishlist "not working": Layout.tsx used wrong Toaster component (Sonner instead of shadcn/ui toaster)
- Fixed Toaster mismatch in layout.tsx (changed from @/components/ui/sonner to @/components/ui/toaster)
- Added Cancel Order button with confirmation dialog to OrderDetailPage.tsx
- Added Cancel Order button with confirmation dialog to OrdersPage.tsx
- Added stock restoration logic to PUT /api/orders/:id when order is cancelled
- Fixed CheckoutPage shipping address bug (was sending individual fields instead of shippingAddress object)
- Added loading states (addingToCart, buyingNow, togglingWishlist) to ProductDetailPage buttons
- Added error handling with toast notifications for cart/wishlist operations
- Verified all fixes with Playwright browser testing

Stage Summary:
- Cancel Order button added to both OrderDetailPage and OrdersPage with AlertDialog confirmation
- Stock is restored when an order is cancelled
- Add to Cart, Buy Now, and Wishlist buttons now work with proper toast notifications
- Root cause was Toaster component mismatch in layout.tsx
- CheckoutPage shipping address now correctly passed as object to match API expectations
- All lint checks pass, no dev server errors
