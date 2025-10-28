// ====== IchiBot v2 ======
// Discord bot + Leaderboard website by Yume 🖤

const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// === Load & Save EXP Data ===
const dataPath = path.join(__dirname, 'data.json');
let data = {};

function loadData() {
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch {
    data = {};
  }
}
function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}
loadData();

// === Discord Bot Setup ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// === Helper ===
function addExp(userId, amount) {
  if (!data[userId]) data[userId] = { exp: 0 };
  data[userId].exp += amount;
  saveData();
}

// === Commands ===
client.on('messageCreate', async (message) => {
  if (me

