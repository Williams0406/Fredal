"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

function ToolbarButton({ active = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-[#173569] bg-[#eef4ff] text-[#173569]"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  editable = true,
  minHeightClassName = "min-h-[180px]",
  showToolbar = true,
  containerClassName = "",
  toolbarClassName = "",
  contentClassName = "",
  editorSpacingClassName = "mt-2",
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: [
          "prose prose-slate max-w-none px-4 py-3 text-sm text-slate-700 outline-none",
          minHeightClassName,
          contentClassName,
        ].join(" "),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if ((value || "") !== currentHtml) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div>
      {label ? (
        <label className="text-sm font-semibold text-slate-700">{label}</label>
      ) : null}

      <div
        className={[
          editorSpacingClassName,
          "overflow-hidden rounded-2xl border border-slate-200 bg-white",
          containerClassName,
        ].join(" ")}
      >
        {showToolbar ? (
          <div
            className={[
              "flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3",
              toolbarClassName,
            ].join(" ")}
          >
            <ToolbarButton
              active={Boolean(editor?.isActive("bold"))}
              disabled={!editable || !editor}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              Negrita
            </ToolbarButton>
            <ToolbarButton
              active={Boolean(editor?.isActive("italic"))}
              disabled={!editable || !editor}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              Cursiva
            </ToolbarButton>
            <ToolbarButton
              active={Boolean(editor?.isActive("bulletList"))}
              disabled={!editable || !editor}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              Lista
            </ToolbarButton>
            <ToolbarButton
              active={Boolean(editor?.isActive("orderedList"))}
              disabled={!editable || !editor}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              Numerada
            </ToolbarButton>
            <ToolbarButton
              active={Boolean(editor?.isActive("heading", { level: 3 }))}
              disabled={!editable || !editor}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              Titulo
            </ToolbarButton>
            <ToolbarButton
              disabled={!editable || !editor}
              onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
            >
              Limpiar
            </ToolbarButton>
          </div>
        ) : null}

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
