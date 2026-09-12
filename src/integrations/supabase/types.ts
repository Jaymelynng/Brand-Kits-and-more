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
      admin_pins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          pin_hash: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          pin_hash: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          pin_hash?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      asset_categories: {
        Row: {
          asset_type_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          asset_type_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          asset_type_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_comments: {
        Row: {
          asset_id: string
          content: string
          created_at: string | null
          gym_mention_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          content: string
          created_at?: string | null
          gym_mention_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          content?: string
          created_at?: string | null
          gym_mention_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_comments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "gym_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_comments_gym_mention_id_fkey"
            columns: ["gym_mention_id"]
            isOneToOne: false
            referencedRelation: "gym_icon_urls"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "asset_comments_gym_mention_id_fkey"
            columns: ["gym_mention_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_theme_tags: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          theme_tag_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          theme_tag_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          theme_tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_theme_tags_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "gym_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_theme_tags_theme_tag_id_fkey"
            columns: ["theme_tag_id"]
            isOneToOne: false
            referencedRelation: "theme_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      gym_asset_assignments: {
        Row: {
          asset_id: string
          created_at: string | null
          file_url: string | null
          gym_id: string
          id: string
          is_main: boolean
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          file_url?: string | null
          gym_id: string
          id?: string
          is_main?: boolean
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          file_url?: string | null
          gym_id?: string
          id?: string
          is_main?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "gym_asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "gym_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_asset_assignments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_icon_urls"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_asset_assignments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_assets: {
        Row: {
          asset_type_id: string
          category_id: string | null
          created_at: string | null
          description: string | null
          file_url: string
          filename: string
          id: string
          is_all_gyms: boolean
          is_global: boolean
          updated_at: string | null
        }
        Insert: {
          asset_type_id: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          file_url: string
          filename: string
          id?: string
          is_all_gyms?: boolean
          is_global?: boolean
          updated_at?: string | null
        }
        Update: {
          asset_type_id?: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string
          filename?: string
          id?: string
          is_all_gyms?: boolean
          is_global?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_assets_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_colors: {
        Row: {
          brand_id: string | null
          color_hex: string
          created_at: string | null
          gym_id: string | null
          id: string
          order_index: number
        }
        Insert: {
          brand_id?: string | null
          color_hex: string
          created_at?: string | null
          gym_id?: string | null
          id?: string
          order_index?: number
        }
        Update: {
          brand_id?: string | null
          color_hex?: string
          created_at?: string | null
          gym_id?: string | null
          id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_colors_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_colors_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_icon_urls"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_colors_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_elements: {
        Row: {
          created_at: string | null
          display_name: string | null
          element_color: string
          element_type: string
          element_variant: number | null
          gym_id: string | null
          id: string
          svg_data: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          element_color: string
          element_type: string
          element_variant?: number | null
          gym_id?: string | null
          id?: string
          svg_data: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          element_color?: string
          element_type?: string
          element_variant?: number | null
          gym_id?: string | null
          id?: string
          svg_data?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_elements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_icon_urls"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_elements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_font_pairings: {
        Row: {
          accent_font: string | null
          accent_weight: string | null
          body_font: string
          body_weight: string
          created_at: string
          email_fallback: string
          gym_id: string
          heading_font: string
          heading_weight: string
          id: string
          is_preferred: boolean
          name: string
          notes: string | null
          order_index: number
          sample_body: string | null
          sample_heading: string | null
          sample_source: string | null
        }
        Insert: {
          accent_font?: string | null
          accent_weight?: string | null
          body_font: string
          body_weight?: string
          created_at?: string
          email_fallback?: string
          gym_id: string
          heading_font: string
          heading_weight?: string
          id?: string
          is_preferred?: boolean
          name?: string
          notes?: string | null
          order_index?: number
          sample_body?: string | null
          sample_heading?: string | null
          sample_source?: string | null
        }
        Update: {
          accent_font?: string | null
          accent_weight?: string | null
          body_font?: string
          body_weight?: string
          created_at?: string
          email_fallback?: string
          gym_id?: string
          heading_font?: string
          heading_weight?: string
          id?: string
          is_preferred?: boolean
          name?: string
          notes?: string | null
          order_index?: number
          sample_body?: string | null
          sample_heading?: string | null
          sample_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_font_pairings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_icon_urls"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_font_pairings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_logo_tags: {
        Row: {
          logo_id: string
          tag_id: string
        }
        Insert: {
          logo_id: string
          tag_id: string
        }
        Update: {
          logo_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_logo_tags_logo_id_fkey"
            columns: ["logo_id"]
            isOneToOne: false
            referencedRelation: "gym_logos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_logo_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "logo_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_logos: {
        Row: {
          category: string | null
          colorway: string | null
          created_at: string | null
          file_url: string
          filename: string
          gym_id: string | null
          has_alpha: boolean | null
          height: number | null
          id: string
          is_main_logo: boolean | null
          sort_order: number | null
          treatment: string | null
          variant: string | null
          width: number | null
        }
        Insert: {
          category?: string | null
          colorway?: string | null
          created_at?: string | null
          file_url: string
          filename: string
          gym_id?: string | null
          has_alpha?: boolean | null
          height?: number | null
          id?: string
          is_main_logo?: boolean | null
          sort_order?: number | null
          treatment?: string | null
          variant?: string | null
          width?: number | null
        }
        Update: {
          category?: string | null
          colorway?: string | null
          created_at?: string | null
          file_url?: string
          filename?: string
          gym_id?: string | null
          has_alpha?: boolean | null
          height?: number | null
          id?: string
          is_main_logo?: boolean | null
          sort_order?: number | null
          treatment?: string | null
          variant?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_logos_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_icon_urls"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "gym_logos_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          brand_id: string | null
          code: string
          created_at: string | null
          email: string | null
          facebook_url: string | null
          google_maps_url: string | null
          hero_includes_logo: boolean
          hero_video_url: string | null
          iclass_portal_url: string | null
          id: string
          instagram_url: string | null
          name: string
          phone: string | null
          programs_offered: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          brand_id?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          facebook_url?: string | null
          google_maps_url?: string | null
          hero_includes_logo?: boolean
          hero_video_url?: string | null
          iclass_portal_url?: string | null
          id?: string
          instagram_url?: string | null
          name: string
          phone?: string | null
          programs_offered?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          brand_id?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          facebook_url?: string | null
          google_maps_url?: string | null
          hero_includes_logo?: boolean
          hero_video_url?: string | null
          iclass_portal_url?: string | null
          id?: string
          instagram_url?: string | null
          name?: string
          phone?: string | null
          programs_offered?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gyms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_activity: {
        Row: {
          created_at: string
          device: string
          event_kind: string
          gym_id: string
          id: string
          ip_address: unknown
          label: string
          page_path: string
          session_id: string
        }
        Insert: {
          created_at?: string
          device: string
          event_kind: string
          gym_id: string
          id: string
          ip_address?: unknown
          label: string
          page_path: string
          session_id: string
        }
        Update: {
          created_at?: string
          device?: string
          event_kind?: string
          gym_id?: string
          id?: string
          ip_address?: unknown
          label?: string
          page_path?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_activity_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_icon_urls"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "kit_activity_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_activity_limits: {
        Row: {
          attempts: number
          key: string
          window_start: string
        }
        Insert: {
          attempts: number
          key: string
          window_start: string
        }
        Update: {
          attempts?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      kit_activity_preferences: {
        Row: {
          hidden_ips: unknown[]
          hide_own_activity: boolean
          user_id: string
        }
        Insert: {
          hidden_ips?: unknown[]
          hide_own_activity?: boolean
          user_id: string
        }
        Update: {
          hidden_ips?: unknown[]
          hide_own_activity?: boolean
          user_id?: string
        }
        Relationships: []
      }
      kit_auth_attempts: {
        Row: {
          attempts: number
          key: string
          window_start: string
        }
        Insert: {
          attempts: number
          key: string
          window_start: string
        }
        Update: {
          attempts?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      logo_categories: {
        Row: {
          created_at: string
          id: string
          is_protected: boolean
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_protected?: boolean
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_protected?: boolean
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      logo_tags: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      personal_brand_colors: {
        Row: {
          color_hex: string
          color_name: string | null
          created_at: string | null
          id: string
          order_index: number
        }
        Insert: {
          color_hex: string
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_index?: number
        }
        Update: {
          color_hex?: string
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_index?: number
        }
        Relationships: []
      }
      personal_brand_images: {
        Row: {
          created_at: string | null
          file_url: string
          filename: string
          id: string
          label: string | null
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          file_url: string
          filename: string
          id?: string
          label?: string | null
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          file_url?: string
          filename?: string
          id?: string
          label?: string | null
          order_index?: number | null
        }
        Relationships: []
      }
      personal_brand_info: {
        Row: {
          body_font: string | null
          brand_name: string | null
          heading_font: string | null
          id: string
          notes: string | null
          subheading_font: string | null
          tagline: string | null
          updated_at: string | null
        }
        Insert: {
          body_font?: string | null
          brand_name?: string | null
          heading_font?: string | null
          id?: string
          notes?: string | null
          subheading_font?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          body_font?: string | null
          brand_name?: string | null
          heading_font?: string | null
          id?: string
          notes?: string | null
          subheading_font?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      qr_generated: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          content: string
          created_at: string | null
          destination_type: string | null
          gym_id: string | null
          id: string
          notes: string | null
          qr_image_url: string
          qr_type: string
          tags: string[] | null
          title: string | null
        }
        Insert: {
          batch_id?: string | null
          batch_name?: string | null
          content: string
          created_at?: string | null
          destination_type?: string | null
          gym_id?: string | null
          id?: string
          notes?: string | null
          qr_image_url: string
          qr_type?: string
          tags?: string[] | null
          title?: string | null
        }
        Update: {
          batch_id?: string | null
          batch_name?: string | null
          content?: string
          created_at?: string | null
          destination_type?: string | null
          gym_id?: string | null
          id?: string
          notes?: string | null
          qr_image_url?: string
          qr_type?: string
          tags?: string[] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_generated_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_icon_urls"
            referencedColumns: ["gym_id"]
          },
          {
            foreignKeyName: "qr_generated_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
          is_url: boolean | null
          notes: string | null
          preview_image: string | null
          qr_data: string
          qr_type: string
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
          is_url?: boolean | null
          notes?: string | null
          preview_image?: string | null
          qr_data: string
          qr_type?: string
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
          is_url?: boolean | null
          notes?: string | null
          preview_image?: string | null
          qr_data?: string
          qr_type?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      theme_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tig_variant_snapshot_20260910: {
        Row: {
          filename: string | null
          id: string
          is_main_logo: boolean | null
          variant: string | null
        }
        Insert: {
          filename?: string | null
          id: string
          is_main_logo?: boolean | null
          variant?: string | null
        }
        Update: {
          filename?: string | null
          id?: string
          is_main_logo?: boolean | null
          variant?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      gym_icon_urls: {
        Row: {
          calendar_url: string | null
          chat_url: string | null
          gym_code: string | null
          gym_id: string | null
          star_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_pin_attempt: { Args: { p_client_key: string }; Returns: number }
      get_kit_activity: {
        Args: {
          p_days?: number
          p_gym_id?: string
          p_kind?: string
          p_offset?: number
          p_session_id?: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_kit_activity: {
        Args: {
          p_device: string
          p_event_kind: string
          p_gym_id: string
          p_id: string
          p_ip: unknown
          p_label: string
          p_network_key: string
          p_page_path: string
          p_session_id: string
        }
        Returns: boolean
      }
      reorder_gym_logos: {
        Args: {
          p_expected_ids: string[]
          p_gym_id: string
          p_ordered_ids: string[]
        }
        Returns: undefined
      }
      set_featured_gym_logo: {
        Args: { p_gym_id: string; p_logo_id: string }
        Returns: undefined
      }
      set_kit_activity_filter: {
        Args: { p_hide_own: boolean }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
