import { NextResponse } from 'next/server'
import type { AuthCallbackParams } from '../types/auth'

export function parseCallbackParams(request: Request): AuthCallbackParams {
  const requestUrl = new URL(request.url)
  return {
    code: requestUrl.searchParams.get('code'),
    origin: requestUrl.origin,
    redirectTo: requestUrl.searchParams.get('redirect_to')
  }
}

export function createRedirectResponse(origin: string, path: string): NextResponse {
  return NextResponse.redirect(`${origin}${path}`)
} 