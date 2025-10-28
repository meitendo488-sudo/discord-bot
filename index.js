// index.js — full file (copy & paste, overwrite your current file)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;           // set this in Render environment
const OWNER_ID = process.env.OWNER_ID || "1042488971017588797"; // set your user ID in Render env for website avatar

if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN in environment. Set BOT_TOKEN in Render/ENV.");
  process.exit(1);
}

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// ---------- XP storage ----------
const XP_FILE = path.join(__dirname, "xpData.json");
let xpData = {};
try {
  if (fs.existsSync(XP_FILE)) xpData = JSON.parse(fs.readFileSync(XP_FILE, "utf8"));
} catch (e) {
  console.error("Failed reading xpData.json:", e);
  xpData = {};
}
function saveXP() {
  try {
    fs.writeFileSync(XP_FILE, JSON.stringify(xpData, null, 2));
  } catch (e) {
    console.error("Failed writing xpData.json:", e);
  }
}
// Periodic save
setInterval(saveXP, 10000);

// ---------- Discord client ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("clientReady" in client ? "clientReady" : "ready", () => {
  // compatibility note: older discord.js used 'ready'. Newer emit 'clientReady' as a convenience.
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Helper: ensure xp entry
function ensureXpEntry(id, username) {
  if (!xpData[id]) xpData[id] = { xp: 0, level: 1, username: username || "Unknown" };
  else if (username) xpData[id].username = username; // update name if changed
}

// Simple XP awarding for each message (you can tweak)
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  const id = message.author.id;
  ensureXpEntry(id, message.author.username);
  const gain = Math.floor(Math.random() * 15) + 5;
  xpData[id].xp += gain;

  // level up check (simple)
  const needed = xpData[id].level * 100;
  if (xpData[id].xp >= needed) {
    xpData[id].level++;
    message.reply(`🎉 ${message.author.username} leveled up to level ${xpData[id].level}!`);
  }
});

// ---------- Command handling (prefix '!') ----------
const prefix = "!";
const cooldowns = new Map(); // Map<command, Map<userId, expiresAt>>

function checkCooldown(cmd, userId, seconds) {
  if (!cooldowns.has(cmd)) cooldowns.set(cmd, new Map());
  const map = cooldowns.get(cmd);
  const now = Date.now();
  if (map.has(userId) && map.get(userId) > now) {
    const timeLeft = ((map.get(userId) - now) / 1000).toFixed(1);
    return { ok: false, timeLeft };
  }
  map.set(userId, now + seconds * 1000);
  setTimeout(() => map.delete(userId), seconds * 1000);
  return { ok: true };
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();
  const uid = message.author.id;

  // simple per-command cooldowns (customize seconds)
  const cooldownTimes = {
    cmds: 3,
    commands: 3,
    ping: 5,
    bleach: 10,
    lb: 10,
    leaderboard: 10,
    stats: 5,
  };

  const cd = cooldownTimes[cmd] ?? 3;
  const cdCheck = checkCooldown(cmd, uid, cd);
  if (!cdCheck.ok) {
    return message.reply(`⏳ Command on cooldown. Try again in ${cdCheck.timeLeft}s.`);
  }

  // Commands
  if (cmd === "ping") {
    return message.reply("🏓 Pong!");
  }

  if (cmd === "cmds" || cmd === "commands") {
    const list = [
      "!ping — bot latency",
      "!cmds / !commands — show this list",
      "!bleach — random Bleach quote",
      "!leaderboard / !lb — top 10 XP",
      "!stats — your XP & level",
    ];
    return message.reply(`📜 Commands:\n\n${list.join("\n")}`);
  }

  if (cmd === "bleach") {
    // sample characters/quotes (expand as you like)
    const characters = [
      "Ichigo Kurosaki",
      "Rukia Kuchiki",
      "Toshiro Hitsugaya",
      "Byakuya Kuchiki",
      "Renji Abarai",
      "Kisuke Urahara",
      "Kenpachi Zaraki",
      "Sosuke Aizen",
      "Byakuya Kuchiki",
      "Orihime Inoue",
    ];
    const quotes = [
      "If you fight for your friends, no one can take them away.",
      "We are all like fireworks: we climb, shine and always go our separate ways and become further apart.",
      "I'm not fighting because I want to win. I'm fighting because I have to protect you.",
    ];
    const pick = Math.random() < 0.6 ? characters[Math.floor(Math.random() * characters.length)] : quotes[Math.floor(Math.random() * quotes.length)];
    return message.reply(`🌀 ${pick}`);
  }

  if (cmd === "leaderboard" || cmd === "lb") {
    const sorted = Object.entries(xpData)
      .sort(([, a], [, b]) => b.xp - a.xp)
      .slice(0, 10);

    if (sorted.length === 0) return message.reply("📉 No XP data yet. Talk in the server to earn XP!");

    const text = sorted
      .map(([id, data], i) => `**${i + 1}.** ${data.username || "Unknown"} — ${data.xp} XP (Lv ${data.level})`)
      .join("\n");
    return message.reply(`🏆 Top players:\n\n${text}`);
  }

  if (cmd === "stats") {
    const data = xpData[uid];
    if (!data) return message.reply("You have no XP yet — start chatting!");
    return message.reply(`📊 Your stats: XP ${data.xp} — Level ${data.level}`);
  }
});


// ---------- Website route ----------
app.get("/", async (req, res) => {
  try {
    const botUser = client.user;
    // fetch owner user via discord.js (works once bot is logged in)
    let ownerUser = null;
    try {
      ownerUser = await client.users.fetch(OWNER_ID);
    } catch (e) {
      console.warn("Failed to fetch owner user:", e?.message || e);
    }

    const top = Object.entries(xpData)
      .sort(([, a], [, b]) => b.xp - a.xp)
      .slice(0, 10)
      .map(([id, d], i) => ({ rank: i + 1, name: d.username || "Unknown", xp: d.xp, level: d.level }));

    res.render("index", {
      botAvatar: botUser ? botUser.displayAvatarURL({ extension: "png", size: 256 }) : "",
      botName: botUser ? botUser.tag : "Bot",
      userAvatar: ownerUser ? ownerUser.displayAvatarURL({ extension: "png", size: 256 }) : "",
      username: ownerUser ? `${ownerUser.username}#${ownerUser.discriminator}` : "Owner",
      leaderboard: top,
    });
  } catch (err) {
    console.error("Website error:", err);
    res.status(500).send("Server error");
  }
});

// start express
app.listen(PORT, () => console.log(`🌐 Website running on port ${PORT}`));

// login bot
client.login(BOT_TOKEN).catch((err) => {
  console.error("Failed to login bot:", err);
  process.exit(1);
});
