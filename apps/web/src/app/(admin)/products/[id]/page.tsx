"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  Copy, Check, ExternalLink, Wand2, Zap, Send,
  Link2, Link2Off, ChevronDown, ChevronUp, X, Loader2,
  Package, Tag, Truck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

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

const TONES = [
  { value: "popular",    label: "Popular" },
  { value: "direto",     label: "Direto" },
  { value: "engracado",  label: "Engraçado" },
  { value: "premium",    label: "Premium" },
  { value: "urgente",    label: "Urgente" },
  { value: "discreto",   label: "Discreto" },
  { value: "comparativo",label: "Comparativo" },
];

// ── Copy Preview ─────────────────────────────────────────────────────────────

function CopyBlock({ text, onUse }: { text: string; onUse?: (text: string) => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <pre className="bg-basic-50 border border-basic-200 rounded-lg p-4 text-sm text-basic-700 whitespace-pre-wrap font-sans leading-relaxed">
        {text}
      </pre>
      <div className="absolute top-2 right-2 flex gap-1">
        {onUse && (
          <button
            onClick={() => onUse(text)}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 bg-white border border-primary-200 rounded px-2 py-1 transition-colors"
          >
            <Send size={11} />
            Usar
          </button>
        )}
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-basic-400 hover:text-basic-700 bg-white border border-basic-200 rounded px-2 py-1 transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

// ── Pipeline Modal ────────────────────────────────────────────────────────────

function PipelineModal({
  product,
  onClose,
  onSuccess,
}: {
  product: any;
  onClose: () => void;
  onSuccess: (jobId: string) => void;
}) {
  const [tone, setTone] = useState("popular");
  const [destinationId, setDestinationId] = useState("");
  const [couponId, setCouponId] = useState("");

  const { data: destinations } = useQuery({
    queryKey: ["destinations-all"],
    queryFn: () => api.get<{ data: any[] }>("/destinations?limit=100"),
  });

  const coupons = product.coupons ?? [];

  const pipeline = useMutation({
    mutationFn: () =>
      api.post<{ data: { sendJob: any } }>(`/products/${product.id}/pipeline`, {
        destinationId,
        tone,
        ...(couponId ? { couponId } : {}),
      }),
    onSuccess: (res) => onSuccess(res.data.sendJob.id),
  });

  const activeLink = product.affiliateLinks?.find((l: any) => l.isActive);
  const canRun = !!activeLink && !!destinationId && !pipeline.isPending;

  return (
    <div className="fixed inset-0 bg-basic-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-card-hover w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-basic-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary-100 flex items-center justify-center">
              <Zap size={16} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-basic-800">Pipeline automático</h2>
              <p className="text-xs text-basic-400">Gera copy + cria job em aprovação</p>
            </div>
          </div>
          <button onClick={onClose} className="text-basic-400 hover:text-basic-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!activeLink && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-50 border border-danger-200">
              <Link2Off size={14} className="text-danger-500 flex-shrink-0" />
              <p className="text-xs text-danger-600">
                Este produto não tem link de afiliado ativo. Adicione um antes de continuar.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-basic-600 mb-1.5">
              Destino de envio <span className="text-danger-500">*</span>
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="input text-sm"
            >
              <option value="">Selecione um destino...</option>
              {(destinations?.data ?? [])
                .filter((d: any) => d.isActive)
                .map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type.replace(/_/g, " ").toLowerCase()})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-basic-600 mb-1.5">Tom da copy</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-xs py-1.5 px-2 rounded border transition-all ${
                    tone === t.value
                      ? "bg-primary-500 text-white border-primary-500 font-medium"
                      : "bg-white text-basic-600 border-basic-200 hover:border-primary-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {coupons.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-basic-600 mb-1.5">Cupom (opcional)</label>
              <select
                value={couponId}
                onChange={(e) => setCouponId(e.target.value)}
                className="input text-sm"
              >
                <option value="">Sem cupom</option>
                {coupons.map((pc: any) => (
                  <option key={pc.coupon.id} value={pc.coupon.id}>
                    {pc.coupon.code} — {pc.coupon.description ?? ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {pipeline.isError && (
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-xs text-danger-600">
              {(pipeline.error as Error)?.message ?? "Erro ao executar pipeline"}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-basic-200 flex items-center justify-end gap-2">
          <Button variant="basic" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={pipeline.isPending}
            disabled={!canRun}
            onClick={() => pipeline.mutate()}
          >
            <Zap size={13} />
            Executar pipeline
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Product Detail Page ───────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [linkUrl, setLinkUrl] = useState("");
  const [tone, setTone] = useState("popular");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [pipelineJobId, setPipelineJobId] = useState<string | null>(null);
  const [showAllCopies, setShowAllCopies] = useState(false);
  const [prefilledCopy, setPrefilledCopy] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get<{ data: any }>(`/products/${id}`),
  });

  const addLink = useMutation({
    mutationFn: () => api.post(`/products/${id}/affiliate-links`, { url: linkUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", id] });
      setLinkUrl("");
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/products/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product", id] }),
  });

  async function handleGenerateCopy() {
    setGenerating(true);
    try {
      const res = await api.post<{ data: { body: string } }>(`/products/${id}/generate-copy`, { tone });
      setGeneratedCopy(res.data.body);
      qc.invalidateQueries({ queryKey: ["product", id] });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  }

  const p = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-basic-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Carregando produto...</span>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-basic-400">
        <Package size={32} />
        <p className="text-sm">Produto não encontrado.</p>
        <Button variant="basic" size="sm" onClick={() => router.back()}>Voltar</Button>
      </div>
    );
  }

  const activeLink = p.affiliateLinks?.find((l: any) => l.isActive);
  const status = STATUS_LABELS[p.status] ?? { label: p.status, variant: "basic" as BadgeVariant };
  const copies = p.generatedMessages ?? [];
  const visibleCopies = showAllCopies ? copies : copies.slice(0, 2);

  return (
    <div className="max-w-4xl space-y-5">
      {showPipeline && (
        <PipelineModal
          product={p}
          onClose={() => setShowPipeline(false)}
          onSuccess={(jobId) => {
            setShowPipeline(false);
            setPipelineJobId(jobId);
            qc.invalidateQueries({ queryKey: ["product", id] });
          }}
        />
      )}

      {/* Success banner after pipeline */}
      {pipelineJobId && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-success-50 border border-success-200">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-success-600" />
            <div>
              <p className="text-sm font-medium text-success-700">Pipeline executado com sucesso!</p>
              <p className="text-xs text-success-600">Copy gerada e job criado aguardando aprovação.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`/send-queue`}>
              <Button size="xs" variant="success">
                <Send size={11} />
                Ver fila
              </Button>
            </a>
            <button onClick={() => setPipelineJobId(null)} className="text-success-500 hover:text-success-700">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt=""
            className="w-20 h-20 rounded-xl object-cover border border-basic-200 flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-basic-100 flex items-center justify-center flex-shrink-0">
            <Package size={28} className="text-basic-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <button
                onClick={() => router.back()}
                className="text-xs text-basic-400 hover:text-basic-600 mb-1.5 transition-colors"
              >
                ← Produtos
              </button>
              <h1 className="text-lg font-bold text-basic-800 leading-snug">{p.title}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="info">{p.marketplace === "MERCADOLIVRE" ? "Mercado Livre" : p.marketplace}</Badge>
                {p.category && <Badge variant="basic">{p.category}</Badge>}
                {p.shippingInfo && (
                  <span className="flex items-center gap-1 text-xs text-success-600 font-medium">
                    <Truck size={11} />
                    {p.shippingInfo}
                  </span>
                )}
                {p.sellerName && (
                  <span className="flex items-center gap-1 text-xs text-basic-400">
                    <Star size={11} />
                    {p.sellerName}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={p.status}
                onChange={(e) => updateStatus.mutate(e.target.value)}
                className={`text-xs font-medium rounded px-2 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-300 ${
                  p.status === "APPROVED" ? "bg-success-100 text-success-700 border-success-200" :
                  p.status === "PENDING_APPROVAL" ? "bg-warning-100 text-warning-700 border-warning-200" :
                  p.status === "SENT" ? "bg-primary-100 text-primary-700 border-primary-200" :
                  p.status === "REJECTED" ? "bg-danger-100 text-danger-700 border-danger-200" :
                  "bg-basic-100 text-basic-600 border-basic-200"
                }`}
              >
                {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowPipeline(true)}
                title="Gerar copy + criar job de envio em um clique"
              >
                <Zap size={13} />
                Pipeline
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Price + stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="sm">
          <p className="text-xs text-basic-400 mb-1">Preço atual</p>
          <p className="text-lg font-bold text-basic-900">R$ {Number(p.price).toFixed(2)}</p>
        </Card>
        {p.oldPrice && (
          <Card padding="sm">
            <p className="text-xs text-basic-400 mb-1">Preço anterior</p>
            <p className="text-lg font-medium text-basic-400 line-through">R$ {Number(p.oldPrice).toFixed(2)}</p>
          </Card>
        )}
        {p.discountPercent > 0 && (
          <Card padding="sm">
            <p className="text-xs text-basic-400 mb-1">Desconto</p>
            <p className="text-lg font-bold text-success-600">{p.discountPercent}%</p>
          </Card>
        )}
        <Card padding="sm">
          <p className="text-xs text-basic-400 mb-1">Cliques</p>
          <p className="text-lg font-bold text-basic-900">{p._count?.clickLinks ?? 0}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-basic-400 mb-1">Jobs de envio</p>
          <p className="text-lg font-bold text-basic-900">{p._count?.sendJobs ?? 0}</p>
        </Card>
      </div>

      {/* Affiliate link */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Link de afiliado</CardTitle>
          {activeLink ? (
            <span className="flex items-center gap-1 text-xs text-success-600 font-medium">
              <Link2 size={12} />
              Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-danger-500 font-medium">
              <Link2Off size={12} />
              Sem link ativo
            </span>
          )}
        </CardHeader>

        {activeLink && (
          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-basic-50 border border-basic-200">
            <Link2 size={13} className="text-basic-400 flex-shrink-0" />
            <a
              href={activeLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:underline flex items-center gap-1 truncate"
            >
              <ExternalLink size={11} />
              {activeLink.url}
            </a>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={activeLink ? "Substituir link de afiliado..." : "https://mercadolivre.com.br/...?matt_tool=..."}
            className="input flex-1 text-sm"
          />
          <Button
            onClick={() => addLink.mutate()}
            disabled={!linkUrl.trim() || addLink.isPending}
            loading={addLink.isPending}
            size="sm"
            variant={activeLink ? "basic" : "primary"}
          >
            {activeLink ? "Substituir" : "Salvar link"}
          </Button>
        </div>
        {p.originalUrl && (
          <p className="text-xs text-basic-400 mt-2">
            URL original:{" "}
            <a href={p.originalUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
              {p.originalUrl.length > 70 ? p.originalUrl.slice(0, 70) + "…" : p.originalUrl}
            </a>
          </p>
        )}
      </Card>

      {/* Coupons */}
      {p.coupons?.length > 0 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Cupons associados</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {p.coupons.map((pc: any) => (
              <div key={pc.coupon.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-basic-200 bg-basic-50">
                <Tag size={13} className="text-warning-500" />
                <span className="text-xs font-bold text-basic-800">{pc.coupon.code}</span>
                {pc.coupon.description && (
                  <span className="text-xs text-basic-400">{pc.coupon.description}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Copy generator */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Gerar copy com IA</CardTitle>
        </CardHeader>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`text-xs py-1.5 px-3 rounded-full border transition-all ${
                tone === t.value
                  ? "bg-primary-500 text-white border-primary-500 font-medium"
                  : "bg-white text-basic-500 border-basic-200 hover:border-primary-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Button
          onClick={handleGenerateCopy}
          loading={generating}
          variant="primary"
          size="sm"
          disabled={generating}
        >
          <Wand2 size={13} />
          {generating ? "Gerando..." : "Gerar nova copy"}
        </Button>

        {generatedCopy && (
          <div className="mt-4">
            <p className="text-xs font-medium text-basic-500 mb-2">Copy gerada agora:</p>
            <CopyBlock text={generatedCopy} />
          </div>
        )}
      </Card>

      {/* Copy history */}
      {copies.length > 0 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Histórico de copies ({copies.length})</CardTitle>
            {copies.length > 2 && (
              <button
                onClick={() => setShowAllCopies((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 transition-colors"
              >
                {showAllCopies ? (
                  <><ChevronUp size={13} /> Mostrar menos</>
                ) : (
                  <><ChevronDown size={13} /> Ver todas ({copies.length})</>
                )}
              </button>
            )}
          </CardHeader>
          <div className="space-y-3">
            {visibleCopies.map((msg: any) => (
              <div key={msg.id}>
                <p className="text-xs text-basic-400 mb-1">
                  {msg.tone && <span className="capitalize">{msg.tone}</span>}
                  {" · "}
                  {new Date(msg.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <CopyBlock text={msg.body} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick pipeline CTA — shown when no active link */}
      {!activeLink && (
        <div className="p-4 rounded-xl border border-warning-200 bg-warning-50 flex items-center gap-3">
          <Link2Off size={18} className="text-warning-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning-700">Adicione um link de afiliado</p>
            <p className="text-xs text-warning-600 mt-0.5">
              O pipeline automático requer um link de afiliado ativo para gerar a mensagem e criar o job de envio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
