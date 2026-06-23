"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Plus, ExternalLink, Download, Search, X, Check, ShoppingBag, Loader2,
  Link2, Link2Off, ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
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

const MARKETPLACE_LABELS: Record<string, string> = {
  MERCADOLIVRE: "Mercado Livre",
  SHOPEE:       "Shopee",
};

// ── ML Import Modal ──────────────────────────────────────────────────────────

function ImportMLModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [minDiscount, setMinDiscount] = useState("");
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["ml-search", searched, minDiscount],
    queryFn: async () => {
      const token = localStorage.getItem("token") ?? "";
      const params = new URLSearchParams({ q: searched, limit: "12" });
      if (minDiscount) params.set("min_discount", minDiscount);
      const res = await fetch(`/api/ml/search?${params}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error ?? `Erro ${res.status}`);
      return json as { data: any[]; total: number };
    },
    enabled: searched.length >= 2,
    retry: 1,
  });

  function handleSearch() {
    if (query.trim().length >= 2) setSearched(query.trim());
  }

  async function handleImport(item: any) {
    setImporting((prev) => new Set([...prev, item.mlItemId]));
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
      setImporting((prev) => { const s = new Set(prev); s.delete(item.mlItemId); return s; });
    }
  }

  async function handleImportAll() {
    const toImport = (data?.data ?? []).filter(
      (i: any) => !imported.has(i.mlItemId) && !i.alreadyImported
    );
    for (const item of toImport) await handleImport(item);
  }

  const pendingCount = (data?.data ?? []).filter(
    (i: any) => !imported.has(i.mlItemId) && !i.alreadyImported
  ).length;

  return (
    <div className="fixed inset-0 bg-basic-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-card-hover w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-basic-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-warning-100 flex items-center justify-center">
              <ShoppingBag size={16} className="text-warning-700" />
            </div>
            <h2 className="text-sm font-semibold text-basic-800">Importar do Mercado Livre</h2>
          </div>
          <button onClick={onClose} className="text-basic-400 hover:text-basic-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search + filters */}
        <div className="px-6 py-4 border-b border-basic-200 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-basic-400" />
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
            <Button onClick={handleSearch} disabled={query.trim().length < 2} variant="primary" size="md">
              Buscar
            </Button>
          </div>

          {/* Discount filter */}
          <div className="flex items-center gap-3">
            <Filter size={13} className="text-basic-400 flex-shrink-0" />
            <label className="text-xs text-basic-500 flex-shrink-0">Desconto mínimo:</label>
            <div className="flex gap-1.5">
              {["", "10", "20", "30", "50"].map((v) => (
                <button
                  key={v}
                  onClick={() => { setMinDiscount(v); if (searched) setSearched(s => s); }}
                  className={`text-xs px-2.5 py-1 rounded border transition-all ${
                    minDiscount === v
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white text-basic-600 border-basic-300 hover:border-primary-300"
                  }`}
                >
                  {v ? `${v}%+` : "Todos"}
                </button>
              ))}
            </div>
          </div>

          {data && searched && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-basic-500">
                {data.data.length} resultados para &ldquo;{searched}&rdquo;
                {minDiscount ? ` com ${minDiscount}%+ de desconto` : ""}
              </p>
              {pendingCount > 0 && (
                <Button
                  size="xs"
                  variant="success"
                  onClick={handleImportAll}
                  disabled={importing.size > 0}
                >
                  <Download size={11} />
                  Importar todos ({pendingCount})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 p-4">
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-12 text-basic-500 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Buscando no Mercado Livre...
            </div>
          )}

          {!isFetching && !searched && (
            <div className="flex flex-col items-center justify-center py-12 text-basic-400 text-sm gap-2">
              <ShoppingBag size={32} />
              <p>Digite um produto para buscar</p>
            </div>
          )}

          {!isFetching && isError && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm font-semibold text-danger-600">Erro ao buscar no Mercado Livre</p>
              <p className="text-xs text-basic-500 text-center max-w-sm">
                {(error as Error)?.message ?? "Verifique se a API está acessível"}
              </p>
            </div>
          )}

          {!isFetching && !isError && searched && data?.data.length === 0 && (
            <div className="text-center py-12 text-basic-400 text-sm">
              Nenhum resultado para &ldquo;{searched}&rdquo;
              {minDiscount ? ` com ${minDiscount}%+ de desconto` : ""}
            </div>
          )}

          {!isFetching && !isError && data && data.data.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.data.map((item: any) => {
                const isImported = imported.has(item.mlItemId) || item.alreadyImported;
                const isLoading = importing.has(item.mlItemId);

                return (
                  <div
                    key={item.mlItemId}
                    className={`flex gap-3 p-3 rounded-lg border transition-all ${
                      isImported
                        ? "border-success-200 bg-success-50"
                        : "border-basic-200 hover:border-primary-200 bg-white"
                    }`}
                  >
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-14 h-14 rounded-md object-cover flex-shrink-0 bg-basic-100"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium text-basic-800 line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-basic-900">
                          R$ {Number(item.price).toFixed(2)}
                        </span>
                        {item.discountPercent > 0 && (
                          <Badge variant="success">-{item.discountPercent}%</Badge>
                        )}
                        {item.freeShipping && (
                          <Badge variant="info">Frete grátis</Badge>
                        )}
                      </div>
                      {item.sellerName && (
                        <p className="text-xs text-basic-400 truncate">{item.sellerName}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center">
                      {isImported ? (
                        <span className="flex items-center gap-1 text-xs text-success-700 font-semibold">
                          <Check size={13} />
                          Importado
                        </span>
                      ) : (
                        <Button size="sm" variant="primary" loading={isLoading} onClick={() => handleImport(item)}>
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
        <div className="px-6 py-3 border-t border-basic-200 flex items-center justify-between">
          <p className="text-xs text-basic-400">
            Após importar, abra o produto para gerar copy e enviar
          </p>
          <Button variant="basic" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Products List Page ───────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const qc = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMarketplace, setFilterMarketplace] = useState("");

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search) params.set("search", search);
  if (filterStatus) params.set("status", filterStatus);
  if (filterMarketplace) params.set("marketplace", filterMarketplace);

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, filterStatus, filterMarketplace],
    queryFn: () => api.get<{ data: any[]; total: number; totalPages: number }>(`/products?${params}`),
    placeholderData: (prev) => prev,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/products/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  function applySearch() {
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setFilterStatus("");
    setFilterMarketplace("");
    setPage(1);
  }

  const hasFilters = search || filterStatus || filterMarketplace;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      {showImport && <ImportMLModal onClose={() => { setShowImport(false); }} />}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-basic-800">Produtos</h1>
          <p className="text-sm text-basic-500 mt-0.5">
            {data?.total ?? 0} produto{(data?.total ?? 0) !== 1 ? "s" : ""} cadastrado{(data?.total ?? 0) !== 1 ? "s" : ""}
          </p>
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

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-basic-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Buscar produto..."
            className="input pl-8 py-2 text-sm h-9"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="input h-9 text-sm pr-8"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <select
          value={filterMarketplace}
          onChange={(e) => { setFilterMarketplace(e.target.value); setPage(1); }}
          className="input h-9 text-sm pr-8"
        >
          <option value="">Todos os marketplaces</option>
          <option value="MERCADOLIVRE">Mercado Livre</option>
          <option value="SHOPEE">Shopee</option>
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X size={13} />
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-basic-400 py-12 justify-center">
          <Loader2 size={16} className="animate-spin" />
          Carregando...
        </div>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-basic-200 bg-basic-50">
                <th className="px-5 py-3 text-xs font-semibold text-basic-500 uppercase tracking-wide">Produto</th>
                <th className="px-4 py-3 text-xs font-semibold text-basic-500 uppercase tracking-wide">Preço</th>
                <th className="px-4 py-3 text-xs font-semibold text-basic-500 uppercase tracking-wide hidden md:table-cell">Marketplace</th>
                <th className="px-4 py-3 text-xs font-semibold text-basic-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-basic-500 uppercase tracking-wide hidden lg:table-cell">Link</th>
                <th className="px-4 py-3 text-xs font-semibold text-basic-500 uppercase tracking-wide text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-basic-100">
              {data?.data.map((p: any) => {
                const status = STATUS_LABELS[p.status] ?? { label: p.status, variant: "basic" as BadgeVariant };
                const hasLink = p.affiliateLinks?.length > 0;
                return (
                  <tr key={p.id} className="hover:bg-basic-50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0 bg-basic-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-basic-100 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-basic-800 truncate max-w-[240px]">{p.title}</p>
                          {p.discountPercent > 0 && (
                            <p className="text-xs text-success-600 font-medium">{p.discountPercent}% de desconto</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-basic-800">R$ {Number(p.price).toFixed(2)}</p>
                      {p.oldPrice && (
                        <p className="text-xs text-basic-400 line-through">R$ {Number(p.oldPrice).toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="info">{MARKETPLACE_LABELS[p.marketplace] ?? p.marketplace}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={(e) => updateStatus.mutate({ id: p.id, status: e.target.value })}
                        className={`text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-300 ${
                          p.status === "APPROVED" ? "bg-success-100 text-success-700" :
                          p.status === "PENDING_APPROVAL" ? "bg-warning-100 text-warning-700" :
                          p.status === "SENT" ? "bg-primary-100 text-primary-700" :
                          p.status === "REJECTED" ? "bg-danger-100 text-danger-700" :
                          p.status === "SCHEDULED" ? "bg-info-100 text-info-700" :
                          "bg-basic-100 text-basic-600"
                        }`}
                      >
                        {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
                          <option key={v} value={v}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {hasLink ? (
                        <span className="flex items-center gap-1 text-xs text-success-600 font-medium">
                          <Link2 size={12} />
                          Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-danger-500 font-medium">
                          <Link2Off size={12} />
                          Sem link
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/products/${p.id}`}>
                        <Button variant="ghost" size="xs">
                          <ExternalLink size={12} />
                          Abrir
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-basic-400">
                      <ShoppingBag size={32} />
                      <p className="text-sm">
                        {hasFilters ? "Nenhum produto encontrado com esses filtros." : "Nenhum produto cadastrado ainda."}
                      </p>
                      {hasFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          <X size={13} />
                          Limpar filtros
                        </Button>
                      ) : (
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
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-basic-100">
              <p className="text-xs text-basic-400">
                Página {page} de {totalPages} · {data?.total} produtos
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs rounded transition-colors ${
                        p === page
                          ? "bg-primary-500 text-white font-medium"
                          : "text-basic-500 hover:bg-basic-100"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <Button
                  variant="ghost" size="xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
