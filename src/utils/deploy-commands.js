require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN and CLIENT_ID must be set in .env');
  process.exit(1);
}

// Collect all command JSON payloads
const commands = [];
const commandsPath = path.join(__dirname, '../commands');
const folders = fs.readdirSync(commandsPath);

for (const folder of folders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(folderPath, file));
    if ('data' in command) {
      commands.push(command.data.toJSON());
      console.log(`  + ${command.data.name}`);
    }
  }
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\nDeploying ${commands.length} slash commands…`);

    let data;
    if (GUILD_ID) {
      // Guild deploy — instant (great for testing)
      data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Deployed ${data.length} commands to guild ${GUILD_ID}`);
    } else {
      // Global deploy — up to 1 hour to propagate
      data = await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ Deployed ${data.length} global commands`);
    }
  } catch (error) {
    console.error('Deploy failed:', error);
    process.exit(1);
  }
})();
