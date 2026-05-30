import { useEffect, useState, useRef, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Trash2, Bot, PhoneIncoming, CalendarCheck, HelpCircle,
  Phone, PhoneOff, Mic, MicOff, Loader2, Volume2,
} from "lucide-react";

const TEMPLATES = [
  {
    key: "receptionist",
    icon: PhoneIncoming,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    label: "Receptionist Agent",
    description: "Greets callers, collects name/phone/purpose, saves leads",
  },
  {
    key: "booking",
    icon: CalendarCheck,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    label: "Appointment Booking Agent",
    description: "Asks service type, preferred date & time, confirms booking",
  },
  {
    key: "faq",
    icon: HelpCircle,
    color: "bg-violet-50 border-violet-200 text-violet-700",
    label: "FAQ / Support Agent",
    description: "Answers pricing, services, clinic timings questions",
  },
];

function agentTypeIcon(agent) {
  const name = (agent.name + " " + agent.system_prompt).toLowerCase();
  if (name.includes("receptionist")) return { Icon: PhoneIncoming, color: "text-blue-500" };
  if (name.includes("booking") || name.includes("appointment")) return { Icon: CalendarCheck, color: "text-emerald-500" };
  if (name.includes("faq") || name.includes("support")) return { Icon: HelpCircle, color: "text-violet-500" };
  return { Icon: Bot, color: "text-slate-400" };
}

function useVapi() {
  const vapiRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [callState, setCallState] = useState("idle");
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [vapiPublicKey, setVapiPublicKey] = useState("");
  const [transcript, setTranscript] = useState([]);
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  useEffect(() => {
    api.get("/vapi/public-key")
      .then(({ data }) => { if (data.public_key) setVapiPublicKey(data.public_key); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!vapiPublicKey || vapiRef.current) return;
    import("@vapi-ai/web").then(({ default: Vapi }) => {
      try {
        const instance = new Vapi(vapiPublicKey);
        instance.on("call-start", () => setCallState("active"));
        instance.on("call-end", () => {
          setCallState("idle");
          setActiveAgentId(null);
          setIsMuted(false);
          setAgentSpeaking(false);
        });
        instance.on("error", (err) => {
          console.error("Vapi error", err);
          toast.error("Voice call error: " + (err?.message || "Unknown error"));
          setCallState("idle");
          setActiveAgentId(null);
          setAgentSpeaking(false);
        });
        instance.on("message", (msg) => {
          if (msg?.type === "transcript" && msg.transcriptType === "final") {
            setTranscript((prev) => [...prev, { role: msg.role, text: msg.transcript }]);
          }
          if (msg?.type === "speech-update") {
            setAgentSpeaking(msg.status === "started" && msg.role === "assistant");
          }
        });
        vapiRef.current = instance;
        setSdkReady(true);
      } catch (e) {
        console.error("Vapi init error", e);
      }
    }).catch((e) => {
      console.error("Failed to load @vapi-ai/web:", e);
      toast.error("Failed to load Vapi SDK. Run: yarn add @vapi-ai/web");
    });
  }, [vapiPublicKey]);

  const startCall = useCallback(async (agent) => {
    if (!vapiRef.current) { toast.error("Vapi SDK not ready."); return; }
    if (!agent.vapi_assistant_id) { toast.error("No Vapi assistant ID."); return; }
    try {
      setCallState("connecting");
      setActiveAgentId(agent.id);
      setTranscript([]);
      await vapiRef.current.start(agent.vapi_assistant_id);
    } catch (e) {
      toast.error("Failed to start call: " + (e?.message || "Unknown error"));
      setCallState("idle");
      setActiveAgentId(null);
    }
  }, []);

  const endCall = useCallback(() => {
    if (vapiRef.current) { setCallState("ending"); vapiRef.current.stop(); }
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
    setIsMuted(next);
  }, [isMuted]);

  return { sdkReady, callState, activeAgentId, isMuted, vapiPublicKey, transcript, agentSpeaking, startCall, endCall, toggleMute };
}

function VoiceCallButton({ agent, callState, activeAgentId, sdkReady, vapiPublicKey, isMuted, onStart, onEnd, onMute }) {
  const isThisCall = activeAgentId === agent.id;
  const otherCallActive = callState !== "idle" && !isThisCall;
  const noVapi = !agent.vapi_assistant_id;
  const noKey = !vapiPublicKey;

  if (noVapi || noKey) {
    return (
      <div
        title={noVapi ? "No Vapi assistant ID" : "No Vapi public key"}
        className="flex items-center gap-1 text-xs text-amber-500 cursor-default select-none"
      >
        <Phone className="h-3.5 w-3.5" />
        <span>{noKey ? "No public key" : "No Vapi ID"}</span>
      </div>
    );
  }

  if (isThisCall) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="icon" variant="ghost"
          className={isMuted ? "text-amber-500 hover:text-amber-600" : "text-slate-500 hover:text-slate-600"}
          onClick={onMute} title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="destructive" className="gap-1.5" onClick={onEnd} disabled={callState === "ending"}>
          {callState === "ending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneOff className="h-3.5 w-3.5" />}
          {callState === "connecting" ? "Connecting…" : callState === "ending" ? "Ending…" : "End Call"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm" variant="outline"
      className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
      onClick={() => onStart(agent)}
      disabled={otherCallActive || !sdkReady || agent.is_disabled}
      title={otherCallActive ? "Another call is active" : agent.is_disabled ? "Agent is disabled" : "Start voice call"}
    >
      {callState === "connecting" && isThisCall
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Phone className="h-3.5 w-3.5" />}
      Call
    </Button>
  );
}

function ActiveCallBanner({ agents, callState, activeAgentId, isMuted, agentSpeaking, transcript, onEnd, onMute }) {
  const transcriptRef = useRef(null);
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  if (callState === "idle" || !activeAgentId) return null;
  const agent = agents.find((a) => a.id === activeAgentId);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden"
      style={{ minWidth: 340, maxWidth: 480, width: "90vw" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{agent?.name || "Voice Agent"}</div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            {callState === "connecting" ? "Connecting…" : callState === "ending" ? "Ending…" : (
              agentSpeaking
                ? <><Volume2 className="h-3 w-3 text-emerald-500" /> Agent speaking…</>
                : "Listening…"
            )}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onMute} title={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <MicOff className="h-4 w-4 text-amber-500" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="destructive" className="gap-1.5 h-8" onClick={onEnd} disabled={callState === "ending"}>
          {callState === "ending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneOff className="h-3.5 w-3.5" />}
          End
        </Button>
      </div>
      {transcript.length > 0 && (
        <div ref={transcriptRef} className="px-4 py-2 max-h-36 overflow-y-auto space-y-1">
          {transcript.map((t, i) => (
            <div key={i} className={`text-xs ${t.role === "assistant" ? "text-slate-700" : "text-emerald-700 text-right"}`}>
              <span className={`font-medium ${t.role === "assistant" ? "text-slate-400" : "text-emerald-400"}`}>
                {t.role === "assistant" ? "Agent: " : "You: "}
              </span>
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserAgents() {
  const [agents, setAgents] = useState([]);

  const {
    sdkReady, callState, activeAgentId, isMuted,
    vapiPublicKey, transcript, agentSpeaking,
    startCall, endCall, toggleMute,
  } = useVapi();

  const load = async () => setAgents((await api.get("/agents")).data);
  useEffect(() => { load(); }, []);

  const remove = async (a) => {
    if (callState !== "idle" && activeAgentId === a.id) {
      toast.error("End the active call before deleting this agent.");
      return;
    }
    if (!window.confirm(`Delete agent "${a.name}"?`)) return;
    await api.delete(`/agents/${a.id}`);
    toast.success("Agent deleted");
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Voice Agents"
        subtitle="Manage and call your AI phone agents"
      />

      {!vapiPublicKey && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          <strong>In-browser calls disabled:</strong> Add{" "}
          <code className="bg-amber-100 px-1 rounded">VAPI_PUBLIC_KEY</code> and{" "}
          <code className="bg-amber-100 px-1 rounded">VAPI_API_KEY</code> to{" "}
          <code className="bg-amber-100 px-1 rounded">backend/.env</code>, then restart the backend.
        </div>
      )}

      

      <SectionCard title="My Agents" subtitle={`${agents.length} agent${agents.length !== 1 ? "s" : ""} configured`}>
        {agents.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No agents assigned yet. Contact your administrator.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {agents.map((a) => {
              const { Icon, color } = agentTypeIcon(a);
              const isThisCall = activeAgentId === a.id;
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between py-4 gap-4 ${isThisCall ? "bg-emerald-50 -mx-4 px-4 rounded-lg" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 relative">
                      <Icon className={`h-4 w-4 ${color}`} />
                      {isThisCall && callState === "active" && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{a.name}</div>
                      <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                        {a.vapi_assistant_id
                          ? <span className="text-emerald-600">● Live on Vapi</span>
                          : <span className="text-amber-500">○ No Vapi key</span>}
                        {" · "}{a.voice} · {a.model}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.is_disabled && <Badge variant="secondary">Disabled</Badge>}
                    <VoiceCallButton
                      agent={a}
                      callState={callState}
                      activeAgentId={activeAgentId}
                      sdkReady={sdkReady}
                      vapiPublicKey={vapiPublicKey}
                      isMuted={isMuted}
                      onStart={startCall}
                      onEnd={endCall}
                      onMute={toggleMute}
                    />
                    <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => remove(a)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <ActiveCallBanner
        agents={agents}
        callState={callState}
        activeAgentId={activeAgentId}
        isMuted={isMuted}
        agentSpeaking={agentSpeaking}
        transcript={transcript}
        onEnd={endCall}
        onMute={toggleMute}
      />
    </div>
  );
}