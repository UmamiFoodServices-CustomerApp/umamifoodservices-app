const nodemailer = require("nodemailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const sendPaymentNotificationHtmlBody = require("../emails/stripePaymentReceived");
const sendInvoiceHtmlBody = require("../emails/invoiceSend");
const bodyParser = require("body-parser");

module.exports = (app, db) => {
  const creds = {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  };

  const transporter = nodemailer.createTransport(creds);

  app.post(
    "/send-email",
    bodyParser.urlencoded({ extended: false }),
    bodyParser.json(),
    async (request, res) => {
      try {
        const orderDocRef = db
          .collection("confirmed")
          .doc(request.body.orderId);
        const orderSnap = await orderDocRef.get();
        const order = orderSnap?.data?.();

        const mailOptions = {
          from: process.env.MAIL_FROM,
          to: order.customer.email,
          subject: `Umami Food Services - Invoice #${order?.orderId}`,
          html: sendInvoiceHtmlBody(order),
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

  app.post(
    "/email-stripe-invoice",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      let event;

      console.log("req.body", req.body);

      try {
        // Convert the raw body from Buffer to string
        const rawBody = req.body.toString("utf8");
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error(err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === "payment_intent.succeeded") {
        const invoice = event.data.object;
        const customerResponse = await stripe.customers.retrieve(
          invoice.customer
        );
        const customerName = customerResponse.name; // Ensure this field is available in your Stripe setup
        const customerEmail = customerResponse.email; // Ensure this field is available in your Stripe setup
        const amountPaid = (invoice.amount_received / 100).toFixed(2); // Convert amount to dollars

        const mailOptions = {
          from: process.env.MAIL_FROM,
          to: process.env.ADMIN_EMAIL,
          subject: "Invoice Payment Received",
          html: sendPaymentNotificationHtmlBody(
            customerName,
            amountPaid,
            "kennguyen.987@gmail.com"
          ),
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            return console.log(error);
          }
          console.log("Email sent: " + info.response);
        });
      }

      res.json({ received: true });
    }
  );
};
