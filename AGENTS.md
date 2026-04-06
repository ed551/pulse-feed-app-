# Pulse Feeds: Agent Instructions

## Core Mission
Pulse Feeds is a multi-functional community platform designed for social interaction, real-world problem detection, educational growth, and financial rewards. The agent must maintain a balance between these features while ensuring a polished, high-performance user experience.

## Key Features & Guidelines

### 1. AI Model Consistency
- **Standard:** Exclusively use **Gemini 3 Flash** models (`gemini-3-flash-preview`, `gemini-3.1-flash-live-preview`, `gemini-3.1-flash-image-preview`) for all AI features.
- **Reasoning:** Ensures high speed, reliability, and consistent behavior across the app.

### 2. UI & Navigation
- **Permanent Navigation:** The bottom navigation bar must be fixed and consistently visible across all views (mobile and desktop).
- **FAB Positioning:** The "Add Post" Floating Action Button (FAB) should be positioned above the bottom navigation, ensuring it's accessible but not overlapping critical UI elements.
- **View Modes:** Support both 'mobile' (simulated frame) and 'desktop' view modes seamlessly.

### 3. Education Hub
- **Online Integration:** Use AI to research and gather educational content from the web to generate custom course curricula.
- **Certification:** Award badges and certificates upon course completion.
- **Revenue Split:** Implement a 75/25 revenue split (75% to developer, 25% to user as a reward) for course enrollments and AI training.

### 4. Rewards & Withdrawals
- **Transparency:** Clearly state on the Rewards page that withdrawals are processed **monthly**.
- **Tax Compliance:** Maintain the Merchant of Record (MoR) logic for automated tax remittance.

### 5. Restored Features
- **Dating:** Maintain the Dating Hub for community connections.
- **Watch to Earn:** Ensure users can earn points by watching curated video content.

### 6. Community Events
- **Engagement:** Keep the Events page populated with community-driven or system-generated events and dates.

## Technical Constraints
- **Framework:** React with Vite and Tailwind CSS.
- **Backend:** Firebase (Firestore & Auth).
- **Animations:** Use `motion` from `motion/react`.
- **Icons:** Use `lucide-react`.
