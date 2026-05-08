"use client";

export type Message = {
  id: string;
  role: "user" | "assistant" | "typing";
  text: string;
};

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl bg-navy text-white px-4 py-2 text-sm font-sans whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-gold shrink-0" />
      <div className="max-w-[78%] rounded-2xl bg-silver/40 text-ink px-4 py-2 text-sm font-sans whitespace-pre-wrap">
        {message.role === "typing" ? (
          <span className="inline-flex gap-1 items-center text-ink/50">
            <span className="h-1.5 w-1.5 rounded-full bg-ink/50 animate-bounce [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink/50 animate-bounce [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink/50 animate-bounce" />
          </span>
        ) : (
          message.text
        )}
      </div>
    </div>
  );
}
