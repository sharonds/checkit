// Thin wrapper over the `agent-browser` CLI. Each method spawns one command.
// The browser process stays alive between commands — session persists.
//
// Usage:
//   await browser.open(url);
//   const snap = await browser.snapshot();
//   await browser.click("@e1");
//   await browser.close();

interface RunOpts {
  timeoutMs?: number;
  input?: string;
}

async function run(args: string[], opts: RunOpts = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["agent-browser", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    stdin: opts.input ? "pipe" : "ignore",
  });

  if (opts.input && proc.stdin) {
    proc.stdin.write(opts.input);
    await proc.stdin.end();
  }

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  return { stdout, stderr, exitCode: proc.exitCode ?? -1 };
}

export const browser = {
  async open(url: string): Promise<void> {
    const { exitCode, stderr } = await run(["open", url]);
    if (exitCode !== 0) throw new Error(`browser.open(${url}) failed: ${stderr}`);
  },

  async close(): Promise<void> {
    await run(["close"]);
  },

  async closeAll(): Promise<void> {
    await run(["close", "--all"]);
  },

  async snapshot(opts: { interactive?: boolean; urls?: boolean; compact?: boolean; scope?: string } = {}): Promise<string> {
    const args = ["snapshot"];
    if (opts.interactive !== false) args.push("-i");
    if (opts.urls) args.push("-u");
    if (opts.compact) args.push("-c");
    if (opts.scope) args.push("-s", opts.scope);
    const { stdout, exitCode, stderr } = await run(args);
    if (exitCode !== 0) throw new Error(`browser.snapshot failed: ${stderr}`);
    return stdout;
  },

  async click(refOrSelector: string): Promise<void> {
    const { exitCode, stderr } = await run(["click", refOrSelector]);
    if (exitCode !== 0) throw new Error(`browser.click(${refOrSelector}) failed: ${stderr}`);
  },

  async fill(refOrSelector: string, text: string): Promise<void> {
    const { exitCode, stderr } = await run(["fill", refOrSelector, text]);
    if (exitCode !== 0) throw new Error(`browser.fill failed: ${stderr}`);
  },

  async press(key: string): Promise<void> {
    const { exitCode, stderr } = await run(["press", key]);
    if (exitCode !== 0) throw new Error(`browser.press(${key}) failed: ${stderr}`);
  },

  async getText(refOrSelector: string): Promise<string> {
    const { stdout, exitCode, stderr } = await run(["get", "text", refOrSelector]);
    if (exitCode !== 0) throw new Error(`browser.getText failed: ${stderr}`);
    return stdout.trim();
  },

  async getUrl(): Promise<string> {
    const { stdout } = await run(["get", "url"]);
    return stdout.trim();
  },

  async waitForText(text: string, timeoutMs = 15000): Promise<void> {
    const { exitCode, stderr } = await run(["wait", "--text", text, "--timeout", String(timeoutMs)]);
    if (exitCode !== 0) throw new Error(`browser.waitForText(${text}) failed: ${stderr}`);
  },

  async waitForUrl(pattern: string, timeoutMs = 15000): Promise<void> {
    const { exitCode, stderr } = await run(["wait", "--url", pattern, "--timeout", String(timeoutMs)]);
    if (exitCode !== 0) throw new Error(`browser.waitForUrl failed: ${stderr}`);
  },

  async waitForLoad(kind: "networkidle" | "domcontentloaded" | "load" = "networkidle", timeoutMs = 15000): Promise<void> {
    const { exitCode, stderr } = await run(["wait", "--load", kind, "--timeout", String(timeoutMs)]);
    if (exitCode !== 0) throw new Error(`browser.waitForLoad(${kind}) failed: ${stderr}`);
  },

  async screenshot(path: string, opts: { full?: boolean; annotate?: boolean } = {}): Promise<void> {
    const args = ["screenshot"];
    if (opts.full) args.push("--full");
    if (opts.annotate) args.push("--annotate");
    args.push(path);
    const { exitCode, stderr } = await run(args);
    if (exitCode !== 0) throw new Error(`browser.screenshot failed: ${stderr}`);
  },

  async expectText(needle: string): Promise<void> {
    const snap = await this.snapshot();
    if (!snap.includes(needle)) {
      throw new Error(
        `Expected snapshot to contain "${needle}" but it did not.\nSnapshot:\n${snap.slice(0, 2000)}`,
      );
    }
  },
};
