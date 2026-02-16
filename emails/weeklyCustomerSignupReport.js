const weeklyCustomerSignupReportEmail = ({
  start,
  end,
  customers,
  generatedAt,
}) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      
      <h2 style="color: #2c3e50;">
        Weekly New Customer Signup Report
      </h2>

      <p>Hello,</p>

      <p>
        Please find attached the CSV report containing the list of new customer 
        signups for the reporting period mentioned below.
      </p>

      <div style="background: #f4f6f8; padding: 12px; border-radius: 6px;">
        <p><strong>Reporting Period:</strong></p>
        <p style="margin: 0;">
          From: ${start.format('MMMM DD, YYYY hh:mm A')} UTC (${start.format(
            'dddd',
          )})<br/>
          To: ${end.format('MMMM DD, YYYY hh:mm A')} UTC (${end.format('dddd')})
        </p>
        <br/>
        <p style="margin: 0;">
          <strong>Total New Customers:</strong> ${customers.length}
        </p>
      </div>

      <br/>

      <p>
        The attached file includes detailed information such as customer name, 
        business name, contact details, location, and signup date.
      </p>

      <hr/>

      <p style="font-size: 12px; color: #777;">
        Report generated on: ${generatedAt}
      </p>

      <p style="margin-top: 20px;">
        Best regards,<br/>
        <strong>Umami Food Services Team</strong>
      </p>

    </div>
  `
}

const weeklyCustomerSignupReportFailedEmail = ({ error, errorTime }) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #c0392b;">
        ❌ Weekly Customer Signup Report Failed
      </h2>

      <p>The weekly customer signup report job encountered an error.</p>

      <p><strong>Error Time:</strong> ${errorTime}</p>

      <p><strong>Error Message:</strong></p>
      <pre style="background:#f4f4f4;padding:10px;border-radius:6px;">
${error.message}
      </pre>

      <p><strong>Stack Trace:</strong></p>
      <pre style="background:#f4f4f4;padding:10px;border-radius:6px;">
${error.stack}
      </pre>

      <hr/>

      <p style="font-size:12px;color:#777;">
        This is an automated system notification from Umami Food Services backend.
      </p>
    </div>
  `
}

module.exports.weeklyCustomerSignupReportEmail = weeklyCustomerSignupReportEmail

module.exports.weeklyCustomerSignupReportFailedEmail =
  weeklyCustomerSignupReportFailedEmail
