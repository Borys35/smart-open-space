import { defineConfig } from "oxfmt";

export default defineConfig({
  sortImports: {
    internalPattern: ["@/**"],
    customGroups: [
      {
        groupName: "assets",
        elementNamePattern: ["@assets/**"],
      },
    ],
    groups: [
      "value-builtin",
      "assets",
      "value-external",
      "value-internal",
      ["value-parent", "value-sibling", "value-index"],
    ],
    newlinesBetween: true,
  },
});
