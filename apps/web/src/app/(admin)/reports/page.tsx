"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<{ data: any }>("/reports/dashboard"),
  });

  const d = data?.data;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>

      {isLoading ? (
        <div className="text-sm text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ["Total de produtos", d?.totalProducts],
              ["Produtos aprovados", d?.approvedProducts],
              ["Mensagens enviadas", d?.totalSentJobs],
              ["Jobs pendentes", d?.pendingJobs],
              ["Total de cliques", d?.totalClicks],
              ["Taxa de clique", d?.clickRate],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 font-medium">{label as string}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? "0"}</p>
              </div>
            ))}
          </div>

          {d?.topProducts?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Produtos mais clicados</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium">Marketplace</th>
                    <th className="pb-2 font-medium">Cliques</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.topProducts.map((p: any, i: number) => (
                    <tr key={p.productId}>
                      <td className="py-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 text-gray-700">{p.title}</td>
                      <td className="py-2 text-gray-400">{p.marketplace}</td>
                      <td className="py-2 font-medium text-gray-800">{p.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
