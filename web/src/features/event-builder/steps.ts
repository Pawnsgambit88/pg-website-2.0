import dynamic from 'next/dynamic'
import { STEP_FORM_SCHEMAS } from '@/features/event-builder/step-schemas'
import type { BuilderStepDefinition } from '@/features/event-builder/types'
import type { BuilderStep } from '@/lib/api/types/admin/event-builder'
import type { EventType } from '@/lib/api/types/event-state'

// Step registry (TASK-077, DEC-023). ONE place that lists the eight steps in order. A step task (FE-26..29) fills the
// body of its file under ./steps (a default-exported component taking `BuilderStepProps`) and, if needed, adjusts
// `relevantFor` here. The shell, stepper, preview and autosave need no change.
// Experience deliberately precedes mechanics (registration, payment, game system).

// Literal import() per step so Next can split and preload each chunk.
const loadBasicsStep = () => import('@/features/event-builder/steps/BasicsStep').then((module) => module.BasicsStep)
const loadExperienceStep = () =>
  import('@/features/event-builder/steps/ExperienceStep').then((module) => module.ExperienceStep)
const loadRegistrationStep = () =>
  import('@/features/event-builder/steps/RegistrationStep').then((module) => module.RegistrationStep)
const loadPaymentStep = () => import('@/features/event-builder/steps/PaymentStep').then((module) => module.PaymentStep)
const loadGameSystemStep = () =>
  import('@/features/event-builder/steps/GameSystemStep').then((module) => module.GameSystemStep)
const loadMediaStep = () => import('@/features/event-builder/steps/MediaStep').then((module) => module.MediaStep)
const loadCommunicationsStep = () =>
  import('@/features/event-builder/steps/CommunicationsStep').then((module) => module.CommunicationsStep)
const loadReviewStep = () => import('@/features/event-builder/steps/ReviewStep').then((module) => module.ReviewStep)

const always = (): boolean => true
/** Workshops have no game engine at launch (F-PAIR-010): the mechanics step is hidden, its values stay in the draft. */
const notWorkshop = (type: EventType): boolean => type !== 'workshop'

function define(
  id: BuilderStep,
  label: string,
  dataKey: BuilderStepDefinition['dataKey'],
  load: () => Promise<BuilderStepDefinition['component']>,
  relevantFor: BuilderStepDefinition['relevantFor'] = always,
): BuilderStepDefinition {
  return {
    id,
    label,
    dataKey,
    schema: dataKey === null ? null : STEP_FORM_SCHEMAS[dataKey],
    relevantFor,
    component: dynamic(load, { loading: () => null }),
    preload: load,
  }
}

export const BUILDER_STEP_DEFINITIONS: readonly BuilderStepDefinition[] = [
  define('basics', 'Basics', 'basics', loadBasicsStep),
  define('experience', 'Experience', 'experience', loadExperienceStep),
  define('registration', 'Registration', 'registration', loadRegistrationStep),
  define('payment', 'Payment', 'payment', loadPaymentStep),
  define('game_system', 'Game system', 'gameSystem', loadGameSystemStep, notWorkshop),
  define('media', 'Media', 'media', loadMediaStep),
  define('communications', 'Communications', 'communications', loadCommunicationsStep),
  define('review', 'Review', null, loadReviewStep),
]

export function stepsFor(type: EventType): readonly BuilderStepDefinition[] {
  return BUILDER_STEP_DEFINITIONS.filter((step) => step.relevantFor(type))
}
