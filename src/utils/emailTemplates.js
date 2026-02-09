const getEmailLayout = (content) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trainer Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="width: 100%; background-color: #f4f4f5; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            
            <!-- Header -->
            <div style="background-color: #18181b; padding: 32px 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">Trainer</h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 32px; background-color: #ffffff;">
                ${content}
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} Trainer Fitness App. All rights reserved.
                </p>
                <div style="margin-top: 12px; font-size: 12px; color: #9ca3af;">
                    <p style="margin: 4px 0;">Developed by <a href="https://www.linkedin.com/in/manu-m-madhu/">Manu M</a></p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};

const getOtpEmailTemplate = (otp) => {
    const content = `
        <h2 style="color: #111827; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 600;">Verify Your Email Address</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Thank you for joining Trainer! To complete your registration and verify your email address, please use the One-Time Password (OTP) below.
        </p>
        
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <span style="font-size: 32px; font-weight: 700; color: #2563eb; letter-spacing: 6px; font-family: monospace;">${otp}</span>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 0;">
            This code will expire in 10 minutes. <br>If you didn't request this, please ignore this email.
        </p>
    `;
    return getEmailLayout(content);
};

const getWelcomeEmailTemplate = (name, email, password) => {
    const content = `
        <h2 style="color: #111827; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 600;">Welcome to Trainer!</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hello <strong>${name}</strong>,<br><br>
            Your account has been successfully created by our administrator. We are excited to have you on board! Below are your temporary login credentials.
        </p>
        
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid #dbeafe;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #4b5563; font-size: 14px; width: 80px;">Email:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">Password:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; font-family: monospace;">${password}</td>
                </tr>
            </table>
        </div>

        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">
            <strong>Important:</strong>
        </p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-top: 0;">
            For your security, please log in and change your password immediately.
        </p>

    `;
    return getEmailLayout(content);
};

const getResetPasswordEmailTemplate = (resetUrl) => {
    const content = `
        <h2 style="color: #111827; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 600;">Reset Your Password</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            You requested to reset your password. Click the button below to proceed.
        </p>

        <div style="text-align: center; margin-bottom: 32px;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                Reset Password
            </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
        </p>

        <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 24px;">
            This link will expire in 10 minutes. If you didn't request a password reset, please ignore this email.
        </p>
    `;
    return getEmailLayout(content);
};

module.exports = { getOtpEmailTemplate, getWelcomeEmailTemplate, getResetPasswordEmailTemplate };
