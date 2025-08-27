const bodyParser = require('body-parser')
const moment = require("moment");

const G_CHAT_WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAQA0uUdwzc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=UgICNzOCZgeM1CKB9xASJ5P5_4kWqDfyc1NKYQKoBjc"

module.exports = (app) => {
  app.post(
    '/heroku-webhook',
    bodyParser.urlencoded({ extended: false }),
    bodyParser.json(),
    async (req, res) => {
      try {
        const { data } = req.body

        console.log(JSON.stringify({ data }, null, 2))

        const status = data?.status || 'unknown'
        const appName = data?.app?.name || 'unknown-app'
        const commit = data?.slug?.commit?.substring(0, 7) || 'n/a'
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss')

        // Decide environment (basic check from app name)
        const environment = appName.includes('staging')
          ? 'Staging'
          : 'Production'

        // Status Emoji
        const statusEmoji =
          status === 'succeeded' ? '✅ Succeeded' :
          status === 'failed' ? '❌ Failed' :
          '⚪ Unknown'

        const message = `*${environment} Deployment Report* \n\n` +
          `*Status:* ${statusEmoji}\n` +
          `*Commit:* ${commit}\n` +
          `*Time:* ${timestamp}\n\n` +
          `_Triggered by Heroku_`

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
