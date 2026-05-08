// SiteEditView — wrapper server pour la vue d'édition custom du global
// Site. Branché via Site.admin.components.views.edit.root.
//
// Remplace entièrement la vue d'édition native Payload pour
// /cms/admin/globals/site. La logique form (fetch + dirty + save) est
// côté client, qui tape /cms/api/globals/site avec les cookies de
// session.

import React from 'react';

import SiteEditViewClient from './SiteEditView.client';

export default function SiteEditView(): React.ReactElement {
  return <SiteEditViewClient />;
}
