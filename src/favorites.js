// Saved verses, reflections and quotes (kept in profile.favorites), plus sharing.

export const KIND_LABEL = { verse: 'Verse', reflection: 'Reflection', motivation: 'Quote' }

// The three things on today's card, in a shape we can save or share
export function favItems(words) {
  const out = {}
  if (words?.verse?.text) out.verse = { kind: 'verse', text: words.verse.text, ref: `${words.verse.reference}${words.verse.version ? ` (${words.verse.version})` : ''}` }
  if (words?.reflection) out.reflection = { kind: 'reflection', text: words.reflection, ref: words.verse?.reference ? `On ${words.verse.reference}` : '' }
  if (words?.motivation?.text) out.motivation = { kind: 'motivation', text: words.motivation.text, ref: words.motivation.by ?? '' }
  return out
}

export const favId = (it) => `${it.kind}:${it.text.slice(0, 80)}`
export const isFav = (profile, it) => (profile?.favorites ?? []).some((f) => f.id === favId(it))

export function toggleFav(profile, updateProfile, it, notify) {
  const list = profile?.favorites ?? []
  const id = favId(it)
  if (list.some((f) => f.id === id)) {
    updateProfile({ favorites: list.filter((f) => f.id !== id) })
    notify?.('Removed from your favourites')
  } else {
    updateProfile({ favorites: [{ ...it, id, at: Date.now() }, ...list] })
    notify?.(`${KIND_LABEL[it.kind]} saved to your favourites`)
  }
}

export function shareText(it) {
  const body = it.kind === 'reflection' ? it.text : `“${it.text}”`
  return `${body}${it.ref ? `\n— ${it.ref}` : ''}`
}

// The phone's share sheet (WhatsApp, Instagram, Messages, Copy…); on computers, copies instead.
export async function shareFav(it, notify) {
  const text = shareText(it)
  if (navigator.share) {
    try { await navigator.share({ text }); return } catch (e) { if (e?.name === 'AbortError') return }
  }
  try { await navigator.clipboard.writeText(text); notify?.('Copied. Paste it anywhere') } catch { notify?.('Couldn’t copy on this device') }
}

export async function copyFav(it, notify) {
  try { await navigator.clipboard.writeText(shareText(it)); notify?.('Copied') } catch { notify?.('Couldn’t copy on this device') }
}
