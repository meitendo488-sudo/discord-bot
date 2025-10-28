require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// --- Discord Bot Setup ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let startTime = Date.now();

// --- Express Status Page ---
app.get('/', async (req, res) => {
  if (!client.user) {
    return res.send("Bot is starting up...");
  }

  // Fetch your own Discord user info (already set to your ID!)
  const ownerId = "1042488971017588797";
  const owner = await client.users.fetch(ownerId);

  // Calculate uptime
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  // HTML Page
  res.send(`
    <html>
      <head>
        <title>${client.user.username} Status</title>
        <style>
          body {
            background: #0d1117;
            color: #c9d1d9;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
          }
          .card {
            background-color: #161b22;
            padding: 40px 60px;
            border-radius: 20px;
            box-shadow: 0 0 30px rgba(0,0,0,0.4);
            text-align: center;
            transition: transform 0.2s ease-in-out;
          }
          .card:hover {
            transform: scale(1.03);
          }
          img {
            border-radius: 50%;
            width: 100px;
            height: 100px;
          }
          h1 {
            color: #58a6ff;
            margin: 10px 0;
          }
          p {
            font-size: 18px;
            margin: 5px 0;
          }
          .owner, .bot {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 15px;
          }
          .status {
            color: #3fb950;
            font-weight: bold;
          }
          footer {
            margin-top: 15px;
            font-size: 14px;
            color: #8b949e;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="bot">
            <img src="${client.user.displayAvatarURL()}" alt="Bot Avatar">
            <h1>${client.user.username}</h1>
            <p class="status">🟢 Online</p>
            <p>🌍 In ${client.guilds.cache.size} servers</p>
            <p>⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s</p>
          </div>
          <hr style="border: 1px solid #30363d; margin: 20px 0;">
          <div class="owner">
            <img src="${owner.displayAvatarURL()}" alt="Owner Avatar">
            <h2>${owner.username}</h2>
            <p>👑 Bot Owner</p>
          </div>
          <footer>Powered by Discord.js + Render</footer>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`🌐 Status page running on port ${PORT}`));

// --- Bot Logic ---
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  if (msg === '!ping') message.reply('🏓 Pong!');
  if (msg === '!gamble') message.reply('🎲 You gamble and... maybe you win, maybe you lose 👀');
  if (msg === '!bleach') message.reply('🗡️ Random Bleach character coming soon!');
  if (msg === '!commands' || msg === '!cmnds') {
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
