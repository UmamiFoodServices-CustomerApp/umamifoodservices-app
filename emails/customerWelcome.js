const getCustomerWelcomeEmail = ({
  fullName,
  tempPassword,
  passwordLink,
}) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Umami Food Services</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            color: #4C51BF;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 20px;
        }
        .password-box {
            background-color: #f8f8f8;
            border: 1px solid #e2e2e2;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            text-align: center;
        }
        .temp-password {
            font-family: monospace;
            font-size: 1.1em;
            color: #4C51BF;
            font-weight: bold;
        }
        .cta-button {
            display: inline-block;
            background-color: #4C51BF;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .signature {
            border-top: 1px solid #eee;
            padding-top: 8px;
            margin-top: 20px;
        }
        .highlight {
            color: #4C51BF;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1 class="header">Welcome to Umami Food Services!</h1>

        <p>Dear ${fullName},</p>

        <p>We're thrilled to have you join our community. At Umami, we specialize in wholesale food services tailored to meet the unique needs of restaurants and food vendors. Our mobile app is designed to give you full control over your inventory and ordering process.</p>

        <div class="password-box">
            <p>Your temporary password:</p>
            <p class="temp-password">${tempPassword}</p>
        </div>

        <p>To get started:</p>
        <p>
            <a href="${passwordLink}" class="cta-button">Click here to reset your password and login</a>
        </p>

        <p>With our mobile app, you can:</p>
        <ul>
            <li>Browse our extensive product catalog</li>
            <li>Place and track orders in real-time</li>
            <li>Manage your inventory efficiently</li>
            <li>Access order history and invoices</li>
        </ul>

        <p>We're here to support you every step of the way. If you have any questions or need assistance getting started, don't hesitate to reach out to our team.</p>

        <p>Thank you for choosing Umami Food Services. We look forward to helping you grow your business!</p>

        <div class="signature">
            <p>Best regards,<br>
            The Umami Food Services Team</p>
            <p><small>Need help? Contact us at <span class="highlight">support@umamifoodservices.com</span></small></p>
        </div>
    </div>
</body>
</html>`;

module.exports.getCustomerWelcomeEmail = getCustomerWelcomeEmail;
