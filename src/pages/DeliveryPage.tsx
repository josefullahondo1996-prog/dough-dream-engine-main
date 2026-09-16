import { useState, useEffect } from "react";
import {
  Truck,
  UserCheck,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  Plus,
  Search,
  Bike,
  DollarSign,
  PackageCheck,
  User,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: "Disponible" | "En Ruta" | "Fuera de Servicio";
  deliveriesToday: number;
}

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  phone: string;
  address: string;
  total: number;
  status: "Pendiente" | "En Preparación" | "En Camino" | "Entregado" | "Cancelado";
  driverId?: string;
  driverName?: string;
  createdAt: string;
  estimatedMinutes: number;
}

const INITIAL_DRIVERS: Driver[] = [
  { id: "d1", name: "Marcos Benítez", phone: "0981 123 456", vehicle: "Moto", status: "En Ruta", deliveriesToday: 8 },
  { id: "d2", name: "Lucas Ramírez", phone: "0971 654 321", vehicle: "Moto", status: "Disponible", deliveriesToday: 12 },
  { id: "d3", name: "Diego González", phone: "0992 888 777", vehicle: "Bicicleta", status: "Disponible", deliveriesToday: 5 },
  { id: "d4", name: "Gabriel Duarte", phone: "0983 444 555", vehicle: "Auto", status: "Fuera de Servicio", deliveriesToday: 3 },
];

const INITIAL_DELIVERIES: DeliveryOrder[] = [
  {
    id: "del-1",
    orderNumber: "ORD-9012",
    clientName: "Sofía Villalba",
    phone: "0981 999 111",
    address: "Av. Mariscal López 2450, Piso 3",
    total: 85000,
    status: "En Camino",
    driverId: "d1",
    driverName: "Marcos Benítez",
    createdAt: "20:40",
    estimatedMinutes: 15,
  },
  {
    id: "del-2",
    orderNumber: "ORD-9015",
    clientName: "Rodrigo Giménez",
    phone: "0972 555 888",
    address: "España e/ Brasilia 1020",
    total: 120000,
    status: "En Preparación",
    createdAt: "20:55",
    estimatedMinutes: 25,
  },
  {
    id: "del-3",
    orderNumber: "ORD-9008",
    clientName: "Camila Ortiz",
    phone: "0985 777 222",
    address: "San Martín 450",
    total: 65000,
    status: "Pendiente",
    createdAt: "21:05",
    estimatedMinutes: 35,
  },
  {
    id: "del-4",
    orderNumber: "ORD-8995",
    clientName: "Andrés Ferreira",
    phone: "0991 333 444",
    address: "Boggiani 5800",
    total: 145000,
    status: "Entregado",
    driverId: "d2",
    driverName: "Lucas Ramírez",
    createdAt: "19:50",
    estimatedMinutes: 0,
  },
];

export default function DeliveryPage() {
  const { restaurant } = useAuth();
  const [activeTab, setActiveTab] = useState<"pedidos" | "repartidores">("pedidos");
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>(() => {
    const saved = localStorage.getItem("delivery_orders_list");
    return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
  });
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem("delivery_drivers_list");
    return saved ? JSON.parse(saved) : INITIAL_DRIVERS;
  });
  const [dbMenuItems, setDbMenuItems] = useState<{ id: string; name: string; price: number }[]>([]);

  useEffect(() => {
    localStorage.setItem("delivery_orders_list", JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem("delivery_drivers_list", JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    if (!restaurant?.id) return;
    supabase
      .from("menu_items")
      .select("id, name, price")
      .eq("restaurant_id", restaurant.id)
      .then(({ data }) => {
        if (data) setDbMenuItems(data);
      });
  }, [restaurant]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  // Modales
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  // Formularios
  const [newOrderForm, setNewOrderForm] = useState({
    clientName: "",
    phone: "",
    address: "",
    total: "",
    driverId: "",
  });

  const [newDriverForm, setNewDriverForm] = useState({
    name: "",
    phone: "",
    vehicle: "Moto",
    customVehicle: "",
  });

  const filteredDeliveries = deliveries.filter((d) => {
    const matchSearch =
      d.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.clientName.toLowerCase().includes(search.toLowerCase()) ||
      d.address.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeDeliveriesCount = deliveries.filter((d) => d.status === "En Camino" || d.status === "En Preparación").length;
  const pendingCount = deliveries.filter((d) => d.status === "Pendiente").length;
  const totalRevenue = deliveries.filter((d) => d.status === "Entregado").reduce((sum, d) => sum + d.total, 0);

  const updateOrderStatus = (orderId: string, newStatus: DeliveryOrder["status"]) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === orderId ? { ...d, status: newStatus } : d))
    );
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.clientName.trim() || !newOrderForm.address.trim()) return;

    const assignedDriver = drivers.find((d) => d.id === newOrderForm.driverId);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const newOrder: DeliveryOrder = {
      id: `del-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: newOrderForm.clientName.trim(),
      phone: newOrderForm.phone.trim() || "0981 000 000",
      address: newOrderForm.address.trim(),
      total: Number(newOrderForm.total) || 50000,
      status: assignedDriver ? "En Camino" : "Pendiente",
      driverId: assignedDriver?.id,
      driverName: assignedDriver?.name,
      createdAt: timeStr,
      estimatedMinutes: 25,
    };

    setDeliveries((prev) => [newOrder, ...prev]);
    setIsNewOrderModalOpen(false);
    setNewOrderForm({ clientName: "", phone: "", address: "", total: "", driverId: "" });
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverForm.name.trim()) return;

    const finalVehicle =
      newDriverForm.vehicle === "Otro"
        ? newDriverForm.customVehicle.trim() || "Otro Vehículo"
        : newDriverForm.vehicle;

    const newDriver: Driver = {
      id: `dr-${Date.now()}`,
      name: newDriverForm.name.trim(),
      phone: newDriverForm.phone.trim() || "0981 000 000",
      vehicle: finalVehicle,
      status: "Disponible",
      deliveriesToday: 0,
    };

    setDrivers((prev) => [...prev, newDriver]);
    setIsNewDriverModalOpen(false);
    setNewDriverForm({ name: "", phone: "", vehicle: "Moto", customVehicle: "" });
  };

  const handleAssignDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedDriverId) return;

    const driver = drivers.find((dr) => dr.id === selectedDriverId);

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === selectedOrder.id
          ? {
              ...d,
              driverId: driver?.id,
              driverName: driver?.name,
              status: "En Camino",
            }
          : d
      )
    );

    setDrivers((prev) =>
      prev.map((dr) =>
        dr.id === selectedDriverId
          ? { ...dr, status: "En Ruta", deliveriesToday: dr.deliveriesToday + 1 }
          : dr
      )
    );

    setSelectedOrder(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-orange-500" />
            Gestión de Delivery y Repartidores
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitorea los pedidos a domicilio, asignación de choferes y estados de despacho en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "pedidos" ? (
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo Pedido Delivery
            </button>
          ) : (
            <button
              onClick={() => setIsNewDriverModalOpen(true)}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Registrar Chofer
            </button>
          )}

          {/* Tab Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl border border-gray-200 dark:border-zinc-700">
            <button
              onClick={() => setActiveTab("pedidos")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2",
                activeTab === "pedidos"
                  ? "bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              )}
            >
              <PackageCheck className="w-4 h-4" /> Envíos ({deliveries.length})
            </button>
            <button
              onClick={() => setActiveTab("repartidores")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2",
                activeTab === "repartidores"
                  ? "bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              )}
            >
              <Bike className="w-4 h-4" /> Repartidores ({drivers.length})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">En Curso</span>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white">{activeDeliveriesCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Sin Asignar</span>
            <p className="text-xl font-extrabold text-amber-600">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Repartidores Libres</span>
            <p className="text-xl font-extrabold text-emerald-600">
              {drivers.filter((d) => d.status === "Disponible").length} / {drivers.length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Recaudado hoy</span>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white">
              Gs. {totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab: Envíos */}
      {activeTab === "pedidos" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por orden, cliente o dirección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-transparent text-sm border-none focus:outline-none dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm font-medium dark:text-white"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Preparación">En Preparación</option>
              <option value="En Camino">En Camino</option>
              <option value="Entregado">Entregado</option>
            </select>
          </div>

          {/* Delivery Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredDeliveries.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-gray-900 dark:text-white">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-gray-400">({order.createdAt} hs)</span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-1">
                        {order.clientName}
                      </h4>
                    </div>

                    <span
                      className={cn(
                        "px-3 py-1 text-xs font-bold rounded-full border",
                        order.status === "En Camino" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400",
                        order.status === "En Preparación" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400",
                        order.status === "Pendiente" && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400",
                        order.status === "Entregado" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400"
                      )}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="font-medium truncate">{order.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{order.phone}</span>
                    </div>
                  </div>

                  {/* Driver info */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Bike className="w-4 h-4 text-gray-400" />
                      {order.driverName ? (
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Repartidor: {order.driverName}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Sin repartidor asignado
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                      Gs. {order.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                  {order.status !== "Entregado" && (
                    <>
                      {!order.driverName && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setSelectedDriverId(drivers.find((d) => d.status === "Disponible")?.id || "");
                          }}
                          className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Bike className="w-3.5 h-3.5" /> Asignar Repartidor
                        </button>
                      )}

                      {order.status === "En Camino" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Entregado")}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Entregado
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab: Repartidores */}
      {activeTab === "repartidores" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    "px-2.5 py-0.5 text-[10px] font-bold rounded-full border",
                    driver.status === "Disponible" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400",
                    driver.status === "En Ruta" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400",
                    driver.status === "Fuera de Servicio" && "bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-gray-400"
                  )}
                >
                  {driver.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">{driver.name}</h3>
                <p className="text-xs text-gray-500">{driver.phone}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-gray-500">Vehículo: <strong className="text-gray-900 dark:text-white">{driver.vehicle}</strong></span>
                <span className="text-gray-500">Entregas: <strong className="text-orange-600">{driver.deliveriesToday}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Nuevo Pedido Delivery */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-orange-500" /> Registrar Nuevo Pedido Delivery
              </h3>
              <button onClick={() => setIsNewOrderModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofía Villalba"
                  value={newOrderForm.clientName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, clientName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 0981 123 456"
                    value={newOrderForm.phone}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Monto Total (Gs.)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 85000"
                    value={newOrderForm.total}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, total: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Dirección Completa de Entrega
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej: Av. España 1230 e/ Brasilia, Apt 4B"
                  value={newOrderForm.address}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Asignar Repartidor (Opcional)
                </label>
                <select
                  value={newOrderForm.driverId}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, driverId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Sin asignar por ahora</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.vehicle}) — {d.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Crear Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Chofer */}
      {isNewDriverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Bike className="w-5 h-5 text-orange-500" /> Registrar Nuevo Repartidor
              </h3>
              <button onClick={() => setIsNewDriverModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Carlos Franco"
                  value={newDriverForm.name}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej: 0981 444 333"
                  value={newDriverForm.phone}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Vehículo
                </label>
                <select
                  value={newDriverForm.vehicle}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="Moto">Moto</option>
                  <option value="Bicicleta">Bicicleta</option>
                  <option value="Auto">Auto</option>
                  <option value="Camioneta">Camioneta</option>
                  <option value="Furgoneta">Furgoneta</option>
                  <option value="Scooter / Monopatín">Scooter / Monopatín</option>
                  <option value="A pie">A pie</option>
                  <option value="Otro">+ Otro (Escribir personalizado)</option>
                </select>
              </div>

              {newDriverForm.vehicle === "Otro" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Especificar Nombre del Vehículo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cuatrimoto, Camión de reparto, etc."
                    value={newDriverForm.customVehicle}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, customVehicle: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewDriverModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Registrar Chofer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Asignar Chofer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              Asignar Repartidor a {selectedOrder.orderNumber}
            </h3>

            <p className="text-xs text-gray-500">
              Cliente: <strong>{selectedOrder.clientName}</strong> — Dirección: {selectedOrder.address}
            </p>

            <form onSubmit={handleAssignDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Seleccionar Repartidor
                </label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Selecciona un chofer...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.vehicle}) — {d.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Confirmar Despacho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
