// IchiBot#3137 — Lost Spirit Stats
// by 1.yume (1042488971017588797)

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const express = require("express");
const path = require("path");
const ejs = require("ejs");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// === LOAD & SAVE XP DATA ===
const dataPath = "./data.json";
let xpData = {};

function loadData() {
  try {
    xpData = JSON.parse(fs.readFileSync(dataPath));
  } catch {
    xpData = {};
  }
}

function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(xpData, null, 2));
}

loadData();

// === XP + GAMBLE SETTINGS ===
function addXP(userId, amount) {
  if (!xpData[userId]) xpData[userId] = { xp: 0, username: "Unknown" };
  xpData[userId].xp += amount;
  if (xpData[userId].xp < 0) xpData[userId].xp = 0;
  saveData();
}

function getLeaderboard() {
  return Object.entries(xpData)
    .sort((a, b) => b[1].xp - a[1].xp)
    .slice(0, 10);
}

// === DISCORD BOT ===
client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase();

  // Track XP
  addXP(message.author.id, 1);
  xpData[message.author.id].username = message.author.username;
  saveData();

  // === !ping ===
  if (content === "!ping") {
    const reply = await message.reply("💫 IchiBot is awake and watching...");
    setTimeout(() => reply.delete().catch(() => {}), 60000);
  }

  // === !gamble ===
  if (content.startsWith("!gamble")) {
    const outcome = Math.random();
    const userId = message.author.id;

    if (outcome < 0.25) {
      addXP(userId, -20);
      const role = message.guild.roles.cache.find((r) => r.name.toLowerCase() === "muted");
      if (role) {
        const member = await message.guild.members.fetch(userId);
        await member.roles.add(role);
        setTimeout(() => member.roles.remove(role).catch(() => {}), 60000);
      }
      const reply = await message.reply("💀 You lost... and have been muted for 1 minute!");
      setTimeout(() => reply.delete().catch(() => {}), 60000);
    } else if (outcome < 0.5) {
      addXP(userId, 20);
      const reply = await message.reply("🍀 You got lucky! +20 XP!");
      setTimeout(() => reply.delete().catch(() => {}), 60000);
    } else {
      const reply = await message.reply("😐 Nothing happened...");
      setTimeout(() => reply.delete().catch(() => {}), 60000);
    }
  }

  // === !leaderboard / !lb ===
  if (content === "!leaderboard" || content === "!lb") {
    const top = getLeaderboard();
    const embed = new EmbedBuilder()
      .setTitle("🏮 Lost Spirit Stats")
      .setColor("#ffcc00")
      .setDescription(
        top
          .map((entry, i) => `**${i + 1}.** ${entry[1].username} — ${entry[1].xp} XP`)
          .join("\n")
      )
      .setFooter({ text: "IchiBot — fades in 60 seconds" });

    const msg = await message.reply({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 60000);
  }

  // === !clear ===
  if (content.startsWith("!clear")) {
    const mention = message.mentions.users.first();
    if (!mention) return message.reply("Please mention a user to clear.");
    if (!xpData[mention.id]) return message.reply("That user has no data.");
    delete xpData[mention.id];
    saveData();
    const reply = await message.reply(`🧹 Cleared data for ${mention.username}.`);
    setTimeout(() => reply.delete().catch(() => {}), 60000);
  }

  // === !bleach ===
  if (content === "!bleach") {
    const characters = [
      "Ichigo Kurosaki",
      "Rukia Kuchiki",
      "Toshiro Hitsugaya",
      "Byakuya Kuchiki",
      "Renji Abarai",
      "Kisuke Urahara",
      "Kenpachi Zaraki",
      "Sosuke Aizen",
      "Yoruichi Shihoin",
      "Orihime Inoue"
    ];
    const randomChar = characters[Math.floor(Math.random() * characters.length)];
    const reply = await message.reply(`⚔️ ${randomChar} appears!`);
    setTimeout(() => reply.delete().catch(() => {}), 60000);
  }
});

// === WEBSITE (Leaderboard) ===
app.get("/", (req, res) => {
  const leaderboard = getLeaderboard();
  const backgrounds = [
    "/images/bg1.png",
    "/images/bg2.png",
    "/images/bg3.png"
  ];
  res.render("index", { leaderboard, backgrounds });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Website running on port ${PORT}`));

client.login(process.env.TOKEN);
