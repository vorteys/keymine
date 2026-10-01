import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PixelAvatar, PixelChip } from "@/components/ui";

describe("PixelChip", () => {
  it("affiche son contenu", () => {
    render(<PixelChip>FR</PixelChip>);
    expect(screen.getByText("FR")).toBeInTheDocument();
  });

  it("marque l'état actif avec data-on", () => {
    render(<PixelChip on>é</PixelChip>);
    expect(screen.getByText("é")).toHaveAttribute("data-on", "true");
  });
});

describe("PixelAvatar", () => {
  it("affiche l'initiale avec la couleur fournie", () => {
    render(<PixelAvatar label="A" color="#3d6fc4" />);
    const avatar = screen.getByText("A");
    expect(avatar).toHaveStyle({ backgroundColor: "#3d6fc4" });
  });
});
