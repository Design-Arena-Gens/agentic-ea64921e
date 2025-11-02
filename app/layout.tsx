import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Quick Notes",
  description: "A minimal, fast notes app that saves locally.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="container">
            <h1>Quick Notes</h1>
            <p className="subtitle">Fast, private, offline-first note taking</p>
          </div>
        </header>
        <main className="container main">{children}</main>
        <footer className="container footer">
          <span>All notes are stored in your browser.</span>
        </footer>
      </body>
    </html>
  );
}
