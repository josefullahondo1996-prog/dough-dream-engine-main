import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Calendar as CalendarIcon, Clock, Users, User, Phone, StickyNote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReservations, ReservationStatus } from "@/hooks/useReservations";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Reservaciones() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tables, setTables] = useState<{ id: string; name: string }[]>([]);
  
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const { reservations, isLoading, updateStatus } = useReservations(date);

  useEffect(() => {
    async function loadTables() {
      if (!restaurant?.id) return;
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id, name")
        .eq("restaurant_id", restaurant.id)
        .order("name");
      
      if (!error && data) {
        setTables(data);
      }
    }
    loadTables();
  }, [restaurant?.id]);

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      await updateStatus({ id, status });
      toast({ title: "Estado actualizado" });
    } catch (e) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const statusColors: Record<ReservationStatus, string> = {
    pendiente: "bg-warning text-warning-foreground hover:bg-warning/80",
    confirmada: "bg-success text-success-foreground hover:bg-success/80",
    cancelada: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reservaciones</h2>
          <p className="text-muted-foreground">Administra las reservaciones de mesas y eventos.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Reservación
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Reservación</DialogTitle>
              <DialogDescription>
                Ingresa los detalles para la nueva reservación.
              </DialogDescription>
            </DialogHeader>
            <ReservationForm onSuccess={() => setIsDialogOpen(false)} tables={tables} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Seleccionar Fecha
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-0 bg-transparent"
              locale={es}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {date ? `Reservaciones para ${format(date, "d 'de' MMMM, yyyy", { locale: es })}` : "Todas las reservaciones"}
            </CardTitle>
            <CardDescription>
              {reservations.length} reservaciones encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center space-y-2">
                <CalendarIcon className="h-10 w-10 opacity-20" />
                <p>No hay reservaciones para esta fecha.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Mesa / Personas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((res) => (
                      <TableRow key={res.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(res.reservation_time), "HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 font-medium">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {res.client_name}
                            </span>
                            {res.client_phone && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Phone className="h-3 w-3" />
                                {res.client_phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {res.restaurant_tables?.name || "Sin asignar"}
                            </span>
                            <Badge variant="outline" className="w-fit font-normal text-xs flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {res.party_size} pax
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={res.status}
                            onValueChange={(value) => handleStatusChange(res.id, value as ReservationStatus)}
                          >
                            <SelectTrigger className={cn("h-7 w-[120px] text-xs", statusColors[res.status])}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="confirmada">Confirmada</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {res.notes && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground max-w-[150px] truncate" title={res.notes}>
                              <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{res.notes}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
