const { Timestamp } = require("firebase-admin/firestore");

const generateStrongPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  let password = "";

  for (let i = 0; i < 15; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[!@#$%^&*()_+~`|}{[\]:;?><,./-]/.test(password)
  ) {
    return generateStrongPassword();
  }

  return password;
};

const ADMIN_FIELDS = {
  admin: "2mXMGA5J4uv6ZYDv3cq7",
  adminName: "Jose",
  adminMessage: "Welcome to the Umami",
  adminMessageDate: new Date(),
  adminPhone: "5623995353",
  adminPic1:
    "https://firebasestorage.googleapis.com/v0/b/food-app-49b33.appspot.com/o/admin%2Fken.jpg?alt=media&token=3ba13c93-d3b0-42da-b9bd-4d027dc27ed4",
  adminPic2:
    "https://firebasestorage.googleapis.com/v0/b/food-app-49b33.appspot.com/o/admin%2Fkhuong.jpg?alt=media&token=9802f3d2-865d-4ad8-abf1-0dea4b912453",
  adminPic3:
    "https://firebasestorage.googleapis.com/v0/b/food-app-49b33.appspot.com/o/admin%2Fadmin-Jose.jpg?alt=media&token=16c0aef4-faa0-4ea7-999f-c07037616b8b",
  adminSurveyLink: "https://www.surveymonkey.com/r/VTHGDPZ",
  isAuthenticated: true,
  isVerified: true,
  sqIds: [],
  firstLoad: true,
  isAdmin: false,
};

const makeUserAddressObject = (data) => {
  const { city, state, zip } = data;
  const address = data?.address1 ?? data?.address;
  const secondaryAddress = data?.address2 ?? data?.secondaryAddress;
  const formatAddress = address + ", " + city + " " + state + " " + zip;
  return {
    address1: address,
    address2: secondaryAddress,
    address,
    secondaryAddress,
    deliveryLocation: formatAddress,
  };
};

const makeFormObject = (data) => {
  const { address, city, state, zip } = data;
  const formatAddress = address + ", " + city + " " + state + " " + zip;

  return {
    ...data,
    ...ADMIN_FIELDS,
    userTimesStampCreated: Timestamp.fromDate(new Date()),
    deliveryAddresses: [formatAddress],
    ...makeUserAddressObject(data),
  };
};

module.exports.generateStrongPassword = generateStrongPassword;
module.exports.makeFormObject = makeFormObject;
