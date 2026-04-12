import React, { useState } from 'react';

type Msg = {
  from: 'user' | 'ai';
  text?: string;
  details?: string;
  sources?: string[];
};

function renderInline(text: string) {
  // split by backticks to render inline code
  const parts = text.split(/`([^`]+)`/g);
  return parts.map((part, i) => (i % 2 === 1 ? <code key={i} className="bg-zinc-800 px-1 rounded">{part}</code> : <span key={i}>{part}</span>));
}

function renderParagraph(p: string, idx: number) {
  const lines = p.split('\n').map((l) => l.trim());
  const isList = lines.every((l) => l.startsWith('- '));
  if (isList) {
    return (
      <ul key={idx} className="list-disc ml-5 space-y-1">
        {lines.map((l, i) => (
          <li key={i} className="text-sm leading-6">
            {renderInline(l.replace(/^-\s+/, ''))}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={idx} className="text-sm leading-6 whitespace-pre-wrap">
      {lines.map((l, i) => (
        <span key={i}>
          {renderInline(l)}{i < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

export default function ChatMessage({ message }: { message: Msg }) {
  const details = message.details || '';
  const short = message.text || (details ? details.split('\n')[0] : '');
  const [expanded, setExpanded] = useState(false);

  const paragraphs = details ? details.split(/\n\s*\n/) : [];
  const isLong = details.length > 300 || paragraphs.length > 2;

  return (
    <div>
      {/* summary or short text */}
      {short ? <div className="text-sm leading-6">{renderInline(short)}</div> : null}

      {/* details (collapsed/expanded) */}
      {details ? (
        <div className="mt-2 text-sm text-zinc-200">
          {!expanded ? (
            <div>
              {paragraphs.slice(0, 1).map((p, i) => renderParagraph(p, i))}
              {isLong && (
                <button
                  onClick={() => setExpanded(true)}
                  className="mt-2 text-xs text-green-400 font-medium"
                >
                  Hiển thị thêm
                </button>
              )}
            </div>
          ) : (
            <div>
              {paragraphs.map((p, i) => renderParagraph(p, i))}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 text-xs text-zinc-400">
                  <div className="font-medium text-[11px] text-zinc-500 mb-1">Nguồn:</div>
                  <ul className="list-disc ml-5 space-y-0">
                    {message.sources.map((s, i) => (
                      <li key={i} className="break-words">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="mt-2 text-xs text-zinc-400"
              >
                Thu gọn
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
