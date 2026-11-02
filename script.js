
const GENES = [
  { name: "Black", alleles: ["B", "b"] },
  { name: "Agouti", alleles: ["A+", "A", "AT", "a"] },
  { name: "White", alleles: ["W", "w"] },
  { name: "Grey", alleles: ["G", "g"] },
  { name: "Cream", alleles: ["CR", "cr"] },
  { name: "Dun", alleles: ["D", "d"] },
  { name: "Champagne", alleles: ["CH", "ch"] },
  { name: "Flaxen", alleles: ["F", "f"] },
  { name: "Silver", alleles: ["Z", "z"] },
  { name: "Roan", alleles: ["RN", "rn"] }
];

const ALLELE_ORDER = {
  "A+": 4, A: 3, AT: 2, a: 1
};

function parseGenotype(line, alleles) {
  const value = line.replace(/\s+/g, "");
  const sorted = [...alleles].sort(
    (a, b) => b.length - a.length
  );

  for (const first of sorted) {
    if (!value.startsWith(first)) continue;

    const second = value.slice(first.length);

    if (alleles.includes(second)) {
      return [first, second];
    }
  }

  throw new Error(`Invalid genotype: ${line}`);
}

function parseHorse(text) {
  const lines = text.trim().split(/\s+/);

  if (lines.length !== GENES.length) {
    throw new Error(
      `Enter exactly ${GENES.length} gene pairs ` +
      `in the documented order.`
    );
  }

  return GENES.map((gene, i) =>
    parseGenotype(lines[i], gene.alleles)
  );
}

function offspringOptions(mare, stallion) {
  const outcomes = new Map();

  for (const m of mare) {
    for (const s of stallion) {
      const pair = [m, s].sort().join("/");

      outcomes.set(
        pair,
        (outcomes.get(pair) || 0) + 0.25
      );
    }
  }

  return [...outcomes].map(([key, chance]) => ({
    pair: key.split("/"),
    chance
  }));
}

function has(pair, allele) {
  return pair.includes(allele);
}

function count(pair, allele) {
  return pair.filter(a => a === allele).length;
}

function getBaseColor(genes) {
  const black = genes[0];
  const agouti = genes[1];

  if (!has(black, "B")) return "Chestnut";

  const strongest = [...agouti].sort(
    (a, b) => ALLELE_ORDER[b] - ALLELE_ORDER[a]
  )[0];

  if (strongest === "A+") return "Wild Bay";
  if (strongest === "A") return "Bay";
  if (strongest === "AT") return "Seal Brown";

  return "Black";
}

function getCoatColor(genes) {
  const [
    , , white, grey, cream, dun,
    champagne, , silver, roan
  ] = genes;

  if (has(white, "W")) return "White";
  if (has(grey, "G")) return "Grey";

  const base = getBaseColor(genes);
  const cr = count(cream, "CR");
  const d = has(dun, "D");
  const ch = has(champagne, "CH");
  const z = has(silver, "Z");
  const rn = has(roan, "RN");

  let color = base;

  if (ch && cr === 0) {
    const champagneNames = {
      Chestnut: "Gold Champagne",
      Black: "Classic Champagne",
      Bay: "Amber Champagne",
      "Wild Bay": "Amber Champagne",
      "Seal Brown": "Sable Champagne"
    };

    color = champagneNames[base] || base;
  } else if (ch && cr === 1 && base === "Black") {
    color = "Classic Cream";
  } else if (ch && cr === 1 && base === "Chestnut") {
    color = "Gold Cream";
  } else if (cr === 2) {
    const names = {
      Chestnut: "Cremello",
      Black: "Smoky Cream",
      Bay: "Perlino",
      "Wild Bay": "Perlino",
      "Seal Brown": "Seal Brown Cream"
    };

    color = names[base] || base;
  } else if (cr === 1) {
    const names = {
      Chestnut: "Palomino",
      Black: "Smoky Black",
      Bay: "Buckskin",
      "Wild Bay": "Buckskin",
      "Seal Brown": "Diluted Seal Brown"
    };

    color = names[base] || base;
  }

  if (d) {
    const dunNames = {
      Chestnut: "Red Dun",
      Black: "Grulla",
      Bay: "Bay Dun",
      "Wild Bay": "Bay Dun",
      Palomino: "Dunalino",
      Buckskin: "Dunskin",
      Cremello: "Cremello Dun",
      Perlino: "Perlino Dun",
      "Smoky Black": "Smoky Grulla"
    };

    color = dunNames[color] || `${color} + Dun`;
  }

  if (z && (base === "Bay" || base === "Wild Bay")) {
    const silverNames = {
      Bay: "Silver Dapple Bay",
      "Wild Bay": "Silver Dapple Bay",
      Buckskin: "Silver Dapple Buckskin",
      Dunskin: "Silver Dapple Dunskin"
    };

    color = silverNames[color] || `${color} + Silver`;
  }

  if (rn) {
    color += " Roan";
  }

  return color;
}

function calculate() {
  const results = document.getElementById("results");

  try {
    const mare = parseHorse(
      document.getElementById("mare-genes").value
    );

    const stallion = parseHorse(
      document.getElementById("stallion-genes").value
    );

    const options = GENES.map((_, i) =>
      offspringOptions(mare[i], stallion[i])
    );

    const colors = new Map();
    let total = 0;

    function explore(index, current, probability) {
      if (index === GENES.length) {
        const color = getCoatColor(current);

        colors.set(
          color,
          (colors.get(color) || 0) + probability
        );

        total += probability;
        return;
      }

      for (const option of options[index]) {
        explore(
          index + 1,
          [...current, option.pair],
          probability * option.chance
        );
      }
    }

    explore(0, [], 1);

    const sorted = [...colors].sort(
      (a, b) => b[1] - a[1]
    );

    results.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = "Foal Color Predictions";
    results.appendChild(heading);

    for (const [color, chance] of sorted) {
      const percent = (chance / total) * 100;

      const item = document.createElement("div");
      item.className = "result-item";

      const row = document.createElement("div");
      row.className = "result-heading";

      const name = document.createElement("span");
      name.textContent = color;

      const percentage = document.createElement("span");
      percentage.textContent = `${percent.toFixed(2)}%`;

      row.append(name, percentage);

      const track = document.createElement("div");
      track.className = "progress-track";

      const fill = document.createElement("div");
      fill.className = "progress-fill";
      fill.style.width = `${percent}%`;

      track.appendChild(fill);
      item.append(row, track);
      results.appendChild(item);
    }

    const note = document.createElement("p");
    note.textContent =
      "Predictions use standard Mendelian inheritance. " +
      "Some AVH-specific color combinations are provisional.";
    results.appendChild(note);

  } catch (error) {
    results.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = "Check Your Genetics";
    results.appendChild(heading);

    const message = document.createElement("p");
    message.textContent = error.message;
    results.appendChild(message);
  }
}

document.getElementById("calculate-btn")
  .addEventListener("click", calculate);
