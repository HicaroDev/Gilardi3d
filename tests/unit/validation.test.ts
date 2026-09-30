import { describe, expect, it } from "vitest";
import { detectIfcSchema, looksLikeIfc, modelCreateSchema, registerSchema, resetSchema } from "@/lib/validation";

const HEADER_IFC4 = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');
FILE_NAME('casa.ifc','2026-09-30T10:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;`;

describe("cabeçalho IFC", () => {
  it("reconhece um IFC válido e o schema", () => {
    expect(looksLikeIfc(HEADER_IFC4)).toBe(true);
    expect(detectIfcSchema(HEADER_IFC4)).toBe("IFC4");
    expect(detectIfcSchema(HEADER_IFC4.replace("IFC4", "IFC2X3"))).toBe("IFC2X3");
  });

  it("rejeita arquivos que não são STEP/IFC", () => {
    expect(looksLikeIfc("<html><body>oi</body></html>")).toBe(false);
    expect(looksLikeIfc("ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('AP214'));")).toBe(false);
  });
});

describe("schemas de formulário", () => {
  it("normaliza e-mail e exige senha forte no cadastro", () => {
    const ok = registerSchema.safeParse({ name: "Hícaro", email: "  HICARO@Exemplo.com ", password: "12345678" });
    expect(ok.success && ok.data.email).toBe("hicaro@exemplo.com");
    expect(registerSchema.safeParse({ name: "H", email: "x@y.z", password: "123" }).success).toBe(false);
  });

  it("confere confirmação de senha", () => {
    expect(resetSchema.safeParse({ token: "t".repeat(20), password: "abcdefgh", confirm: "abcdefgh" }).success).toBe(true);
    expect(resetSchema.safeParse({ token: "t".repeat(20), password: "abcdefgh", confirm: "outra-coisa" }).success).toBe(false);
  });

  it("só aceita upload de .ifc", () => {
    const base = { projectId: "p1", name: "Arquitetura", discipline: "ARCHITECTURE" as const, fileSize: 10 };
    expect(modelCreateSchema.safeParse({ ...base, fileName: "modelo.IFC" }).success).toBe(true);
    expect(modelCreateSchema.safeParse({ ...base, fileName: "modelo.rvt" }).success).toBe(false);
  });
});
