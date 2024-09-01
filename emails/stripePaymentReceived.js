module.exports = function sendPaymentNotificationHtmlBody(
  customerName,
  amountPaid,
  email
) {
  return `<div style="background-color: #F7FAFC; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 600px; margin: auto;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: auto; background-color: #FFFFFF; padding: 2rem; border-radius: 0.5rem;">
      <tr>
        <td style="text-align: center; padding-bottom: 1.5rem;">
          <h1 style="font-size: 1.5rem; font-weight: 600; color: #4C51BF; margin: 0;">
            Payment Received
          </h1>
        </td>
      </tr>
      <tr>
        <td style="color: #2D3748; padding-bottom: 1.5rem;">
          <p style="margin: 0;">Hello Team,</p>
          <p style="margin: 0;">
            We have received a payment from <strong>${customerName}</strong> for the amount of <strong>$${amountPaid}</strong>.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 1.5rem; color: #4A5568;">
          <p style="margin: 0;">
            If you have any questions, You can reach this customer at this email address: 
            <a href="mailto:${email}" style="color: #4C51BF;">
              ${email}
            </a>.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 1rem; text-align: center; color: #4A5568;">
          <p style="margin: 0;">Thank you!</p>
          <p style="margin: 0;">Best regards,</p>
          <p style="margin: 0;">The Umami Food Services Team</p>
        </td>
      </tr>
    </table>
  </div>
  `;
};
