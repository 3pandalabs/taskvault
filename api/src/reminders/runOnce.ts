// `npm run reminders:once`: one sweep, then exit. For local checks and ops.
import { pool } from "../db/index.js";
import { runSweepOnce } from "./sweep.js";

const result = await runSweepOnce();
console.log(JSON.stringify({ component: "reminders", msg: "manual sweep done", ...result }));
await pool.end();
