# CallDesk Resume Notes

## Suggested resume entry

**CallDesk Mobile Softphone — React Native, TypeScript, C#, ASP.NET Core, Twilio Programmable Voice**

Developed a mobile VoIP softphone integrating Twilio Programmable Voice with a React Native client and ASP.NET Core backend. Implemented outbound/inbound calling workflows, secure Voice Access Token generation, TwiML routing, call-state management, mute/hang-up controls, contacts, and recent-call tracking.

## Resume bullet options

- Built a React Native mobile VoIP softphone integrating Twilio Programmable Voice for PSTN calling.
- Developed an ASP.NET Core backend to issue short-lived Twilio Voice Access Tokens and route calls using TwiML.
- Implemented dialer, incoming-call, answer/reject, mute, hang-up, call timer, contacts, and recent-call workflows.
- Separated Twilio credentials from the mobile client and managed configuration through backend environment variables.

## Be ready to explain

- Why the Twilio API secret stays on the server
- What a Twilio Access Token does
- How a TwiML App is involved in outbound calling
- How an incoming Twilio number is routed to a mobile client identity
- React Native call-state management
- How the app switches between demo and live mode
- Why incoming mobile calls require push credentials
