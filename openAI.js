// const { openAIkey } = require("./config.json");
// const { Configuration, OpenAIApi } = require("openai");

// const configuration = new Configuration({
//   //apiKey: process.env.openAI,
//   apiKey: openAIkey,
// });
// const openai = new OpenAIApi(configuration);

// async function ask(prompt) {
//   let numRetries = 0;
//   let isError = true;
//   const maxRetries = 3;
//   const delayMs = 2000;

//   while (isError) {
//     try {
//       const response = await openai.createCompletion({
//         model: "gpt-3.5-turbo-0301",
//         prompt,
//         temperature: 0.1,
//         max_tokens: 256,
//         top_p: 1,
//         frequency_penalty: 0,
//         presence_penalty: 0,
//       });
//       const answer = response.data.choices[0].text;
//       isError = false;
//       return answer;
//     } catch (err) {
//       if (numRetries === maxRetries) {
//         console.log(
//           `Encountered an error from OpenAI. Made ${maxRetries} retries.`
//         );
//         const errorMessage = {
//           message1: `Sorry, I'm having trouble right now and need fixing. Please try again later.`,
//           message2: `**__Error encountered__**\n\n${err}`,
//         };

//         return errorMessage;
//       } else {
//         numRetries += 1;
//         console.log(`OpenAI Error\n${err}`);
//         console.log(`Error. Retrying in ${delayMs} ms.`);
//         await new Promise((resolve) => setTimeout(resolve, delayMs));
//       }
//     }
//   }
// }

// module.exports = {
//   ask,
// };

const fetch = require("node-fetch");
// const { openAIkey } = require("./config.json");

async function ask(prompt) {
  let numRetries = 0;
  let isError = true;
  const maxRetries = 3;
  const delayMs = 2000;

  while (isError) {
    try {
      const requestOptions = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.openAIkey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "assistant", content: prompt }],
        }),
      };

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        requestOptions
      );

      const result = await response.json();

      const answer = result.choices[0].message.content;

      // console.log(answer);

      isError = false;

      return answer;
    } catch (err) {
      if (numRetries === maxRetries) {
        console.log(
          `Encountered an error from OpenAI. Made ${maxRetries} retries.`
        );
        const errorMessage = {
          message1: `Sorry, I'm having trouble right now and need fixing. Please try again later.`,
          message2: `**__Error encountered__**\n\n${err}`,
        };

        return errorMessage;
      } else {
        numRetries += 1;
        console.log(`OpenAI Error\n${err}`);
        console.log(`Error. Retrying in ${delayMs} ms.`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

module.exports = {
  ask,
};
