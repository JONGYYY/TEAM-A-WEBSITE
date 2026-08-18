"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "./Icon";
import s from "@/app/essays/[id]/workspace.module.css";

/* Transient highlight so "jump to" from a comment/AI note visibly marks the
   exact passage in the essay for a moment. */
const flashKey = new PluginKey("essayFlash");
const FlashHighlight = Extension.create({
  name: "essayFlash",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: flashKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(flashKey) as { add?: { from: number; to: number }; clear?: boolean } | undefined;
            if (meta?.clear) return DecorationSet.empty;
            if (meta?.add) {
              return DecorationSet.create(tr.doc, [Decoration.inline(meta.add.from, meta.add.to, { class: "essay-flash" })]);
            }
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: { decorations(state) { return flashKey.getState(state); } },
      }),
    ];
  },
});

export interface EssayEditorHandle {
  /** Select the first occurrence of `text` and scroll it into view. */
  jumpTo: (text: string) => boolean;
  /** Replace the first occurrence of `find` with `replacement`. */
  replace: (find: string, replacement: string) => boolean;
  focus: () => void;
}

interface Props {
  initialContent: unknown;
  placeholder?: string;
  wordLimit?: number | null;
  onChange: (json: unknown, text: string, words: number) => void;
  onSelection?: (text: string) => void;
  onAskCoach?: () => void;
  onComment?: (text: string) => void;
  onImprove?: (text: string) => void;
}

function validDoc(c: unknown): object | undefined {
  if (c && typeof c === "object" && (c as { type?: string }).type === "doc") return c as object;
  return undefined;
}

/** Finds the first occurrence of `query` inside a single text node. */
function findRange(editor: Editor, query: string): { from: number; to: number } | null {
  const q = query.trim();
  if (!q) return null;
  let hit: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (hit) return false;
    if (node.isText && node.text) {
      const idx = node.text.indexOf(q);
      if (idx >= 0) hit = { from: pos + idx, to: pos + idx + q.length };
    }
    return !hit;
  });
  return hit;
}

export const EssayEditor = forwardRef<EssayEditorHandle, Props>(function EssayEditor(
  { initialContent, placeholder, wordLimit, onChange, onSelection, onAskCoach, onComment, onImprove },
  ref
) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{ top: number; left: number; text: string } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || "Start writing your essay…" }),
      CharacterCount,
      FlashHighlight,
    ],
    content: validDoc(initialContent),
    editorProps: { attributes: { "aria-label": "Essay editor", role: "textbox" } },
    onUpdate({ editor }) {
      onChange(editor.getJSON(), editor.getText(), editor.storage.characterCount.words());
    },
    onSelectionUpdate({ editor }) {
      const { from, to } = editor.state.selection;
      const text = from === to ? "" : editor.state.doc.textBetween(from, to, " ");
      onSelection?.(text);
      if (!text || !shellRef.current) {
        setToolbar(null);
        return;
      }
      try {
        const start = editor.view.coordsAtPos(from);
        const rect = shellRef.current.getBoundingClientRect();
        setToolbar({
          top: Math.max(4, start.top - rect.top - 46),
          left: Math.min(Math.max(8, start.left - rect.left), rect.width - 220),
          text,
        });
      } catch {
        setToolbar(null);
      }
    },
    onBlur() {
      // Delay so a toolbar click registers before the bar disappears.
      setTimeout(() => setToolbar(null), 150);
    },
  });

  useImperativeHandle(ref, () => ({
    jumpTo(text: string) {
      if (!editor) return false;
      const r = findRange(editor, text);
      if (!r) return false;
      editor.chain().focus().setTextSelection(r).scrollIntoView().run();
      // Briefly highlight the passage so it's obvious what the note refers to.
      editor.view.dispatch(editor.state.tr.setMeta(flashKey, { add: r }));
      window.setTimeout(() => {
        try { editor.view.dispatch(editor.view.state.tr.setMeta(flashKey, { clear: true })); } catch { /* editor gone */ }
      }, 2000);
      return true;
    },
    replace(find: string, replacement: string) {
      if (!editor) return false;
      const r = findRange(editor, find);
      if (!r) return false;
      editor.chain().focus().insertContentAt(r, replacement).run();
      return true;
    },
    focus() { editor?.chain().focus().run(); },
  }), [editor]);

  useEffect(() => {
    if (editor) onChange(editor.getJSON(), editor.getText(), editor.storage.characterCount.words());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const words = editor?.storage.characterCount.words() ?? 0;
  const over = !!wordLimit && words > wordLimit;

  return (
    <div className={s.editorShell} ref={shellRef} style={{ position: "relative" }}>
      <div className={s.editorBar}>
        <button type="button" className={s.tbBtn} data-active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold" title="Bold">B</button>
        <button type="button" className={s.tbBtn} data-active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic" title="Italic" style={{ fontStyle: "italic" }}>i</button>
        <button type="button" className={s.tbBtn} data-active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading" title="Heading">H</button>
        <button type="button" className={s.tbBtn} data-active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} aria-label="Bullet list" title="Bullet list"><Icon name="layers" size={15} /></button>
        <span className={s.tbSpacer} />
        <span className={s.wordCount} data-over={over}>{words}{wordLimit ? ` / ${wordLimit}` : ""} words</span>
      </div>

      {toolbar && (
        <div className={s.selBar} style={{ position: "absolute", top: toolbar.top, left: toolbar.left, zIndex: 20 }} onMouseDown={(e) => e.preventDefault()}>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { onAskCoach?.(); setToolbar(null); }}><Icon name="sparkle" size={14} /> Ask coach</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { onImprove?.(toolbar.text); setToolbar(null); }}><Icon name="spark" size={14} /> Improve</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { onComment?.(toolbar.text); setToolbar(null); }}><Icon name="quote" size={14} /> Comment</button>
        </div>
      )}

      <div className={s.editorBody}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});
