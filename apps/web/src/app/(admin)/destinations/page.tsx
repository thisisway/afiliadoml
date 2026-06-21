"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

const TYPES = ["WHATSAPP_GROUP", "WHATSAPP_CHANNEL", "WHATSAPP_CONTACT", "TELEGRAM_CHANNEL", "EMAIL", "WEBHOOK"];
const PROVIDERS = ["MANUAL", "WHATSAPP_BUSINESS_API", "TELEGRAM_BOT", "WEBHOOK"];

export default function DestinationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "WHATSAPP_GROUP", provider: "MANUAL", dailyLimit: "", intervalMinutes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["destinations"],
    queryFn: () => api.get<{ data: any[] }>("/destinations"),
  });

  const create = useMutation({
    mutationFn: () => api.post("/destinations", {
      ...form,
      dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : undefined,
      intervalMinutes: form.intervalMinutes ? Number(form.intervalMinutes) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["destinations"] }); setShowForm(false); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/destinations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["destinations"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Destinos</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus size={16} /> Novo destino
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[["Nome", "name"], ["Limite diário", "dailyLimit", "number"], ["Intervalo (min)", "intervalMinutes", "number"]].map(([label, key, type = "text"]) => (
              <div key={key as string}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type} value={(form as any)[key as string]} onChange={(e) => setForm((f) => ({ ...f, [key as string]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            {[["Tipo", "type", TYPES], ["Provedor", "provider", PROVIDERS]].map(([label, key, opts]) => (
              <div key={key as string}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label as string}</label>
                <select value={(form as any)[key as string]} onChange={(e) => setForm((f) => ({ ...f, [key as string]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {(opts as string[]).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={!form.name || create.isPending}
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Provedor</th>
                <th className="px-4 py-3 font-medium">Limite/dia</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.type}</td>
                  <td className="px-4 py-3 text-gray-500">{d.provider}</td>
                  <td className="px-4 py-3 text-gray-400">{d.dailyLimit ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove.mutate(d.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum destino cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
