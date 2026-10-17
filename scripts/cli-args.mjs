/** Pull one `--name value` flag out of an argument list. The rest stay in order. */
export function takeOption(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return { value: undefined, rest: args };
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
  return { value, rest: args.filter((_, item) => item !== index && item !== index + 1) };
}
