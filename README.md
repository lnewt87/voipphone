# CallDesk Mobile Softphone

CallDesk is a mobile VoIP softphone portfolio application built with React Native and Twilio Programmable Voice, with an ASP.NET Core backend for secure Twilio Access Token generation and TwiML call routing.

## Features

- Mobile dial pad
- Outbound PSTN calling through Twilio
- Incoming call workflow
- Answer / reject / hang up controls
- Mute / unmute
- Live call status and call timer
- Recent call history
- Sample contacts
- Demo mode that runs without Twilio credentials
- ASP.NET Core token service
- TwiML endpoints for outbound and inbound call routing
- Railway-ready backend Dockerfile

## Technology

### Mobile
- React Native
- Expo
- TypeScript
- Twilio Voice React Native SDK

### Backend
- C#
- ASP.NET Core 8 Minimal API
- Twilio .NET SDK
- Docker

## Architecture

```text
React Native Mobile App
        |
        | HTTPS
        v
ASP.NET Core Token / TwiML API
        |
        | Access Token + TwiML
        v
Twilio Programmable Voice
        |
        v
Public Telephone Network
```

The mobile app never stores the Twilio API secret. The ASP.NET Core server creates short-lived Voice Access Tokens and returns them to the client.

## Demo mode

If `EXPO_PUBLIC_API_BASE_URL` is not configured, the app starts in **Demo Mode**. The dialer, contacts, recents, incoming-call screen, call timer, mute button, and call-state UI can be demonstrated without placing real calls.

## Live Twilio mode

See [TWILIO_SETUP.md](TWILIO_SETUP.md) for the Twilio Console, Railway, and mobile build setup.

## Suggested resume entry

**CallDesk Mobile Softphone — React Native, TypeScript, C#, ASP.NET Core, Twilio Programmable Voice**

Developed a mobile VoIP softphone integrating Twilio Programmable Voice with a React Native client and ASP.NET Core token service. Implemented outbound/inbound call workflows, secure Access Token generation, TwiML routing, call-state management, mute/hang-up controls, contacts, and call history.
