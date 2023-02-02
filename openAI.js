//const { openAI } = require("./config.json");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.openAI,
  //apiKey: openAI,
});
const openai = new OpenAIApi(configuration);
async function ask(prompt) {
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt,
    temperature: 0.0,
    max_tokens: 500,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  const answer = response.data.choices[0].text;
  return answer;
}

module.exports = {
  ask,
};
