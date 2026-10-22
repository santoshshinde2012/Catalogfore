import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Check local file destinations, including images and reference links. Heading
// fragments and remote URLs require separate review; this is an offline check.
function prose(markdown) {
  let fence;
  return (
    markdown
      .split("\n")
      .map((line) => {
        const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
        if (marker) {
          if (!fence) fence = marker[1];
          else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) {
            fence = undefined;
          }
          return "";
        }
        return fence ? "" : line.replace(/(`+).*?\1/g, " ");
      })
      .join("\n")
      // Preserve separation: ignored text must not manufacture a new link or
      // comment delimiter by joining the characters on either side.
      .replace(/<!--[\s\S]*?-->/g, " ")
  );
}

export function localLinks(markdown) {
  const source = prose(markdown);
  const destinations = [];
  const patterns = [
    /\]\(\s*(?:<([^>]+)>|((?:\\.|[^\s()\\]|\([^()]*\))+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)/g,
    /^ {0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const destination = (match[1] ?? match[2]).replace(/\\([() ])/g, "$1");
      if (!/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(destination)) {
        destinations.push(destination);
      }
    }
  }
  return destinations;
}

export function checkDocs(root, files) {
  const failures = [];
  let checked = 0;
  for (const file of files) {
    const absolute = path.resolve(root, file);
    for (const link of localLinks(readFileSync(absolute, "utf8"))) {
      let destination;
      try {
        destination = decodeURIComponent(link.split(/[?#]/, 1)[0]);
      } catch {
        failures.push(`${file}: invalid URL encoding in ${link}`);
        continue;
      }
      if (!destination) continue;
      checked++;
      const target = destination.startsWith("/")
        ? path.resolve(root, `.${destination}`)
        : path.resolve(path.dirname(absolute), destination);
      const relative = path.relative(root, target);
      if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
        failures.push(`${file}: link leaves the repository: ${link}`);
      } else if (!existsSync(target)) {
        failures.push(`${file}: missing local destination: ${link}`);
      }
    }
  }
  return { checked, failures };
}

export function documentationFiles(root) {
  const collect = (directory) =>
    readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return collect(file);
      return entry.isFile() && file.endsWith(".md") ? [file] : [];
    });
  const top = readdirSync(root).filter((file) => file.endsWith(".md"));
  return [...top, ...collect("docs"), ...collect(".github")].sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = documentationFiles(root);
  const { checked, failures } = checkDocs(root, files);
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Checked ${checked} local file links in ${files.length} Markdown documents.`);
  }
}
