require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ======== DISCORD BOT SETUP ========
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// When bot starts
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Basic command listener
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content === '!cmds' || content === '!commands') {
    message.reply(
      `🪄 **Available Commands:**\n` +
      `\`!cmds\` or \`!commands\` — Show this help message\n` +
      `\`!ping\` — Check bot latency\n`
    );
  }

  if (content === '!ping') {
    message.reply(`🏓 Pong! Latency: ${Date.now() - message.createdTimestamp}ms`);
  }
});

// Login bot using token
client.login(process.env.DISCORD_TOKEN);

// ======== EXPRESS WEBSITE SETUP ========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Home route
app.get('/', async (req, res) => {
  try {
    const bot = client.user;
    res.render('index', {
      botAvatar: bot ? bot.displayAvatarURL() : '/images/image1.png',
      botName: bot ? bot.username : 'Unknown Bot',
      botDiscriminator: bot ? bot.discriminator : '0000',
    });
  } catch (err) {
    console.error('Error loading page:', err);
    res.status(500).send('Error loading page');
  }
});

// Start server
app.listen(PORT, () => console.log(`🌍 Server running on port ${PORT}`));
