CallDesk Live Twilio Patch

Copy these files into your existing mobile folder, preserving the paths:

App.tsx -> mobile/App.tsx
eas.json -> mobile/eas.json
src/services/TwilioVoiceService.ts -> mobile/src/services/TwilioVoiceService.ts

This patch:
1. Uses https://voipphone-production.up.railway.app as a safe fallback API URL.
2. Keeps the EAS preview variables set.
3. Does not force Demo Mode just because incoming-call registration/push is not configured.

After copying, rebuild:
set EAS_NO_VCS=1
eas build --platform android --profile preview --clear-cache
