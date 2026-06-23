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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      brand_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          brand_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          brand_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          brand_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_badges_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          bio: string | null
          category: Database["public"]["Enums"]["musee_category"]
          collections_count: number
          cover_url: string | null
          created_at: string
          display_badges: string[]
          followers_count: number
          history: string | null
          id: string
          instagram_handle: string | null
          is_founder: boolean
          is_published: boolean
          is_verified: boolean
          joined_museum_at: string
          level: number
          logo_url: string | null
          name: string
          owner_id: string | null
          rank_score: number | null
          recent_activity_score: number
          sales_total: number
          satisfaction_score: number
          slug: string
          socials: Json
          tagline: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          category?: Database["public"]["Enums"]["musee_category"]
          collections_count?: number
          cover_url?: string | null
          created_at?: string
          display_badges?: string[]
          followers_count?: number
          history?: string | null
          id?: string
          instagram_handle?: string | null
          is_founder?: boolean
          is_published?: boolean
          is_verified?: boolean
          joined_museum_at?: string
          level?: number
          logo_url?: string | null
          name: string
          owner_id?: string | null
          rank_score?: number | null
          recent_activity_score?: number
          sales_total?: number
          satisfaction_score?: number
          slug: string
          socials?: Json
          tagline?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          category?: Database["public"]["Enums"]["musee_category"]
          collections_count?: number
          cover_url?: string | null
          created_at?: string
          display_badges?: string[]
          followers_count?: number
          history?: string | null
          id?: string
          instagram_handle?: string | null
          is_founder?: boolean
          is_published?: boolean
          is_verified?: boolean
          joined_museum_at?: string
          level?: number
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          rank_score?: number | null
          recent_activity_score?: number
          sales_total?: number
          satisfaction_score?: number
          slug?: string
          socials?: Json
          tagline?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          released_at: string | null
          season: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          released_at?: string | null
          season?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          released_at?: string | null
          season?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          brand_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      guestbook_entries: {
        Row: {
          brand_id: string
          created_at: string
          display_name: string
          id: string
          is_hidden: boolean
          message: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          display_name: string
          id?: string
          is_hidden?: boolean
          message: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_hidden?: boolean
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_entries_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      hotspots: {
        Row: {
          brand_id: string | null
          created_at: string
          featured: boolean
          garment_id: string | null
          id: string
          label: string | null
          order_index: number
          pitch: number
          room_id: string
          target_room_id: string | null
          type: string
          updated_at: string
          yaw: number
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          featured?: boolean
          garment_id?: string | null
          id?: string
          label?: string | null
          order_index?: number
          pitch?: number
          room_id: string
          target_room_id?: string | null
          type: string
          updated_at?: string
          yaw?: number
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          featured?: boolean
          garment_id?: string | null
          id?: string
          label?: string | null
          order_index?: number
          pitch?: number
          room_id?: string
          target_room_id?: string | null
          type?: string
          updated_at?: string
          yaw?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotspots_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspots_garment_id_fkey"
            columns: ["garment_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspots_target_room_id_fkey"
            columns: ["target_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      pieces: {
        Row: {
          brand_id: string
          category: Database["public"]["Enums"]["musee_category"]
          collection_id: string | null
          created_at: string
          currency: string
          description: string | null
          display_mode: string
          edition_size: number | null
          id: string
          is_published: boolean
          name: string
          photos: string[]
          price_cents: number
          sizes: string[]
          stock_quantity: number
          story: string | null
        }
        Insert: {
          brand_id: string
          category?: Database["public"]["Enums"]["musee_category"]
          collection_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          display_mode?: string
          edition_size?: number | null
          id?: string
          is_published?: boolean
          name: string
          photos?: string[]
          price_cents?: number
          sizes?: string[]
          stock_quantity?: number
          story?: string | null
        }
        Update: {
          brand_id?: string
          category?: Database["public"]["Enums"]["musee_category"]
          collection_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          display_mode?: string
          edition_size?: number | null
          id?: string
          is_published?: boolean
          name?: string
          photos?: string[]
          price_cents?: number
          sizes?: string[]
          stock_quantity?: number
          story?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pieces_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pieces_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_suspended: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          is_suspended?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          brand_id: string | null
          created_at: string
          floor: number
          id: string
          is_published: boolean
          kind: string
          next_room_id: string | null
          order_index: number
          panorama_url: string
          prev_room_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          floor?: number
          id?: string
          is_published?: boolean
          kind: string
          next_room_id?: string | null
          order_index?: number
          panorama_url: string
          prev_room_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          floor?: number
          id?: string
          is_published?: boolean
          kind?: string
          next_room_id?: string | null
          order_index?: number
          panorama_url?: string
          prev_room_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_next_room_id_fkey"
            columns: ["next_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_prev_room_id_fkey"
            columns: ["prev_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_brand_scores: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "visiteur"
        | "createur_en_attente"
        | "createur_valide"
        | "admin"
        | "super_admin"
      musee_category: "vetements" | "art" | "livres"
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
      app_role: [
        "visiteur",
        "createur_en_attente",
        "createur_valide",
        "admin",
        "super_admin",
      ],
      musee_category: ["vetements", "art", "livres"],
    },
  },
} as const
