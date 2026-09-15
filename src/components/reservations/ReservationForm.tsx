import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useReservations } from "@/hooks/useReservations";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  client_name: z.string().min(2, "El nombre es requerido"),
  client_phone: z.string().optional(),
  party_size: z.coerce.number().min(1, "Debe ser al menos 1 persona"),
  date: z.date({
    required_error: "La fecha es requerida",
  }),
  time: z.string().min(1, "La hora es requerida"),
  table_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ReservationFormProps {
  onSuccess?: () => void;
  tables: { id: string; name: string }[];
}

export function ReservationForm({ onSuccess, tables }: ReservationFormProps) {
  const { createReservation, isCreating } = useReservations();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: "",
      client_phone: "",
      party_size: 2,
      notes: "",
      time: "19:00",
      table_id: "none",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Create a datetime from date and time
      const [hours, minutes] = values.time.split(":");
      const reservationTime = new Date(values.date);
      reservationTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      await createReservation({
        client_name: values.client_name,
        client_phone: values.client_phone || null,
        party_size: values.party_size,
        reservation_time: reservationTime.toISOString(),
        table_id: values.table_id && values.table_id !== "none" ? values.table_id : null,
        notes: values.notes || null,
        status: "pendiente",
      });

      toast({
        title: "Reservación creada",
        description: "La reservación se ha guardado correctamente.",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al crear la reservación.",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client_name">Nombre del cliente *</Label>
          <Input id="client_name" {...form.register("client_name")} placeholder="Ej. Juan Pérez" />
          {form.formState.errors.client_name && (
            <p className="text-sm text-destructive">{form.formState.errors.client_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="client_phone">Teléfono</Label>
          <Input id="client_phone" {...form.register("client_phone")} placeholder="Ej. +34 600 000 000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 flex flex-col">
          <Label>Fecha *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  if (d) form.setValue("date", d, { shouldValidate: true });
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.date && (
            <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Hora *</Label>
          <Input id="time" type="time" {...form.register("time")} />
          {form.formState.errors.time && (
            <p className="text-sm text-destructive">{form.formState.errors.time.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="party_size">Número de personas *</Label>
          <Input id="party_size" type="number" min={1} {...form.register("party_size")} />
          {form.formState.errors.party_size && (
            <p className="text-sm text-destructive">{form.formState.errors.party_size.message}</p>
          )}
        </div>

        <div className="space-y-2 flex flex-col">
          <Label>Mesa (Opcional)</Label>
          <Select onValueChange={(value) => form.setValue("table_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {tables.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas adicionales</Label>
        <Textarea id="notes" {...form.register("notes")} placeholder="Alergias, peticiones especiales..." />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Guardando..." : "Crear Reservación"}
        </Button>
      </div>
    </form>
  );
}
