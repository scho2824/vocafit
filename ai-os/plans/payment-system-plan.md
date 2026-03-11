# Payment System Implementation Plan

## Goal (목표)
이번 결제 기능 연동(PortOne)을 통해 VocaFit의 'Freemium' 비즈니스 모델을 기술적으로 완성하는 것이 목표입니다. 사용자의 결제 행위가 데이터베이스의 구독 상태(`subscriptions` 테이블)에 실시간으로 반영되도록 누락된 백엔드 웹훅 엣지 함수를 구현하고, 프론트엔드가 정확한 결제자 식별자(`user_id`)를 넘겨주도록 파이프라인을 연결합니다.

## Approach (아키텍처 접근 방식)
결제 아키텍처는 **오프-도메인 결제 위임 및 비동기 웹훅 동기화** 방식을 채택합니다.
1. **Frontend (Next.js):** `PortOneCheckout.tsx`에서 `@portone/browser-sdk/v2`를 호출할 때 서버로부터 전달받거나 훅에서 꺼낸 `user_id`를 PortOne 결제 데이터(`custom_data` 또는 `customer`)에 주입하여 결제 세션을 엽니다.
2. **Payment Gateway (PortOne):** 결제가 성공하면 사용자를 즉시 대시보드로 복귀시키고, 백엔드로 `payment.status.changed` 웹훅을 발송합니다.
3. **Backend Webhook (Edge Function):** 새로 제작할 `portone-webhook/index.ts`에서 웹훅을 수신합니다. 수신된 `imp_uid`를 기존의 `payment.service.ts`를 사용해 PortOne 서버에 재조회하여 검증(보안)합니다.
4. **Database (Supabase):** 검증을 통과한 결제(금액 일치 및 상태 정상)에 한해 `public.subscriptions`에 `status='active'` 레코드를 생성/업데이트하고, `payment_logs`를 남겨 중복 처리를 방지합니다.

## Files to modify/New files

### [MODIFY] `apps/web/src/components/payment/PortOneCheckout.tsx`
- 사용자 인증 정보(`userId`, `email` 등)를 가져와 `PortOne.requestPayment` 호출 페이로드 내 `customer` 객체나 `customData`에 주입.

### [NEW] `supabase/functions/portone-webhook/index.ts`
- PortOne 결제 결과를 비동기적으로 수신하는 메인 핸들러.
- 결제 검증 (서버 투 서버 통신).
- 결제 위변조 체크 (금액 대조).
- 중복 웹훅 방어 (Idempotency).
- Database 테이블 (`subscriptions`, `payment_logs`) Upsert 처리.

## Step-by-Step Plan

1.  **Update Checkout Component:** 단일 결제창을 띄울 때 `useSessionStore`나 Supabase Auth에서 `userId`를 꺼내와 `PortOne.requestPayment`의 `customData: { userId }` 항목으로 추가합니다.
2.  **Scaffold Webhook:** `portone-webhook/index.ts`를 생성하고 `Deno.serve`로 POST 요청을 받도록 스켈레톤을 잡습니다.
3.  **Implement Verification Logic (결제 금액 위변조 검증 - Security):**
    - ❌ **결제 금액 검증 로직 필수로 추가:** 웹훅으로 들어온 `imp_uid`를 `PaymentService`에 넘겨 실제 PortOne 서버에서 결제 상세 내역을 가져옵니다. 
    - 조회한 내역의 실 결제 금액(`amount`)이 우리 DB/기획에 정의된 `premium_monthly` 요금(예: 4900원)과 정확히 일치하는지 대조하는 안전 로직을 반드시 구현합니다. 불일치하면 공격으로 간주하고 `400 Bad Request` 에러를 반환해 DB 처리를 끊어냅니다.
4.  **Implement DB Upsert Logic (중복 웹훅 처리 - Idempotency):**
    - ❌ **중복 반영 방지 로직 필수로 추가:** `payment_logs` 테이블을 먼저 조회하여 이미 성공 처리한 이력이 있는 `imp_uid`인지 확인하는 방어 로직을 작성합니다.
    - 이미 처리된 로그라면 `200 OK`를 리턴하고 바로 종료해 구독 기간이 중복 연장되는 것을 막습니다. 
    - 확인이 끝나면 Service Role 클라이언트를 통해 `subscriptions`를 `active`로 Upsert하고, `payment_logs`에 새로 삽입합니다.
5.  **Error Handling & HTTP Response:** 웹훅이 안전하게 처리되었을 때만 `200 OK`를 내보내어 PortOne 쪽의 무한 재시도를 방지합니다.

## Tradeoffs & Risks (트레이드오프 및 위험 요소)

- ❌ **결제 금액 위변조 (Security Risk):** 클라이언트 스크립트 기반 결제창 특성상, 해커 브라우저에서 결제 요청 금액을 10원 단위로 조작하여 결제에 성공할 위험이 존재합니다.
  - *Mitigation (완화):* Step 3에 명시한 바와 같이 Edge Function이 직접 PortOne 서버 API를 호출해 실제 청구된 금액을 재조회하고 `4900` 등 예상 값과 하드 매칭하므로 서버단에서 원천 차단됩니다.
- ❌ **네트워크 지연 및 중복 웹훅 (Idempotency Risk):** PortOne 서버의 일시적 문제나 큐잉 딜레이로 동일 결제건에 대해 웹훅이 연달아 2~3번 들어올 수 있습니다. 방치 시 한 번 결제에 3개월 구독이 연장되는 버그가 터집니다.
  - *Mitigation (완화):* Step 4에 명시한 로직에 따라 `payment_logs` 테이블에 `imp_uid` 기준 Unique 제약 혹은 레코드 사전 조회를 걸어두어 이후 중복 요청은 모두 성공 처리(무시)합니다.
- **결제 성공 체감의 시차 (Race Condition):** 결제가 끝난 직후 프론트엔드가 대시보드로 넘어갔을 때, Edge Function이 DB를 업데이트하기 직전(0.5초 경과)이라면 사용자는 여전히 "Free" 화면을 보게 됩니다.
  - *Tradeoff:* 사용자가 "새로고침"을 1번 정도 해야하는 페인 포인트가 발생할 수 있습니다.
  - *Mitigation:* `useSubscription` 훅 자체가 일정 간격(`staleTime`)으로 폴링하고 있으므로 몇 초 내 자동으로 UI가 Pro 버전으로 바뀝니다. 해당 지연은 비동기 아키텍처의 필연적 결과이며 현 MVP 단계에서는 수용 가능합니다.
- **PortOne 의존성 병목:** PortOne 서버 자체가 다운되면 우리 서비스의 가입 및 결제가 전부 중단됩니다.
  - *Tradeoff:* 결제 게이트웨이를 직접 구축하는 비용이 더 크기 때문에 100% 위임하는 방식을 유지합니다.
