import { useEffect, useState, useRef, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit3, Bot, PhoneIncoming, CalendarCheck, HelpCircle,
  Phone, PhoneOff, Mic, MicOff, Loader2, Volume2,
} from "lucide-react";

const VOICES = ["alloy", "echo", "shimmer", "nova", "fable"];
const MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"];

const TEMPLATES = [
  {
    key: "receptionist",
    icon: PhoneIncoming,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    label: "Receptionist Agent",
    description: "Greets callers, collects name/phone/purpose, saves leads",
    preset: {
      name: "Receptionist Agent",
      voice: "nova",
      model: "gpt-4o-mini",
      first_message: "Thank you for calling. This is your virtual receptionist. How may I help you today?",
      system_prompt: `You are a professional receptionist for a clinic. Your job is to warmly greet callers and collect their details.\n\nFollow these steps:\n1. Greet the caller professionally.\n2. Ask for their full name.\n3. Ask for their phone number.\n4. Ask for the purpose of their call.\n5. Thank them and let them know someone will follow up shortly.\n\nAlways be polite, calm, and concise. Do not give medical advice. If it is an emergency, instruct them to call 911 immediately.`,
    },
  },
  {
    key: "booking",
    icon: CalendarCheck,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    label: "Appointment Booking Agent",
    description: "Asks service type, preferred date & time, confirms booking",
    preset: {
      name: "Appointment Booking Agent",
      voice: "alloy",
      model: "gpt-4o-mini",
      first_message: "Hello! I'm here to help you schedule an appointment. What type of service are you looking to book today?",
      system_prompt: `You are an appointment booking agent for a clinic. Your goal is to collect all the information needed to schedule an appointment.\n\nFollow these steps:\n1. Ask the caller which service they need.\n2. Ask for their preferred date.\n3. Ask for their preferred time.\n4. Confirm all details back to the caller.\n5. Thank them and let them know they'll receive a confirmation.\n\nClinic hours: Monday–Saturday, 9am–6pm. Closed on Sundays.`,
    },
  },
  {
    key: "faq",
    icon: HelpCircle,
    color: "bg-violet-50 border-violet-200 text-violet-700",
    label: "FAQ / Support Agent",
    description: "Answers pricing, services, clinic timings questions",
    preset: {
      name: "FAQ Support Agent",
      voice: "shimmer",
      model: "gpt-4o-mini",
      first_message: "Hi there! I'm the clinic support assistant. What question can I help you with today?",
      system_prompt: `You are a knowledgeable FAQ and support agent for a clinic. Answer caller questions accurately and helpfully.\n\nAlways be concise. If you don't know the answer, say "Let me have someone from our team follow up with you."`,
    },
  },
];

const empty = {
  name: "",
  voice: "alloy",
  model: "gpt-4o-mini",
  first_message: "Hello! How can I help you today?",
  system_prompt: "You are a helpful AI voice assistant.",
};

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
  const callLogIdRef = useRef(null);
  const callStartTimeRef = useRef(null);

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

        instance.on("call-start", () => {
          setCallState("active");
          callStartTimeRef.current = Date.now();
        });

        instance.on("call-end", async () => {
          const duration = callStartTimeRef.current
            ? (Date.now() - callStartTimeRef.current) / 1000
            : 0;
          if (callLogIdRef.current) {
            try {
              await api.post(`/calls/web-end?call_id=${callLogIdRef.current}&duration_seconds=${Math.round(duration)}`);
            } catch (e) {
              console.error("Failed to log call end", e);
            }
            callLogIdRef.current = null;
          }
          callStartTimeRef.current = null;
          setCallState("idle");
          setActiveAgentId(null);
          setIsMuted(false);
          setAgentSpeaking(false);
        });

        instance.on("error", async (err) => {
          console.error("Vapi error", err);
          toast.error("Voice call error: " + (err?.message || "Unknown error"));
          if (callLogIdRef.current) {
            try {
              await api.post(`/calls/web-end?call_id=${callLogIdRef.current}&duration_seconds=0`);
            } catch (_) {}
            callLogIdRef.current = null;
          }
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
    }).catch(() => {
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
      // Log call start to DB
      try {
        const { data } = await api.post(`/calls/web-start?agent_id=${agent.id}`);
        callLogIdRef.current = data.call_id;
      } catch (e) {
        console.error("Failed to log call start", e);
      }
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
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onMute}>
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const {
    sdkReady, callState, activeAgentId, isMuted,
    vapiPublicKey, transcript, agentSpeaking,
    startCall, endCall, toggleMute,
  } = useVapi();

  const load = async () => setAgents((await api.get("/agents")).data);
  useEffect(() => { load(); }, []);

  const openCreate = (preset) => { setEditing(null); setForm(preset || empty); setOpen(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({ name: a.name, voice: a.voice, model: a.model, first_message: a.first_message, system_prompt: a.system_prompt, is_disabled: a.is_disabled });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/agents/${editing.id}`, form);
        toast.success("Agent updated");
      } else {
        await api.post("/agents", form);
        toast.success("Agent created");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

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

  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: typeof v === "string" ? v : v.target.value }));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Voice Agents"
        subtitle="Create, manage, and call your AI phone agents"
        action={
          <Button onClick={() => openCreate(null)}>
            <Plus className="h-4 w-4 mr-2" /> Custom Agent
          </Button>
        }
      />

      {!vapiPublicKey && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          <strong>In-browser calls disabled:</strong> Add{" "}
          <code className="bg-amber-100 px-1 rounded">VAPI_PUBLIC_KEY</code> and{" "}
          <code className="bg-amber-100 px-1 rounded">VAPI_API_KEY</code> to{" "}
          <code className="bg-amber-100 px-1 rounded">backend/.env</code>, then restart the backend.
        </div>
      )}

      <SectionCard title="Quick-Start Templates" subtitle="Deploy a pre-configured agent in one click">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => (
            <div key={t.key} className={`rounded-xl border-2 p-5 ${t.color} flex flex-col gap-3`}>
              <div className="flex items-center gap-3">
                <t.icon className="h-6 w-6" />
                <span className="font-semibold text-sm">{t.label}</span>
              </div>
              <p className="text-xs opacity-80 leading-relaxed">{t.description}</p>
              <Button
                size="sm" variant="outline"
                className="mt-auto self-start border-current bg-white/60 hover:bg-white"
                onClick={() => openCreate(t.preset)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Use Template
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="My Agents" subtitle={`${agents.length} agent${agents.length !== 1 ? "s" : ""} configured`}>
        {agents.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No agents yet — use a template above or create a custom one.</p>
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
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Agent" : "Create Agent"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={f("name")} placeholder="e.g. Receptionist Agent" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Voice</Label>
                <Select value={form.voice} onValueChange={f("voice")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOICES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select value={form.model} onValueChange={f("model")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>First Message</Label>
              <Input value={form.first_message} onChange={f("first_message")} />
            </div>
            <div className="space-y-1.5">
              <Label>System Prompt</Label>
              <Textarea value={form.system_prompt} onChange={f("system_prompt")} rows={10} className="font-mono text-xs" />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch
                  id="disabled"
                  checked={!!form.is_disabled}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_disabled: v }))}
                />
                <Label htmlFor="disabled">Disable agent</Label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save Changes" : "Create Agent"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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