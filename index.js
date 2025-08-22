const express = require("express");
const nodemailer = require("nodemailer");
const app = express();
require("dotenv").config();
const { Client, Environment } = require("square");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const { getAdminInviteEmail } = require("./emails/adminInvite");
const fs = require("fs");
const { updateDoc } = require("firebase/firestore");

const firebaseAdmin = require("firebase-admin");

const { generatePdf } = require("./utils/order");

const serviceAccount = {
  type: "service_account",
  universe_domain: "googleapis.com",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = firebaseAdmin.firestore();

const creds = {
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(creds);

const path = require("path");
const { generateStrongPassword, makeFormObject } = require("./utils/auth");
const { getCustomerWelcomeEmail } = require("./emails/customerWelcome");
const {
  getCustomerSignupWelcomeEmail,
} = require("./emails/customerSignupWelcome");
const {
  getCustomerSignupAdminWelcome,
} = require("./emails/customerSignupAdminWelcome");

// Define the file path
const imagePath = path.join(__dirname, "images", "Logo.png");

// Initialized the Square Api client:
//   Set environment
//   Set access token
const defaultClient = new Client({
  environment:
    process.env.ENVIRONMENT === "PRODUCTION"
      ? Environment.Production
      : Environment.Sandbox,
  accessToken: process.env.ACCESS_TOKEN,
});

const { paymentsApi, ordersApi, locationsApi, customersApi } = defaultClient;

app.use(cors());

app.post(
  "/sendPasswordReset",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    const { email } = req.body;

    try {
      // Generate password reset link
      const resetLink = await firebaseAdmin
        .auth()
        .generatePasswordResetLink(email);

      // Send email using Nodemailer
      const mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Password Reset",
        text: `Click the following link to reset your password: ${resetLink}`,
        html: `<p>Click the following link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).send("Password reset email sent successfully.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      res.status(500).send("Error sending password reset email.");
    }
  }
);

// TODO: bodyParser.urlencoded({ extended: false }), bodyParser.json() these functions are passing directly to the app.post() method. This is not a good practice. You should pass these functions to the app.use() method.
// I can't pass use it in app.use() because I am using one more parser for this endpoint: `/email-stripe-invoice` and that's why I can't use two parsers.

const getFileExtension = (url = "") => {
  if (!url.includes(".")) {
    return null;
  }
  const parts = url.split(".");
  const extension = parts.pop().split("?")[0].split("#")[0];
  return extension.toLowerCase();
};

app.post(
  "/chargeForCookie",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (request, response) => {
    const requestBody = request.body;
    try {
      const locationId = process.env.LOCATION_ID;
      const createOrderRequest = {
        ...requestBody.orderRequest,
        locationId: locationId,
      };
      const createOrderResponse = await ordersApi.createOrder(
        createOrderRequest
      );

      const createPaymentRequest = {
        idempotencyKey: crypto.randomBytes(12).toString("hex"),
        sourceId: requestBody.nonce,
        amountMoney: {
          ...createOrderResponse.result.order.totalMoney,
        },
        orderId: createOrderResponse.result.order.id,
        autocomplete: true,
        locationId,
      };
      const createPaymentResponse = await paymentsApi.createPayment(
        createPaymentRequest
      );
      console.log(createPaymentResponse.result.payment);

      response.status(200).json(createPaymentResponse.result.payment);
    } catch (e) {
      console.log(
        `[Error] Status:${e.statusCode}, Messages: ${JSON.stringify(
          e.errors,
          null,
          2
        )}`
      );

      sendErrorMessage(e.errors, response);
    }
  }
);

app.post(
  "/chargeCustomerCard",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (request, response) => {
    const requestBody = request.body;

    try {
      const listLocationsResponse = await locationsApi.listLocations();
      const locationId = process.env.LOCATION_ID;
      const createOrderRequest = {
        ...requestBody.orderRequest,
        locationId: locationId,
      };
      const createOrderResponse = await ordersApi.createOrder(
        locationId,
        createOrderRequest
      );
      const createPaymentRequest = {
        idempotencyKey: crypto.randomBytes(12).toString("hex"),
        customerId: requestBody.customer_id,
        sourceId: requestBody.customer_card_id,
        amountMoney: {
          ...createOrderResponse.result.order.totalMoney,
        },
        orderId: createOrderResponse.result.order.id,
      };
      const createPaymentResponse = await paymentsApi.createPayment(
        createPaymentRequest
      );
      console.log(createPaymentResponse.result.payment);

      response.status(200).json(createPaymentResponse.result.payment);
    } catch (e) {
      console.log(
        `[Error] Status:${e.statusCode}, Messages: ${JSON.stringify(
          e.errors,
          null,
          2
        )}`
      );

      sendErrorMessage(e.errors, response);
    }
  }
);

app.post(
  "/createCustomerCard",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (request, response) => {
    const requestBody = request.body;
    console.log(requestBody);
    try {
      const createCustomerCardRequestBody = {
        cardNonce: requestBody.nonce,
      };
      const customerCardResponse = await customersApi.createCustomerCard(
        requestBody.customer_id,
        createCustomerCardRequestBody
      );
      console.log(customerCardResponse.result.card);

      response.status(200).json(customerCardResponse.result.card);
    } catch (e) {
      console.log(
        `[Error] Status:${e.statusCode}, Messages: ${JSON.stringify(
          e.errors,
          null,
          2
        )}`
      );

      sendErrorMessage(e.errors, response);
    }
  }
);

function getOrderRequest(locationId) {
  return {
    idempotencyKey: crypto.randomBytes(12).toString("hex"),
    order: {
      locationId: locationId,
      lineItems: [
        {
          name: "Cookie 🍪",
          quantity: "1",
          basePriceMoney: {
            amount: 100,
            currency: "USD",
          },
        },
      ],
    },
  };
}

function sendErrorMessage(errors, response) {
  switch (errors[0].code) {
    case "UNAUTHORIZED":
      response.status(401).send({
        errorMessage:
          "Server Not Authorized. Please check your server permission.",
      });
      break;
    case "GENERIC_DECLINE":
      response.status(400).send({
        errorMessage: "Card declined. Please re-enter card information.",
      });
      break;
    case "CVV_FAILURE":
      response.status(400).send({
        errorMessage: "Invalid CVV. Please re-enter card information.",
      });
      break;
    case "ADDRESS_VERIFICATION_FAILURE":
      response.status(400).send({
        errorMessage: "Invalid Postal Code. Please re-enter card information.",
      });
      break;
    case "EXPIRATION_FAILURE":
      response.status(400).send({
        errorMessage:
          "Invalid expiration date. Please re-enter card information.",
      });
      break;
    case "INSUFFICIENT_FUNDS":
      response.status(400).send({
        errorMessage:
          "Insufficient funds; Please try re-entering card details.",
      });
      break;
    case "CARD_NOT_SUPPORTED":
      response.status(400).send({
        errorMessage:
          " The card is not supported either in the geographic region or by the MCC; Please try re-entering card details.",
      });
      break;
    case "PAYMENT_LIMIT_EXCEEDED":
      response.status(400).send({
        errorMessage:
          "Processing limit for this merchant; Please try re-entering card details.",
      });
      break;
    case "TEMPORARY_ERROR":
      response.status(500).send({
        errorMessage: "Unknown temporary error; please try again;",
      });
      break;
    case "PDF_ERROR":
      response.status(500).send({
        errorMessage: "PDF error; please try again;",
      });
      break;
    default:
      response.status(400).send({
        errorMessage:
          "Payment error. Please contact support if issue persists.",
      });
      break;
  }
}

app.get(
  "/generatePdf",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (request, response) => {
    try {
      const orderId = request.query.orderId;
      const email = request.query.email;
      const invoiceUrl = request.query.invoiceUrl;
      const isActiveOrder = request.query.orderStatus === "active";

      if (invoiceUrl) {
        const formattedInvoiceUrl = invoiceUrl.replace(
          "/o/invoices/",
          "/o/invoices%2F"
        );

        const extension = getFileExtension(formattedInvoiceUrl);

        let mailOptions = {
          from: process.env.MAIL_FROM,
          to: email,
          subject: "Your Invoice",
          text: "Please find your attached invoice.",
          attachments: [
            {
              filename: `invoice.${extension}`,
              path: formattedInvoiceUrl,
            },
          ],
        };

        await transporter.sendMail(mailOptions);
        return response.status(200).json({ status: true });
      }

      const orderDocRef = db
        .collection(isActiveOrder ? "confirmed" : "completed")
        .doc(orderId);
      const orderSnap = await orderDocRef.get();

      const order = orderSnap?.data?.();

      const outputPath = "output_invoice.pdf";

      await generatePdf(order, outputPath);

      const pdfData = fs.readFileSync(outputPath);

      await orderDocRef.update({ generateNewInvoice: false });

      if (!email) {
        response.setHeader("Content-Type", "application/pdf");
        response.setHeader(
          "Content-Disposition",
          "inline; filename=invoice.pdf"
        );
        return response.send(pdfData);
      }

      let mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Your Invoice",
        text: "Please find your attached invoice.",
        attachments: [
          {
            filename: "invoice.pdf",
            content: pdfData,
          },
        ],
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
          response.status(500).send({
            errorMessage: "Email error; please try again;",
          });
        } else {
          console.log("Email sent: " + info.response);
          response.setHeader("Content-Type", "application/pdf");
          response.setHeader(
            "Content-Disposition",
            "inline; filename=invoice.pdf"
          );
          response.send(pdfData);
        }
      });
    } catch (error) {
      console.error(error);
      response.status(500).send({
        errorMessage: "PDF error; please try again;",
        error,
      });
    }
  }
);

app.post(
  "/create-stripe-customer",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    try {
      const customer = req.body.customer;
      let customerId = customer?.stripeCustomer;

      if (customerId) {
        try {
          const res = await stripe.customers.retrieve(customerId);
          if (res?.deleted) customerId = null;
        } catch (err) {
          customerId = null;
        }
      }

      if (!customerId) {
        const data = {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: {
            city: customer.city,
            country: "US",
            line1: customer.address1,
            line2: customer.address2,
            postal_code: customer.zip,
            state: customer.state,
          },
          metadata: {
            reference_id: customer.id,
          },
        };
        const response = await stripe.customers.create(data);
        customerId = response.id;
      }

      res.send({
        customer: customerId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({ errorMessage: error });
    }
  }
);

app.post(
  "/create-stripe-payment-intent",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    try {
      const order = req.body?.order;
      const customer = req.body?.customer;
      const orderId = order?.id;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalCost * 1.03 * 100),
        currency: "usd",
        customer: customer,
        metadata: { orderId },
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Order#: ${orderId}`,
      });

      res.send({
        paymentIntent: paymentIntent.client_secret,
        customer: customer,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        errorMessage: error,
      });
    }
  }
);

app.post(
  "/create-stripe-setup-intent",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    try {
      const customer = req.body?.customer;
      const customerId = customer?.stripeCustomer;

      const paymentIntent = await stripe.setupIntents.create({
        customer: customerId,
        description: `setup intent - customer: ${customer?.id} email: ${
          customer?.email ?? customer?.email_address
        }`,
      });

      res.send({
        paymentIntent: paymentIntent.client_secret,
        customer: customerId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        errorMessage: error,
      });
    }
  }
);

app.post(
  "/fetch-stripe-all-saved-cards",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    try {
      const customer = req.body?.customer;

      const response = await stripe.paymentMethods.list({
        customer: customer,
        type: "card",
      });

      res.send({
        savedCards: response?.data ?? [],
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        errorMessage: error,
      });
    }
  }
);

app.post(
  "/delete-stripe-saved-card",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    try {
      const card = req.body?.card;

      await stripe.paymentMethods.detach(card.id);

      res.send({
        success: true,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        errorMessage: error,
      });
    }
  }
);

app.post(
  "/charge-stripe-saved-card",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    try {
      const card = req.body?.card;
      const customer = req.body?.customer;
      const order = req.body?.order;
      const orderId = order?.id;

      const data = {
        amount: Math.round(order.totalCost * 1.03 * 100),
        currency: "usd",
        customer: customer,
        payment_method: card.id,
        off_session: true,
        confirm: true,
        description: `Order#: ${orderId}`,
        metadata: { orderId },
      };

      console.log("data--------------", data);

      await stripe.paymentIntents.create(data);

      res.send({
        success: true,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        errorMessage: error,
      });
    }
  }
);

app.post(
  "/create-stripe-ach-payment-intent",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    try {
      const order = req.body?.order;
      const customer = req.body?.customer;

      const orderId = order?.id;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalCost * 100),
        currency: "usd",
        customer: customer,
        description: `Order#: ${orderId}`,
        setup_future_usage: "off_session",
        payment_method_types: ["us_bank_account"],
        metadata: { orderId },
        payment_method_options: {
          us_bank_account: {
            financial_connections: {
              permissions: ["payment_method", "balances"],
            },
          },
        },
      });

      res.send({
        paymentIntent: paymentIntent.client_secret,
        customer: customer,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        errorMessage: error,
      });
    }
  }
);

app.post(
  "/stripe-webhook",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    try {
      const type = req.body?.type;
      const orderId = req.body?.data?.object?.metadata?.orderId;

      if (
        type === "payment_intent.succeeded" ||
        type === "invoice.payment_succeeded"
      ) {
        const orderDocRef = db.collection("confirmed").doc(orderId);
        const orderSnap = await orderDocRef.get();
        const order = orderSnap?.data?.();

        const paymentSelected = order.paymentSelected;

        if (paymentSelected === "ACH") {
          const docRef = db.collection("confirmed").doc(orderId);
          const updateData = {
            payedWith: "ACH",
            stripe_ach_payment: {
              in_progress: false,
              success: true,
            },
          };
          await docRef.update(updateData);
        }
      }

      if (type === "payment_intent.payment_failed") {
        const docRef = db.collection("confirmed").doc(orderId);

        const updateData = {
          payedWith: "None",
          stripe_ach_payment: {
            in_progress: false,
            success: false,
          },
        };

        await docRef.update(updateData);
      }

      res.send({
        success: true,
      });
    } catch (error) {
      res.send({
        success: false,
      });
    }
  }
);

app.post(
  "/send-admin-invite",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (request, res) => {
    try {
      const { name, email } = request.body;
      if (!name || !email) {
        res.status(400).send({
          errorMessage: "email and name is required",
        });
        return;
      }

      const resetLink = await firebaseAdmin
        .auth()
        .generatePasswordResetLink(email);

      const mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Welcome to Umami Food Services!",
        html: getAdminInviteEmail({ passwordLink: resetLink, name }),
      };

      await transporter.sendMail(mailOptions);

      res.send({ success: true });
    } catch (error) {
      res.status(500).send({
        errorMessage: error?.message,
      });
    }
  }
);

// When adding customer from admin portal
app.post(
  "/add-customer-admin",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (request, res) => {
    try {
      const {
        firstName,
        lastName,
        phoneNumber,
        email,
        address1,
        address2,
        state,
        city,
        zipCode,
      } = request.body;

      const missingFields = [];

      if (!firstName) missingFields.push("firstName");
      if (!lastName) missingFields.push("lastName");
      if (!phoneNumber) missingFields.push("phoneNumber");
      if (!email) missingFields.push("email");
      if (!address1) missingFields.push("address1");
      if (!address2) missingFields.push("address2");
      if (!state) missingFields.push("state");
      if (!city) missingFields.push("city");
      if (!zipCode) missingFields.push("zipCode");

      if (missingFields.length > 0) {
        return res.status(400).send({
          errorMessage: `Missing required fields: ${missingFields.join(", ")}`,
          missingFields,
        });
      }

      const password = generateStrongPassword();

      const fullName = `${firstName} ${lastName}`;

      const user = await firebaseAdmin.auth().createUser({
        email,
        password,
        emailVerified: true,
        disabled: false,
        displayName: fullName,
      });

      const userDocData = makeFormObject({
        name: fullName,
        email,
        password,
        confirmPassword: password,
        phone: phoneNumber,
        dateOfBirth: null,
        isPrivacyAccepted: true,
        isTermsAccepted: true,
        address: address1,
        secondaryAddress: address2,
        city,
        state,
        zip: zipCode,
        businessName: fullName,
      });

      await db.collection("users").doc(user.uid).set(userDocData);

      const resetLink = await firebaseAdmin
        .auth()
        .generatePasswordResetLink(email);

      const mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Welcome to Umami Food Services",
        html: getCustomerWelcomeEmail({
          fullName,
          passwordLink: resetLink,
          tempPassword: password,
        }),
      };

      await transporter.sendMail(mailOptions);

      res.send({ success: true });
    } catch (error) {
      res.status(500).send({
        errorMessage: error?.message,
      });
    }
  }
);

// When customer sign up for the app
app.post(
  "/customer-signup-email",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (request, res) => {
    try {
      const { email, name } = request.body;

      const missingFields = [];
      if (!email) missingFields.push("email");
      if (!name) missingFields.push("name");

      if (missingFields.length > 0) {
        return res.status(400).send({
          errorMessage: `Missing required fields: ${missingFields.join(", ")}`,
          missingFields,
        });
      }

      // Send Email to Customer
      const mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Welcome to Umami Food Services",
        html: getCustomerSignupWelcomeEmail({ fullName: name }),
      };
      await transporter.sendMail(mailOptions);

      // Send Email to Admin
      const adminMailOptions = {
        from: process.env.MAIL_FROM,
        to: "kennguyen.987@gmail.com",
        subject: "Welcome new user to Umami Food Services!",
        html: getCustomerSignupAdminWelcome({
          userEmail: email,
          adminFullName: "Umami Admin",
          userFullName: name,
        }),
      };
      await transporter.sendMail(adminMailOptions);

      res.send({ success: true });
    } catch (error) {
      res.status(500).send({
        errorMessage: error?.message,
      });
    }
  }
);

require("./controllers/email.controllers")(app, db, bodyParser);

app.post(
  "/update-user-email",
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  async (req, res) => {
    const { uid, newEmail } = req.body;

    try {
      // Validation
      if (!uid || !newEmail) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "Both uid and newEmail are required",
          code: "MISSING_FIELDS",
        });
      }

      // Validate UID format
      if (typeof uid !== "string" || uid.length < 10) {
        return res.status(400).json({
          error: "Invalid UID format",
          message: "UID must be a valid string",
          code: "INVALID_UID",
        });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({
          error: "Invalid email format",
          message: "Please provide a valid email address",
          code: "INVALID_EMAIL",
        });
      }

      // Sanitize email
      const sanitizedEmail = newEmail.toLowerCase().trim();

      // Check if the user exists first
      let userRecord;
      try {
        userRecord = await firebaseAdmin.auth().getUser(uid);
      } catch (getUserError) {
        if (getUserError.code === "auth/user-not-found") {
          return res.status(404).json({
            error: "User not found",
            message: "No user found with the provided UID",
            code: "USER_NOT_FOUND",
          });
        }
        throw getUserError;
      }

      // Store old email for logging/audit purposes
      const oldEmail = userRecord.email;

      // Check if the new email is the same as current email
      if (oldEmail === sanitizedEmail) {
        return res.status(400).json({
          error: "Email unchanged",
          message: "The new email is the same as the current email",
          code: "EMAIL_UNCHANGED",
        });
      }

      // Check if the new email is already in use by another user
      try {
        await firebaseAdmin.auth().getUserByEmail(sanitizedEmail);
        // If we reach here, email is already in use
        return res.status(409).json({
          error: "Email already in use",
          message:
            "The email address is already associated with another account",
          code: "EMAIL_ALREADY_EXISTS",
        });
      } catch (emailCheckError) {
        // If error code is 'auth/user-not-found', email is available (which is what we want)
        if (emailCheckError.code !== "auth/user-not-found") {
          throw emailCheckError;
        }
      }

      // Update the user's email in Firebase Auth
      const updatedUser = await firebaseAdmin.auth().updateUser(uid, {
        email: sanitizedEmail,
        emailVerified: true, // Reset email verification status
      });

      // Update the user's email in Firestore as well
      try {
        const userDocRef = db.collection("users").doc(uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
          await userDocRef.update({
            email: sanitizedEmail,
            emailVerified: true,
            lastEmailUpdate: new Date().toISOString(),
          });
        }
      } catch (firestoreError) {
        console.warn(
          "Failed to update user email in Firestore:",
          firestoreError
        );
      }

      res.status(200).json({
        success: true,
        message: "Email updated successfully",
        data: {
          uid: updatedUser.uid,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error updating user email:", error);

      // Handle specific Firebase Auth errors
      let statusCode = 500;
      let errorMessage = "Internal server error";
      let errorCode = "INTERNAL_ERROR";

      switch (error.code) {
        case "auth/email-already-exists":
          statusCode = 409;
          errorMessage =
            "The email address is already in use by another account";
          errorCode = "EMAIL_ALREADY_EXISTS";
          break;
        case "auth/invalid-email":
          statusCode = 400;
          errorMessage = "The email address is not valid";
          errorCode = "INVALID_EMAIL";
          break;
        case "auth/user-not-found":
          statusCode = 404;
          errorMessage = "No user found with the provided UID";
          errorCode = "USER_NOT_FOUND";
          break;
        case "auth/invalid-uid":
          statusCode = 400;
          errorMessage = "The provided UID is invalid";
          errorCode = "INVALID_UID";
          break;
        default:
          console.error("Unexpected error:", error);
      }

      res.status(statusCode).json({
        error: errorMessage,
        code: errorCode,
        ...(process.env.NODE_ENV === "development" && { debug: error.message }),
      });
    }
  }
);

const listener = app.listen(process.env.PORT || 3000, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
