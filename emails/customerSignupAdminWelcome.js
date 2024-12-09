const moment = require("moment");

const getCustomerSignupAdminWelcome = ({
  adminFullName,
  userFullName,
  userEmail,
}) => {
  const signUpDateTime = moment().format("YYYY-MM-DD HH:mm A");

  return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New User Signup Notification</title>
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
            .details {
                margin: 15px 0;
            }
            .detail-item {
                margin: 8px 0;
            }
            .message {
                margin-bottom: 15px;
            }
            .action-link {
                margin: 15px 0;
            }
            .action-link a {
                color: #1976d2;
                text-decoration: none;
            }
            .action-link a:hover {
                text-decoration: underline;
            }
            .signature {
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="content">
            <p class="message">Hello ${adminFullName},</p>

            <p class="message">We're excited to notify you that a new user has signed up! Here are the details:</p>

            <div class="details">
                <p class="detail-item">User Name: ${userFullName}</p>
                <p class="detail-item">Email Address: ${userEmail}</p>
                <p class="detail-item">Sign-Up Date/Time: ${signUpDateTime}</p>
            </div>

            <p class="message">Please review the user's profile in the admin panel for further action, if needed.</p>

            <p class="action-link">
                <a href="https://food-app-49b33.web.app" target="_blank">View User Profile</a>
            </p>

            <div class="signature">
                <p>Best,</p>
                <p>Umami Food Services Team</p>
            </div>
        </div>
    </body>
</html>`;
};

module.exports.getCustomerSignupAdminWelcome = getCustomerSignupAdminWelcome;
