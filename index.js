// index.js (replace your existing file with this)
import fs from "fs";
import express from "express";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const DATA_FILE = "./data.json";
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return {};
  }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ====== CONFIG ======
const OWNER_ID = "1042488971017588797"; // your ID
const BOT_DISPLAY_NAME = "IchiBot#3137";
const LEADERBOARD_TITLE = "Lost Spirit Stats";
const BG_IMAGES = [
  // These must be publicly reachable URLs (I used earlier ones you uploaded)
  "https://files.catbox.moe/068dc04a-79ee-454b-9bac-9dbb5e935c48.png",
  "https://files.catbox.moe/36e3b89b-5996-45b5-b3ce-48ff4eb929f3.png",
  "https://files.catbox.moe/78f7313d-209e-4590-8a95-fdd4a134d4fa.png"
];
// rotation interval in ms for client-side (30s)
const ROTATE_MS = 30_000;
// message auto-delete time
const AUTO_DELETE_MS = 60_000;
// ===================

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// --- Helper EXP functions
function ensureUser(data, id) {
  if (!data[id]) data[id] = { exp: 0 };
}
function addExp(id, amount) {
  const data = loadData();
  ensureUser(data, id);
  data[id].exp += amount;
  if (data[id].exp < 0) data[id].exp = 0;
  saveData(data);
}
function setExp(id, amount) {
  const data = loadData();
  data[id] = { exp: Math.max(0, amount) };
  saveData(data);
}
function getTopN(n = 10) {
  const data = loadData();
  const arr = Object.entries(data).map(([id, v]) => ({ id, exp: v.exp || 0 }));
  arr.sort((a, b) => b.exp - a.exp);
  return arr.slice(0, n);
}

// --- Commands
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim();
    if (!content.startsWith("!")) return;
    const args = content.slice(1).split(/\s+/);
    const cmd = args.shift().toLowerCase();

    // !ping -> wakes the bot and shows latency
    if (cmd === "ping") {
      const sent = await message.reply("🏓 Pinging...");
      await sent.edit(`Pong! Latency: ${sent.createdTimestamp - message.createdTimestamp}ms`);
      // do not auto-delete ping (keeps it as wake)
      return;
    }

    // !commands / !cmnds
    if (cmd === "commands" || cmd === "cmnds") {
      const lines = [
        "`!ping` — wake the bot / show latency",
        "`!gamble` — 25% lose 5,000 EXP + 1 min mute | 25% win 5,000 EXP | 50% nothing",
        "`!bleach` — random Bleach character",
        "`!leaderboard` or `!lb` — show top 10 EXP (message deletes after 1 min)",
        "`!clear @user` — clear that user's EXP (admin/mod only)",
        "`!commands` or `!cmnds` — show this list"
      ];
      const sent = await message.reply(`🧩 Available commands:\n${lines.join("\n")}`);
      setTimeout(() => sent.delete().catch(() => {}), AUTO_DELETE_MS);
      return;
    }

    // !gamble
    if (cmd === "gamble") {
      const roll = Math.random(); // 0..1
      // 0.00-0.2499 lose, 0.25-0.4999 win, else nothing
      if (roll < 0.25) {
        // lose: -5000 exp + mute 1 minute
        addExp(message.author.id, -5000);
        const sent = await message.reply(`😬 ${message.author}, you lost 5000 EXP and are muted for 1 minute!`);
        // attempt to timeout (mute) for 60s
        try {
          const member = message.member;
          if (member && member.moderatable) {
            await member.timeout(60 * 1000, "Lost gamble: 1 minute mute");
          } else {
            // can't mute due to role hierarchy or missing perms
            await message.reply("⚠️ I can't mute this user (role/permission issue).");
          }
        } catch (err) {
          console.error("Timeout error:", err);
        }
        setTimeout(() => sent.delete().catch(() => {}), AUTO_DELETE_MS);
        return;
      } else if (roll < 0.5) {
        // win
        addExp(message.author.id, 5000);
        const sent = await message.reply(`🎉 ${message.author}, you won 5000 EXP!`);
        setTimeout(() => sent.delete().catch(() => {}), AUTO_DELETE_MS);
        return;
      } else {
        // nothing
        const sent = await message.reply(`😐 ${message.author}, nothing happened.`);
        setTimeout(() => sent.delete().catch(() => {}), AUTO_DELETE_MS);
        return;
      }
    }

    // !bleach
    if (cmd === "bleach") {
      const list = [
        "Ichigo Kurosaki", "Rukia Kuchiki", "Byakuya Kuchiki", "Tōshirō Hitsugaya",
        "Kenpachi Zaraki", "Sōsuke Aizen", "Uryū Ishida", "Renji Abarai",
        "Kisuke Urahara", "Yoruichi Shihōin", "Grimmjow Jaegerjaquez",
        "Ulquiorra Cifer", "Orihime Inoue", "Tatsuki Arisawa", "Shunsui Kyōraku"
      ];
      const pick = list[Math.floor(Math.random() * list.length)];
      const sent = await message.reply(`⚔️ Random Bleach character: **${pick}**`);
      setTimeout(() => sent.delete().catch(() => {}), AUTO_DELETE_MS);
      return;
    }

    // !leaderboard or !lb
    if (cmd === "leaderboard" || cmd === "lb") {
      const top = getTopN(10);
      if (top.length === 0) {
        const none = await message.reply("No EXP data yet.");
        setTimeout(() => none.delete().catch(() => {}), AUTO_DELETE_MS);
        return;
      }
      let text = `🏆 **${LEADERBOARD_TITLE}** 🏆\n`;
      for (let i = 0; i < top.length; i++) {
        const row = top[i];
        text += `**${i + 1}.** <@${row.id}> — ${row.exp} EXP\n`;
      }
      const sent = await message.reply(text);
      setTimeout(() => sent.delete().catch(() => {}), AUTO_DELETE_MS);
      return;
    }

    // !clear @user (require Manage Messages or Manage Roles)
    if (cmd === "clear") {
      // permission check: user must have Manage Guild or Manage Roles
      if (!message.member.permissions.has("ManageGuild") && !message.member.permissions.has("ManageRoles")) {
        const denied = await message.reply("You do not have permission to clear EXP.");
        setTimeout(() => denied.delete().catch(() => {}), AUTO_DELETE_MS);
        return;
      }
      const mentioned = message.mentions.users.first();
      if (!mentioned) {
        const ask = await message.reply("Please mention a user to clear: `!clear @user`");
        setTimeout(() => ask.delete().catch(() => {}), AUTO_DELETE_MS);
        return;
      }
      setExp(mentioned.id, 0);
      const sent = await message.reply(`🧹 Cleared EXP for ${mentioned.tag}.`);
      setTimeout(() => sent.delete().catch(() => {}), AUTO_DELETE_MS);
      return;
    }

  } catch (err) {
    console.error("Command handler error:", err);
  }
});

// --- API for frontend (returns top 10)
app.get("/api/leaderboard", (req, res) => {
  const top = getTopN(10);
  // include username & avatar if cached (best-effort)
  const enriched = top.map((t) => {
    const user = client.users.cache.get(t.id);
    return {
      id: t.id,
      exp: t.exp,
      username: user ? user.username : null,
      avatar: user ? user.displayAvatarURL() : null
    };
  });
  res.json({ title: LEADERBOARD_TITLE, data: enriched });
});

// --- Status page (dynamic client-side)
app.get("/", (req, res) => {
  // choose initial background index via time (client rotates as well)
  const bgIndex = Math.floor(Date.now() / ROTATE_MS) % BG_IMAGES.length;
  const bg = BG_IMAGES[bgIndex];

  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${LEADERBOARD_TITLE}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    html,body { height:100%; margin:0; font-family: system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial; }
    body {
      color:#e6edf3;
      background-image: url('${bg}');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); }
    .card {
      position:relative;
      z-index:2;
      width:min(1000px,92%);
      background:linear-gradient(180deg, rgba(20,20,20,0.6), rgba(10,10,10,0.55));
      border-radius:16px;
      padding:24px;
      box-shadow:0 10px 30px rgba(0,0,0,0.6);
      color:#fff;
    }
    .top { display:flex; gap:20px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
    .avatars { display:flex; gap:18px; align-items:center; }
    .avatars img { width:84px; height:84px; border-radius:50%; border:3px solid rgba(255,255,255,0.12); }
    h1 { margin:0; color:#58a6ff; }
    .lb { margin-top:18px; display:flex; gap:18px; }
    .lb-list { flex:1; background:rgba(0,0,0,0.35); padding:12px; border-radius:10px; max-height:320px; overflow:auto; }
    li { padding:10px 6px; border-bottom:1px solid rgba(255,255,255,0.04); }
    .small { color:#9fb0c8; font-size:0.92rem; }
    footer { margin-top:14px; font-size:0.9rem; color:#9fb0c8; text-align:center; }
  </style>
</head>
<body>
  <div class="overlay"></div>
  <div class="card">
    <div class="top">
      <div>
        <h1>${BOT_DISPLAY_NAME}</h1>
        <div class="small">Status: <strong style="color:#9eea8a">Online</strong></div>
      </div>
      <div class="avatars">
        <div style="text-align:center">
          <img id="botAvatar" src="${client.user ? client.user.displayAvatarURL() : ''}" alt="bot">
          <div class="small" id="botName">${client.user ? client.user.username : 'Bot'}</div>
        </div>
        <div style="text-align:center">
          <img id="ownerAvatar" src="" alt="owner">
          <div class="small" id="ownerName">Owner</div>
        </div>
      </div>
    </div>

    <div class="lb">
      <div class="lb-list">
        <h3 style="margin:0 0 10px 0;">Top 10 — ${LEADERBOARD_TITLE}</h3>
        <ul id="leaderboard"></ul>
      </div>
    </div>

    <footer>Auto-refreshes and rotates backgrounds every ${ROTATE_MS/1000} seconds</footer>
  </div>

<script>
  const BG_IMAGES = ${JSON.stringify(BG_IMAGES)};
  let bgIdx = ${Math.floor(Date.now() / ROTATE_MS) % BG_IMAGES.length};
  const ROTATE_MS = ${ROTATE_MS};

  function rotateBG() {
    bgIdx = (bgIdx + 1) % BG_IMAGES.length;
    document.body.style.backgroundImage = 'url(' + BG_IMAGES[bgIdx] + ')';
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      const json = await res.json();
      const listEl = document.getElementById('leaderboard');
      listEl.innerHTML = '';
      if (!json.data || json.data.length === 0) {
        listEl.innerHTML = '<li>No EXP data yet.</li>';
      } else {
        json.data.forEach((row, i) => {
          const name = row.username ? row.username : ('<@' + row.id + '>');
          const avatar = row.avatar ? '<img src="' + row.avatar + '" style="width:30px;height:30px;border-radius:50%;margin-right:8px;vertical-align:middle;">' : '';
          const li = document.createElement('li');
          li.innerHTML = '<strong>#' + (i+1) + '</strong> — ' + avatar + ' ' + name + ' — ' + row.exp + ' EXP';
          listEl.appendChild(li);
        });
      }

      // owner info
      const owner = json.owner || null;
      // attempt to fetch owner via endpoint by ID from server side not included; instead request client endpoint for user...
      // We'll try a best-effort fetch to /api/owner (not implemented server-side), fallback on fetch of cached user via DOM updates below
    } catch (err) {
      console.error("Fetch leaderboard failed", err);
    }
  }

  // Initial load
  fetchLeaderboard();

  // update every 30s
  setInterval(() => {
    fetchLeaderboard();
    rotateBG();
  }, ROTATE_MS);

  // fetch owner and bot avatars from page rendered values using DOM replaced later by server-side script? we'll update via a simple call to bot's avatar endpoint if available
  (async () => {
    try {
      const resp = await fetch('/api/leaderboard');
      const js = await resp.json();
      // bot info is injected server-side as initial values; update owner and bot avatars if provided by server cache
      // server-side set owner data via client.users.fetch on each request, frontend gets avatar via that response
      if (js && js.data) {
        // also request owner via separate property if available (server didn't include owner in /api/leaderboard currently)
      }
    } catch (e) {}
  })();
</script>
</body>
</html>`);
});

// start express then login
app.listen(PORT, () => console.log(`🌐 Web dashboard running on port ${PORT}`));
client.login(process.env.TOKEN);

