import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3, Tag,
  RefreshCw, Scale, Printer, ArrowUpRight, ArrowDownRight, ShieldCheck,
  AlertTriangle, Percent, ReceiptText, FileSpreadsheet
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/useAuth";
import {
  useSalesReport,
  useExpensesReport,
  useTopItemsReport,
  useCategoriesReport,
  useExpensesByCategoryReport,
  useSalesBreakdownReport,
  type DateRange,
} from "@/hooks/useReports";

const PIE_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6", "#6366f1"];

const fmt = (n: number) => `Gs. ${Math.round(n || 0).toLocaleString("es-PY")}`;

const RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  "365d": "Último año",
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  colorClass?: string;
}

function StatCard({ title, value, subtitle, icon, trend, colorClass }: StatCardProps) {
  return (
    <Card className="overflow-hidden border border-border/60 shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2.5 rounded-xl bg-primary/10 text-primary ${colorClass || ""}`}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {subtitle && (
          <p className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${
            trend === "up" ? "text-emerald-600 dark:text-emerald-400" :
            trend === "down" ? "text-rose-600 dark:text-rose-400" :
            "text-muted-foreground"
          }`}>
            {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
            {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5" />}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const location = useLocation();
  const navigate = useNavigate();
  const { restaurant } = useAuth();
  const [range, setRange] = useState<DateRange>("30d");
  const queryClient = useQueryClient();

  // Determine active tab from URL path
  const currentTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes("informe-perdidas-ganancias") || path === "/informes") return "pnl";
    if (path.includes("informe-gastos")) return "gastos";
    if (path.includes("informe-articulos")) return "articulos";
    if (path.includes("informe-categorias")) return "categorias";
    if (path.includes("informe-ventas")) return "ventas";
    return "pnl";
  }, [location.pathname]);

  const handleTabChange = (val: string) => {
    switch (val) {
      case "pnl":
        navigate("/informe-perdidas-ganancias");
        break;
      case "ventas":
        navigate("/informe-ventas");
        break;
      case "gastos":
        navigate("/informe-gastos");
        break;
      case "articulos":
        navigate("/informe-articulos");
        break;
      case "categorias":
        navigate("/informe-categorias");
        break;
      default:
        break;
    }
  };

  const { data: salesData = [], isLoading: loadingSales } = useSalesReport(range);
  const { data: expensesData = [], isLoading: loadingExpenses } = useExpensesReport(range);
  const { data: topItems = [], isLoading: loadingItems } = useTopItemsReport(range);
  const { data: categories = [], isLoading: loadingCategories } = useCategoriesReport(range);
  const { data: expensesByCategory = [], isLoading: loadingExpCat } = useExpensesByCategoryReport(range);
  const { data: salesBreakdown, isLoading: loadingBreakdown } = useSalesBreakdownReport(range);

  const isLoading = loadingSales || loadingExpenses || loadingItems || loadingCategories || loadingExpCat || loadingBreakdown;

  const totalSales = useMemo(() => salesData.reduce((s, d) => s + d.total, 0), [salesData]);
  const totalOrders = useMemo(() => salesData.reduce((s, d) => s + d.count, 0), [salesData]);
  const totalExpenses = useMemo(() => expensesData.reduce((s, d) => s + d.amount, 0), [expensesData]);
  const netProfit = totalSales - totalExpenses;
  const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
  const expenseRatio = totalSales > 0 ? (totalExpenses / totalSales) * 100 : 0;

  // Merge sales + expenses by day into one dataset for P&L timeline
  const pnlTimelineData = useMemo(() => {
    const dates = Array.from(new Set([
      ...salesData.map((s) => s.date),
      ...expensesData.map((e) => e.date),
    ])).sort();

    const salesMap = new Map(salesData.map((s) => [s.date, s]));
    const expMap = new Map(expensesData.map((e) => [e.date, e]));

    return dates.map((d) => {
      const s = salesMap.get(d);
      const e = expMap.get(d);
      const salesVal = s?.total ?? 0;
      const expVal = e?.amount ?? 0;
      const profit = salesVal - expVal;
      const label = s?.label || e?.label || d.slice(5);
      return {
        date: d,
        label,
        Ventas: salesVal,
        Gastos: expVal,
        Ganancia: profit,
      };
    });
  }, [salesData, expensesData]);

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["report-sales"] });
    void queryClient.invalidateQueries({ queryKey: ["report-expenses"] });
    void queryClient.invalidateQueries({ queryKey: ["report-items"] });
    void queryClient.invalidateQueries({ queryKey: ["report-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["report-expenses-by-category"] });
    void queryClient.invalidateQueries({ queryKey: ["report-sales-breakdown"] });
  };

  const handlePrint = () => {
    window.print();
  };

  // Health Status Badge calculation
  const healthStatus = useMemo(() => {
    if (totalSales === 0 && totalExpenses === 0) {
      return { label: "Sin datos", color: "bg-muted text-muted-foreground border-border", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    }
    if (netProfit < 0) {
      return { label: "En Pérdida Operativa", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", icon: <TrendingDown className="h-3.5 w-3.5" /> };
    }
    if (netMargin >= 25) {
      return { label: "Rentabilidad Excelente (>25%)", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: <ShieldCheck className="h-3.5 w-3.5" /> };
    }
    if (netMargin >= 10) {
      return { label: "Rentabilidad Saludable (10-25%)", color: "bg-primary/10 text-primary border-primary/20", icon: <TrendingUp className="h-3.5 w-3.5" /> };
    }
    return { label: "Margen Ajustado (<10%)", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
  }, [netProfit, netMargin, totalSales, totalExpenses]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Informes Financieros</h1>
            <Badge variant="outline" className={`gap-1.5 px-3 py-1 font-medium ${healthStatus.color}`}>
              {healthStatus.icon}
              {healthStatus.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Análisis de Ganancias y Pérdidas (P&L), ventas, gastos y rendimiento de {restaurant?.name || "tu restaurante"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as DateRange[]).map((key) => (
                <SelectItem key={key} value={key}>{RANGE_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading} title="Actualizar datos">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="outline" onClick={handlePrint} className="gap-2" title="Imprimir Estado de Resultados">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir P&L</span>
          </Button>
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">{restaurant?.name || "Restaurante"}</h1>
        <h2 className="text-lg font-semibold text-muted-foreground">Estado de Resultados (Ganancias y Pérdidas)</h2>
        <p className="text-xs text-muted-foreground">
          Período: {RANGE_LABELS[range]} · Generado el: {new Date().toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingresos Totales (Ventas)"
          value={fmt(totalSales)}
          icon={<DollarSign className="h-4 w-4" />}
          trend="up"
          subtitle={`${totalOrders} órdenes facturadas`}
        />
        <StatCard
          title="Gastos Totales (OpEx)"
          value={fmt(totalExpenses)}
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
          trend="down"
          subtitle={`${expenseRatio.toFixed(1)}% de los ingresos`}
          colorClass="bg-destructive/10 text-destructive"
        />
        <StatCard
          title={netProfit >= 0 ? "Utilidad Neta (Ganancia)" : "Pérdida Neta"}
          value={fmt(netProfit)}
          icon={<Scale className="h-4 w-4" />}
          trend={netProfit >= 0 ? "up" : "down"}
          subtitle={`${netProfit >= 0 ? "Resultado positivo" : "Déficit en el período"}`}
          colorClass={netProfit >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}
        />
        <StatCard
          title="Margen Neto de Ganancia"
          value={`${netMargin.toFixed(1)}%`}
          icon={<Percent className="h-4 w-4" />}
          trend={netMargin >= 10 ? "up" : netMargin >= 0 ? "neutral" : "down"}
          subtitle={`Promedio: ${totalOrders > 0 ? fmt(totalSales / totalOrders) : fmt(0)} / orden`}
        />
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 print:hidden">
          <TabsTrigger value="pnl" className="flex items-center gap-1.5 font-medium">
            <Scale className="h-4 w-4" /> Ganancias y Pérdidas
          </TabsTrigger>
          <TabsTrigger value="ventas" className="flex items-center gap-1.5 font-medium">
            <BarChart3 className="h-4 w-4" /> Ventas
          </TabsTrigger>
          <TabsTrigger value="gastos" className="flex items-center gap-1.5 font-medium">
            <TrendingDown className="h-4 w-4" /> Gastos
          </TabsTrigger>
          <TabsTrigger value="articulos" className="flex items-center gap-1.5 font-medium">
            <ShoppingBag className="h-4 w-4" /> Artículos
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-1.5 font-medium">
            <Tag className="h-4 w-4" /> Categorías
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: GANANCIAS Y PÉRDIDAS (P&L) */}
        <TabsContent value="pnl" className="space-y-6 mt-4">
          {/* Main P&L Chart */}
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Evolución Financiera (Ingresos vs Gastos vs Utilidad)
                  </CardTitle>
                  <CardDescription>
                    Comparativa de ingresos por ventas, gastos operativos y ganancia neta en {RANGE_LABELS[range].toLowerCase()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Ventas</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive inline-block opacity-80" /> Gastos</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-1 bg-emerald-500 inline-block rounded" /> Utilidad Neta</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pnlTimelineData.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">No hay datos suficientes para generar el balance en este rango.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={pnlTimelineData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `Gs. ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number, name: string) => [fmt(v), name]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.75} maxBarSize={40} />
                    <Line type="monotone" dataKey="Ganancia" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: "#10b981" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Structured P&L Table + Expenses Distribution */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Detailed Statement of Profit and Loss (Table) */}
            <Card className="lg:col-span-2 border border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  Estado de Resultados Consolidado
                </CardTitle>
                <CardDescription>
                  Estructura contable formal de ingresos, egresos y resultado neto del ejercicio
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        <th className="text-left py-3 px-4">Concepto / Cuenta</th>
                        <th className="text-right py-3 px-4">Monto (Gs.)</th>
                        <th className="text-right py-3 px-4">% Incidencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {/* INGRESOS */}
                      <tr className="bg-primary/5 font-semibold text-primary">
                        <td className="py-2.5 px-4 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          <span>1. INGRESOS POR VENTAS</span>
                        </td>
                        <td className="text-right py-2.5 px-4 font-bold">{fmt(totalSales)}</td>
                        <td className="text-right py-2.5 px-4 font-bold">100.0%</td>
                      </tr>

                      {salesBreakdown && salesBreakdown.subtotal > 0 && (
                        <>
                          <tr className="text-muted-foreground text-xs">
                            <td className="py-2 px-8">Subtotal de Facturación Bruta</td>
                            <td className="text-right py-2 px-4">{fmt(salesBreakdown.subtotal)}</td>
                            <td className="text-right py-2 px-4">
                              {totalSales > 0 ? ((salesBreakdown.subtotal / totalSales) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                          {salesBreakdown.discount > 0 && (
                            <tr className="text-rose-600 dark:text-rose-400 text-xs">
                              <td className="py-2 px-8">(-) Descuentos Concedidos a Clientes</td>
                              <td className="text-right py-2 px-4">-{fmt(salesBreakdown.discount)}</td>
                              <td className="text-right py-2 px-4">
                                -{totalSales > 0 ? ((salesBreakdown.discount / totalSales) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                          )}
                          {salesBreakdown.iva > 0 && (
                            <tr className="text-muted-foreground text-xs">
                              <td className="py-2 px-8">(+) Débito Fiscal IVA incluido</td>
                              <td className="text-right py-2 px-4">{fmt(salesBreakdown.iva)}</td>
                              <td className="text-right py-2 px-4">
                                {totalSales > 0 ? ((salesBreakdown.iva / totalSales) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                          )}
                        </>
                      )}

                      {/* GASTOS OPERATIVOS */}
                      <tr className="bg-destructive/5 font-semibold text-destructive">
                        <td className="py-2.5 px-4 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          <span>2. GASTOS OPERATIVOS (OpEx)</span>
                        </td>
                        <td className="text-right py-2.5 px-4 font-bold">-{fmt(totalExpenses)}</td>
                        <td className="text-right py-2.5 px-4 font-bold">
                          {totalSales > 0 ? ((totalExpenses / totalSales) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>

                      {expensesByCategory.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-3 px-8 text-xs text-muted-foreground italic">
                            No hay gastos registrados en este período.
                          </td>
                        </tr>
                      ) : (
                        expensesByCategory.map((cat) => {
                          const catPct = totalSales > 0 ? (cat.amount / totalSales) * 100 : 0;
                          return (
                            <tr key={cat.name} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-8 text-foreground flex items-center justify-between">
                                <span>{cat.name}</span>
                                <span className="text-[11px] text-muted-foreground">({cat.count} reg.)</span>
                              </td>
                              <td className="text-right py-2 px-4 font-medium text-destructive/90">
                                -{fmt(cat.amount)}
                              </td>
                              <td className="text-right py-2 px-4 text-xs text-muted-foreground">
                                {catPct.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })
                      )}

                      {/* RESULTADO NETO */}
                      <tr className={`border-t-2 font-bold ${
                        netProfit >= 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40"
                      }`}>
                        <td className="py-3.5 px-4 text-base flex items-center gap-2">
                          <Scale className="h-5 w-5" />
                          <span>3. UTILIDAD / PÉRDIDA NETA</span>
                        </td>
                        <td className="text-right py-3.5 px-4 text-base tracking-tight font-extrabold">
                          {fmt(netProfit)}
                        </td>
                        <td className="text-right py-3.5 px-4 text-base font-extrabold">
                          {netMargin.toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Breakdown by Category (Pie Chart) */}
            <Card className="border border-border/70 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Distribución de Gastos</CardTitle>
                <CardDescription>Estructura de costos operativos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {expensesByCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-16">Sin gastos registrados.</p>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                          <Pie
                            data={expensesByCategory}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={78}
                            paddingAngle={3}
                          >
                            {expensesByCategory.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {expensesByCategory.map((cat, i) => {
                        const pctOfTotalExp = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
                        return (
                          <div key={cat.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="truncate text-foreground font-medium">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-medium">
                              <span>{fmt(cat.amount)}</span>
                              <span className="text-muted-foreground text-[11px] w-10 text-right">({pctOfTotalExp.toFixed(0)}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: VENTAS */}
        <TabsContent value="ventas" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas vs Gastos Diarios</CardTitle>
              <CardDescription>Comparativa diaria en {RANGE_LABELS[range].toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              {pnlTimelineData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay datos para mostrar en este rango.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pnlTimelineData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `Gs. ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                    <Legend />
                    <Bar dataKey="Ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tendencia de ventas</CardTitle>
              <CardDescription>Evolución del ingreso diario y órdenes</CardDescription>
            </CardHeader>
            <CardContent>
              {salesData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay datos de ventas.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={salesData.map((d) => ({ label: d.label, Ventas: d.total, Órdenes: d.count }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                    <YAxis yAxisId="left" className="text-xs fill-muted-foreground" tickFormatter={(v) => `Gs. ${v}`} />
                    <YAxis yAxisId="right" orientation="right" className="text-xs fill-muted-foreground" />
                    <Tooltip formatter={(v: number, name: string) => name === "Ventas" ? fmt(v) : v} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Ventas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="Órdenes" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: GASTOS */}
        <TabsContent value="gastos" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gastos Operativos por Día</CardTitle>
              <CardDescription>Total de egresos registrados cronológicamente</CardDescription>
            </CardHeader>
            <CardContent>
              {expensesData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay gastos registrados en este rango.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expensesData.map((d) => ({ label: d.label, Gastos: d.amount }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `Gs. ${v}`} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                    <Bar dataKey="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ARTÍCULOS */}
        <TabsContent value="articulos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 artículos más vendidos</CardTitle>
              <CardDescription>Por cantidad de unidades vendidas</CardDescription>
            </CardHeader>
            <CardContent>
              {topItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay datos de artículos en este rango.</p>
              ) : (
                <div className="space-y-3">
                  {topItems.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground shrink-0 ml-2">{item.quantity} uds · {fmt(item.revenue)}</p>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${(item.quantity / (topItems[0]?.quantity || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: CATEGORÍAS */}
        <TabsContent value="categorias" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por categoría</CardTitle>
                <CardDescription>Distribución porcentual de ventas</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No hay datos de categorías.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={categories} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {categories.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking de categorías</CardTitle>
                <CardDescription>Ordenado por ingreso total</CardDescription>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No hay datos de categorías.</p>
                ) : (
                  <div className="space-y-3">
                    {categories.map((cat, index) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium truncate">{cat.name}</p>
                            <p className="text-xs text-muted-foreground ml-2">{fmt(cat.revenue)}</p>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(cat.revenue / (categories[0]?.revenue || 1)) * 100}%`,
                                backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

