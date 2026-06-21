"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Check, X, Send } from "lucide-react";

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

export default function SendQueuePage() {
  const qc = useQueryClient();

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
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fila de envio</h1>
        <p className="text-sm text-gray-500">{data?.total ?? 0} jobs no total</p>
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
