import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { useMeetingTimer } from '../hooks/useMeetingTimer';
import type { MeetingState } from '../hooks/useMeetingTimer';
import { formatTime, formatCountdown } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { VideoCall } from '../components/VideoCall';
import { CalendarClock, Video,Link, PhoneOff, RefreshCw, WifiOff } from 'lucide-react';

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
    if (id) {
      const fetchMeeting = async () => {
        try {
          const response = await apiClient.get(`/appointments/${id}`);
          const data = response.data;
          
          // Convert DynamoDB format (2026-04-06, 1230) to Date objects
          // Assuming the format is YYYY-MM-DD and HHMM
          const startStr = `${data.appointmentDate}T${data.startTime.slice(0, 2)}:${data.startTime.slice(2)}:00`;
          const endStr = `${data.appointmentDate}T${data.endTime.slice(0, 2)}:${data.endTime.slice(2)}:00`;
          
          setMeeting({
            id: data.appointmentId,
            name: data.bookingPurpose ? data.bookingPurpose.toUpperCase() : 'MEETING',
            customerName: data.customerName,
            start: new Date(startStr).toISOString(),
            end: new Date(endStr).toISOString(),
          });
          
          // Auto-fill display name if available
          if (data.customerName) {
            setDisplayName(data.customerName);
          }

          // Check if meeting is already completed
          if (data.status === 'COMPLETED') {
            setMeetingEnded(true);
            setMeetingEndedReason('CleanExit');
          }
        } catch (err) {
          console.error('Error fetching appointment:', err);
          setMeeting(null);
        } finally {
          setIsInitialCheck(false);
        }
      };
      
      fetchMeeting();
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
      let response: any;
      try {
        response = await apiClient.post('/video/join', { 
          displayName: displayName.trim(),
          appointmentId: meeting.id
        }, {
          signal: controller.signal,
        });
      } catch (axiosError: any) {
        if (axiosError.name === 'CanceledError') {
          throw new Error('The request timed out. Please check your internet connection.');
        }

        const serverMessage = axiosError.response?.data?.error?.message || 'Failed to join meeting';
        throw new Error(serverMessage);
      }

      // Success logic - axios already parsed json and checked status
      const data = response.data;
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to join meeting');
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

  const endCall = async (reason: 'CleanExit' | 'NetworkError' | 'AgentNetworkError' | 'CustomerNetworkError' = 'CleanExit') => {
    // If it's a clean exit (user or agent clicked leave), mark as completed in DynamoDB
    if (reason === 'CleanExit' && meeting?.id) {
      try {
        await apiClient.post(`/appointments/${meeting.id}/complete`);
      } catch (err) {
        console.error('Failed to mark appointment as completed:', err);
      }
    }

    setMeetingData(null);
    setInCall(false);
    setMeetingEndedReason(reason);
    setMeetingEnded(true);
  };

  // ── 1. Initialization Skeleton ─────────────────────────
  if (isInitialCheck) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-md bg-white p-8 rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden animate-pulse">
          {/* Icon Placeholder */}
          <div className="w-16 h-16 rounded-2xl bg-slate-100 mb-6" />
          
          {/* Title Placeholder */}
          <div className="h-8 bg-slate-100 rounded-lg w-3/4 mb-2" />
          
          {/* Description Placeholder */}
          <div className="h-4 bg-slate-50 rounded-md w-1/2 mb-8" />
          
          {/* Form Skeleton */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 rounded w-16 mb-2" />
              <div className="h-12 bg-slate-50 rounded-xl w-full border border-slate-100" />
            </div>
            
            {/* Button Placeholder */}
            <div className="h-14 bg-slate-100 rounded-xl w-full mt-2" />
          </div>

          {/* Shine effect animation */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
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
          variant={meetingEndedReason === 'CleanExit' ? 'red' : 'amber'} 
          overlay={false} 
          icon={meetingEndedReason === 'CleanExit' ? <PhoneOff /> : <WifiOff />}
          title={
            meetingEndedReason === 'AgentNetworkError' ? "Agent Disconnected" :
            meetingEndedReason === 'CustomerNetworkError' ? "Your Connection Lost" :
            meetingEndedReason === 'NetworkError' ? "Network Disturbance" :
            "Call Ended"
          } 
          msg={
            meetingEndedReason === 'AgentNetworkError' ? "The agent was disconnected due to a severe network issue on their end. Please try rejoining." :
            meetingEndedReason === 'CustomerNetworkError' ? "Your session was interrupted because of a poor internet connection on your device." :
            meetingEndedReason === 'NetworkError' ? "We encountered a network issue during the session. Please try to rejoin." :
            "Your session has been completed successfully. Thank you for joining."
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
            {state === 'EARLY' ? 'The session starts soon, but you can join early.' : 'The session is active. Ready to join the call?'}
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
                readOnly
                placeholder="Name will be filled from appointment"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 focus:outline-none cursor-not-allowed placeholder:text-slate-400 text-slate-600 font-medium opacity-80"
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