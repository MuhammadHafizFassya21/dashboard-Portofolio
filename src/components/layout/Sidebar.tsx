import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FileSpreadsheet } from "lucide-react";

interface NavGroup {
    category: string;
    items: {
        label: string;
        href: string;
        icon?: string;
    }[];
}

interface SidebarProps {
    items: NavGroup[];
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ items, isOpen, setIsOpen }: SidebarProps) {
    const router = useRouter();

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [setIsOpen]);

    const [activeHash, setActiveHash] = React.useState("");

    useEffect(() => {
        // Set initial hash from router
        if (typeof window !== "undefined") {
            setActiveHash(window.location.hash || "#traffic");
        }
    }, []);

    useEffect(() => {
        const handleHashChange = () => setActiveHash(window.location.hash);
        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    // Also sync with router path for robustness
    useEffect(() => {
        if (router.asPath.includes("#")) {
            setActiveHash(router.asPath.split("#")[1] ? `#${router.asPath.split("#")[1]}` : "");
        }
    }, [router.asPath]);

    // Lock body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 lg:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Shell */}
            <aside
                className={`fixed lg:sticky top-0 left-0 lg:left-auto lg:bottom-auto bottom-0 z-50 w-[280px] h-screen bg-zinc-950 border-r border-white/5 
                transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex flex-col h-full p-6">
                    {/* Logo/Header */}
                    <div className="flex items-center gap-3 px-4 mb-12">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl italic text-white shadow-lg shadow-blue-600/20">
                            H
                        </div>
                        <div className="font-display font-bold text-xl tracking-tight text-white">
                            Hafiz <span className="text-zinc-500">Dash.</span>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 space-y-8">
                        {items.map((group) => (
                            <div key={group.category}>
                                <h3 className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                                    {group.category}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => {
                                                setIsOpen(false);
                                                setActiveHash(item.href);
                                            }}
                                            className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all duration-200 group ${activeHash === item.href
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            {item.icon === "FileSpreadsheet" ? (
                                                <FileSpreadsheet className="w-4 h-4" />
                                            ) : (
                                                <span className={`w-1.5 h-1.5 rounded-full ${activeHash === item.href ? "bg-white" : "bg-zinc-600 group-hover:bg-zinc-400"}`} />
                                            )}
                                            <span className="text-sm font-medium tracking-wide">
                                                {item.label}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="mt-auto px-4 py-6 border-t border-white/5">
                        <div className="flex items-center gap-3">
                            <img
                                src="/hafiz21.jpeg"
                                alt="Hafiz"
                                className="w-8 h-8 rounded-full border border-white/10 object-cover"
                            />
                            <div className="text-xs">
                                <p className="font-bold text-zinc-300">Hafiz</p>
                                <p className="text-zinc-500">Data Engineer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
