import type { MetadataRoute } from "next";

// Permite instalar na tela inicial do celular e do PC, abrindo como app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lameira's Drywall — Orçamentos",
    short_name: "Lameira's",
    description: "Orçamentos e obras da Lameira's Drywall",
    start_url: "/",
    display: "standalone",
    background_color: "#121416",
    theme_color: "#121416",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
