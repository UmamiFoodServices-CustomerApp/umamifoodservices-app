const getPasswordResetEmail = ({ userName, resetLink }) => `
  <p>Hello ${userName},</p>
  <p>A request has been received to change the password for your Umami Food Services account.</p>
  <p>
    <a href="${resetLink}" target="_blank">Reset your password</a>
  </p>
  <p>If you didn’t request this, you can safely ignore this email.</p>
  <p>Thanks,<br/>Umami Food Services Team</p>
`;

module.exports.getPasswordResetEmail = getPasswordResetEmail;