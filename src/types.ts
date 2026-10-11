export type CymbalDepartment =
  | "Food & Grazing"
  | "Beverages & Mixers"
  | "Tableware & Decor"
  | "Host & Party Essentials";

export type ItemPriority = "Essential" | "Recommended" | "Optional Upgrade";

export type CujStage = "define" | "review" | "checkout";

export interface ShoppingItem {
  id: string;
  sku: string;
  name: string;
  category: CymbalDepartment;
  unitPrice: number;
  quantity: number;
  unit: string;
  scalingFormula: string;
  dietaryNotes: string;
  aisle: string;
  priority: ItemPriority;
  rationale: string;
  includedInCart?: boolean;
  agentStatus?: "added" | "modified" | "unchanged";
}

export interface TimelineStep {
  timeOffset: string;
  task: string;
  category: string;
}

export interface PartyBrief {
  partyType: string;
  theme: string;
  guestCount: number;
  budget: number;
  dietary: string[];
  specialRequests: string;
}

export interface AgentActionLog {
  id: string;
  timestamp: string;
  instruction: string;
  agentMessage: string;
  changeHighlights: string[];
  subtotalBefore: number;
  subtotalAfter: number;
}

export interface CuratedBundle {
  id: string;
  title: string;
  subtitle: string;
  category: CymbalDepartment;
  imageUrl: string;
  price: number;
  servingScale: string;
  description: string;
  itemsToAdd: Omit<ShoppingItem, "id" | "includedInCart">[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  cartActionSummary?: string;
  suggestedFollowUps?: string[];
}
