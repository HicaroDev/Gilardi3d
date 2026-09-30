import type { Metadata } from "next";
import { DemoViewer } from "./demo-viewer";

export const metadata: Metadata = {
  title: "Demo do visualizador",
  description: "Abra um modelo IFC de exemplo ou arraste o seu próprio arquivo para ver em 3D.",
};

export default function DemoPage() {
  return <DemoViewer />;
}
