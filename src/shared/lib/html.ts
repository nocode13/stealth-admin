/**
 * Plain text из HTML-описания — для превью, где разметка не рендерится (баннер продавца).
 * После закрывающих блочных тегов и `<br>` вставляем пробел, иначе `<p>a</p><p>b</p>`
 * склеилось бы в «ab». `DOMParser` скрипты не исполняет.
 */
export const htmlToText = (html: string | null | undefined): string => {
  if (!html) return '';
  const spaced = html.replace(/<\/(p|h2|h3|li|blockquote)>|<br\s*\/?>/gi, '$& ');
  const doc = new DOMParser().parseFromString(spaced, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
};
