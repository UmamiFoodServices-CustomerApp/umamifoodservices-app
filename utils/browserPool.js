const { default: puppeteer } = require("puppeteer-core");

function getLaunchOptions() {
  const isProduction = true

  let executablePath;

  if (isProduction) {
    executablePath =
      process.env.CHROME_BIN ||
      "/app/.apt/usr/bin/google-chrome";
  } else {
    executablePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  
  return {
    executablePath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-features=site-per-process",
      "--single-process",
      "--no-zygote"
    ]
  };
}

class BrowserPool {
  constructor(maxPoolSize = 2) {
    this.browsers = [];
    this.maxPoolSize = maxPoolSize;
    this.inUse = new Map(); // Track which browsers are currently in use
    this.lastUsed = new Map(); // Track when a browser was last used
    this.initPromise = null;

    // Set up periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000); // Every 10 minutes
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const browser = await puppeteer.launch(getLaunchOptions());
        this.browsers.push(browser);
        this.lastUsed.set(browser, Date.now());
        return browser;
      } catch (err) {
        console.error("Failed to initialize browser pool:", err);
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  async getBrowser() {
    // Make sure we have at least one browser
    if (this.browsers.length === 0) {
      await this.init();
    }

    // Find an unused browser
    for (const browser of this.browsers) {
      if (!this.inUse.get(browser)) {
        this.inUse.set(browser, true);
        this.lastUsed.set(browser, Date.now());
        return browser;
      }
    }

    // If all browsers are in use and we haven't reached the pool size limit, create a new one
    if (this.browsers.length < this.maxPoolSize) {
      const browser = await puppeteer.launch(getLaunchOptions());

      this.browsers.push(browser);
      this.inUse.set(browser, true);
      this.lastUsed.set(browser, Date.now());
      return browser;
    }

    // Wait for a browser to become available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        for (const browser of this.browsers) {
          if (!this.inUse.get(browser)) {
            clearInterval(checkInterval);
            this.inUse.set(browser, true);
            this.lastUsed.set(browser, Date.now());
            resolve(browser);
            return;
          }
        }
      }, 100);
    });
  }

  releaseBrowser(browser) {
    this.inUse.set(browser, false);
    this.lastUsed.set(browser, Date.now());
  }

  async cleanup() {
    const now = Date.now();
    const MAX_IDLE_TIME = 30 * 60 * 1000; // 30 minutes

    // Keep at least one browser instance
    if (this.browsers.length <= 1) return;

    // Find and close idle browsers
    for (let i = this.browsers.length - 1; i >= 1; i--) {
      const browser = this.browsers[i];
      const lastUsedTime = this.lastUsed.get(browser) || 0;

      if (!this.inUse.get(browser) && now - lastUsedTime > MAX_IDLE_TIME) {
        try {
          await browser.close();
          this.browsers.splice(i, 1);
          this.inUse.delete(browser);
          this.lastUsed.delete(browser);
        } catch (err) {
          console.error("Error closing idle browser:", err);
        }
      }
    }
  }

  async closeAll() {
    clearInterval(this.cleanupInterval);

    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (err) {
        console.error("Error closing browser during shutdown:", err);
      }
    }

    this.browsers = [];
    this.inUse.clear();
    this.lastUsed.clear();
  }
}

// Create a singleton instance
const browserPool = new BrowserPool();

// Make sure to call this when your application shuts down
process.on("SIGINT", async () => {
  console.log("Closing all browser instances...");
  await browserPool.closeAll();
  process.exit(0);
});

module.exports = {
  browserPool,
};
