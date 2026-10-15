// Supports a tiny Markdown-like link syntax in free text fields (news content, founder bios,
// the about/statute text): [label](https://example.com). Only http(s) URLs become links -
// anything else is left as plain text, which also keeps this safe against things like
// javascript: URLs pasted by mistake. Mirrored server-side in SeoController.richTextToHtml for
// the bot-facing HTML snapshots.
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** Turns [label](url) into a real link that opens in a new tab; everything else passes through
 * untouched as plain text, so it still renders safely via React's normal escaping. */
export function renderRichText(text) {
  if (!text) return null;
  const nodes = [];
  let last = 0; let m; let key = 0;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(<a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>);
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
