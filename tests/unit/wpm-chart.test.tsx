import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WpmChart, type ChartSeries } from "@/components/results/WpmChart";

// RES-03 : le graphique reste lisible quand des courbes se superposent.
const points = (wpms: number[]) => wpms.map((wpm, i) => ({ t: i + 1, wpm }));
// 12 secondes ; le premier point (« 180 MPM ») est un pic de départ.
const WPMS = [180, 90, 70, 62, 60, 58, 57, 56, 55, 55, 54, 54];

const SERIES: ChartSeries[] = [
  {
    id: "a",
    name: "Alice · 54 MPM",
    shortName: "Alice",
    isBot: false,
    isMe: true,
    points: points(WPMS),
  },
  {
    id: "b",
    name: "Bot · 54 MPM",
    shortName: "Bot",
    isBot: true,
    isMe: false,
    points: points(WPMS),
  },
];

function chart() {
  return render(
    <WpmChart
      series={SERIES}
      title="Évolution"
      description="desc"
      note="Les 3 premières secondes sont masquées."
      xLabel="secondes"
      yLabel="MPM"
      showAllLabel="Tout afficher"
    />,
  );
}

describe("WpmChart", () => {
  afterEach(cleanup);

  it("trace une courbe par participant, même si elles sont identiques", () => {
    const { container } = chart();
    expect(container.querySelectorAll("figure svg polyline")).toHaveLength(2);
  });

  it("masque les 3 premières secondes (pic de départ) et explique le calcul", () => {
    const { container } = chart();
    const line = container.querySelector("polyline")!;
    // 12 points − 3 secondes masquées = 9 points.
    expect(line.getAttribute("points")!.trim().split(" ")).toHaveLength(9);
    expect(screen.getByText(/secondes sont masquées/)).toBeInTheDocument();
  });

  it("la légende permet de masquer puis de ré-afficher une courbe", () => {
    const { container } = chart();
    const bot = screen.getByRole("button", { name: /Bot/ });
    expect(bot).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(bot);
    expect(bot).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelectorAll("figure svg polyline")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Tout afficher" }));
    expect(container.querySelectorAll("figure svg polyline")).toHaveLength(2);
  });

  it("écrit le nom de chaque participant au bout de sa courbe", () => {
    const { container } = chart();
    const labels = [...container.querySelectorAll("svg text")].map((t) => t.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Alice", "Bot"]));
  });

  it("garde tous les points d'une course très courte", () => {
    const short: ChartSeries[] = [{ ...SERIES[0]!, points: points([60, 62, 61]) }];
    const { container } = render(
      <WpmChart
        series={short}
        title="t"
        description="d"
        note="n"
        xLabel="s"
        yLabel="m"
        showAllLabel="tout"
      />,
    );
    expect(
      container.querySelector("polyline")!.getAttribute("points")!.trim().split(" "),
    ).toHaveLength(3);
  });
});
