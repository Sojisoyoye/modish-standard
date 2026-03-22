import { createClient, type SanityClient } from 'next-sanity'
import { createImageUrlBuilder } from '@sanity/image-url'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

const isSanityConfigured = projectId.length > 0

const sanityClient: SanityClient | null = isSanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: process.env.NODE_ENV === 'production',
    })
  : null

/**
 * Safe wrapper around sanity client.fetch — returns fallback when
 * Sanity is not configured or the fetch fails.
 */
export async function sanityFetch<T>(
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>,
  fallback: T = [] as unknown as T,
): Promise<T> {
  if (!sanityClient) return fallback
  try {
    const result = params
      ? await sanityClient.fetch<T>(query, params)
      : await sanityClient.fetch<T>(query)
    return result ?? fallback
  } catch {
    return fallback
  }
}

/** Re-export the raw client for cases that need it directly (e.g. seed script) */
export const client = sanityClient

const builder = isSanityConfigured
  ? createImageUrlBuilder({ projectId, dataset })
  : null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: any) {
  if (!builder) return { width: () => ({ height: () => ({ url: () => '' }), url: () => '' }), url: () => '' }
  return builder.image(source)
}
