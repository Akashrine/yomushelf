export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          email: string;
          created_at: string;
          onboarding_completed: boolean;
          avatar_initials: string;
          is_public: boolean;
          bio: string | null;
          public_slug: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          email: string;
          created_at?: string;
          onboarding_completed?: boolean;
          avatar_initials?: string;
          is_public?: boolean;
          bio?: string | null;
          public_slug?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          email?: string;
          created_at?: string;
          onboarding_completed?: boolean;
          avatar_initials?: string;
          is_public?: boolean;
          bio?: string | null;
          public_slug?: string | null;
        };
        Relationships: [];
      };
      mangas: {
        Row: {
          id: string;
          title: string;
          author: string | null;
          publisher_fr: string | null;
          total_volumes: number | null;
          status: "ongoing" | "completed" | "paused";
          avg_price_eur: number;
          genre_primary: string | null;
          cover_url: string | null;
          external_ids: Json;
          is_top_50_fr: boolean;
          top_50_rank: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          author?: string | null;
          publisher_fr?: string | null;
          total_volumes?: number | null;
          status?: "ongoing" | "completed" | "paused";
          avg_price_eur?: number;
          genre_primary?: string | null;
          cover_url?: string | null;
          external_ids?: Json;
          is_top_50_fr?: boolean;
          top_50_rank?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string | null;
          publisher_fr?: string | null;
          total_volumes?: number | null;
          status?: "ongoing" | "completed" | "paused";
          avg_price_eur?: number;
          genre_primary?: string | null;
          cover_url?: string | null;
          external_ids?: Json;
          is_top_50_fr?: boolean;
          top_50_rank?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      volumes: {
        Row: {
          id: string;
          manga_id: string;
          volume_number: number;
          isbn_13: string | null;
          release_date_fr: string | null;
          price_eur: number | null;
          cover_url: string | null;
          edition: "standard" | "double" | "perfect" | "collector";
          created_at: string;
        };
        Insert: {
          id?: string;
          manga_id: string;
          volume_number: number;
          isbn_13?: string | null;
          release_date_fr?: string | null;
          price_eur?: number | null;
          cover_url?: string | null;
          edition?: "standard" | "double" | "perfect" | "collector";
          created_at?: string;
        };
        Update: {
          id?: string;
          manga_id?: string;
          volume_number?: number;
          isbn_13?: string | null;
          release_date_fr?: string | null;
          price_eur?: number | null;
          cover_url?: string | null;
          edition?: "standard" | "double" | "perfect" | "collector";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "volumes_manga_id_fkey";
            columns: ["manga_id"];
            isOneToOne: false;
            referencedRelation: "mangas";
            referencedColumns: ["id"];
          }
        ];
      };
      user_collections: {
        Row: {
          id: string;
          user_id: string;
          manga_id: string;
          owned_volumes: number[];
          last_read_volume: number | null;
          status:
            | "not_started"
            | "reading"
            | "caught_up"
            | "completed"
            | "dropped";
          first_added_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          manga_id: string;
          owned_volumes?: number[];
          last_read_volume?: number | null;
          status?:
            | "not_started"
            | "reading"
            | "caught_up"
            | "completed"
            | "dropped";
          first_added_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          manga_id?: string;
          owned_volumes?: number[];
          last_read_volume?: number | null;
          status?:
            | "not_started"
            | "reading"
            | "caught_up"
            | "completed"
            | "dropped";
          first_added_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_collections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_collections_manga_id_fkey";
            columns: ["manga_id"];
            isOneToOne: false;
            referencedRelation: "mangas";
            referencedColumns: ["id"];
          }
        ];
      };
      waitlist_entries: {
        Row: {
          id: string;
          email: string;
          source:
            | "landing_hero"
            | "landing_footer"
            | "tiktok_campaign"
            | "other";
          created_at: string;
          confirmed: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          source?:
            | "landing_hero"
            | "landing_footer"
            | "tiktok_campaign"
            | "other";
          created_at?: string;
          confirmed?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          source?:
            | "landing_hero"
            | "landing_footer"
            | "tiktok_campaign"
            | "other";
          created_at?: string;
          confirmed?: boolean;
        };
        Relationships: [];
      };
      share_events: {
        Row: {
          id: string;
          user_id: string;
          share_type: "profile_link" | "collection_card" | "wrapped_card";
          format: "landscape" | "story" | "link";
          target_platform: "x" | "tiktok" | "instagram" | "whatsapp" | "discord" | "direct" | "copy" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          share_type: "profile_link" | "collection_card" | "wrapped_card";
          format: "landscape" | "story" | "link";
          target_platform?: "x" | "tiktok" | "instagram" | "whatsapp" | "discord" | "direct" | "copy" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          share_type?: "profile_link" | "collection_card" | "wrapped_card";
          format?: "landscape" | "story" | "link";
          target_platform?: "x" | "tiktok" | "instagram" | "whatsapp" | "discord" | "direct" | "copy" | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "share_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      wrapped_snapshots: {
        Row: {
          id: string;
          user_id: string;
          year: number;
          total_volumes_added: number;
          total_budget_spent: number;
          top_3_series: Json;
          top_genre: string | null;
          delta_vs_previous_year_pct: number | null;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year: number;
          total_volumes_added?: number;
          total_budget_spent?: number;
          top_3_series?: Json;
          top_genre?: string | null;
          delta_vs_previous_year_pct?: number | null;
          generated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year?: number;
          total_volumes_added?: number;
          total_budget_spent?: number;
          top_3_series?: Json;
          top_genre?: string | null;
          delta_vs_previous_year_pct?: number | null;
          generated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wrapped_snapshots_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          properties: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          properties?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_name?: string;
          properties?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_waitlist_count: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_user_stats: {
        Args: { p_user_id: string };
        Returns: {
          total_series: number;
          total_volumes_owned: number;
          total_budget_eur: number;
          volumes_read: number;
        }[];
      };
      get_public_profile: {
        Args: { p_slug: string };
        Returns: {
          username: string | null;
          bio: string | null;
          avatar_initials: string;
          public_slug: string;
          is_public: boolean;
          member_since: string;
          total_series: number;
          total_volumes: number;
          volumes_read: number;
          top_covers: Json;
          highlights: Json;
        }[];
      };
      generate_wrapped: {
        Args: { p_user_id: string; p_year: number };
        Returns: string;
      };
    };
  };
};
