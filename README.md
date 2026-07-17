# Realtime Log Stream Viewer

## Quickstart

```bash
npm install
npm run dev      # then open http://localhost:5173
```

You should immediately see a **Workbench** panel (bottom-right) with a log stream flowing. Build
your viewer in the slot in `src/App.tsx`. Setup trouble? Run `npm run verify` for a diagnostic.

## Overview

You're building a UI for a live log stream. Think tailing a production log firehose (Datadog,
CloudWatch Logs, `kubectl logs -f`). The app connects to a firehose that emits log entries
continuously and never stops. Your job is to make that stream legible and usable, and to keep it
correct when the stream turns hostile.

One layout note: treat the viewer as a **full-screen tool that fills the viewport**, like a
terminal or a log console, rather than a component sitting in a scrolling page.

## What we give you

- A **firehose**: a socket-shaped log source you import from `src/firehose/source.ts`. It streams
  continuously; you `connect()` to receive entries and subscribe with `firehose.on('entry', ...)`.
- A **Workbench** dev panel to drop the connection, pause/resume the stream, ramp the rate, and
  burst. It's your test rig while you build, and it's how we'll exercise your app during review.
- The **wire contract** (the source API, message shape, delivery semantics) in
  [`src/firehose/README.md`](src/firehose/README.md). **Read it first.**
- A bare slot in `src/App.tsx`.

You're welcome to read anything in `src/firehose/` to understand how it works; just don't modify
it. We restore that directory from a clean copy when reviewing.

We deliberately don't give you any buffering, list, filtering, search, or connection handling.
That part is the assignment.

## What to build

### The floor

- Log entries render live as they stream in.
- The app survives a connection **drop** and a rate **burst** without losing data integrity or
  locking up. It should stay usable while the Workbench is bursting or running at high rates.
  There's no numeric performance target. How you keep it correct and usable is your design
  decision, and it's one of the things we most want to see.

"Data integrity" means what you display is correct: deduped by `id`, in order, nothing silently
dropped from what you've chosen to retain. Bounded retention is expected. The stream is infinite,
so capping how much you keep and evicting old entries is fine (and wise); just note your policy in
your design notes.

### Then pick one direction and go deep

Choose **one** of these (two if time allows) and build it well:

- **Filtering** (by level, service) that narrows what's shown without losing the stream underneath.
- **Search** with the matched text highlighted inline.
- A way to **focus a single entry** and see its full detail/context.
- Fast **keyboard navigation**.

The floor, one direction done well, and a README is a complete, strong submission. Don't try to
cover several directions. Which one you pick first, and the judgment you show in it, is the signal.

### Explicitly out of scope

So you don't burn time on them: **tests** (instead, tell us in your README what you'd test and
how), gap detection ("you missed N entries while disconnected"), trace grouping, time-range
filtering, search over `context` fields, authentication, any backend, and persistence across
refreshes.

## Time

We intend this as about **3-4 focused hours**. It's not a stopwatch, and modest over or under is
fine, but please don't turn it into a weekend project. Depth matters more than breadth: a smaller
scope done well lands better than a larger scope done sloppily. If you run out of time, stop and
tell us in the README what you'd do next. We'd rather read that than see a rushed attempt at
everything.

## Deliverables

1. **Working code**, still runnable with the same `npm install && npm run dev`. Submit it as a
   public repo on whatever provider you prefer (GitHub, GitLab, etc.) and send us the link.
2. **Design notes**: add a `## Design notes` section to this README (or a separate `NOTES.md`,
   your call), covering four things:
   - **Data flow**: what holds the logs, what renders them, and why you drew the line there.
   - **One decision** that involved a real trade-off, and how you weighed it.
   - **What you'd do next** with more time.
   - **AI note**: which AI tools you used and how, if any. Just context for our conversation;
     there's no right or wrong answer here.

If you make a simplifying assumption, note it in the README rather than over-specifying the
problem yourself.

## Ground rules and what happens next

- **Don't modify `src/firehose/`.** Reading it is fine and expected; changing it isn't.
- **React + TypeScript** are already set up. Everything else (state approach, libraries,
  structure) is your call.
- The app runs with React **StrictMode** on (leave it on). In dev, every effect mounts, cleans
  up, and mounts again, so your connect/disconnect lifecycle gets exercised immediately, including
  a `'close'` fired by your own cleanup. That's intentional; handle it.
- Keep `<Workbench/>` mounted; it's how we'll exercise your app during review. It floats
  bottom-right by default, so move it if it gets in your way.
- Use whatever tools and resources you'd normally reach for as an engineer, including whatever
  AI/LLM tooling you prefer, however you'd use it day-to-day.
- We use your submission as the starting point for the onsite, not as a pass/fail filter. We'll
  walk through your code together, talk through the decisions behind it, and build on it from
  there, so be comfortable explaining and discussing any part of what you submit.
