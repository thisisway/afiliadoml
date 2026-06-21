"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

export default function CouponsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    marketplace: "MERCADOLIVRE",
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    expiresAt: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => api.get<{ data: any[] }>("/coupons"),
  });

  const create = useMutation({
    mutationFn: () => api.post("/coupons", {
      ...form,
      discountValue: form.discountValue ? Number(form.discountValue) : undefined,
      expiresAt: form.expiresAt || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setShowForm(false);
      setForm({ marketplace: "MERCADOLIVRE", code: "", description: "", discountType: "PERCENTAGE", discountValue: "", expiresAt: "" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cupons</h1>
          <p className="text-sm text-gray-500">{data?.data.length ?? 0} cupons cadastrados</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus size={16} />
          Novo cupom
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Novo cupom</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marketplace</label>
              <select value={form.marketplace} onChange={(e) => set("marketplace", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="MERCADOLIVRE">Mercado Livre</option>
                <option value="SHOPEE">Shopee</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
              <input value={form.code} onChange={(e) => set("code", e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de desconto</label>
              <select value={form.discountType} onChange={(e) => set("discountType", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="PERCENTAGE">Porcentagem</option>
                <option value="FIXED">Valor fixo</option>
                <option value="FREE_SHIPPING">Frete grátis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor do desconto</label>
              <input type="number" value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Validade</label>
              <input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <input value={form.description} onChange={(e) => set("description", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={!form.code || create.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              {create.isPending ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Marketplace</th>
                <th className="px-4 py-3 font-medium">Desconto</th>
                <th className="px-4 py-3 font-medium">Validade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">{c.code}</td>
                  <td className="px-4 py-3 text-gray-500">{c.marketplace}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.discountValue
                      ? c.discountType === "PERCENTAGE"
                        ? `${c.discountValue}%`
                        : `R$ ${Number(c.discountValue).toFixed(2)}`
                      : c.discountType === "FREE_SHIPPING" ? "Frete grátis" : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {c.status === "ACTIVE" ? "Ativo" : c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove.mutate(c.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum cupom cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
