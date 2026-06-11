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
      alerts: {
        Row: {
          active: boolean
          condition: Json
          created_at: string | null
          id: string
          player_id: string | null
          profile_id: string | null
          type: string
        }
        Insert: {
          active?: boolean
          condition?: Json
          created_at?: string | null
          id?: string
          player_id?: string | null
          profile_id?: string | null
          type: string
        }
        Update: {
          active?: boolean
          condition?: Json
          created_at?: string | null
          id?: string
          player_id?: string | null
          profile_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          country: string | null
          data_source: string | null
          fetched_at: string | null
          founded: number | null
          id: string
          league_id: string | null
          manager_id: string | null
          name: string
          name_norm: string | null
          primary_color: string | null
          secondary_color: string | null
          short_name: string | null
          slug: string
          squad_value: number | null
          stadium: string | null
        }
        Insert: {
          country?: string | null
          data_source?: string | null
          fetched_at?: string | null
          founded?: number | null
          id: string
          league_id?: string | null
          manager_id?: string | null
          name: string
          name_norm?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          slug: string
          squad_value?: number | null
          stadium?: string | null
        }
        Update: {
          country?: string | null
          data_source?: string | null
          fetched_at?: string | null
          founded?: number | null
          id?: string
          league_id?: string | null
          manager_id?: string | null
          name?: string
          name_norm?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          slug?: string
          squad_value?: number | null
          stadium?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      fixtures: {
        Row: {
          away_id: string | null
          city: string | null
          competition: string | null
          data_source: string | null
          fetched_at: string | null
          home_id: string | null
          id: string
          kickoff: string | null
          round: string | null
          score_away: number | null
          score_home: number | null
          status: string | null
          venue: string | null
        }
        Insert: {
          away_id?: string | null
          city?: string | null
          competition?: string | null
          data_source?: string | null
          fetched_at?: string | null
          home_id?: string | null
          id: string
          kickoff?: string | null
          round?: string | null
          score_away?: number | null
          score_home?: number | null
          status?: string | null
          venue?: string | null
        }
        Update: {
          away_id?: string | null
          city?: string | null
          competition?: string | null
          data_source?: string | null
          fetched_at?: string | null
          home_id?: string | null
          id?: string
          kickoff?: string | null
          round?: string | null
          score_away?: number | null
          score_home?: number | null
          status?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      leagues: {
        Row: {
          club_count: number | null
          country: string | null
          data_source: string | null
          fetched_at: string | null
          id: string
          name: string
          name_norm: string | null
          season: number | null
          slug: string
          tier: number | null
          total_value: number | null
        }
        Insert: {
          club_count?: number | null
          country?: string | null
          data_source?: string | null
          fetched_at?: string | null
          id: string
          name: string
          name_norm?: string | null
          season?: number | null
          slug: string
          tier?: number | null
          total_value?: number | null
        }
        Update: {
          club_count?: number | null
          country?: string | null
          data_source?: string | null
          fetched_at?: string | null
          id?: string
          name?: string
          name_norm?: string | null
          season?: number | null
          slug?: string
          tier?: number | null
          total_value?: number | null
        }
        Relationships: []
      }
      managers: {
        Row: {
          age: number | null
          data_source: string | null
          fetched_at: string | null
          id: string
          name: string
          nationality: string | null
          tenure_start: string | null
        }
        Insert: {
          age?: number | null
          data_source?: string | null
          fetched_at?: string | null
          id: string
          name: string
          nationality?: string | null
          tenure_start?: string | null
        }
        Update: {
          age?: number | null
          data_source?: string | null
          fetched_at?: string | null
          id?: string
          name?: string
          nationality?: string | null
          tenure_start?: string | null
        }
        Relationships: []
      }
      national_team_squads: {
        Row: {
          caps: number | null
          national_team_id: string
          player_id: string
        }
        Insert: {
          caps?: number | null
          national_team_id: string
          player_id: string
        }
        Update: {
          caps?: number | null
          national_team_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "national_team_squads_national_team_id_fkey"
            columns: ["national_team_id"]
            isOneToOne: false
            referencedRelation: "national_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "national_team_squads_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      national_teams: {
        Row: {
          confederation: string | null
          data_source: string | null
          fetched_at: string | null
          fifa_rank: number | null
          group_letter: string | null
          id: string
          manager_id: string | null
          name: string
          slug: string
          squad_value: number | null
        }
        Insert: {
          confederation?: string | null
          data_source?: string | null
          fetched_at?: string | null
          fifa_rank?: number | null
          group_letter?: string | null
          id: string
          manager_id?: string | null
          name: string
          slug: string
          squad_value?: number | null
        }
        Update: {
          confederation?: string | null
          data_source?: string | null
          fetched_at?: string | null
          fifa_rank?: number | null
          group_letter?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          slug?: string
          squad_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "national_teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          profile_id: string | null
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json
          profile_id?: string | null
          read?: boolean
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          profile_id?: string | null
          read?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_injuries: {
        Row: {
          category: string
          end_date: string | null
          fetched_at: string
          player_id: string
          source: string
          start_date: string | null
        }
        Insert: {
          category?: string
          end_date?: string | null
          fetched_at?: string
          player_id: string
          source?: string
          start_date?: string | null
        }
        Update: {
          category?: string
          end_date?: string | null
          fetched_at?: string
          player_id?: string
          source?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_injuries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          advanced: Json | null
          apps: number | null
          assists: number | null
          assists_p90: number | null
          data_source: string | null
          fetched_at: string | null
          goals: number | null
          goals_p90: number | null
          minutes: number | null
          player_id: string
          rating: number | null
          season: number
          xa: number | null
          xg: number | null
        }
        Insert: {
          advanced?: Json | null
          apps?: number | null
          assists?: number | null
          assists_p90?: number | null
          data_source?: string | null
          fetched_at?: string | null
          goals?: number | null
          goals_p90?: number | null
          minutes?: number | null
          player_id: string
          rating?: number | null
          season: number
          xa?: number | null
          xg?: number | null
        }
        Update: {
          advanced?: Json | null
          apps?: number | null
          assists?: number | null
          assists_p90?: number | null
          data_source?: string | null
          fetched_at?: string | null
          goals?: number | null
          goals_p90?: number | null
          minutes?: number | null
          player_id?: string
          rating?: number | null
          season?: number
          xa?: number | null
          xg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_valuations: {
        Row: {
          band_high: number
          band_low: number
          computed_at: string | null
          confidence_pct: number
          model_version: string
          pillar_scores: Json
          player_id: string
          value_eur: number
        }
        Insert: {
          band_high: number
          band_low: number
          computed_at?: string | null
          confidence_pct?: number
          model_version: string
          pillar_scores?: Json
          player_id: string
          value_eur: number
        }
        Update: {
          band_high?: number
          band_low?: number
          computed_at?: string | null
          confidence_pct?: number
          model_version?: string
          pillar_scores?: Json
          player_id?: string
          value_eur?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_valuations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number | null
          club_id: string | null
          contract_until: number | null
          data_source: string | null
          detailed_pos: string | null
          dob: string | null
          fetched_at: string | null
          foot: string | null
          height_cm: number | null
          id: string
          known_as: string | null
          name: string
          name_norm: string | null
          nationality: string | null
          photo_url: string | null
          position: string | null
          shirt_no: number | null
          slug: string
          sportmonks_id: string | null
          sportmonks_synced_at: string | null
        }
        Insert: {
          age?: number | null
          club_id?: string | null
          contract_until?: number | null
          data_source?: string | null
          detailed_pos?: string | null
          dob?: string | null
          fetched_at?: string | null
          foot?: string | null
          height_cm?: number | null
          id: string
          known_as?: string | null
          name: string
          name_norm?: string | null
          nationality?: string | null
          photo_url?: string | null
          position?: string | null
          shirt_no?: number | null
          slug: string
          sportmonks_id?: string | null
          sportmonks_synced_at?: string | null
        }
        Update: {
          age?: number | null
          club_id?: string | null
          contract_until?: number | null
          data_source?: string | null
          detailed_pos?: string | null
          dob?: string | null
          fetched_at?: string | null
          foot?: string | null
          height_cm?: number | null
          id?: string
          known_as?: string | null
          name?: string
          name_norm?: string | null
          nationality?: string | null
          photo_url?: string | null
          position?: string | null
          shirt_no?: number | null
          slug?: string
          sportmonks_id?: string | null
          sportmonks_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          tier: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          tier?: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          tier?: string
          username?: string | null
        }
        Relationships: []
      }
      rumour_comments: {
        Row: {
          author_name: string | null
          body: string
          created_at: string
          id: string
          profile_id: string
          rumour_id: string
        }
        Insert: {
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          profile_id: string
          rumour_id: string
        }
        Update: {
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          profile_id?: string
          rumour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumour_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rumour_comments_rumour_id_fkey"
            columns: ["rumour_id"]
            isOneToOne: false
            referencedRelation: "rumours"
            referencedColumns: ["id"]
          },
        ]
      }
      rumour_sources: {
        Row: {
          rumour_id: string
          seen_at: string
          source: string | null
          tier: number | null
          url: string
        }
        Insert: {
          rumour_id: string
          seen_at?: string
          source?: string | null
          tier?: number | null
          url: string
        }
        Update: {
          rumour_id?: string
          seen_at?: string
          source?: string | null
          tier?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumour_sources_rumour_id_fkey"
            columns: ["rumour_id"]
            isOneToOne: false
            referencedRelation: "rumours"
            referencedColumns: ["id"]
          },
        ]
      }
      rumours: {
        Row: {
          corroborations: number
          first_seen: string
          id: string
          last_update: string
          player_id: string
          primary_source: string
          reported_fee_eur: number | null
          resolved_at: string | null
          resolved_confidence: number | null
          source_tier: number
          status: string
          summary: string
          to_club: string
          url: string | null
        }
        Insert: {
          corroborations?: number
          first_seen?: string
          id?: string
          last_update?: string
          player_id: string
          primary_source: string
          reported_fee_eur?: number | null
          resolved_at?: string | null
          resolved_confidence?: number | null
          source_tier?: number
          status?: string
          summary: string
          to_club: string
          url?: string | null
        }
        Update: {
          corroborations?: number
          first_seen?: string
          id?: string
          last_update?: string
          player_id?: string
          primary_source?: string
          reported_fee_eur?: number | null
          resolved_at?: string | null
          resolved_confidence?: number | null
          source_tier?: number
          status?: string
          summary?: string
          to_club?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rumours_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          confidence: number | null
          data_source: string | null
          date: string | null
          fee: number | null
          fetched_at: string | null
          from_club_id: string | null
          id: string
          player_id: string | null
          source: string | null
          status: string | null
          to_club_id: string | null
          type: string | null
        }
        Insert: {
          confidence?: number | null
          data_source?: string | null
          date?: string | null
          fee?: number | null
          fetched_at?: string | null
          from_club_id?: string | null
          id: string
          player_id?: string | null
          source?: string | null
          status?: string | null
          to_club_id?: string | null
          type?: string | null
        }
        Update: {
          confidence?: number | null
          data_source?: string | null
          date?: string | null
          fee?: number | null
          fetched_at?: string | null
          from_club_id?: string | null
          id?: string
          player_id?: string | null
          source?: string | null
          status?: string | null
          to_club_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_club_id_fkey"
            columns: ["from_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_club_id_fkey"
            columns: ["to_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      valuation_history: {
        Row: {
          date: string
          player_id: string
          value_eur: number
        }
        Insert: {
          date: string
          player_id: string
          value_eur: number
        }
        Update: {
          date?: string
          player_id?: string
          value_eur?: number
        }
        Relationships: [
          {
            foreignKeyName: "valuation_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_items: {
        Row: {
          added_at: string | null
          alert_threshold: number | null
          player_id: string
          profile_id: string
        }
        Insert: {
          added_at?: string | null
          alert_threshold?: number | null
          player_id: string
          profile_id: string
        }
        Update: {
          added_at?: string | null
          alert_threshold?: number | null
          player_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      f_unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
