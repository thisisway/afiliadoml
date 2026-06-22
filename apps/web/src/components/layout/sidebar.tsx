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
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/",            label: "Dashboard",      icon: LayoutDashboard },
  { href: "/products",    label: "Produtos",        icon: Package },
  { href: "/coupons",     label: "Cupons",          icon: Tag },
  { href: "/templates",   label: "Templates",       icon: FileText },
  { href: "/destinations",label: "Destinos",        icon: MapPin },
  { href: "/send-queue",  label: "Fila de Envio",   icon: Send },
  { href: "/links",       label: "Links Curtos",    icon: Link2 },
  { href: "/reports",     label: "Relatórios",      icon: BarChart2 },
  { href: "/settings",    label: "Configurações",   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-basic-900 flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-basic-800">
        <div className="flex items-center justify-center w-8 h-8 bg-primary-500 rounded-md">
          <Zap size={16} className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-white text-sm font-bold">Central</p>
          <p className="text-basic-500 text-[10px] font-medium tracking-wide uppercase">de Afiliado</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary-500 text-white"
                  : "text-basic-500 hover:bg-basic-800 hover:text-basic-200"
              )}
            >
              <Icon size={16} className={active ? "text-white" : "text-basic-600"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-basic-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-basic-500 hover:bg-danger-500 hover:text-white transition-all duration-150 w-full"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
