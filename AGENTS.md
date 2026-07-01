# Pulse Feeds: Agent Instructions

## Core Mission
Pulse Feeds is a multi-functional community platform designed for social interaction, real-world problem detection, educational growth, and financial rewards. The agent must maintain a balance between these features while ensuring a polished, high-performance user experience.

## Key Features & Guidelines

### 1. AI Model Consistency
- **Primary Model:** Use **Gemini 3.5 Flash** (`gemini-3.5-flash`) for all standard AI interactions.
- **Fallback Logic:** If `gemini-3.5-flash` is unavailable, fall back to a sequence of models including **Gemini 3.1 Flash Lite**, **Gemini Flash Latest**, **Gemini 3-flash-preview**, and **Gemini 3.1 Pro Preview**. This logic includes mandatory delays on quota/billing errors to prevent rate-limit loops. Logic is centralized in `src/lib/ai.ts` and `server.ts`.
- **Request Interval:** To prevent API rate limits, a minimum request interval of 15000ms is enforced between AI calls via `generateContentWithRetry`.
- **Prompt Structure:** Always use the structured `contents: [{ role: "user", parts: [{ text: "..." }] }]` format for all AI requests.
- **Reasoning:** These measures ensure high reliability, handle quota limits gracefully, and provide a consistent user experience during peak usage.

### 2. UI & Navigation
- **Permanent Navigation:** The bottom navigation bar must be fixed and consistently visible across all views (mobile and desktop).
- **FAB Positioning:** The "Add Post" Floating Action Button (FAB) should be positioned above the bottom navigation, ensuring it's accessible but not overlapping critical UI elements.
- **View Modes:** Support both 'mobile' (simulated frame) and 'desktop' view modes seamlessly.

### 3. Education Hub
- **Online Integration:** Use AI to research and gather educational content from the web to generate custom course curricula.
- **Update Cycle:** Courses are automatically refreshed on a **quarterly (3-month)** cycle to ensure depth and relevance.
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

### 7. GitHub Automation & Self-Solving Drive
- **Continuous Monitoring:** The agent takes ownership of the GitHub Action results. If a deployment fails (e.g., due to syntax errors like "Unterminated regular expression"), the agent must proactively fix the codebase.
- **Verification Before Push:** Always run `npm run lint` and `npm run build` (via `compile_applet`) locally before finalizing changes to ensure the "fresh push" will succeed.
- **Self-Healing Protocol:** If an action remains "unsolved," the agent should perform a deep check of related components (e.g., `Settings.tsx` JSX structure) to resolve underlying logical or syntax conflicts without user intervention.
- **Automated Workflow:** The workflow is designed to be "self-driven," meaning it should initiate on every push and only require user attention if environmental secrets (like Surge tokens) are missing.

## Technical Constraints
- **Framework:** React with Vite and Tailwind CSS.
- **Backend:** Firebase (Firestore & Auth).
- **Animations:** Use `motion` from `motion/react`.
- **Icons:** Use `lucide-react`.
