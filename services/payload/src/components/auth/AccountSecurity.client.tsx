'use client';

// Onglet Sécurité du profil : 2FA email (info statique) + gestion des
// appareils de confiance.

import React, { useEffect, useState } from 'react';
import { Banner, Button, Collapsible } from '@payloadcms/ui';

const API_BASE = '/cms/api/users';

type Device = {
  deviceId: string;
  label?: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  expiresAt: string;
};

export default function AccountSecurityClient(): React.ReactElement {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadDevices();
  }, []);

  async function loadDevices() {
    try {
      const res = await fetch(`${API_BASE}/me/trusted-devices`, { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as { devices: Device[] };
        setDevices(data.devices);
      }
    } catch {
      // silencieux
    }
  }

  async function revokeDevice(deviceId: string) {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/me/trusted-devices/${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Révocation impossible');
      await loadDevices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--base)' };
  const sectionInner: React.CSSProperties = { ...stack, padding: 'var(--base)' };

  return (
    <div className="field-type" style={{ ...stack, marginTop: 'var(--base)', marginBottom: 'var(--base)' }}>
      <h3 style={{ margin: 0 }}>Sécurité du compte</h3>

      {error && <Banner type="error">{error}</Banner>}

      <Collapsible header="Double authentification (2FA)" initCollapsed={false}>
        <div style={sectionInner}>
          <p style={{ margin: 0 }}>
            Toutes les connexions sont protégées par un <strong>code à 6 chiffres reçu par email</strong>.
            Sur un appareil de confiance (cf. ci-dessous), le code est demandé environ une fois par semaine.
          </p>
        </div>
      </Collapsible>

      <Collapsible header={`Appareils de confiance (${devices.length})`} initCollapsed={true}>
        <div style={sectionInner}>
          <p style={{ margin: 0 }}>
            Ces appareils ne vous demandent pas de code à la connexion (validité 7 jours).
          </p>
          {devices.length === 0 && <p style={{ margin: 0, opacity: 0.7 }}>Aucun appareil de confiance.</p>}
          {devices.length > 0 && (
            <div>
              {devices.map((d) => (
                <div
                  key={d.deviceId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'calc(var(--base) / 2) 0',
                    borderBottom: '1px solid var(--theme-elevation-100)',
                    gap: 'var(--base)',
                  }}
                >
                  <div>
                    <div>
                      <strong>{d.label ?? 'Appareil inconnu'}</strong>
                    </div>
                    <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                      {d.ip ? `IP ${d.ip} · ` : ''}
                      Ajouté le {new Date(d.createdAt).toLocaleString('fr-FR')} · expire le{' '}
                      {new Date(d.expiresAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <Button buttonStyle="secondary" size="small" onClick={() => void revokeDevice(d.deviceId)}>
                    Révoquer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Collapsible>
    </div>
  );
}
