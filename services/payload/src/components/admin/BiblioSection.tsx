'use client';

// BiblioSection — 3 named exports rendant un header de section dans
// la vue d'édition d'une entrée Bibliography. Insérés comme `ui` fields
// fantômes dans Bibliography.ts pour grouper visuellement les fields
// existants (cf handoff Design/design_handoff_admin/README.md § 6).

import React from 'react';

function SectionHeader({ label }: { label: string }): React.ReactElement {
  return (
    <div className="carnet-biblio-section">
      <h3 className="carnet-biblio-section__label">{label}</h3>
    </div>
  );
}

export function Identification(): React.ReactElement {
  return <SectionHeader label="Identification" />;
}

export function Publication(): React.ReactElement {
  return <SectionHeader label="Publication" />;
}

export function NotesSection(): React.ReactElement {
  return <SectionHeader label="Notes" />;
}

export default Identification;
