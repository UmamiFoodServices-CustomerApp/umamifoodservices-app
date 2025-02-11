const moment = require("moment");
const { default: puppeteer } = require("puppeteer");
const fs = require("fs");
const company = require("../service/vars");

const formatMoney = (amount, precision = true) => {
  if (precision) {
    return `$${Number(amount ?? 0).toFixed(2)}`;
  }

  return `$${amount ?? 0}`;
};

const getItemQuantity = (item) => {
  if (item.secondaryQuantity > 0 && item.primaryQuantity > 0) {
    return `${item.primaryQuantity}/${item.secondaryQuantity}`;
  }

  if (item.primaryQuantity > 0) {
    return item.primaryQuantity;
  }
  if (item.secondaryQuantity > 0) {
    return item.secondaryQuantity;
  }

  return 1;
};

const getItemRate = (item) => {
  const {
    CustomerUnitPrice,
    CustomerPrice,
    primaryQuantity,
    secondaryQuantity,
  } = item;

  if (secondaryQuantity > 0 && primaryQuantity > 0) {
    return `${formatMoney(CustomerPrice, false)} / ${formatMoney(
      CustomerUnitPrice,
      false
    )}`;
  }

  if (primaryQuantity > 0) {
    return formatMoney(CustomerPrice, false);
  }
  if (secondaryQuantity > 0) {
    return formatMoney(CustomerUnitPrice, false);
  }

  return formatMoney(CustomerPrice, false);
};


const getItemFinalAmount = (item) =>
  (item?.primaryQuantity ?? 1) * (item?.CustomerPrice ?? 1) +
  (item?.secondaryQuantity ?? 0) * (item?.CustomerUnitPrice ?? 1);

 const getCaseItemName = item => {
    const BrandName = item?.Brand || ''
    const ItemName = item?.Name || ''
    const itemCase = item?.primaryQuantity || 0
    const itemUnit = item?.secondaryQuantity || 0
  
    return `${BrandName} - ${ItemName} - Cs: ${itemCase} - Ut: ${itemUnit}`
  }
 const getUnitItemName = item => {
    const BrandName = item?.Brand || ''
    const ItemName = item?.Name || ''
    const itemCase = item?.primaryQuantity || 0
    const itemUnit = item?.secondaryQuantity || 0
  
    return `${BrandName} - ${ItemName} - Cs: ${itemCase} - Ut: ${itemUnit}`
  }


  const getItemName = item => {
    const BrandName = item?.Brand || ''
    const ItemName = item?.Name || ''
    const itemCase = item?.Case || 0
    const itemUnit = item?.Unit || 0
  
    return `${BrandName} - ${ItemName} - Cs: ${itemCase} - Ut: ${itemUnit}`
  }

const applyDiscount = (props) => {
  const now = new Date();
  const start = new Date(props.OfferStartDate);
  const end = new Date(props.OfferEndDate);
  if (now >= start && now <= end) {
    const discountMultiplier = (100 - Number(props.Discount)) / 100;
    const discountedPrice = Number(props.CustomerPrice) * discountMultiplier;
    return Number(Number(props.CustomerPrice) - discountedPrice).toFixed(2);
  }
  return 0;
};

const calculateTotalCost = (order) => {
  let cost = order.items.reduce((total, item) => {
    const primaryQuantity = Number(item?.primaryQuantity || 0);
    const customerPrice = Number(item?.CustomerPrice || 0);
    const secondaryQuantity = Number(item?.secondaryQuantity || 0);
    const customerUnitPrice = Number(item?.CustomerUnitPrice || 0);

    const totalCustomerPrice = primaryQuantity * customerPrice;
    const totalUnitPrice = secondaryQuantity * customerUnitPrice;

    const discountCustomerPrice =
      applyDiscount({ ...item, CustomerPrice: totalCustomerPrice }) ?? 0;
    const discountUnitPrice =
      applyDiscount({ ...item, CustomerPrice: totalUnitPrice }) ?? 0;

    return (
      total +
      (totalCustomerPrice - discountCustomerPrice) +
      (totalUnitPrice - discountUnitPrice)
    );
  }, 0);

  const discount = order?.discount ? (cost * order.discount) / 100 : 0;
  return cost - discount;
};

const getDeliveryTime = (
  date = moment.unix(),
  inputFormat = undefined,
  outputFormat = "MM/DD/YYYY"
) => {
  if (date?.seconds) {
    return moment(date.seconds * 1000).format("LL");
  }
  if (moment(date).year() > 2010) {
    return moment(date, inputFormat).format(outputFormat);
  }
  return moment(date * 1000).format(outputFormat);
};

async function generatePdf(order, outputPath) {
  const itemRows = order.items
    .map(
      (item) => `
  ${
    item.primaryQuantity > 0
      ? `
    <div style="display: flex; flex-direction: row; color: #4a4a4a; font-family: Helvetica; padding: 6px 0;">
      <div style="width: 10%; text-align: center;">${
        parseInt(item.primaryQuantity) || 0
      }</div>
      <div style="width: 15%; text-align: center;">Case</div>
      <div style="width: 50%; text-align: left;">${getItemName(item)}</div>
      <div style="width: 15%; text-align: center;">-</div>
      <div style="width: 15%; text-align: center;">${formatMoney(
        item.CustomerPrice
      )}</div>
      <div style="width: 20%; text-align: center; font-weight: bold;">${formatMoney(
        item.primaryQuantity * item.CustomerPrice
      )}</div>
    </div>
  `
      : ""
  }

  ${
    item.secondaryQuantity > 0
      ? `
    <div style="display: flex; flex-direction: row; color: #4a4a4a; font-family: Helvetica; padding: 6px 0;">
      <div style="width: 10%; text-align: center;">${
        parseInt(item.secondaryQuantity) || 0
      }</div>
      <div style="width: 15%; text-align: center;">Unit</div>
      <div style="width: 50%; text-align: left;">${getItemName(item)}</div>
      <div style="width: 15%; text-align: center;">${
        item.SoldByUnit ? item.Unit : "-"
      }</div>
      <div style="width: 15%; text-align: center;">${formatMoney(
        item.CustomerUnitPrice
      )}</div>
      <div style="width: 20%; text-align: center; font-weight: bold;">${formatMoney(
        item.secondaryQuantity * item.CustomerUnitPrice
      )}</div>
    </div>
  `
      : ""
  }
`
    )
    .join("");
  const imagePath = "./images/Logo.png";
  const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

  const htmlContent = `
<div id="umani-app-invoice-form-page-1" style="font-family: Helvetica, Arial, sans-serif; margin-top: 0.75rem; display: flex; justify-content: center; align-items: center; height: auto;">
  <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-radius: 8px; padding: 0.5rem 1rem; width: 100%; max-width: 600px;">
    
  <img src="data:image/png;base64,${imageBase64}" width="90" height="90" style="display: block;" />

    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; font-size: 14px; text-align: center;">
      <p style="font-weight: bold; font-family: Helvetica-Bold; font-size: 28px; letter-spacing: 0.05em; margin: 0;">${
        company.name
      }</p>
      <p style="font-size: 14px; font-family: Helvetica; margin: 2px 0;">${
        company.address
      }, ${company.city}, ${company.state} ${company.zip}, ${
    company.country
  }</p>
      <p style="font-size: 14px; font-family: Helvetica; margin: 2px 0;">Tel: ${
        company.phone
      }  Email: ${company.email}</p>
      <p style="font-size: 14px; font-family: Helvetica; margin: 2px 0;">Website: ${
        company.website
      }</p>
    </div>

    <p style="font-size: 20px; font-weight: bold; font-family: Helvetica-Bold; text-align: center; margin: 0;">INVOICE</p>
  </div>
</div>

<!-- Bill To & Invoice Section -->
<div style="color: #4a4a4a; font-family: Helvetica; display: flex; margin-top: 1rem; justify-content: space-between; padding: 0.75rem 1rem;">
  <div style="flex: 1; font-size: 14px; display: flex; flex-direction: column; gap: 0.3rem;"> 
    <p style="font-weight: bold; font-family: Helvetica-Bold; color: #1a202c; margin: 0;">Bill To</p>
    <p style="margin: 0;">${order?.name}</p>
    <p style="margin: 0;">${order?.businessName}</p>
    <p style="margin: 0;">${order?.confirmedDeliveryAddress}</p>
  </div>

  <div style="margin-left: 1.5rem; font-size: 14px; display: flex; flex-direction: row; gap: 1rem; align-items: center;"> 
    <div style="text-align: right; display: flex; flex-direction: column; gap: 0.4rem;">
      <p style="font-weight: bold; font-family: Helvetica-Bold; color: #1a202c; margin: 0;">Invoice #</p>
      <p style="margin: 0;">Invoice Date:</p>
      <p style="margin: 0;">Due Date:</p>
    </div>
    <div style="text-align: right; display: flex; flex-direction: column; gap: 0.4rem;">
      <p style="font-weight: bold; font-family: Helvetica-Bold; color: #1a202c; margin: 0;">${
        order?.orderId ?? "-"
      }</p>
      <p style="margin: 0;">${
        order?.deliveryDateTimestamp
          ? getDeliveryTime(order.deliveryDateTimestamp)
          : "NA"
      }</p>
      <p style="margin: 0;">${
        order?.dueDateTimestamp ? getDeliveryTime(order.dueDateTimestamp) : "NA"
      }</p>
    </div>
  </div>
</div>

<!-- Items Table -->
<div style="padding-top: 1.5rem; overflow-x: auto; padding-left: 0.5rem;">
  <!-- Table Header -->
  <div style="display: flex; flex-direction: row; font-weight: bold; font-family: Helvetica; color: #1a202c; margin-bottom: 0.5rem;  padding-bottom: 8px;">
    <div style="width: 10%; text-align: center;">QTY</div>
    <div style="width: 15%; text-align: center;">UOM</div>
    <div style="width: 50%; text-align: left;">ITEM DESCRIPTION</div>
    <div style="width: 15%; text-align: center;">WEIGHT</div>
    <div style="width: 15%; text-align: center;">PRICE RATE</div>
    <div style="width: 20%; text-align: center;">TOTAL</div>
  </div>

  ${itemRows}
</div>

<!-- Balance Due -->
<div style="height: 2px; width: 100%; background-color: #e2e8f0; margin-top: 30px; margin-bottom: 4px;"></div>
<div style="display: flex; justify-content: flex-end; margin-right: 1.25rem;">
  <div style="display: flex; flex-direction: row; justify-content: space-between; font-size: 16px; font-family: Helvetica; color: #2d3748; margin-top: 0.5rem;">
    <div style="text-align: left; padding-right: 2.5rem;">
      <p style="font-weight: bold; font-family: Helvetica-Bold; color: #000;">BALANCE DUE</p>
    </div>
    <div style="text-align: left;">
      <p style="font-weight: bold; font-family: Helvetica-Bold; color: #000;">${formatMoney(
        calculateTotalCost(order)
      )}</p>
    </div>
  </div>
</div>
<!-- Balance Due -->


<div id="terms-section" style="
position: absolute;
bottom: 0;
left: 0;
width: 100%;
background: white;
font-size: 14px;
font-family: Arial, sans-serif;
break-inside: avoid;
">
<div style="max-width: 800px; margin: 0 auto;">
  <div style="margin-bottom: 20px;">
    By signing this document, I/We acknowledge the receipt of invoiced products.
    I/We agree to pay a finance charge of 1.5% per month on all past due accounts.
    Umami will charge a $30 processing fee on all returned checks for ACH Customers.
    Claims must be made upon the time of delivery. Please weigh and inspect all
    items with the driver upon delivery.
  </div>
  <!-- Signature Section -->
  <div style="display: flex; flex-direction: row; color: #4A4A4A; gap: 4rem;">
    <div style="flex: 1;">
      <p>Sign:</p>
      <div style="width: 100%; height: 0.5px; background-color: #E2E8F0;"></div>
    </div>
    <div style="flex: 1;">
      <p>Date:</p>
      <div style="width: 100%; height: 0.5px; background-color: #E2E8F0;"></div>
    </div>
  </div>
</div>
</div>
</div>
`;

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
  const options = {
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      right: "20mm",
      bottom: "20mm",
      left: "20mm",
    },
  };

  await page.pdf(options);

  await browser.close();
}

module.exports = {
  formatMoney,
  getItemQuantity,
  getItemRate,
  getItemName,
  getItemFinalAmount,
  getDeliveryTime,
  getUnitItemName,
  getCaseItemName,
  generatePdf,
};
