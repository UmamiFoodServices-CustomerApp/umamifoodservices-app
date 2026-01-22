const fs = require('fs')
const sendgridMail = require('./sendgrid.client')

// Helper to fetch remote files (used for attachments with a URL)
const getBufferFromUrl = (url) =>
  new Promise((resolve, reject) => {
    try {
      const lib = url.startsWith('https') ? require('https') : require('http')
      lib
        .get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(
              new Error(`Failed to fetch ${url}. Status: ${res.statusCode}`),
            )
            return
          }
          const chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => resolve(Buffer.concat(chunks)))
        })
        .on('error', (err) => reject(err))
    } catch (err) {
      reject(err)
    }
  })

const sendMail = async ({ to, subject, html, attachments }) => {
  const payload = {
    to,
    from: {
      email: process.env.MAIL_FROM,
      name: 'Umami Food Services',
    },
    subject,
    html,
  }

  // Handle attachments
  if (attachments && attachments.length) {
    payload.attachments = []
    for (const att of attachments) {
      let buffer
      if (att.content) {
        if (Buffer.isBuffer(att.content)) buffer = att.content
        else buffer = Buffer.from(String(att.content))
      } else if (att.path) {
        if (/^https?:\/\//i.test(att.path)) {
          buffer = await getBufferFromUrl(att.path)
        } else {
          buffer = fs.readFileSync(att.path)
        }
      } else {
        continue
      }

      payload.attachments.push({
        content: buffer.toString('base64'),
        filename: att.filename || 'attachment',
        type: att.contentType || att.type || undefined,
        disposition: att.contentDisposition || 'attachment',
      })
    }
  }

  await sendgridMail.send(payload)
}

module.exports = {
  sendMail,
}
