# Core UX Flows

## Newcomer
Home → upcoming event → event detail → sign in only when registering → progressive profile fields if required → free confirmation or Razorpay → confirmation → reminders → arrive → self/host check-in → pairing/open-play direction → event history.

## Google first sign-in
Google → callback → automatic base profile → if event registration needs missing fields, ask only those fields → continue original intent. Never dump the user into a generic profile form after OAuth unless required.

## Paid event
Register → server capacity hold + price → Razorpay → verification → confirmed → add to calendar/event room. If browser closes after payment, webhook reconciles and dashboard still becomes confirmed.

## Full event
Register → server detects capacity → waitlist if enabled → no payment → notification if place opens → short acceptance/payment window.

## Rated tournament
Confirmed → check-in → round published → player event room shows board/opponent/color → result → next round → final event → rating update and game ledger.

## Social event
Confirmed → check-in → host welcome → optional balanced match suggestion → player can accept/host can change → repeated games can avoid immediate rematches unless both request one.

## Admin event creation
Choose event type → defaults → experience/hospitality → registration → payment → game system → media → messages → review → publish.
