"use client";

import { BimViewerApp, type ViewerSource } from "@/components/viewer/bim-viewer-app";

export function SharedViewer(props: { title: string; subtitle: string; backHref?: string; source: ViewerSource | null }) {
  return <BimViewerApp {...props} />;
}
