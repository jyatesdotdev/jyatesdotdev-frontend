const XML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => XML_ENTITIES[character]);
}
