# Architecture Decision Record (ADR)
## 001 - Use PortOne for Payment & Subscription

**Date:** 2026-03-08
**Status:** Accepted

---

### Context
VocaFit is transitioning to a monetized SaaS model, requiring a robust payment and subscription management system. The application's primary target market is South Korea, making it critical to support domestic payment methods (e.g., local credit cards, KakaoPay, NaverPay, Toss) and integrate seamlessly with the South Korean financial ecosystem. We need a reliable gateway for checkout, recurring billing management, and Webhook synchronization to provision Premium AI features.

### Decision
We will use **PortOne (포트원)** as the exclusive Payment Gateway (PG) and subscription management portal instead of Stripe.
The entire billing infrastructure—including frontend checkouts (Paywalls/SDK), backend API verification, and asynchronous Webhook processing—will strictly follow the PortOne API specifications.

### Reason
This is the most structurally sound business decision for a product servicing Korea. PortOne abstracts the complex, fragmented local Payment Gateway (PG) landscape (such as KG Inicis, KCP, or Toss Payments) behind a single unified API and robust JavaScript SDK. It provides out-of-the-box support for essential domestic billing key management and recurring payments, which are vital for subscription retention in this region.

### Alternatives Considered
*   **Stripe:** Initially evaluated as the global standard for SaaS billing.
    *   *Result:* **Rejected.** While Stripe's developer experience and API design are unparalleled, its lack of optimization and direct support for standard Korean domestic payment methods and localized PG routing creates massive friction for the Buyer persona in our target market.
