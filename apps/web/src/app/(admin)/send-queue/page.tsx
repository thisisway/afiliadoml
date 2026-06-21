"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Check, X, Send, Plus } from "lucide-react";
import { useState } from "react";

const STATUS_COLOR: Record<string, string> = {
  CREATED: "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  PROCESSING: "bg-orange-100 text-orange-700",
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-400",
};

function NewJobModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products-select"],
    queryFn: () => api.get<{ data: any[] }>("/products?limit=100"),
  });

  const { data: destinations } = useQuery({
    queryKey: ["destinations-select"],
    queryFn: () => api.get<{ data: any[] }>("/destinations?limit=100"),
  });

  const { data: templates } = useQuery({
    queryKey: ["templates-select"],
    queryFn: () => api.get<{ data: any[] }>("/templates?limit=100"),
  });

  function handleProductChange(id: string) {
    setProductId(id);
    const product = products?.data.find((p: any) => p.id === id);
    const activeLink = product?.affiliateLinks?.find((l: any) => l.isActive);
    if (activeLink) setAffiliateLink(activeLink.url);
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tpl = templates?.data.find((t: any) => t.id === id);
    if (tpl) setMessageText(tpl.body);
  }

  const create = useMutation({
    mutationFn: () =>
      api.post("/send-jobs", { productId, destinationId, messageText, affiliateLink }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["send-jobs"] });
      onClose();
    },
  });

  const canSubmit = productId && destinationId && messageText.trim() && affiliateLink.trim();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Novo job de envio</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um produto</option>
              {products?.data.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Destino *</label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um destino</option>
              {destinations?.data.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name} ({d.provider})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link de afiliado *</label>
            <input
              type="url"
              value={affiliateLink}
              onChange={(e) => setAffiliateLink(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Template (opcional)</label>
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nenhum — escrever manualmente</option>
              {templates?.data.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem *</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
              placeholder="Texto da mensagem a ser enviada..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!canSubmit || create.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {create.isPending ? "Criando..." : "Criar job"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SendQueuePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["send-jobs"],
    queryFn: () => api.get<{ data: any[]; total: number }>("/send-jobs?limit=50"),
    refetchInterval: 10_000,
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/send-jobs/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["send-jobs"] }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.patch(`/send-jobs/${id}/cancel`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["send-jobs"] }),
  });

  const markSent = useMutation({
    mutationFn: (id: string) => api.patch(`/send-jobs/${id}/mark-sent`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["send-jobs"] }),
  });

  return (
    <div className="space-y-6">
      {showModal && <NewJobModal onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fila de envio</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} jobs no total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Novo job
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Destino</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Agendado</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.map((job: any) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">
                    {job.product?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{job.destination?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[job.status] ?? "bg-gray-100"}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {["CREATED", "PENDING_APPROVAL"].includes(job.status) && (
                        <button
                          onClick={() => approve.mutate(job.id)}
                          title="Aprovar"
                          className="p-1.5 rounded hover:bg-green-50 text-green-600"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {job.status === "APPROVED" && (
                        <button
                          onClick={() => markSent.mutate(job.id)}
                          title="Marcar como enviado"
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                        >
                          <Send size={14} />
                        </button>
                      )}
                      {!["SENT", "CANCELLED", "FAILED"].includes(job.status) && (
                        <button
                          onClick={() => cancel.mutate(job.id)}
                          title="Cancelar"
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum job na fila.
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
