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

---
Task ID: 2
Agent: Main Agent
Task: Diagnose & fix EC2 "Add to Cart" Prisma error (user deployed G-Ecom to EC2 via Ansible+Nginx)

Work Log:
- Analyzed uploaded screenshot (1000274170.jpg) using VLM skill
- Identified error: PrismaClientUnknownRequestError at prisma.cartItem.create() with SQLite extended_code: 8
- Decoded SQLite error code 8 = SQLITE_READONLY ("attempt to write a readonly database")
- Root cause: On EC2, the Next.js process can READ db/custom.db but CANNOT WRITE to it
- Investigated src/app/api/cart/route.ts (reads via findFirst succeed, write via create fails)
- Investigated prisma/schema.prisma (schema is correct - CartItem model exists)
- Investigated src/lib/db.ts (standard singleton PrismaClient)
- Investigated .env (DATABASE_URL was hardcoded to /home/z/my-project/db/custom.db, wrong for EC2 path /G-Ecom)
- Investigated package.json (production uses standalone output: .next/standalone/server.js)
- Created deploy-fix.sh - a self-contained bash script that:
  * Auto-detects the app user (pm2 / systemd / ubuntu / www-data)
  * Fixes ownership: chown -R <appuser>:<appgroup> db/
  * Fixes permissions: chmod 775 db/, chmod 664 custom.db
  * Removes stale -journal/-wal/-shm sidecar files
  * Rewrites DATABASE_URL in .env to the correct EC2 absolute path
  * Runs prisma generate + prisma db push to ensure schema is up to date
  * Restarts the app (systemd / pm2) and prints verification
- Updated .env with detailed deployment comments (kept local DATABASE_URL intact)

Stage Summary:
- Root cause is 100% a file-permission/ownership problem, NOT a code bug
- SQLite needs WRITE access to BOTH the .db file AND its parent directory
- deploy-fix.sh created at project root for the user to run on EC2 with: sudo bash deploy-fix.sh
- Local dev server verified unaffected (200 responses, cart reads working)
- No application code changes were needed - only ops/deployment fixes
