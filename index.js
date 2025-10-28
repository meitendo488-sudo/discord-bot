const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// XP data file
const XP_FILE = path.join(__dirname, "xpData.json");
let xpData = {};
if (fs.existsSync(XP_FILE)) {
  xpData = JSON.parse(fs.readFileSync(XP_FILE));
}

// Save XP data periodically
setInterval(() => {
  fs.writeFileSync(XP_FILE, JSON.stringify(xpData, null, 2));
}, 10000);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const cooldowns = new Map();

// When bot is ready
client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);
});

// Give XP for chatting
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  const userId = message.author.id;
  if (!xpData[userId]) xpData[userId] = { xp: 0, level: 1, username: message.author.username };
  xpData[userId].xp += Math.floor(Math.random() * 15) + 5;

  // Level up check
  const neededXP = xpData[userId].level * 100;
  if (xpData[userId].xp >= neededXP) {
    xpData[userId].level++;
    message.reply(`🎉 Congrats ${message.author.username}, you leveled up to **Level ${xpData[userId].level}!**`);
  }
});

// Command handling
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const prefix = "!";
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;
  const now = Date.now();
  const cooldownAmount = 5000;

  if (!cooldowns.has(command)) cooldowns.set(command, new Map());
  const timestamps = cooldowns.get(command);

  if (timestamps.has(userId)) {
    const expiration = timestamps.get(userId) + cooldownAmount;
    if (now < expiration) {
      const timeLeft = ((expiration - now) / 1000).toFixed(1);
      return message.reply(`⏳ That command is on cooldown! Try again in **${timeLeft}s**.`);
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  // -------------------
  // COMMANDS
  // -------------------
  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  if (command === "cmds" || command === "commands") {
    const cmds = [
      "!ping — Check bot latency",
      "!bleach — Random Bleach quote",
      "!leaderboard — Show top XP users",
      "!stats — View your current XP & level",
      "!help — Show all commands",
    ];
    return message.reply(`📜 **Available Commands:**\n\n${cmds.join("\n")}`);
  }

  if (command === "bleach") {
    const quotes = [
      "“If I don’t wield the sword, I can’t protect you. If I keep wielding the sword, I can’t embrace you.” – Ichigo Kurosaki",
      "“We are all like fireworks: we climb, shine and always go our separate ways and become further apart. But even when that time comes, let’s not disappear like a firework and continue to shine forever.” – Toshiro Hitsugaya",
      "“I'm not fighting because I want to win. I'm fighting because I have to protect you.” – Ichigo Kurosaki",
    ];
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    return message.reply(`🌀 **Bleach Quote:**\n> ${random}`);
  }

  if (command === "leaderboard") {
    const sorted = Object.entries(xpData)
      .sort(([, a], [, b]) => b.xp - a.xp)
      .slice(0, 10);

    if (sorted.length === 0) return message.reply("📉 No data yet! Start chatting to earn XP!");

    const leaderboardText = sorted
      .map(
        ([id, data], i) =>
          `**${i + 1}.** ${data.username || "Unknown"} — 🧠 ${data.xp} XP (Lv. ${data.level})`
      )
      .join("\n");

    return message.reply(`🏆 **Top Players Leaderboard** 🏆\n\n${leaderboardText}`);
  }

  if (command === "stats") {
    const data = xpData[userId];
    if (!data) return message.reply("❌ You have no XP yet! Start chatting to earn some!");
    return message.reply(`📊 **Your Stats:**\nXP: ${data.xp}\nLevel: ${data.level}`);
  }

  if (command === "help") {
    return message.reply("Use `!cmds` to see all commands.");
  }
});

// -------------------
// WEBSITE
// -------------------
app.get("/", async (req, res) => {
  try {
    const botUser = client.user;
    const userId = "1042488971017588797"; // your Discord ID

    const userData = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    }).then((r) => r.json());

    // Sort top 10 users by XP
    const topPlayers = Object.entries(xpData)
      .sort(([, a], [, b]) => b.xp - a.xp)
      .slice(0, 10)
      .map(([id, data], i) => ({
        rank: i + 1,
        name: data.username || "Unknown",
        xp: data.xp,
        level: data.level,
      }));

    res.render("index", {
      botAvatar: botUser.displayAvatarURL({ format: "png", size: 256 }),
      botName: botUser.tag,
      userAvatar: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=256`,
      username: `${userData.username}#${userData.discriminator}`,
      leaderboard: topPlayers,
    });
  } catch (err) {
    console.error("Error loading page:", err);
    res.render("index", { botAvatar: "", botName: "", userAvatar: "", username: "", leaderboard: [] });
  }
});

// Start bot & server
client.login(process.env.BOT_TOKEN);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

