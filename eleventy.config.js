export default function (eleventyConfig) {
  // Passthrough copy static assets
  eleventyConfig.addPassthroughCopy("Assets");
  eleventyConfig.addPassthroughCopy("sample");

  // Custom date filter
  eleventyConfig.addFilter("dateDisplay", (dateObj) => {
    if (!dateObj) return "";
    const date = new Date(dateObj);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  });

  // Current year shortcode
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["html", "njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
