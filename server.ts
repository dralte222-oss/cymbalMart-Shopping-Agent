import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "2mb" }));

  // CUJ Step 1 -> Step 2: Convert busy host intent into a curated, budget-conscious CymbalMart shopping list
  app.post("/api/agent/plan", async (req, res) => {
    try {
      const { partyType, theme, guestCount, budget, dietary, specialRequests } =
        req.body;
      const ai = getAiClient();

      const prompt = `You are the CymbalMart Party Planner Shopping Agent helping a busy host convert their event intent into a curated, budget-conscious shopping list from CymbalMart departments.

Event Brief (CUJ Task 1 - Define Event):
- Party Type: ${partyType || "Dinner Party"}
- Theme: ${theme || "Autumn Harvest Gathering"}
- Guest Count: ${guestCount || 12} guests
- Target Total Budget: $${budget || 450} USD
- Dietary & Constraints: ${
        dietary && dietary.length > 0 ? dietary.join(", ") : "None specified"
      }
- Special Requests: ${
        specialRequests ||
        "Keep prep simple for a busy host; balance crowd-pleasing appetizers, drinks, and table essentials within budget."
      }

Rules for CymbalMart Shopping Agent:
1. Calculate exact CymbalMart product quantities scaled to ${
        guestCount || 12
      } guests so there are no shortages or waste.
2. Strictly align the total estimated cost (sum of unitPrice * quantity across all items) so it stays within or closely aligned to the $${
        budget || 450
      } target budget.
3. Distribute items across these 4 exact CymbalMart departments (\`category\`):
   - "Food & Grazing"
   - "Beverages & Mixers"
   - "Tableware & Decor"
   - "Host & Party Essentials"
4. Provide 8 to 10 practical, curated CymbalMart items with SKU codes (e.g. 'CM-4092'), realistic unit prices, per-guest scaling formulas (e.g. '1 platter per 6 guests'), dietary compatibility notes, aisle/department info, and priority ('Essential', 'Recommended', 'Optional Upgrade').
5. Include a 4-step busy-host prep timeline.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "You are the CymbalMart Shopping Agent. Your mission is to help busy hosts convert their party intent into a curated, budget-conscious CymbalMart shopping list, align items with their total budget, and refine for constraints.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  "Concise 2-3 sentence CymbalMart agent summary explaining how the list meets the theme, guest count, special requests, and total budget.",
              },
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timeOffset: {
                      type: Type.STRING,
                      description:
                        "e.g. '24 Hours Prior', '2 Hours Prior', '30 Mins Prior'",
                    },
                    task: {
                      type: Type.STRING,
                      description: "Time-saving action for a busy host.",
                    },
                    category: {
                      type: Type.STRING,
                      description: "Relevant CymbalMart department.",
                    },
                  },
                  required: ["timeOffset", "task", "category"],
                },
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    sku: {
                      type: Type.STRING,
                      description: "CymbalMart SKU code, e.g. 'CM-1042'",
                    },
                    name: {
                      type: Type.STRING,
                      description: "CymbalMart product name",
                    },
                    category: {
                      type: Type.STRING,
                      description:
                        "Must be one of: 'Food & Grazing', 'Beverages & Mixers', 'Tableware & Decor', 'Host & Party Essentials'",
                    },
                    unitPrice: {
                      type: Type.NUMBER,
                      description: "CymbalMart unit price in USD",
                    },
                    quantity: {
                      type: Type.INTEGER,
                      description: "Integer quantity scaled for guest count",
                    },
                    unit: {
                      type: Type.STRING,
                      description: "e.g. 'packs', 'bottles', 'platters', 'sets'",
                    },
                    scalingFormula: {
                      type: Type.STRING,
                      description:
                        "Per-guest quantity math, e.g. '1 platter per 6 guests'",
                    },
                    dietaryNotes: {
                      type: Type.STRING,
                      description:
                        "Dietary & constraint tags, e.g. 'Vegetarian · Gluten-Free'",
                    },
                    aisle: {
                      type: Type.STRING,
                      description:
                        "CymbalMart aisle or section, e.g. 'Aisle 4 · Artisanal Deli'",
                    },
                    priority: {
                      type: Type.STRING,
                      description:
                        "Must be one of: 'Essential', 'Recommended', 'Optional Upgrade'",
                    },
                    rationale: {
                      type: Type.STRING,
                      description:
                        "Why this CymbalMart item fits the busy host's event and budget.",
                    },
                  },
                  required: [
                    "id",
                    "sku",
                    "name",
                    "category",
                    "unitPrice",
                    "quantity",
                    "unit",
                    "scalingFormula",
                    "dietaryNotes",
                    "aisle",
                    "priority",
                    "rationale",
                  ],
                },
              },
            },
            required: ["summary", "timeline", "items"],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error("Empty response from Gemini model.");
      }

      const parsed = JSON.parse(rawText.trim());
      res.json(parsed);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate CymbalMart shopping list.";
      console.error("Error in /api/agent/plan:", message);
      res.status(500).json({ error: message });
    }
  });

  // CUJ Step 2 & Step 3: Refine & Align List with Budget & Constraints
  app.post("/api/agent/command", async (req, res) => {
    try {
      const {
        instruction,
        partyType,
        theme,
        guestCount,
        budget,
        dietary,
        specialRequests,
        currentItems,
      } = req.body;
      const ai = getAiClient();

      const currentSubtotal = Array.isArray(currentItems)
        ? currentItems.reduce(
            (sum: number, item: { unitPrice: number; quantity: number }) =>
              sum + item.unitPrice * item.quantity,
            0
          )
        : 0;

      const prompt = `You are the CymbalMart Party Planner Shopping Agent assisting a busy host in the "Review List" and "Refine & Checkout" stages of their critical user journey.

Current Event Brief:
- Party Type: ${partyType}
- Theme: ${theme}
- Guest Count: ${guestCount} guests
- Target Budget: $${budget} USD (Current List Subtotal: $${currentSubtotal.toFixed(2)})
- Dietary Constraints: ${dietary?.join(", ") || "None"}
- Special Requests: ${specialRequests || "None"}

Current CymbalMart Shopping List JSON:
${JSON.stringify(currentItems, null, 2)}

Host Refinement Request:
"${instruction}"

Update the CymbalMart shopping list to fulfill the host's refinement request (e.g. aligning total cost under budget, swapping items for CymbalMart value alternatives, adjusting for new guest counts or dietary constraints, or adding forgotten party essentials).
Ensure every item's 'category' is strictly one of:
- "Food & Grazing"
- "Beverages & Mixers"
- "Tableware & Decor"
- "Host & Party Essentials"
And 'priority' is strictly one of:
- "Essential"
- "Recommended"
- "Optional Upgrade"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "You are the CymbalMart Shopping Agent. You help busy hosts refine their party shopping list for budget constraints, guest count changes, and dietary needs, returning exact CymbalMart SKUs, quantities, and dollar savings.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              agentMessage: {
                type: Type.STRING,
                description:
                  "Concise 1-2 sentence confirmation of how the CymbalMart list was refined and the budget impact.",
              },
              updatedGuestCount: {
                type: Type.INTEGER,
                description:
                  "Updated guest count (keep same as current if not changed by instruction).",
              },
              updatedBudget: {
                type: Type.NUMBER,
                description:
                  "Updated target budget in USD (keep same as current if not changed by instruction).",
              },
              changeHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "2 to 4 specific bullet strings detailing items swapped, scaled, or added and the exact dollar delta.",
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    sku: { type: Type.STRING },
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    unitPrice: { type: Type.NUMBER },
                    quantity: { type: Type.INTEGER },
                    unit: { type: Type.STRING },
                    scalingFormula: { type: Type.STRING },
                    dietaryNotes: { type: Type.STRING },
                    aisle: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    agentStatus: {
                      type: Type.STRING,
                      description:
                        "Set to 'added' if newly added, 'modified' if price/quantity/product was swapped or adjusted, or 'unchanged' otherwise.",
                    },
                  },
                  required: [
                    "id",
                    "sku",
                    "name",
                    "category",
                    "unitPrice",
                    "quantity",
                    "unit",
                    "scalingFormula",
                    "dietaryNotes",
                    "aisle",
                    "priority",
                    "rationale",
                    "agentStatus",
                  ],
                },
              },
            },
            required: [
              "agentMessage",
              "updatedGuestCount",
              "updatedBudget",
              "changeHighlights",
              "items",
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error("Empty response from Gemini model.");
      }

      const parsed = JSON.parse(rawText.trim());
      res.json(parsed);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to execute CymbalMart shopping agent refinement.";
      console.error("Error in /api/agent/command:", message);
      res.status(500).json({ error: message });
    }
  });

  // Endpoint 3: CymbalMart Assistant Chatbot for interactive customer support & live shopping assistance
  app.post("/api/assistant/chat", async (req, res) => {
    try {
      const { message, history, brief, currentItems } = req.body;
      const ai = getAiClient();

      const activeSubtotal = Array.isArray(currentItems)
        ? currentItems
            .filter((i: { includedInCart?: boolean }) => i.includedInCart !== false)
            .reduce(
              (sum: number, item: { unitPrice: number; quantity: number }) =>
                sum + item.unitPrice * item.quantity,
              0
            )
        : 0;

      const conversationHistoryText = Array.isArray(history)
        ? history
            .slice(-8)
            .map(
              (m: { role: string; text: string }) =>
                `${m.role === "user" ? "Customer" : "CymbalMart Assistant"}: ${m.text}`
            )
            .join("\n")
        : "";

      const prompt = `You are "CymbalMart Assistant", a warm, knowledgeable, and action-oriented customer chatbot at CymbalMart.
You help busy hosts plan their events, answer questions about CymbalMart products, aisles, dietary allergens, beverage pairings, prep timelines, Curbside Express Pickup vs. 2-Hour Local Courier, and can also directly update their shopping list when asked!

Current Customer Party Brief:
- Party Type: ${brief?.partyType || "Dinner Party"}
- Theme: ${brief?.theme || "Autumn Harvest"}
- Guest Count: ${brief?.guestCount || 12} guests
- Target Budget: $${brief?.budget || 360} USD (Current Active Cart Subtotal: $${activeSubtotal.toFixed(2)})
- Dietary Needs: ${brief?.dietary?.join(", ") || "None"}
- Special Requests: ${brief?.specialRequests || "None"}

Current CymbalMart Shopping List:
${JSON.stringify(currentItems || [], null, 2)}

Recent Conversation History:
${conversationHistoryText || "(Start of conversation)"}

Latest Customer Message:
"${message}"

Instructions:
1. Respond helpfully, concisely, and specifically as CymbalMart Assistant (reference exact CymbalMart SKUs, aisles, prices, or budget numbers when relevant).
2. Provide 2-3 short follow-up quick-reply suggestions ('suggestedFollowUps') the customer might want to click next.
3. If the customer explicitly asks you to modify their shopping list (e.g., add an item, remove an item, swap something for a cheaper option, or change quantities), set 'didModifyCart' to true, provide a short 'cartActionSummary', and return the full updated 'updatedItems' array. Otherwise, set 'didModifyCart' to false and return an empty array for 'updatedItems'.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "You are CymbalMart Assistant, CymbalMart's dedicated customer chatbot for busy party hosts. Be friendly, concise, practical, and budget-conscious.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  "CymbalMart Assistant's direct conversational response to the customer.",
              },
              didModifyCart: {
                type: Type.BOOLEAN,
                description:
                  "True ONLY if the customer asked to add, remove, swap, or adjust items in their CymbalMart shopping list.",
              },
              cartActionSummary: {
                type: Type.STRING,
                description:
                  "If didModifyCart is true, a 1-line summary of the cart update (e.g., 'Added 2 packs Sparkling Apple Cider (+$16.00)'). Empty string if false.",
              },
              suggestedFollowUps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "2 to 3 short follow-up questions or actions the customer can click next.",
              },
              updatedItems: {
                type: Type.ARRAY,
                description:
                  "If didModifyCart is true, the full updated shopping list array. If didModifyCart is false, return an empty array [].",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    sku: { type: Type.STRING },
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    unitPrice: { type: Type.NUMBER },
                    quantity: { type: Type.INTEGER },
                    unit: { type: Type.STRING },
                    scalingFormula: { type: Type.STRING },
                    dietaryNotes: { type: Type.STRING },
                    aisle: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    agentStatus: { type: Type.STRING },
                  },
                  required: [
                    "id",
                    "sku",
                    "name",
                    "category",
                    "unitPrice",
                    "quantity",
                    "unit",
                    "scalingFormula",
                    "dietaryNotes",
                    "aisle",
                    "priority",
                    "rationale",
                    "agentStatus",
                  ],
                },
              },
            },
            required: [
              "reply",
              "didModifyCart",
              "cartActionSummary",
              "suggestedFollowUps",
              "updatedItems",
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error("Empty response from CymbalMart Assistant.");
      }

      const parsed = JSON.parse(rawText.trim());
      res.json(parsed);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "CymbalMart Assistant encountered an error.";
      console.error("Error in /api/assistant/chat:", message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `CymbalMart Shopping Agent Server listening on http://localhost:${PORT}`
    );
  });
}

startServer();
