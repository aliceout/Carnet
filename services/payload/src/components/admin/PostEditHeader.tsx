'use client';

// Header custom pour la vue d'édition d'un Post — branché via
// Posts.admin.components.edit.beforeDocumentControls.
//
// Ajoute le breadcrumb « Carnet / Billets / n° XXX » et le chip statut
// (Brouillon / Publié / Planifié) au-dessus de la barre d'actions
// native Payload (qui reste fonctionnelle pour Save / Preview / etc.).
//
// Réf : Design/design_handoff_admin/carnet-admin.html → ScreenDoc
// header section (.top + .crumbs + statusChip).

import React from 'react';
import { useDocumentInfo } from '@payloadcms/ui';

function pad3(n: number | string | undefined): string {
  if (n === undefined || n === null || n === '') return '—';
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (Number.isNaN(num)) return String(n);
  return String(num).padStart(3, '0');
}

export default function PostEditHeader(): React.ReactElement | null {
  const info = useDocumentInfo();
  // useDocumentInfo() expose { id, title, savedDocumentData, hasPublishedDoc, ... }
  const data = (info as { savedDocumentData?: Record<string, unknown> }).savedDocumentData ?? {};
  const numero = data.numero as number | string | undefined;
  const draft = data.draft as boolean | undefined;
  const publishedAt = data.publishedAt as string | undefined;

  // Inférer le statut visuel : Brouillon / Planifié / Publié
  let statusLabel = 'Publié';
  let statusKind: 'draft' | 'scheduled' | 'published' = 'published';
  if (draft) {
    statusLabel = 'Brouillon';
    statusKind = 'draft';
  } else if (publishedAt && new Date(publishedAt).getTime() > Date.now()) {
    statusLabel = 'Planifié';
    statusKind = 'scheduled';
  }

  return (
    <div className="carnet-doc-header">
      <div className="carnet-doc-header__crumbs">
        <a href="/cms/admin">Carnet</a>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <a href="/cms/admin/collections/posts">Billets</a>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <span className="carnet-doc-header__current">n°&nbsp;{pad3(numero)}</span>
      </div>
      <span className={`carnet-status carnet-status--${statusKind}`}>
        <span className="carnet-status__dot" aria-hidden="true" />
        {statusLabel}
      </span>
    </div>
  );
}
