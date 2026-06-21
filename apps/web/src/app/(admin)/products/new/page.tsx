"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    marketplace: "MERCADOLIVRE",
    title: "",
    originalUrl: "",
    imageUrl: "",
    price: "",
    oldPrice: "",
    discountPercent: "",
    sellerName: "",
    category: "",
    commissionRate: "",
    shippingInfo: "",
    description: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: any = {
        marketplace: form.marketplace,
        title: form.title,
        price: Number(form.price),
      };
      if (form.originalUrl) body.originalUrl = form.originalUrl;
      if (form.imageUrl) body.imageUrl = form.imageUrl;
      if (form.oldPrice) body.oldPrice = Number(form.oldPrice);
      if (form.discountPercent) body.discountPercent = Number(form.discountPercent);
      if (form.sellerName) body.sellerName = form.sellerName;
      if (form.category) body.category = form.category;
      if (form.commissionRate) body.commissionRate = Number(form.commissionRate);
      if (form.shippingInfo) body.shippingInfo = form.shippingInfo;
      if (form.description) body.description = form.description;

      const res = await api.post<{ data: { id: string } }>("/products", body);
      router.push(`/products/${res.data.id}`);
    } catch (err: any) {
      setError(err.message ?? "Erro ao cadastrar produto");
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text", required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Novo produto</h1>
        <p className="text-sm text-gray-500">Cadastre manualmente um produto para afiliação</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Marketplace <span className="text-red-500">*</span></label>
          <select
            value={form.marketplace}
            onChange={(e) => set("marketplace", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="MERCADOLIVRE">Mercado Livre</option>
            <option value="SHOPEE">Shopee</option>
          </select>
        </div>

        {field("Título do produto", "title", "text", true)}
        {field("URL original do produto", "originalUrl")}
        {field("URL da imagem", "imageUrl")}

        <div className="grid grid-cols-2 gap-4">
          {field("Preço atual (R$)", "price", "number", true)}
          {field("Preço anterior (R$)", "oldPrice", "number")}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field("Desconto (%)", "discountPercent", "number")}
          {field("Comissão (%)", "commissionRate", "number")}
        </div>

        {field("Nome do vendedor", "sellerName")}
        {field("Categoria", "category")}
        {field("Info de frete", "shippingInfo")}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar produto"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
