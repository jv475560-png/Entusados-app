import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import { ClientLayout } from './shared/layouts/ClientLayout'
import { AdminLayout } from './shared/layouts/AdminLayout'
import { StaffShell } from './shared/layouts/StaffShell'
import { AdminGuard } from './shared/layouts/AdminGuard'
import { AdminLoginPage } from './apps/admin/AdminLoginPage'
import { MenuPage } from './apps/client/pages/MenuPage'
import { CartPage } from './apps/client/pages/CartPage'
import { CheckoutPage } from './apps/client/pages/CheckoutPage'
import { TrackingPage } from './apps/client/pages/TrackingPage'
import { OrderSuccessPage } from './apps/client/pages/OrderSuccessPage'
import { PosPage } from './apps/pos/PosPage'
import { KdsPage } from './apps/kds/KdsPage'
import { DashboardPage } from './apps/admin/pages/DashboardPage'
import { InventoryPage } from './apps/admin/pages/InventoryPage'
import { SuppliersPage } from './apps/admin/pages/SuppliersPage'
import { BreBPage } from './apps/admin/pages/BreBPage'
import { CashClosurePage } from './apps/admin/pages/CashClosurePage'
import { DeliveryCoveragePage } from './apps/admin/pages/DeliverySchedulePage'
import { ShiftChecklistsPage } from './apps/admin/pages/ShiftChecklistsPage'
import { PromotionsPage } from './apps/admin/pages/PromotionsPage'
import { Button } from './shared/ui/Button'

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-100 px-4 text-center">
      <p className="font-display text-6xl text-brand-500">404</p>
      <p className="mt-2 text-sm font-semibold text-ink-700">Esa página no existe.</p>
      <Link to="/" className="mt-4">
        <Button>Ir a la tienda</Button>
      </Link>
    </div>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ClientLayout />}>
          <Route path="/" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:orderId" element={<TrackingPage />} />
          <Route path="/success/:orderId" element={<OrderSuccessPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route
          path="/admin"
          element={
            <AdminGuard allow={['admin']}>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="promociones" element={<PromotionsPage />} />
          <Route path="inventario" element={<InventoryPage />} />
          <Route path="proveedores" element={<SuppliersPage />} />
          <Route path="pagos" element={<BreBPage />} />
          <Route path="contabilidad" element={<CashClosurePage />} />
          <Route path="checklists" element={<ShiftChecklistsPage />} />
          <Route path="cobertura" element={<DeliveryCoveragePage />} />
        </Route>

        <Route
          path="/admin/pos"
          element={
            <AdminGuard allow={['cashier', 'admin']}>
              <StaffShell dark />
            </AdminGuard>
          }
        >
          <Route index element={<PosPage />} />
        </Route>

        <Route
          path="/admin/kds"
          element={
            <AdminGuard allow={['kitchen', 'admin']}>
              <StaffShell dark />
            </AdminGuard>
          }
        >
          <Route index element={<KdsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
