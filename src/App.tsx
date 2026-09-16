import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import AppLayout from "./components/AppLayout";
import PlaceholderPage from "./components/PlaceholderPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MenuItems = lazy(() => import("./pages/MenuItems"));
const Categories = lazy(() => import("./pages/Categories"));
const Areas = lazy(() => import("./pages/Areas"));
const KOT = lazy(() => import("./pages/KOT"));
const Orders = lazy(() => import("./pages/Orders"));
const Tables = lazy(() => import("./pages/Tables"));
const Clients = lazy(() => import("./pages/Clients"));
const Billing = lazy(() => import("./pages/Billing"));
const Expenses = lazy(() => import("./pages/Expenses"));
const ExpenseCategories = lazy(() => import("./pages/ExpenseCategories"));
const Personal = lazy(() => import("./pages/Personal"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const CashRegister = lazy(() => import("./pages/CashRegister"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const QrCodes = lazy(() => import("./pages/QrCodes"));
const DigitalMenu = lazy(() => import("./pages/DigitalMenu"));
const ServiceRequests = lazy(() => import("./pages/ServiceRequests"));
const Reservaciones = lazy(() => import("./pages/Reservaciones"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={
            <div className="flex h-screen w-screen items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          }>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/menu/:slug" element={<DigitalMenu />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/menus" element={<PlaceholderPage title="Menús" description="Gestiona los menús de tu restaurante. Crea menús para desayuno, almuerzo, cena y más." />} />
            <Route path="/menu-items" element={<MenuItems />} />
            <Route path="/categorias" element={<Categories />} />
            <Route path="/modificadores" element={<PlaceholderPage title="Modificadores" description="Configura modificadores como extras, tamaños y opciones personalizadas." />} />
            <Route path="/areas" element={<Areas />} />
            <Route path="/mesas" element={<Tables />} />
            <Route path="/codigos-qr" element={<QrCodes />} />
            <Route path="/solicitudes" element={<ServiceRequests />} />
            <Route path="/reservaciones" element={<Reservaciones />} />
            <Route path="/ordenes" element={<Orders />} />
            <Route path="/facturacion" element={<Billing />} />
            <Route path="/kot" element={<KOT />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/personal" element={<Personal />} />
            <Route path="/delivery" element={<PlaceholderPage title="Ejecutivo de Entrega" description="Administra los repartidores y sus asignaciones de delivery." />} />
            <Route path="/gastos" element={<Expenses />} />
            <Route path="/categorias-gastos" element={<ExpenseCategories />} />
            <Route path="/caja" element={<CashRegister />} />
            <Route path="/pagos" element={<PlaceholderPage title="Pagos" description="Gestiona todos los pagos recibidos y métodos de pago." />} />
            <Route path="/debidos" element={<PlaceholderPage title="Debidos" description="Controla las cuentas por cobrar y pagos pendientes." />} />
            <Route path="/auditoria" element={<AuditLog />} />
            <Route path="/informe-ventas" element={<Reports />} />
            <Route path="/informe-articulos" element={<Reports />} />
            <Route path="/informe-categorias" element={<Reports />} />
            <Route path="/informe-gastos" element={<Reports />} />
            <Route path="/ajustes" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
