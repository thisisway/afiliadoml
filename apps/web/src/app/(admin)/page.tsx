"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Package, Send, MousePointerClick, Clock } from "lucide-react";

type DashboardData = {
  totalProducts: number;
  approvedProducts: number;
  totalSentJobs: number;
  pendingJobs: number;
  totalClicks: number;
  clickRate: string;
  topProducts: Array<{ productId: string; title: string; marketplace: string; price: any; clicks: number }>;
  recentJobs: Array<any>;
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<{ data: DashboardData }>("/reports/dashboard"),
  });

  if (isLoading) {
    return <div className="text-gray-500 text-sm">Carregando...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-sm">Erro ao carregar dashboard. Verifique se a API está rodando.</div>;
  }

  const d = data?.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral da operação</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de produtos" value={d?.totalProducts ?? 0} icon={Package} color="bg-blue-500" />
        <StatCard label="Mensagens enviadas" value={d?.totalSentJobs ?? 0} icon={Send} color="bg-green-500" />
        <StatCard label="Total de cliques" value={d?.totalClicks ?? 0} icon={MousePointerClick} color="bg-purple-500" />
        <StatCard label="Jobs pendentes" value={d?.pendingJobs ?? 0} icon={Clock} color="bg-orange-500" />
      </div>

      {d && d.topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Produtos mais clicados</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.topProducts}>
              <XAxis dataKey="title" tick={{ fontSize: 11 }} width={80} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="clicks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {d && d.recentJobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Jobs recentes</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b">
                <th className="pb-2 font-medium">Produto</th>
                <th className="pb-2 font-medium">Destino</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {d.recentJobs.map((job: any) => (
                <tr key={job.id} className="text-gray-700">
                  <td className="py-2 truncate max-w-[200px]">{job.product?.title ?? "—"}</td>
                  <td className="py-2">{job.destination?.name ?? "—"}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.status === "SENT" ? "bg-green-100 text-green-700"
                      : job.status === "FAILED" ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400">
                    {new Date(job.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
