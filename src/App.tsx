import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import MenuItems from "./pages/MenuItems";
import Categories from "./pages/Categories";
import Areas from "./pages/Areas";
import KOT from "./pages/KOT";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import Clients from "./pages/Clients";
import Billing from "./pages/Billing";
import Expenses from "./pages/Expenses";
import ExpenseCategories from "./pages/ExpenseCategories";
import Personal from "./pages/Personal";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import CashRegister from "./pages/CashRegister";
import AuditLog from "./pages/AuditLog";
import QrCodes from "./pages/QrCodes";
import DigitalMenu from "./pages/DigitalMenu";
import ServiceRequests from "./pages/ServiceRequests";
import PlaceholderPage from "./components/PlaceholderPage";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/reservaciones" element={<PlaceholderPage title="Reservaciones" description="Administra las reservaciones de mesas y eventos especiales." />} />
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
            <Route path="/informe-articulos" element={<PlaceholderPage title="Informe de Artículos" description="Reportes detallados de rendimiento por artículo." />} />
            <Route path="/informe-categorias" element={<PlaceholderPage title="Informe de Categorías" description="Análisis de rendimiento por categoría de producto." />} />
            <Route path="/informe-gastos" element={<PlaceholderPage title="Informe de Gastos" description="Reportes detallados de gastos operativos." />} />
            <Route path="/ajustes" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
