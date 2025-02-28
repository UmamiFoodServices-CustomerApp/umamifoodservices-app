const getAdminInviteEmail = ({ name, passwordLink }) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Umami Food Services Admin Team</title>
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
        .section-title {
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        ul {
            margin: 0;
            padding-left: 20px;
        }
        li {
            margin-bottom: 5px;
        }
        .cta-button {
            display: inline-block;
            color: #4C51BF;
            text-decoration: underline;
        }
        .signature {
            border-top: 1px solid #eee;
            padding-top: 8px;
        }
    </style>
</head>
<body>
    <div class="content">
        <p>Hello ${name},</p>

        <p>We are delighted to welcome you to the Admin Team for Umami Food Services!<br>
        As an essential part of our community, your role is pivotal in ensuring the smooth operation and success of our platform.</p>

        <div class="section-title">Your Responsibilities:</div>
        <ul class="list-style-type: 'disc'">
            <li>Order Management</li>
            <li>Product Management and Inventory</li>
            <li>Customer Service</li>
            <li>Reports</li>
        </ul>

        <div class="section-title">Next Steps:</div>
        <ul class="list-style-type: 'disc'">
            <li><a href="${passwordLink}" class="cta-button">Click here to set your password</a></li>
            <li>Explore the portal and familiarize yourself with its features</li>
            <li>Begin managing content, the orders, customers, and products</li>
        </ul>

        <p>We are confident that your dedication will greatly contribute to the success of Umami Food Services. Together, we will create an exceptional service to our community.</p>

        <p>Thank you for joining us. We look forward to working with you.</p>

        <div class="signature">
            <p>Best,<br>
            Umami Food Services Team</p>
        </div>
    </div>
</body>
</html>`;

module.exports.getAdminInviteEmail = getAdminInviteEmail;
