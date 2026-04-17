import type { Config } from "@react-router/dev/config";
import fs from "fs";
import path from "path";

export default {
  appDirectory: "src",
  ssr: true,
  async prerender() {
    const postsDir = path.join(process.cwd(), "src/blog/posts");
    let blogRoutes: string[] = [];
    if (fs.existsSync(postsDir)) {
      const files = fs.readdirSync(postsDir);
      blogRoutes = files
        .filter(f => f.endsWith(".mdx"))
        .map(f => `/blog/${f.replace(".mdx", "")}`);
    }
    return ["/", "/blog", "/career", "/projects", "/library", "/contact", "/admin", ...blogRoutes];
  }
} satisfies Config;
