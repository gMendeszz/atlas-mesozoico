import { describe, it, expect } from "vitest";
import { siteHtml, tooltipHtml } from "../src/popup";
import { defaultFilters } from "../src/filters";
import { countryName, esc, fmt } from "../src/text";
import { testData } from "./test-data";

describe("security: text from the data never becomes HTML", () => {
  it("a malicious name shows as text, without creating an element", () => {
    const html = siteHtml(testData(), 1, defaultFilters());
    expect(html).not.toContain("<img");
    expect(html).toContain("&#60;img");
  });

  it('quotes are escaped (protects attributes like title="...")', () => {
    expect(esc(`" onmouseover="x`)).not.toContain('"');
  });

  it("formatted numbers don't let text through", () => {
    // @ts-expect-error: on purpose, a string where a number should go
    expect(fmt("<b>1</b>")).not.toContain("<");
  });

  it("formation and author from the data are escaped too", () => {
    const data = testData();
    data.dict.formation[1] = "<script>x</script>";
    data.dict.author[1] = "<b>y</b>";
    expect(siteHtml(data, 0, defaultFilters())).not.toContain("<script>");
    expect(siteHtml(data, 1, defaultFilters())).not.toContain("<b>");
  });

  it("the hover summary escapes too", () => {
    const data = testData();
    data.dict.state[2] = "<script>alert(1)</script>";
    expect(tooltipHtml(data, 1, 3)).not.toContain("<script>");
  });
});

describe("accuracy: the popup doesn't show more certainty than the source", () => {
  it("an uncertain identification shows the original text and the tag", () => {
    const html = siteHtml(testData(), 0, defaultFilters());
    expect(html).toContain("cf. Tyrannosaurus rex");
    expect(html).toContain("uncertain identification");
  });

  it("a certain identification has no tag", () => {
    const html = siteHtml(testData(), 2, defaultFilters());
    expect(html).not.toContain("uncertain identification");
  });

  it("with a group filter, lists only the visible ones and says how many were hidden", () => {
    const f = { ...defaultFilters(), groups: [false, false, true, false, false] };
    const html = siteHtml(testData(), 1, f);
    expect(html).toContain("1 fossil record");
    expect(html).toContain("+2 hidden by filters");
  });

  it("with a type filter, the list respects it too (only the footprint)", () => {
    const f = { ...defaultFilters(), types: [false, true, false] };
    const html = siteHtml(testData(), 0, f);
    expect(html).toContain("1 fossil record");
    expect(html).toContain(">footprint<");
    expect(html).not.toContain(">egg<");
  });

  it("author and year show, except for an uncertain identification (that would be too much certainty)", () => {
    expect(siteHtml(testData(), 1, defaultFilters())).toContain("Fulano, 1900");
    expect(siteHtml(testData(), 0, defaultFilters())).not.toContain("Osborn");
  });

  it("shows the geological formation, when there is one", () => {
    expect(siteHtml(testData(), 0, defaultFilters())).toContain("Santa Maria Formation");
    expect(siteHtml(testData(), 2, defaultFilters())).not.toContain("Formation");
  });

  it('with ancient continents, the place name is marked "Today:" (the present-day place)', () => {
    expect(siteHtml(testData(), 0, { ...defaultFilters(), continents: "ancient" })).toContain("Today: Rio Grande do Sul");
    expect(siteHtml(testData(), 0, defaultFilters())).not.toContain("Today:");
  });
});

describe("names published differently from the accepted one", () => {
  it("a synonym shows the accepted name, with the published one as a note", () => {
    const html = siteHtml(testData(), 1, defaultFilters());
    expect(html).toContain("<em>Foo bar</em>");
    expect(html).toContain("published as <em>Foo antiquus</em>");
    expect(html).toContain("Fulano, 1900"); // the accepted name's author still fits
  });

  it('a more specific label ("indet. A") replaces the accepted name and drops its author', () => {
    const data = testData();
    data.dict.original_name[2] = "Foo bar indet. A";
    const html = siteHtml(data, 1, defaultFilters());
    expect(html).toContain("<em>Foo bar indet. A</em>");
    expect(html).not.toContain("published as");
    expect(html).not.toContain("Fulano");
  });

  it('identical lines at a site are grouped as "×N" (the count above still counts every record)', () => {
    const data = testData();
    data.fossils.type[2] = 1; // site 0: the egg becomes a second identical footprint
    const html = siteHtml(data, 0, defaultFilters());
    expect(html).toContain("×2");
    expect(html).toContain("3 fossil records");
    expect(html.match(/<li>/g)).toHaveLength(2);
  });
});

describe("link to the PBDB", () => {
  it("points to the collection details page (the old basicCollectionSearch now returns 403)", () => {
    expect(siteHtml(testData(), 1, defaultFilters())).toContain(
      'href="https://paleobiodb.org/classic/displayCollectionDetails?collection_no=200"'
    );
  });
});

describe("countryName", () => {
  it("translates the PBDB's own ocean codes (they're not ISO)", () => {
    expect(countryName("O2")).toBe("North Atlantic");
  });

  it('accepts the "UK" the PBDB uses instead of the ISO "GB"', () => {
    expect(countryName("UK")).toBe("United Kingdom");
  });

  it("an unknown code doesn't bring the page down", () => {
    expect(() => countryName("O9")).not.toThrow();
  });
});
