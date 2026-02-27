import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

const FALLBACK_FROM = 'noreply@cowboymedia.net';

function wrapInTemplate(bodyContent: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr>
<td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:0.5px;">CowboyMedia</h1>
<p style="margin:6px 0 0;color:#94a3b8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Service Hub</p>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:32px 40px 24px;">
${bodyContent}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:0 40px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="border-top:1px solid #e5e7eb;padding-top:24px;">
<p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-align:center;">This is an automated notification from CowboyMedia Service Hub.</p>
<p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-align:center;">Please do not reply to this email.</p>
<p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">&copy; ${new Date().getFullYear()} CowboyMedia. All rights reserved.</p>
</td>
</tr>
</table>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function formatBodyContent(rawHtml: string): string {
  let formatted = rawHtml;

  formatted = formatted.replace(/<h2>(.*?)<\/h2>/g,
    '<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;line-height:1.3;">$1</h2>');

  formatted = formatted.replace(/<p>(.*?)<\/p>/g,
    '<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">$1</p>');

  formatted = formatted.replace(/<blockquote>(.*?)<\/blockquote>/g,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="border-left:4px solid #3b82f6;padding:12px 16px;background-color:#f0f7ff;border-radius:0 8px 8px 0;"><p style="margin:0;color:#374151;font-size:14px;line-height:1.6;font-style:italic;">$1</p></td></tr></table>');

  return formatted;
}

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const styledBody = formatBodyContent(html);
    const fullHtml = wrapInTemplate(styledBody, subject);
    await client.send({
      to,
      from: fromEmail || FALLBACK_FROM,
      subject,
      html: fullHtml,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

export async function sendEmailToMultiple(recipients: string[], subject: string, html: string) {
  for (const to of recipients) {
    await sendEmail(to, subject, html);
  }
}
