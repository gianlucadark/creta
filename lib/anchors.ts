/* Derivazione anchor condivisa: il renderer assegna questi id alle sezioni e
   l'indice di ricerca usa la stessa funzione, cosi' i deep link restano allineati. */

export function sectionAnchor(title: string, index: number) {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `sezione-${index + 1}`;
}
