export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          peso_kg: number;
          altura_cm: number;
          sexo: string;
          nivel_atividade: string;
          objetivo: string;
          meta_treinos_semana: number;
          equipment: string[];
          avoided_exercises: Json;
          session_length_min: number;
          preferred_time: string;
          check_in_mode: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome?: string;
          peso_kg?: number;
          altura_cm?: number;
          sexo?: string;
          nivel_atividade?: string;
          objetivo?: string;
          meta_treinos_semana?: number;
          equipment?: string[];
          avoided_exercises?: Json;
          session_length_min?: number;
          preferred_time?: string;
          check_in_mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          peso_kg?: number;
          altura_cm?: number;
          sexo?: string;
          nivel_atividade?: string;
          objetivo?: string;
          meta_treinos_semana?: number;
          equipment?: string[];
          avoided_exercises?: Json;
          session_length_min?: number;
          preferred_time?: string;
          check_in_mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      exercises: {
        Row: {
          id: string;
          user_id: string | null;
          nome: string;
          grupo_primario: string;
          grupos_secundarios: string[];
          equipamento: string;
          instrucoes: string;
          midia_url: string | null;
          is_custom: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          nome: string;
          grupo_primario: string;
          grupos_secundarios?: string[];
          equipamento: string;
          instrucoes?: string;
          midia_url?: string | null;
          is_custom?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          nome?: string;
          grupo_primario?: string;
          grupos_secundarios?: string[];
          equipamento?: string;
          instrucoes?: string;
          midia_url?: string | null;
          is_custom?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          descricao: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nome: string;
          descricao?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          descricao?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      routine_exercises: {
        Row: {
          id: string;
          routine_id: string;
          exercise_id: string;
          ordem: number;
          series_alvo: number;
          reps_min: number;
          reps_max: number;
          descanso_seg: number;
          notas: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          exercise_id: string;
          ordem?: number;
          series_alvo?: number;
          reps_min?: number;
          reps_max?: number;
          descanso_seg?: number;
          notas?: string;
        };
        Update: {
          id?: string;
          routine_id?: string;
          exercise_id?: string;
          ordem?: number;
          series_alvo?: number;
          reps_min?: number;
          reps_max?: number;
          descanso_seg?: number;
          notas?: string;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string | null;
          iniciado_em: string;
          finalizado_em: string | null;
          duracao_seg: number;
          volume_total_kg: number;
          notas: string;
          origem: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          routine_id?: string | null;
          iniciado_em?: string;
          finalizado_em?: string | null;
          duracao_seg?: number;
          volume_total_kg?: number;
          notas?: string;
          origem?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          routine_id?: string | null;
          iniciado_em?: string;
          finalizado_em?: string | null;
          duracao_seg?: number;
          volume_total_kg?: number;
          notas?: string;
          origem?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          ordem_exercicio: number;
          serie_num: number;
          tipo_serie: string;
          peso_kg: number;
          reps: number;
          rpe: number | null;
          concluida: boolean;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          ordem_exercicio?: number;
          serie_num?: number;
          tipo_serie?: string;
          peso_kg?: number;
          reps?: number;
          rpe?: number | null;
          concluida?: boolean;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_id?: string;
          ordem_exercicio?: number;
          serie_num?: number;
          tipo_serie?: string;
          peso_kg?: number;
          reps?: number;
          rpe?: number | null;
          concluida?: boolean;
        };
        Relationships: [];
      };
      coach_notes: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          content: string;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind?: string;
          content?: string;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          content?: string;
          tags?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
    };

    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
