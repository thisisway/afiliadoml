"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  Tag,
  FileText,
  Send,
  Link2,
  BarChart2,
  Settings,
  LogOut,
  MapPin,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/coupons", label: "Cupons", icon: Tag },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/destinations", label: "Destinos", icon: MapPin },
  { href: "/send-queue", label: "Fila de Envio", icon: Send },
  { href: "/links", label: "Links Curtos", icon: Link2 },
  { href: "/reports", label: "Relatórios", icon: BarChart2 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      <div className="px-4 py-5 border-b border-gray-100">
        <span className="font-bold text-gray-900 text-sm">Central de Afiliado</span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
