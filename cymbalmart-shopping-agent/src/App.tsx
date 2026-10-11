/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Check,
  Download,
  Copy,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  X,
  Send,
  Utensils,
  SlidersHorizontal,
  ArrowRight,
  FileDown,
  MessageSquare,
  Minimize2,
  RotateCcw,
  ArrowDownRight,
  Calculator,
} from "lucide-react";
import heroImage from "./assets/images/hero_dinner_tablescape_1791731824359.jpg";
import {
  AgentActionLog,
  ChatMessage,
  CujStage,
  CuratedBundle,
  CymbalDepartment,
  ItemPriority,
  PartyBrief,
  ShoppingItem,
  TimelineStep,
} from "./types";
import {
  CURATED_BUNDLES,
  INITIAL_PARTY_BRIEF,
  INITIAL_SHOPPING_ITEMS,
  INITIAL_SUMMARY,
  INITIAL_TIMELINE,
  PARTY_TEMPLATES,
  QUICK_REFINEMENT_PROMPTS,
} from "./data/presets";

const DEPARTMENTS: CymbalDepartment[] = [
  "Food & Grazing",
  "Beverages & Mixers",
  "Tableware & Decor",
  "Host & Party Essentials",
];

const DIETARY_PROTOCOLS = [
  "Vegetarian-Friendly",
  "Gluten-Free Options",
  "Zero-Proof Friendly",
  "Vegan Options",
  "Nut-Free",
  "Dairy-Free",
];

const PARTY_TYPES = [
  "Evening Dinner & Grazing Party",
  "Casual Watch Party & Buffet",
  "Evening Cocktail & Bite-Sized Reception",
  "Weekend Backyard BBQ & Picnic",
  "Birthday Brunch & Spritz Bar",
];

function ResilientImage({
  src,
  alt,
  className,
  fallbackLabel,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-stone-200 text-stone-600 p-6 text-center ${className || ""}`}
      >
        <Utensils className="w-6 h-6 mb-2 text-stone-500" />
        <span className="text-xs font-medium tracking-wide">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

export default function App() {
  // Active CUJ Step Highlight ("define" | "review" | "checkout")
  const [activeStage, setActiveStage] = useState<CujStage>("review");

  // CUJ Task 1: Define Event state
  const [brief, setBrief] = useState<PartyBrief>(INITIAL_PARTY_BRIEF);
  const [curationSummary, setCurationSummary] = useState<string>(INITIAL_SUMMARY);
  const [items, setItems] = useState<ShoppingItem[]>(INITIAL_SHOPPING_ITEMS);
  const [timeline, setTimeline] = useState<TimelineStep[]>(INITIAL_TIMELINE);

  // Live Budget Recalculation Feedback Banner state
  const [recalcCount, setRecalcCount] = useState<number>(1);
  const [lastRecalcNotice, setLastRecalcNotice] = useState<{
    action: string;
    previousTotal: number;
    newTotal: number;
    timestamp: string;
  }>({
    action: "Initial shopping list loaded & budget calculated",
    previousTotal: 0,
    newTotal: 332,
    timestamp: "Ready",
  });

  // Agent & UI state
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isExecutingCommand, setIsExecutingCommand] = useState<boolean>(false);
  const [agentInstruction, setAgentInstruction] = useState<string>("");
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentActionLog[]>([
    {
      id: "log-init",
      timestamp: "Initial Curation",
      instruction:
        "CUJ Task 1 → 2: Convert Autumn Harvest Dinner Party intent (12 guests · $360 budget) into CymbalMart list",
      agentMessage:
        "Selected 8 ready-to-serve CymbalMart SKUs across 4 departments totaling $332.00 ($28.00 under budget).",
      changeHighlights: [
        "Scaled Artisanal Deli grazing platters to 150g per guest (2 platters)",
        "Paired zero-proof Blood Orange Spritz mixer with Sommelier 2-pack wines",
      ],
      subtotalBefore: 0,
      subtotalAfter: 332,
    },
  ]);

  // CymbalMart Assistant Chatbot State (Open by default so customers can interact immediately)
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      text: "Hello! I'm your CymbalMart Assistant. Ask me to add, swap, or update items in your shopping list—I will automatically recalculate your budget totals in real time.",
      timestamp: "Just now",
      suggestedFollowUps: [
        "Swap wine for sparkling apple cider to lower my budget",
        "Add 2 packs of compostable dessert plates",
        "Which items in my list are Gluten-Free?",
      ],
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // CUJ Task 2: Review List & Align Budget filters + Always-Visible Quick Add Item state
  const [selectedDepartment, setSelectedDepartment] = useState<
    "All" | CymbalDepartment
  >("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemDept, setNewItemDept] =
    useState<CymbalDepartment>("Food & Grazing");
  const [newItemPrice, setNewItemPrice] = useState<string>("16");
  const [newItemQty, setNewItemQty] = useState<string>("2");
  const [newItemUnit, setNewItemUnit] = useState<string>("packs");
  const [newItemAisle, setNewItemAisle] = useState<string>(
    "Aisle 4 · CymbalMart Market"
  );

  // CUJ Task 3: Refine & Checkout state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [addedBundleId, setAddedBundleId] = useState<string | null>(null);
  const [fulfillmentMode, setFulfillmentMode] = useState<
    "Curbside Express Pickup" | "2-Hour Local Courier"
  >("Curbside Express Pickup");
  const [hostName, setHostName] = useState<string>("Alex Rivera");
  const [storeOrAddress, setStoreOrAddress] = useState<string>(
    "CymbalMart Midtown Flagship · Bay 4"
  );
  const [pickupWindow, setPickupWindow] = useState<string>(
    "Today · 4:30 PM – 5:30 PM"
  );
  const [orderConfirmed, setOrderConfirmed] = useState<{
    orderNumber: string;
    hostName: string;
    fulfillmentMode: string;
    pickupWindow: string;
    total: number;
    itemCount: number;
  } | null>(null);

  // Helper to compute total for any items array
  const computeCartSubtotal = (list: ShoppingItem[]) =>
    list
      .filter((item) => item.includedInCart !== false)
      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Automatically Recalculated Budget & Cart Metrics
  const activeCartItems = useMemo(
    () => items.filter((item) => item.includedInCart !== false),
    [items]
  );

  const pausedItemsCount = useMemo(
    () => items.filter((item) => item.includedInCart === false).length,
    [items]
  );

  const totalUnitsCount = useMemo(
    () => activeCartItems.reduce((sum, item) => sum + item.quantity, 0),
    [activeCartItems]
  );

  const subtotal = useMemo(
    () =>
      activeCartItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      ),
    [activeCartItems]
  );

  const budgetDelta = brief.budget - subtotal;
  const isOverBudget = budgetDelta < 0;
  const budgetUtilizationPct =
    brief.budget > 0
      ? Math.min(100, Math.round((subtotal / brief.budget) * 100))
      : 0;
  const costPerGuest = brief.guestCount > 0 ? subtotal / brief.guestCount : 0;

  const departmentTotals = useMemo(() => {
    const map: Record<CymbalDepartment, number> = {
      "Food & Grazing": 0,
      "Beverages & Mixers": 0,
      "Tableware & Decor": 0,
      "Host & Party Essentials": 0,
    };
    for (const item of activeCartItems) {
      const dept = DEPARTMENTS.includes(item.category)
        ? item.category
        : "Food & Grazing";
      map[dept] += item.unitPrice * item.quantity;
    }
    return map;
  }, [activeCartItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesDept =
        selectedDepartment === "All" || item.category === selectedDepartment;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.aisle.toLowerCase().includes(q) ||
        item.dietaryNotes.toLowerCase().includes(q);
      return matchesDept && matchesQuery;
    });
  }, [items, selectedDepartment, searchQuery]);

  // Central state updater that mutates the shopping list and automatically recalculates all budget totals
  const applyItemsWithRecalculation = (
    updater: (prev: ShoppingItem[]) => ShoppingItem[],
    actionDescription: string
  ) => {
    setItems((prev) => {
      const previousTotal = computeCartSubtotal(prev);
      const next = updater(prev);
      const newTotal = computeCartSubtotal(next);
      setRecalcCount((c) => c + 1);
      setLastRecalcNotice({
        action: actionDescription,
        previousTotal,
        newTotal,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
      return next;
    });
  };

  // Handlers
  const handleToggleDietary = (tag: string) => {
    setBrief((prev) => {
      const exists = prev.dietary.includes(tag);
      return {
        ...prev,
        dietary: exists
          ? prev.dietary.filter((t) => t !== tag)
          : [...prev.dietary, tag],
      };
    });
  };

  const handleScaleGuestCount = (newCount: number) => {
    const clamped = Math.max(2, Math.min(120, newCount));
    const ratio = clamped / Math.max(1, brief.guestCount);
    setBrief((prev) => ({ ...prev, guestCount: clamped }));

    applyItemsWithRecalculation(
      (prevItems) =>
        prevItems.map((item) => {
          if (
            item.category === "Food & Grazing" ||
            item.category === "Beverages & Mixers"
          ) {
            const scaledQty = Math.max(1, Math.round(item.quantity * ratio));
            return {
              ...item,
              quantity: scaledQty,
              agentStatus:
                scaledQty !== item.quantity ? "modified" : item.agentStatus,
            };
          }
          return item;
        }),
      `Scaled Food & Beverage quantities for ${clamped} guests`
    );
  };

  // One-click client-side budget alignment helper for busy hosts
  const handleQuickAlignToBudget = () => {
    const prevSubtotal = subtotal;
    let runningTotal = subtotal;

    const adjusted = items.map((item) => {
      if (runningTotal <= brief.budget) return item;
      if (
        item.priority === "Optional Upgrade" &&
        item.includedInCart !== false
      ) {
        runningTotal -= item.unitPrice * item.quantity;
        return {
          ...item,
          includedInCart: false,
          agentStatus: "modified" as const,
        };
      }
      if (
        runningTotal > brief.budget &&
        item.priority === "Recommended" &&
        item.quantity > 1 &&
        item.includedInCart !== false
      ) {
        runningTotal -= item.unitPrice;
        return {
          ...item,
          quantity: item.quantity - 1,
          agentStatus: "modified" as const,
        };
      }
      return item;
    });

    setItems(adjusted);
    setRecalcCount((c) => c + 1);
    setLastRecalcNotice({
      action: `Auto-aligned list to $${brief.budget.toFixed(2)} budget ceiling`,
      previousTotal: prevSubtotal,
      newTotal: runningTotal,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    });

    setAgentLogs((prev) => [
      {
        id: `log-align-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        instruction: `Quick Budget Alignment ($${brief.budget.toFixed(2)} Target)`,
        agentMessage: `Aligned shopping list from $${prevSubtotal.toFixed(2)} to $${runningTotal.toFixed(2)} by pausing optional upgrades and right-sizing recommended packs.`,
        changeHighlights: [
          `New cart total: $${runningTotal.toFixed(2)} ($${(brief.budget - runningTotal).toFixed(2)} remaining budget)`,
        ],
        subtotalBefore: prevSubtotal,
        subtotalAfter: runningTotal,
      },
      ...prev,
    ]);
  };

  // CUJ Task 1 -> Task 2: Convert Event Definition into Curated CymbalMart List
  const handleGenerateFullPlan = async (customBrief?: PartyBrief) => {
    const targetBrief = customBrief || brief;
    setIsGeneratingPlan(true);
    setAgentError(null);
    const prevSubtotal = subtotal;

    try {
      const response = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetBrief),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(
          data.error || "Failed to generate CymbalMart shopping list."
        );
      }

      const normalizedItems: ShoppingItem[] = (data.items || []).map(
        (raw: ShoppingItem, idx: number) => ({
          ...raw,
          id: raw.id || `cm-item-${Date.now()}-${idx}`,
          sku: raw.sku || `CM-${4100 + idx * 17}`,
          category: DEPARTMENTS.includes(raw.category as CymbalDepartment)
            ? (raw.category as CymbalDepartment)
            : "Food & Grazing",
          priority: (
            ["Essential", "Recommended", "Optional Upgrade"].includes(
              raw.priority
            )
              ? raw.priority
              : "Essential"
          ) as ItemPriority,
          includedInCart: true,
          agentStatus: "added",
        })
      );

      const newSubtotal = computeCartSubtotal(normalizedItems);

      setItems(normalizedItems);
      setRecalcCount((c) => c + 1);
      setLastRecalcNotice({
        action: `Generated new curated list for ${targetBrief.theme}`,
        previousTotal: prevSubtotal,
        newTotal: newSubtotal,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });

      if (data.summary) setCurationSummary(data.summary);
      if (Array.isArray(data.timeline) && data.timeline.length > 0) {
        setTimeline(data.timeline);
      }

      setActiveStage("review");

      setAgentLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          instruction: `CUJ Task 1 (Define Event): ${targetBrief.theme} (${targetBrief.guestCount} guests · $${targetBrief.budget} budget)`,
          agentMessage:
            data.summary ||
            `Curated ${normalizedItems.length} CymbalMart items totaling $${newSubtotal.toFixed(2)}.`,
          changeHighlights: [
            `Curated ${normalizedItems.length} CymbalMart SKUs across 4 store departments`,
            `Per-guest spend calibrated to $${(newSubtotal / Math.max(1, targetBrief.guestCount)).toFixed(2)}/guest`,
          ],
          subtotalBefore: prevSubtotal,
          subtotalAfter: newSubtotal,
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to reach CymbalMart Shopping Agent.";
      setAgentError(msg);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // CUJ Task 2 -> Task 3: Refine List for Constraints via Gemini Agent
  const handleRunAgentCommand = async (promptText?: string) => {
    const commandToRun = (promptText ?? agentInstruction).trim();
    if (!commandToRun) return;

    setIsExecutingCommand(true);
    setAgentError(null);
    const prevSubtotal = subtotal;

    try {
      const response = await fetch("/api/agent/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: commandToRun,
          partyType: brief.partyType,
          theme: brief.theme,
          guestCount: brief.guestCount,
          budget: brief.budget,
          dietary: brief.dietary,
          specialRequests: brief.specialRequests,
          currentItems: items,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Agent refinement failed.");
      }

      const updatedItems: ShoppingItem[] = (data.items || []).map(
        (raw: ShoppingItem, idx: number) => ({
          ...raw,
          id: raw.id || `cmd-item-${Date.now()}-${idx}`,
          sku: raw.sku || `CM-${5100 + idx * 13}`,
          category: DEPARTMENTS.includes(raw.category as CymbalDepartment)
            ? (raw.category as CymbalDepartment)
            : "Food & Grazing",
          priority: (
            ["Essential", "Recommended", "Optional Upgrade"].includes(
              raw.priority
            )
              ? raw.priority
              : "Essential"
          ) as ItemPriority,
          includedInCart: true,
        })
      );

      const newSubtotal = computeCartSubtotal(updatedItems);

      setItems(updatedItems);
      setRecalcCount((c) => c + 1);
      setLastRecalcNotice({
        action: `Agent refined list: "${commandToRun}"`,
        previousTotal: prevSubtotal,
        newTotal: newSubtotal,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });

      if (
        typeof data.updatedGuestCount === "number" &&
        data.updatedGuestCount > 0
      ) {
        setBrief((prev) => ({ ...prev, guestCount: data.updatedGuestCount }));
      }
      if (typeof data.updatedBudget === "number" && data.updatedBudget > 0) {
        setBrief((prev) => ({ ...prev, budget: data.updatedBudget }));
      }
      if (data.agentMessage) {
        setCurationSummary(data.agentMessage);
      }

      setActiveStage("checkout");

      setAgentLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          instruction: `CUJ Task 3 (Refine): ${commandToRun}`,
          agentMessage: data.agentMessage,
          changeHighlights: Array.isArray(data.changeHighlights)
            ? data.changeHighlights
            : ["Adjusted CymbalMart quantities and product selections."],
          subtotalBefore: prevSubtotal,
          subtotalAfter: newSubtotal,
        },
        ...prev,
      ]);
      setAgentInstruction("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to process CymbalMart agent refinement.";
      setAgentError(msg);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // CymbalMart Assistant Chatbot Handler
  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatInput("");
    setIsChatLoading(true);
    const prevSubtotal = subtotal;

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          brief,
          currentItems: items,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(
          data.error || "CymbalMart Assistant could not process your message."
        );
      }

      let cartSummaryText: string | undefined = undefined;

      if (
        data.didModifyCart &&
        Array.isArray(data.updatedItems) &&
        data.updatedItems.length > 0
      ) {
        const normalized: ShoppingItem[] = data.updatedItems.map(
          (raw: ShoppingItem, idx: number) => ({
            ...raw,
            id: raw.id || `chat-item-${Date.now()}-${idx}`,
            sku: raw.sku || `CM-${6100 + idx * 11}`,
            category: DEPARTMENTS.includes(raw.category as CymbalDepartment)
              ? (raw.category as CymbalDepartment)
              : "Food & Grazing",
            priority: (
              ["Essential", "Recommended", "Optional Upgrade"].includes(
                raw.priority
              )
                ? raw.priority
                : "Essential"
            ) as ItemPriority,
            includedInCart: true,
          })
        );

        const newSubtotal = computeCartSubtotal(normalized);
        setItems(normalized);
        setRecalcCount((c) => c + 1);
        setLastRecalcNotice({
          action: `CymbalMart Assistant updated shopping list`,
          previousTotal: prevSubtotal,
          newTotal: newSubtotal,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        });

        cartSummaryText =
          data.cartActionSummary ||
          `Updated shopping list (${normalized.length} items · Recalculated Total: $${newSubtotal.toFixed(2)})`;

        setAgentLogs((prev) => [
          {
            id: `log-chat-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            instruction: `CymbalMart Assistant: ${textToSend}`,
            agentMessage: data.reply,
            changeHighlights: [cartSummaryText!],
            subtotalBefore: prevSubtotal,
            subtotalAfter: newSubtotal,
          },
          ...prev,
        ]);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cartActionSummary: cartSummaryText,
        suggestedFollowUps: Array.isArray(data.suggestedFollowUps)
          ? data.suggestedFollowUps
          : [],
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "CymbalMart Assistant is temporarily unavailable.";
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: `Sorry, I ran into an issue: ${msg}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Customer Shopping List Update Handlers (all automatically recalculate budget totals)
  const handleUpdateQuantity = (id: string, delta: number) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const nextQty = Math.max(1, target.quantity + delta);
    applyItemsWithRecalculation(
      (prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, quantity: nextQty, agentStatus: "modified" }
            : item
        ),
      `Updated quantity of "${target.name}" to ${nextQty} ${target.unit}`
    );
  };

  const handleSetExactQuantity = (id: string, rawValue: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const parsed = Math.max(1, Math.min(500, parseInt(rawValue, 10) || 1));
    applyItemsWithRecalculation(
      (prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, quantity: parsed, agentStatus: "modified" }
            : item
        ),
      `Set quantity of "${target.name}" to ${parsed} ${target.unit}`
    );
  };

  const handleSetUnitPrice = (id: string, rawPrice: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const parsed = Math.max(0.5, parseFloat(rawPrice) || 1);
    applyItemsWithRecalculation(
      (prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, unitPrice: parsed, agentStatus: "modified" }
            : item
        ),
      `Updated unit price of "${target.name}" to $${parsed.toFixed(2)}`
    );
  };

  const handleUpdateItemField = (
    id: string,
    fields: Partial<ShoppingItem>,
    description: string
  ) => {
    applyItemsWithRecalculation(
      (prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...fields, agentStatus: "modified" }
            : item
        ),
      description
    );
  };

  // 1-Click Value Swap for any row (reduces unit price by ~25% using CymbalMart Everyday Value brand)
  const handleSwapToValueOption = (item: ShoppingItem) => {
    const discountedPrice = Math.max(
      2,
      Math.round(item.unitPrice * 0.75 * 100) / 100
    );
    const updatedName = item.name.includes("(CymbalMart Value Pick)")
      ? item.name
      : `${item.name} (CymbalMart Value Pick)`;

    applyItemsWithRecalculation(
      (prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                name: updatedName,
                unitPrice: discountedPrice,
                agentStatus: "modified",
              }
            : row
        ),
      `Swapped "${item.name}" to CymbalMart Value Pick ($${discountedPrice.toFixed(2)}/${item.unit})`
    );
  };

  const handleToggleInclude = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const nextState = target.includedInCart === false ? true : false;
    applyItemsWithRecalculation(
      (prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, includedInCart: nextState } : item
        ),
      `${nextState ? "Included" : "Paused"} "${target.name}" in active cart`
    );
  };

  const handleToggleAllInclude = (includeAll: boolean) => {
    applyItemsWithRecalculation(
      (prev) => prev.map((item) => ({ ...item, includedInCart: includeAll })),
      includeAll
        ? "Included all shopping list items in active budget"
        : "Paused all items in shopping list"
    );
  };

  const handleRemoveItem = (id: string) => {
    const target = items.find((i) => i.id === id);
    applyItemsWithRecalculation(
      (prev) => prev.filter((item) => item.id !== id),
      `Removed "${target?.name || "item"}" from shopping list`
    );
  };

  const handleResetToBaselineList = () => {
    applyItemsWithRecalculation(
      () => INITIAL_SHOPPING_ITEMS,
      "Restored baseline CymbalMart shopping list"
    );
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const price = Math.max(1, parseFloat(newItemPrice) || 15);
    const qty = Math.max(1, parseInt(newItemQty, 10) || 1);

    const created: ShoppingItem = {
      id: `manual-${Date.now()}`,
      sku: `CM-${Math.floor(1000 + Math.random() * 8999)}`,
      name: newItemName.trim(),
      category: newItemDept,
      unitPrice: price,
      quantity: qty,
      unit: newItemUnit.trim() || "packs",
      scalingFormula: `Host custom addition for ${brief.guestCount} guests`,
      dietaryNotes: "Host Verified",
      aisle: newItemAisle.trim() || "Aisle 4 · CymbalMart Market",
      priority: "Essential",
      rationale: "Added directly by customer to shopping list.",
      includedInCart: true,
      agentStatus: "added",
    };

    applyItemsWithRecalculation(
      (prev) => [created, ...prev],
      `Added ${qty} ${created.unit} of "${created.name}" (+$${(price * qty).toFixed(2)})`
    );
    setNewItemName("");
  };

  const handleAddCuratedBundle = (bundle: CuratedBundle) => {
    const prevSubtotal = subtotal;
    const additions: ShoppingItem[] = bundle.itemsToAdd.map((entry, idx) => ({
      ...entry,
      id: `bundle-${bundle.id}-${Date.now()}-${idx}`,
      includedInCart: true,
      agentStatus: "added",
    }));

    const addedCost = additions.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0
    );

    applyItemsWithRecalculation(
      (prev) => [...additions, ...prev],
      `Added bundle "${bundle.title}" (+$${addedCost.toFixed(2)})`
    );

    setAgentLogs((prev) => [
      {
        id: `log-bundle-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        instruction: `Added CymbalMart Bundle: ${bundle.title}`,
        agentMessage: `Added ${bundle.title} (${bundle.category}) for +$${addedCost.toFixed(2)}.`,
        changeHighlights: additions.map(
          (a) =>
            `Added ${a.quantity} ${a.unit} ${a.name} [${a.sku}] ($${(
              a.unitPrice * a.quantity
            ).toFixed(2)})`
        ),
        subtotalBefore: prevSubtotal,
        subtotalAfter: prevSubtotal + addedCost,
      },
      ...prev,
    ]);

    setAddedBundleId(bundle.id);
    setTimeout(() => {
      setAddedBundleId((current) => (current === bundle.id ? null : current));
    }, 1800);
  };

  // Save finalized plan as "CymbalMart Shopping Agent.json" or ".csv"
  const handleSavePlanFile = (format: "json" | "csv" = "json") => {
    if (format === "json") {
      const payload = {
        agentName: "CymbalMart Shopping Agent",
        savedAt: new Date().toISOString(),
        criticalUserJourney: {
          user: "Busy hosts needing event planning",
          goal: "Convert intent into a curated, budget-conscious shopping list",
          eventBrief: brief,
          budgetSummary: {
            targetBudget: brief.budget,
            estimatedTotal: subtotal,
            budgetVariance: budgetDelta,
            costPerGuest: Number(costPerGuest.toFixed(2)),
          },
        },
        curationSummary,
        shoppingList: activeCartItems,
        prepTimeline: timeline,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "CymbalMart Shopping Agent.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        "SKU",
        "Department",
        "Product Name",
        "Aisle",
        "Quantity",
        "Unit",
        "Unit Price (USD)",
        "Line Total (USD)",
        "Per-Guest Scaling",
        "Dietary Notes",
        "Included In Cart",
      ];
      const rows = items.map((i) => [
        `"${i.sku}"`,
        `"${i.category}"`,
        `"${i.name.replace(/"/g, '""')}"`,
        `"${i.aisle}"`,
        i.quantity,
        `"${i.unit}"`,
        i.unitPrice.toFixed(2),
        (i.unitPrice * i.quantity).toFixed(2),
        `"${i.scalingFormula}"`,
        `"${i.dietaryNotes}"`,
        i.includedInCart !== false ? "Yes" : "Paused",
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "CymbalMart Shopping Agent.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  const handleCopyChecklist = () => {
    const lines = [
      `CYMBALMART SHOPPING AGENT — PARTY PLAN`,
      `Event: ${brief.partyType} (${brief.theme})`,
      `Guests: ${brief.guestCount} · Target Budget: $${brief.budget.toFixed(2)} · Cart Total: $${subtotal.toFixed(2)}`,
      ``,
      ...activeCartItems.map(
        (i) =>
          `[✓] ${i.sku} · ${i.quantity} ${i.unit} × ${i.name} — $${(
            i.unitPrice * i.quantity
          ).toFixed(2)} (${i.aisle})`
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderConfirmed({
      orderNumber: `CM-${Math.floor(10000 + Math.random() * 89999)}`,
      hostName: hostName.trim() || "Busy Host",
      fulfillmentMode,
      pickupWindow,
      total: subtotal,
      itemCount: totalUnitsCount,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
      {/* Top Bar Contract: Strictly 1 row, 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200/80">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="font-display text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
          >
            CymbalMart Shopping Agent
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
            <a
              href="#cuj-define"
              onClick={() => setActiveStage("define")}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              1. Define Event
            </a>
            <a
              href="#cuj-review"
              onClick={() => setActiveStage("review")}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              2. Update List & Budget
            </a>
            <a
              href="#cuj-refine"
              onClick={() => setActiveStage("checkout")}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              3. Refine & Checkout
            </a>
            <button
              type="button"
              onClick={() => setIsChatOpen((prev) => !prev)}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              CymbalMart Assistant
            </button>
          </nav>

          {/* Zone 3: 1 primary action button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveStage("checkout");
                setIsCheckoutOpen(true);
              }}
              className="inline-flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-stone-50 bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Finalize & Checkout</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                ${subtotal.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main
        id="top"
        className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8 space-y-12"
      >
        {/* CUJ Progress Stepper Bar (Interactive 3-Task Workflow Switcher) */}
        <div className="bg-white border border-stone-200/90 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveStage("define");
                document
                  .getElementById("cuj-define")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === "define"
                  ? "bg-stone-900 text-stone-50"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              Task 1: Define Event
            </button>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 hidden sm:inline shrink-0" />
            <button
              type="button"
              onClick={() => {
                setActiveStage("review");
                document
                  .getElementById("cuj-review")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === "review"
                  ? "bg-stone-900 text-stone-50"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              Task 2: Review & Update List (Auto-Recalculate Budget)
            </button>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 hidden sm:inline shrink-0" />
            <button
              type="button"
              onClick={() => {
                setActiveStage("checkout");
                document
                  .getElementById("cuj-refine")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === "checkout"
                  ? "bg-stone-900 text-stone-50"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              Task 3: Refine & Checkout
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>CymbalMart Assistant</span>
            </button>
            <button
              type="button"
              onClick={() => handleSavePlanFile("json")}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>
                {savedNotice
                  ? "Saved CymbalMart Shopping Agent"
                  : 'Save "CymbalMart Shopping Agent"'}
              </span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            CUJ TASK 1: DEFINE EVENT
            Define party type, theme, budget, guest count, and special requests
        ===================================================================== */}
        <section id="cuj-define" className="space-y-6 scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Task 1 Event Definition Studio */}
            <div className="lg:col-span-7 bg-white border border-stone-200/90 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span className="font-semibold text-stone-800">
                      CUJ Task 01 · Define Event
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Built for Busy Hosts</span>
                    <span aria-hidden="true">·</span>
                    <span>Live Budget Recalculation</span>
                  </div>
                  <h1
                    className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight leading-[1.15]"
                    style={{ textWrap: "balance" }}
                  >
                    Turn your party idea into a budget-aligned CymbalMart shopping list in seconds.
                  </h1>
                </div>

                {/* Preset Templates for Busy Hosts */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-500">
                    Quick-Start Busy Host Presets
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-lg">
                    {PARTY_TEMPLATES.map((tpl) => {
                      const isCurrent = brief.theme === tpl.brief.theme;
                      return (
                        <button
                          key={tpl.label}
                          type="button"
                          onClick={() => {
                            setBrief(tpl.brief);
                            handleGenerateFullPlan(tpl.brief);
                          }}
                          disabled={isGeneratingPlan}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isCurrent
                              ? "bg-white text-stone-900 shadow-xs"
                              : "text-stone-600 hover:text-stone-900"
                          }`}
                        >
                          {tpl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Party Type, Theme, Guest Count, Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="party-type-select"
                      className="block text-xs font-medium text-stone-600 mb-1.5"
                    >
                      Party Type
                    </label>
                    <select
                      id="party-type-select"
                      value={brief.partyType}
                      onChange={(e) =>
                        setBrief((prev) => ({
                          ...prev,
                          partyType: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 transition-colors"
                    >
                      {PARTY_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-6">
                    <label
                      htmlFor="theme-input"
                      className="block text-xs font-medium text-stone-600 mb-1.5"
                    >
                      Party Theme & Atmosphere
                    </label>
                    <input
                      id="theme-input"
                      type="text"
                      value={brief.theme}
                      onChange={(e) =>
                        setBrief((prev) => ({ ...prev, theme: e.target.value }))
                      }
                      placeholder="e.g., Warm Autumn Harvest, Street Taco Fiesta"
                      className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 transition-colors"
                    />
                  </div>

                  {/* Guest Count Stepper */}
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Guest Count (Auto-Scales Quantities & Totals)
                    </label>
                    <div className="flex items-center justify-between bg-[#FAF9F6] border border-stone-300 rounded-lg px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => handleScaleGuestCount(brief.guestCount - 2)}
                        aria-label="Decrease guest count"
                        className="w-7 h-7 flex items-center justify-center rounded text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-sm font-semibold tabular-nums text-stone-900">
                        {brief.guestCount} Guests
                      </span>
                      <button
                        type="button"
                        onClick={() => handleScaleGuestCount(brief.guestCount + 2)}
                        aria-label="Increase guest count"
                        className="w-7 h-7 flex items-center justify-center rounded text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Target Total Budget */}
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="budget-input"
                      className="block text-xs font-medium text-stone-600 mb-1.5"
                    >
                      Total Party Budget Ceiling (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-stone-500">
                        $
                      </span>
                      <input
                        id="budget-input"
                        type="number"
                        min={50}
                        max={10000}
                        step={10}
                        value={brief.budget}
                        onChange={(e) =>
                          setBrief((prev) => ({
                            ...prev,
                            budget: Math.max(40, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full pl-7 pr-4 py-2 font-mono text-sm tabular-nums bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Dietary & Guest Constraints */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-2">
                    Dietary Needs & Host Constraints
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DIETARY_PROTOCOLS.map((protocol) => {
                      const active = brief.dietary.includes(protocol);
                      return (
                        <button
                          key={protocol}
                          type="button"
                          onClick={() => handleToggleDietary(protocol)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? "bg-stone-900 text-stone-50 border-stone-900"
                              : "bg-[#FAF9F6] text-stone-700 border-stone-300 hover:border-stone-500"
                          }`}
                        >
                          {active ? `✓ ${protocol}` : protocol}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label
                    htmlFor="special-requests-input"
                    className="block text-xs font-medium text-stone-600 mb-1.5"
                  >
                    Special Requests (Prep Time Limits, Kids Table, Must-Have Dishes)
                  </label>
                  <input
                    id="special-requests-input"
                    type="text"
                    value={brief.specialRequests}
                    onChange={(e) =>
                      setBrief((prev) => ({
                        ...prev,
                        specialRequests: e.target.value,
                      }))
                    }
                    placeholder="e.g., Under 30 mins prep time, no-cook platters, include sparkling zero-proof drinks"
                    className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 transition-colors"
                  />
                </div>
              </div>

              {/* Convert Intent CTA */}
              <div className="pt-6 mt-6 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-stone-500">
                  Target spend:{" "}
                  <span className="font-mono font-semibold text-stone-800 tabular-nums">
                    ${(brief.budget / Math.max(1, brief.guestCount)).toFixed(2)}
                  </span>{" "}
                  per guest
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateFullPlan()}
                  disabled={isGeneratingPlan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-stone-50 bg-stone-900 rounded-lg hover:bg-stone-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isGeneratingPlan ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Curating CymbalMart List...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Convert Intent to Curated Shopping List</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Visual Showcase & Active Agent Summary */}
            <div className="lg:col-span-5 relative rounded-xl overflow-hidden border border-stone-200/90 min-h-[380px] flex flex-col justify-end bg-stone-900">
              <ResilientImage
                src={heroImage}
                alt="Curated CymbalMart dinner party tablescape"
                fallbackLabel="CymbalMart Event Showcase"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

              <div className="relative z-10 p-6 sm:p-8 text-stone-100 space-y-4">
                <div className="flex items-center gap-2 text-xs text-stone-300">
                  <span>{brief.partyType}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {brief.guestCount} Guests
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    ${costPerGuest.toFixed(2)} / guest
                  </span>
                </div>

                <h2
                  className="font-display text-2xl font-medium text-white leading-snug"
                  style={{ textWrap: "balance" }}
                >
                  {brief.theme}
                </h2>

                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                  {curationSummary}
                </p>

                <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-stone-300">
                  <span>CymbalMart Curated Fulfillment</span>
                  <span className="font-mono tabular-nums">
                    {activeCartItems.length} Active SKUs · {totalUnitsCount} Units
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Live Budget & Department Recalculation Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Recalculated Budget Total</span>
                <span className="font-mono tabular-nums">
                  Budget: ${brief.budget.toFixed(2)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  data-testid="budget-subtotal"
                  className="font-mono text-2xl font-semibold tabular-nums text-stone-900"
                >
                  ${subtotal.toFixed(2)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium font-mono tabular-nums ${
                    isOverBudget ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {isOverBudget ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>+${Math.abs(budgetDelta).toFixed(2)} Over</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>${budgetDelta.toFixed(2)} Under</span>
                    </>
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    isOverBudget ? "bg-red-700" : "bg-stone-900"
                  }`}
                  style={{ width: `${budgetUtilizationPct}%` }}
                />
              </div>
            </div>

            <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Recalculated Cost / Guest</span>
                <span className="font-mono tabular-nums">
                  {brief.guestCount} Guests
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-2xl font-semibold tabular-nums text-stone-900">
                  ${costPerGuest.toFixed(2)}
                </span>
                <span className="text-xs text-stone-500 font-mono tabular-nums">
                  Target: ${(brief.budget / Math.max(1, brief.guestCount)).toFixed(2)}/guest
                </span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                {totalUnitsCount} total units across {activeCartItems.length} SKUs
              </div>
            </div>

            <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Department Breakdown</span>
                <span className="font-mono tabular-nums">
                  {subtotal > 0
                    ? Math.round(
                        ((departmentTotals["Food & Grazing"] +
                          departmentTotals["Beverages & Mixers"]) /
                          subtotal) *
                          100
                      )
                    : 0}
                  % Culinary
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-2xl font-semibold tabular-nums text-stone-900">
                  $
                  {(
                    departmentTotals["Food & Grazing"] +
                    departmentTotals["Beverages & Mixers"]
                  ).toFixed(2)}
                </span>
                <span className="text-xs text-stone-500 font-mono tabular-nums">
                  Decor: $
                  {(
                    departmentTotals["Tableware & Decor"] +
                    departmentTotals["Host & Party Essentials"]
                  ).toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-stone-500">
                Recalculates live on every item edit
              </div>
            </div>

            <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Save or Export Plan</span>
                <span className="font-mono tabular-nums">
                  {pausedItemsCount > 0
                    ? `${pausedItemsCount} Paused`
                    : "All Included"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSavePlanFile("json")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-900 bg-stone-100 rounded-md hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePlanFile("csv")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-900 bg-stone-100 rounded-md hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyChecklist}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 rounded-md hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedNotice ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            CUJ TASK 2 & 3: UPDATE SHOPPING LIST & AUTOMATICALLY RECALCULATE BUDGET TOTALS
        ===================================================================== */}
        <section id="cuj-review" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/90 pb-4">
            <div className="space-y-1">
              <div className="text-xs text-stone-500">
                <span>
                  CUJ Task 02 & 03 · Update Shopping List & Automatically Recalculate Budget Totals
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900">
                Update Shopping List & Live Budget Totals
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOverBudget && (
                <button
                  type="button"
                  onClick={handleQuickAlignToBudget}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-950 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Auto-Align List to ${brief.budget} Budget</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetToBaselineList}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Baseline List</span>
              </button>
            </div>
          </div>

          {/* Live Automatic Budget Recalculation Dashboard */}
          <div className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Calculator className="w-4 h-4 text-stone-700 shrink-0" />
                  <span className="font-semibold text-stone-900">
                    Automatic Budget Recalculation Active (Recalculation #{recalcCount})
                  </span>
                  <span aria-hidden="true" className="text-stone-400">
                    ·
                  </span>
                  <span className="text-stone-600">
                    Any update to item quantities, unit prices, names, or cart inclusion automatically recalculates all budget totals.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-emerald-800 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    [{lastRecalcNotice.timestamp}] {lastRecalcNotice.action} →
                    Recalculated Subtotal: ${subtotal.toFixed(2)} · Remaining Budget:{" "}
                    {budgetDelta >= 0
                      ? `$${budgetDelta.toFixed(2)} Under`
                      : `$${Math.abs(budgetDelta).toFixed(2)} Over`}
                  </span>
                </div>
              </div>

              {/* Inline Target Budget Ceiling Adjuster */}
              <div className="flex flex-wrap items-center gap-3 shrink-0 bg-[#FAF9F6] px-3.5 py-2 rounded-lg border border-stone-200/90">
                <label
                  htmlFor="inline-budget-slider"
                  className="text-xs font-medium text-stone-600 whitespace-nowrap"
                >
                  Target Budget Ceiling:
                </label>
                <input
                  id="inline-budget-slider"
                  type="range"
                  min={100}
                  max={1200}
                  step={10}
                  value={brief.budget}
                  onChange={(e) =>
                    setBrief((prev) => ({
                      ...prev,
                      budget: Number(e.target.value),
                    }))
                  }
                  className="w-28 accent-stone-900 cursor-pointer"
                />
                <span className="font-mono text-xs font-semibold tabular-nums text-stone-900 min-w-[3.5rem] text-right">
                  ${brief.budget.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Department Spend Allocation Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-200/70">
              {DEPARTMENTS.map((dept) => {
                const deptAmount = departmentTotals[dept];
                const sharePct =
                  subtotal > 0 ? Math.round((deptAmount / subtotal) * 100) : 0;
                return (
                  <div
                    key={dept}
                    className="flex items-center justify-between text-xs bg-[#FAF9F6] px-3 py-2 rounded-lg border border-stone-200/60"
                  >
                    <span className="text-stone-600 truncate pr-2">{dept}</span>
                    <span className="font-mono font-semibold text-stone-900 tabular-nums shrink-0">
                      ${deptAmount.toFixed(2)} ({sharePct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Always-Visible "Add Item to Shopping List" Bar */}
          <form
            onSubmit={handleAddManualItem}
            className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-900">
                Add Item to Shopping List (Automatically Recalculates Budget Totals)
              </span>
              <span className="text-xs text-stone-500 font-mono tabular-nums">
                Line Preview: $
                {(
                  (parseFloat(newItemPrice) || 0) *
                  (parseInt(newItemQty, 10) || 0)
                ).toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label
                  htmlFor="add-item-name"
                  className="block text-[11px] text-stone-600 mb-1"
                >
                  Product Name
                </label>
                <input
                  id="add-item-name"
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., CymbalMart Sparkling Apple Cider 4-Pack"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>
              <div className="sm:col-span-3">
                <label
                  htmlFor="add-item-dept"
                  className="block text-[11px] text-stone-600 mb-1"
                >
                  Department
                </label>
                <select
                  id="add-item-dept"
                  value={newItemDept}
                  onChange={(e) =>
                    setNewItemDept(e.target.value as CymbalDepartment)
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label
                  htmlFor="add-item-qty"
                  className="block text-[11px] text-stone-600 mb-1"
                >
                  Quantity
                </label>
                <input
                  id="add-item-qty"
                  type="number"
                  min={1}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="w-full px-2.5 py-2 font-mono text-xs tabular-nums bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="add-item-price"
                  className="block text-[11px] text-stone-600 mb-1"
                >
                  Unit Price ($)
                </label>
                <input
                  id="add-item-price"
                  type="number"
                  min={0.5}
                  step="0.5"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="w-full px-2.5 py-2 font-mono text-xs tabular-nums bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900"
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to List</span>
                </button>
              </div>
            </div>
          </form>

          {/* Department Filter Tabs & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedDepartment("All")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedDepartment === "All"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                All Departments ({items.length})
              </button>
              {DEPARTMENTS.map((dept) => {
                const count = items.filter((i) => i.category === dept).length;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedDepartment === dept
                        ? "bg-white text-stone-900 shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {dept} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleToggleAllInclude(pausedItemsCount > 0 ? true : false)
                }
                className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {pausedItemsCount > 0 ? "Include All Items" : "Pause All Items"}
              </button>

              <div className="relative min-w-[230px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SKU, product, aisle..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Curated CymbalMart Shopping List Table with Direct Inline Editing */}
          <div className="bg-white border border-stone-200/90 rounded-xl overflow-hidden">
            {isGeneratingPlan ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-12 bg-stone-100 animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-sm text-stone-600">
                  No CymbalMart items match your current department or search filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepartment("All");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 text-xs font-medium text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200/90 text-[11px] font-semibold text-stone-500 bg-[#FAF9F6]">
                      <th className="py-3 pl-5 pr-2 w-12">In Cart</th>
                      <th className="py-3 px-4">
                        Shopping List Item (Click Name or Department to Update)
                      </th>
                      <th className="py-3 px-4 hidden lg:table-cell">
                        Guest Scaling & Value Swap
                      </th>
                      <th className="py-3 px-4 text-right">
                        Unit Price ($)
                      </th>
                      <th className="py-3 px-4 text-center">
                        Quantity
                      </th>
                      <th className="py-3 px-4 text-right">Line Total</th>
                      <th className="py-3 pl-2 pr-5 text-right w-14">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 text-sm">
                    {filteredItems.map((item) => {
                      const included = item.includedInCart !== false;
                      const lineTotal = item.unitPrice * item.quantity;

                      return (
                        <tr
                          key={item.id}
                          className={`group transition-colors hover:bg-stone-50/90 ${
                            !included ? "bg-stone-50/50 opacity-55" : ""
                          }`}
                        >
                          <td className="py-4 pl-5 pr-2 align-top">
                            <button
                              type="button"
                              onClick={() => handleToggleInclude(item.id)}
                              aria-label={`Toggle ${item.name} in CymbalMart cart`}
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer mt-1 ${
                                included
                                  ? "bg-stone-900 border-stone-900 text-white"
                                  : "border-stone-300 hover:border-stone-600 bg-white"
                              }`}
                            >
                              {included && <Check className="w-3.5 h-3.5" />}
                            </button>
                          </td>

                          <td className="py-4 px-4 align-top max-w-md">
                            <div className="space-y-1.5">
                              {/* Direct Inline Editable Item Name */}
                              <input
                                type="text"
                                value={item.name}
                                aria-label={`Edit name for ${item.name}`}
                                onChange={(e) =>
                                  handleUpdateItemField(
                                    item.id,
                                    { name: e.target.value },
                                    `Renamed item to "${e.target.value}"`
                                  )
                                }
                                className={`w-full font-medium text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-stone-900 focus:bg-[#FAF9F6] px-1 py-0.5 rounded-xs focus:outline-none transition-colors ${
                                  !included ? "line-through text-stone-500" : ""
                                }`}
                              />

                              {/* Zero-Pill Metadata Discipline: Clean unboxed inline text with · separators */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 px-1">
                                <span className="font-mono text-stone-700">
                                  {item.sku}
                                </span>
                                <span aria-hidden="true">·</span>
                                <select
                                  value={item.category}
                                  aria-label={`Department for ${item.name}`}
                                  onChange={(e) =>
                                    handleUpdateItemField(
                                      item.id,
                                      {
                                        category: e.target
                                          .value as CymbalDepartment,
                                      },
                                      `Changed department of "${item.name}" to ${e.target.value}`
                                    )
                                  }
                                  className="text-stone-700 font-medium bg-transparent hover:underline focus:outline-none cursor-pointer"
                                >
                                  {DEPARTMENTS.map((d) => (
                                    <option key={d} value={d}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                                <span aria-hidden="true">·</span>
                                <span>{item.aisle}</span>
                                <span aria-hidden="true">·</span>
                                <span>{item.dietaryNotes}</span>
                                <span aria-hidden="true">·</span>
                                <span>{item.priority}</span>
                                {item.agentStatus &&
                                  item.agentStatus !== "unchanged" && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-amber-800 font-medium">
                                        {item.agentStatus === "added"
                                          ? "Added"
                                          : "Updated"}
                                      </span>
                                    </>
                                  )}
                              </div>

                              <p className="text-xs text-stone-600 leading-relaxed px-1">
                                {item.rationale}
                              </p>
                            </div>
                          </td>

                          <td className="py-4 px-4 align-top hidden lg:table-cell space-y-2">
                            <span className="font-mono text-xs text-stone-600 tabular-nums block">
                              {item.scalingFormula}
                            </span>
                            {!item.name.includes("(CymbalMart Value Pick)") && (
                              <button
                                type="button"
                                onClick={() => handleSwapToValueOption(item)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:underline cursor-pointer"
                              >
                                <ArrowDownRight className="w-3 h-3" />
                                <span>
                                  Swap to Value Pick (-25% · Save $
                                  {(
                                    item.unitPrice *
                                    0.25 *
                                    item.quantity
                                  ).toFixed(2)}
                                  )
                                </span>
                              </button>
                            )}
                          </td>

                          {/* Direct Editable Unit Price Input */}
                          <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <span className="font-mono text-xs text-stone-400">
                                $
                              </span>
                              <input
                                type="number"
                                min={0.5}
                                step={0.5}
                                aria-label={`Unit price for ${item.name}`}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleSetUnitPrice(item.id, e.target.value)
                                }
                                className="w-16 px-2 py-1 text-right font-mono text-xs font-medium tabular-nums bg-[#FAF9F6] border border-stone-300 rounded-md text-stone-900 focus:outline-none focus:border-stone-900"
                              />
                              <span className="font-mono text-[11px] text-stone-500">
                                /{item.unit}
                              </span>
                            </div>
                          </td>

                          {/* Stepper + Direct Numeric Quantity Input */}
                          <td className="py-4 px-4 align-top">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                aria-label={`Decrease quantity for ${item.name}`}
                                className="w-6 h-6 rounded border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={500}
                                aria-label={`Quantity for ${item.name}`}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleSetExactQuantity(item.id, e.target.value)
                                }
                                className="w-12 px-1 py-1 text-center font-mono text-xs font-semibold tabular-nums bg-[#FAF9F6] border border-stone-300 rounded-md text-stone-900 focus:outline-none focus:border-stone-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                aria-label={`Increase quantity for ${item.name}`}
                                className="w-6 h-6 rounded border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          <td className="py-4 px-4 align-top text-right font-mono text-sm font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                            {included ? `$${lineTotal.toFixed(2)}` : "$0.00"}
                          </td>

                          <td className="py-4 pl-2 pr-5 align-top text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label={`Remove ${item.name}`}
                              className="p-1.5 text-stone-400 hover:text-red-700 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-stone-200/90 bg-[#FAF9F6] text-xs">
                      <td colSpan={3} className="py-3.5 pl-5 pr-4 text-stone-600">
                        {activeCartItems.length} of {items.length} items active (
                        <span className="font-mono font-semibold tabular-nums text-stone-900">
                          {totalUnitsCount}
                        </span>{" "}
                        total units) ·{" "}
                        <span className="font-mono font-semibold tabular-nums text-stone-900">
                          ${costPerGuest.toFixed(2)}
                        </span>
                        /guest
                      </td>
                      <td
                        colSpan={2}
                        className="py-3.5 px-4 text-right font-medium text-stone-600"
                      >
                        Recalculated Budget Total:
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-base font-semibold text-stone-900 tabular-nums">
                        ${subtotal.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* CUJ Task 3: Refine & Adjust Constraints with CymbalMart Agent Co-Pilot */}
          <div
            id="cuj-refine"
            className="bg-white border border-stone-200/90 rounded-xl p-5 space-y-4 scroll-mt-24"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-medium text-stone-800">
                CUJ Task 3 — AI Constraint Refinement: Ask the CymbalMart Agent to rebalance the list or swap items for your budget:
              </div>
              <span className="text-xs text-stone-500 font-mono tabular-nums">
                Active Cart: ${subtotal.toFixed(2)} / ${brief.budget.toFixed(2)} budget
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunAgentCommand();
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={agentInstruction}
                onChange={(e) => setAgentInstruction(e.target.value)}
                disabled={isExecutingCommand}
                placeholder='e.g., "Bring total under $260 using CymbalMart value picks" or "Add nut-free kids snacks for 4 children"'
                className="flex-1 px-4 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 transition-colors"
              />
              <button
                type="submit"
                disabled={isExecutingCommand || !agentInstruction.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-stone-50 bg-stone-900 rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isExecutingCommand ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Refining CymbalMart List...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Refine Shopping List</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Constraint Refinement Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-stone-500 mr-1">
                One-Click Refinements:
              </span>
              {QUICK_REFINEMENT_PROMPTS.map((qPrompt) => (
                <button
                  key={qPrompt}
                  type="button"
                  disabled={isExecutingCommand}
                  onClick={() => handleRunAgentCommand(qPrompt)}
                  className="px-2.5 py-1 text-xs text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {qPrompt}
                </button>
              ))}
            </div>

            {agentError && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                  <span>{agentError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAgentError(null)}
                  className="text-red-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Step 3 Checkout & Save Action Banner */}
          <div className="bg-white border border-stone-200/90 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-stone-900">
                Ready to Finalize Your CymbalMart Party Plan?
              </div>
              <p className="text-xs text-stone-600">
                Save your curated plan as{" "}
                <span className="font-mono text-stone-800">
                  "CymbalMart Shopping Agent"
                </span>{" "}
                or proceed directly to CymbalMart Curbside Pickup & Local Delivery checkout.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSavePlanFile("json")}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Save "CymbalMart Shopping Agent"</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStage("checkout");
                  setIsCheckoutOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-stone-50 bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Proceed to Checkout · ${subtotal.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: Curated CymbalMart One-Click Party Bundles */}
        <section id="curated-bundles" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/90 pb-4">
            <div className="space-y-1">
              <div className="text-xs text-stone-500">
                <span>Time-Saving CymbalMart Bundles</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900">
                Ready-to-Serve Party Kits for Busy Hosts
              </h2>
            </div>
            <p className="text-xs text-stone-500 max-w-md">
              Bundled CymbalMart platters, zero-proof spritz bars, and tabletop kits priced 15% below individual SKU purchase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CURATED_BUNDLES.map((bundle) => {
              const isJustAdded = addedBundleId === bundle.id;
              return (
                <article
                  key={bundle.id}
                  className="bg-white border border-stone-200/90 rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-stone-100 overflow-hidden border-b border-stone-200/60">
                      <ResilientImage
                        src={bundle.imageUrl}
                        alt={bundle.title}
                        fallbackLabel={bundle.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-6 space-y-3">
                      <div className="text-xs text-stone-500">
                        <span>{bundle.subtitle}</span>
                      </div>

                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-base font-semibold text-stone-900 leading-snug">
                          {bundle.title}
                        </h3>
                        <span className="font-mono text-sm font-semibold tabular-nums text-stone-900 shrink-0">
                          ${bundle.price.toFixed(0)}
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">
                        {bundle.description}
                      </p>

                      <div className="pt-1 text-xs font-mono text-stone-500 tabular-nums">
                        {bundle.servingScale}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-2">
                    <button
                      type="button"
                      onClick={() => handleAddCuratedBundle(bundle)}
                      className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isJustAdded
                          ? "bg-emerald-800 text-white"
                          : "bg-stone-900 text-stone-50 hover:bg-stone-800"
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added & Budget Recalculated</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Bundle to List · ${bundle.price}</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* SECTION 4: Busy-Host Prep Timeline & Agent Refinement Audit Trail */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-4">
            <div className="border-b border-stone-200/90 pb-3 space-y-1">
              <div className="text-xs text-stone-500">
                <span>Low-Stress Host Checklist</span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-stone-900">
                Busy-Host Prep & Staging Timeline
              </h2>
            </div>

            <div className="bg-white border border-stone-200/90 rounded-xl divide-y divide-stone-200/70">
              {timeline.map((step, index) => (
                <div key={index} className="p-5 flex items-start gap-4">
                  <div className="w-32 shrink-0">
                    <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums block">
                      {step.timeOffset}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {step.category}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                    {step.task}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="border-b border-stone-200/90 pb-3 space-y-1">
              <div className="text-xs text-stone-500">
                <span>CUJ Refinement History</span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-stone-900">
                CymbalMart Agent Budget & Constraint Log
              </h2>
            </div>

            <div className="bg-white border border-stone-200/90 rounded-xl divide-y divide-stone-200/70">
              {agentLogs.map((log) => {
                const diff = log.subtotalAfter - log.subtotalBefore;
                return (
                  <div key={log.id} className="p-5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                      <span className="font-medium text-stone-900">
                        {log.instruction}
                      </span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span>{log.timestamp}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-stone-900 font-semibold">
                          ${log.subtotalAfter.toFixed(2)}
                        </span>
                        {log.subtotalBefore > 0 && (
                          <span
                            className={
                              diff <= 0 ? "text-emerald-700" : "text-stone-600"
                            }
                          >
                            ({diff >= 0 ? "+" : ""}
                            ${diff.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      {log.agentMessage}
                    </p>

                    {log.changeHighlights.length > 0 && (
                      <ul className="space-y-1 pt-1 text-xs text-stone-500 font-mono">
                        {log.changeHighlights.map((highlight, idx) => (
                          <li key={idx}>· {highlight}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="mt-16 border-t border-stone-200/80 bg-white">
        <div className="max-w-[1360px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            <span className="font-display font-semibold text-stone-900">
              CymbalMart Shopping Agent
            </span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span>Party Planner Shopping Agent & CymbalMart Assistant</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Open CymbalMart Assistant
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => handleSavePlanFile("json")}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Save "CymbalMart Shopping Agent.json"
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              CymbalMart Checkout
            </button>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          CYMBALMART ASSISTANT CHATBOT WIDGET (Interactive Customer Chat)
      ===================================================================== */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isChatOpen ? (
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="inline-flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-stone-50 bg-stone-900 rounded-xl shadow-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer border border-stone-700"
          >
            <MessageSquare className="w-4 h-4" />
            <span>CymbalMart Assistant</span>
          </button>
        ) : (
          <aside
            aria-label="CymbalMart Assistant Chatbot"
            className="w-[360px] sm:w-[400px] h-[500px] max-h-[78vh] bg-white border border-stone-300 rounded-xl shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Chatbot Header */}
            <div className="px-4 py-3.5 bg-stone-900 text-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-stone-300 shrink-0" />
                <div>
                  <h3 className="text-xs font-semibold tracking-tight text-white">
                    CymbalMart Assistant
                  </h3>
                  <p className="text-[11px] text-stone-300">
                    Live Cart Updates & Budget Recalculation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                aria-label="Minimize CymbalMart Assistant"
                className="p-1.5 text-stone-300 hover:text-white rounded-md hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF9F6]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mb-1 px-1">
                    <span className="font-medium">
                      {msg.role === "user" ? "You" : "CymbalMart Assistant"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {msg.timestamp}
                    </span>
                  </div>

                  <div
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-stone-900 text-stone-50"
                        : "bg-white border border-stone-200/90 text-stone-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {msg.cartActionSummary && (
                      <div className="mt-2 pt-2 border-t border-stone-200 flex items-center gap-1.5 text-[11px] font-mono text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{msg.cartActionSummary}</span>
                      </div>
                    )}
                  </div>

                  {/* Clickable Follow-up Suggestions */}
                  {msg.role === "assistant" &&
                    msg.suggestedFollowUps &&
                    msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%]">
                        {msg.suggestedFollowUps.map((followUp) => (
                          <button
                            key={followUp}
                            type="button"
                            disabled={isChatLoading}
                            onClick={() => handleSendChatMessage(followUp)}
                            className="text-left px-2.5 py-1 text-[11px] text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {followUp}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}

              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs text-stone-500 px-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-600" />
                  <span>CymbalMart Assistant is updating list & budget...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
                placeholder="Ask CymbalMart Assistant to update list..."
                className="flex-1 px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                aria-label="Send message to CymbalMart Assistant"
                className="px-3 py-2 text-xs font-semibold text-stone-50 bg-stone-900 rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* CUJ Task 3 Slide-Over: Finalize Plan & CymbalMart Checkout Drawer */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#FAF9F6] h-full shadow-2xl border-l border-stone-200 flex flex-col justify-between overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-white border-b border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-stone-500">
                  CUJ Task 03 · Refine & Checkout
                </div>
                <h2 className="font-display text-xl font-semibold text-stone-900">
                  CymbalMart Party Plan Checkout
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                aria-label="Close checkout drawer"
                className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {orderConfirmed ? (
                <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      CymbalMart Order #{orderConfirmed.orderNumber} Confirmed
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-stone-900">
                    Your party list is locked in, {orderConfirmed.hostName}.
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    We are staging{" "}
                    <span className="font-mono font-semibold text-stone-900">
                      {orderConfirmed.itemCount}
                    </span>{" "}
                    total units across {activeCartItems.length} CymbalMart SKUs for{" "}
                    <span className="font-medium text-stone-900">
                      {orderConfirmed.fulfillmentMode}
                    </span>{" "}
                    ({orderConfirmed.pickupWindow}) at {storeOrAddress}.
                  </p>
                  <div className="pt-3 border-t border-stone-200 flex items-center justify-between font-mono text-xs tabular-nums">
                    <span className="text-stone-500">
                      Finalized Total (Target Budget: ${brief.budget.toFixed(2)})
                    </span>
                    <span className="text-sm font-semibold text-stone-900">
                      ${orderConfirmed.total.toFixed(2)} USD
                    </span>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSavePlanFile("json")}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Save "CymbalMart Shopping Agent.json"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePlanFile("csv")}
                      className="py-2 px-3 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Download CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderConfirmed(null)}
                      className="py-2 px-3 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                    >
                      Modify Plan
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Budget Alignment Verification Box */}
                  <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900">
                        Budget Alignment Summary
                      </span>
                      <span
                        className={`text-xs font-mono font-semibold tabular-nums ${
                          isOverBudget ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {isOverBudget
                          ? `$${Math.abs(budgetDelta).toFixed(2)} Over Target`
                          : `$${budgetDelta.toFixed(2)} Under Target`}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {DEPARTMENTS.map((dept) => {
                        const deptTotal = departmentTotals[dept];
                        const pct =
                          subtotal > 0
                            ? Math.round((deptTotal / subtotal) * 100)
                            : 0;
                        return (
                          <div
                            key={dept}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-stone-600">{dept}</span>
                            <span className="font-mono tabular-nums text-stone-900">
                              ${deptTotal.toFixed(2)} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active CymbalMart Cart Items */}
                  <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200/70">
                    {activeCartItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-stone-900">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                            {item.sku} · {item.aisle} · {item.quantity}{" "}
                            {item.unit} × ${item.unitPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="font-mono text-xs font-semibold text-stone-900 tabular-nums shrink-0">
                          ${(item.unitPrice * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CymbalMart Fulfillment Form */}
                  <form
                    id="cymbalmart-checkout-form"
                    onSubmit={handleConfirmOrder}
                    className="bg-white border border-stone-200 rounded-xl p-5 space-y-3"
                  >
                    <div className="text-xs font-semibold text-stone-900">
                      CymbalMart Fulfillment & Host Details
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-lg">
                      {(
                        [
                          "Curbside Express Pickup",
                          "2-Hour Local Courier",
                        ] as const
                      ).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setFulfillmentMode(mode)}
                          className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                            fulfillmentMode === mode
                              ? "bg-white text-stone-900 shadow-xs"
                              : "text-stone-600 hover:text-stone-900"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] text-stone-500 mb-1">
                        Host Name
                      </label>
                      <input
                        type="text"
                        required
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-500 mb-1">
                        {fulfillmentMode === "Curbside Express Pickup"
                          ? "CymbalMart Store Location"
                          : "Delivery Address"}
                      </label>
                      <input
                        type="text"
                        required
                        value={storeOrAddress}
                        onChange={(e) => setStoreOrAddress(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-500 mb-1">
                        Preferred Pickup / Delivery Window
                      </label>
                      <input
                        type="text"
                        required
                        value={pickupWindow}
                        onChange={(e) => setPickupWindow(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg"
                      />
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-6 bg-white border-t border-stone-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600">
                  CymbalMart Total ({activeCartItems.length} SKUs)
                </span>
                <span className="font-mono text-lg font-semibold text-stone-900 tabular-nums">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              {!orderConfirmed && (
                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    form="cymbalmart-checkout-form"
                    className="w-full py-3 px-4 text-xs font-semibold text-stone-50 bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Finalize Plan & Complete CymbalMart Checkout · $
                    {subtotal.toFixed(2)}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSavePlanFile("json")}
                    className="w-full py-2 px-4 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Save File as "CymbalMart Shopping Agent.json"
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
