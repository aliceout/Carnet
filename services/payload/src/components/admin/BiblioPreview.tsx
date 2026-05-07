'use client';

// BiblioPreview — field UI inséré en pied de la vue d'édition d'une
// entrée Bibliography. Affiche :
//   - Un aperçu live de la référence formatée (style Chicago author-date)
//     avec la palette Carnet (fond bg + filet gauche accent 2px)
//   - La liste des billets qui utilisent cette référence
//
// Lit les values du form via useFormFields. Fetch /cms/api/posts pour
// trouver les billets qui ont cette ref dans leur champ bibliography.
//
// Réf : Design/design_handoff_admin/carnet-admin.html → ScreenBiblio.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFormFields, useDocumentInfo } from '@payloadcms/ui';

type Post = {
  id: number | string;
  numero?: number;
  title: string;
};

function formatChicago(values: {
  author?: string;
  year?: string | number;
  title?: string;
  type?: string;
  publisher?: string;
  place?: string;
  pages?: string;
  journal?: string;
  volume?: string;
}): string {
  const parts: string[] = [];
  if (values.author) parts.push(values.author);
  if (values.year !== undefined && values.year !== '') parts.push(`(${values.year})`);
  if (values.title) parts.push(values.title);
  if (values.journal) parts.push(values.journal);
  if (values.volume) parts.push(values.volume);
  if (values.publisher) {
    parts.push(values.place ? `${values.place}, ${values.publisher}` : values.publisher);
  } else if (values.place) {
    parts.push(values.place);
  }
  if (values.pages) parts.push(`p. ${values.pages}`);
  return parts.filter(Boolean).join(', ') + '.';
}

export default function BiblioPreview(): React.ReactElement {
  // Lecture live des values du form
  const author = useFormFields(([f]) => f?.author?.value as string | undefined);
  const year = useFormFields(([f]) => f?.year?.value as string | number | undefined);
  const title = useFormFields(([f]) => f?.title?.value as string | undefined);
  const type = useFormFields(([f]) => f?.type?.value as string | undefined);
  const publisher = useFormFields(([f]) => f?.publisher?.value as string | undefined);
  const place = useFormFields(([f]) => f?.place?.value as string | undefined);
  const pages = useFormFields(([f]) => f?.pages?.value as string | undefined);
  const journal = useFormFields(([f]) => f?.journal?.value as string | undefined);
  const volume = useFormFields(([f]) => f?.volume?.value as string | undefined);

  const formatted = formatChicago({
    author,
    year,
    title,
    type,
    publisher,
    place,
    pages,
    journal,
    volume,
  });

  // Doc info pour avoir l'ID courant et fetcher les used-in
  const info = useDocumentInfo() as { id?: number | string };
  const id = info?.id;

  const [usedIn, setUsedIn] = useState<Post[] | null>(null);
  const [usedInLoading, setUsedInLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setUsedIn([]);
      return;
    }
    setUsedInLoading(true);
    fetch(
      `/cms/api/posts?where[bibliography][in]=${encodeURIComponent(String(id))}&limit=20&depth=0&sort=-publishedAt`,
      { credentials: 'include' },
    )
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      .then((data: { docs?: Post[] }) => setUsedIn(data.docs ?? []))
      .catch(() => setUsedIn([]))
      .finally(() => setUsedInLoading(false));
  }, [id]);

  return (
    <div className="carnet-biblio-preview-wrap">
      <div className="carnet-biblio-preview">
        <div className="carnet-biblio-preview__lbl">Aperçu (style biblio)</div>
        <div className="carnet-biblio-preview__body">{formatted}</div>
      </div>

      {id && (
        <div className="carnet-biblio-usedin">
          {usedInLoading ? (
            <span>Recherche des billets liés…</span>
          ) : !usedIn || usedIn.length === 0 ? (
            <span>Cette référence n'est utilisée dans aucun billet pour l'instant.</span>
          ) : (
            <>
              Utilisée dans {usedIn.length} billet{usedIn.length > 1 ? 's' : ''} :{' '}
              {usedIn.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && ', '}
                  <Link href={`/cms/admin/collections/posts/${p.id}`}>
                    n°&nbsp;{String(p.numero ?? '?').padStart(3, '0')}
                  </Link>
                </React.Fragment>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
