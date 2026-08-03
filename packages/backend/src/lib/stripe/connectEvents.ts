import Stripe from "stripe"

export const CREATOR_CONNECT_V2_EVENT_TYPES = [
  "v2.core.account[requirements].updated",
  "v2.core.account[configuration.recipient].capability_status_updated",
] as const

export type CreatorConnectV2EventType =
  (typeof CREATOR_CONNECT_V2_EVENT_TYPES)[number]

export type CreatorConnectV2EventNotification = Extract<
  Stripe.V2.Core.EventNotification,
  { type: CreatorConnectV2EventType }
>

export function isCreatorConnectV2EventNotification(
  event: Stripe.V2.Core.EventNotification
): event is CreatorConnectV2EventNotification {
  return CREATOR_CONNECT_V2_EVENT_TYPES.some(
    (eventType) => event.type === eventType
  )
}

export function getCreatorConnectV2AccountId(
  event: CreatorConnectV2EventNotification
) {
  return event.related_object.id
}

export async function parseStripeV2EventNotification(args: {
  payload: string
  secret: string
  signature: string
  stripe: Stripe
}) {
  return await args.stripe.parseEventNotificationAsync(
    args.payload,
    args.signature,
    args.secret,
    undefined,
    Stripe.createSubtleCryptoProvider()
  )
}
