import { useEffect, useState } from 'react';
import { MEETINGS } from '../utils/meetings';
import { useMeetingTimer } from '../hooks/useMeetingTimer';
import type { MeetingState } from '../hooks/useMeetingTimer';
import { formatTime, formatCountdown } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { VideoCall } from '../components/VideoCall';
import { CalendarClock, Video,Link, PhoneOff, RefreshCw, Loader2 } from 'lucide-react';

export function JoinCall() {
  const [meeting, setMeeting] = useState<any | null>(null);

  // Video call state
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [meetingEndedReason, setMeetingEndedReason] = useState<'CleanExit' | 'NetworkError' | 'AgentNetworkError' | 'CustomerNetworkError' | null>(null);
  const [error, setError] = useState('');
  const [meetingData, setMeetingData] = useState<any | null>(null);

  // Permission state: 'checking' | 'granted' | 'denied' | 'prompt'
  const [permissionStatus, setPermissionStatus] = useState<string>('checking');
  const [isInitialCheck, setIsInitialCheck] = useState(true);

  // ── Auto-check & request permissions on page load ──
  useEffect(() => {
    const checkAndRequestPermissions = async () => {
      // First, check current permission state without prompting
      try {
        const camPerm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPerm = await navigator.permissions.query({ name: 'microphone' as PermissionName });

        if (camPerm.state === 'granted' && micPerm.state === 'granted') {
          setPermissionStatus('granted');
          return;
        }

        if (camPerm.state === 'denied' || micPerm.state === 'denied') {
          setPermissionStatus('denied');
          return;
        }
      } catch {
        // permissions.query not supported in all browsers — fall through to getUserMedia
      }

      // If state is 'prompt' or query not supported, trigger the browser permission dialog
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((track) => track.stop());
        setPermissionStatus('granted');
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionStatus('denied');
        } else {
          // No device found but might have audio — try audio only
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStream.getTracks().forEach((track) => track.stop());
            setPermissionStatus('granted'); // Audio at least works
          } catch {
            setPermissionStatus('denied');
          }
        }
      }
    };

    checkAndRequestPermissions();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('meetingId');
    if (id && MEETINGS[id]) {
      setMeeting({ id, ...MEETINGS[id] });
      setIsInitialCheck(false);
    } else {
      setIsInitialCheck(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      setMeetingData(null);
    };
  }, []);

  const { state: timerState, startTime, endTime } = useMeetingTimer(meeting);

  // Consider it "invalid" if no meeting is loaded yet, otherwise use timer state
  const state: MeetingState = !meeting ? 'INVALID' : timerState;

  const handleJoinCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setError('');

    // ── Step 1: Request camera & mic permissions ──
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      // Got permission — stop the tracks immediately so the hook can pick its own devices
      stream.getTracks().forEach((track) => track.stop());
    } catch (permErr: any) {
      // User denied or no devices available
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setError(
          'Camera and microphone access is required to join the video call. Please allow access in your browser settings and try again.'
        );
        setIsJoining(false);
        return;
      }
      // No camera but mic might work — try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((track) => track.stop());
        // Audio works, video doesn't — continue without video
        console.warn('[Permissions] Camera not available, joining with audio only');
      } catch {
        setError(
          'No camera or microphone found. Please connect a device and try again.'
        );
        setIsJoining(false);
        return;
      }
    }

    // ── Step 2: Join the meeting ──
    const controller = new AbortController();
    // const timeoutId = setTimeout(() => controller.abort(), 50_000);

    try {
      let response: Response;
      try {
        response = await fetch('http://localhost:3000/api/video/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ displayName: displayName.trim() }),
          signal: controller.signal,
        });
      } catch (fetchError: any) {
        // Network-level failures (offline, DNS, CORS, timeout)
        if (fetchError.name === 'AbortError') {
          throw new Error(
            'The request timed out. Please check your internet connection and make sure the backend server is running.'
          );
        }
        throw new Error(
          'Could not reach the server. Please make sure the backend is running at localhost:3000.'
        );
      }

      // Parse JSON safely
      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Server returned an unexpected response (HTTP ${response.status}). The backend may be misconfigured.`
        );
      }

      // API-level errors
      if (!response.ok || !data.success) {
        const serverMessage = data?.error?.message || 'Failed to join meeting';
        const errorCode = data?.error?.code || 'UNKNOWN';
        const retryable = data?.error?.retryable === true;

        console.error('[JOIN] Server error:', { errorCode, serverMessage, retryable });

        if (retryable) {
          throw new Error(`${serverMessage} (You can try again.)`);
        }
        throw new Error(serverMessage);
      }

      // Validate the meeting data we received
      const meetingPayload = data.data;
      if (!meetingPayload?.meeting || !meetingPayload?.attendee) {
        throw new Error(
          'The server returned an incomplete response — meeting or attendee data is missing. Please try again.'
        );
      }

      setMeetingData(meetingPayload);
      setInCall(true);
    } catch (err: any) {
      console.error('Error joining meeting:', err);
      setError(err.message || 'An unexpected error occurred while joining the meeting.');
    } finally {
      // clearTimeout(timeoutId);
      setIsJoining(false);
    }
  };

  const endCall = (reason: 'CleanExit' | 'NetworkError' | 'AgentNetworkError' | 'CustomerNetworkError' = 'CleanExit') => {
    setMeetingData(null);
    setInCall(false);
    setMeetingEndedReason(reason);
    setMeetingEnded(true);
  };

  // ── 1. Initialization Guard ─────────────────────────
  // Prevent any UI from rendering until we have checked for the meeting
  if (isInitialCheck) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="w-20 h-20 rounded-[28px] bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent" />
            <Loader2 size={32} className="text-blue-500 animate-spin relative z-10" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">
              Secure Connection
            </p>
            <p className="text-slate-400 text-sm font-medium animate-pulse">
              Initializing meeting session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Active Session View ───────────────────────────────
  if (inCall && meetingData) {
    return (
      <VideoCall
        meetingData={meetingData}
        displayName={displayName}
        onLeave={endCall}
      />
    );
  }

  // ── 3. Post-Call Screen ──────────────────────────────
  if (meetingEnded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <Modal 
          variant="red" 
          overlay={false} 
          icon={<PhoneOff />}
          title="Call Ended" 
          msg={
            meetingEndedReason === 'AgentNetworkError' ? "The agent was disconnected due to a network issue." :
            meetingEndedReason === 'CustomerNetworkError' ? "Your session ended due to your poor network connection." :
            "Your session has been completed. Thank you for joining."
          }
          actions={
            (meetingEndedReason === 'NetworkError' || meetingEndedReason === 'AgentNetworkError' || meetingEndedReason === 'CustomerNetworkError')
              ? [
                  { 
                    label: 'Rejoin Meeting', 
                    style: 'primary', 
                    icon: <RefreshCw size={16} />, 
                    onClick: () => { 
                      setMeetingEnded(false); 
                      setMeetingEndedReason(null);
                      setError(''); 
                    } 
                  },
                ] 
              : undefined
          } 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      
      {['EARLY', 'ACTIVE'].includes(state) ? (
        
        <div className="w-full max-w-md bg-white p-8 rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200 relative">
          {/* <div className={`h-1.5 w-full bg-blue-500 -mt-8 mb-8`} /> */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-50/80 to-transparent pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-blue-50 text-blue-500 border border-blue-100/50 shadow-inner relative z-10">
            <Video size={28} />
          </div>
          
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2 relative z-10">
            {meeting?.name || 'Join Meeting'}
          </h1>

          <p className="text-sm text-slate-500 font-medium mb-6 relative z-10">
            {state === 'EARLY' ? 'The session starts soon, but you can join early.' : 'The session is active. Enter your name to join.'}
          </p>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium relative z-10">
              {error}
            </div>
          )}
          {permissionStatus === 'denied' && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 relative z-10">
              <p className="text-sm font-semibold text-amber-800 mb-1">Camera & microphone blocked</p>
              <p className="text-xs text-amber-600 leading-relaxed mb-3">
                Click the lock/settings icon in your browser's address bar, allow camera and microphone, then reload.
              </p>
            </div>
          )}

          {permissionStatus === 'checking' && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 relative z-10">
              <p className="text-sm font-medium text-blue-600 animate-pulse">
                Requesting camera & microphone access...
              </p>
            </div>
          )}

          <form onSubmit={handleJoinCall} className="flex flex-col gap-4 relative z-10 text-left w-full">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900 font-medium"
                disabled={isJoining}
              />
            </div>

            <button
              type="submit"
              disabled={isJoining || !displayName.trim() || permissionStatus === 'denied' || permissionStatus === 'checking'}
              className="w-full mt-2 py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <span className="animate-pulse">Connecting...</span>
              ) : permissionStatus === 'denied' ? (
                <>Allow permissions to join</>
              ) : permissionStatus === 'checking' ? (
                <span className="animate-pulse">Checking permissions...</span>
              ) : (
                <>Join Video Call</>
              )}
            </button>
          </form>
        </div>

      ) : state === 'PENDING' ? (

        <Modal variant="amber" icon={<CalendarClock size={28} />} badge="Not Open Yet"
  title="Session Not Open Yet"
  msg="Your session hasn't opened yet. Check back a few minutes before start.">
  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col items-center">
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Your session is at</span>
    <span className="text-[22px] font-black text-slate-800">{startTime ? formatTime(startTime) : '--:--'}</span>
  </div>
  <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 flex flex-col items-center">
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1.5">Starts In</span>
    <span className="text-xl font-extrabold text-blue-600 font-mono">{startTime ? formatCountdown(Math.max(0, startTime.getTime() - new Date().getTime())) : '--'}</span>
  </div>
</Modal>

      ): state === 'EXPIRED' ?
               <Modal variant="red" icon={<CalendarClock size={28} />} badge="Session Expired"
              title="This meeting is no longer available."
              msg="Your meeting session has expired. Please contact your organizer to reschedule.">
              <div className="w-full space-y-3">
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
                    Session was scheduled for
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-800 tracking-tight">
                      {startTime ? formatTime(startTime) : '--:--'}
                    </span>
                    <span className="text-slate-300">—</span>
                    <span className="text-lg font-black text-slate-800 tracking-tight">
                      {endTime ? formatTime(endTime) : '--:--'}
                    </span>
                  </div>
                </div>
              </div>
              </Modal>
       : <Modal variant="red" overlay={false} icon={<Link size={28} />}
          title="Invalid Link"
          msg="We couldn't find a meeting with that ID. Please check your invitation link and try again." />}
    </div>
  );
}