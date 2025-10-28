// index.js — full file (copy & paste, overwrite your current file)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN; // Set this in Render env
const OWNER_ID = process.env.OWNER_ID || "1042488971017588797"; // your user id for website avatar

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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once("clientReady" in client ? "clientReady" : "ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Helper: ensure xp entry
function ensureXpEntry(id, username) {
  if (!xpData[id]) xpData[id] = { xp: 0, level: 1, username: username || "Unknown" };
  else if (username) xpData[id].username = username;
}

// Simple XP awarding for each message (non-command)
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (!message.guild) return; // only in servers
  if (message.content.startsWith("!")) return; // don't award for commands (optional)

  const id = message.author.id;
  ensureXpEntry(id, message.author.username);
  const gain = Math.floor(Math.random() * 15) + 5;
  xpData[id].xp += gain;

  // level up check (simple)
  const needed = xpData[id].level * 100;
  if (xpData[id].xp >= needed) {
    xpData[id].level++;
    // quietly DM or reply — here we reply to the user in-channel:
    message.reply(`🎉 ${message.author.username} leveled up to level ${xpData[id].level}!`).catch(() => {});
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

  const cooldownTimes = {
    cmds: 3,
    commands: 3,
    ping: 5,
    bleach: 10,
    lb: 10,
    leaderboard: 10,
    stats: 5,
    gamble: 20,
  };

  const cd = cooldownTimes[cmd] ?? 3;
  const cdCheck = checkCooldown(cmd, uid, cd);
  if (!cdCheck.ok) {
    return message.reply(`⏳ Command on cooldown. Try again in ${cdCheck.timeLeft}s.`).catch(() => {});
  }

  // === simple commands ===
  if (cmd === "ping") {
    return message.reply("🏓 Pong!").catch(() => {});
  }

  if (cmd === "cmds" || cmd === "commands") {
    const list = [
      "!ping — bot latency",
      "!cmds / !commands — show this list",
      "!bleach — random Bleach quote",
      "!gamble — risk or win XP (25% lose 5k + 1m mute, 25% +5k XP, 50% nothing)",
      "!leaderboard / !lb — top 10 XP",
      "!stats — your XP & level",
    ];
    return message.reply(`📜 Commands:\n\n${list.join("\n")}`).catch(() => {});
  }

  if (cmd === "bleach") {
    // Return quotes (wrapped in quotes) or small lines — user asked for "quotes"
    const quotes = [
      `"If you fight for your friends, no one can take them away."`,
      `"We are all like fireworks: we climb, shine and always go our separate ways and become further apart."`,
      `"I'm not fighting because I want to win. I'm fighting because I have to protect you."`,
      `"Which is more real? The spider's webs you can't see, or the ties you can?"`,
      `"Sometimes you must hurt in order to know, fall in order to grow, lose in order to gain."`,
    ];
    const pick = quotes[Math.floor(Math.random() * quotes.length)];
    const reply = await message.reply(`🌀 ${pick}`).catch(() => null);
    // clear response after 60s to avoid chat flood
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 60_000);
    return;
  }

  if (cmd === "gamble") {
    // Outcomes:
    // 25% -5k XP and mute for 1 minute (role "muted" must exist)
    // 25% +5k XP
    // 50% nothing
    if (!message.guild) return message.reply("This command must be used in a server.").catch(() => {});
    ensureXpEntry(uid, message.author.username);

    const roll = Math.random();
    if (roll < 0.25) {
      // lose 5k XP, mute 1 minute
      xpData[uid].xp = Math.max(0, xpData[uid].xp - 5000);
      saveXP();

      // find muted role by name
      const mutedRole = message.guild.roles.cache.find((r) => r.name.toLowerCase() === "muted");
      let replied = await message.reply(`You lost 5000 XP and will be muted for 1 minute.`).catch(() => null);
      if (mutedRole && message.member) {
        try {
          await message.member.roles.add(mutedRole);
          setTimeout(() => {
            message.member.roles.remove(mutedRole).catch(() => {});
          }, 60_000);
        } catch (e) {
          // couldn't add role — maybe permissions
          if (replied) {
            replied.edit(`${replied.content}\n⚠️ Could not add 'muted' role (check bot permissions).`).catch(() => {});
          } else {
            message.reply("⚠️ Could not add 'muted' role (check bot permissions).").catch(() => {});
          }
        }
      } else {
        if (replied) {
          replied.edit(`${replied.content}\n⚠️ 'muted' role not found on this server.`).catch(() => {});
        } else {
          message.reply("⚠️ 'muted' role not found on this server.").catch(() => {});
        }
      }
      if (replied) setTimeout(() => replied.delete().catch(() => {}), 60_000);
      return;
    } else if (roll < 0.5) {
      // win 5k XP
      xpData[uid].xp += 5000;
      saveXP();
      const r = await message.reply("🎉 You won 5000 XP!").catch(() => null);
      if (r) setTimeout(() => r.delete().catch(() => {}), 60_000);
      return;
    } else {
      // nothing
      const r = await message.reply("Nothing happened... better luck next time.").catch(() => null);
      if (r) setTimeout(() => r.delete().catch(() => {}), 60_000);
      return;
    }
  }

  if (cmd === "leaderboard" || cmd === "lb") {
    const sorted = Object.entries(xpData)
      .sort(([, a], [, b]) => b.xp - a.xp)
      .slice(0, 10);

    if (sorted.length === 0) return message.reply("📉 No XP data yet. Talk in the server to earn XP!").catch(() => {});

    const text = sorted.map(([id, data], i) => `**${i + 1}.** ${data.username || "Unknown"} — ${data.xp} XP (Lv ${data.level})`).join("\n");
    return message.reply(`🏆 Top players:\n\n${text}`).catch(() => {});
  }

  if (cmd === "stats") {
    const data = xpData[uid];
    if (!data) return message.reply("You have no XP yet — start chatting!").catch(() => {});
    return message.reply(`📊 Your stats: XP ${data.xp} — Level ${data.level}`).catch(() => {});
  }
});

// ---------- Website routes (views + API) ----------
app.get("/", async (req, res) => {
  try {
    const botUser = client.user;
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

// small API to return leaderboard JSON (used by client-side for live update)
app.get("/api/leaderboard", (req, res) => {
  const top = Object.entries(xpData)
    .sort(([, a], [, b]) => b.xp - a.xp)
    .slice(0, 10)
    .map(([id, d], i) => ({ rank: i + 1, id, name: d.username || "Unknown", xp: d.xp, level: d.level }));
  res.json({ top });
});

// start express
app.listen(PORT, () => console.log(`🌐 Website running on port ${PORT}`));

// login bot
client.login(BOT_TOKEN).catch((err) => {
  console.error("Failed to login bot:", err);
  process.exit(1);
});
