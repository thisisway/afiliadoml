"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

const VARIABLES = [
  "{{product_title}}", "{{price}}", "{{old_price}}", "{{discount_percent}}",
  "{{coupon_code}}", "{{marketplace}}", "{{affiliate_link}}", "{{seller_name}}",
];

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", body: "", tone: "popular" });

  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<{ data: any[] }>("/templates"),
  });

  const create = useMutation({
    mutationFn: () => api.post("/templates", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); setShowForm(false); setForm({ name: "", body: "", tone: "popular" }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  function insertVar(v: string) {
    setForm((f) => ({ ...f, body: f.body + v }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Templates de mensagem</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus size={16} /> Novo template
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tom</label>
              <select value={form.tone} onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {["popular", "direto", "premium", "urgente"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Corpo do template</label>
              <div className="flex gap-1 flex-wrap justify-end">
                {VARIABLES.map((v) => (
                  <button key={v} onClick={() => insertVar(v)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={!form.name || !form.body || create.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? <div className="text-sm text-gray-400">Carregando...</div> : (
        <div className="space-y-3">
          {data?.data.map((t: any) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tom: {t.tone ?? "—"}</p>
                </div>
                <button onClick={() => remove.mutate(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              <pre className="mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-mono">{t.body}</pre>
            </div>
          ))}
          {data?.data.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8">Nenhum template cadastrado.</div>
          )}
        </div>
      )}
    </div>
  );
}
