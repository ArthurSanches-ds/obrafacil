import { describe, expect, it } from "vitest";
import { whatsappLink } from "./phone";

describe("whatsappLink", () => {
  it("tira a formatação e põe o 55 do Brasil", () => {
    expect(whatsappLink("(22) 99812-4410")).toBe("https://wa.me/5522998124410");
  });

  it("não repete o 55 quando já veio com ele", () => {
    expect(whatsappLink("+55 22 99812-4410")).toBe("https://wa.me/5522998124410");
  });

  it("devolve null para telefone vazio ou incompleto", () => {
    expect(whatsappLink("")).toBeNull();
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink("9981")).toBeNull();
  });
});
