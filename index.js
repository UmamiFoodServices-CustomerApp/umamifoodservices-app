const express = require("express");
const app = express();
require("dotenv").config();
const { Client, Environment } = require("square");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const PDFDocument = require("pdfkit"); // Import the pdfkit library
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const firebaseAdmin = require("firebase-admin");

const {
  getItemQuantity,
  getItemName,
  formatMoney,
  getItemFinalAmount,
  getItemRate,
} = require("./utils/order");

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

const fs = require("fs");
const path = require("path");

// Define the file path
const imagePath = path.join(__dirname, "images", "Logo.png");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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

app.post("/chargeForCookie", async (request, response) => {
  const requestBody = request.body;
  try {
    const locationId = process.env.LOCATION_ID;
    const createOrderRequest = {
      ...requestBody.orderRequest,
      locationId: locationId,
    };
    const createOrderResponse = await ordersApi.createOrder(createOrderRequest);

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
});

app.post("/chargeCustomerCard", async (request, response) => {
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
});

app.post("/createCustomerCard", async (request, response) => {
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
});

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
          "	The card is not supported either in the geographic region or by the MCC; Please try re-entering card details.",
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

app.get("/generatePdf", async (request, response) => {
  try {
    const orderId = request.query.orderId;

    const orderDocRef = db.collection("completed").doc(orderId);
    const orderSnap = await orderDocRef.get();

    const order = orderSnap?.data?.();
    const items = order.items;

    const todayDate = () => {
      const currentDate = new Date();
      const day = String(currentDate.getDate()).padStart(2, "0");
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const year = currentDate.getFullYear();

      return `${day}/${month}/${year}`;
    };

    let fontNormal = "Helvetica";
    let fontBold = "Helvetica-Bold";

    // Create a new PDF document
    const doc = new PDFDocument();
    // Pipe the PDF to the response object
    doc.pipe(response);

    doc
      .image(imagePath, { scale: 0.2 })
      .fontSize(18)
      .font(fontBold)
      .text("Umami Food Services", 200, 100)
      .fontSize(12)
      .font(fontNormal)
      .text("14841 Moran St", 200, 124)
      .text("Westminster, CA 92683 US", 200, 140)
      .text("sales@umamiservices.com", 200, 156);

    doc
      .fillColor("#FF8C00")
      .fontSize(26)
      .font(fontBold)
      .text("INVOICE", 60, 180, {});

    doc.moveDown(0.4);

    doc
      .fillColor("#000000")
      .font(fontBold)
      .fontSize(18)
      .text("Bill To", { align: "start" })
      .fontSize(12)
      .font(fontNormal)
      .text(order.name)
      .text(order.businessName)
      .text(order.confirmedDeliveryAddress);

    doc
      .fillColor("#000000")
      .font(fontBold)
      .fontSize(14)
      .text("INVOICE #", 400, 225, { continued: true, paragraphGap: 10 })
      .fontSize(12)
      .font(fontNormal)
      .text(todayDate(), 440);

    doc.moveDown(4.4);

    doc.stroke();
    doc.lineWidth(25).fillColor("red");

    doc.lineWidth(0.5);
    doc.strokeColor("#fd8c02");
    doc.moveTo(50, 300).lineTo(570, 300).stroke();

    doc.rect(50, 310, 520, 24).fill("#ffe8cc").stroke("#fd8c02");
    doc.fillColor("#fd8c02").font(fontBold).text("QTY", 60, 317, { width: 90 });
    doc.font(fontBold).text("ITEMS", 110, 317, { width: 300 });
    doc.font(fontBold).text("RATE", 420, 317, { width: 90 });
    doc.font(fontBold).text("AMOUNT", 500, 317, { width: 100 });

    let itemNo = 1;
    items.forEach((item) => {
      let y = 330 + itemNo * 20;
      doc
        .fillColor("#000")
        .font(fontNormal)
        .text(getItemQuantity(item), 60, y, { width: 90 });
      doc.font(fontNormal).text(getItemName(item), 110, y, { width: 300 });
      doc.font(fontNormal).text(getItemRate(item), 420, y, { width: 90 });
      doc
        .font(fontNormal)
        .text(formatMoney(getItemFinalAmount(item)), 500, y, { width: 100 });
      itemNo++;
    });

    itemNo++;

    doc.dash(5, { space: 2 });
    doc.lineWidth(0.5);
    doc.strokeColor("#333333");
    doc
      .moveTo(50, 310 + itemNo * 20)
      .lineTo(570, 310 + itemNo * 20)
      .stroke();
    doc.undash();

    doc.font(fontBold).text("TOTAL", 400, 330 + itemNo * 20);
    doc
      .font(fontBold)
      .text(formatMoney(order.totalCost), 500, 330 + itemNo * 20, {
        width: 100,
      });

    doc.end();

    // Set response headers for PDF
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", "inline; filename=invoice.pdf");
  } catch (error) {
    console.error(error);
    response.status(500).send({
      errorMessage: "PDF error; please try again;",
    });
  }
});

app.post("/create-stripe-customer", async (req, res) => {
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
});

app.post("/create-stripe-payment-intent", async (req, res) => {
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
});

app.post("/create-stripe-setup-intent", async (req, res) => {
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
});

app.post("/fetch-stripe-all-saved-cards", async (req, res) => {
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
});

app.post("/delete-stripe-saved-card", async (req, res) => {
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
});

app.post("/charge-stripe-saved-card", async (req, res) => {
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
});

app.post("/create-stripe-ach-payment-intent", async (req, res) => {
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
});

app.post("/stripe-webhook", async (req, res) => {
  try {
    const type = req.body?.type;
    const orderId = req.body?.data?.object?.metadata?.orderId;
    const metadata = req.body?.data?.object?.metadata;

    if (
      type === "payment_intent.succeeded" ||
      type === "invoice.payment_succeeded"
    ) {
      console.log("inside------>", { metadata, orderId });
      const orderDocRef = db.collection("confirmed").doc(orderId);
      const orderSnap = await orderDocRef.get();
      console.log("inside------> 0", orderSnap);
      const order = orderSnap?.data?.();

      console.log("inside------> 1");

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
        console.log("inside------> 2");
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
      console.log("inside------> 3");
      await docRef.update(updateData);
    }

    res.send({
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.send({
      success: false,
    });
  }
});

// listen for requests :)
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
