const INTERVAL = 60 * 1000 // Check every minute

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

const twilioService = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

const sendAnnouncementTextToCustomer = async (messageData) => {
  try {
    const twilioNumber = '+19092562565'
    const phoneNumber = messageData.phone
    const url = 'umami://UmamiAdmin'

    const textMessage = {
      body: `${messageData.message}.    ${url}`,
      from: twilioNumber,
      to: phoneNumber,
    }

    const res = await twilioService.messages.create(textMessage)

    console.log('sendAnnouncementTextToCustomer Twilio Success:', res)
  } catch (error) {
    console.log('sendAnnouncementTextToCustomer Error:', error)
  }
}

const getCurrentDateTime = () => {
  const nowDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).format(new Date());

  const dateReplace = nowDate.replaceAll(',', '') + ' GMT-0700 (Pacific Daylight Time)'
  return new Date(dateReplace).getTime()
}

const getScheduledDateTime = (date, time) => {
  return new Date(`${date} ${time}:00  GMT-0700 (Pacific Daylight Time)`).getTime()
}

module.exports = ({ db }) => {
  // periodically check for the new scheduled messages (every minute)
  setInterval(async () => {
    const systemMessagesCollection = db.collection('systemMessages')
    const usersCollection = db.collection('users')
    const systemAnnouncementsCollection = db.collection('systemAnnouncements')
    const systemTextMessagesCollection = db.collection('systemTextMessages')
    const scheduledMessages = await systemMessagesCollection.get()
    console.log('Preparing to send scheduled messages if any')
    if (!scheduledMessages.empty) {
      scheduledMessages.docs.forEach(async (doc) => {
        const messageData = doc.data()

        if (getScheduledDateTime(messageData.date, messageData.time) <= getCurrentDateTime()) {
          const docRef = doc.ref
          await docRef.update({
            ...doc.data(),
            status: 'sent',
          })

          const customers = await usersCollection
            .where('receiveAnnouncements', '==', true)
            .get()

          if (!customers.empty) {
            customers.docs.forEach(async (customerDoc) => {
              const customerData = customerDoc.data()

              const userDocAnnouncementData = {
                systemMessageId: doc.id,
                customerId: customerDoc.id,
                message: messageData.message,
                subject: messageData.subject,
                status: 'un-read',
                subject: messageData.subject,
              }
              const existingAnnouncements = await systemAnnouncementsCollection
                .where('systemMessageId', '==', doc.id)
                .where('customerId', '==', customerDoc.id)
                .get()
              if (existingAnnouncements.empty) {
                await systemAnnouncementsCollection.add(userDocAnnouncementData)
              }

              if (customerData.phone) {
                let customerPhoneNumber = customerData.phone
                // replace all non-numeric characters
                const cleanedNumber = customerPhoneNumber.replace(/[^\d]/g, '')
                if (cleanedNumber.length === 11) {
                  customerPhoneNumber = '+' + cleanedNumber
                } else if (
                  cleanedNumber.length === 10 &&
                  !cleanedNumber.startsWith('1')
                ) {
                  customerPhoneNumber = '+1' + cleanedNumber
                } else {
                  customerPhoneNumber = null
                }
                if (customerPhoneNumber) {
                  const userDocTextData = {
                    systemMessageId: doc.id,
                    customerId: customerDoc.id,
                    phone: customerPhoneNumber,
                    message: messageData.message,
                    subject: messageData.subject,
                    status: 'sent',
                  }
                  const existingTextMessage = await systemTextMessagesCollection
                    .where('systemMessageId', '==', doc.id)
                    .where('customerId', '==', customerDoc.id)
                    .get()
                  if (existingTextMessage.empty) {
                    await systemTextMessagesCollection.add(userDocTextData)
                    await sendAnnouncementTextToCustomer(userDocTextData)
                  }
                } else {
                  console.log(
                    'InvalidPhoneNumber',
                    customerDoc.id,
                    customerData.phone
                  )
                }
              } else {
                console.log(
                  'customerPhoneDoesNotExist',
                  customerDoc.id,
                  customerData
                )
              }
            })
          }
        }
      })
    }
  }, INTERVAL)
}
