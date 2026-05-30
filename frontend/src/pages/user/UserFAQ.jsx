import { useState } from "react";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, HelpCircle, Search, Copy } from "lucide-react";

// Default clinic knowledge base (editable by user, stored in localStorage)
const DEFAULT_FAQ = [
  { id: "1", category: "Pricing", question: "How much is a general consultation?", answer: "$50 per session. Follow-up visits are $30." },
  { id: "2", category: "Pricing", question: "What do lab tests cost?", answer: "Lab tests range from $40–$120 depending on the type of test." },
  { id: "3", category: "Services", question: "What services do you offer?", answer: "General Consultation, Dental Checkup, Follow-up Visit, Lab Tests, Physiotherapy, and Vaccinations." },
  { id: "4", category: "Timings", question: "What are your clinic hours?", answer: "We are open Monday–Saturday, 9am to 6pm. Closed on Sundays and public holidays." },
  { id: "5", category: "Timings", question: "Do I need an appointment?", answer: "Appointments are preferred. Walk-ins are welcome for general consultations only." },
  { id: "6", category: "Insurance", question: "Do you accept insurance?", answer: "Yes, we accept BlueCross, Aetna, Cigna, and United. Bring your insurance card." },
  { id: "7", category: "Services", question: "Do you offer telemedicine?", answer: "Yes! Virtual follow-up consultations are available. Book via our website or call us." },
  { id: "8", category: "General", question: "What is your cancellation policy?", answer: "Please cancel or reschedule at least 24 hours in advance to avoid a cancellation fee." },
];

const CATEGORIES = ["General", "Pricing", "Services", "Timings", "Insurance", "Other"];

const CATEGORY_COLORS = {
  Pricing: "bg-blue-100 text-blue-700",
  Services: "bg-emerald-100 text-emerald-700",
  Timings: "bg-violet-100 text-violet-700",
  Insurance: "bg-amber-100 text-amber-700",
  General: "bg-slate-100 text-slate-600",
  Other: "bg-pink-100 text-pink-700",
};

function loadFAQ() {
  try {
    const s = localStorage.getItem("clinic_faq");
    return s ? JSON.parse(s) : DEFAULT_FAQ;
  } catch { return DEFAULT_FAQ; }
}

function saveFAQ(data) {
  localStorage.setItem("clinic_faq", JSON.stringify(data));
}

function buildSystemPrompt(faqItems) {
  const lines = faqItems.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
  return `You are a helpful FAQ and support agent for a clinic. Answer caller questions accurately based on the following knowledge base.\n\n== KNOWLEDGE BASE ==\n${lines}\n\nIf a question is not covered, say: "Let me have someone from our team follow up with you." Always be concise and professional.`;
}

const emptyForm = { question: "", answer: "", category: "General" };

export default function UserFAQ() {
  const [faq, setFaq] = useState(loadFAQ);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [promptOpen, setPromptOpen] = useState(false);

  const persist = (data) => { setFaq(data); saveFAQ(data); };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ question: item.question, answer: item.answer, category: item.category }); setOpen(true); };

  const save = (e) => {
    e.preventDefault();
    if (editing) {
      persist(faq.map((i) => i.id === editing.id ? { ...i, ...form } : i));
      toast.success("Entry updated");
    } else {
      persist([...faq, { id: Date.now().toString(), ...form }]);
      toast.success("FAQ entry added");
    }
    setOpen(false);
  };

  const remove = (item) => {
    if (!window.confirm("Delete this FAQ entry?")) return;
    persist(faq.filter((i) => i.id !== item.id));
    toast.success("Deleted");
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(buildSystemPrompt(faq));
    toast.success("System prompt copied! Paste it into your FAQ Agent's system prompt field.");
  };

  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: typeof v === "string" ? v : v.target.value }));

  const displayed = faq.filter((i) => {
    const matchCat = catFilter === "all" || i.category === catFilter;
    const matchSearch = !search || i.question.toLowerCase().includes(search.toLowerCase()) || i.answer.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const allCats = [...new Set(faq.map((i) => i.category))];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="FAQ Knowledge Base"
        subtitle="Questions & answers your FAQ Agent uses to respond to callers"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyPrompt}>
              <Copy className="h-4 w-4 mr-2" /> Copy as System Prompt
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add Entry
            </Button>
          </div>
        }
      />

      {/* How it works */}
      <SectionCard title="How to connect this to your FAQ Agent">
        <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
          <li>Add or edit your FAQ entries below.</li>
          <li>Click <strong>Copy as System Prompt</strong> — this generates an optimized prompt from your knowledge base.</li>
          <li>Go to <strong>Agents → FAQ Support Agent</strong> and paste it into the <em>System Prompt</em> field.</li>
          <li>Save the agent. Your FAQ agent will now answer callers using your latest knowledge base.</li>
        </ol>
      </SectionCard>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search entries..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {["all", ...allCats].map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              catFilter === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {c === "all" ? `All (${faq.length})` : c}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayed.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other}`}>
                  {item.category}
                </span>
                <p className="font-medium text-sm">{item.question}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => remove(item)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{item.answer}</p>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-400">
            <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No entries match your search.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit FAQ Entry" : "Add FAQ Entry"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={f("category")}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Input value={form.question} onChange={f("question")} placeholder="e.g. What are your clinic hours?" required />
            </div>
            <div className="space-y-1.5">
              <Label>Answer</Label>
              <Textarea value={form.answer} onChange={f("answer")} rows={4} placeholder="The agent will speak this answer to callers." required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Add Entry"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
