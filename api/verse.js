// Vercel serverless function: one Bible passage in the NLT, via Tyndale's official NLT API.
// Needs NLT_API_KEY (free from https://api.nlt.to). Responses are cached at the edge for a day.
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, '’').replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, '—').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

export default async function handler(req, res) {
  const ref = String(req.query.ref || '').slice(0, 40).trim()
  if (!/^[\w\s:.,-]+$/.test(ref)) return res.status(400).json({ error: 'Bad reference' })
  const key = process.env.NLT_API_KEY
  if (!key) return res.status(503).json({ error: 'NLT_API_KEY not set' })
  try {
    const r = await fetch(`https://api.nlt.to/api/passages?ref=${encodeURIComponent(ref)}&version=NLT&key=${encodeURIComponent(key)}`)
    if (!r.ok) return res.status(502).json({ error: `NLT API ${r.status}` })
    const html = await r.text()
    const body = html.split(/<body[^>]*>/i)[1] ?? html
    const text = decode(
      body
        .replace(/<h\d[^>]*>[\s\S]*?<\/h\d>/gi, ' ') // section headings
        .replace(/<span class="vn">[\s\S]*?<\/span>/gi, ' ') // verse numbers
        .replace(/<a class="a-tn">[\s\S]*?<\/a>/gi, '') // footnote markers
        .replace(/<span class="tn-ref">[\s\S]*?<\/span>/gi, '') // footnote reference (nested)
        .replace(/<span class="tn">[\s\S]*?<\/span>/gi, '') // footnote text
        .replace(/<[^>]+>/g, ' '),
    ).replace(/\s+/g, ' ').replace(/\s([,.;:!?’”])/g, '$1').trim()
    if (!text) return res.status(502).json({ error: 'Empty passage' })
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ text, reference: ref, version: 'NLT' })
  } catch {
    return res.status(502).json({ error: 'NLT API unreachable' })
  }
}
