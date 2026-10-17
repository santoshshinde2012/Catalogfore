import { StrictMode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { App } from "./App";

export async function render(): Promise<string> {
  const stream = await renderToReadableStream(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await stream.allReady;
  return new Response(stream).text();
}
