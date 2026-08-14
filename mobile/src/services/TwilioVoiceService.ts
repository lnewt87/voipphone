type StatusHandler = (status: string) => void;
type IncomingHandler = (from: string) => void;
type ErrorHandler = (message: string) => void;

type Handlers = {
  onStatus?: StatusHandler;
  onIncoming?: IncomingHandler;
  onError?: ErrorHandler;
};

class TwilioVoiceService {
  private voice: any = null;
  private activeCall: any = null;
  private incomingInvite: any = null;
  private sdk: any = null;
  private handlers: Handlers = {};
  private apiBaseUrl = '';
  private identity = 'mobile_user';
  private currentToken = '';

  setHandlers(handlers: Handlers) {
    this.handlers = handlers;
  }

  private emitStatus(status: string) {
    this.handlers.onStatus?.(status);
  }

  private emitError(error: unknown) {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown Twilio error';
    this.handlers.onError?.(message);
  }

  private loadSdk() {
    if (this.sdk) return this.sdk;

    // Deliberately loaded at runtime so the UI can still be demonstrated
    // when a native Twilio development build has not been created yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.sdk = require('@twilio/voice-react-native-sdk');
    return this.sdk;
  }

  async initialize(apiBaseUrl: string, identity: string) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
    this.identity = identity || 'mobile_user';

    if (!this.apiBaseUrl) {
      return { live: false, reason: 'No API URL configured.' };
    }

    try {
      const sdk = this.loadSdk();
      const Voice = sdk.Voice;

      this.voice = new Voice();
      this.currentToken = await this.fetchToken();

      this.voice.on('callInvite', (invite: any) => {
        this.incomingInvite = invite;

        const from =
          invite?.from ??
          invite?.getFrom?.() ??
          invite?.customParameters?.From ??
          'Unknown caller';

        this.handlers.onIncoming?.(String(from));
      });

      this.voice.on('error', (error: unknown) => this.emitError(error));

      await this.voice.register(this.currentToken);
      return { live: true };
    } catch (error) {
      this.emitError(error);
      return { live: false, reason: 'Twilio native SDK is not available or registration failed.' };
    }
  }

  private async fetchToken() {
    const url =
      `${this.apiBaseUrl}/api/token?identity=${encodeURIComponent(this.identity)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Token request failed (${response.status}).`);
    }

    const payload = await response.json();

    if (!payload.token) {
      throw new Error('The token endpoint did not return a token.');
    }

    return String(payload.token);
  }

  private bindCallEvents(call: any) {
    call.on?.('ringing', () => this.emitStatus('ringing'));
    call.on?.('connected', () => this.emitStatus('connected'));
    call.on?.('reconnecting', () => this.emitStatus('reconnecting'));
    call.on?.('reconnected', () => this.emitStatus('connected'));
    call.on?.('disconnected', () => {
      this.emitStatus('ended');
      this.activeCall = null;
    });
    call.on?.('connectFailure', (error: unknown) => {
      this.emitStatus('error');
      this.emitError(error);
      this.activeCall = null;
    });
  }

  async makeCall(number: string) {
    if (!this.voice) {
      throw new Error('Twilio Voice is not initialized.');
    }

    this.currentToken = await this.fetchToken();
    this.emitStatus('dialing');

    this.activeCall = await this.voice.connect(this.currentToken, {
      params: {
        To: number,
      },
    });

    this.bindCallEvents(this.activeCall);
    return this.activeCall;
  }

  async acceptIncoming() {
    if (!this.incomingInvite) {
      throw new Error('There is no incoming call to answer.');
    }

    this.activeCall = await this.incomingInvite.accept();
    this.incomingInvite = null;
    this.bindCallEvents(this.activeCall);
    this.emitStatus('connected');
  }

  async rejectIncoming() {
    if (!this.incomingInvite) return;

    await this.incomingInvite.reject?.();
    this.incomingInvite = null;
    this.emitStatus('ended');
  }

  async mute(isMuted: boolean) {
    if (!this.activeCall) return;

    await this.activeCall.mute?.(isMuted);
  }

  async hangup() {
    if (!this.activeCall) return;

    await this.activeCall.disconnect?.();
    this.activeCall = null;
    this.emitStatus('ended');
  }
}

export const twilioVoiceService = new TwilioVoiceService();
