# State Machines

## Event
`draft → published → registration_open → sold_out/ongoing → completed`

`draft/published/registration_open/sold_out → cancelled` is allowed with admin confirmation and participant communication plan.

## Registration
`pending → confirmed` after free reservation or verified payment.  
`pending/confirmed → cancelled` by policy.  
`confirmed → refunded` when a captured payment is refunded.  
`waitlist → pending/confirmed` when a place is offered.

## Payment order
`created → attempted → paid`  
`created/attempted → failed/expired`  
`paid → refunded`

Provider webhook may move state forward; it never trusts browser state.

## Round
`draft → published → live → completed`  
`draft → void` if replaced before publication.

## Pairing result
`pending → submitted → final`  
`submitted → disputed → final`

## CMS page/story
`draft → published`. Publishing updates timestamp and audit. Deleting published content should normally archive/unpublish first.
