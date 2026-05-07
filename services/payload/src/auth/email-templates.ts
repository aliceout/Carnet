// Templates HTML + texte pour les mails transactionnels du système d'auth.
//
// Style sobre, monochrome (accent violet du Carnet), sans images ni
// tracking. Le HTML est lisible aussi en plain-text (table-less, pas
// de CSS critique). Tous les wordings en français.

import { AUTH_CONFIG } from './config';

const ACCENT = '#5a3a7a';
const TEXT = '#1a1d28';
const MUTED = '#5e6373';
const BG = '#fdfcf8';
const RULE = '#d6d3c8';

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid ${RULE};padding:32px;text-align:left;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;color:${MUTED};letter-spacing:1.4px;text-transform:uppercase;">Carnet<span style="color:${ACCENT};">.</span></p>
          <h1 style="margin:0 0 24px;font-size:22px;color:${TEXT};font-weight:600;">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:${MUTED};">Mail automatique. Ne pas y répondre.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:12px 24px;font-weight:600;">${escapeHtml(label)}</a></p>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Invitation ─────────────────────────────────────────────────────

export function invitationEmail(opts: {
  inviteeEmail: string;
  inviterName?: string | null;
  acceptUrl: string;
}): { subject: string; html: string; text: string } {
  const days = AUTH_CONFIG.invitationTtlDays;
  const inviter = opts.inviterName?.trim() || 'L\'équipe du Carnet';
  const subject = 'Invitation à rejoindre l\'espace d\'administration du Carnet';

  const text = `Bonjour,

${inviter} t'invite à rejoindre l'espace d'administration du Carnet.

Pour activer ton compte (${opts.inviteeEmail}) et choisir ton mot de passe, clique sur le lien ci-dessous. Il est valable ${days} jours.

${opts.acceptUrl}

Si tu ne t'attendais pas à recevoir ce mail, tu peux l'ignorer — le compte sera supprimé automatiquement à l'expiration du lien.

— Carnet
`;

  const html = shell(
    'Tu as été invité·e à rejoindre l\'espace d\'administration',
    `<p style="margin:0 0 16px;line-height:1.5;">${escapeHtml(inviter)} t'invite à rejoindre l'espace d'administration du <strong>Carnet</strong>.</p>
<p style="margin:0 0 16px;line-height:1.5;">Pour activer ton compte (<strong>${escapeHtml(opts.inviteeEmail)}</strong>) et choisir ton mot de passe, clique sur le bouton ci-dessous.</p>
${button(opts.acceptUrl, 'Activer mon compte')}
<p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.5;">Ce lien est valable <strong>${days} jours</strong>. Passé ce délai, le compte sera supprimé automatiquement.</p>
<p style="margin:24px 0 0;font-size:13px;color:${MUTED};line-height:1.5;">Si tu ne t'attendais pas à ce mail, ignore-le simplement. Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br><span style="word-break:break-all;">${escapeHtml(opts.acceptUrl)}</span></p>`,
  );

  return { subject, html, text };
}

// ─── OTP email (2FA) ────────────────────────────────────────────────

export function twoFactorCodeEmail(opts: {
  code: string;
  ip?: string;
  userAgent?: string;
}): { subject: string; html: string; text: string } {
  const ttl = AUTH_CONFIG.otpTtlMinutes;
  const subject = `Code de vérification : ${opts.code}`;

  const ipLine = opts.ip ? `IP : ${opts.ip}\n` : '';
  const uaLine = opts.userAgent ? `Navigateur : ${opts.userAgent}\n` : '';

  const text = `Ton code de vérification :

  ${opts.code}

Valable ${ttl} minutes. À saisir dans la fenêtre de connexion.

${ipLine}${uaLine}
Si ce n'est pas toi qui essaies de te connecter, change ton mot de passe immédiatement.
`;

  const html = shell(
    'Ton code de vérification',
    `<p style="margin:0 0 16px;line-height:1.5;">Saisis ce code pour finaliser ta connexion :</p>
<p style="margin:24px 0;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:${BG};border:1px solid ${RULE};padding:16px;color:${TEXT};font-family:'JetBrains Mono','Menlo',monospace;">${escapeHtml(opts.code)}</p>
<p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.5;">Valable <strong>${ttl} minutes</strong>.</p>
${
  opts.ip || opts.userAgent
    ? `<p style="margin:16px 0 0;font-size:13px;color:${MUTED};line-height:1.5;">Tentative depuis :${opts.ip ? `<br>IP : ${escapeHtml(opts.ip)}` : ''}${opts.userAgent ? `<br>Navigateur : ${escapeHtml(opts.userAgent)}` : ''}</p>`
    : ''
}
<p style="margin:16px 0 0;font-size:13px;color:${MUTED};line-height:1.5;">Si ce n'est pas toi qui essaies de te connecter, change immédiatement ton mot de passe.</p>`,
  );

  return { subject, html, text };
}

// ─── Bienvenue (post-activation) ────────────────────────────────────

export function welcomeEmail(opts: {
  email: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Bienvenue sur l\'espace d\'administration du Carnet';

  const text = `Bonjour,

Ton compte ${opts.email} est maintenant actif.

Tu peux te connecter à l'espace d'administration ici :
${opts.loginUrl}

— Carnet
`;

  const html = shell(
    'Bienvenue ! Ton compte est actif',
    `<p style="margin:0 0 16px;line-height:1.5;">Ton compte <strong>${escapeHtml(opts.email)}</strong> est maintenant actif.</p>
${button(opts.loginUrl, 'Aller à l\'espace d\'administration')}`,
  );

  return { subject, html, text };
}
