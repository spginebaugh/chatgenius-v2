import { isValidUrl } from '@/lib/utils'

export interface EnvCheckResult {
  isValid: boolean
  missingVars: string[]
  invalidVars: string[]
}

export function checkEnvVars(): EnvCheckResult {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  const invalidVars: string[] = []

  // Validate URL format if present
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !isValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    invalidVars.push('NEXT_PUBLIC_SUPABASE_URL')
  }

  // Validate ANON_KEY format if present (should be a JWT-like string)
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.match(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
    invalidVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    isValid: missingVars.length === 0 && invalidVars.length === 0,
    missingVars,
    invalidVars
  }
}

// Helper function to safely get env vars with types
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
} 