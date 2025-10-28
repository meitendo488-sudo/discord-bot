require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// 🖥️ Fancy HTML Status Page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Luck Bot Status</title>
        <style>
          body {
            background-color: #0d1117;
            color: #c9d1d9;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background-color: #161b22;
            padding: 30px 50px;
            border-radius: 15px;
            box-shadow: 0 0 15px rgba(0,0,0,0.4);
            text-align: center;
          }
          h1 {
            color: #58a6ff;
            margin-bottom: 10px;
          }
          p {
            font-size: 18px;
            margin: 5px 0;
          }
          .status {
            color: #3fb950;
            font-weight: bold;
          }
          footer {
            margin-top: 20px;
            font-size: 14px;
            color: #8b949e;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🤖 Luck Bot</h1>
          <p class="status">🟢 Online and running smoothly</p>
          <p>Always watching over your server 👀</p>
          <footer>Powered by Discord.js + Render</footer>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`🌐 Status page running on port ${PORT}`));

// --- Discord Bot Setup ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  if (msg === '!ping') {
    message.reply('🏓 Pong!');
  }

  if (msg === '!gamble') {
    message.reply('🎲 You gamble and... maybe you win, maybe you lose 👀');
  }

  if (msg === '!bleach') {
    message.reply('🗡️ Random Bleach character coming soon!');
  }

  if (msg === '!cmnds' || msg === '!commands') {
    message.reply(
      `🧩 **Available Commands:**\n` +
      `> \`!ping\` — check if the bot is online\n` +
      `> \`!gamble\` — risk or win EXP\n` +
      `> \`!bleach\` — random Bleach character\n` +
      `> \`!commands\` or \`!cmnds\` — shows this help list`
    );
  }
});

client.login(process.env.TOKEN);

