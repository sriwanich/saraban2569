async function sendNotificationEmail(targetAssignee: string, subject: string, htmlContent: string) {
  if (!isMysqlOnline) return;
  try {
    const [settingsRows]: any = await pool.query('SELECT smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, orgName FROM settings LIMIT 1');
    const settings = settingsRows[0] || {};
    if (!settings.smtpHost || !settings.smtpUser) return; // No SMTP
    
    // Find matching users (either by full name, username, or department)
    const [users]: any = await pool.query(
      `SELECT email, emailNotifications FROM users 
       WHERE email IS NOT NULL AND email != '' 
       AND emailNotifications = 1 
       AND (
         TRIM(CONCAT(firstName, ' ', lastName)) = ? 
         OR username = ? 
         OR department = ?
       )`,
      [targetAssignee, targetAssignee, targetAssignee]
    );

    if (!users || users.length === 0) return;

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    });

    const emails = users.map((u: any) => u.email);
    // Remove duplicates
    const uniqueEmails = [...new Set(emails)];

    const mailOptions = {
      from: `"${settings.orgName || 'ระบบสารบรรณ EDMS'}" <${settings.smtpFrom || settings.smtpUser}>`,
      to: uniqueEmails.join(','),
      subject: subject,
      html: htmlContent
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error('Error sending notification email:', err);
      else console.log('Notification email sent:', info.response);
    });
  } catch (err) {
    console.error('sendNotificationEmail Error:', err);
  }
}
