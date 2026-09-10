import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Users, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import StatCard from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type Order = Tables<"orders">;
type Line = Tables<"order_items">;
type Product = Tables<"menu_items">;
type Category = Tables<"menu_categories">;
type Client = Tables<"clients">;
const colors = ["hsl(25, 95%, 53%)", "hsl(142, 71%, 45%)", "hsl(210, 80%, 55%)", "hsl(45, 93%, 47%)", "hsl(20, 10%, 50%)"];
const money = (value: number) => `Gs. ${value.toLocaleString()}`;

export default function Dashboard() {
  const { restaurant } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!restaurant) { setIsLoading(false); return; }
    setIsLoading(true);
    const [invoiceResult, orderResult, lineResult, productResult, categoryResult, clientResult] = await Promise.all([
      supabase.from("invoices").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
      supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("menu_categories").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("clients").select("*").eq("restaurant_id", restaurant.id),
    ]);
    const queryError = invoiceResult.error || orderResult.error || lineResult.error || productResult.error || categoryResult.error || clientResult.error;
    if (queryError) setError(queryError.message);
    else { setInvoices(invoiceResult.data ?? []); setOrders(orderResult.data ?? []); setLines(lineResult.data ?? []); setProducts(productResult.data ?? []); setCategories(categoryResult.data ?? []); setClients(clientResult.data ?? []); }
    setIsLoading(false);
  }, [restaurant]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const today = useMemo(() => new Date(), []);
  const todayKey = today.toDateString();
  const todayInvoices = invoices.filter((invoice) => new Date(invoice.created_at).toDateString() === todayKey && invoice.status === "emitida");
  const todayOrders = orders.filter((order) => new Date(order.created_at).toDateString() === todayKey);
  const salesToday = todayInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const averageTicket = todayInvoices.length ? Math.round(salesToday / todayInvoices.length) : 0;
  const productMap = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product])), [products]);
  const categoryMap = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category])), [categories]);

  const salesData = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - (6 - index)); const key = date.toDateString(); return { day: date.toLocaleDateString("es-PY", { weekday: "short" }), ventas: invoices.filter((invoice) => new Date(invoice.created_at).toDateString() === key && invoice.status === "emitida").reduce((sum, invoice) => sum + invoice.total, 0) }; }), [invoices, today]);
  const hourlyData = useMemo(() => Array.from({ length: 13 }, (_, index) => { const hour = index + 10; return { hora: String(hour), pedidos: todayOrders.filter((order) => new Date(order.created_at).getHours() === hour).length }; }), [todayOrders]);
  const categoryData = useMemo(() => { const totals: Record<string, number> = {}; lines.forEach((line) => { const category = categoryMap[productMap[line.menu_item_id || ""]?.category_id || ""]?.name || "Otros"; totals[category] = (totals[category] || 0) + line.quantity * line.price_at_order; }); const total = Object.values(totals).reduce((sum, value) => sum + value, 0); return Object.entries(totals).map(([name, value], index) => ({ name, value: total ? Math.round((value / total) * 100) : 0, color: colors[index % colors.length] })).sort((a, b) => b.value - a.value).slice(0, 5); }, [lines, productMap, categoryMap]);
  const popular = useMemo(() => { const totals: Record<string, number> = {}; lines.forEach((line) => { if (line.menu_item_id) totals[line.menu_item_id] = (totals[line.menu_item_id] || 0) + line.quantity; }); return Object.entries(totals).sort(([, a], [, b]) => b - a).slice(0, 4).map(([id, qty]) => ({ product: productMap[id], qty })); }, [lines, productMap]);
  const recentOrders = orders.slice(0, 5);

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-foreground">Panel de Control</h1><p className="mt-1 text-sm text-muted-foreground">Resumen de {today.toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {restaurant?.name}</p></div>
    {error && <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard title="Ventas del día" value={money(salesToday)} change={`${todayInvoices.length} facturas`} icon={<DollarSign className="h-5 w-5" />} color="primary" /><StatCard title="Pedidos" value={String(todayOrders.length)} change="Registrados hoy" icon={<ShoppingBag className="h-5 w-5" />} color="success" /><StatCard title="Clientes atendidos" value={String(new Set(todayOrders.map((order) => order.client_id).filter(Boolean)).size)} change={`${clients.length} clientes totales`} icon={<Users className="h-5 w-5" />} color="info" /><StatCard title="Ticket promedio" value={money(averageTicket)} change="Basado en facturas emitidas" icon={<TrendingUp className="h-5 w-5" />} color="warning" /></div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2"><h3 className="mb-4 font-semibold">Ventas de los últimos 7 días</h3><ResponsiveContainer width="100%" height={260}><BarChart data={salesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value: number) => [money(value), "Ventas"]} /><Bar dataKey="ventas" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="rounded-xl border border-border bg-card p-5 shadow-card"><h3 className="mb-4 font-semibold">Ventas por categoría</h3>{categoryData.length ? <><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={categoryData} dataKey="value" innerRadius={50} outerRadius={80}>{categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value: number) => [`${value}%`, "Ventas"]} /></PieChart></ResponsiveContainer><div className="space-y-2">{categoryData.map((category) => <div key={category.name} className="flex justify-between text-sm"><span className="text-muted-foreground">{category.name}</span><span className="font-medium">{category.value}%</span></div>)}</div></> : <p className="py-16 text-center text-sm text-muted-foreground">Aún no hay ventas categorizadas.</p>}</div></div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><div className="overflow-hidden rounded-xl border border-border bg-card shadow-card lg:col-span-2"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h3 className="font-semibold">Últimas órdenes</h3><Link to="/ordenes" className="text-sm font-medium text-primary hover:underline">Ver todas</Link></div>{recentOrders.length ? <div className="overflow-x-auto"><table className="w-full"><tbody>{recentOrders.map((order) => <tr key={order.id} className="border-b border-border last:border-0"><td className="px-5 py-3 text-sm font-medium">#{order.id.slice(0, 8)}</td><td className="px-5 py-3 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}</td><td className="px-5 py-3 text-sm text-muted-foreground">{money(order.total)}</td><td className="px-5 py-3 text-sm capitalize text-muted-foreground">{order.status}</td></tr>)}</tbody></table></div> : <p className="py-12 text-center text-sm text-muted-foreground">Aún no hay órdenes.</p>}</div><div className="rounded-xl border border-border bg-card p-5 shadow-card"><h3 className="mb-4 font-semibold">Pedidos por hora</h3><ResponsiveContainer width="100%" height={250}><LineChart data={hourlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hora" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="pedidos" stroke="hsl(25, 95%, 53%)" strokeWidth={2.5} /></LineChart></ResponsiveContainer></div></div>
    <div className="rounded-xl border border-border bg-card p-5 shadow-card"><h3 className="mb-4 font-semibold">Productos más vendidos</h3>{popular.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{popular.map(({ product, qty }) => <div key={product?.id} className="rounded-lg bg-secondary/50 p-3"><p className="font-medium">{product?.emoji || "🍽️"} {product?.name || "Producto eliminado"}</p><p className="mt-1 text-xs text-muted-foreground">{qty} vendidos</p></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay productos vendidos.</p>}</div>
  </div>;
}
