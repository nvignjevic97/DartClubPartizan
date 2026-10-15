// Supports a tiny Markdown-like link syntax in free text fields (news content, founder bios,
// the about/statute text): [label](url) - the url can be typed with or without "https://"
// (e.g. both [claude.ai](claude.ai) and [claude.ai](https://claude.ai) work). Anything using an
// unexpected scheme (like javascript:) is left as plain, unlinked text for safety. Mirrored
// server-side in SeoController.richTextToHtml for the bot-facing HTML snapshots.
const LINK_RE = /\[([^\]]+)\]\(([^\s)]+)\)/g;

/** Turns a captured url into a safe href: left as-is if it already has an allowed scheme
 * (http(s)/mailto/tel), rejected (returns null, left unlinked) if it has some other scheme
 * (e.g. "javascript:"), otherwise assumed to be a bare domain and given "https://". */
function safeHref(url) {
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
  return 'https://' + url;
}

/** Turns [label](url) into a real link that opens in a new tab; everything else passes through
 * untouched as plain text, so it still renders safely via React's normal escaping. */
export function renderRichText(text) {
  if (!text) return null;
  const nodes = [];
  let last = 0; let m; let key = 0;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const href = safeHref(m[2]);
    nodes.push(href
      ? <a key={key++} href={href} target="_blank" rel="noopener noreferrer">{m[1]}</a>
      : m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Plain-text preview for list/excerpt views: strips the [label](url) syntax down to just the
 * label, then truncates to maxLen. */
export function plainPreview(text, maxLen = 200) {
  if (!text) return '';
  const plain = text.replace(LINK_RE, '$1');
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain;
}
