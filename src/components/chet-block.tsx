import { ArrowUp } from "lucide-react";
import { Claude, Gemini, Perplexity, OpenAI } from "@lobehub/icons";

export const ChatBlock = ({ url }: { url: URL }) => {
  const chatUrls: Record<string, string> = {
    "chat-gpt": "https://chatgpt.com/",
    gemini: "https://gemini.google.com/",
    claude: "https://claude.ai/",
    perplexity: "https://www.perplexity.ai/",
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const chat = data.get("chat") as string;
    const query = data.get("query") as string;
    const chatUrl = chatUrls[chat];

    if (chatUrl) {
      const targetUrl = new URL(chatUrl);
      targetUrl.searchParams.set("q", `${url} ${query}`);
      window.open(targetUrl, "_blank");
    }
  };

  return (
    <>
      <form
        action=""
        className="md:fixed md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:z-50"
        onSubmit={handleSubmit}
      >
        <div className="group/chat bottom-0 w-full md:w-100 md:focus-within:w-140 bg-gray-100/95 hover:bg-gray-100 focus-within:bg-gray-100 rounded-full flex items-center transition-all duration-300 border border-gray-200 md:border-0 md:shadow-sm md:not-focus-within:hover:scale-103 md:not-focus-within:hover:shadow-md">
          <div className="relative w-full">
            <input
              type="text"
              name="query"
              placeholder=" "
              className="peer w-full px-4 border-none outline-none"
            />
            <div className="absolute inset-y-0 left-4 hidden peer-placeholder-shown:flex items-center gap-1 pointer-events-none text-gray-400 text-sm">
              <span className="group-has-[option[value='gemini']:checked]/chat:hidden group-has-[option[value='claude']:checked]/chat:hidden group-has-[option[value='perplexity']:checked]/chat:hidden inline-flex items-center gap-1">
                <OpenAI size={14} />
                Pregunta a ChatGPT
              </span>
              <span className="hidden group-has-[option[value='gemini']:checked]/chat:inline-flex items-center gap-1">
                <Gemini size={14} />
                Pregunta a Gemini
              </span>
              <span className="hidden group-has-[option[value='claude']:checked]/chat:inline-flex items-center gap-1">
                <Claude size={14} />
                Pregunta a Claude
              </span>
              <span className="hidden group-has-[option[value='perplexity']:checked]/chat:inline-flex items-center gap-1">
                <Perplexity size={14} />
                Pregunta a Perplexity
              </span>
            </div>
          </div>
          <select name="chat" className="px-2 text-xs">
            <option value="claude">Claude</option>
            <option value="chat-gpt">ChatGPT</option>
            {/* <option value="gemini">Gemini</option> */}
            <option value="perplexity">Perplexity</option>
          </select>
          <button className="bg-gray-500/10 rounded-full p-2 scale-70">
            <ArrowUp className="w-8 h-8" />
          </button>
        </div>
      </form>
    </>
  );
};
