/* Shared anchor derivation: the renderer assigns these ids to sections and
   the search index uses the same function so deep links always line up. */

export function sectionAnchor(title: string, index: number) {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `sezione-${index + 1}`;
}
