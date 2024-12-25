const getCustomerSignupWelcomeEmail = ({ fullName }) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Umami Food Services</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .content {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 4px;
        }
        .header {
            margin: 0 0 15px 0;
            font-size: 1.5em;
            font-weight: bold;
        }
        .message {
            margin-bottom: 15px;
        }
        .name {
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="content">
        <p class="name">${fullName},</p>
        
        <p class="header">Welcome to Umami Food Services!</p>

        <p class="message">We're thrilled to have you join our community. At Umami, we specialize in wholesale food services tailored to meet the unique needs of restaurants and food vendors. Our mobile app is designed to give you full control over your inventory and ordering process.</p>

        <p class="message">We're here to support you every step of the way. If you have any questions or need assistance getting started, don't hesitate to reach out to our team.</p>

        <p class="message">Thank you for choosing Umami Food Services. We look forward to helping you!</p>
    </div>
</body>
</html>`;

module.exports.getCustomerSignupWelcomeEmail = getCustomerSignupWelcomeEmail;
