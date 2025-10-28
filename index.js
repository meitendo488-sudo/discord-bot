require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ======== DISCORD BOT SETUP ========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let botInfo = {
  name: 'Loading...',
  avatar: '/images/image1.png',
  discriminator: '0000',
};

// Cooldown map (stores user → command → timestamp)
const cooldowns = new Map();

// Set your default cooldown time (in milliseconds)
const DEFAULT_COOLDOWN = 5000; // 5 seconds

// ======== HELPER: Check cooldown ========
function isOnCooldown(userId, command) {
  const now = Date.now();

  if (!cooldowns.has(userId)) {
    cooldowns.set(userId, {});
  }

  const userCooldowns = cooldowns.get(userId);
  const lastUsed = userCooldowns[command] || 0;
  const remaining = lastUsed + DEFAULT_COOLDOWN - now;

  if (remaining > 0) {
    return remaining;
  }

  userCooldowns[command] = now;
  cooldowns.set(userId, userCooldowns);
  return 0;
}

// ======== BOT EVENTS ========
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  updateBotInfo();
  setInterval(updateBotInfo, 5 * 60 * 1000);
});

function updateBotInfo() {
  if (!client.user) return;
  botInfo = {
    name: client.user.username,
    avatar: client.user.displayAvatarURL(),
    discriminator: client.user.discriminator,
  };
}

// ======== BOT COMMANDS ========
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase();

  // Function to handle cooldown checks
  const checkCooldown = (commandName) => {
    const remaining = isOnCooldown(message.author.id, commandName);
    if (remaining > 0) {
      const secondsLeft = (remaining / 1000).toFixed(1);
      message.reply(`⏳ That command is on cooldown! Please wait **${secondsLeft}s** before using it again.`);
      return true;
    }
    return false;
  };

  if (content === '!ping') {
    if (checkCooldown('ping')) return;
    return message.reply(`🏓 Pong! Latency: ${Date.now() - message.createdTimestamp}ms`);
  }

  if (content === '!cmds' || content === '!commands') {
    if (checkCooldown('cmds')) return;
    return message.reply(
      `🪄 **Available Commands:**\n` +
      `\`!ping\` — Check bot latency\n` +
      `\`!cmds\` or \`!commands\` — Show all commands\n` +
      `\`!userinfo\` — Display your username & ID\n` +
      `\`!serverinfo\` — Show server name & member count\n`
    );
  }

  if (content === '!userinfo') {
    if (checkCooldown('userinfo')) return;
    return message.reply(`👤 **Your Info:**\nUsername: ${message.author.tag}\nID: ${message.author.id}`);
  }

  if (content === '!serverinfo') {
    if (checkCooldown('serverinfo')) return;
    return message.reply(`🏠 **Server Info:**\nName: ${message.guild.name}\nMembers: ${message.guild.memberCount}`);
  }
});

// ======== LOGIN TO DISCORD ========
client.login(process.env.DISCORD_TOKEN);

// ======== EXPRESS WEBSITE ========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
  try {
    res.render('index', {
      botAvatar: botInfo.avatar,
      botName: botInfo.name,
      botDiscriminator: botInfo.discriminator,
    });
  } catch (err) {
    console.error('Error loading page:', err);
    res.status(500).send('Error loading page');
  }
});

app.listen(PORT, () => console.log(`🌍 Web server running on port ${PORT}`));
