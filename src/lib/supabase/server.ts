// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => cookieStore.get(name)?.value,
                set: (name: string, value: string, options: CookieOptions) => {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // Silently handle cookie setting errors in non-action contexts
                        console.warn('Could not set cookie:', name, error)
                    }
                },
                remove: (name: string, options: CookieOptions) => {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // Silently handle cookie removal errors in non-action contexts
                        console.warn('Could not remove cookie:', name, error)
                    }
                },
            }
        }
    )
}