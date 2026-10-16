---
name: computer-use
description: Drive Chrome tabs and macOS apps through Codex's computer-use MCP (codex-cu, the mcp__codex-cu__js tool) — read dashboards (GA4, Firebase, Jira…), click, fill, extract data. Works on background Chrome tabs without stealing focus, and always hides the Computer Use cursor overlay when finished. Use when the user says "use codex-cu", "computer use", "check the X tab", "look at my browser", or asks for data only visible in a web UI/desktop app.
---

# Computer Use (codex-cu)

`mcp__codex-cu__js` runs JavaScript against a `cua` runtime. It is proxied through
`~/.claude/mcp/codex-cu-proxy.mjs`, which injects the Codex turn metadata the Chrome
backend needs, so the browser APIs below work from Claude Code.

## 1. Prefer the Chrome backend (background tabs, no focus stealing)

Works on any tab in a Chrome profile that has the Codex extension, even if the user is
in another window/app. The user can keep working.

```js
await cua.listBrowsers();                        // ids, e.g. "1", "2" — one per profile with the extension
await cua.listTabs({ browser: "1" });            // find the tab
globalThis.tab = await cua.getTab({ url: "https://analytics.google.com/..." }, { browser: "1" });
// or a new background tab:
globalThis.tab = await cua.createBrowserTab("1", url, { visible: false });
```

Read the returned documentation the first time — Chrome tabs are DOM-based: use the
documented Playwright-style locators for clicks/fills, `tab.getAXState()` for content.

If the tab you need isn't in any listed browser, that Chrome profile lacks the Codex
extension. Tell the user ("install the Codex Chrome extension in profile X"), then fall
back to section 2.

## 2. Fallback: native app control (needs the window in front)

```js
globalThis.app = await cua.getApp("com.google.Chrome");  // binds the FRONT window only
```

- Only the frontmost window of the app is visible to you. If the user is using the same
  app, actions get interrupted ("The user changed ..."). Ask them to bring the target
  window forward and hands off for a minute.
- Never type until the AX state confirms the right window/field — a stale index can land
  in another window (e.g. an email draft).
- Re-read indices after every action (`getAXState({emit:false, disableDiffing:true})` and
  regex out what you need; full trees are huge). Screenshots may fail; AX state is enough.
- GA4/Material inputs often ignore `setValue`; click the field, `super+a`, then `typeText`.

## 3. Safety

Follow the confirmation policy the tool returns (deletes, sends, purchases, sharing,
permission changes → confirm right before acting). Reading and navigating is fine.

## 4. Always clean up when done

The cursor overlay belongs to the Computer Use helper and stays on screen until it quits.
As the last step of every computer-use task — success or failure — run:

```bash
pkill -f SkyComputerUseService; true
```

It relaunches automatically on the next codex-cu call. Then report results.
