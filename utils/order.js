const moment = require("moment");

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

const getDeliveryTime = (date = moment.unix()) => {
  if (date?.seconds) {
    return moment(date.seconds * 1000).format("LL");
  }
  if (moment(date).year() > 2010) {
    return moment(date).format("MM/DD/YYYY");
  }
  return moment(date * 1000).format("MM/DD/YYYY");
};

module.exports = {
  formatMoney,
  getItemQuantity,
  getItemRate,
  getItemNamePrefix,
  getItemName,
  getItemFinalAmount,
  getDeliveryTime,
};
