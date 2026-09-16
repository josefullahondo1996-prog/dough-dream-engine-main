import { useState } from "react";
import { Plus, Clock, Utensils, CheckCircle2, XCircle, Edit, Trash2, Calendar, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuth";

interface MenuSchedule {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  activeDays: string[];
  isActive: boolean;
  itemCount: number;
}

const INITIAL_MENUS: MenuSchedule[] = [
  {
    id: "1",
    name: "Desayunos y Brunch",
    description: "Servicio matutino con café, tostadas, huevos y jugos frescos.",
    startTime: "07:30",
    endTime: "12:00",
    activeDays: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    isActive: true,
    itemCount: 18,
  },
  {
    id: "2",
    name: "Almuerzo Ejecutivo",
    description: "Menú del día de 3 tiempos con bebida incluida.",
    startTime: "12:30",
    endTime: "16:00",
    activeDays: ["Lun", "Mar", "Mié", "Jue", "Vie"],
    isActive: true,
    itemCount: 24,
  },
  {
    id: "3",
    name: "Cena & Carta Principal",
    description: "Platos principales, pastas artesanales, carnes y vinos.",
    startTime: "19:00",
    endTime: "23:30",
    activeDays: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    isActive: true,
    itemCount: 35,
  },
  {
    id: "4",
    name: "Happy Hour & Cócteles",
    description: "Promoción 2x1 en tragos seleccionados y picoteo.",
    startTime: "17:00",
    endTime: "20:00",
    activeDays: ["Jue", "Vie", "Sáb"],
    isActive: false,
    itemCount: 12,
  },
];

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function MenusPage() {
  const { restaurant } = useAuth();
  const [menus, setMenus] = useState<MenuSchedule[]>(INITIAL_MENUS);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuSchedule | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    startTime: "08:00",
    endTime: "16:00",
    activeDays: ["Lun", "Mar", "Mié", "Jue", "Vie"],
    isActive: true,
  });

  const filteredMenus = menus.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMenuStatus = (id: string) => {
    setMenus((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m))
    );
  };

  const deleteMenu = (id: string) => {
    setMenus((prev) => prev.filter((m) => m.id !== id));
  };

  const openCreateModal = () => {
    setEditingMenu(null);
    setForm({
      name: "",
      description: "",
      startTime: "08:00",
      endTime: "16:00",
      activeDays: ["Lun", "Mar", "Mié", "Jue", "Vie"],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (menu: MenuSchedule) => {
    setEditingMenu(menu);
    setForm({
      name: menu.name,
      description: menu.description,
      startTime: menu.startTime,
      endTime: menu.endTime,
      activeDays: menu.activeDays,
      isActive: menu.isActive,
    });
    setIsModalOpen(true);
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      activeDays: prev.activeDays.includes(day)
        ? prev.activeDays.filter((d) => d !== day)
        : [...prev.activeDays, day],
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingMenu) {
      setMenus((prev) =>
        prev.map((m) =>
          m.id === editingMenu.id
            ? { ...m, ...form }
            : m
        )
      );
    } else {
      const newMenu: MenuSchedule = {
        id: Date.now().toString(),
        name: form.name,
        description: form.description,
        startTime: form.startTime,
        endTime: form.endTime,
        activeDays: form.activeDays,
        isActive: form.isActive,
        itemCount: 0,
      };
      setMenus((prev) => [newMenu, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Utensils className="w-7 h-7 text-amber-500" />
            Gestión de Menús y Horarios
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configura los menús de tu restaurante según la hora del día y días de atención.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium shadow-sm transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Menú
        </button>
      </div>

      {/* Bar Filter */}
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar menú por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-sm border-none focus:outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Grid of Menus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredMenus.map((menu) => (
          <div
            key={menu.id}
            className={cn(
              "bg-white dark:bg-zinc-900 border rounded-2xl p-6 transition shadow-sm hover:shadow-md flex flex-col justify-between space-y-4",
              menu.isActive
                ? "border-gray-200 dark:border-zinc-800"
                : "border-gray-200 dark:border-zinc-800 opacity-60 bg-gray-50/50 dark:bg-zinc-900/40"
            )}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                    {menu.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {menu.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {menu.itemCount} platos disponibles
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => toggleMenuStatus(menu.id)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition",
                    menu.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400"
                  )}
                >
                  {menu.isActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> Inactivo
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">
                {menu.description}
              </p>

              {/* Schedule and Days */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    Horario:
                  </span>{" "}
                  {menu.startTime} hs - {menu.endTime} hs
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    Días:
                  </span>
                  <div className="flex gap-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const isActiveDay = menu.activeDays.includes(day);
                      return (
                        <span
                          key={day}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold",
                            isActiveDay
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                              : "bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600"
                          )}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <button
                onClick={() => openEditModal(menu)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-600 dark:text-gray-300 transition"
                title="Editar Menú"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteMenu(menu.id)}
                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-rose-600 dark:text-rose-400 transition"
                title="Eliminar Menú"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingMenu ? "Editar Menú" : "Crear Nuevo Menú"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Menú
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Menú Almuerzo Executive"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Platos principales y bebidas incluidas..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Días Activos
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const selected = form.activeDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition border",
                          selected
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-700"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Menú Activo en la App
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl text-sm transition"
                >
                  {editingMenu ? "Guardar Cambios" : "Crear Menú"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
