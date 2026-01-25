/**
 * Computed data for landing pages.
 * Applies block defaults at build time.
 */

const BLOCK_DEFAULTS = {
  features: { reveal: true, heading_level: 3, grid_class: "features" },
  stats: { reveal: true },
  split: { title_level: 2, reveal_figure: "scale" },
  "section-header": { level: 2, align: "center" },
  "image-cards": { reveal: true, heading_level: 3 },
  "code-block": { reveal: true },
};

export default {
  eleventyComputed: {
    processedBlocks: (data) => {
      if (!data.blocks) return data.blocks;
      return data.blocks.map((block) => {
        const merged = { ...BLOCK_DEFAULTS[block.type], ...block };
        if (block.type === "split" && !block.reveal_content) {
          merged.reveal_content = block.reverse ? "right" : "left";
        }
        return merged;
      });
    },
  },
};
