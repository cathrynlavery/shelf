"use client";

import { useState } from "react";
import { publicConfig } from "@/lib/config";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <h1>{publicConfig.appEmoji} {publicConfig.appName}</h1>
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
      >
        {menuOpen ? "✕" : "☰"}
      </button>
      <nav className={menuOpen ? "open" : ""}>
        <a href="/">Browse</a>
        <a href="/collections">Collections</a>
        <a href="/upload">Upload</a>
        <a href="/upload/bulk">Bulk Upload</a>
      </nav>
    </header>
  );
}
