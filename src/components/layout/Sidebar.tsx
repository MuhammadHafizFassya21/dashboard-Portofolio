import React, { useEffect, useState } from "react";
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
    const [activeHash, setActiveHash] = useState("#traffic");

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [setIsOpen]);

    // Initial active hash setup
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (window.location.hash) {
                setActiveHash(window.location.hash);
            }
        }
    }, []);

    // IntersectionObserver for Scroll Spy
    useEffect(() => {
        if (typeof window === "undefined") return;

        const sectionIds = items.flatMap((group) =>
            group.items.map((i) => i.href.replace("#", ""))
        );

        const observerOptions = {
            root: null,
            rootMargin: "-15% 0px -55% 0px",
            threshold: 0,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    if (id) {
                        setActiveHash(`#${id}`);
                    }
                }
            });
        }, observerOptions);

        // Allow DOM to settle before attaching observer
        const timer = setTimeout(() => {
            sectionIds.forEach((id) => {
                const el = document.getElementById(id);
                if (el) observer.observe(el);
            });
        }, 300);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [items]);

    // Sync with router hash changes
    useEffect(() => {
        if (router.asPath.includes("#")) {
            const hash = router.asPath.split("#")[1];
            if (hash) setActiveHash(`#${hash}`);
        }
    }, [router.asPath]);

    // Lock body scroll on mobile drawer open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Shell */}
            <aside
                className={`fixed top-0 left-0 bottom-0 z-50 w-[280px] h-screen bg-zinc-950 border-r border-white/5 
                transition-transform duration-300 ease-in-out md:translate-x-0 ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex flex-col h-full p-6">
                    {/* Logo/Header */}
                    <div className="flex items-center gap-3 px-4 mb-10">
                        <div className="font-display font-black text-xl tracking-tight text-white">
                            Hafiz <span className="text-zinc-500 font-normal">Dashboard</span>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-8">
                        {items.map((group) => (
                            <div key={group.category}>
                                <h3 className="px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-3">
                                    {group.category}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = activeHash === item.href;
                                        return (
                                            <Link
                                                key={item.label}
                                                href={item.href}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setActiveHash(item.href);
                                                }}
                                                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all duration-200 group ${
                                                    isActive
                                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-bold"
                                                        : "text-zinc-400 hover:text-white hover:bg-white/5 font-medium"
                                                }`}
                                            >
                                                {item.icon === "FileSpreadsheet" ? (
                                                    <FileSpreadsheet className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-white"}`} />
                                                ) : (
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                                            isActive
                                                                ? "bg-white"
                                                                : "bg-zinc-600 group-hover:bg-zinc-400"
                                                        }`}
                                                    />
                                                )}
                                                <span className="text-xs tracking-wide">
                                                    {item.label}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="mt-auto px-4 py-4 border-t border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                                H
                            </div>
                            <div className="text-xs min-w-0">
                                <p className="font-bold text-zinc-200 truncate">Hafiz</p>
                                <p className="text-[10px] text-zinc-500 truncate">Data Engineer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
