const { formatMoney, getDeliveryTime } = require("../utils/order");

module.exports = function sendInvoiceHtmlBody(order) {
  return `<div style="background-color: #F7FAFC; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 600px; margin: auto;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: auto; background-color: #FFFFFF; padding: 2rem; border-radius: 0.5rem;">
        <tr>
          <td style="text-align: center; padding-bottom: 1.5rem;">
            <h1 style="font-size: 1.5rem; font-weight: 600; color: #4C51BF; margin: 0;">
              Invoice from Umami Food Services
            </h1>
          </td>
        </tr>
        <tr>
          <td style="color: #2D3748; padding-bottom: 1.5rem;">
            <p style="margin: 0;">Hello ${order.customer.name},</p>
            <p style="margin: 0;">
              We appreciate your business! Below are the details for your recent invoice:
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 1rem; background-color: #F7FAFC; border-radius: 0.5rem; color: #2D3748;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-top: 0.3rem; padding-bottom: 1rem; color: #718096; font-weight: 500;">Invoice Number:</td>
                <td style="padding-top: 0.3rem; padding-bottom: 1rem; text-align: right; color: #1A202C;">#${
                  order.orderId
                }</td>
              </tr>
               <tr>
                <td style="padding-bottom: 1rem; color: #718096; font-weight: 500;">Invoice Date:</td>
                <td style="padding-bottom: 1rem; text-align: right; color: #1A202C;">${getDeliveryTime(
                  order.deliveryDateTimestamp
                )}</td>
              </tr>
               <tr>
                <td style="padding-bottom: 0.3rem; color: #718096; font-weight: 500;">Amount Due:</td>
                <td style="padding-bottom: 0.3rem; text-align: right; color: #1A202C; font-size: 1.25rem; font-weight: 700;">${formatMoney(
                  order.totalCost
                )}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; padding-top: 1.5rem;">
            <a href="${
              order.invoice?.invoiceUrl
            }" style="display: inline-block; background-color: #4C51BF; color: #FFFFFF; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500;">
              View Invoice
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 1.5rem; color: #4A5568;">
            <p style="margin: 0;">
              If you have any questions, please don't hesitate to contact us at 
              <a href="mailto:sales@umamiservices.com" style="color: #4C51BF;">
                sales@umamiservices.com
              </a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 1rem; text-align: center; color: #4A5568;">
            <p style="margin: 0;">Thank you for your business!</p>
            <p style="margin: 0;">Best regards,</p>
            <p style="margin: 0;">The Umami Food Services Team</p>
          </td>
        </tr>
      </table>
    </div>
    `;
};
