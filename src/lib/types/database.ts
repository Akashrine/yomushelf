export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// null in the database = not specified. "other" only exists in older rows.
export type AcquisitionType = "bought" | "gift" | "borrowed" | "other";
export type ReadingStatus = "reading" | "read";
export type Demographic = "kodomo" | "shonen" | "shojo" | "seinen" | "josei";
export type WishlistPriority = "high" | "low";

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
          liked_genres: string[];
          discovery_scope: "all" | "youth_verified";
          avoided_genres: string[];
          bio: string | null;
          public_slug: string | null;
          sharing_locked: boolean;
        };
        Insert: {
          id: string;
          username?: string | null;
          email: string;
          created_at?: string;
          onboarding_completed?: boolean;
          avatar_initials?: string;
          is_public?: boolean;
          liked_genres?: string[];
          discovery_scope?: "all" | "youth_verified";
          avoided_genres?: string[];
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
          liked_genres?: string[];
          discovery_scope?: "all" | "youth_verified";
          avoided_genres?: string[];
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
          genres: string[];
          demographic: Demographic | null;
          audience_min_age: number | null;
          audience_age_source: "cnlj" | "estimate" | null;
          audience_age_scope: "series" | "volume" | null;
          audience_age_volumes: number[] | null;
          audience_age_ref: string | null;
          audience_age_year: number | null;
          curated: boolean;
          merged_into: string | null;
          pictures: string[];
          pictures_checked_at: string | null;
          synopsis: string | null;
          aliases: string[];
          created_by: string | null;
          search_key: string;
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
          genres?: string[];
          demographic?: Demographic | null;
          audience_min_age?: number | null;
          audience_age_source?: "cnlj" | "estimate" | null;
          audience_age_scope?: "series" | "volume" | null;
          audience_age_volumes?: number[] | null;
          audience_age_ref?: string | null;
          audience_age_year?: number | null;
          curated?: boolean;
          merged_into?: string | null;
          pictures?: string[];
          pictures_checked_at?: string | null;
          synopsis?: string | null;
          aliases?: string[];
          created_by?: string | null;
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
          genres?: string[];
          demographic?: Demographic | null;
          audience_min_age?: number | null;
          audience_age_source?: "cnlj" | "estimate" | null;
          audience_age_scope?: "series" | "volume" | null;
          audience_age_volumes?: number[] | null;
          audience_age_ref?: string | null;
          audience_age_year?: number | null;
          curated?: boolean;
          merged_into?: string | null;
          pictures?: string[];
          pictures_checked_at?: string | null;
          synopsis?: string | null;
          aliases?: string[];
          created_by?: string | null;
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
          archived_at: string | null;
          liked: boolean | null;
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
          archived_at?: string | null;
          liked?: boolean | null;
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
          archived_at?: string | null;
          liked?: boolean | null;
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
      user_volumes: {
        Row: {
          id: string;
          user_id: string;
          manga_id: string;
          volume_number: number;
          price_eur: number | null;
          acquisition_type: AcquisitionType | null;
          acquired_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          manga_id: string;
          volume_number: number;
          price_eur?: number | null;
          acquisition_type?: AcquisitionType | null;
          acquired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          manga_id?: string;
          volume_number?: number;
          price_eur?: number | null;
          acquisition_type?: AcquisitionType | null;
          acquired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_volumes_manga_id_fkey";
            columns: ["manga_id"];
            isOneToOne: false;
            referencedRelation: "mangas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_volumes_collection_fkey";
            columns: ["user_id", "manga_id"];
            isOneToOne: false;
            referencedRelation: "user_collections";
            referencedColumns: ["user_id", "manga_id"];
          }
        ];
      };
      user_readings: {
        Row: {
          id: string;
          user_id: string;
          manga_id: string;
          volume_number: number;
          status: ReadingStatus;
          finished_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          manga_id: string;
          volume_number: number;
          status: ReadingStatus;
          finished_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          manga_id?: string;
          volume_number?: number;
          status?: ReadingStatus;
          finished_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_readings_manga_id_fkey";
            columns: ["manga_id"];
            isOneToOne: false;
            referencedRelation: "mangas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_readings_collection_fkey";
            columns: ["user_id", "manga_id"];
            isOneToOne: false;
            referencedRelation: "user_collections";
            referencedColumns: ["user_id", "manga_id"];
          }
        ];
      };
      discovery_dismissals: {
        Row: { user_id: string; manga_id: string; created_at: string };
        Insert: { user_id: string; manga_id: string; created_at?: string };
        Update: { user_id?: string; manga_id?: string; created_at?: string };
        Relationships: [];
      };
      editorial_selections: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          position: number;
          published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          position?: number;
          published?: boolean;
        };
        Update: {
          slug?: string;
          title?: string;
          description?: string | null;
          position?: number;
          published?: boolean;
        };
        Relationships: [];
      };
      editorial_selection_items: {
        Row: { selection_id: string; manga_id: string; position: number; note: string | null };
        Insert: { selection_id: string; manga_id: string; position?: number; note?: string | null };
        Update: { position?: number; note?: string | null };
        Relationships: [
          {
            foreignKeyName: "editorial_selection_items_selection_id_fkey";
            columns: ["selection_id"];
            isOneToOne: false;
            referencedRelation: "editorial_selections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "editorial_selection_items_manga_id_fkey";
            columns: ["manga_id"];
            isOneToOne: false;
            referencedRelation: "mangas";
            referencedColumns: ["id"];
          }
        ];
      };
      wishlist_items: {
        Row: {
          id: string;
          user_id: string;
          manga_id: string;
          volume_number: number | null;
          target_price: number | null;
          priority: WishlistPriority;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          manga_id: string;
          volume_number?: number | null;
          target_price?: number | null;
          priority?: WishlistPriority;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          manga_id?: string;
          volume_number?: number | null;
          target_price?: number | null;
          priority?: WishlistPriority;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_items_manga_id_fkey";
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
      search_mangas: {
        Args: { p_query: string; p_limit?: number };
        Returns: {
          id: string;
          title: string;
          author: string | null;
          publisher_fr: string | null;
          total_volumes: number | null;
          status: "ongoing" | "completed" | "paused";
          cover_url: string | null;
          genres: string[];
          demographic: Demographic | null;
          audience_min_age: number | null;
          external_ids: Json;
          is_private: boolean;
          score: number;
        }[];
      };
      consume_import_quota: {
        Args: { p_user_id: string; p_kind: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
  };
};
