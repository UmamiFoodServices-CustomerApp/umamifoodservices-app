const moment = require("moment");
const { default: puppeteer } = require("puppeteer");
const fs = require('fs');
const company = require('../service/vars');


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

const getItemNamePrefix = (item) => {
  const { primaryQuantity, secondaryQuantity } = item;

  const primaryPrefix = "Case";
  const secondaryPrefix =
    item.Unit && item.Unit.toLowerCase().includes("lb") ? "Lbs" : "Unit";

  if (secondaryQuantity > 0 && primaryQuantity > 0) {
    return `${primaryPrefix} / ${secondaryPrefix}`;
  }

  if (primaryQuantity > 0) {
    return primaryPrefix;
  }
  if (secondaryQuantity > 0) {
    return secondaryPrefix;
  }

  return primaryPrefix;
};

const getItemName = (item) => {
  const prefix = getItemNamePrefix(item);
  return `${prefix} - ${item.Name}`;
};

const getItemFinalAmount = (item) =>
  (item?.primaryQuantity ?? 1) * (item?.CustomerPrice ?? 1) +
  (item?.secondaryQuantity ?? 0) * (item?.CustomerUnitPrice ?? 1);

const getCaseItemName = item => {
  const BrandName = item?.Brand || ''
  const ItemName = item?.Name || ''
  const itemCase = item?.primaryQuantity || 0

  return `${BrandName} - ${ItemName} - Cs:${itemCase}`
}
 const getUnitItemName = item => {
  const BrandName = item?.Brand || ''
  const ItemName = item?.Name || ''
  const itemUnit = item?.secondaryQuantity || 0

  return `${BrandName} - ${ItemName} - Ut:${itemUnit}`
}


const getDeliveryTime = (
  date = moment.unix(),
  inputFormat = undefined,
  outputFormat = 'MM/DD/YYYY'
) => {
  if (date?.seconds) {
    return moment(date.seconds * 1000).format('LL')
  }
  if (moment(date).year() > 2010) {
    return moment(date, inputFormat).format(outputFormat)
  }
  return moment(date * 1000).format(outputFormat)
}

async function generatePdf(order, outputPath) {

  const itemRows = order.items.map((item, index) => {
    return `
      ${item.primaryQuantity > 0 ? `
        <div style="margin-top: 0.75rem;">
          <div style="display: flex; flex-direction: row; justify-content: space-between; color: #4a4a4a; font-family: Helvetica;">
            <!-- QTY -->
            <div style="min-width: 3rem; text-align: center; font-size: 14px; color: #2d3748; font-family: Helvetica;">
              ${parseInt(item.primaryQuantity) || 0}
            </div>
            <!-- UOM -->
            <div style="min-width: 3rem; text-align: left; padding-left: 0.7rem; font-size: 14px; font-family: Helvetica;">
              Case
            </div>
            <!-- ITEM DESCRIPTION -->
            <div style="min-width: 25vh; text-align: left; padding-left: 0.7rem; font-size: 14px; font-family: Helvetica;">
              ${getCaseItemName(item)}
            </div>
            <!-- WEIGHT (Center aligned) -->
            <div style="min-width: 5rem; text-align: center; font-size: 14px; font-family: Helvetica;">
              -
            </div>
            <!-- PRICE RATE (Center aligned) -->
            <div style="min-width: 5rem; text-align: center; font-size: 14px; font-family: Helvetica;">
              ${formatMoney(item.CustomerPrice)}
            </div>
            <!-- TOTAL (Center aligned) -->
            <div style="min-width: 6rem; text-align: center; font-size: 14px; font-family: Helvetica-Bold;">
              ${formatMoney(item.primaryQuantity * item.CustomerPrice)}
            </div>
          </div>
        </div>
      ` : ''}
      
      ${item.secondaryQuantity > 0 ? `
        <div style="margin-top: 0.75rem;">
          <div style="display: flex; flex-direction: row; justify-content: space-between; color: #4a4a4a; font-family: Helvetica;">
            <!-- QTY -->
            <div style="min-width: 3rem; text-align: center; font-size: 14px; color: #2d3748; font-family: Helvetica;">
              ${parseInt(item.secondaryQuantity) || 0}
            </div>
            <!-- UOM -->
            <div style="min-width: 3rem; text-align: left; padding-left: 0.7rem; font-size: 14px; font-family: Helvetica;">
              Unit
            </div>
            <!-- ITEM DESCRIPTION -->
            <div style="min-width: 25vh; text-align: left; padding-left: 0.7rem; font-size: 14px; font-family: Helvetica;">
              ${getUnitItemName(item)}
            </div>
            <!-- WEIGHT (Center aligned) -->
            <div style="min-width: 5rem; text-align: center; font-size: 14px; font-family: Helvetica;">
              ${item.SoldByUnit ? item.Unit : '-'}
            </div>
            <!-- PRICE RATE (Center aligned) -->
            <div style="min-width: 5rem; text-align: center; font-size: 14px; font-family: Helvetica;">
              ${formatMoney(item.CustomerUnitPrice)}
            </div>
            <!-- TOTAL (Center aligned) -->
            <div style="min-width: 6rem; text-align: center; font-size: 14px; font-family: Helvetica-Bold;">
              ${formatMoney(item.secondaryQuantity * item.CustomerUnitPrice)}
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }).join('');
  const imagePath = './images/Logo.png';  
 const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
  
  
const htmlContent = `
<div id="umani-app-invoice-form-page-1" style="font-family: Helvetica, Arial, sans-serif; margin-top: 0.75rem; display: flex; justify-content: center; align-items: center; height: auto;">
  <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-radius: 8px; padding: 0.5rem 1rem; width: 100%; max-width: 600px;">
    
  <img src="data:image/png;base64,${imageBase64}" width="90" height="90" style="display: block;" />

    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; font-size: 14px; text-align: center;">
      <p style="font-weight: bold; font-family: Helvetica-Bold; font-size: 28px; letter-spacing: 0.05em; margin: 0;">${company.name}</p>
      <p style="font-size: 14px; font-family: Helvetica; margin: 2px 0;">${company.address}, ${company.city}, ${company.state} ${company.zip}, ${company.country}</p>
      <p style="font-size: 14px; font-family: Helvetica; margin: 2px 0;">Tel: ${company.phone}  Email: ${company.email}</p>
      <p style="font-size: 14px; font-family: Helvetica; margin: 2px 0;">Website: ${company.website}</p>
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
      <p style="font-weight: bold; font-family: Helvetica-Bold; color: #1a202c; margin: 0;">${order?.orderId ?? '-'}</p>
      <p style="margin: 0;">${order?.deliveryDateTimestamp ? getDeliveryTime(order.deliveryDateTimestamp) : 'NA'}</p>
      <p style="margin: 0;">${order?.dueDateTimestamp ? getDeliveryTime(order.dueDateTimestamp) : 'NA'}</p>
    </div>
  </div>
</div>

<!-- Items Table -->
<div style="padding-top: 2.5rem; overflow-x: auto; padding-left: 0.5rem;">
  <div style="display: flex; flex-direction: row; justify-content: space-between; font-weight: bold; font-family: Helvetica-Bold; color: #1a202c; margin-bottom: 1rem;">
    <div style="min-width: 3rem; width: 10%; text-align: center;">QTY</div>
    <div style="min-width: 3rem; width: 10%; text-align: center;">UOM</div>
    <div style="min-width: 25vh; width: 30%; text-align: left; padding-left: 1.25rem;">ITEM DESCRIPTION</div>
    <div style="min-width: 5rem; width: 13%; text-align: center;">WEIGHT</div>
    <div style="min-width: 5rem; width: 13%; text-align: center;">PRICE RATE</div>
    <div style="min-width: 6rem; width: 20%; text-align: center;">TOTAL</div>
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
      <p style="font-weight: bold; font-family: Helvetica-Bold; color: #000;">$65.00</p>
    </div>
  </div>
</div>

<!-- Terms and Signature -->
<div style="padding-bottom: 2.5rem; margin-top: 6rem; position: absolute; bottom: 0; left: 0; right: 0; padding-left: 2rem; padding-right: 6rem;">
  <div style="font-size: 14px; font-family: Helvetica;">
    By signing this document I/We acknowledge the receipt of invoiced products. I/We agree to pay a finance charge of 1.5% per month on all past due accounts. Umami will charge a $30 processing fee on all returned checks for ACH Customers. Claims must be made upon the time of delivery. Please weigh and inspect all items with the driver upon delivery.
  </div>
  <div style="display: flex; flex-direction: row; margin-top: 2rem; color: #4A4A4A;">
    <div style="width: 32%;">
      <p style="font-family: Helvetica;">Sign:</p>
      <div style="width: 100%; height: 0.5px; background-color: #E2E8F0; margin-top: -8px;"></div>
    </div>
    <div style="margin-left: 4rem; width: 32%;">
      <p style="font-family: Helvetica;">Date:</p>
      <div style="width: 100%; height: 0.5px; background-color: #E2E8F0; margin-top: -8px;"></div>
    </div>
  </div>
</div>

`

const browser = await puppeteer.launch();
const page = await browser.newPage();

await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
const options = {
  path: outputPath, 
  format: 'A4', 
  printBackground: true, 
  margin: {
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm',
  },
};

await page.pdf(options);

await browser.close();
}

module.exports = {
  formatMoney,
  getItemQuantity,
  getItemRate,
  getItemNamePrefix,
  getItemName,
  getItemFinalAmount,
  getDeliveryTime,
  getUnitItemName,
  getCaseItemName,
  generatePdf
};
