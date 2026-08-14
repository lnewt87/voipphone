# CallDesk API

ASP.NET Core backend for the CallDesk mobile softphone.

## Responsibilities

- Generate short-lived Twilio Voice Access Tokens
- Keep Twilio API credentials out of the mobile app
- Return TwiML for outbound PSTN calls
- Route inbound PSTN calls to a Twilio client identity

## Run locally

Set the environment variables in `.env.example`, then run:

```bash
dotnet restore
dotnet run
```

Health endpoint:

```text
GET /api/health
```

Token endpoint:

```text
GET /api/token?identity=mobile_user
```

Twilio TwiML App webhook:

```text
POST /api/voice/outgoing
```

Twilio phone-number incoming voice webhook:

```text
POST /api/voice/incoming
```
