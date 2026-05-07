'use client';

// PostMetaLine — field UI inséré au début des fields de Posts. Rend
// la ligne mono « Billet n° 042 · carnet:2026-042 » au-dessus du
// titre, comme dans la maquette du handoff (.ed-num).
//
// useFormFields lit les values du form en cours d'édition pour que
// la ligne soit à jour quand l'autrice change le numéro ou la date
// de publication.
//
// Réf : Design/design_handoff_admin/carnet-admin.html → .ed-num.

import React from 'react';
import { useFormFields } from '@payloadcms/ui';

function pad3(n: number | string | undefined): string {
  if (n === undefined || n === null || n === '') return '—';
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (Number.isNaN(num)) return String(n);
  return String(num).padStart(3, '0');
}

export default function PostMetaLine(): React.ReactElement {
  const numero = useFormFields(([fields]) => fields?.numero?.value as number | string | undefined);
  const publishedAt = useFormFields(
    ([fields]) => fields?.publishedAt?.value as string | undefined,
  );

  const numLabel = `n° ${pad3(numero)}`;
  let idCarnet = '—';
  if (numero !== undefined && publishedAt) {
    try {
      const year = new Date(publishedAt).getFullYear();
      const padded = pad3(numero);
      idCarnet = `carnet:${year}-${padded}`;
    } catch {
      // ignore
    }
  }

  return (
    <div className="carnet-doc-metaline">
      <span>Billet {numLabel}</span>
      <span aria-hidden="true"> · </span>
      <span className="carnet-doc-metaline__id">{idCarnet}</span>
    </div>
  );
}
