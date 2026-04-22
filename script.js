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

about, projects, skills, contact, clear
open [name | url] , search [query]
theme [${data.themes.join(" | ")}]
`,

  about: () => data.about,

  projects: () => {
    const projectList = data.projects
      .map((p) => {
        return `
'${p.name}'

Description : ${p.description}

Tech used : ${p.tech}

GitHub repo : ${p.github ? `<a href="${p.github}" target="_blank" rel="noopener noreferrer">${p.github}</a>` : "N/A"}

Live at : ${p.live ? `<a href="${p.live}" target="_blank" rel="noopener noreferrer">${p.live}</a>` : "N/A"}

---------------------------------`;
      })
      .join("\n");

      const moreProjects = `
For more projects, do visit my <a href="https://github.com/apache2op?tab=repositories" target="_blank" rel="noopener noreferrer">GitHub</a>.
`;

  return projectList + moreProjects;
      
  },

  skills: () => data.skills.join(", "),

  contact: () => {
    return data.contact
      .map((c) => {
        const type = c.type.toLowerCase();

        // Email
        if (type === "email") {
          return `<a href="mailto:${c.value}?subject=Hello%20Ayush&body=Hi%20Ayush,%20I%20saw%20your%20portfolio...">${c.type}</a>`;
        }

        // Links
        if (c.value.startsWith("http")) {
          return `<a href="${c.value}" target="_blank" rel="noopener noreferrer">${c.type}</a>`;
        }

        return c.type;
      })
      .join("&nbsp;&nbsp;&nbsp;&nbsp;"); // spacing between items
  },

  open: async (arg) => {
    if (!arg) return "Usage: open [name | url]";

    arg = arg.trim();

    let url = "";

    // direct URL
    if (arg.startsWith("http")) {
      url = arg;
    }

    // known links only
    else if (data.links && data.links[arg.toLowerCase()]) {
      url = data.links[arg.toLowerCase()];
    } else {
      return `Unknown target: ${arg}\nUse 'search ${arg}' instead.`;
    }

    window.open(url, "_blank");

    await sleep(300);
    return `Opening ${arg} in a new tab.`;
  },

  search: async (arg) => {
    if (!arg) return "Usage: search [query]";

    const url = `https://www.google.com/search?q=${encodeURIComponent(arg)}`;

    print(`Searching "${arg}"...`);

    window.open(url, "_blank");

    await sleep(400);
    return "Results opened in new tab.";
  },

  theme: (arg) => {
    if (!arg) {
      return `Available themes:\n${data.themes.join(", ")}`;
    }

    arg = arg.trim().toLowerCase();

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
  const sub = arg.trim().toLowerCase();   // ✅ normalize input

  if (sub !== "portfolio") {
    return "Try 'run portfolio'";
  }

  if (booted) return "Portfolio already running.";

  askingName = true;
  return "Enter your username:";
},
};

/* ---------------- RUN COMMAND ---------------- */
async function runCommand(value) {
  const cleaned = value.trim().replace(/\s+/g, " ");

  const parts = cleaned.split(" ");
  const cmd = (parts.shift() || "").toLowerCase();
  const arg = parts.join(" ");

  // 🚫 BLOCK commands before boot
  const allowedBeforeBoot = ["run", "theme", "clear"];

  if (!booted && !allowedBeforeBoot.includes(cmd)) {
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
      input.disabled = true; // 🔒 LOCK INPUT

      username = value || "guest";
      askingName = false;

      await bootSequence();
      booted = true;

      updatePrompt();

      print(`Welcome ${username}`);
      print("Type 'help' to explore");

      input.disabled = false; // 🔓 UNLOCK INPUT
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
