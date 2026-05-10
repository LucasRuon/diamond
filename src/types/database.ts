export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string | null
          created_at: string
          avatar_url: string | null
          phone: string | null
          document: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string | null
          created_at?: string
          avatar_url?: string | null
          phone?: string | null
          document?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string | null
          created_at?: string
          avatar_url?: string | null
          phone?: string | null
          document?: string | null
        }
      }
    }
  }
}
