import { Resend } from "resend";

const resend = process.env["RESEND_API_KEY"] ? new Resend(process.env["RESEND_API_KEY"]) : null;
const FROM_EMAIL = process.env["FROM_EMAIL"] || "noreply@lmsacademy.com";

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email send");
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your password - LMS Academy",
    html: `
      <h2>Hi ${name},</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetUrl}" style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Reset Password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <p>LMS Academy</p>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  if (!resend) return;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to LMS Academy!",
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Your account has been created successfully. You can now log in and start learning.</p>
      <p>LMS Academy</p>
    `,
  });
}

export async function sendEnrollmentConfirmation(to: string, name: string, courseName: string) {
  if (!resend) return;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You're enrolled in ${courseName} - LMS Academy`,
    html: `
      <h2>Hi ${name},</h2>
      <p>You've been successfully enrolled in <strong>${courseName}</strong>. Start learning today!</p>
      <p>LMS Academy</p>
    `,
  });
}
