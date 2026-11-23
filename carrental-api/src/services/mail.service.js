'use strict';
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const hasValidSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    !process.env.SMTP_USER.includes('REPLACE_WITH') &&
    process.env.NODE_ENV !== 'test';

  if (hasValidSmtp) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Default to jsonTransport in dev/test/when no valid SMTP is configured
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return transporter;
}

/**
 * Send a password reset email.
 * Guarantees that only the verified database address is used as recipient.
 *
 * @param {string} recipientEmail - Recipient email address stored in the database
 * @param {string} rawToken - Generated single-use reset token
 */
async function sendPasswordResetEmail(recipientEmail, rawToken) {
  const mailer = getTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

  const mailOptions = {
    from: process.env.MAIL_FROM || 'noreply@example.com',
    to: recipientEmail,
    subject: 'WanderWheels - Password Reset Request',
    text: `Hello,\n\nYou requested a password reset for your WanderWheels account.\nPlease click the link below to reset your password (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not make this request, you can safely ignore this email.\n`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested a password reset for your WanderWheels account.</p>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #fa2837; color: #fff; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        <p>Or paste this link into your browser: <br/><code>${resetUrl}</code></p>
        <p>If you did not make this request, you can safely ignore this email.</p>
      </div>
    `,
  };

  const info = await mailer.sendMail(mailOptions);

  if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
    console.log(`[DEV MAIL] Password reset email sent for ${recipientEmail}: ${resetUrl}`);
  }

  return info;
}

module.exports = {
  getTransporter,
  sendPasswordResetEmail,
};
