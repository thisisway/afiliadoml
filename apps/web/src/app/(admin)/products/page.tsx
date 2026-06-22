"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Plus, ExternalLink, Download, Search, X, Check, ShoppingBag } from "lucide-react";
import { useState, useRef } from "react";

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

function ImportMLModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["ml-search", searched],
    queryFn: async () => {
      const res = await fetch(
        `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searched)}&limit=12`
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`ML API erro ${res.status}: ${body.slice(0, 120)}`);
      }
      const json = await res.json();
      const items = (json.results ?? []).map((item: any) => ({
        mlItemId: item.id,
        title: item.title,
        price: item.price,
        originalPrice: item.original_price ?? null,
        thumbnail: item.thumbnail?.replace(/-I\.jpg$/, "-O.jpg") ?? item.thumbnail,
        permalink: item.permalink,
        condition: item.condition,
        soldQuantity: item.sold_quantity,
        sellerName: item.seller?.nickname ?? null,
        alreadyImported: false,
      }));
      return { data: items as any[], total: json.paging?.total ?? 0 };
    },
    enabled: searched.length >= 2,
    retry: 1,
  });

  function handleSearch() {
    if (query.trim().length >= 2) setSearched(query.trim());
  }

  async function handleImport(item: any) {
    setImporting(item.mlItemId);
    try {
      await api.post("/products/ml/import", { mlItemId: item.mlItemId });
      setImported((prev) => new Set([...prev, item.mlItemId]));
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      if (err.message?.includes("já importado")) {
        setImported((prev) => new Set([...prev, item.mlItemId]));
      } else {
        alert(err.message ?? "Erro ao importar produto");
      }
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-900">Importar do Mercado Livre</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ex: tênis adidas, iphone 15, air fryer..."
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={query.trim().length < 2}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Buscar
            </button>
          </div>
          {data && searched && (
            <p className="text-xs text-gray-400 mt-2">
              {data.total.toLocaleString("pt-BR")} resultados para "{searched}"
            </p>
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 p-4">
          {isFetching && (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              Buscando no Mercado Livre...
            </div>
          )}

          {!isFetching && !searched && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm gap-2">
              <ShoppingBag size={32} className="text-gray-200" />
              <p>Digite um produto para buscar</p>
            </div>
          )}

          {!isFetching && isError && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm font-medium text-red-500">Erro ao buscar no Mercado Livre</p>
              <p className="text-xs text-gray-400 text-center max-w-sm">
                {(error as Error)?.message ?? "Verifique se a API está acessível"}
              </p>
            </div>
          )}

          {!isFetching && !isError && searched && data?.data.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nenhum resultado encontrado para "{searched}"
            </div>
          )}

          {!isFetching && !isError && data && data.data.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.data.map((item: any) => {
                const isImported = imported.has(item.mlItemId) || item.alreadyImported;
                const isLoading = importing === item.mlItemId;
                const discount = item.originalPrice
                  ? Math.round((1 - item.price / item.originalPrice) * 100)
                  : null;

                return (
                  <div
                    key={item.mlItemId}
                    className={`flex gap-3 p-3 rounded-xl border transition-colors ${
                      isImported ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          R$ {Number(item.price).toFixed(2)}
                        </span>
                        {discount && discount > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                            -{discount}%
                          </span>
                        )}
                      </div>
                      {item.sellerName && (
                        <p className="text-xs text-gray-400 truncate">{item.sellerName}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center">
                      {isImported ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <Check size={13} />
                          Importado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImport(item)}
                          disabled={isLoading}
                          className="flex items-center gap-1 text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Download size={12} />
                          {isLoading ? "..." : "Importar"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Após importar, abra o produto para adicionar seu link de afiliado
          </p>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [showImport, setShowImport] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<{ data: any[]; total: number }>("/products?limit=50"),
  });

  return (
    <div className="space-y-6">
      {showImport && <ImportMLModal onClose={() => setShowImport(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} produtos cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 border border-yellow-400 text-yellow-600 hover:bg-yellow-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={15} />
            Importar do ML
          </button>
          <Link
            href="/products/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Novo produto
          </Link>
        </div>
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
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0" />
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
                    Nenhum produto ainda.{" "}
                    <button onClick={() => setShowImport(true)} className="text-yellow-600 hover:underline">
                      Importar do ML
                    </button>{" "}
                    ou{" "}
                    <Link href="/products/new" className="text-blue-600 hover:underline">
                      adicionar manualmente
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
