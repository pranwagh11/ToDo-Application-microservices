function successResponse(res, statusCode, message, data = null) {
  return res.status(statusCode).json({ success: true, message, data });
}

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({ success: false, message });
}

// Minimal HTML-escaping for values interpolated into email templates below.
// These templates only ever embed user-supplied strings (name, task title,
// description), so this matters even though it's a simple app.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

// Shared wrapper so both email templates below look consistent.
function emailShell({ title, bodyHtml }) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f4f4f5; padding:24px;">
      <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e5e5;">
        <div style="background:#4f46e5; padding:20px 24px;">
          <span style="color:#ffffff; font-size:18px; font-weight:600;">KeepNote</span>
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">${escapeHtml(title)}</h2>
          ${bodyHtml}
        </div>
        <div style="padding:16px 24px; background:#fafafa; border-top:1px solid #eee;">
          <span style="font-size:12px; color:#9ca3af;">You're receiving this because you have a KeepNote account.</span>
        </div>
      </div>
    </div>
  `;
}

// Used by auth-service's forgot-password flow.
function renderPasswordResetEmail({ name, otp, expiresInMinutes }) {
  const bodyHtml = `
    <p style="margin:0 0 16px; color:#374151; font-size:14px; line-height:1.5;">
      Hi ${escapeHtml(name || 'there')}, use the code below to reset your KeepNote password.
      It expires in ${escapeHtml(expiresInMinutes)} minutes. If you didn't request this, you can safely ignore this email.
    </p>
    <div style="text-align:center; background:#f4f4f6; border-radius:10px; padding:20px 0; margin-bottom:8px;">
      <span style="font-family: 'Courier New', monospace; font-size:32px; font-weight:700; letter-spacing:8px; color:#111827;">
        ${escapeHtml(otp)}
      </span>
    </div>
    <p style="margin:0; color:#9ca3af; font-size:12px; text-align:center;">
      Enter this code on the reset password screen.
    </p>
  `;
  return emailShell({ title: 'Your password reset code', bodyHtml });
}

// Used by task-service when a task is marked complete — mails the "task card".
function renderTaskCompletedEmail({ title, description, completedAt, appUrl }) {
  const bodyHtml = `
    <div style="border:1px solid #e5e7eb; border-radius:10px; padding:16px; margin-bottom:16px;">
      <div style="display:inline-block; background:#dcfce7; color:#166534; font-size:12px; font-weight:600; padding:2px 10px; border-radius:999px; margin-bottom:8px;">
        COMPLETED
      </div>
      <h3 style="margin:8px 0 4px; font-size:16px; color:#111827;">${escapeHtml(title)}</h3>
      ${description ? `<p style="margin:0 0 8px; color:#4b5563; font-size:14px; line-height:1.5;">${escapeHtml(description)}</p>` : ''}
      <p style="margin:0; color:#9ca3af; font-size:12px;">Completed ${escapeHtml(completedAt)}</p>
    </div>
    ${appUrl ? `<a href="${appUrl}" style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600;">Open KeepNote</a>` : ''}
  `;
  return emailShell({ title: 'Nice work — task completed!', bodyHtml });
}

module.exports = {
  successResponse,
  errorResponse,
  escapeHtml,
  renderPasswordResetEmail,
  renderTaskCompletedEmail,
};
