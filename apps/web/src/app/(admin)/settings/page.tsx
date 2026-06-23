"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, ExternalLink, Key, AlertTriangle, Eye, EyeOff, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const MASKED = "••••••••";

function useSetting(key: string, settings: Record<string, string> | undefined) {
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings?.[key] !== undefined) setValue(settings[key]);
  }, [settings, key]);

  const mutation = useMutation({
    mutationFn: (val: string) => api.patch(`/settings/${key}`, { value: val }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  // Skip save if value hasn't changed from the masked placeholder
  const save = () => {
    if (!value.trim() || value === MASKED) return;
    mutation.mutate(value);
  };

  const isConfigured = value === MASKED;

  return { value, setValue, saved, save, isPending: mutation.isPending, isConfigured };
}

function SecretField({
  label,
  hint,
  placeholder,
  value,
  isConfigured,
  onChange,
  onSave,
  isPending,
  saved,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  isConfigured: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
  saved: boolean;
}) {
  const [show, setShow] = useState(false);
  const hasChange = value.trim() !== "" && value !== MASKED;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-xs font-medium text-basic-600">{label}</label>
        {isConfigured && !hasChange && (
          <span className="flex items-center gap-1 text-xs text-success-600 font-medium">
            <Check size={11} /> Configurada
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-basic-400 mb-1.5">{hint}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={isConfigured && !hasChange ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isConfigured ? "Preencha apenas para alterar" : placeholder}
            className="input pr-9 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-basic-400 hover:text-basic-600 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <Button
          onClick={onSave}
          disabled={!hasChange || isPending}
          loading={isPending}
          size="sm"
          variant={saved ? "success" : "primary"}
        >
          {saved ? <><Check size={13} />Salvo!</> : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<{ data: Record<string, string> }>("/settings"),
  });

  const { data: mlConnected, refetch: refetchConnected } = useQuery({
    queryKey: ["ml-connected"],
    queryFn: () => api.get<{ connected: boolean }>("/settings/ml/connected"),
  });

  const settings = data?.data;

  const affiliateId = useSetting("ml_affiliate_id", settings);
  const appId       = useSetting("ml_app_id",       settings);
  const secretKey   = useSetting("ml_secret_key",   settings);
  const openaiKey   = useSetting("openai_api_key",  settings);

  const hasMLCreds = !!(settings?.ml_app_id && settings?.ml_secret_key);
  const isMLConnected = mlConnected?.connected ?? false;

  // Handle ML OAuth callback — ML redirects back with ?code=...
  const [oauthStatus, setOauthStatus] = useState<"idle" | "exchanging" | "success" | "error">("idle");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || oauthStatus !== "idle") return;

    setOauthStatus("exchanging");
    const redirectUri = `${window.location.origin}/settings`;
    api.post("/settings/ml/exchange", { code, redirect_uri: redirectUri })
      .then(() => {
        setOauthStatus("success");
        refetchConnected();
        // Remove code from URL without reload
        router.replace("/settings");
      })
      .catch(() => setOauthStatus("error"));
  }, [searchParams, oauthStatus, refetchConnected, router]);

  async function handleConnectML() {
    const redirectUri = `${window.location.origin}/settings`;
    const res = await api.get<{ url: string }>(`/settings/ml/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`);
    window.location.href = res.url;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-basic-800">Configurações</h1>
        <p className="text-sm text-basic-500 mt-0.5">Integrações e credenciais do sistema</p>
      </div>

      {/* ML API Credentials */}
      <Card padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-warning-100 flex items-center justify-center">
              <Key size={14} className="text-warning-600" />
            </div>
            <CardTitle>Mercado Livre — API</CardTitle>
          </div>
          <a
            href="https://developers.mercadolivre.com.br/pt_br/registre-se"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-warning-600 hover:text-warning-700 font-medium"
          >
            <ExternalLink size={11} />
            Dev Portal
          </a>
        </CardHeader>

        {!hasMLCreds && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-warning-50 border border-warning-200 mb-4">
            <AlertTriangle size={15} className="text-warning-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-warning-700">Credenciais não configuradas</p>
              <p className="text-xs text-warning-600 mt-0.5">
                Sem o App ID e Secret Key, a busca de produtos no Mercado Livre não funciona.
                Crie um app em <strong>developers.mercadolivre.com.br</strong> e cole as credenciais abaixo.
              </p>
            </div>
          </div>
        )}

        {/* OAuth callback status */}
        {oauthStatus === "exchanging" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-info-50 border border-info-200 mb-4">
            <Loader2 size={14} className="text-info-600 animate-spin" />
            <p className="text-xs font-medium text-info-700">Conectando conta Mercado Livre...</p>
          </div>
        )}
        {oauthStatus === "success" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200 mb-4">
            <Check size={14} className="text-success-600" />
            <p className="text-xs font-medium text-success-700">Conta ML conectada com sucesso! Busca de produtos ativa.</p>
          </div>
        )}
        {oauthStatus === "error" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-50 border border-danger-200 mb-4">
            <AlertTriangle size={14} className="text-danger-600" />
            <p className="text-xs font-medium text-danger-700">Erro ao conectar. Tente novamente.</p>
          </div>
        )}

        {hasMLCreds && isMLConnected && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-success-50 border border-success-200 mb-4">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-success-600" />
              <p className="text-xs font-medium text-success-700">Conta ML conectada — busca de produtos ativa</p>
            </div>
            <Button size="xs" variant="ghost" onClick={handleConnectML}>Reconectar</Button>
          </div>
        )}

        {hasMLCreds && !isMLConnected && oauthStatus === "idle" && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-warning-50 border border-warning-200 mb-4">
            <AlertTriangle size={15} className="text-warning-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-warning-700">Conta ML não conectada</p>
              <p className="text-xs text-warning-600 mt-0.5">
                É necessário conectar sua conta ML para que a busca funcione de qualquer servidor.
              </p>
            </div>
            <Button size="sm" variant="warning" onClick={handleConnectML}>
              <Link2 size={13} />
              Conectar conta ML
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <SecretField
            label="App ID (Client ID)"
            hint="Número gerado ao criar o app no portal de desenvolvedores."
            placeholder="Ex: 123456789"
            value={appId.value}
            isConfigured={appId.isConfigured}
            onChange={appId.setValue}
            onSave={appId.save}
            isPending={appId.isPending}
            saved={appId.saved}
          />
          <SecretField
            label="Secret Key (Client Secret)"
            hint="Chave secreta do app. Nunca compartilhe."
            placeholder="Ex: AbCdEfGhIj..."
            value={secretKey.value}
            isConfigured={secretKey.isConfigured}
            onChange={secretKey.setValue}
            onSave={secretKey.save}
            isPending={secretKey.isPending}
            saved={secretKey.saved}
          />
        </div>

        <div className="mt-4 p-3 rounded-lg bg-basic-50 border border-basic-200 text-xs text-basic-500 space-y-1">
          <p className="font-medium text-basic-600">Como criar o app ML:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Acesse <strong>developers.mercadolivre.com.br</strong></li>
            <li>Clique em <strong>Criar aplicação</strong></li>
            <li>Preencha nome e selecione <strong>Marketplace</strong></li>
            <li>Copie o <strong>App ID</strong> e a <strong>Secret Key</strong> gerados</li>
          </ol>
        </div>
      </Card>

      {/* ML Affiliate ID */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Mercado Livre — Afiliado</CardTitle>
          <a
            href="https://afiliados.mercadolivre.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-warning-600 hover:text-warning-700 font-medium"
          >
            <ExternalLink size={11} />
            Portal Afiliados
          </a>
        </CardHeader>

        <div>
          <label className="block text-xs font-medium text-basic-600 mb-1.5">
            ID de Afiliado <span className="text-basic-400 font-normal">(parâmetro matt_tool)</span>
          </label>
          <p className="text-xs text-basic-400 mb-1.5">
            Adicionado automaticamente nos links ao importar produtos.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={affiliateId.value}
              onChange={(e) => affiliateId.setValue(e.target.value)}
              placeholder="Ex: 38286443"
              className="input flex-1 text-sm font-mono"
            />
            <Button
              onClick={affiliateId.save}
              disabled={!affiliateId.value.trim() || affiliateId.isPending}
              loading={affiliateId.isPending}
              size="sm"
              variant={affiliateId.saved ? "success" : "primary"}
            >
              {affiliateId.saved ? <><Check size={13} />Salvo!</> : "Salvar"}
            </Button>
          </div>
          {affiliateId.value && (
            <p className="text-xs text-basic-400 mt-2 font-mono truncate">
              exemplo: https://produto.com?matt_tool={affiliateId.value}&matt_source=whatsapp
            </p>
          )}
        </div>
      </Card>

      {/* OpenAI */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>OpenAI — Geração de Copy</CardTitle>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-basic-500 hover:text-basic-700 font-medium"
          >
            <ExternalLink size={11} />
            OpenAI Platform
          </a>
        </CardHeader>

        {openaiKey.isConfigured ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200 mb-4">
            <Check size={14} className="text-success-600" />
            <p className="text-xs font-medium text-success-700">Chave configurada — geração de copy ativa</p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-basic-50 border border-basic-200 mb-4">
            <AlertTriangle size={15} className="text-basic-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-basic-500">
              Sem API Key, o gerador de copy com IA não funcionará.
            </p>
          </div>
        )}

        <SecretField
          label="API Key"
          placeholder="sk-..."
          value={openaiKey.value}
          isConfigured={openaiKey.isConfigured}
          onChange={openaiKey.setValue}
          onSave={openaiKey.save}
          isPending={openaiKey.isPending}
          saved={openaiKey.saved}
        />
      </Card>
    </div>
  );
}
