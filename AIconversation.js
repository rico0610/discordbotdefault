require("dotenv").config();

// const {
//   pineconeKey,
//   pineconeEnv,
//   pineconeURL,
//   openAIkey,
// } = require("./config.json");
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.openAIkey,
});
const openai = new OpenAIApi(configuration);
const embedModel = "text-embedding-ada-002";
const Pinecone = require("@pinecone-database/pinecone");
const indexName = "collina-embeddings";
const pinecone = new Pinecone.PineconeClient();
const xlsx = require("xlsx");

const {
  Events,
  Client,
  Collection,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
  AttachmentBuilder,
  Partials,
  MessageReaction,
  Sticker,
} = require(`discord.js`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    2048,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Initialize the Pinecone client
async function initPinecone() {
  await pinecone.init({
    environment: process.env.pineconeEnv,
    apiKey: process.env.pineconeKey,
  });
  console.log("Pinecone initialized.");
}

async function createIndex(vectorChannel) {
  try {
    const indexesList = await pinecone.listIndexes();
    console.log(indexesList.data);

    if (indexesList.data.includes(indexName)) {
      await pinecone.deleteIndex(indexName);
      console.log("Index deleted.");
      vectorChannel.send({
        embeds: [
          new EmbedBuilder()
            .setDescription("🗑️ Index deleted.")
            .setColor("#303434"),
        ],
      });
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds after deleting the index
    }

    const createdIndex = await pinecone.createIndex({
      name: indexName,
      dimension: 1536,
      metadata_config: {
        indexed: ["NOTES"],
      },
    });

    console.log("Index created.");
    vectorChannel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription("✅ Index created.")
          .setColor("#303434"),
      ],
    });

    return createdIndex;
  } catch (err) {
    console.log(err);
  }
}

async function createEmbeddings(batchTexts) {
  let embeddings;
  let done = false;
  while (!done) {
    try {
      const response = await openai.createEmbedding({
        model: embedModel,
        input: batchTexts,
      });
      embeddings = response.data.data.map((item) => item.embedding);
      done = true;
    } catch (err) {
      console.log(`Error from OpenAI: ${err}`);
    }
  }
  return embeddings;
}

async function upsertVectors(filePath, vectorChannel) {
  const batch_size = 100;
  try {
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(worksheet, {
      header: "NOTES",
    });

    const index = pinecone.Index(indexName);

    console.log(
      `Processing ${rows.length} rows in batches of ${batch_size}...`
    );

    vectorChannel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `💾 Processing ${rows.length} rows in batches of ${batch_size}.`
          )
          .setColor("#303434"),
      ],
    });

    for (let i = 0; i < rows.length; i++) {
      const batchRows = rows.slice(i);
      const batchTexts = batchRows.map((row) => Object.values(row)[0]);

      const embeddings = await createEmbeddings(batchTexts);

      const { v4: uuidv4 } = require("uuid");

      let numRetries = 0;
      const maxRetries = 3;
      const delayMs = 5000;
      let upserted = false;

      while (upserted === false) {
        try {
          const toUpsert = batchRows.map((row, j) => {
            return {
              id: uuidv4(),
              values: embeddings[j],
              metadata: {
                NOTES: Object.values(row)[0],
              },
            };
          });

          const upsertResponse = await index.upsert(
            {
              vectors: toUpsert,
            },
            {
              timeout: 120000, // set timeout to 120 seconds
            }
          );

          console.log(`Upserted vectors: ${upsertResponse.data.upsertedCount}`);
          vectorChannel
            .send({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    `**✅ Upserted ${upsertResponse.data.upsertedCount} rows successully.**`
                  )
                  .setColor("#303434"),
              ],
            })
            .then(() => {
              upserted = true;
              console.log(upserted);
            });

          // Exit retry loop on success
          return;
        } catch (err) {
          if (numRetries === maxRetries) {
            console.log(`Failed to upsert after ${maxRetries} retries`);
            vectorChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    `**❌ Failed to upsert after ${maxRetries} retries. Please try again.**`
                  )
                  .setColor("#303434"),
              ],
            });
            return;
          } else {
            numRetries += 1;
            console.log(`Error. Retrying in ${delayMs} ms...`);
            vectorChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    `⚠️ Error. Retrying in ${delayMs / 1000} seconds.`
                  )
                  .setColor("#303434"),
              ],
            });
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
}

async function queryIndex(memory) {
  let numRetries = 0;
  const maxRetries = 3;
  const delayMs = 5000;
  let isError = true;

  while (isError) {
    try {
      const vector = await openai
        .createEmbedding({
          model: embedModel,
          input: memory,
        })
        .then((res) => res.data.data[0].embedding)
        .catch((error) =>
          console.log(
            `Error from openAI creating embeddings for query: ${error}`
          )
        );

      const URL = process.env.pineconeURL;

      const reqBody = {
        vector,
        top_k: 10,
        include_metadata: true,
      };

      const postRequest = {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "api-key": process.env.pineconeKey,
        },
        body: JSON.stringify(reqBody),
      };

      const data = await fetch(URL, postRequest).catch((error) =>
        console.log(`Error from query fetching: ${error}`)
      );
      const resources = await data.json();
      const metadataArray = resources.matches.map((match) => match.metadata);

      let itemList = "";

      metadataArray.forEach((metadata, index) => {
        itemList += `${index + 1}. ${metadata.NOTES}\n`;
      });
      isError = false;

      // console.log(itemList);

      return itemList;
    } catch (err) {
      if (numRetries === maxRetries) {
        console.log(`An error occurred: ${err}`);
        return;
      } else {
        numRetries += 1;
        console.log(`Error. Retrying in ${delayMs} ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

module.exports = {
  initPinecone,
  createIndex,
  upsertVectors,
  queryIndex,
};
