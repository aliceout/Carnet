'use client';

// SiteEditView (client) — vue Édition custom du global Site qui matche
// le langage visuel de l'admin Carnet (cf .carnet-listview / .carnet-btn).
//
// Layout :
//   - Header : crumbs « Carnet / Site (global) », actions à droite (Save
//     accent + indicateur de modifications)
//   - Section Identité éditoriale : baseline (textarea), ligne copyright
//   - Section Réseaux sociaux : mastodon, bluesky, orcid, hal
//   - Section Liens du footer (col 2 « Naviguer ») : array {label, href,
//     external}, ajout/suppression/réordonnancement
//
// Fetch via /cms/api/globals/site (cookies de session). Save via
// POST /cms/api/globals/site (Payload accepte aussi PUT/PATCH mais la
// REST API expose POST pour les globals).

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import CarnetTopbar from './CarnetTopbar';

const API_URL = '/cms/api/globals/site';

type NavLink = {
  label: string;
  href: string;
  external?: boolean;
};

type SiteData = {
  branding?: {
    accentColor?: string;
    backgroundColor?: string;
  };
  home?: {
    heroTitle?: string;
    heroLede?: string;
  };
  archives?: {
    heroTitle?: string;
    heroLede?: string;
  };
  themes?: {
    heroTitle?: string;
    heroLede?: string;
  };
  baseline?: string;
  copyrightLine?: string;
  social?: {
    mastodon?: string;
    bluesky?: string;
    orcid?: string;
    hal?: string;
  };
  navFooter?: NavLink[];
};

// Doit rester aligné avec les options du select dans globals/Site.ts.
const ACCENT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Violet (par défaut)', value: '#5a3a7a' },
  { label: 'Rouge sourd', value: '#8a3a3a' },
  { label: 'Bleu encre', value: '#1f3a5a' },
  { label: 'Gris ardoise', value: '#3a3a3a' },
  { label: 'Vert forêt', value: '#2d5a3d' },
];
const DEFAULT_ACCENT = ACCENT_OPTIONS[0].value;

const BG_OPTIONS: { label: string; value: string }[] = [
  { label: 'Ivoire (par défaut)', value: '#f6f5f1' },
  { label: 'Presque-blanc', value: '#fdfcf8' },
  { label: 'Blanc pur', value: '#ffffff' },
  { label: 'Craie', value: '#f1efe8' },
  { label: 'Parchemin', value: '#eee9dd' },
  { label: 'Froid pâle', value: '#e9eaec' },
];
const DEFAULT_BG = BG_OPTIONS[0].value;

const EMPTY: SiteData = {
  branding: { accentColor: DEFAULT_ACCENT, backgroundColor: DEFAULT_BG },
  home: { heroTitle: '', heroLede: '' },
  archives: { heroTitle: '', heroLede: '' },
  themes: { heroTitle: '', heroLede: '' },
  baseline: '',
  copyrightLine: '',
  social: { mastodon: '', bluesky: '', orcid: '', hal: '' },
  navFooter: [],
};

export default function SiteEditViewClient(): React.ReactElement {
  const [data, setData] = useState<SiteData>(EMPTY);
  const [initial, setInitial] = useState<SiteData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Charge l'état actuel du global au mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}?depth=0`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((doc: SiteData) => {
        const normalized: SiteData = {
          branding: {
            accentColor: doc.branding?.accentColor || DEFAULT_ACCENT,
            backgroundColor: doc.branding?.backgroundColor || DEFAULT_BG,
          },
          home: {
            heroTitle: doc.home?.heroTitle ?? '',
            heroLede: doc.home?.heroLede ?? '',
          },
          archives: {
            heroTitle: doc.archives?.heroTitle ?? '',
            heroLede: doc.archives?.heroLede ?? '',
          },
          themes: {
            heroTitle: doc.themes?.heroTitle ?? '',
            heroLede: doc.themes?.heroLede ?? '',
          },
          baseline: doc.baseline ?? '',
          copyrightLine: doc.copyrightLine ?? '',
          social: {
            mastodon: doc.social?.mastodon ?? '',
            bluesky: doc.social?.bluesky ?? '',
            orcid: doc.social?.orcid ?? '',
            hal: doc.social?.hal ?? '',
          },
          navFooter: (doc.navFooter ?? []).map((n) => ({
            label: n.label ?? '',
            href: n.href ?? '',
            external: Boolean(n.external),
          })),
        };
        setData(normalized);
        setInitial(normalized);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      })
      .finally(() => setLoading(false));
  }, []);

  const dirty = JSON.stringify(data) !== JSON.stringify(initial);

  function update<K extends keyof SiteData>(key: K, value: SiteData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function updateSocial(key: keyof NonNullable<SiteData['social']>, value: string) {
    setData((d) => ({ ...d, social: { ...(d.social ?? {}), [key]: value } }));
  }

  function updateHome(key: keyof NonNullable<SiteData['home']>, value: string) {
    setData((d) => ({ ...d, home: { ...(d.home ?? {}), [key]: value } }));
  }

  function updateArchives(key: keyof NonNullable<SiteData['archives']>, value: string) {
    setData((d) => ({ ...d, archives: { ...(d.archives ?? {}), [key]: value } }));
  }

  function updateThemes(key: keyof NonNullable<SiteData['themes']>, value: string) {
    setData((d) => ({ ...d, themes: { ...(d.themes ?? {}), [key]: value } }));
  }

  function updateAccent(value: string) {
    setData((d) => ({
      ...d,
      branding: { ...(d.branding ?? {}), accentColor: value },
    }));
  }

  function updateBackground(value: string) {
    setData((d) => ({
      ...d,
      branding: { ...(d.branding ?? {}), backgroundColor: value },
    }));
  }

  function updateNav(idx: number, patch: Partial<NavLink>) {
    setData((d) => {
      const nav = [...(d.navFooter ?? [])];
      nav[idx] = { ...nav[idx], ...patch };
      return { ...d, navFooter: nav };
    });
  }

  function addNav() {
    setData((d) => ({
      ...d,
      navFooter: [...(d.navFooter ?? []), { label: '', href: '', external: false }],
    }));
  }

  function removeNav(idx: number) {
    setData((d) => ({
      ...d,
      navFooter: (d.navFooter ?? []).filter((_, i) => i !== idx),
    }));
  }

  function moveNav(idx: number, delta: -1 | 1) {
    setData((d) => {
      const nav = [...(d.navFooter ?? [])];
      const target = idx + delta;
      if (target < 0 || target >= nav.length) return d;
      [nav[idx], nav[target]] = [nav[target], nav[idx]];
      return { ...d, navFooter: nav };
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
      }
      const doc = (await res.json()) as { result?: SiteData } | SiteData;
      // Payload renvoie soit { result, message } soit le doc direct selon la version
      const fresh: SiteData = (doc as { result?: SiteData }).result ?? (doc as SiteData);
      const normalized: SiteData = {
        branding: {
          accentColor: fresh.branding?.accentColor || DEFAULT_ACCENT,
          backgroundColor: fresh.branding?.backgroundColor || DEFAULT_BG,
        },
        home: {
          heroTitle: fresh.home?.heroTitle ?? '',
          heroLede: fresh.home?.heroLede ?? '',
        },
        archives: {
          heroTitle: fresh.archives?.heroTitle ?? '',
          heroLede: fresh.archives?.heroLede ?? '',
        },
        themes: {
          heroTitle: fresh.themes?.heroTitle ?? '',
          heroLede: fresh.themes?.heroLede ?? '',
        },
        baseline: fresh.baseline ?? '',
        copyrightLine: fresh.copyrightLine ?? '',
        social: {
          mastodon: fresh.social?.mastodon ?? '',
          bluesky: fresh.social?.bluesky ?? '',
          orcid: fresh.social?.orcid ?? '',
          hal: fresh.social?.hal ?? '',
        },
        navFooter: (fresh.navFooter ?? []).map((n) => ({
          label: n.label ?? '',
          href: n.href ?? '',
          external: Boolean(n.external),
        })),
      };
      setData(normalized);
      setInitial(normalized);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="carnet-editview">
      <CarnetTopbar
        crumbs={[{ href: '/cms/admin', label: 'Carnet' }, { label: 'Site (global)' }]}
      >
        {dirty && (
          <span className="carnet-editview__dirty" aria-live="polite">
            Modifications non enregistrées
          </span>
        )}
        {!dirty && savedAt && (
          <span className="carnet-editview__saved" aria-live="polite">
            Enregistré
          </span>
        )}
        <button
          type="button"
          className="carnet-btn carnet-btn--accent"
          onClick={save}
          disabled={!dirty || saving || loading}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </CarnetTopbar>

      {error && <div className="carnet-editview__error">Erreur : {error}</div>}

      {loading ? (
        <div className="carnet-editview__loading">Chargement…</div>
      ) : (
        <form
          className="carnet-editview__form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Branding</h2>
            <p className="carnet-editview__section-help">
              Couleurs appliquées à tout le site — accent (point de la marque,
              item nav actif, kickers, liens des billets, boutons actifs…) et
              fond (body, header, footer, fond des billets).
            </p>

            <label className="carnet-editview__field">
              <span className="lbl">Couleur d&apos;accentuation</span>
              <div className="carnet-accent-picker">
                <span
                  className="carnet-accent-picker__swatch"
                  style={{ background: data.branding?.accentColor || DEFAULT_ACCENT }}
                  aria-hidden="true"
                />
                <select
                  value={data.branding?.accentColor || DEFAULT_ACCENT}
                  onChange={(e) => updateAccent(e.target.value)}
                >
                  {ACCENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.value}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="carnet-editview__field">
              <span className="lbl">Couleur de fond</span>
              <div className="carnet-accent-picker">
                <span
                  className="carnet-accent-picker__swatch"
                  style={{ background: data.branding?.backgroundColor || DEFAULT_BG }}
                  aria-hidden="true"
                />
                <select
                  value={data.branding?.backgroundColor || DEFAULT_BG}
                  onChange={(e) => updateBackground(e.target.value)}
                >
                  {BG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.value}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Page d&apos;accueil</h2>
            <p className="carnet-editview__section-help">
              Titre principal et texte de présentation affichés en haut de la home.
              Entourer une portion de <code>*</code> pour la mettre en italique
              dans le titre (ex. <code>*études de genre*</code>).
            </p>

            <label className="carnet-editview__field">
              <span className="lbl">Titre du hero</span>
              <textarea
                rows={3}
                value={data.home?.heroTitle ?? ''}
                onChange={(e) => updateHome('heroTitle', e.target.value)}
              />
            </label>

            <label className="carnet-editview__field">
              <span className="lbl">Texte de présentation (lede)</span>
              <textarea
                rows={4}
                value={data.home?.heroLede ?? ''}
                onChange={(e) => updateHome('heroLede', e.target.value)}
              />
            </label>
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Page Archives</h2>
            <p className="carnet-editview__section-help">
              Titre et présentation de la page <code>/archives/</code>.
            </p>

            <label className="carnet-editview__field">
              <span className="lbl">Titre du hero</span>
              <textarea
                rows={3}
                value={data.archives?.heroTitle ?? ''}
                onChange={(e) => updateArchives('heroTitle', e.target.value)}
              />
            </label>

            <label className="carnet-editview__field">
              <span className="lbl">Texte de présentation (lede)</span>
              <textarea
                rows={4}
                value={data.archives?.heroLede ?? ''}
                onChange={(e) => updateArchives('heroLede', e.target.value)}
              />
            </label>
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Page Thèmes</h2>
            <p className="carnet-editview__section-help">
              Titre et présentation de la page <code>/themes/</code>.
            </p>

            <label className="carnet-editview__field">
              <span className="lbl">Titre du hero</span>
              <textarea
                rows={3}
                value={data.themes?.heroTitle ?? ''}
                onChange={(e) => updateThemes('heroTitle', e.target.value)}
              />
            </label>

            <label className="carnet-editview__field">
              <span className="lbl">Texte de présentation (lede)</span>
              <textarea
                rows={4}
                value={data.themes?.heroLede ?? ''}
                onChange={(e) => updateThemes('heroLede', e.target.value)}
              />
            </label>
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Identité éditoriale</h2>
            <p className="carnet-editview__section-help">
              Ces deux lignes apparaissent dans le footer du site (col 1).
            </p>

            <label className="carnet-editview__field">
              <span className="lbl">Baseline</span>
              <textarea
                rows={3}
                value={data.baseline ?? ''}
                onChange={(e) => update('baseline', e.target.value)}
              />
            </label>

            <label className="carnet-editview__field">
              <span className="lbl">Ligne copyright</span>
              <input
                type="text"
                value={data.copyrightLine ?? ''}
                onChange={(e) => update('copyrightLine', e.target.value)}
              />
              <span className="hint">Affichée en mono sous la baseline.</span>
            </label>
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Réseaux sociaux</h2>
            <p className="carnet-editview__section-help">
              URLs complètes — laisser vide pour masquer.
            </p>

            {(['mastodon', 'bluesky', 'orcid', 'hal'] as const).map((k) => (
              <label key={k} className="carnet-editview__field">
                <span className="lbl">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                <input
                  type="url"
                  value={data.social?.[k] ?? ''}
                  onChange={(e) => updateSocial(k, e.target.value)}
                  placeholder={`https://…`}
                />
              </label>
            ))}
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">
              Liens du footer (col 2 « Naviguer »)
            </h2>
            <p className="carnet-editview__section-help">
              Lus par le footer Astro au SSR. L&apos;ordre ici détermine l&apos;ordre affiché.
            </p>

            <div className="carnet-editview__rows">
              {(data.navFooter ?? []).length === 0 && (
                <div className="carnet-editview__empty">Aucun lien.</div>
              )}
              {(data.navFooter ?? []).map((row, idx) => (
                <div key={idx} className="carnet-editview__row">
                  <label className="carnet-editview__field carnet-editview__field--inline">
                    <span className="lbl">Label</span>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateNav(idx, { label: e.target.value })}
                    />
                  </label>
                  <label className="carnet-editview__field carnet-editview__field--inline">
                    <span className="lbl">Href</span>
                    <input
                      type="text"
                      value={row.href}
                      onChange={(e) => updateNav(idx, { href: e.target.value })}
                    />
                  </label>
                  <label className="carnet-editview__field carnet-editview__field--inline carnet-editview__field--check">
                    <input
                      type="checkbox"
                      checked={Boolean(row.external)}
                      onChange={(e) => updateNav(idx, { external: e.target.checked })}
                    />
                    <span className="lbl">Externe</span>
                  </label>
                  <div className="carnet-editview__row-actions">
                    <button
                      type="button"
                      className="carnet-btn carnet-btn--ghost"
                      onClick={() => moveNav(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Monter"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="carnet-btn carnet-btn--ghost"
                      onClick={() => moveNav(idx, 1)}
                      disabled={idx === (data.navFooter ?? []).length - 1}
                      aria-label="Descendre"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="carnet-btn carnet-btn--ghost"
                      onClick={() => removeNav(idx)}
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="carnet-editview__rows-actions">
              <button
                type="button"
                className="carnet-btn carnet-btn--ghost"
                onClick={addNav}
              >
                + Ajouter un lien
              </button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
