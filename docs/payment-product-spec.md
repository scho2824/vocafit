# Product Specification: VocaFit Payment System

**Date:** 2026-03-08
**Author:** PM / AI Product Manager
**Status:** MVP Proposal

---

## 1. Executive Summary
VocaFit is transitioning from a free beta to a monetized SaaS product. To support our mission of providing high-quality, AI-driven English sentence training, we are introducing a subscription-based Payment System. This document outlines the fundamental business rules, MVP feature set, and target user flow for integrating PortOne as our billing engine.

## 2. Target Users
As an AI-powered English learning application, our target users for the payment system are:
*   **The Learner (User):** Individuals (adults, students, or potentially younger learners supervised by parents) actively using the app to improve their English sentence construction and vocabulary.
*   **The Buyer:** The individual paying for the subscription. In most cases, this is the Learner themselves. In cases of younger users, it is the parent or guardian. The payment flow must be accessible, transparent, and trustworthy for the Buyer.

## 3. Core Problem
*   **Sustainability:** Providing instant, high-quality AI feedback via OpenAI APIs incurs significant variable costs per user interaction. A monetization strategy is required to sustain and scale the product.
*   **Value Tiering:** Free users need to experience enough of the core loop to see the value (the "Aha!" moment), while Premium users require unhindered access and advanced insights to justify a recurring subscription.
*   **Compliance & Security:** Managing credit cards directly introduces severe PCI compliance risks. We need a frictionless payment gateway (PortOne) to offload this risk entirely.

## 4. Business Logic & Rules
The VocaFit subscription model follows a "Freemium" approach with hard usage caps.

**Tier 1: Free Tier (Basic Learner)**
*   **Daily Mission Access:** Can learn up to 3 new words per day.
*   **AI Sentence Building:** Limited to 3 sentence evaluations per day.
*   **Vocabulary History:** Can view the list of learned words, but cannot re-trigger AI contextual examples.

**Tier 2: Premium Tier (VocaFit Pro)**
*   **Daily Mission Access:** Unlimited daily words (or user-configurable).
*   **AI Sentence Building:** Unlimited AI evaluations and sentence variations.
*   **Advanced Analytics/History:** Full access to past mistakes, spaced-repetition prompts, and streak recovery.
*   **Cost:** [TBD, e.g., $4.99/month or $39.99/year].

**Billing Policies:**
*   **Source of Truth:** PortOne is the absolute master record. The VocaFit database (`public.subscriptions`) is strictly a read-only mirror updated via webhooks.
*   **State Downgrade (Graceful Degradation):** If a payment fails (status: `past_due`) or a subscription ends (status: `canceled` & `cancel_at_period_end` reached), the user reverts to Tier 1 limits immediately. No access to historical data is deleted, but Premium interactions are locked.
*   **Refund Policy:** Automated via the PortOne Billing Key Management, subject to standard Terms of Service (TOS).

## 5. MVP Features
To launch the Payment System efficiently, the MVP will strictly include:

1.  **Pricing Page (`/pricing`):** A clear, conversion-optimized public page comparing the Free and Premium tiers.
2.  **PortOne Checkout:** Integration with PortOne Checkout (routing users off-domain securely to pay via Credit Card, Apple Pay, or Google Pay).
3.  **PortOne Billing Key Management:** A "Manage Billing" button in the user's dashboard that opens the PortOne portal for self-serve cancellation and card updates.
4.  **Premium Feature Gating:** Frontend hooks (`useSubscription.ts`) that intercept interactions in the `SentenceBuilderUI` and conditionally show an "Upgrade" paywall if the user exceeds their daily free limits.
5.  **Webhook Synchronization:** A Supabase Edge Function to catch PortOne events and securely update the user's subscription status in the database.

## 6. User Flow

### Flow A: Upgrading to Premium (The Checkout Flow)
1.  **Trigger:** User encounters a limit in `SentenceBuilderUI` or clicks "Upgrade" on the dashboard/pricing page.
2.  **Redirection:** User is sent to a PortOne-hosted Checkout Session.
3.  **Payment:** User enters payment details and subscribes.
4.  **Success:** User is routed back to `vocafit.com/success`.
5.  **Provisioning (Background):** PortOne fires a webhook -> Supabase updates the `subscriptions` table.
6.  **Access Granted:** The frontend fetches the updated status and unlocks the Premium features instantly.

### Flow B: Hitting the Free Limit (The Paywall Flow)
1.  **Action:** A Free Tier user attempts their 4th sentence evaluation for the day.
2.  **Interception:** The `SentenceBuilderUI` checks the local state and API limits.
3.  **Display:** Instead of the AI feedback loading state, a Paywall Component slides up: *"You've reached your daily limit! Upgrade to Pro for unlimited AI evaluations."*
4.  **Conversion Path:** The paywall presents a direct button to Flow A (Checkout).

### Flow C: Managing the Subscription (The Churn Flow)
1.  **Action:** User navigates to `Settings > Billing` and clicks "Manage Subscription".
2.  **Redirection:** User is securely redirected to the PortOne Billing Key Management.
3.  **Modification:** User clicks "Cancel Plan".
4.  **Webhook:** PortOne fires `customer.subscription.updated` marking the plan to cancel at the end of the billing period.
5.  **Client Experience:** The user retains Premium access until `current_period_end` is reached, at which point the frontend downgrades their experience back to Flow B limits.
