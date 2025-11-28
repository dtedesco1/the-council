import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Thread, ModelConfig, Message } from '../types';
import { FileText, AlertOctagon } from 'lucide-react';

interface ThreadColumnProps {
  model: ModelConfig;
  thread: Thread;
}

const CollapsibleMessage: React.FC<{ msg: Message }> = ({ msg }) => {
  // User messages default to collapsed (expanded=false)
  // Model messages default to expanded (expanded=true)
  const [expanded, setExpanded] = useState(msg.role === 'model');
  const isLong = msg.text.length > 300 || (msg.text.match(/\n/g) || []).length > 5;

  return (
    <div className={`group mb-4 ${msg.role === 'user' ? 'pl-8' : 'pr-8'}`}>
      <div className={`text-xs font-mono mb-1 text-gray-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
        {msg.role === 'user' ? 'You' : ''} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>

      <div
        className={`relative rounded-sm p-3 text-sm leading-relaxed ${msg.role === 'user'
            ? 'bg-slate-100 text-slate-800 ml-auto'
            : 'bg-white border border-gray-200 text-gray-800 mr-auto'
          }`}
      >
        {msg.attachment && (
          <div className="mb-2 pb-2 border-b border-gray-200 flex items-center gap-2 text-xs text-gray-500">
            <FileText size={14} />
            <span className="truncate max-w-[200px]">{msg.attachment.name}</span>
          </div>
        )}

        <div className={`${!expanded && isLong ? 'line-clamp-3 max-h-[4.5em] overflow-hidden' : ''}`}>
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }: any) {
                  return (
                    <code className={`${className} bg-gray-100 px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                      {children}
                    </code>
                  )
                },
                pre({ children }) {
                  return <pre className="bg-gray-50 p-2 rounded overflow-x-auto my-2 text-xs">{children}</pre>
                }
              }}
            >
              {msg.text}
            </ReactMarkdown>
          </div>
        </div>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-bold text-blue-500 hover:underline mt-1 uppercase tracking-wide"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
    </div>
  );
};

const ThreadColumn: React.FC<ThreadColumnProps> = ({ model, thread }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.messages.length, thread.isTyping, thread.error]);

  return (
    <div className="flex flex-col h-full border-r border-gray-200 min-w-[300px] max-w-[400px] flex-1 bg-white">
      {/* Header with model name and token count */}
      <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between sticky top-0 z-10 h-10">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${thread.isTyping ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <h3 className="font-medium text-xs uppercase tracking-wider text-gray-600">{model.name}</h3>
        </div>
        {/* Token count from API responses */}
        {thread.totalTokens > 0 && (
          <div className="text-[10px] text-gray-400 font-mono" title="Total tokens used (from API)">
            {thread.totalTokens.toLocaleString()} tokens
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-white"
        ref={scrollRef}
      >
        {thread.messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-300 text-xs italic">
              Start a thread...
            </div>
          </div>
        )}

        {thread.messages.map((msg) => (
          <CollapsibleMessage key={msg.id} msg={msg} />
        ))}

        {thread.isTyping && (
          <div className="mb-4 pr-8 animate-pulse">
            <div className="bg-gray-50 h-8 w-24 rounded mb-1"></div>
            <div className="bg-gray-50 h-4 w-full rounded opacity-50"></div>
          </div>
        )}

        {thread.error && (
          <div className="p-3 bg-red-100 text-red-700 text-xs border border-red-300 rounded my-2 flex items-start gap-2 shadow-sm">
            <AlertOctagon size={16} className="mt-0.5 flex-shrink-0" />
            <div className="break-words font-medium">
              {thread.error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadColumn;