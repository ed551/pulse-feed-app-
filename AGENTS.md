# Pulse Feeds: Agent Instructions

## Core Mission
Pulse Feeds is a multi-functional community platform designed for social interaction, real-world problem detection, educational growth, and financial rewards. The agent must maintain a balance between these features while ensuring a polished, high-performance user experience.

## Key Features & Guidelines

### 1. AI Model Consistency
- **Primary Model:** Use **Gemini 3 Flash** (`gemini-3-flash-preview`) for all standard AI interactions to ensure maximum speed and stability.
- **Fallback Logic:** If `gemini-3-flash-preview` is unavailable, fall back to a sequence of models including **Gemini 2.0 Flash**, **Gemini Flash Latest**, **Gemini 3.1 Flash Lite**, **Gemini Flash Lite Latest**, **Gemini 2.0 Flash Lite**, **Gemini 2.5 Flash**, and **Gemini 3.1 Pro Preview**. This logic includes mandatory delays on quota errors to prevent rate-limit loops. Logic is centralized in `src/lib/ai.ts` and `server.ts`.
- **Request Interval:** To prevent API rate limits, a minimum request interval of 2000ms is enforced between AI calls via `generateContentWithRetry`.
- **Prompt Structure:** Always use the structured `contents: [{ role: "user", parts: [{ text: "..." }] }]` format for all AI requests.
- **Reasoning:** These measures ensure high reliability, handle quota limits gracefully, and provide a consistent user experience during peak usage.

### 2. UI & Navigation
- **Permanent Navigation:** The bottom navigation bar must be fixed and consistently visible across all views (mobile and desktop).
- **FAB Positioning:** The "Add Post" Floating Action Button (FAB) should be positioned above the bottom navigation, ensuring it's accessible but not overlapping critical UI elements.
- **View Modes:** Support both 'mobile' (simulated frame) and 'desktop' view modes seamlessly.

### 3. Education Hub
- **Online Integration:** Use AI to research and gather educational content from the web to generate custom course curricula.
- **Certification:** Award badges and certificates upon course completion.
- **Revenue Split:** Implement an 80/20 revenue split (80% to developer, 20% to user as a reward) for course enrollments and AI training.

### 4. Rewards & Withdrawals
- **Transparency:** Clearly state on the Rewards page that withdrawals are processed **monthly**.
- **Tax Compliance:** Maintain the Merchant of Record (MoR) logic for automated tax remittance.

### 5. Restored Features
- **Dating:** Maintain the Dating Hub for community connections.
- **Community Engagement:** Ensure users can earn points by participating in community discussions, solving real-world problems, and contributing to the education hub.

### 6. Community Events
- **Engagement:** Keep the Events page populated with community-driven or system-generated events and dates.

## Technical Constraints
- **Framework:** React with Vite and Tailwind CSS.
- **Backend:** Firebase (Firestore & Auth).
- **Animations:** Use `motion` from `motion/react`.
- **Icons:** Use `lucide-react`.
