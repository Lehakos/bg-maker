import type { ProjectObjectIconSymbol } from "@bg-maker/shared";
import { projectObjectIconSymbols } from "@bg-maker/shared";
import {
  Castle,
  Circle,
  Clock,
  Coins,
  Compass,
  Crown,
  Diamond,
  Dices,
  Droplet,
  Flame,
  Flag,
  Gem,
  Hash,
  Heart,
  Hexagon,
  Leaf,
  Map,
  Minus,
  Plus,
  Shield,
  Skull,
  Square,
  Star,
  Swords,
  Target,
  Triangle,
  User,
  Users,
  Zap,
  type LucideIcon
} from "lucide-react";

export type ProjectObjectIconRegistryEntry = {
  icon: LucideIcon;
  label: string;
  symbol: ProjectObjectIconSymbol;
};

const projectObjectIconRegistryBySymbol = {
  castle: { icon: Castle, label: "Castle" },
  circle: { icon: Circle, label: "Circle" },
  clock: { icon: Clock, label: "Clock" },
  coins: { icon: Coins, label: "Coins" },
  compass: { icon: Compass, label: "Compass" },
  crown: { icon: Crown, label: "Crown" },
  diamond: { icon: Diamond, label: "Diamond" },
  dices: { icon: Dices, label: "Dices" },
  droplet: { icon: Droplet, label: "Droplet" },
  flame: { icon: Flame, label: "Flame" },
  flag: { icon: Flag, label: "Flag" },
  gem: { icon: Gem, label: "Gem" },
  hash: { icon: Hash, label: "Hash" },
  heart: { icon: Heart, label: "Heart" },
  hexagon: { icon: Hexagon, label: "Hexagon" },
  leaf: { icon: Leaf, label: "Leaf" },
  map: { icon: Map, label: "Map" },
  minus: { icon: Minus, label: "Minus" },
  plus: { icon: Plus, label: "Plus" },
  shield: { icon: Shield, label: "Shield" },
  skull: { icon: Skull, label: "Skull" },
  square: { icon: Square, label: "Square" },
  star: { icon: Star, label: "Star" },
  swords: { icon: Swords, label: "Swords" },
  target: { icon: Target, label: "Target" },
  triangle: { icon: Triangle, label: "Triangle" },
  user: { icon: User, label: "User" },
  users: { icon: Users, label: "Users" },
  zap: { icon: Zap, label: "Zap" }
} as const satisfies Record<
  ProjectObjectIconSymbol,
  Omit<ProjectObjectIconRegistryEntry, "symbol">
>;

export const projectObjectIconRegistry: ProjectObjectIconRegistryEntry[] =
  projectObjectIconSymbols.map((symbol) => ({
    symbol,
    ...projectObjectIconRegistryBySymbol[symbol]
  }));

export function getProjectObjectIconRegistryEntry(symbol: ProjectObjectIconSymbol) {
  return projectObjectIconRegistryBySymbol[symbol];
}
