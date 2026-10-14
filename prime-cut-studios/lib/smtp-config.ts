/** Server-side SMTP configuration. Preserve the existing credential names. */
export function smtpConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const host = env.MAIL_SMTP_HOST || env.SMTP_HOST;
  const user = env.MAIL_SMTP_USER || env.SMTP_USER;
  const pass = env.MAIL_SMTP_PASSWORD || env.SMTP_PASS;
  const port = Number(env.MAIL_SMTP_PORT || env.SMTP_PORT || '465');
  if (!host || !user || !pass || ![465, 587].includes(port)) return null;
  return {
    transport: {host, port, secure: port === 465, requireTLS: true, auth: {user, pass}},
    from: env.MAIL_SMTP_FROM || env.MAIL_FROM || env.SMTP_FROM || 'Prime Cut Studios <info@primecutstudiostx.com>',
    replyTo: env.MAIL_REPLY_TO || 'info@primecutstudiostx.com',
  };
}
