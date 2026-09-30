import { describe, expect, it } from "vitest";
import { buildStorageKey, safeName } from "@/lib/storage-keys";

describe("chaves do storage", () => {
  it("gera caminho determinístico por projeto/modelo/versão", () => {
    expect(buildStorageKey({ projectId: "p", modelId: "m", version: 3, kind: "FRAGMENTS" })).toBe("projects/p/models/m/v3/fragments.frag");
    expect(buildStorageKey({ projectId: "p", modelId: "m", version: 1, kind: "IFC_SOURCE", fileName: "Prédio Açaí.ifc" })).toBe(
      "projects/p/models/m/v1/Predio-Acai.ifc",
    );
  });

  it("remove caracteres perigosos do nome", () => {
    expect(safeName("../../etc/passwd")).not.toContain("/");
    expect(safeName("   ")).toBe("-");
    expect(safeName("")).toBe("arquivo");
  });
});
