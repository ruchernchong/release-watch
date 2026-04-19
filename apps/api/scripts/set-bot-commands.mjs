const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const commands = [
  { command: "start", description: "Start the bot and see available commands" },
  { command: "check", description: "Manually check for new releases" },
  { command: "untrack", description: "Stop tracking a repository" },
  { command: "list", description: "List your tracked repos" },
  { command: "link", description: "Link to your web dashboard account" },
  { command: "unlink", description: "Unlink your Telegram from the dashboard" },
];

const response = await fetch(
  `https://api.telegram.org/bot${token}/setMyCommands`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  },
);

const body = await response.json();

if (!response.ok || !body.ok) {
  console.error("Failed to set commands:", body);
  process.exit(1);
}

console.log(`Registered ${commands.length} bot commands.`);
