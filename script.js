const input = document.getElementById("input");
const output = document.getElementById("output");
const terminal = document.querySelector(".terminal");
const promptEl = document.getElementById("prompt");

/* ---------------- STATE ---------------- */
let username = "guest";
let booted = false;
let askingName = false;
let data = {};

/* HISTORY */
let history = [];
let historyIndex = -1;

/* ---------------- LOAD JSON ---------------- */
async function loadData() {
  const res = await fetch("data.json");
  data = await res.json();
}

/* ---------------- PROMPT ---------------- */
function updatePrompt() {
  if (!booted) {
    promptEl.textContent = "guest:~$";
  } else {
    promptEl.textContent = `${username}@portfolio:~$`;
  }
}

/* ---------------- PRINT ---------------- */
function print(text = "") {
  if (!text) return;

  const div = document.createElement("div");
  div.className = "line";
  div.innerHTML = text;

  output.appendChild(div);
  terminal.scrollTop = terminal.scrollHeight;
}

/* ---------------- SLEEP ---------------- */
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/* ---------------- PROGRESS BAR (TEMPORARY) ---------------- */
async function progressBar(text, duration = 1200) {
  const steps = 25;
  const delay = duration / steps;

  const container = document.createElement("div");
  container.className = "line";
  output.appendChild(container);

  for (let i = 0; i <= steps; i++) {
    const filled = "█".repeat(i);
    const empty = "░".repeat(steps - i);
    const percent = Math.floor((i / steps) * 100);

    container.innerHTML = `${text} [${filled}${empty}] ${percent}%`;
    await sleep(delay);
  }

  // remove after animation
  await sleep(300);
  container.remove();
}

/* ---------------- BOOT SEQUENCE (TEMP CLEANUP) ---------------- */
async function bootSequence() {
  const tempLines = [];

  function tempPrint(text) {
    const div = document.createElement("div");
    div.className = "line";
    div.textContent = text;
    output.appendChild(div);
    tempLines.push(div);
  }

  tempPrint("Running portfolio...");
  await sleep(500);

  await progressBar("Fetching data", 3000);

  // remove all temp lines
  await sleep(300);
  tempLines.forEach((line) => line.remove());

  print("Portfolio ready.\n");
}

/* ---------------- COMMANDS ---------------- */
const commands = {
  help: () => `Available commands:
about, projects, skills, contact, 
open [name | url]
theme [${data.themes.join(" | ")}]
clear
`,

  about: () => data.about,

  projects: () => {
  return data.projects.map(p => {
    return `-------------------------------------------------------
'${p.name}'

Description: ${p.description}
Tech used: ${p.tech}
GitHub repo: ${p.github ? `<a href="${p.github}" target="_blank" rel="noopener noreferrer">${p.github}</a>` : "N/A"}
Live at: ${p.live ? `<a href="${p.live}" target="_blank" rel="noopener noreferrer">${p.live}</a>` : "N/A"}
-------------------------------------------------------`;
  }).join("\n");
},

  skills: () => data.skills.join(", "),

contact: () => {
  return data.contact.map(c => {
    let value = c.value;

    // 📧 Email → mailto
    if (c.type.toLowerCase() === "email") {
      value = `<a href="mailto:${value}?subject=Hello%20Ayush&body=Hi%20Ayush,%20I%20saw%20your%20portfolio...">${value}</a>`;
    }

    // 🌐 Links → clickable
    else if (value.startsWith("http")) {
      value = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
    }

    return `${c.type}: ${value}`;
  }).join("\n");
},

open: async (arg) => {
  if (!arg) return "Usage: open [name | url]";

  arg = arg.toLowerCase();

  let url = "";

  // direct URL
  if (arg.startsWith("http")) {
    url = arg;
  }

  // from JSON
  else if (data.links && data.links[arg]) {
    url = data.links[arg];
  }

  // fallback search
  else {
    url = `https://www.google.com/search?q=${encodeURIComponent(arg)}`;
    print(`Searching "${arg}"...`);
  }

  // open tab
  window.open(url, "_blank");

  // simulate delay
  await new Promise(res => setTimeout(res, 500));

  return "Opened in new tab.";
},

  theme: (arg) => {
  if (!arg) {
    return `Available themes:\n${data.themes.join(", ")}`;
  }

  if (!data.themes.includes(arg)) {
    return "Invalid theme. Type 'theme' to see options.";
  }

  // remove all themes
  document.body.classList.remove(...data.themes);

  // apply selected theme
  document.body.classList.add(arg);

  return `Theme changed to ${arg}`;
},

  clear: () => {
    output.innerHTML = "";
    return "";
  },

  run: async (arg) => {
    if (arg !== "portfolio") return "Try 'run portfolio'";

    if (booted) return "Portfolio already running.";

    askingName = true;
    return "Enter username:";
  },
};

/* ---------------- RUN COMMAND ---------------- */
async function runCommand(value) {
  const [cmd, ...args] = value.split(" ");
  const arg = args.join(" ");

  // 🚫 BLOCK commands before boot
  if (!booted && cmd !== "run" && cmd !== "theme" && cmd !== "clear") {
    return "Command not found. Type 'run portfolio' to start.";
  }

  if (commands[cmd]) {
    return await commands[cmd](arg);
  } else {
    return "Command not found. Type 'help'";
  }
}

/* ---------------- INPUT HANDLER ---------------- */
input.addEventListener("keydown", async (e) => {
  // ENTER
  if (e.key === "Enter") {
    const value = input.value.trim();

    // print command (NO SHIFT FIX)
    print(
      `<span class="prompt">${promptEl.textContent}</span><span class="command">${value}</span>`,
    );

    if (value) {
      history.push(value);
      historyIndex = history.length;
    }

    input.value = "";

    // USERNAME STEP
    if (askingName) {
  input.disabled = true;   // 🔒 LOCK INPUT

  username = value || "guest";
  askingName = false;

  await bootSequence();
  booted = true;

  updatePrompt();

  print(`Welcome ${username}`);
  print("Type 'help' to explore");

  input.disabled = false;  // 🔓 UNLOCK INPUT
  input.focus();

  return;
}

    // NORMAL COMMAND
    const result = await runCommand(value);
    print(result);
  }

  // UP ARROW
  else if (e.key === "ArrowUp") {
    if (historyIndex > 0) {
      historyIndex--;
      input.value = history[historyIndex];
    }
  }

  // DOWN ARROW
  else if (e.key === "ArrowDown") {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      input.value = history[historyIndex];
    } else {
      input.value = "";
    }
  }
});

/* ---------------- INIT ---------------- */
(async function init() {
  await loadData();
  updatePrompt();
  print("Type 'run portfolio' to start.");
  input.focus();
})();
