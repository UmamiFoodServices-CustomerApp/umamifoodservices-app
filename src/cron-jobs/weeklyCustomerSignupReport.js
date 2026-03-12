require('dotenv').config()

const { Parser } = require('json2csv')
const { Timestamp } = require('firebase-admin/firestore')
const moment = require('moment')
const { sendMail } = require('../services/mail/mail.service')
const {
  weeklyCustomerSignupReportFailedEmail,
  weeklyCustomerSignupReportEmail,
} = require('../../emails/weeklyCustomerSignupReport')

const INTERVAL = 20 * 60 * 1000 // Check every 20 minutes

// -----------------------------
// Admin Emails
// -----------------------------
const ADMIN_EMAILS = [
  'Kbtranspacfictrading@gmail.com',
  'khuongkbtranspacific@gmail.com',
  'kavya@tepia.co',
  'gourav@tepia.co',
]

// -----------------------------
// Get Last Week Range (UTC)
// Monday 00:00 → Sunday 23:59
// -----------------------------
const getLastWeekRange = () => {
  const now = moment.utc()

  // Get current week's Monday
  const currentWeekMonday = now.clone().isoWeekday(1)

  // Last week's Monday
  const lastWeekMonday = currentWeekMonday.clone().subtract(1, 'week')

  // Last week's Sunday
  const lastWeekSunday = lastWeekMonday.clone().add(6, 'days')

  return {
    start: lastWeekMonday.startOf('day'),
    end: lastWeekSunday.endOf('day'),
  }
}

// -----------------------------
// Main Job
// -----------------------------
module.exports = ({ db }) => {
  setInterval(async () => {
    try {
      // Only run on Monday (UTC)
      const today = moment.utc()

      if (today.isoWeekday() !== 1) {
        return
      }

      const weekKey = today.startOf('isoWeek').format('YYYY-MM-DD')
      const lockRef = db.collection('cronLocks').doc('weeklySignupReport')
      const doc = await lockRef.get()

      if (doc.exists && doc.data().lastRunWeek === weekKey) {
        return
      }

      console.log('[WeeklySignupReport] Running weekly report...')

      const { start, end } = getLastWeekRange()

      console.log(
        `[WeeklySignupReport] Fetching customers from ${start.format()} to ${end.format()}`,
      )

      const snapshot = await db
        .collection('users')
        .where(
          'userTimesStampCreated',
          '>=',
          Timestamp.fromDate(start.toDate()),
        )
        .where('userTimesStampCreated', '<=', Timestamp.fromDate(end.toDate()))
        .get()

      const customers = snapshot.docs
        .map((doc) => {
          const data = doc.data()

          return {
            isAdmin: data.isAdmin || false, // keep temporarily for filtering
            Name: data.name || '',
            Business: data.businessName || '',
            Phone: data.phone || '',
            Email: data.email || '',
            Location: data.deliveryLocation || '',
            'Signup Date': data.userTimesStampCreated
              ? moment
                  .utc(data.userTimesStampCreated.toDate())
                  .format('MMMM DD, YYYY hh:mm A') + ' UTC'
              : '',
          }
        })
        .filter((customer) => {
          // ❌ Ignore admin users
          if (customer.isAdmin === true) return false

          // ❌ Ignore Tepia internal emails
          if (
            customer.Email &&
            customer.Email.toLowerCase().includes('@tepia.co')
          )
            return false

          return true
        })
        .map(({ isAdmin, ...rest }) => rest) // remove isAdmin from final CSV

      // CSV generation (even if empty)
      const parser = new Parser({
        fields: [
          'Name',
          'Business',
          'Phone',
          'Email',
          'Location',
          'Signup Date',
        ],
      })

      const csv = parser.parse(customers)

      const generatedAt = moment.utc().format('MMMM DD, YYYY hh:mm A') + ' UTC'

      const fileName = `weekly-customer-signup-report-${start.format(
        'YYYY-MM-DD',
      )}-to-${end.format('YYYY-MM-DD')}.csv`

      const mailOptions = {
        to: ADMIN_EMAILS,
        subject: `Weekly New Customer Signup Report`,
        html: weeklyCustomerSignupReportEmail({
          start,
          end,
          customers,
          generatedAt,
        }),
        attachments: [
          {
            filename: fileName,
            content: csv,
            contentType: 'text/csv',
          },
        ],
      }

      await sendMail(mailOptions)

      await lockRef.set({
        lastRunWeek: weekKey,
        updatedAt: new Date(),
      })

      console.log(
        '[WeeklySignupReport] Weekly customer signup report sent successfully.',
      )
    } catch (error) {
      console.log(
        '[WeeklySignupReport] Error running weekly customer signup report job:',
        error,
      )

      try {
        const errorTime = moment.utc().format('MMMM DD, YYYY hh:mm A') + ' UTC'

        await sendMail({
          to: ADMIN_EMAILS,
          subject: '❌ Weekly Customer Signup Report FAILED',
          html: weeklyCustomerSignupReportFailedEmail({ error, errorTime }),
        })

        console.log('[WeeklySignupReport] Failure notification email sent.')
      } catch (emailError) {
        console.log(
          '[WeeklySignupReport] Failed to send failure notification email:',
          emailError,
        )
      }
    }
  }, INTERVAL)
}
