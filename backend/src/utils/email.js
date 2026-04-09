const nodemailer = require('nodemailer');

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration is incomplete (SMTP_HOST, SMTP_USER, SMTP_PASS are required)');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

const getFromAddress = () => {
  const name = process.env.EMAIL_FROM_NAME || 'BuzzForge';
  const addr = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER;
  return `"${name}" <${addr}>`;
};

const sendPasswordResetEmail = async (toEmail, resetUrl, ttlMinutes) => {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: getFromAddress(),
    to: toEmail,
    subject: 'Reset your BuzzForge password',
    text: [
      `You requested a password reset for your BuzzForge account.`,
      ``,
      `Click the link below to set a new password. It expires in ${ttlMinutes} minutes:`,
      ``,
      resetUrl,
      ``,
      `If you did not request this, you can safely ignore this email.`
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
        <h2 style="color:#1d9bf0;">Reset your password</h2>
        <p>You requested a password reset for your BuzzForge account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>${ttlMinutes} minutes</strong>.</p>
        <p style="margin:2rem 0;">
          <a href="${resetUrl}"
             style="background:linear-gradient(135deg,#1d9bf0,#0ea5b7);color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;">
            Reset password
          </a>
        </p>
        <p style="color:#657786;font-size:0.85rem;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `
  });
};

module.exports = { sendPasswordResetEmail };
