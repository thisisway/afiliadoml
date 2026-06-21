"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Copy, Check, ExternalLink, Wand2 } from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [tone, setTone] = useState("popular");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [generating, setGenerating] = useState(false);

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

  async function generateCopy() {
    setGenerating(true);
    try {
      const res = await api.post<{ data: { body: string } }>(`/products/${id}/generate-copy`, { tone });
      setGeneratedCopy(res.data.body);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function copyText() {
    navigator.clipboard.writeText(generatedCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const p = data?.data;

  if (isLoading) return <div className="text-gray-400 text-sm">Carregando...</div>;
  if (!p) return <div className="text-gray-400 text-sm">Produto não encontrado.</div>;

  const activeLink = p.affiliateLinks?.find((l: any) => l.isActive);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-xs text-gray-400 hover:text-gray-600 mb-2">
            ← Voltar
          </button>
          <h1 className="text-xl font-bold text-gray-900">{p.title}</h1>
          <p className="text-sm text-gray-400">{p.marketplace} · {p.category ?? "sem categoria"}</p>
        </div>
        {p.imageUrl && (
          <img src={p.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-100" />
        )}
      </div>

      {/* Preço */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-400">Preço atual</p>
          <p className="text-lg font-bold text-gray-900">R$ {Number(p.price).toFixed(2)}</p>
        </div>
        {p.oldPrice && (
          <div>
            <p className="text-xs text-gray-400">Preço anterior</p>
            <p className="text-lg font-medium text-gray-400 line-through">R$ {Number(p.oldPrice).toFixed(2)}</p>
          </div>
        )}
        {p.discountPercent && (
          <div>
            <p className="text-xs text-gray-400">Desconto</p>
            <p className="text-lg font-bold text-green-600">{p.discountPercent}%</p>
          </div>
        )}
      </div>

      {/* Link de afiliado manual */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Link de afiliado</h2>
        {activeLink ? (
          <div className="flex items-center gap-2">
            <a href={activeLink.url} target="_blank" rel="noopener noreferrer"
              className="text-blue-600 text-xs hover:underline flex items-center gap-1 truncate">
              <ExternalLink size={12} />
              {activeLink.url}
            </a>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Nenhum link ativo</p>
        )}
        <div className="flex gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://link-de-afiliado.com/..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => addLink.mutate()}
            disabled={!linkUrl || addLink.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Gerador de copy */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Gerador de copy com IA</h2>
        <div className="flex gap-2">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {["popular", "direto", "engracado", "premium", "urgente", "discreto", "comparativo"].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={generateCopy}
            disabled={generating}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Wand2 size={14} />
            {generating ? "Gerando..." : "Gerar copy"}
          </button>
        </div>

        {generatedCopy && (
          <div className="relative">
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans">
              {generatedCopy}
            </pre>
            <button
              onClick={copyText}
              className="absolute top-2 right-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded px-2 py-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
