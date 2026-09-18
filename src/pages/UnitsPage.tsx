import { useState, useEffect, useCallback } from "react";
import { Scale, Plus, Edit, Trash2, Search, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type UnitOfMeasure = Tables<"units_of_measure">;

const DEFAULT_PRESETS = [
  { name: "Litro", symbol: "L", unit_type: "volume", base_multiplier: 1.0 },
  { name: "Mililitro", symbol: "ml", unit_type: "volume", base_multiplier: 1000.0 },
  { name: "Kilogramo", symbol: "kg", unit_type: "weight", base_multiplier: 1.0 },
  { name: "Gramo", symbol: "g", unit_type: "weight", base_multiplier: 1000.0 },
  { name: "Unidad", symbol: "unid", unit_type: "unit", base_multiplier: 1.0 },
  { name: "Porción", symbol: "porc", unit_type: "portion", base_multiplier: 1.0 },
  { name: "Chopp 500ml", symbol: "chopp", unit_type: "volume", base_multiplier: 0.5 },
  { name: "Copa 150ml", symbol: "copa", unit_type: "volume", base_multiplier: 0.15 },
];

export default function UnitsPage() {
  const { restaurant } = useAuth();
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [error, setError] = useState("");
  const [dbTableMissing, setDbTableMissing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitOfMeasure | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    unit_type: "volume",
    base_multiplier: "1.0",
  });

  const loadUnits = useCallback(async () => {
    if (!restaurant) return;
    setIsLoading(true);
    setError("");
    setDbTableMissing(false);

    try {
      const { data, error: fetchErr } = await supabase
        .from("units_of_measure")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("name");

      if (fetchErr) {
        if (fetchErr.code === "42P01" || fetchErr.message.includes("does not exist")) {
          setDbTableMissing(true);
        } else {
          setError(fetchErr.message);
        }
        setUnits([]);
      } else {
        setUnits(data ?? []);
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar unidades.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurant]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const handleSeedPresets = async () => {
    if (!restaurant) return;
    setIsSaving(true);
    setError("");

    try {
      const inserts = DEFAULT_PRESETS.map((p) => ({
        ...p,
        restaurant_id: restaurant.id,
      }));

      const { error: seedErr } = await supabase.from("units_of_measure").insert(inserts);
      if (seedErr) {
        setError(seedErr.message);
      } else {
        await loadUnits();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingUnit(null);
    setForm({ name: "", symbol: "", unit_type: "volume", base_multiplier: "1.0" });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (unit: UnitOfMeasure) => {
    setEditingUnit(unit);
    setForm({
      name: unit.name,
      symbol: unit.symbol,
      unit_type: unit.unit_type,
      base_multiplier: unit.base_multiplier.toString(),
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    if (!form.name.trim() || !form.symbol.trim()) {
      setFormError("Ingresa un nombre y símbolo válidos.");
      return;
    }

    const mult = parseFloat(form.base_multiplier);
    if (isNaN(mult) || mult <= 0) {
      setFormError("El multiplicador base debe ser un número mayor a 0.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      if (editingUnit) {
        const { error: updateErr } = await supabase
          .from("units_of_measure")
          .update({
            name: form.name.trim(),
            symbol: form.symbol.trim(),
            unit_type: form.unit_type,
            base_multiplier: mult,
          })
          .eq("id", editingUnit.id)
          .eq("restaurant_id", restaurant.id);

        if (updateErr) {
          setFormError(updateErr.message);
          setIsSaving(false);
          return;
        }
      } else {
        const { error: insertErr } = await supabase.from("units_of_measure").insert({
          restaurant_id: restaurant.id,
          name: form.name.trim(),
          symbol: form.symbol.trim(),
          unit_type: form.unit_type,
          base_multiplier: mult,
        });

        if (insertErr) {
          setFormError(insertErr.message);
          setIsSaving(false);
          return;
        }
      }

      setIsModalOpen(false);
      await loadUnits();
    } catch (err: any) {
      setFormError(err.message || "Error al guardar la unidad.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurant || !confirm("¿Seguro que deseas eliminar esta unidad de medida?")) return;
    try {
      const { error: delErr } = await supabase
        .from("units_of_measure")
        .delete()
        .eq("id", id)
        .eq("restaurant_id", restaurant.id);

      if (delErr) {
        setError(delErr.message);
      } else {
        setUnits((prev) => prev.filter((u) => u.id !== id));
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredUnits = units.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.symbol.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || u.unit_type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "volume":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-500">Volumen (L / ml)</span>;
      case "weight":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-500">Peso (kg / g)</span>;
      case "portion":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/10 text-purple-500">Porción</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500">Unidad</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="w-7 h-7 text-primary" />
            Unidades de Medida
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestión de formatos, litros, gramos y presentaciones para productos e inventario
          </p>
        </div>
        <div className="flex items-center gap-3">
          {units.length === 0 && !dbTableMissing && !isLoading && (
            <button
              onClick={handleSeedPresets}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg font-medium transition text-sm"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              Cargar Unidades Base
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition text-sm shadow"
          >
            <Plus className="w-4 h-4" />
            Nueva Unidad
          </button>
        </div>
      </div>

      {/* SQL Migration Notice if Table is Missing in DB */}
      {dbTableMissing && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">La tabla 'units_of_measure' aún no existe en Supabase.</p>
            <p>
              Por favor ejecuta el script <code className="px-1.5 py-0.5 bg-amber-500/20 rounded font-mono text-xs">supabase_units_combos.sql</code> en el Editor SQL de tu panel de Supabase para activar esta función.
            </p>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o símbolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: "Todas" },
            { id: "volume", label: "Volumen (L/ml)" },
            { id: "weight", label: "Peso (kg/g)" },
            { id: "unit", label: "Unidad" },
            { id: "portion", label: "Porción" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setTypeFilter(type.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                typeFilter === type.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center space-y-4">
          <Scale className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No hay unidades de medida registradas</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Crea unidades personalizadas (ej. Litros, Kilos, Chopp) o haz clic en "Cargar Unidades Base" para comenzar rápido.
            </p>
          </div>
          {!dbTableMissing && (
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleSeedPresets}
                disabled={isSaving}
                className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition"
              >
                Cargar Unidades Base (Preset)
              </button>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition"
              >
                Crear Unidad
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="bg-card p-5 rounded-xl border border-border hover:border-primary/50 transition shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    {unit.symbol}
                  </span>
                  {getTypeBadge(unit.unit_type)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{unit.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Multiplicador base: <span className="font-semibold text-foreground">{unit.base_multiplier}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => openEditModal(unit)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(unit.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                {editingUnit ? "Editar Unidad de Medida" : "Nueva Unidad de Medida"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Define el nombre, símbolo y tipo de medida para presentar en el menú.
              </p>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nombre de la Unidad</label>
                <input
                  type="text"
                  placeholder="Ej: Litro, Chopp 500ml, Kilogramo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Símbolo</label>
                  <input
                    type="text"
                    placeholder="Ej: L, ml, kg, unid"
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tipo de Medida</label>
                  <select
                    value={form.unit_type}
                    onChange={(e) => setForm({ ...form, unit_type: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="volume">Volumen (L / ml)</option>
                    <option value="weight">Peso (kg / g)</option>
                    <option value="unit">Unidad entera</option>
                    <option value="portion">Porción / Servido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Multiplicador Base (relación con la unidad principal)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1.0 para L/kg, 1000 para ml/g"
                  value={form.base_multiplier}
                  onChange={(e) => setForm({ ...form, base_multiplier: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Ejemplo: Para Litro usar 1.0, para Mililitro usar 1000.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground hover:bg-muted/80 rounded-lg text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition shadow"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingUnit ? "Guardar Cambios" : "Crear Unidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
