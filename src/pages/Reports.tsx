import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3, Tag, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSalesReport,
  useExpensesReport,
  useTopItemsReport,
  useCategoriesReport,
  type DateRange,
} from "@/hooks/useReports";

const PIE_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#ec4899"];

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

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
}

function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [range, setRange] = useState<DateRange>("30d");
  const queryClient = useQueryClient();

  const { data: salesData = [], isLoading: loadingSales } = useSalesReport(range);
  const { data: expensesData = [], isLoading: loadingExpenses } = useExpensesReport(range);
  const { data: topItems = [], isLoading: loadingItems } = useTopItemsReport(range);
  const { data: categories = [], isLoading: loadingCategories } = useCategoriesReport(range);

  const isLoading = loadingSales || loadingExpenses || loadingItems || loadingCategories;

  const totalSales = salesData.reduce((s, d) => s + d.total, 0);
  const totalOrders = salesData.reduce((s, d) => s + d.count, 0);
  const totalExpenses = expensesData.reduce((s, d) => s + d.amount, 0);
  const netProfit = totalSales - totalExpenses;

  // Merge sales + expenses into one dataset for the overview chart
  const overviewData = salesData.map((s) => {
    const exp = expensesData.find((e) => e.date === s.date);
    return { label: s.label, Ventas: s.total, Gastos: exp?.amount ?? 0 };
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["report-sales"] });
    void queryClient.invalidateQueries({ queryKey: ["report-expenses"] });
    void queryClient.invalidateQueries({ queryKey: ["report-items"] });
    void queryClient.invalidateQueries({ queryKey: ["report-categories"] });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Informes</h1>
          <p className="text-muted-foreground">Análisis completo de ventas, gastos y rendimiento.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as DateRange[]).map((key) => (
                <SelectItem key={key} value={key}>{RANGE_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ventas totales" value={fmt(totalSales)} icon={<DollarSign className="h-4 w-4" />} trend="up" subtitle={`${totalOrders} órdenes`} />
        <StatCard title="Gastos totales" value={fmt(totalExpenses)} icon={<TrendingDown className="h-4 w-4" />} trend="down" subtitle={`${RANGE_LABELS[range]}`} />
        <StatCard title="Beneficio neto" value={fmt(netProfit)} icon={<TrendingUp className="h-4 w-4" />} trend={netProfit >= 0 ? "up" : "down"} subtitle={netProfit >= 0 ? "Positivo" : "Negativo"} />
        <StatCard title="Ticket promedio" value={totalOrders > 0 ? fmt(totalSales / totalOrders) : fmt(0)} icon={<ShoppingBag className="h-4 w-4" />} trend="neutral" subtitle="Por orden" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ventas">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ventas" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Ventas
          </TabsTrigger>
          <TabsTrigger value="gastos" className="flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4" /> Gastos
          </TabsTrigger>
          <TabsTrigger value="articulos" className="flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4" /> Artículos
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-1.5">
            <Tag className="h-4 w-4" /> Categorías
          </TabsTrigger>
        </TabsList>

        {/* VENTAS TAB */}
        <TabsContent value="ventas" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas vs Gastos</CardTitle>
              <CardDescription>Comparativa diaria en {RANGE_LABELS[range].toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              {overviewData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay datos para mostrar en este rango.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overviewData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
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
              <CardDescription>Evolución del ingreso diario</CardDescription>
            </CardHeader>
            <CardContent>
              {salesData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay datos de ventas.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={salesData.map((d) => ({ label: d.label, Ventas: d.total, Órdenes: d.count }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                    <YAxis yAxisId="left" className="text-xs fill-muted-foreground" tickFormatter={(v) => `$${v}`} />
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

        {/* GASTOS TAB */}
        <TabsContent value="gastos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por día</CardTitle>
              <CardDescription>Total de gastos operativos diarios</CardDescription>
            </CardHeader>
            <CardContent>
              {expensesData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay gastos registrados en este rango.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expensesData.map((d) => ({ label: d.label, Gastos: d.amount }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                    <Bar dataKey="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ARTÍCULOS TAB */}
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

        {/* CATEGORÍAS TAB */}
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
