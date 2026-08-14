# Twilio Setup

CallDesk has two modes:

1. **Demo mode** — no Twilio account required.
2. **Live mode** — connects to Twilio Programmable Voice.

## 1. Create Twilio resources

In Twilio Console, create or locate:

- Account SID (`AC...`)
- API Key SID (`SK...`)
- API Key Secret
- Voice-capable Twilio phone number
- TwiML App SID (`AP...`)

For incoming mobile calls you also need platform push credentials:

- Android: Firebase / FCM push credential
- iOS: APNs / PushKit credential

Keep secrets on the backend. Do not commit them to GitHub.

## 2. Deploy the ASP.NET Core backend

Upload this repository to GitHub.

In Railway, create a service using the `/server` directory as the source/root directory, or deploy the `server` folder separately.

Set these Railway variables:

```text
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_key_secret
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CALLER_ID=+15551234567
TWILIO_CLIENT_IDENTITY=mobile_user
```

For incoming mobile calls also set:

```text
TWILIO_PUSH_CREDENTIAL_SID=CRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Generate a Railway public domain, for example:

```text
https://calldesk-api-production.up.railway.app
```

## 3. Configure the TwiML App

Set the TwiML App **Voice Request URL** to:

```text
https://YOUR-BACKEND/api/voice/outgoing
```

Use HTTP POST.

The Voice Access Token references this TwiML App when the mobile SDK makes an outbound call.

## 4. Configure the Twilio phone number

For incoming PSTN calls, configure the Twilio phone number's voice webhook to:

```text
https://YOUR-BACKEND/api/voice/incoming
```

Use HTTP POST.

The backend returns TwiML that dials the configured client identity (`mobile_user` by default).

## 5. Configure the mobile app

Copy:

```text
mobile/.env.example
```

to:

```text
mobile/.env
```

and set:

```text
EXPO_PUBLIC_API_BASE_URL=https://YOUR-BACKEND
EXPO_PUBLIC_TWILIO_IDENTITY=mobile_user
```

## 6. Install and run

```bash
cd mobile
npm install
npx expo prebuild
npx expo run:android
```

For a real Twilio Voice build, use a native/development build rather than relying on Expo Go.

## Android incoming calls

Twilio incoming calls on Android require Firebase configuration. Add your Firebase `google-services.json` to the mobile project and add the `googleServicesFile` property to the Android section of `app.json`.

Example:

```json
"android": {
  "package": "com.portfolio.calldesk",
  "googleServicesFile": "./google-services.json"
}
```

Then create the corresponding Twilio Push Credential and put its SID in `TWILIO_PUSH_CREDENTIAL_SID` on the backend.

## iOS incoming calls

The app already declares microphone and VoIP background modes in `app.json`. A production iOS setup additionally requires Apple push configuration and a Twilio APNs Push Credential.

## Testing

Before dialing a real number:

1. Confirm `/api/health` returns OK.
2. Confirm `/api/token?identity=mobile_user` returns a token.
3. Verify the TwiML App Voice URL.
4. Verify the Twilio caller ID is a Twilio number you own.
5. Use E.164 numbers such as `+15551234567`.
