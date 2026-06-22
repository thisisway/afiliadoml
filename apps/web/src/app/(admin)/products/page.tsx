"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Plus, ExternalLink, Download, Search, X, Check, ShoppingBag, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type BadgeVariant = "basic" | "warning" | "success" | "info" | "primary" | "danger";

const STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  NEW:              { label: "Novo",         variant: "basic" },
  PENDING_APPROVAL: { label: "Pendente",     variant: "warning" },
  APPROVED:         { label: "Aprovado",     variant: "success" },
  SCHEDULED:        { label: "Agendado",     variant: "info" },
  SENT:             { label: "Enviado",      variant: "primary" },
  PAUSED:           { label: "Pausado",      variant: "warning" },
  REJECTED:         { label: "Rejeitado",    variant: "danger" },
  EXPIRED:          { label: "Expirado",     variant: "basic" },
  UNAVAILABLE:      { label: "Indisponível", variant: "basic" },
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
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(
        `/api/ml/search?q=${encodeURIComponent(searched)}&limit=12`,
        { headers: { authorization: `Bearer ${token}` } }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        throw new Error(json?.error ?? json?.message ?? `Erro ${res.status} ao buscar`);
      }
      return json as { data: any[]; total: number };
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
    <div className="fixed inset-0 bg-basic-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-card-hover w-full max-w-3xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-basic-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-warning-100 flex items-center justify-center">
              <ShoppingBag size={16} className="text-warning-700" />
            </div>
            <h2 className="text-sm font-semibold text-basic-800">Importar do Mercado Livre</h2>
          </div>
          <button onClick={onClose} className="text-basic-500 hover:text-basic-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-basic-300">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-basic-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ex: tênis adidas, iphone 15, air fryer..."
                className="input pl-9"
                autoFocus
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={query.trim().length < 2}
              variant="primary"
              size="md"
            >
              Buscar
            </Button>
          </div>
          {data && searched && (
            <p className="text-xs text-basic-600 mt-2">
              {data.total.toLocaleString("pt-BR")} resultados para &ldquo;{searched}&rdquo;
            </p>
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 p-4">
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-12 text-basic-600 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Buscando no Mercado Livre...
            </div>
          )}

          {!isFetching && !searched && (
            <div className="flex flex-col items-center justify-center py-12 text-basic-500 text-sm gap-2">
              <ShoppingBag size={32} className="text-basic-400" />
              <p>Digite um produto para buscar</p>
            </div>
          )}

          {!isFetching && isError && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm font-semibold text-danger-500">Erro ao buscar no Mercado Livre</p>
              <p className="text-xs text-basic-600 text-center max-w-sm">
                {(error as Error)?.message ?? "Verifique se a API está acessível"}
              </p>
            </div>
          )}

          {!isFetching && !isError && searched && data?.data.length === 0 && (
            <div className="text-center py-12 text-basic-500 text-sm">
              Nenhum resultado encontrado para &ldquo;{searched}&rdquo;
            </div>
          )}

          {!isFetching && !isError && data && data.data.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.data.map((item: any) => {
                const isImported = imported.has(item.mlItemId) || item.alreadyImported;
                const isLoading = importing === item.mlItemId;
                const discount = item.originalPrice
                  ? Math.round((1 - item.price / item.originalPrice) * 100)
                  : null;

                return (
                  <div
                    key={item.mlItemId}
                    className={`flex gap-3 p-3 rounded-lg border transition-all ${
                      isImported
                        ? "border-success-300 bg-success-100/40"
                        : "border-basic-300 hover:border-primary-300 bg-white"
                    }`}
                  >
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-basic-300"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium text-basic-800 line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-basic-900">
                          R$ {Number(item.price).toFixed(2)}
                        </span>
                        {discount && discount > 0 && (
                          <Badge variant="success">-{discount}%</Badge>
                        )}
                      </div>
                      {item.sellerName && (
                        <p className="text-xs text-basic-500 truncate">{item.sellerName}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center">
                      {isImported ? (
                        <span className="flex items-center gap-1 text-xs text-success-700 font-semibold">
                          <Check size={13} />
                          Importado
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={isLoading}
                          onClick={() => handleImport(item)}
                        >
                          <Download size={12} />
                          Importar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-basic-300 flex items-center justify-between">
          <p className="text-xs text-basic-500">
            Após importar, abra o produto para adicionar seu link de afiliado
          </p>
          <Button variant="basic" size="sm" onClick={onClose}>
            Fechar
          </Button>
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

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-basic-800">Produtos</h1>
          <p className="text-sm text-basic-600 mt-0.5">{data?.total ?? 0} produtos cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={() => setShowImport(true)}>
            <Download size={15} />
            Importar do ML
          </Button>
          <Link href="/products/new">
            <Button size="md">
              <Plus size={15} />
              Novo produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-basic-500 py-8">
          <Loader2 size={16} className="animate-spin" />
          Carregando...
        </div>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-basic-300 bg-basic-200">
                <th className="px-5 py-3 text-xs font-semibold text-basic-600 uppercase tracking-wide">Produto</th>
                <th className="px-5 py-3 text-xs font-semibold text-basic-600 uppercase tracking-wide">Marketplace</th>
                <th className="px-5 py-3 text-xs font-semibold text-basic-600 uppercase tracking-wide">Preço</th>
                <th className="px-5 py-3 text-xs font-semibold text-basic-600 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-basic-600 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-basic-200">
              {data?.data.map((p: any) => {
                const status = STATUS_LABELS[p.status] ?? { label: p.status, variant: "basic" as BadgeVariant };
                return (
                  <tr key={p.id} className="hover:bg-basic-200/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0 bg-basic-300" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-basic-300 flex-shrink-0" />
                        )}
                        <span className="font-medium text-basic-800 truncate max-w-[280px]">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="info">{p.marketplace}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-basic-800">
                      R$ {Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/products/${p.id}`}>
                        <Button variant="ghost" size="xs">
                          <ExternalLink size={12} />
                          Ver
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-basic-500">
                      <ShoppingBag size={32} className="text-basic-400" />
                      <p className="text-sm">Nenhum produto ainda.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                          <Download size={13} />
                          Importar do ML
                        </Button>
                        <Link href="/products/new">
                          <Button size="sm">
                            <Plus size={13} />
                            Adicionar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
