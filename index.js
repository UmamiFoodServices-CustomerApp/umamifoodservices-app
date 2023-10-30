const express = require("express");
const app = express();
const { Client, Environment } = require("square");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const PDFDocument = require("pdfkit"); // Import the pdfkit library

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
    // orders

    const orders = [
      {
        id: 1,
        product: "TV",
        quantity: 32,
        price: 100,
      },
      {
        id: 2,
        product: "mobile",
        quantity: 32,
        price: 100,
      },
      {
        id: 4,
        product: "remote",
        quantity: 32,
        price: 100,
      },
    ];

    let orderInfo = {
      orderNo: "15484659",
      invoiceNo: "MH-MU-1077",
      invoiceDate: "11/05/2021",
      invoiceTime: "10:57:00 PM",
      products: [
        {
          id: "15785",
          name: "Case - Bag - White Grocery Bag #6",
          price: "$30.00",
          qty: 1,
        },
        {
          id: "15786",
          name: "Dell Magic Mouse WQ1545",
          price: "$30.00",
          qty: 2,
        },
      ],
      totalValue: "$60.00 ",
    };

    const terms =
      "By signing this document I/We acknowledge the receipt of invoiced products. I/We agree to pay a finance charge of 1.5%per month on all past due accounts. Umami will charge a $30 processing fee on all returned checks for ACH Customers. A $15 charge will be assessed on order canceled on same day or on second delivery attempt. Claims must be made upon the time of delivery. Please weigh and inspect all items with the driver upon delivery.";

    let fontNormal = "Helvetica";
    let fontBold = "Helvetica-Bold";

    // Create a new PDF document
    const doc = new PDFDocument();
    // Pipe the PDF to the response object
    doc.pipe(response);

    doc
      .image(imagePath, { scale: 0.2 })
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Umami Food Services", 200, 100)
      .fontSize(12)
      .font("Helvetica")
      .text("14841 Moran St", 200, 124)
      .text("Westminster, CA 92683 US", 200, 140)
      .text("sales@umamiservices.com", 200, 156);

    doc
      .fillColor("#FF8C00")
      .fontSize(26)
      .font("Helvetica-Bold")
      .text("INVOICE", 60, 180, {
        // align: "center",
      });

    // Bill Section
    doc.moveDown(0.4);

    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("Bill To", { align: "start" })
      .fontSize(12)
      .font("Helvetica")
      .text("Gourav")
      .text("Gourav Singh")
      .text("Address 1, Ambala Haryana 12345");

    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("INVOICE #", 400, 225, { continued: true, paragraphGap: 10 })
      .fontSize(12)
      .font("Helvetica")
      .text("28/09/23", 440);
    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("DATE #", 400, 245, {
        continued: true,
        // align: "right",
      })
      .fontSize(12)
      .font("Helvetica")
      .text("28/09/23", 455);
    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("DUE DATE #", 400, 265, { continued: true })
      .fontSize(12)
      .font("Helvetica")
      .text("28/09/23", 460);

    doc.moveDown(4.4);

    doc.stroke();
    // these examples are easier to see with a large line width
    doc.lineWidth(25).fillColor("red");
    // doc.rect(doc.x, 0, 410, doc.y).stroke();
    // Scale the image
    // Get a reference to the Outline root

    // // Set up table headers

    // doc
    //   .fontSize(12)
    //   .text("Order ID", 50)
    //   .text("Product", 150)
    //   .text("Quantity", 300)
    //   .text("Price", 400);
    // doc.moveDown();
    // // Add orders to the table
    // orders.forEach((order) => {
    //   doc
    //     .text(order.id.toString(), 50)
    //     .text(order.product, 150)
    //     .text(order.quantity.toString(), 300)
    //     .text("$" + order.price.toString(), 400);
    //   doc.moveDown();
    // });

    // Finalize the PDF
    doc.lineWidth(0.5);
    doc.strokeColor("#fd8c02");
    doc.moveTo(50, 300).lineTo(570, 300).stroke();

    doc.rect(50, 310, 520, 24).fill("#ffe8cc").stroke("#fd8c02");
    doc.fillColor("#fd8c02").font(fontBold).text("QTY", 60, 317, { width: 90 });
    doc.font(fontBold).text("ITEMS", 110, 317, { width: 300 });
    doc.font(fontBold).text("RATE", 400, 317, { width: 200 });
    doc.font(fontBold).text("AMOUNT", 500, 317, { width: 100 });

    let productNo = 1;
    orderInfo.products.forEach((element) => {
      let y = 330 + productNo * 20;
      doc
        .fillColor("#000")
        .font(fontNormal)
        .text(element.qty, 60, y, { width: 90 });
      doc.font(fontNormal).text(element.name, 110, y, { width: 300 });
      doc.font(fontNormal).text("", 400, y, { width: 100 });
      doc.font(fontNormal).text(element.price, 500, y, { width: 100 });
      productNo++;
    });

    productNo++;

    doc.dash(5, { space: 2 });
    doc.lineWidth(0.5);
    doc.strokeColor("#333333");
    doc.moveTo(50, 390).lineTo(570, 390).stroke();
    doc.undash();

    doc.font(fontBold).text("BALANCE DUE", 400, 330 + productNo * 17);
    doc.font(fontBold).text(orderInfo.totalValue, 500, 330 + productNo * 17);

    doc
      .fillColor("#000000")
      .font(fontNormal)
      .fontSize(11)
      .text(terms, 60, 500, { continued: true });

    doc.end();

    // Set response headers for PDF
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", "inline; filename=sample.pdf");
  } catch (error) {
    console.error(error);
    response.status(500).send({
      errorMessage: "PDF error; please try again;",
    });
  }
});
// listen for requests :)
const listener = app.listen(4000, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
