const bodyParser = require('body-parser')
const moment = require('moment')

// const G_CHAT_WEBHOOK_URL =
//   'https://chat.googleapis.com/v1/spaces/AAAAjDz7VGs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=TFKs3RHp9Txuw8ezlpnOoyWAJdU4d2b1vZFNdqEp3Yc'

  const G_CHAT_WEBHOOK_URL =
  'https://chat.googleapis.com/v1/spaces/AAQA0uUdwzc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=UgICNzOCZgeM1CKB9xASJ5P5_4kWqDfyc1NKYQKoBjc'


module.exports = (app) => {
  app.post(
    '/heroku-webhook',
    bodyParser.urlencoded({ extended: false }),
    bodyParser.json(),
    async (req, res) => {
      try {
        const { data } = req.body

        console.log(JSON.stringify({ data }, null, 2));

        const status = data?.status || ''

        if (status === 'pending') {
          console.log('Skipping pending status notification')
          return res.sendStatus(200)
        }

        const appName = data?.app?.name || ''
        const userEmail = data?.user?.email || ''
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss')

        // Decide environment (basic check from app name)
        const environment = appName.includes('staging')
          ? 'Staging'
          : 'Production'

        // Status Emoji
        const statusEmoji =
          status === 'succeeded'
            ? '✅ *Succeeded*'
            : status === 'failed'
            ? '❌ *Failed*'
            : status

        // Build message
        const message =
          `*${environment} Deployment Report*\n\n` +
          `*App:* ${appName}\n` +
          `*Status:* ${statusEmoji}\n` +
          `*Triggered by:* ${userEmail}\n` +
          `*Time:* ${timestamp}\n\n` +
          `_Source: Heroku Webhook_`

        // Send to Google Chat
        await fetch(G_CHAT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message }),
        })

        res.sendStatus(200)
      } catch (err) {
        console.error('Error forwarding to Google Chat:', err?.message)
        res.sendStatus(500)
      }
    }
  )
}
