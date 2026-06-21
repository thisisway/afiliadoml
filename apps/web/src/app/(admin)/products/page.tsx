"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Plus, ExternalLink } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Novo", color: "bg-gray-100 text-gray-600" },
  PENDING_APPROVAL: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Aprovado", color: "bg-green-100 text-green-700" },
  SCHEDULED: { label: "Agendado", color: "bg-blue-100 text-blue-700" },
  SENT: { label: "Enviado", color: "bg-purple-100 text-purple-700" },
  PAUSED: { label: "Pausado", color: "bg-orange-100 text-orange-700" },
  REJECTED: { label: "Rejeitado", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expirado", color: "bg-gray-100 text-gray-400" },
  UNAVAILABLE: { label: "Indisponível", color: "bg-gray-100 text-gray-400" },
};

export default function ProductsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<{ data: any[]; total: number }>("/products?limit=50"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} produtos cadastrados</p>
        </div>
        <Link
          href="/products/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Novo produto
        </Link>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Marketplace</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.map((p: any) => {
                const status = STATUS_LABELS[p.status] ?? { label: p.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        <span className="font-medium text-gray-800 truncate max-w-[280px]">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.marketplace}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      R$ {Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${p.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum produto cadastrado ainda.{" "}
                    <Link href="/products/new" className="text-blue-600 hover:underline">
                      Adicionar produto
                    </Link>
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
