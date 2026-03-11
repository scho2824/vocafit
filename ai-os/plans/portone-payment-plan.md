# Implementation Plan: PortOne Payment & Subscription System

## Goal
한국 시장에 최적화된 결제 및 구독 서비스를 제공하기 위해, Stripe 대신 포트원(PortOne) API를 기반으로 한 결제 시스템, 가격 페이지, 구독 관리 포털, 프론트엔드 페이월, 그리고 Webhook 상태 동기화 함수를 구현합니다.

## Approach
- **프론트엔드:** 가격(Pricing) 페이지 UI를 구축하고, 결제를 진행하는 `PortOneCheckout` 컴포넌트와 유료 기능 접근을 제어하는 `Paywall` 컴포넌트를 분리하여 개발합니다.
- **백엔드:** 포트원 결제 완료 및 구독 갱신 이벤트를 수신하는 Webhook 엔드포인트를 구축하여 데이터베이스의 유저 상태를 동기화합니다. VocaFit 아키텍처 원칙(BaaS 의존도 극대화)에 따라 Next.js API Route 대신 **Supabase Edge Functions**를 활용합니다.
- **아키텍처 규칙:** 결제 검증 및 동기화 비즈니스 로직은 Edge Function 내부에 독립된 Service 모듈로 작성하여 결합도를 낮추고 무상태(Stateless) 확장을 보장합니다.

- `apps/web/src/app/pricing/page.tsx` (신규: 가격 안내 페이지)
- `apps/web/src/components/payment/PortOneCheckout.tsx` (신규: 결제창 렌더링)
- `apps/web/src/components/payment/Paywall.tsx` (신규: 유료 기능 접근 제어 컴포넌트)
- `supabase/functions/portone-webhook/index.ts` (신규: 포트원 웹훅 수신용 Deno Edge Function)
- `supabase/functions/portone-webhook/payment.service.ts` (신규: 웹훅 내부 결제 검증 및 DB 동기화 비즈니스 로직)

## Step-by-Step Tasks
1. 포트원 SDK 초기화 및 환경 변수(API Key 등) 설정
2. 가격 페이지(Pricing Page) 및 페이월(Paywall) 컴포넌트 UI 구현
3. 프론트엔드용 PortOne 결제 요청(Checkout) 로직 연동
4. 백엔드(Edge Function) `payment.service.ts`에 결제 사전/사후 검증 로직 구현
5. Supabase Edge Function(`portone-webhook`) 배포 및 사용자 구독 상태 DB 업데이트 로직 연동
6. 구독 관리 포털(빌링키 기반 결제 취소/변경) 기능 구현

## Tradeoffs
- 한국 현지 카드사/PG사 연동에 압도적으로 유리하지만, 향후 글로벌 통화(USD 등)를 메인으로 확장할 경우 다중 통화/PG 라우팅 관리가 추가로 필요할 수 있습니다.

## Risks
- 웹훅(Webhook) 수신 실패 시 사용자의 결제 상태가 DB에 반영되지 않아 서비스 접근이 차단될 위험이 있습니다. 
- **대응책:** 포트원 웹훅 재시도 로직을 수용하고, 실패 시 수동 검증(Polling)할 수 있는 배치 스크립트 작성 등 방어 로직 적용.
