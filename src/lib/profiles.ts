'use client'

type SupabaseLike = {
  from: (table: string) => {
    select: (query: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { is_pro?: boolean | null } | null; error: { message?: string } | null }>
      }
    }
  }
}

export async function getIsPro(supabase: SupabaseLike, userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.warn('[profiles.getIsPro]', error.message)
      return false
    }

    return Boolean(data?.is_pro)
  } catch (error) {
    console.warn('[profiles.getIsPro] unexpected error', error)
    return false
  }
}
