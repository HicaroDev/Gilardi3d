import { PLATFORM_ENABLED } from "@/lib/features";
import { DemoViewer } from "./demo/demo-viewer";
import { Landing } from "@/components/marketing/landing";

export default async function Home() {
  // Plataforma desligada: a página inicial é o próprio visualizador do modelo em destaque.
  if (!PLATFORM_ENABLED) return <DemoViewer featuredOnly />;
  const { auth } = await import("@/lib/auth");
  // A landing continua no ar mesmo se auth/banco estiverem indisponíveis.
  const session = await auth().catch(() => null);
  return <Landing session={session} />;
}
