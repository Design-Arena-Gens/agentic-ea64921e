"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

const STORAGE_KEY = "quick-notes-v1";

function loadNotesFromStorage(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => typeof n.id === "string")
      .map((n) => ({
        id: n.id,
        title: n.title ?? "Untitled",
        content: n.content ?? "",
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function saveNotesToStorage(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore quota or serialization errors
  }
}

function generateId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    setNotes(loadNotesFromStorage());
  }, []);

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    // debounce saves to avoid excessive writes
    saveTimer.current = window.setTimeout(() => {
      saveNotesToStorage(notes);
    }, 300);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [notes]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, query]);

  function createNote() {
    const newNote: Note = {
      id: generateId(),
      title: "Untitled",
      content: "",
      updatedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(newNote.id);
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  function updateSelected(partial: Partial<Pick<Note, "title" | "content">>) {
    if (!selectedNote) return;
    setNotes((prev) =>
      prev
        .map((n) =>
          n.id === selectedNote.id
            ? { ...n, ...partial, updatedAt: Date.now() }
            : n
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }

  function exportNotes() {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quick-notes-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importNotes(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as Note[];
        if (!Array.isArray(imported)) return;
        // Merge by id; keep latest updatedAt
        const byId = new Map<string, Note>();
        [...notes, ...imported].forEach((n) => {
          const existing = byId.get(n.id);
          if (!existing || n.updatedAt > existing.updatedAt) {
            byId.set(n.id, n);
          }
        });
        const merged = Array.from(byId.values()).sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        setNotes(merged);
      } catch {
        // ignore parse errors
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid">
      <aside className="sidebar">
        <div className="sidebar-actions">
          <button className="primary" onClick={createNote} aria-label="New note">
            + New Note
          </button>
          <div className="import-export">
            <button onClick={exportNotes}>Export</button>
            <label className="import-label">
              Import
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importNotes(file);
                }}
              />
            </label>
          </div>
        </div>
        <input
          className="search"
          placeholder="Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="note-list">
          {filteredNotes.map((n) => (
            <li
              key={n.id}
              className={
                "note-list-item" + (n.id === selectedId ? " selected" : "")
              }
              onClick={() => setSelectedId(n.id)}
            >
              <div className="title-row">
                <span className="title">
                  {n.title.trim() || "Untitled"}
                </span>
                <button
                  className="danger small"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(n.id);
                  }}
                  aria-label={`Delete ${n.title}`}
                >
                  Delete
                </button>
              </div>
              <div className="meta">
                {new Date(n.updatedAt).toLocaleString()}
              </div>
            </li>
          ))}
          {filteredNotes.length === 0 && (
            <li className="empty">No notes yet</li>
          )}
        </ul>
      </aside>

      <section className="editor">
        {selectedNote ? (
          <div className="editor-inner">
            <input
              className="title-input"
              placeholder="Title"
              value={selectedNote.title}
              onChange={(e) => updateSelected({ title: e.target.value })}
            />
            <textarea
              className="content-input"
              placeholder="Write your note here..."
              value={selectedNote.content}
              onChange={(e) => updateSelected({ content: e.target.value })}
            />
          </div>
        ) : (
          <div className="empty-editor">
            <p>Select a note or create a new one.</p>
          </div>
        )}
      </section>
    </div>
  );
}
