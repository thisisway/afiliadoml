"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Check, ExternalLink, Key, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const MASKED = "••••••••";

function useSetting(key: string, settings: Record<string, string> | undefined, sensitive = false) {
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings?.[key] !== undefined) {
      // Don't pre-fill sensitive fields with the masked placeholder — keep blank so user types real value
      setValue(sensitive ? "" : settings[key]);
    }
  }, [settings, key, sensitive]);

  const mutation = useMutation({
    mutationFn: (val: string) => api.patch(`/settings/${key}`, { value: val }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return { value, setValue, saved, save: () => mutation.mutate(value), isPending: mutation.isPending };
}

function SecretField({
  label,
  hint,
  placeholder,
  value,
  onChange,
  onSave,
  isPending,
  saved,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
  saved: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-basic-600 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-basic-400 mb-1.5">{hint}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
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
          disabled={!value.trim() || isPending}
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
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<{ data: Record<string, string> }>("/settings"),
  });

  const settings = data?.data;

  const affiliateId = useSetting("ml_affiliate_id", settings, false);
  const appId       = useSetting("ml_app_id",       settings, false);
  const secretKey   = useSetting("ml_secret_key",   settings, true);
  const openaiKey   = useSetting("openai_api_key",  settings, true);

  const hasMLCreds = !!(settings?.ml_app_id && settings?.ml_secret_key);

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

        {hasMLCreds && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200 mb-4">
            <Check size={14} className="text-success-600" />
            <p className="text-xs font-medium text-success-700">API configurada — busca de produtos ativa</p>
          </div>
        )}

        <div className="space-y-4">
          <SecretField
            label="App ID (Client ID)"
            hint="Número gerado ao criar o app no portal de desenvolvedores."
            placeholder="Ex: 123456789"
            value={appId.value}
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

        {settings?.openai_api_key && settings.openai_api_key !== MASKED ? (
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
          onChange={openaiKey.setValue}
          onSave={openaiKey.save}
          isPending={openaiKey.isPending}
          saved={openaiKey.saved}
        />
      </Card>
    </div>
  );
}
