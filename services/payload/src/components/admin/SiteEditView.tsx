// SiteEditView — wrapper server pour la vue d'édition custom du global
// Site. Branché via Site.admin.components.views.edit.root.
//
// Remplace entièrement la vue d'édition native Payload pour
// /cms/admin/globals/site. La logique form (fetch + dirty + save) est
// côté client, qui tape /cms/api/globals/site avec les cookies de
// session.
//
// Ce wrapper server lit aussi GIT_COMMIT / GIT_TAG depuis l'env
// (injectés au build du container Payload — cf. Dockerfile + CI) et
// les passe au client pour affichage dans la section « Version ».

import React from 'react';

import SiteEditViewClient from './SiteEditView.client';

export default function SiteEditView(): React.ReactElement {
  const version = {
    commit: process.env.GIT_COMMIT ?? 'dev',
    tag: process.env.GIT_TAG ?? 'dev',
  };
  return <SiteEditViewClient version={version} />;
}
