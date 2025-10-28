import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'swiftedu',
  name: 'SwiftEDU',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
