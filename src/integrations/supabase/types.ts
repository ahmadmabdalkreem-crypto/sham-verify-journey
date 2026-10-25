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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_acted: {
        Row: {
          acted_at: string
          action_id: string | null
          actor: string | null
          key: string
          note: string | null
          route: string | null
          status: string | null
        }
        Insert: {
          acted_at?: string
          action_id?: string | null
          actor?: string | null
          key: string
          note?: string | null
          route?: string | null
          status?: string | null
        }
        Update: {
          acted_at?: string
          action_id?: string | null
          actor?: string | null
          key?: string
          note?: string | null
          route?: string | null
          status?: string | null
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          fails: number
          ip: string
          locked_until: string | null
          window_start: string
        }
        Insert: {
          fails?: number
          ip: string
          locked_until?: string | null
          window_start?: string
        }
        Update: {
          fails?: number
          ip?: string
          locked_until?: string | null
          window_start?: string
        }
        Relationships: []
      }
      admin_redirect_log: {
        Row: {
          actor: string
          created_at: string
          customer_key: string | null
          emails: string[]
          error: string | null
          id: string
          note: string | null
          request_id: string | null
          route: string | null
          status: string | null
          success: boolean
        }
        Insert: {
          actor?: string
          created_at?: string
          customer_key?: string | null
          emails?: string[]
          error?: string | null
          id?: string
          note?: string | null
          request_id?: string | null
          route?: string | null
          status?: string | null
          success?: boolean
        }
        Update: {
          actor?: string
          created_at?: string
          customer_key?: string | null
          emails?: string[]
          error?: string | null
          id?: string
          note?: string | null
          request_id?: string | null
          route?: string | null
          status?: string | null
          success?: boolean
        }
        Relationships: []
      }
      admin_sync_events: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      blocked_clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          reason: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_role: string
          thread_id: string
        }
        Insert: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_role: string
          thread_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          id: number
          supervisor_client_chat_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          supervisor_client_chat_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          supervisor_client_chat_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      chat_threads: {
        Row: {
          admin_typing_at: string | null
          client_typing_at: string | null
          closed_at: string | null
          created_at: string
          customer_key: string
          customer_name: string | null
          deleted_at: string | null
          emails: string[]
          id: string
          last_message_at: string
          request_id: string | null
          session_id: string | null
          title: string | null
        }
        Insert: {
          admin_typing_at?: string | null
          client_typing_at?: string | null
          closed_at?: string | null
          created_at?: string
          customer_key: string
          customer_name?: string | null
          deleted_at?: string | null
          emails?: string[]
          id?: string
          last_message_at?: string
          request_id?: string | null
          session_id?: string | null
          title?: string | null
        }
        Update: {
          admin_typing_at?: string | null
          client_typing_at?: string | null
          closed_at?: string | null
          created_at?: string
          customer_key?: string
          customer_name?: string | null
          deleted_at?: string | null
          emails?: string[]
          id?: string
          last_message_at?: string
          request_id?: string | null
          session_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      client_routes: {
        Row: {
          email: string
          note: string | null
          route: string | null
          updated_at: string
        }
        Insert: {
          email: string
          note?: string | null
          route?: string | null
          updated_at?: string
        }
        Update: {
          email?: string
          note?: string | null
          route?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_submissions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          kind: string
          page: string | null
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          kind: string
          page?: string | null
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          page?: string | null
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      customer_claims: {
        Row: {
          claimed_at: string
          expires_at: string
          key: string
          supervisor: string
        }
        Insert: {
          claimed_at?: string
          expires_at?: string
          key: string
          supervisor: string
        }
        Update: {
          claimed_at?: string
          expires_at?: string
          key?: string
          supervisor?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          failure_count: number
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_routes: {
        Row: {
          note: string | null
          route: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          note?: string | null
          route?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          note?: string | null
          route?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          admin_note: string | null
          admin_route: string | null
          birth_date: string | null
          country_code: string | null
          created_at: string
          documents: Json | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_seen_at: string | null
          phone: string | null
          reference: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          admin_route?: string | null
          birth_date?: string | null
          country_code?: string | null
          created_at?: string
          documents?: Json | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          reference: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          admin_route?: string | null
          birth_date?: string | null
          country_code?: string | null
          created_at?: string
          documents?: Json | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_apply_customer_action: {
        Args: {
          _actor: string
          _emails: string[]
          _key: string
          _note: string
          _request_id: string
          _route: string
          _session_id: string
          _status: string
        }
        Returns: {
          acted_at: string
          action_id: string
        }[]
      }
      claim_customer: {
        Args: { _key: string; _supervisor: string; _ttl_seconds?: number }
        Returns: {
          claimed_at: string
          is_owner: boolean
          owner: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      panel_customer_detail: {
        Args: { _key: string }
        Returns: {
          created_at: string
          email: string
          id: string
          kind: string
          page: string
          payload: Json
        }[]
      }
      panel_list_customers: {
        Args: {
          _activity?: string
          _limit?: number
          _offset?: number
          _search?: string
          _status?: string
        }
        Returns: {
          canonical_key: string
          city: string
          country: string
          current_page: string
          current_page_at: string
          email: string
          first_at: string
          has_docs: boolean
          has_login: boolean
          has_logout: boolean
          has_otp: boolean
          key: string
          last_at: string
          name: string
          phone: string
          request_id: string
          request_reference: string
          request_status: string
          session_id: string
          sub_count: number
          total_count: number
        }[]
      }
      panel_stats: {
        Args: never
        Returns: {
          rejected: number
          today_submissions: number
          total_requests: number
          total_submissions: number
          under_review: number
          verified: number
        }[]
      }
      release_customer: {
        Args: { _key: string; _supervisor: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      request_status: "under_review" | "needs_info" | "verified" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      request_status: ["under_review", "needs_info", "verified", "rejected"],
    },
  },
} as const
