import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bold, Eye, Heading2, Heading3, Italic, Link2, List, ListOrdered, Pencil, Quote } from 'lucide-react';

interface ProductDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ProductDescriptionEditor({ value, onChange }: ProductDescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const wrapSelection = (prefix: string, suffix = prefix, placeholder = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = `${prefix}${selected || placeholder}${suffix}`;
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + prefix.length;
      textarea.setSelectionRange(selectionStart, selectionStart + (selected || placeholder).length);
    });
  };
  const prefixLines = (prefix: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const selected = value.slice(lineStart, end || start);
    const lines = (selected || placeholder).split('\n').map((line) => `${prefix}${line}`).join('\n');
    onChange(`${value.slice(0, lineStart)}${lines}${value.slice(end || start)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + lines.length);
    });
  };
  const buttonClass = 'inline-flex h-9 w-9 items-center justify-center text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black';

  return <section className="overflow-hidden rounded-xl border border-black/10 bg-white md:col-span-2">
    <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
      <span className="text-xs font-semibold text-gray-700">Product description</span>
      <div className="flex items-center gap-1" role="group" aria-label="Description editor view">
        <button type="button" onClick={() => setPreview(false)} aria-label="Edit description" aria-pressed={!preview} className={`${buttonClass} ${!preview ? 'bg-gray-100' : ''}`}><Pencil size={16} /></button>
        <button type="button" onClick={() => setPreview(true)} aria-label="Preview description" aria-pressed={preview} className={`${buttonClass} ${preview ? 'bg-gray-100' : ''}`}><Eye size={16} /></button>
      </div>
    </div>
    {!preview && <div className="flex flex-wrap border-b border-black/10 bg-[#FAFAFA]" role="toolbar" aria-label="Format description">
      <button type="button" title="Heading 2" aria-label="Heading 2" onClick={() => prefixLines('## ', 'Heading')} className={buttonClass}><Heading2 size={17} /></button>
      <button type="button" title="Heading 3" aria-label="Heading 3" onClick={() => prefixLines('### ', 'Subheading')} className={buttonClass}><Heading3 size={17} /></button>
      <span className="my-2 w-px bg-black/10" />
      <button type="button" title="Bold" aria-label="Bold" onClick={() => wrapSelection('**')} className={buttonClass}><Bold size={17} /></button>
      <button type="button" title="Italic" aria-label="Italic" onClick={() => wrapSelection('*')} className={buttonClass}><Italic size={17} /></button>
      <button type="button" title="Add link" aria-label="Add link" onClick={() => wrapSelection('[', '](https://example.com)', 'link text')} className={buttonClass}><Link2 size={17} /></button>
      <span className="my-2 w-px bg-black/10" />
      <button type="button" title="Bulleted list" aria-label="Bulleted list" onClick={() => prefixLines('- ', 'List item')} className={buttonClass}><List size={17} /></button>
      <button type="button" title="Numbered list" aria-label="Numbered list" onClick={() => prefixLines('1. ', 'List item')} className={buttonClass}><ListOrdered size={17} /></button>
      <button type="button" title="Quote" aria-label="Quote" onClick={() => prefixLines('> ', 'Quote')} className={buttonClass}><Quote size={17} /></button>
    </div>}
    {preview ? <div className="min-h-44 px-4 py-3 text-sm text-gray-700">
      {value.trim() ? <ReactMarkdown components={{
        h2: ({ ...props }) => <h2 className="mb-2 mt-4 text-lg font-bold text-gray-900" {...props} />,
        h3: ({ ...props }) => <h3 className="mb-2 mt-3 text-base font-semibold text-gray-900" {...props} />,
        p: ({ ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
        ul: ({ ...props }) => <ul className="mb-3 list-disc space-y-1 pl-5" {...props} />,
        ol: ({ ...props }) => <ol className="mb-3 list-decimal space-y-1 pl-5" {...props} />,
        blockquote: ({ ...props }) => <blockquote className="my-3 border-l-2 border-gray-300 pl-3 text-gray-600" {...props} />,
        a: ({ ...props }) => <a className="text-blue-700 underline" {...props} />,
      }}>{value}</ReactMarkdown> : <p className="text-gray-400">Formatted description preview will appear here.</p>}
    </div> : <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Add product details, materials, fit, care instructions, or other useful information..." className="min-h-44 w-full resize-y p-4 text-sm leading-relaxed outline-none placeholder:text-gray-400" />}
    {!preview && <div className="border-t border-black/5 px-4 py-2 text-[11px] text-gray-500">Use headings and lists to organize details. Select text, then choose a format.</div>}
  </section>;
}