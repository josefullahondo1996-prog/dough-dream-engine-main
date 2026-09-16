import { useState } from "react";
import { Plus, Layers, Edit, Trash2, CheckCircle2, Search, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  options: ModifierOption[];
}

const INITIAL_GROUPS: ModifierGroup[] = [
  {
    id: "g1",
    name: "Término de la Carne",
    type: "single",
    required: true,
    options: [
      { id: "o1", name: "Jugoso (Medio)", price: 0 },
      { id: "o2", name: "A Punto (3/4)", price: 0 },
      { id: "o3", name: "Bien Cocido", price: 0 },
    ],
  },
  {
    id: "g2",
    name: "Extras para Hamburguesas & Pizzas",
    type: "multiple",
    required: false,
    options: [
      { id: "o4", name: "Queso Cheddar Extra", price: 1500 },
      { id: "o5", name: "Panceta / Bacon Crocante", price: 2000 },
      { id: "o6", name: "Huevo Frito", price: 1000 },
      { id: "o7", name: "Cebolla Caramelizada", price: 1200 },
    ],
  },
  {
    id: "g3",
    name: "Tamaño de Bebida",
    type: "single",
    required: true,
    options: [
      { id: "o8", name: "Regular (350ml)", price: 0 },
      { id: "o9", name: "Grande (500ml)", price: 800 },
      { id: "o10", name: "Jarra (1.5L)", price: 2500 },
    ],
  },
];

export default function ModificadoresPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>(INITIAL_GROUPS);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);

  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<"single" | "multiple">("single");
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<ModifierOption[]>([
    { id: "1", name: "", price: 0 },
  ]);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingGroup(null);
    setGroupName("");
    setGroupType("single");
    setIsRequired(false);
    setOptions([{ id: Date.now().toString(), name: "", price: 0 }]);
    setIsModalOpen(true);
  };

  const openEditModal = (group: ModifierGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupType(group.type);
    setIsRequired(group.required);
    setOptions(group.options);
    setIsModalOpen(true);
  };

  const addOptionField = () => {
    setOptions((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", price: 0 },
    ]);
  };

  const updateOption = (
    id: string,
    field: "name" | "price",
    value: string | number
  ) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const removeOption = (id: string) => {
    if (options.length <= 1) return;
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const deleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const validOptions = options.filter((o) => o.name.trim() !== "");

    if (editingGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? {
                ...g,
                name: groupName,
                type: groupType,
                required: isRequired,
                options: validOptions,
              }
            : g
        )
      );
    } else {
      const newGroup: ModifierGroup = {
        id: Date.now().toString(),
        name: groupName,
        type: groupType,
        required: isRequired,
        options: validOptions,
      };
      setGroups((prev) => [newGroup, ...prev]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-500" />
            Grupos de Modificadores y Extras
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configura opciones adicionales, adiciones de precio, cocción y personalización para tus platillos.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Grupo de Extras
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar modificadores por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-sm border-none focus:outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div
            key={group.id}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  {group.name}
                </h3>
                <span
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-full border",
                    group.type === "single"
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900"
                      : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-900"
                  )}
                >
                  {group.type === "single" ? "Selección Única" : "Múltiple"}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2">
                {group.required ? (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded">
                    Obligatorio
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    Opcional
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {group.options.length} opciones
                </span>
              </div>

              {/* Options list */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                {group.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800/60"
                  >
                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                      {opt.name}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {opt.price > 0 ? `+$${opt.price.toLocaleString()}` : "Gratis"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <button
                onClick={() => openEditModal(group)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-600 dark:text-gray-300 transition"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteGroup(group.id)}
                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-rose-600 dark:text-rose-400 transition"
                title="Eliminar"
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
                {editingGroup ? "Editar Grupo de Extras" : "Nuevo Grupo de Extras"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Extras para Hamburguesa"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Selección
                  </label>
                  <select
                    value={groupType}
                    onChange={(e) =>
                      setGroupType(e.target.value as "single" | "multiple")
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="single">Selección Única (Radio)</option>
                    <option value="multiple">Selección Múltiple (Check)</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => setIsRequired(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Obligatorio al ordenar
                    </span>
                  </label>
                </div>
              </div>

              {/* Opciones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Opciones / Adicionales
                  </label>
                  <button
                    type="button"
                    onClick={addOptionField}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Opción
                  </button>
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Opción ${idx + 1} (ej: Queso Extra)`}
                        value={opt.name}
                        onChange={(e) =>
                          updateOption(opt.id, "name", e.target.value)
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                      />
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          placeholder="Precio"
                          value={opt.price}
                          onChange={(e) =>
                            updateOption(
                              opt.id,
                              "price",
                              Number(e.target.value)
                            )
                          }
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOption(opt.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-500 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition"
                >
                  {editingGroup ? "Guardar Grupo" : "Crear Grupo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
