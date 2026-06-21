"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function LinksPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["click-links"],
    queryFn: () => api.get<{ data: any[]; total: number }>("/click-links?limit=50"),
  });

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Links curtos</h1>
        <p className="text-sm text-gray-500">{data?.total ?? 0} links criados</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Link curto</th>
                <th className="px-4 py-3 font-medium">Cliques</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                    {l.product?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <a href={l.shortUrl} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                      <ExternalLink size={11} />
                      {l.shortUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{l.clicks ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(l.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copy(l.shortUrl, l.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                    >
                      <Copy size={12} />
                      {copied === l.id ? "Copiado!" : "Copiar"}
                    </button>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum link criado ainda.
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
