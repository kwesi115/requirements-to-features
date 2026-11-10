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
      event_registrations: {
        Row: {
          attended: boolean
          created_at: string
          event_id: string
          id: string
          student_id: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          event_id: string
          id?: string
          student_id?: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          event_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          created_at: string
          description: string
          duration_hours: number
          id: string
          leader_id: string
          location: string
          organization: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          description?: string
          duration_hours?: number
          id?: string
          leader_id?: string
          location: string
          organization: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string
          duration_hours?: number
          id?: string
          leader_id?: string
          location?: string
          organization?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          causes: string[]
          created_at: string
          full_name: string
          id: string
          organization_name: string
          recruiter_visible: boolean
          skills: string[]
          summary: string
          updated_at: string
        }
        Insert: {
          causes?: string[]
          created_at?: string
          full_name?: string
          id: string
          organization_name?: string
          recruiter_visible?: boolean
          skills?: string[]
          summary?: string
          updated_at?: string
        }
        Update: {
          causes?: string[]
          created_at?: string
          full_name?: string
          id?: string
          organization_name?: string
          recruiter_visible?: boolean
          skills?: string[]
          summary?: string
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
      verification_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entry_id: string
          id: string
          reason: string | null
          student_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entry_id: string
          id?: string
          reason?: string | null
          student_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          reason?: string | null
          student_id?: string
        }
        Relationships: []
      }
      volunteer_entries: {
        Row: {
          activity_date: string
          created_at: string
          description: string
          event_id: string | null
          evidence_path: string | null
          hours: number
          id: string
          org_type: string
          organization: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          status: Database["public"]["Enums"]["entry_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          activity_date: string
          created_at?: string
          description: string
          event_id?: string | null
          evidence_path?: string | null
          hours: number
          id?: string
          org_type?: string
          organization: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: Database["public"]["Enums"]["entry_status"]
          student_id?: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          description?: string
          event_id?: string | null
          evidence_path?: string | null
          hours?: number
          id?: string
          org_type?: string
          organization?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: Database["public"]["Enums"]["entry_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_counts: {
        Args: never
        Returns: {
          event_id: string
          registered: number
        }[]
      }
      event_roster: {
        Args: { _event: string }
        Returns: {
          attended: boolean
          full_name: string
          registered_at: string
          registration_id: string
          student_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_leader: {
        Args: { _event: string; _user: string }
        Returns: boolean
      }
      search_students: {
        Args: {
          _cause?: string
          _min_hours?: number
          _org_type?: string
          _skill?: string
        }
        Returns: {
          causes: string[]
          full_name: string
          id: string
          org_types: string[]
          skills: string[]
          summary: string
          verified_hours: number
        }[]
      }
    }
    Enums: {
      app_role: "student" | "admin" | "recruiter" | "org_leader"
      entry_status: "draft" | "pending" | "verified" | "rejected" | "flagged"
      event_status: "draft" | "published" | "cancelled"
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
      app_role: ["student", "admin", "recruiter", "org_leader"],
      entry_status: ["draft", "pending", "verified", "rejected", "flagged"],
      event_status: ["draft", "published", "cancelled"],
    },
  },
} as const
