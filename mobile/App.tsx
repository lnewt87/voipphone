import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { twilioVoiceService } from './src/services/TwilioVoiceService';
import type { CallState, Contact, RecentCall } from './src/types';

const contacts: Contact[] = [
  { id: '1', name: 'Maya Chen', company: 'Northstar Digital', number: '+15550101182' },
  { id: '2', name: 'James Walker', company: 'Harbor Build Co.', number: '+15550182304' },
  { id: '3', name: 'Sofia Patel', company: 'Lumina Health', number: '+15550198820' },
];

const keypad = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', ''],
];

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const IDENTITY = process.env.EXPO_PUBLIC_TWILIO_IDENTITY ?? 'mobile_user';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const normalizeNumber = (value: string) =>
  value.replace(/[^\d+*#]/g, '').replace(/(?!^)\+/g, '');

export default function App() {
  const [tab, setTab] = useState<'dialer' | 'recents' | 'contacts'>('dialer');
  const [number, setNumber] = useState('');
  const [callState, setCallState] = useState<CallState>('idle');
  const [liveMode, setLiveMode] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [incomingFrom, setIncomingFrom] = useState('');
  const [error, setError] = useState('');
  const [recents, setRecents] = useState<RecentCall[]>([]);
  const [simulatedIncoming, setSimulatedIncoming] = useState(false);

  const callStartedAt = useRef<Date | null>(null);
  const currentDirection = useRef<'outgoing' | 'incoming'>('outgoing');
  const currentNumber = useRef('');

  useEffect(() => {
    twilioVoiceService.setHandlers({
      onStatus: (status) => {
        if (status === 'dialing') {
          setCallState('dialing');
          setStatusText('Dialing…');
        } else if (status === 'ringing') {
          setCallState('ringing');
          setStatusText('Ringing…');
        } else if (status === 'connected') {
          setCallState('connected');
          setStatusText('Connected');
          callStartedAt.current = callStartedAt.current ?? new Date();
        } else if (status === 'reconnecting') {
          setStatusText('Reconnecting…');
        } else if (status === 'ended') {
          finishCall('Completed');
        } else if (status === 'error') {
          setCallState('error');
          setStatusText('Call failed');
        }
      },
      onIncoming: (from) => {
        currentDirection.current = 'incoming';
        currentNumber.current = from;
        setIncomingFrom(from);
        setCallState('incoming');
        setStatusText('Incoming call');
      },
      onError: (message) => {
        setError(message);
      },
    });

    twilioVoiceService
      .initialize(API_BASE_URL, IDENTITY)
      .then((result) => {
        setLiveMode(result.live);
        setStatusText(result.live ? 'Twilio connected' : 'Demo mode');
      })
      .catch(() => {
        setLiveMode(false);
        setStatusText('Demo mode');
      });
  }, []);

  useEffect(() => {
    if (callState !== 'connected') {
      if (callState === 'idle') setSeconds(0);
      return;
    }

    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [callState]);

  const isInCall = useMemo(
    () => ['dialing', 'ringing', 'connected'].includes(callState),
    [callState],
  );

  const appendDigit = (digit: string) => {
    if (isInCall || callState === 'incoming') return;
    setNumber((value) => normalizeNumber(value + digit));
  };

  const deleteDigit = () => setNumber((value) => value.slice(0, -1));

  const addRecent = (
    result: RecentCall['result'],
    durationSeconds = seconds,
  ) => {
    const target = currentNumber.current || number || incomingFrom || 'Unknown';

    setRecents((items) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        number: target,
        direction: currentDirection.current,
        startedAt: callStartedAt.current ?? new Date(),
        durationSeconds,
        result,
      },
      ...items,
    ].slice(0, 30));
  };

  const resetCall = () => {
    setCallState('idle');
    setStatusText(liveMode ? 'Twilio connected' : 'Demo mode');
    setMuted(false);
    setSeconds(0);
    setIncomingFrom('');
    setSimulatedIncoming(false);
    callStartedAt.current = null;
    currentNumber.current = '';
  };

  const finishCall = (result: RecentCall['result']) => {
    if (callState !== 'idle') addRecent(result);
    setTimeout(resetCall, 350);
  };

  const call = async (target = number) => {
    const clean = normalizeNumber(target);

    if (!clean) {
      setError('Enter a phone number first.');
      return;
    }

    setError('');
    setNumber(clean);
    currentDirection.current = 'outgoing';
    currentNumber.current = clean;
    callStartedAt.current = new Date();

    if (!liveMode) {
      setCallState('dialing');
      setStatusText('Dialing…');

      setTimeout(() => {
        setCallState('ringing');
        setStatusText('Ringing…');
      }, 700);

      setTimeout(() => {
        setCallState('connected');
        setStatusText('Connected · Demo');
      }, 1700);

      return;
    }

    try {
      await twilioVoiceService.makeCall(clean);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start call.');
      setCallState('error');
      setStatusText('Call failed');
    }
  };

  const hangup = async () => {
    if (liveMode) {
      try {
        await twilioVoiceService.hangup();
      } catch {
        // UI still ends the call even if the SDK reports a disconnect error.
      }
    }

    finishCall(callState === 'connected' ? 'Completed' : 'Cancelled');
  };

  const toggleMute = async () => {
    const next = !muted;
    setMuted(next);

    if (liveMode) {
      try {
        await twilioVoiceService.mute(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Mute control failed.');
      }
    }
  };

  const simulateIncomingCall = () => {
    if (isInCall || callState === 'incoming') return;

    currentDirection.current = 'incoming';
    currentNumber.current = '+15550142222';
    setIncomingFrom('+1 (555) 014-2222');
    setCallState('incoming');
    setStatusText('Incoming call');
    setSimulatedIncoming(true);
  };

  const answerIncoming = async () => {
    setError('');
    callStartedAt.current = new Date();

    if (liveMode && !simulatedIncoming) {
      try {
        await twilioVoiceService.acceptIncoming();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to answer call.');
        return;
      }
    }

    setCallState('connected');
    setStatusText(liveMode ? 'Connected' : 'Connected · Demo');
  };

  const rejectIncoming = async () => {
    if (liveMode && !simulatedIncoming) {
      try {
        await twilioVoiceService.rejectIncoming();
      } catch {
        // Fall through to UI reset.
      }
    }

    addRecent('Missed', 0);
    resetCall();
  };

  const renderCallPanel = () => (
    <View style={styles.callPanel}>
      <Text style={styles.callEyebrow}>
        {currentDirection.current === 'incoming' ? 'INCOMING CALL' : 'ACTIVE CALL'}
      </Text>
      <Text style={styles.callNumber}>
        {currentNumber.current || number || incomingFrom}
      </Text>
      <Text style={styles.callStatus}>
        {statusText}
        {callState === 'connected' ? ` · ${formatDuration(seconds)}` : ''}
      </Text>

      <View style={styles.callControls}>
        <Pressable
          onPress={toggleMute}
          style={[styles.roundControl, muted && styles.roundControlActive]}
        >
          <Text style={styles.roundControlIcon}>{muted ? 'M' : 'MIC'}</Text>
          <Text style={styles.roundControlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </Pressable>

        <Pressable onPress={hangup} style={[styles.roundControl, styles.hangup]}>
          <Text style={styles.hangupIcon}>END</Text>
          <Text style={styles.roundControlLabel}>Hang up</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderIncoming = () => (
    <View style={styles.incomingCard}>
      <Text style={styles.incomingLabel}>INCOMING CALL</Text>
      <Text style={styles.incomingNumber}>{incomingFrom}</Text>
      <Text style={styles.incomingSub}>CallDesk Voice</Text>

      <View style={styles.incomingButtons}>
        <Pressable onPress={rejectIncoming} style={[styles.answerButton, styles.rejectButton]}>
          <Text style={styles.answerButtonText}>Reject</Text>
        </Pressable>
        <Pressable onPress={answerIncoming} style={[styles.answerButton, styles.acceptButton]}>
          <Text style={styles.answerButtonText}>Answer</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderDialer = () => (
    <ScrollView contentContainerStyle={styles.dialerContent}>
      <View style={styles.modeRow}>
        <View style={[styles.modeBadge, liveMode ? styles.liveBadge : styles.demoBadge]}>
          <Text style={styles.modeBadgeText}>{liveMode ? 'LIVE TWILIO' : 'DEMO MODE'}</Text>
        </View>
        <Text style={styles.statusSmall}>{statusText}</Text>
      </View>

      {error ? (
        <Pressable onPress={() => setError('')} style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </Pressable>
      ) : null}

      {callState === 'incoming'
        ? renderIncoming()
        : isInCall
          ? renderCallPanel()
          : (
            <>
              <TextInput
                style={styles.numberInput}
                value={number}
                onChangeText={(value) => setNumber(normalizeNumber(value))}
                keyboardType="phone-pad"
                placeholder="+1 555 123 4567"
                placeholderTextColor="#626b78"
                textAlign="center"
              />

              <View style={styles.keypad}>
                {keypad.map(([digit, letters]) => (
                  <Pressable
                    key={digit}
                    style={styles.key}
                    onPress={() => appendDigit(digit)}
                    onLongPress={() => digit === '0' && appendDigit('+')}
                  >
                    <Text style={styles.keyDigit}>{digit}</Text>
                    <Text style={styles.keyLetters}>{letters}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.dialActions}>
                <Pressable
                  onPress={deleteDigit}
                  disabled={!number}
                  style={styles.smallAction}
                >
                  <Text style={styles.smallActionText}>⌫</Text>
                </Pressable>

                <Pressable onPress={() => call()} style={styles.callButton}>
                  <Text style={styles.callButtonText}>CALL</Text>
                </Pressable>

                <Pressable
                  onPress={simulateIncomingCall}
                  style={styles.smallAction}
                >
                  <Text style={styles.smallActionText}>IN</Text>
                </Pressable>
              </View>

              <Text style={styles.helperText}>
                {liveMode
                  ? 'Calls use the Twilio backend configured for this build.'
                  : 'Tap IN to simulate an incoming call, or place a demo outgoing call.'}
              </Text>
            </>
          )}
    </ScrollView>
  );

  const renderRecents = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <Text style={styles.sectionTitle}>Recent Calls</Text>

      {recents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No recent calls</Text>
          <Text style={styles.emptyText}>Calls placed in this session will appear here.</Text>
        </View>
      ) : (
        recents.map((item) => (
          <Pressable
            key={item.id}
            style={styles.listCard}
            onPress={() => {
              setNumber(item.number);
              setTab('dialer');
            }}
          >
            <View>
              <Text style={styles.listTitle}>{item.number}</Text>
              <Text style={styles.listSub}>
                {item.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} · {item.result}
              </Text>
            </View>
            <View style={styles.listMeta}>
              <Text style={styles.listMetaText}>
                {item.startedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Text style={styles.listMetaText}>{formatDuration(item.durationSeconds)}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );

  const renderContacts = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <Text style={styles.sectionTitle}>Contacts</Text>

      {contacts.map((contact) => (
        <View key={contact.id} style={styles.listCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {contact.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.listTitle}>{contact.name}</Text>
            <Text style={styles.listSub}>{contact.company}</Text>
            <Text style={styles.contactNumber}>{contact.number}</Text>
          </View>
          <Pressable
            style={styles.contactCall}
            onPress={() => {
              setNumber(contact.number);
              setTab('dialer');
              setTimeout(() => call(contact.number), 100);
            }}
          >
            <Text style={styles.contactCallText}>CALL</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0b111b" />

      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>CallDesk</Text>
          <Text style={styles.brandSub}>Mobile Softphone</Text>
        </View>
        <View style={styles.identityBox}>
          <Text style={styles.identityLabel}>IDENTITY</Text>
          <Text style={styles.identityValue}>{IDENTITY}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {tab === 'dialer' && renderDialer()}
        {tab === 'recents' && renderRecents()}
        {tab === 'contacts' && renderContacts()}
      </View>

      <View style={styles.tabBar}>
        {[
          ['dialer', 'Dialer'],
          ['recents', 'Recents'],
          ['contacts', 'Contacts'],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setTab(value as typeof tab)}
            style={styles.tab}
          >
            <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0b111b',
  },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1e2937',
  },
  brand: {
    color: '#f8fafc',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSub: {
    color: '#778397',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  identityBox: {
    alignItems: 'flex-end',
  },
  identityLabel: {
    color: '#596579',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  identityValue: {
    color: '#aab5c5',
    fontSize: 12,
    marginTop: 3,
  },
  body: {
    flex: 1,
  },
  dialerContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    alignItems: 'center',
  },
  modeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveBadge: {
    backgroundColor: '#0e5b42',
  },
  demoBadge: {
    backgroundColor: '#5b4520',
  },
  modeBadgeText: {
    color: '#f8fafc',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusSmall: {
    color: '#758196',
    fontSize: 11,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#361b20',
    borderWidth: 1,
    borderColor: '#5b2c35',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#ffafb9',
    fontSize: 12,
  },
  numberInput: {
    width: '100%',
    color: '#f8fafc',
    fontSize: 29,
    fontWeight: '600',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2b3a',
    marginBottom: 22,
  },
  keypad: {
    width: 312,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  key: {
    width: 82,
    height: 72,
    borderRadius: 41,
    backgroundColor: '#151e2b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#202d3d',
  },
  keyDigit: {
    color: '#f8fafc',
    fontSize: 25,
    fontWeight: '600',
  },
  keyLetters: {
    color: '#697589',
    fontSize: 8,
    letterSpacing: 1.3,
    marginTop: 1,
  },
  dialActions: {
    width: 260,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  callButtonText: {
    color: '#052e16',
    fontSize: 13,
    fontWeight: '900',
  },
  smallAction: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#141d29',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionText: {
    color: '#aeb8c7',
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    color: '#596579',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 330,
  },
  callPanel: {
    width: '100%',
    minHeight: 445,
    borderRadius: 24,
    backgroundColor: '#101925',
    borderWidth: 1,
    borderColor: '#1e2b3a',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  callEyebrow: {
    color: '#607086',
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  callNumber: {
    color: '#f8fafc',
    fontSize: 27,
    fontWeight: '700',
    marginTop: 18,
  },
  callStatus: {
    color: '#8c9ab0',
    fontSize: 13,
    marginTop: 8,
  },
  callControls: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 72,
  },
  roundControl: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#1a2533',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundControlActive: {
    backgroundColor: '#344256',
  },
  roundControlIcon: {
    color: '#e7edf5',
    fontSize: 13,
    fontWeight: '800',
  },
  roundControlLabel: {
    color: '#a7b1c0',
    fontSize: 10,
    marginTop: 5,
  },
  hangup: {
    backgroundColor: '#d9394f',
  },
  hangupIcon: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  incomingCard: {
    width: '100%',
    minHeight: 460,
    borderRadius: 24,
    backgroundColor: '#111b28',
    borderWidth: 1,
    borderColor: '#223247',
    padding: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  incomingLabel: {
    color: '#6f7f95',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  incomingNumber: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 18,
  },
  incomingSub: {
    color: '#718096',
    fontSize: 13,
    marginTop: 7,
  },
  incomingButtons: {
    flexDirection: 'row',
    gap: 42,
    marginTop: 80,
  },
  answerButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#dc354f',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  answerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  listContent: {
    padding: 22,
    paddingBottom: 35,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 18,
  },
  listCard: {
    backgroundColor: '#111a26',
    borderWidth: 1,
    borderColor: '#1e2a3a',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listTitle: {
    color: '#eff4fa',
    fontSize: 15,
    fontWeight: '700',
  },
  listSub: {
    color: '#778397',
    fontSize: 11,
    marginTop: 4,
  },
  listMeta: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  listMetaText: {
    color: '#697589',
    fontSize: 10,
    marginTop: 3,
  },
  emptyCard: {
    backgroundColor: '#111a26',
    borderWidth: 1,
    borderColor: '#1e2a3a',
    borderRadius: 15,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#e8eef6',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: '#68768a',
    fontSize: 11,
    marginTop: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#273851',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#dbe7f5',
    fontSize: 12,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
  },
  contactNumber: {
    color: '#5f8fd6',
    fontSize: 10,
    marginTop: 4,
  },
  contactCall: {
    backgroundColor: '#143b2a',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },
  contactCallText: {
    color: '#55d98b',
    fontSize: 10,
    fontWeight: '900',
  },
  tabBar: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#1e2937',
    backgroundColor: '#0d141e',
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#626f82',
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#67a0ff',
  },
});
