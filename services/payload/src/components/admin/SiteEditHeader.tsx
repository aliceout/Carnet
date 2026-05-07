'use client';

// Header custom pour la vue d'édition du global Site —
// branché via Site.admin.components.elements.beforeDocumentControls.
// Affiche les crumbs « Carnet / Site (global) » au-dessus de la
// barre d'actions native Payload (Save reste fonctionnel).

import React from 'react';

export default function SiteEditHeader(): React.ReactElement {
  return (
    <div className="carnet-doc-header">
      <div className="carnet-doc-header__crumbs">
        <a href="/cms/admin">Carnet</a>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <span className="carnet-doc-header__current">Site (global)</span>
      </div>
    </div>
  );
}
