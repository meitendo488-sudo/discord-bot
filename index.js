const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const path = require("path");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create Discord bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Track cooldowns for commands
const cooldowns = new Map();

// When bot starts
client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

// Home route — renders your website
app.get("/", async (req, res) => {
  try {
    const botUser = client.user;
    const userId = "1042488971017588797"; // your Discord ID

    // Fetch your Discord user info
    const userData = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    }).then((r) => r.json());

    res.render("index", {
      botAvatar: botUser.displayAvatarURL({ format: "png", size: 256 }),
      botName: botUser.tag,
      userAvatar: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=256`,
      username: `${userData.username}#${userData.discriminator}`,
    });
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.render("index", {
      botAvatar: "",
      botName: "IchiBot",
      userAvatar: "",
      username: "User",
    });
  }
});

// Command handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const prefix = "!";
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const userId = message.author.id;
  const now = Date.now();
  const cooldownAmount = 5000; // 5 seconds cooldown

  // Cooldown logic
  if (!cooldowns.has(command)) cooldowns.set(command, new Map());
  const timestamps = cooldowns.get(command);

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      return message.reply(`⏳ Command is on cooldown! Try again in **${timeLeft}s**.`);
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  // ---- COMMANDS ----
  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  if (command === "cmds" || command === "commands") {
    const commands = [
      "!ping — Check bot latency",
      "!bleach — Shows a random Bleach character or quote",
      "!leaderboard — Shows the top players",
      "!stats — Displays your spirit stats",
      "!help — Shows all commands",
    ];
    return message.reply(`🧠 **Available Commands:**\n\n${commands.join("\n")}`);
  }

  if (command === "bleach") {
    const quotes = [
      "“If I don’t wield the sword, I can’t protect you. If I keep wielding the sword, I can’t embrace you.” – Ichigo Kurosaki",
      "“We are all like fireworks: we climb, shine and always go our separate ways and become further apart. But even when that time comes, let’s not disappear like a firework and continue to shine forever.” – Toshiro Hitsugaya",
      "“I’m not fighting because I want to win. I’m fighting because I have to protect you.” – Ichigo Kurosaki",
    ];
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    return message.reply(`🌀 **Bleach Quote:**\n> ${random}`);
  }

  if (command === "leaderboard") {
    return message.reply("📊 The leaderboard feature is coming soon!");
  }

  if (command === "help") {
    return message.reply("Use `!cmds` or `!commands` to see all available commands!");
  }
});

// Start bot
client.login(process.env.BOT_TOKEN);

// Start web server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
