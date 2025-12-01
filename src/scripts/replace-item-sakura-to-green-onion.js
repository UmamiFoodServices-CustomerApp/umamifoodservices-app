function cleanObject(obj) {
  for (const key in obj) {
    if (obj[key] === undefined || obj[key] === null) {
      delete obj[key]
    } else if (typeof obj[key] === 'object') {
      cleanObject(obj[key]) // Recursively clean nested objects
    }
  }
  return obj
}

const getNewItem = (user) => {
  const obj = {
    userId: user.userId,
    email: user.email,
    address1: user.address1,
    address2: user.address2,
    city: user.city,
    name: user.name,
    phone: user.phone,
    alternateContactName: user.alternateContactName,
    altPhone: user.altPhone,
    businessName: user.businessName,

    timestampCreated: new Date(),
    ItemId: 'ayY9NTZqCD3euozW3H0v',
    Brand: 'KING, LISTO',
    Case: '1',
    Unit: '48',
    Category: 'Produce',
    Description: '',
    Name: 'Green onion',
    Pic1: 'https://firebasestorage.googleapis.com/v0/b/food-app-49b33.appspot.com/o/products%2FayY9NTZqCD3euozW3H0v%2FScreenshot%202025-04-02%20093547.png?alt=media&token=9a198f72-a19c-4038-a81c-e2256d4a9f46',
    CustomerPrice: '52',
    CustomerUnitPrice: '52',
    InternalPrice: '48',
    InternalUnitPrice: '48',
    SoldByCase: true,
    SoldByBundle: false,
    SoldByLbs: false,
    SoldByUnit: false,
    primaryQuantity: 0,
    secondaryQuantity: 0,
    SoldBy: 'Case',
    IsVerified: true,
  }

  return cleanObject(obj)
}

module.exports = async ({ db }) => {
  const myStoreItemsRef = db.collection('mystore')
  const snapshot = await myStoreItemsRef
    .where('Brand', '=', 'SAKURA')
    .where('Brand', '<=', 'SAKURA' + '\uf8ff')
    .get()

  const results = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter(
      (item) => item.Name && item.Name.toUpperCase().includes('GREEN ONION')
    )

  console.log('total', results.length)

  for (const item of results) {
    // Delete old item from mystore collection
    const itemMyStoreId = item?.myStoreId
      ? item.myStoreId
      : (item?.ItemId ?? item?.id) + item?.userId
    await myStoreItemsRef.doc(itemMyStoreId).delete()
    console.log(`Deleted item with id: ${itemMyStoreId}`)

    // Check if new item already exists
    const newItem = getNewItem(item)
    const newItemMyStoreId = newItem.ItemId + newItem.userId

    const existingItemDoc = await myStoreItemsRef.doc(newItemMyStoreId).get()

    if (!existingItemDoc.exists) {
      // Add new item
      await myStoreItemsRef.doc(newItemMyStoreId).set(newItem)
      console.log(`Added new item with id: ${newItemMyStoreId}`)
    }
  }
}
