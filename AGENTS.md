<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Supervisor↔client chat lives in chat_* tables with no public RLS policies; all access goes through src/lib/chat.functions.ts (admin cookie gate / client session id) — keeps chats invisible to anyone else.
- Chat feature flag is chat_settings.supervisor_client_chat_enabled; UI must hide entirely when false — so the site runs unchanged without it.
- Light theme (html.theme-light) applies to all client pages except admin paths; admin screens are dark-only designs.

- Exchange rate is fetched server-side in a server function with in-memory cache and a fallback value — keeps the page working if the source is down.

- Capacitor wraps the published URL (server.url) instead of a static webDir build — the app is SSR, so there is no static bundle to ship.
- Route transitions use the current pathname as their key directly; deferred key state remounts newly opened pages and repeats their effects.
- Scroll-reveal effects must display content immediately when IntersectionObserver is not callable; animation support must never block access to page content.
