const getResetPasswordPage = (token, email, error = null) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Trainer</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .container { background-color: #ffffff; width: 100%; max-width: 400px; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        h1 { color: #111827; margin-top: 0; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 24px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; color: #374151; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
        input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px; box-sizing: border-box; transition: border-color 0.15s ease-in-out; }
        input:focus { outline: none; border-color: #2563eb; ring: 2px solid #2563eb; }
        button { width: 100%; background-color: #2563eb; color: #ffffff; padding: 12px; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.15s ease-in-out; }
        button:hover { background-color: #1d4ed8; }
        .error-message { background-color: #fee2e2; color: #991b1b; padding: 12px; border-radius: 6px; font-size: 14px; margin-bottom: 20px; text-align: center; border: 1px solid #fecaca; }
        .success-message { background-color: #dcfce7; color: #166534; padding: 12px; border-radius: 6px; font-size: 14px; margin-bottom: 20px; text-align: center; border: 1px solid #bbf7d0; }
        .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Reset Password</h1>
        
        ${error ? `<div class="error-message">${error}</div>` : ''}

        <form action="/api/auth/reset-password-submit" method="POST">
            <input type="hidden" name="token" value="${token}">
            <input type="hidden" name="email" value="${email}">
            
            <div class="form-group">
                <label for="password">New Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter new password" minlength="6">
            </div>

            <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm new password" minlength="6">
            </div>

            <button type="submit">Reset Password</button>
        </form>

        <div class="footer">
            &copy; ${new Date().getFullYear()} Trainer Fitness App
        </div>
    </div>
</body>
</html>
    `;
};

const getSuccessPage = (message = 'Operation successful') => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Success - Trainer</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .container { background-color: #ffffff; width: 100%; max-width: 400px; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center; }
        h1 { color: #111827; margin-top: 0; font-size: 24px; font-weight: 700; margin-bottom: 16px; }
        .icon { font-size: 48px; margin-bottom: 24px; color: #16a34a; }
        p { color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 0; }
        .footer { margin-top: 24px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✓</div>
        <h1>Success!</h1>
        <p>${message}</p>
        <p style="margin-top: 20px; font-size: 14px;">You can now close this window and log in to the app.</p>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Trainer Fitness App
        </div>
    </div>
</body>
</html>
    `;
};

const getErrorPage = (message = 'An error occurred') => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Trainer</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .container { background-color: #ffffff; width: 100%; max-width: 400px; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center; }
        h1 { color: #111827; margin-top: 0; font-size: 24px; font-weight: 700; margin-bottom: 16px; }
        .icon { font-size: 48px; margin-bottom: 24px; color: #dc2626; }
        p { color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 0; }
        .footer { margin-top: 24px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✕</div>
        <h1>Error</h1>
        <p>${message}</p>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Trainer Fitness App
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = { getResetPasswordPage, getSuccessPage, getErrorPage };
