import {
  Binoculars,
  ChartLine,
  ClipboardList,
  HeartPulse,
  Shield,
  Shirt,
  type LucideIcon,
} from "lucide-react";

import type { PlayerPosition, UserRole } from "@/types/player-profile";

/**
 * Six roles, one shared UI. Role-specific screens are data-driven variants,
 * never six parallel implementations - if a component is about to branch on
 * `role === "PLAYER"`, the difference belongs here instead.
 *
 * Keys are the `UserRole` values from `backend/prisma/schema.prisma`. The
 * Claude Design system uses `PHYSIO` and `CLUB` for the last two; the schema
 * is authoritative. See D-013.
 *
 * Labels are NOT here - they live in `messages/{locale}.json` under `roles.*`,
 * because they differ per locale and the design system fixes the Arabic
 * wording (Player is لاعب, not a translation of "Player").
 */
export const ROLE_CONFIG: Record<UserRole, { icon: LucideIcon }> = {
  // Lucide has no soccer ball, and `football` is the American ball, which
  // would be wrong in this product. A jersey is football-native.
  PLAYER: { icon: Shirt },
  COACH: { icon: ClipboardList },
  SCOUT: { icon: Binoculars },
  ANALYST: { icon: ChartLine },
  PHYSICAL_THERAPIST: { icon: HeartPulse },
  CLUB_ADMIN: { icon: Shield },
};

/**
 * Position codes stay Latin in both locales by product decision. Every render
 * of one must be isolated with `dir="ltr"`, which `PositionChip` does so it
 * cannot be forgotten.
 */
export const POSITION_CODES: Record<PlayerPosition, string> = {
  GOALKEEPER: "GK",
  RIGHT_BACK: "RB",
  CENTER_BACK: "CB",
  LEFT_BACK: "LB",
  DEFENSIVE_MIDFIELDER: "DM",
  CENTRAL_MIDFIELDER: "CM",
  ATTACKING_MIDFIELDER: "AM",
  LEFT_MIDFIELDER: "LM",
  RIGHT_MIDFIELDER: "RM",
  LEFT_WINGER: "LW",
  RIGHT_WINGER: "RW",
  STRIKER: "ST",
};

/**
 * Display order, back to front. This exists as an explicit list in code
 * precisely because it must never come from the database enum: a Postgres
 * enum's sort order is fixed when the type is created, and this one is an
 * arbitrary historical artefact in which LEFT_MIDFIELDER sorts before
 * CENTRAL_MIDFIELDER for no reason a user would recognise. See D-008.
 */
export const POSITION_DISPLAY_ORDER: readonly PlayerPosition[] = [
  "GOALKEEPER",
  "RIGHT_BACK",
  "CENTER_BACK",
  "LEFT_BACK",
  "DEFENSIVE_MIDFIELDER",
  "CENTRAL_MIDFIELDER",
  "ATTACKING_MIDFIELDER",
  "LEFT_MIDFIELDER",
  "RIGHT_MIDFIELDER",
  "LEFT_WINGER",
  "RIGHT_WINGER",
  "STRIKER",
];
