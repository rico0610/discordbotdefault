const { google } = require("googleapis");
const customsearch = google.customsearch("v1");

// const { googleAPIkey, searchEngineId } = require("./config.json");

const axios = require("axios");
const cheerio = require("cheerio");
const MAX_SNIPPET_LENGTH = 8000;
const BLACKLISTED_DOMAINS = ["play.google.com", "nytimes.com"];
async function googleSearch(question) {
  const results = [];

  const res = await new Promise((resolve, reject) => {
    customsearch.cse
      .list({
        auth: process.env.googleAPIkey,
        cx: process.env.searchEngineId,
        q: question,
        num: 3,
      })
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });

  const items = res.data.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // check if the domain is blacklisted
    const domain = new URL(item.link).hostname;
    if (BLACKLISTED_DOMAINS.includes(domain)) {
      continue;
    }

    try {
      const response = await axios.get(item.link);
      const href = response.request.res.responseUrl;
      // console.log(href);
      const $ = cheerio.load(response.data);
      let snippets = $("p")
        .text()
        .match(/[^.?!]+[.!?]+/g);
      // check if snippets is null or empty
      if (!snippets || snippets.length === 0) {
        continue;
      }

      let snippetString = "";
      for (let i = 0; i < snippets.length; i++) {
        if (
          snippetString.length + snippets[i].length + 3 <=
          MAX_SNIPPET_LENGTH
        ) {
          snippetString += snippets[i].trim() + ". ";
        } else {
          snippetString =
            snippetString.substring(0, MAX_SNIPPET_LENGTH - 3) + "...";
          break;
        }
      }

      const result = { href: href, snippetString: snippetString };

      results.push(result);
    } catch (err) {
      console.error("Error retrieving information from URL");
    }
  }
  return results; // Return only the first result object
}

module.exports = {
  googleSearch,
};
