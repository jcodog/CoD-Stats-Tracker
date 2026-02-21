import { defineSchema } from "convex/server";
import { sessions } from "./db/tables/sessions";
import { games } from "./db/tables/games";

export default defineSchema({
  sessions,
  games,
});
