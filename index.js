require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// --- Express Web Server (for Render status page) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ The Discord bot is online and running!');
});

app.listen(PORT, () => {
  console.log(`🌐 Web status page running on port ${PORT}`);
});

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

  // --- Commands ---
  if (msg === '!ping') {
    message.reply('Pong!');
  }

  if (msg === '!gamble') {
    message.reply('🎲 You gamble and... maybe you win, maybe you lose 👀');
  }

  if (msg === '!bleach') {
    message.reply('🗡️ Random Bleach character coming soon!');
  }

  // --- Commands List ---
  if (msg === '!cmnds' || msg === '!commands') {
    message.reply(
      `🧩 **Available Commands:**\n` +
      `> \`!ping\` — checks if the bot is online\n` +
      `> \`!gamble\` — risk or win EXP (with cooldown)\n` +
      `> \`!bleach\` — shows a random Bleach character\n` +
      `> \`!commands\` or \`!cmnds\` — shows this help message`
    );
  }
});

client.login(process.env.TOKEN);
