const { NetworthError, PricesError } = require('./helper/errors');
const { parseItems } = require('./helper/parseItems');
const { calculateNetworth, calculateItemNetworth } = require('./helper/calculateNetworth');
const axios = require('axios');

/**
 * Returns the networth of a profile
 * @param {object} profileData - The profile player data from the Hypixel API (profile.members[uuid])
 * @param {number} bankBalance - The player's bank balance from the Hypixel API (profile.banking?.balance)
 * @param {{ onlyNetworth: boolean, prices: object }} options - (Optional) onlyNetworth: If true, only the networth will be returned, prices: A prices object generated from the getPrices function. If not provided, the prices will be retrieved every time the function is called
 * @returns {object} - An object containing the player's networth calculation
 */

const getNetworth = async (profileData, bankBalance, options) => {
  const purse = profileData.coin_purse;
  const prices = await parsePrices(options?.prices);
  const items = await parseItems(profileData);
  return await calculateNetworth(items, purse, bankBalance, prices, options?.onlyNetworth);
};

/**
 * Returns the networth of an item
 * @param {object} item - The item the networth should be calculated for
 * @param {{ prices: object }} options - prices: A prices object generated from the getPrices function. If not provided, the prices will be retrieved every time the function is called
 * @returns {object} - An object containing the item's networth calculation
 */
const getItemNetworth = async (item, options) => {
  if (!item?.tag && !item?.exp) throw new NetworthError('Invalid item provided');
  const prices = await parsePrices(options?.prices);
  return await calculateItemNetworth(item, prices);
};

async function parsePrices(prices) {
  if (prices) {
    const firstKey = Object.keys(prices)[0];
    if (!prices instanceof Object || prices[firstKey] instanceof Object) throw new NetworthError('Invalid prices data provided');
    if (firstKey !== firstKey.toLowerCase()) for (id of Object.keys(prices)) prices[id.toLowerCase()] = prices[id];
  }

  return prices || (await getPrices());
}

/**
 * Returns the prices used in the networth calculation, optimally this can be cached and used when calling `getNetworth`
 * @returns {object} - An object containing the prices for the items in the game from the SkyHelper Prices list
 */
const getPrices = async () => {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/SkyHelperBot/Prices/main/prices.json');

    // Remove this later when prices.json file is updated
    const firstKey = Object.keys(response.data)[0];
    if (response.data[firstKey] instanceof Object) {
      const prices = {};
      for (const [item, priceObject] of Object.entries(response.data)) {
        prices[item.toLowerCase()] = priceObject.price;
      }
      return prices;
    }

    if (firstKey !== firstKey.toLowerCase()) {
      const prices = {};
      for (const [item, price] of Object.entries(response.data)) {
        prices[item.toLowerCase()] = price;
      }
      return prices;
    }
    // -----------------------------

    return response.data;
  } catch (err) {
    throw new PricesError(`Failed to retrieve prices with status code ${err?.response?.status || 'Unknown'}`);
  }
};

module.exports = {
  getNetworth,
  getItemNetworth,
  getPrices,
};
