"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Check, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [mlAffiliateId, setMlAffiliateId] = useState("");
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<{ data: Record<string, string> }>("/settings"),
  });

  useEffect(() => {
    if (data?.data?.ml_affiliate_id) {
      setMlAffiliateId(data.data.ml_affiliate_id);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.patch("/settings/ml_affiliate_id", { value: mlAffiliateId.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Integrações e preferências do sistema</p>
      </div>

      {/* ML Afiliados */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Mercado Livre Afiliados</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              O teu ID de afiliado é usado para gerar links automaticamente ao importar produtos.
            </p>
          </div>
          <a
            href="https://afiliados.mercadolivre.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium"
          >
            <ExternalLink size={12} />
            Portal ML Afiliados
          </a>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">
            ID de Afiliado ML <span className="text-gray-400 font-normal">(parâmetro matt_tool)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={mlAffiliateId}
              onChange={(e) => setMlAffiliateId(e.target.value)}
              placeholder="Ex: 38286443"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={() => save.mutate()}
              disabled={!mlAffiliateId.trim() || save.isPending}
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saved ? <Check size={15} /> : null}
              {save.isPending ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
            </button>
          </div>
          {mlAffiliateId && (
            <p className="text-xs text-gray-400">
              Link exemplo:{" "}
              <span className="text-gray-600 font-mono">
                https://mercadolivre.com.br/produto?matt_tool={mlAffiliateId}
              </span>
            </p>
          )}
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
          <p className="font-medium">Como encontrar o teu ID:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
            <li>Vai ao portal ML Afiliados</li>
            <li>Abre qualquer produto e clica em "Gerar link"</li>
            <li>No link gerado, copia o número após <span className="font-mono">matt_tool=</span></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
