module.exports = async ({ db }) => {
  async function deleteCollection(collectionPath, batchSize = 100) {
    const collectionRef = db.collection(collectionPath)
    const query = collectionRef.limit(batchSize)

    return new Promise((resolve, reject) => {
      deleteQueryBatch(db, query, resolve, reject)
    })
  }

  async function deleteQueryBatch(db, query, resolve, reject) {
    try {
      const snapshot = await query.get()

      if (snapshot.empty) {
        console.log('✅ Collection is now empty')
        resolve()
        return
      }

      const batch = db.batch()
      snapshot.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()

      console.log(
        `🧹 Deleted ${snapshot.size} documents from ${
          query._queryOptions.parentPath?.segments?.[1] || 'collection'
        }`
      )

      // Recursively delete the next batch
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve, reject)
      })
    } catch (err) {
      reject(err)
    }
  }

  // periodically check for the new scheduled messages (every minute)
  const systemMessagesCollection = db.collection('systemMessages')
  const systemAnnouncementsCollection = db.collection('systemAnnouncements')
  const systemTextMessagesCollection = db.collection('systemTextMessages')

  console.log('Preparing to send scheduled messages if any')

  console.log('🚨 Deleting all documents from system collections...')

  // await deleteCollection('systemMessages')
  // await deleteCollection('systemAnnouncements')
  // await deleteCollection('systemTextMessages')

  console.log('🔥 All data deleted successfully!')
}
