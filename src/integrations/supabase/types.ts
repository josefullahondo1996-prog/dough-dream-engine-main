export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      restaurant_members: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          type?: string
        }
        Relationships: []
      }
      cash_register: {
        Row: {
          closed_at: string | null
          final_amount: number | null
          id: string
          initial_amount: number
          opened_at: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          final_amount?: number | null
          id?: string
          initial_amount?: number
          opened_at?: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          final_amount?: number | null
          id?: string
          initial_amount?: number
          opened_at?: string
          status?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          favorite: boolean
          id: string
          last_visit: string | null
          name: string
          phone: string | null
          restaurant_id: string
          total_spent: number
          visits: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          favorite?: boolean
          id?: string
          last_visit?: string | null
          name: string
          phone?: string | null
          restaurant_id: string
          total_spent?: number
          visits?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          favorite?: boolean
          id?: string
          last_visit?: string | null
          name?: string
          phone?: string | null
          restaurant_id?: string
          total_spent?: number
          visits?: number
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          restaurant_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          restaurant_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          discount: number
          discount_type: string
          id: string
          invoice_number: string
          iva: number
          iva_rate: number
          order_id: string
          restaurant_id: string
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          discount?: number
          discount_type?: string
          id?: string
          invoice_number: string
          iva?: number
          iva_rate?: number
          order_id: string
          restaurant_id: string
          status?: string
          subtotal?: number
          total?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          discount?: number
          discount_type?: string
          id?: string
          invoice_number?: string
          iva?: number
          iva_rate?: number
          order_id?: string
          restaurant_id?: string
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: []
      }
      menu_schedules: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string | null
          start_time: string
          end_time: string
          active_days: string[]
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          description?: string | null
          start_time: string
          end_time: string
          active_days?: string[]
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          description?: string | null
          start_time?: string
          end_time?: string
          active_days?: string[]
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_schedules_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          category_id: string | null
          menu_schedule_id: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          name: string
          price: number
          restaurant_id: string
          stock: number
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          menu_schedule_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          price?: number
          restaurant_id: string
          stock?: number
        }
        Update: {
          available?: boolean
          category_id?: string | null
          menu_schedule_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          price?: number
          restaurant_id?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_menu_schedule_id_fkey"
            columns: ["menu_schedule_id"]
            isOneToOne: false
            referencedRelation: "menu_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          notes: string | null
          order_id: string
          price_at_order: number
          quantity: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          price_at_order?: number
          quantity?: number
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          price_at_order?: number
          quantity?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          table_id: string | null
          total: number
          updated_at: string
          waiter_name: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          total?: number
          updated_at?: string
          waiter_name?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          total?: number
          updated_at?: string
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id: string
          method: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_areas: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: { attended_at: string | null; created_at: string; id: string; request_type: string; restaurant_id: string; status: string; table_id: string }
        Insert: { attended_at?: string | null; created_at?: string; id?: string; request_type?: string; restaurant_id: string; status?: string; table_id: string }
        Update: { attended_at?: string | null; created_at?: string; id?: string; request_type?: string; restaurant_id?: string; status?: string; table_id?: string }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          area_id: string | null
          created_at: string
          id: string
          name: string
          restaurant_id: string
          seats: number
          status: Database["public"]["Enums"]["table_status"]
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          seats?: number
          status?: Database["public"]["Enums"]["table_status"]
        }
        Update: {
          area_id?: string | null
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          seats?: number
          status?: Database["public"]["Enums"]["table_status"]
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "restaurant_areas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_order: { Args: { p_order_id: string; p_reason: string }; Returns: { invoice_id: string; order_id: string }[] }
      charge_order: { Args: { p_discount: number; p_discount_type: string; p_iva: number; p_iva_rate: number; p_order_id: string; p_payments: Json; p_subtotal: number; p_total: number }; Returns: { invoice_id: string; invoice_number: string }[] }
      ensure_user_workspace: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      is_authenticated_staff: { Args: never; Returns: boolean }
      submit_public_table_order: { Args: { p_customer_name: string; p_items: Json; p_notes: string; p_table_id: string }; Returns: { order_id: string; total: number }[] }
      submit_service_request: { Args: { p_request_type: string; p_table_id: string }; Returns: string }
    }
    Enums: {
      order_status:
        | "pendiente"
        | "preparando"
        | "listo"
        | "entregado"
        | "cancelado"
        | "pagada"
      table_status: "libre" | "ocupada" | "reservada" | "limpieza"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "pendiente",
        "preparando",
        "listo",
        "entregado",
        "cancelado",
        "pagada",
      ],
      table_status: ["libre", "ocupada", "reservada", "limpieza"],
    },
  },
} as const
